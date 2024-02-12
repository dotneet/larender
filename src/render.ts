import {
  Canvas,
  CanvasRenderingContext2D,
  createCanvas,
  deregisterAllFonts,
  registerFont,
} from 'canvas';
import { LatexNode, NodeType, TokenType } from './ast.ts';
import { measureText } from './font.ts';
import { parseLatex, printNode } from './parser.ts';

export type RenderState = {
  x: number;
  y: number;
  fontSize: number;
};

type RenderingResult = {
  dx: number;
};

const DUMMY_CHAR = 'M';

class RenderContext {
  private states: RenderState[] = [];
  constructor(rootRenderState: RenderState) {
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
  width: number;
  height: number;
  fillBackground: boolean;
  backgroundColor: string;
  marginRatio: number;
  operatorMarginRatio: number;
  mainFontFamily: string;
  mathFontFamily: string;
  amsFontFamily: string;
};

export const DefaultRenderOptions: RenderOptions = {
  fontSize: 48,
  width: 600,
  height: 400,
  fillBackground: true,
  backgroundColor: 'white',
  marginRatio: 0.1,
  operatorMarginRatio: 0.3,
  mainFontFamily: 'KaTeX_Main',
  mathFontFamily: 'KaTeX_Math',
  amsFontFamily: 'KaTeX_AMS',
};

type TextRenderingOptions = {
  extraMargin: number;
  fontSize?: number;
};

class LatexRenderer {
  private drawContext: CanvasRenderingContext2D;
  private renderContext: RenderContext;

