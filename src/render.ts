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

  text(text: string, font: string | null = null) {
    const state = this.renderContext.renderState;
    const metrics = measureText(text, state.fontSize);
    let fontName = font || 'KaTeX_Main';
    const ctxFont = `${state.fontSize}px "${fontName}"`;
    this.drawContext.font = ctxFont;
    this.drawContext.fillText(text, state.x, state.y);
    const margin = this.options.marginRatio * metrics.width;
    state.x += metrics.width + margin;
  }

  fraction(numerator: Canvas, denominator: Canvas): number {
    const state = this.renderContext.renderState;
    const metrics = measureText('X', state.fontSize);
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
      barY + metrics.height * 0.3
    );

    state.x += width + margin;
    return maxWidth;
  }
}

export function render(
  node: LatexNode,
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
  if (node.nodeType === NodeType.Root) {
    for (const child of node.children) {
      renderNode(child, writer);
    }
  } else {
    renderNode(node, writer);
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
        const metrics = measureText('5', state.fontSize);
        const scriptMetrics = measureText('5', scriptFontSize);
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
        const metrics = measureText('5', state.fontSize);
        const scriptMetrics = measureText('5', scriptFontSize);
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
        return renderText(node, '%', writer, 'KaTeX_Main');
      case TokenType.Times:
        return renderText(node, '×', writer, 'KaTeX_Main');
      case TokenType.Divide:
        return renderText(node, '÷', writer, 'KaTeX_Main');
      case TokenType.Plus:
        return renderText(node, '+', writer, 'KaTeX_Main');
      case TokenType.Minus:
        return renderText(node, '−', writer, 'KaTeX_Main');
      case TokenType.Equals:
        return renderText(node, '=', writer, 'KaTeX_Main');
      case TokenType.Square:
        return renderText(node, '□︎', writer, 'KaTeX_AMS');
      case TokenType.Triangle:
        return renderText(node, '△', writer, 'KaTeX_Main');
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

export function renderText(
  node: LatexNode,
  text: string,
  writer: LatexWriter,
  font: string | null = null
): RenderingResult {
  const state = writer.renderContext.renderState;
  let x = state.x;
  writer.text(text, font);
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
    render(numerator, {
      fontSize: writer.renderContext.renderState.fontSize,
      fillBackground: false,
    })
  );
  const denominatorCanvas = fitToContent(
    render(denominator, {
      fontSize: writer.renderContext.renderState.fontSize,
      fillBackground: false,
    })
  );
  const width = writer.fraction(numeratorCanvas, denominatorCanvas);
  return { dx: width };
}

export function renderSubscriptAndSuperscript(
  node: LatexNode,
  writer: LatexWriter
): RenderingResult {
  const state = writer.renderContext.renderState;
  const metrics = measureText('X', state.fontSize);
  const scriptFontSize = Math.ceil(state.fontSize / 2);
  const scriptMetrics = measureText('X', scriptFontSize);
  /*
  writer.pushState({
    x: writer.renderContext.renderState.x,
    y:
      writer.renderContext.renderState.y -
      metrics.height +
      scriptMetrics.height,
    fontSize: state.fontSize,
  });
  */
  let result: RenderingResult | null = null;
  if (node.superscript) {
    result = renderNode(node.superscript, writer);
  }
  if (node.subscript) {
    result = renderNode(node.subscript, writer);
  }
  // writer.popState();
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
  const node = parseLatex('3 \\dfrac { 35^2_2 } 4 \\times 9 = y(3 + 4) - 5');
  // printNode(node)
  const canvas = render(node, {
    width: 600,
    height: 400,
    fontSize: 48,
  });
  fs.writeFileSync('test.png', canvas.toBuffer());
}

main();
