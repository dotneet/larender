import {
  Canvas,
  CanvasRenderingContext2D,
  createCanvas,
  deregisterAllFonts,
  registerFont,
} from 'canvas';
import fs from 'node:fs';
import { LatexNode, NodeType, TokenType } from './ast.ts';

export type RenderState = {
  x: number;
  y: number;
  fontSize: number;
};

export class RenderContext {
  private states: RenderState[] = [];
  constructor(
    public canvasCtx: CanvasRenderingContext2D,
    rootRenderState: RenderState
  ) {
    this.canvasCtx = canvasCtx;
    this.states.push(rootRenderState);
  }

  pushState(renderState: RenderState) {
    this.states.push(renderState);
  }

  popState(): RenderState | undefined {
    return this.states.pop();
  }

  get renderState(): RenderState {
    return this.states[this.states.length - 1];
  }
}

export type RenderOptions = {
  fontSize: number;
  marginRatio: number;
  width: number;
  height: number;
  fillBackground: boolean;
  backgroundColor: string;
};

type TextRenderingOptions = {
  extraMargin: number;
};

class LatexWriter {
  private drawContext: CanvasRenderingContext2D;

  constructor(
    public renderContext: RenderContext,
    private options: RenderOptions
  ) {
    this.renderContext = renderContext;
    this.drawContext = renderContext.canvasCtx;
    this.options = options;
  }

  get renderState() {
    return this.renderContext.renderState;
  }

  pushState(renderState: RenderState) {
    this.renderContext.pushState(renderState);
  }

  popState(): RenderState | undefined {
    return this.renderContext.popState();
  }

  text(
    text: string,
    font: string | null = null,
    options: TextRenderingOptions = { extraMargin: 0 }
  ) {
    let fontName = font || 'KaTeX_Main';
    const state = this.renderContext.renderState;
    const mMetrics = measureText('M', fontName, state.fontSize);
    const sideMargin = Math.ceil(options.extraMargin * mMetrics.width);
    state.x += sideMargin;
    const metrics = measureText(text, fontName, state.fontSize);
    const ctxFont = `${state.fontSize}px "${fontName}"`;
    this.drawContext.font = ctxFont;
    this.drawContext.fillText(text, state.x, state.y);
    if (sideMargin > 0) {
      state.x += metrics.width + sideMargin;
    } else {
      state.x += metrics.width;
    }
  }

  fraction(numerator: Canvas, denominator: Canvas): number {
    const state = this.renderContext.renderState;
    const metrics = measureText('X', 'KaTeX_Main', state.fontSize);
    const margin = this.options.marginRatio * metrics.width;
    const width = Math.max(numerator.width, denominator.width);
    const height = numerator.height + denominator.height + metrics.height;
    const barY = state.y - metrics.height / 2;
    const x = state.x;
    const y = state.y;
    const maxWidth = Math.max(numerator.width, denominator.width);

    // draw bar
    this.drawContext.fillRect(x, barY, maxWidth, 2);

    // draw numerator
    const numeratorX = x + (maxWidth - numerator.width) / 2;
    this.drawContext.drawImage(
      numerator,
      numeratorX,
      barY - numerator.height - metrics.height * 0.3
    );

    // draw denominator
    const denominatorX = x + (maxWidth - denominator.width) / 2;
    this.drawContext.drawImage(
      denominator,
      denominatorX,
      barY + metrics.height * 0.1
    );

    state.x += width + margin;
    return maxWidth;
  }

  squareRoot(contentCanvas: Canvas) {
    const ctx = this.drawContext;
    const contentWidth = contentCanvas.width;
    const contentHeight = contentCanvas.height;
    const metrics = measureText('M', 'KaTeX_Main', this.renderState.fontSize);
    const charHeight = metrics.width;

    // draw square root symbol using lineTo
    const ox = this.renderState.x;
    const oy = this.renderState.y;
    const xPadding = charHeight * 0.2;
    const yPadding = charHeight * 0.2;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ox, oy);
    ctx.lineTo(ox + charHeight * 0.3, oy - charHeight * 0.3);
    ctx.lineTo(ox + charHeight * 0.6, oy + contentHeight / 2);
    ctx.lineTo(ox + charHeight, oy - contentHeight / 2 - yPadding);
    ctx.lineTo(
      ox + charHeight + contentWidth + xPadding,
      oy - contentHeight / 2 - yPadding
    );
    ctx.stroke();