  constructor(public canvas: Canvas, private options: RenderOptions) {
    const ctx = canvas.getContext('2d');
    if (options.fillBackground) {
      ctx.fillStyle = options.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.fillStyle = 'black';

    const initialRenderState = {
      x: 0,
      y: Math.ceil(canvas.height / 2) - options.fontSize,
      fontSize: options.fontSize,
    };
    this.renderContext = new RenderContext(initialRenderState);

    this.drawContext = ctx;
    this.options = options;
  }

  static create(opts: Partial<RenderOptions> = {}): LatexRenderer {
    const options: RenderOptions = Object.assign(DefaultRenderOptions, opts);
    const canvas = createCanvas(options.width, options.height);

    return new LatexRenderer(canvas, options);
  }

  render(nodes: LatexNode[]) {
    for (const child of nodes) {
      this.renderNode(child);
    }
  }

  renderWithNewCanvas(
    nodes: LatexNode[],
    options: Partial<RenderOptions> = {}
  ) {
    const renderer = LatexRenderer.create(options);
    renderer.render(nodes);
    return renderer.canvas;
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

  drawText(
    text: string,
    font: string | null = null,
    style: string = '',
    options: Partial<TextRenderingOptions> = { extraMargin: 0 }
  ) {
    const opts: TextRenderingOptions = {
      ...{
        extraMargin: 0,
      },
      ...options,
    };
    const state = this.renderState;
    let fontName = font || this.options.mainFontFamily;
    const fontSize = opts.fontSize || state.fontSize;
    const mMetrics = measureText(DUMMY_CHAR, fontName, fontSize);
    const sideMargin = Math.ceil(opts.extraMargin * mMetrics.width);
    state.x += sideMargin;
    const metrics = measureText(text, fontName, fontSize);
    const ctxFont = `${style} ${fontSize}px "${fontName}"`;
    this.drawContext.font = ctxFont;
    this.drawContext.fillText(text, state.x, state.y);
    if (sideMargin > 0) {
      state.x += metrics.width + sideMargin;
    } else {
      state.x += metrics.width;
    }
  }

  drawFraction(numerator: Canvas, denominator: Canvas): number {
    const state = this.renderState;
    const metrics = measureText(
      DUMMY_CHAR,
      this.options.mainFontFamily,
      state.fontSize
    );
    const margin = metrics.width * this.options.marginRatio;
    const width = Math.max(numerator.width, denominator.width);
    const barY = state.y - metrics.height / 2;
    const x = state.x;
    const maxWidth =
      Math.max(numerator.width, denominator.width) + metrics.width * 0.3;

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

  drawSquareRoot(contentCanvas: Canvas) {
    const ctx = this.drawContext;
    const contentWidth = contentCanvas.width;
    const contentHeight = contentCanvas.height;
    const metrics = measureText(
      DUMMY_CHAR,
      this.options.mainFontFamily,
      this.renderState.fontSize
    );
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

  renderNode(node: LatexNode): RenderingResult {
    if (node.nodeType === NodeType.Plain) {
      switch (node.token!.tokenType) {
        case TokenType.Superscript: {
          const state = this.renderState;
          const scriptFontSize = Math.ceil(state.fontSize / 2);
          const metrics = measureText(
            DUMMY_CHAR,
            this.options.mainFontFamily,
            state.fontSize
          );
          const scriptMetrics = measureText(
            DUMMY_CHAR,
            this.options.mainFontFamily,
            scriptFontSize
          );
          this.pushState({
            x: this.renderState.x,
            y: this.renderState.y - metrics.height + scriptMetrics.height / 2,
            fontSize: scriptFontSize,
          });
          let x = this.renderState.x;
          node.children.forEach((child) => this.renderNode(child));
          let dx = this.renderState.x - x;
          this.popState();
          return { dx };
        }
        case TokenType.Subscript: {
          const state = this.renderState;
          const scriptFontSize = Math.ceil(state.fontSize / 2);
          const scriptMetrics = measureText(
            DUMMY_CHAR,
            this.options.mainFontFamily,
            scriptFontSize
          );
          this.pushState({
            x: this.renderState.x,
            y: this.renderState.y + scriptMetrics.height / 2,
            fontSize: scriptFontSize,
          });
          let x = this.renderState.x;
          node.children.forEach((child) => this.renderNode(child));
          let dx = this.renderState.x - x;
          this.popState();
          return { dx };
        }
        case TokenType.Percent:
          return this.renderOperator(node, '%');
        case TokenType.Times:
          return this.renderOperator(node, '×');
        case TokenType.Divide:
          return this.renderOperator(node, '÷');
        case TokenType.Plus:
          return this.renderOperator(node, '+');
        case TokenType.Minus:
          return this.renderOperator(node, '−');
        case TokenType.PlusMinus:
          return this.renderOperator(node, '±');
        case TokenType.Equals:
          return this.renderOperator(node, '=');
        case TokenType.LessThan:
          return this.renderOperator(node, '<');
        case TokenType.LessThanOrEqual:
          return this.renderOperator(node, '≤');
        case TokenType.GreaterThan:
          return this.renderOperator(node, '>');
        case TokenType.GreaterThanOrEqual:
          return this.renderOperator(node, '≥');
        case TokenType.Sim:
          return this.renderOperator(node, '∼');
        case TokenType.Simeq:
          return this.renderOperator(node, '≃');
        case TokenType.Equivalent:
          return this.renderOperator(node, '≡');
        case TokenType.Infinity:
          return this.renderText(node, '∞');
        case TokenType.Summation:
          return this.renderText(node, '∑');
        case TokenType.Product:
          return this.renderText(node, '∏');
        case TokenType.Integrate:
          return this.renderText(node, '∫');
        case TokenType.Limit:
          return this.renderText(node, 'lim');
        case TokenType.Angle:
          return this.renderText(node, '∠');
        case TokenType.Square:
          return this.renderText(node, '□︎', this.options.amsFontFamily);
        case TokenType.Triangle:
          return this.renderText(node, '△');
        case TokenType.Bottom:
          return this.renderText(node, '⊥');
        case TokenType.Circle:
          return this.renderText(node, '∘');
        case TokenType.Ell:
          return this.renderText(node, 'ℓ');
        case TokenType.Cdot:
          return this.renderText(node, '⋅');
        case TokenType.Cdots:
          return this.renderText(node, '⋯');
        case TokenType.Modulus:
          return this.renderText(node, 'mod');
        // Greeks
        case TokenType.Pi:
          return this.renderText(node, 'π');
        case TokenType.SquareRoot:
          return this.renderSquareRoot(node);
        case TokenType.Dfrac: {
          return this.renderFraction(node);
        }
        case TokenType.Alphabet:
          return this.renderText(
            node,
            node.token!.token,
            this.options.mathFontFamily,
            'italic'
          );
        case TokenType.Number: {
          return this.renderText(node, node.token!.token);
        }
        case TokenType.Character:
          return this.renderText(node, node.token!.token);
        default:
          return this.renderText(node, node.token!.token);
      }
    } else if (node.nodeType === NodeType.PGroup) {
      let x = this.renderState.x;
      this.drawText('(');
      for (const child of node.children) {
        this.renderNode(child);
      }
      this.drawText(')');
      this.renderSubscriptAndSuperscript(node);

      let dx = this.renderState.x - x;
      return { dx };
    } else if (node.nodeType === NodeType.BGroup) {
      let x = this.renderState.x;
      this.drawText('[');
      for (const child of node.children) {
        this.renderNode(child);
      }
      this.drawText(']');
      let dx = this.renderState.x - x;
      return { dx };
    } else if (node.nodeType === NodeType.CBGroup) {
      let x = this.renderState.x;
      for (const child of node.children) {
        this.renderNode(child);
      }
      let dx = this.renderState.x - x;
      return { dx };
    } else if (node.nodeType === NodeType.Paragraph) {
      this.renderParagraph(node);
      return { dx: 0 };
    } else if (node.nodeType === NodeType.Environment) {
      const envName = node.token!.token;
      if (envName === 'cases') {
        const canvas = fitToContent(
          this.renderWithNewCanvas(node.children, {
            fontSize: this.renderState.fontSize,
            fillBackground: false,
          })
        );
        const fontFamily = this.options.amsFontFamily;
        this.drawText('{', fontFamily, '', {
          fontSize: canvas.height,
        });
        const metrics = measureText('{', fontFamily, canvas.height);
        this.renderState.x += metrics.width * 0.2;
        this.drawContext.drawImage(
          canvas,
          this.renderState.x,
          this.renderState.y - canvas.height / 2 - metrics.descent
        );
        this.renderState.x += canvas.width;
      } else {
        this.render(node.children);
      }
    }
    return { dx: 0 };
  }

  renderParagraph(node: LatexNode): void {
    if (node.nodeType !== NodeType.Paragraph) {
      throw new Error('Invalid node type');
    }
    const lineCanvases: Canvas[] = [];
    for (const lineNode of node.children) {
      const lineCanvas = fitToContent(
        this.renderWithNewCanvas(lineNode.children, {
          fontSize: this.renderState.fontSize,
          fillBackground: false,
        })
      );
      lineCanvases.push(lineCanvas);
    }
    for (const lineCanvas of lineCanvases) {
      this.drawContext.drawImage(
        lineCanvas,
        this.renderState.x,
        this.renderState.y
      );
      const metrics = measureText(
        DUMMY_CHAR,
        this.options.mainFontFamily,
        this.renderState.fontSize
      );
      const lineMargin = metrics.height * 0.5;
      this.renderState.y += lineCanvas.height + lineMargin;
    }

    const metrics = measureText(
      DUMMY_CHAR,
      this.options.mainFontFamily,
      this.renderState.fontSize
    );
    const paragraphMargin = metrics.height;
    this.renderState.y += paragraphMargin;
  }

  renderOperator(
    node: LatexNode,
    text: string,
    font: string | null = null
  ): RenderingResult {
    return this.renderText(node, text, font, '', {
      extraMargin: this.options.operatorMarginRatio,
    });
  }

  renderText(
    node: LatexNode,
    text: string,
    font: string | null = null,
    style: string = '',
    options: Partial<TextRenderingOptions> = {}
  ): RenderingResult {
    const opts: TextRenderingOptions = {
      ...{
        extraMargin: 0,
      },
      ...options,
    };
    if (!font) {
      font = this.options.mainFontFamily;
    }
    const state = this.renderState;
    let x = state.x;
    this.drawText(text, font, '', opts);
    let result = this.renderSubscriptAndSuperscript(node);
    this.renderState.x += result.dx;

    const metrics = measureText(DUMMY_CHAR, font, state.fontSize);
    const margin = Math.ceil(this.options.marginRatio * metrics.width);
    state.x += margin;

    let dx = this.renderState.x - x;
    return { dx: dx };
  }

  renderFraction(node: LatexNode): RenderingResult {
    const numerator = node.children[0];
    const denominator = node.children[1];
    const numeratorCanvas = fitToContent(
      this.renderWithNewCanvas([numerator], {
        fontSize: this.renderState.fontSize,
        fillBackground: false,
      })
    );
    const denominatorCanvas = fitToContent(
      this.renderWithNewCanvas([denominator], {
        fontSize: this.renderState.fontSize,
        fillBackground: false,
      })
    );
    const width = this.drawFraction(numeratorCanvas, denominatorCanvas);
    return { dx: width };
  }

  renderSquareRoot(node: LatexNode): RenderingResult {
    const contentCanvas = fitToContent(
      this.renderWithNewCanvas(node.children, {
        fontSize: this.renderState.fontSize,
        fillBackground: false,
      })
    );
    const width = this.drawSquareRoot(contentCanvas);
    return { dx: width };
  }

  renderSubscriptAndSuperscript(node: LatexNode): RenderingResult {
    let result: RenderingResult | null = null;
    if (node.superscript) {
      result = this.renderNode(node.superscript);
    }
    if (node.subscript) {
      result = this.renderNode(node.subscript);
    }
    return {
      dx: result?.dx || 0,
    };
  }
}

export function initRendering() {
  deregisterAllFonts();
  registerFont('./fonts/KaTeX_AMS-Regular.ttf', { family: 'KaTeX_AMS' });
  registerFont('./fonts/KaTeX_Main-Regular.ttf', { family: 'KaTeX_Main' });
  // KaTeX_Math-Italic doesn't works for some reasons, so use lmroman9-italic.otf instead
  // registerFont('./fonts/KaTeX_Main-Regular.ttf', { family: 'KaTeX_Math' });
  registerFont('./fonts/lmroman9-italic.otf', {
    // registerFont('./fonts/KaTeX_Math-Italic.ttf', {
    family: 'KaTeX_Math',
    style: 'italic',
  });
  // registerFont('./fonts/KaTeX_Math-Italic.ttf', {family: 'KaTeX_Math'});
}

export function renderLatex(
  latex: string,
  options: Partial<RenderOptions> = {}
): Buffer {
  const node = parseLatex(latex);
  const canvas = LatexRenderer.create(options);
  canvas.render(node.children);
  return canvas.canvas.toBuffer();
}

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
