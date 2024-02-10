import { CanvasRenderingContext2D, createCanvas, registerFont } from 'canvas';
import fs from 'node:fs';
import { LatexNode, NodeType, TokenType } from './ast.ts';

export type RenderState = {
  x: number;
  y: number;
  fontSize: number;
};

export class RenderContext {
  private states: RenderState[] = [];
  constructor(public canvasCtx: CanvasRenderingContext2D, rootRenderState: RenderState) {
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
};

export type RenderOptions = {
  fontSize: number;
  margin: number;
  width: number;
  height: number;
};

class LatexWriter {
  private drawContext: CanvasRenderingContext2D;

  constructor(public renderContext: RenderContext, private options: RenderOptions) {
    this.renderContext = renderContext;
    this.drawContext = renderContext.canvasCtx;
    this.options = options;
  }

  get renderState() {
    return this.renderContext.renderState;
  }

  text(text: string, font: string|null = null) {
    const state = this.renderContext.renderState;
    const metrics = measureText(text, state.fontSize);
    let fontName = font || 'KaTeX_Main';
    const ctxFont = `${state.fontSize}px ${fontName}`;
    console.log(ctxFont);
    this.drawContext.font = ctxFont
    this.drawContext.fillText(text, state.x, state.y);
    state.x += metrics.width + this.options.margin;
  }

  pushState(renderState: RenderState) {
    this.renderContext.pushState(renderState);
  }

  popState(): RenderState | undefined {
    return this.renderContext.popState();
  }
}

export function render(node: LatexNode, opts:Partial<RenderOptions> = {}): void {

  const options:RenderOptions = Object.assign({
    fontSize: 20,
    margin: 10,
    width: 200,
    height: 200,
  }, opts);

  const canvas = createCanvas(options.width, options.height);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'white';
  ctx.fillRect(0, 0, options.width, options.height);
  ctx.fillStyle = 'black';

  const renderContext = new RenderContext(ctx,{
    x: 20,
    y: options.fontSize + 20,
    fontSize: options.fontSize,
    }
  );
  const writer = new LatexWriter(renderContext, options);
  for (const child of node.children) {
    renderNode(child, writer);
  }

  fs.writeFileSync('test.png', canvas.toBuffer());
}

type RenderingResult = {
  dx: number;
}

export function renderNode(node: LatexNode, writer: LatexWriter): RenderingResult {
  if (node.nodeType === NodeType.Plain) {
    switch(node.token.tokenType) {
      case TokenType.Superscript: {
        const state = writer.renderContext.renderState
        const metrics = measureText('X', state.fontSize);
        const scriptFontSize = Math.ceil(state.fontSize / 2);
        const scriptMetrics = measureText('X', scriptFontSize);
        writer.pushState({
          x: writer.renderContext.renderState.x,
          y: writer.renderContext.renderState.y,
          fontSize: scriptFontSize,
        });
        let x = writer.renderState.x;
        node.children.forEach((child) => renderNode(child, writer));
        let dx = writer.renderState.x - x;
        writer.popState();
        return { dx };
      }
      case TokenType.Subscript: {
        const state = writer.renderContext.renderState
        const scriptFontSize = Math.ceil(state.fontSize / 2);
        const metrics = measureText('X', state.fontSize);
        const scriptMetrics = measureText('X', scriptFontSize);
        writer.pushState({
          x: writer.renderContext.renderState.x,
          y: writer.renderContext.renderState.y + metrics.height,
          fontSize: scriptFontSize,
        });
        let x = writer.renderState.x;
        node.children.forEach((child) => renderNode(child, writer));
        let dx = writer.renderState.x - x;  
        writer.popState();
        return { dx };
      }
      case TokenType.Square:
        return renderText(node, '□︎', writer, 'KaTeX_AMS');
      case TokenType.Triangle:
        return renderText(node, '△', writer, 'KaTeX_Main');
      case TokenType.Alphabet:
        return renderText(node, node.token.token, writer, 'KaTeX_Math');
      case TokenType.Number: {
        return renderText(node, node.token.token, writer);
      }
    }
  } else if (node.nodeType === NodeType.PGroup) {
    let x = writer.renderContext.renderState.x;
    writer.text('(')
    for (const child of node.children) {
      renderNode(child, writer);
    }
    writer.text(')');
    let dx = writer.renderContext.renderState.x - x;
    return { dx };
  } else if (node.nodeType === NodeType.BGroup) {
    let x = writer.renderContext.renderState.x;
    writer.text('[')
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
  return { dx: 0}
}

export function renderText(node:LatexNode, text: string, writer: LatexWriter, font: string|null = null): RenderingResult {
  const state = writer.renderContext.renderState;
  let x = state.x;
  writer.text(text, font);
  let result = renderSubscriptAndSuperscript(node, writer);
  writer.renderState.x += result.dx;
  let dx = writer.renderContext.renderState.x - x;
  return { dx: dx };
}

export function renderSubscriptAndSuperscript(node: LatexNode, writer: LatexWriter): RenderingResult {
  const state = writer.renderContext.renderState
  const metrics = measureText('X', state.fontSize);
  const scriptFontSize = Math.ceil(state.fontSize / 2);
  const scriptMetrics = measureText('X', scriptFontSize);
  writer.pushState({
    x: writer.renderContext.renderState.x,
    y: writer.renderContext.renderState.y - metrics.height + scriptMetrics.height,
    fontSize: scriptFontSize,
  });
  let result: RenderingResult|null = null
  if (node.superscript) {
    result = renderNode(node.superscript, writer);
  }
  if (node.subscript) {
    result = renderNode(node.subscript, writer);
  }
  writer.popState();
  return { 
    dx: result?.dx || 0,
  };
}

import { measureText } from './font.ts';
import { parseLatex, printNode } from './parser.ts';

function main() {
  registerFont('./fonts/KaTeX_AMS-Regular.ttf', { family: 'KaTeX_AMS' });
  registerFont('./fonts/KaTeX_Main-Regular.ttf', { family: 'KaTeX_Main' });
  registerFont('./fonts/KaTeX_Math-Italic.ttf', { family: 'KaTeX_Math' });
  const node = parseLatex('yx^2_2 \\square ABC \\triangle ABC 3^{32}');
  // printNode(node)
  render(node,{
    width: 600,
    height: 400,
    fontSize: 64,
  });
}

main()