    // draw content
    ctx.drawImage(
      contentCanvas,
      this.renderState.x + charHeight + xPadding,
      oy - contentHeight / 2
    );

    const dx = charHeight + xPadding + contentWidth;
    this.renderState.x += dx;
    return dx;
  }
}

export function render(
  nodes: LatexNode[],
  opts: Partial<RenderOptions> = {}
): Canvas {
  const options: RenderOptions = Object.assign(
    {
      fontSize: 20,
      marginRatio: 0.3,
      width: 200,
      height: 200,
      fillBackground: true,
      backgroundColor: 'white',
    },
    opts
  );

  const canvas = createCanvas(options.width, options.height);
  const ctx = canvas.getContext('2d');
  if (options.fillBackground) {
    ctx.fillStyle = options.backgroundColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.fillStyle = 'black';

  const renderContext = new RenderContext(ctx, {
    x: 20,
    y: Math.ceil(canvas.height / 2),
    fontSize: options.fontSize,
  });

  const writer = new LatexWriter(renderContext, options);
  for (const child of nodes) {
    renderNode(child, writer);
  }
  return canvas;
}

type RenderingResult = {
  dx: number;
};

export function fitToContent(canvas: Canvas): Canvas {
  const ctx = canvas.getContext('2d');
  let minX = canvas.width,
    minY = canvas.height,
    maxX = 0,
    maxY = 0;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const alpha = imageData.data[(y * canvas.width + x) * 4 + 3];
      if (alpha > 0) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const newCanvas = createCanvas(width, height);
  const newCtx = newCanvas.getContext('2d');
  newCtx.putImageData(ctx.getImageData(minX, minY, width, height), 0, 0);
  return newCanvas;
}

export function renderNode(
  node: LatexNode,
  writer: LatexWriter
): RenderingResult {
  if (node.nodeType === NodeType.Plain) {
    switch (node.token.tokenType) {
      case TokenType.Superscript: {
        const state = writer.renderContext.renderState;
        const scriptFontSize = Math.ceil(state.fontSize / 2);
        const metrics = measureText('5', 'KaTeX_Main', state.fontSize);
        const scriptMetrics = measureText('5', 'KaTeX_Main', scriptFontSize);
        writer.pushState({
          x: writer.renderContext.renderState.x,
          y:
            writer.renderContext.renderState.y -
            metrics.height +
            scriptMetrics.height / 2,
          fontSize: scriptFontSize,
        });
        let x = writer.renderState.x;
        node.children.forEach((child) => renderNode(child, writer));
        let dx = writer.renderState.x - x;
        writer.popState();
        return { dx };
      }
      case TokenType.Subscript: {
        const state = writer.renderContext.renderState;
        const scriptFontSize = Math.ceil(state.fontSize / 2);
        const metrics = measureText('5', 'KaTeX_Main', state.fontSize);
        const scriptMetrics = measureText('5', 'KaTeX_Main', scriptFontSize);
        writer.pushState({
          x: writer.renderContext.renderState.x,
          y: writer.renderContext.renderState.y + scriptMetrics.height / 2,
          fontSize: scriptFontSize,
        });
        let x = writer.renderState.x;
        node.children.forEach((child) => renderNode(child, writer));
        let dx = writer.renderState.x - x;
        writer.popState();
        return { dx };
      }
      case TokenType.Percent:
        return renderOperator(node, '%', writer);
      case TokenType.Times:
        return renderOperator(node, '×', writer);
      case TokenType.Divide:
        return renderOperator(node, '÷', writer);
      case TokenType.Plus:
        return renderOperator(node, '+', writer);
      case TokenType.Minus:
        return renderOperator(node, '−', writer);
      case TokenType.Equals:
        return renderOperator(node, '=', writer);
      case TokenType.LessThan:
        return renderOperator(node, '<', writer);
      case TokenType.LessThanOrEqual:
        return renderOperator(node, '≤', writer);
      case TokenType.GreaterThan:
        return renderOperator(node, '>', writer);
      case TokenType.GreaterThanOrEqual:
        return renderOperator(node, '≥', writer);
      case TokenType.Square:
        return renderText(node, '□︎', writer, 'KaTeX_AMS');
      case TokenType.Triangle:
        return renderText(node, '△', writer, 'KaTeX_Main');
      case TokenType.SquareRoot:
        return renderSquareRoot(node, writer);
      case TokenType.Dfrac: {
        return renderFraction(node, writer);
      }
      case TokenType.Alphabet:
        return renderText(node, node.token.token, writer, 'KaTeX_Math');
      case TokenType.Number: {
        return renderText(node, node.token.token, writer);
      }
    }
  } else if (node.nodeType === NodeType.PGroup) {
    let x = writer.renderContext.renderState.x;
    writer.text('(');
    for (const child of node.children) {
      renderNode(child, writer);
    }
    writer.text(')');
    renderSubscriptAndSuperscript(node, writer);

    let dx = writer.renderContext.renderState.x - x;
    return { dx };
  } else if (node.nodeType === NodeType.BGroup) {
    let x = writer.renderContext.renderState.x;
    writer.text('[');
    for (const child of node.children) {
      renderNode(child, writer);
    }
    writer.text(']');
    let dx = writer.renderContext.renderState.x - x;
    return { dx };
  } else if (node.nodeType === NodeType.CBGroup) {
    let x = writer.renderContext.renderState.x;
    for (const child of node.children) {
      renderNode(child, writer);
    }
    let dx = writer.renderContext.renderState.x - x;
    return { dx };
  }
  return { dx: 0 };
}

export function renderOperator(
  node: LatexNode,
  text: string,
  writer: LatexWriter,
  font: string | null = 'KaTeX_Main'
): RenderingResult {
  return renderText(node, text, writer, font, { extraMargin: 0.3 });
}

export function renderText(
  node: LatexNode,
  text: string,
  writer: LatexWriter,
  font: string | null = null,
  options: TextRenderingOptions = { extraMargin: 0 }
): RenderingResult {
  const state = writer.renderContext.renderState;
  let x = state.x;
  writer.text(text, font, options);
  let result = renderSubscriptAndSuperscript(node, writer);
  writer.renderState.x += result.dx;
  let dx = writer.renderContext.renderState.x - x;
  return { dx: dx };
}

export function renderFraction(
  node: LatexNode,
  writer: LatexWriter
): RenderingResult {
  const numerator = node.children[0];
  const denominator = node.children[1];
  const numeratorCanvas = fitToContent(
    render([numerator], {
      fontSize: writer.renderContext.renderState.fontSize,
      fillBackground: false,
    })
  );
  const denominatorCanvas = fitToContent(
    render([denominator], {
      fontSize: writer.renderContext.renderState.fontSize,
      fillBackground: false,
    })
  );
  const width = writer.fraction(numeratorCanvas, denominatorCanvas);
  return { dx: width };
}

export function renderSquareRoot(
  node: LatexNode,
  writer: LatexWriter
): RenderingResult {
  const contentCanvas = fitToContent(
    render(node.children, {
      fontSize: writer.renderContext.renderState.fontSize,
      fillBackground: false,
    })
  );
  const width = writer.squareRoot(contentCanvas);
  return { dx: width };
}

export function renderSubscriptAndSuperscript(
  node: LatexNode,
  writer: LatexWriter
): RenderingResult {
  let result: RenderingResult | null = null;
  if (node.superscript) {
    result = renderNode(node.superscript, writer);
  }
  if (node.subscript) {
    result = renderNode(node.subscript, writer);
  }
  return {
    dx: result?.dx || 0,
  };
}

import { measureText } from './font.ts';
import { parseLatex, printNode } from './parser.ts';

function main() {
  deregisterAllFonts();
  registerFont('./fonts/KaTeX_AMS-Regular.ttf', { family: 'KaTeX_AMS' });
  registerFont('./fonts/KaTeX_Main-Regular.ttf', { family: 'KaTeX_Main' });
  // KaTeX_Math-Italic がなぜか効かないため、KaTeX_Math も KaTeX_Main-Regular にしている
  registerFont('./fonts/KaTeX_Main-Regular.ttf', { family: 'KaTeX_Math' });
  // registerFont('./fonts/KaTeX_Math-Italic.ttf', { family: 'KaTeX_Math' });

  // const node = parseLatex('yx^2_2 \\square ABC \\triangle ABC 3^{32}');
  // const node = parseLatex('3 \\dfrac { 35^2_2 } 4 \\times 9 = y(3 + 4)^2 - 5');
  // const node = parseLatex('x = xxxxx');
  const node = parseLatex(
    'y = \\sqrt 3 \\times \\sqrt \\dfrac { 999 } { 4^2 }'
  );
  printNode(node);
  const canvas = render(node.children, {
    width: 600,
    height: 400,
    fontSize: 48,
    marginRatio: 0.2,
  });
  fs.writeFileSync('test.png', canvas.toBuffer());
}

main();
