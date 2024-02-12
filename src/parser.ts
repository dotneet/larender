import {
  LatexNode,
  NodeType,
  TokenType,
  createPlainNode as createPlainNode,
  createNode,
  createDocumentNode,
  createEnvironmentNode,
  Token,
} from './ast.ts';
import { Lexer } from './lexer.ts';

type ParseState = {
  node: LatexNode;
  // このノードがパラメータとして持つべき子ノードの数
  numOfParams: number | null;
};

class ParseContext {
  private environmentStacks: LatexNode[] = [];
  private stateStacks: ParseState[] = [];
  private paragraphIndex = 0;
  private lineIndex = 0;

  constructor(private rootNode: LatexNode) {
    const lineNode = rootNode.children[0].children[0].children[0];
    this.environmentStacks.push(rootNode.children[0]);
    this.stateStacks.push({ node: lineNode, numOfParams: null });
  }

  public createNewLine() {
    const node = createNode(NodeType.Line);
    this.paragraphNode.children.push(node);
    this.lineIndex++;
    this.stateStacks = [{ node, numOfParams: null }];
  }

  public createNewParagraph() {
    const node = createNode(NodeType.Paragraph, [createNode(NodeType.Line)]);
    this.environmentNode.children.push(node);
    this.paragraphIndex++;
    this.lineIndex = 0;
    this.stateStacks = [{ node: node.children[0], numOfParams: null }];
  }

  public pushEnvironment(node: LatexNode) {
    if (node.nodeType !== NodeType.Environment) {
      throw new Error('Invalid node type');
    }
    this.environmentStacks.push(node);
    this.top.node.children.push(node);
    const lineNode = this.environmentNode.children[0].children[0];
    this.pushState(lineNode);
  }

  public popEnvironment() {
    const env = this.environmentStacks.pop();
    this.popState();
    return env;
  }

  public pushState(node: LatexNode, numOfParams: number | null = null) {
    this.stateStacks.push({ node, numOfParams: numOfParams });
  }

  public popState() {
    this.stateStacks.pop();
  }

  public get environmentNode() {
    return this.environmentStacks[this.environmentStacks.length - 1];
  }

  public get paragraphNode() {
    return this.environmentNode.children[
      this.environmentNode.children.length - 1
    ];
  }

  public get lineNode() {
    return this.paragraphNode.children[this.paragraphNode.children.length - 1];
  }

  public get top() {
    return this.stateStacks[this.stateStacks.length - 1];
  }

  public get numOfParams() {
    return this.top.numOfParams;
  }

  public addChild(node: LatexNode) {
    this.top.node.children.push(node);
  }
}

export function parseLatex(latex: string): LatexNode {
  const lexer = new Lexer(latex);
  const rootNode = createDocumentNode();
  const context = new ParseContext(rootNode);
  while (lexer.hasMoreTokens()) {
    lexer.nextToken();
    const token = lexer.currentToken();
    const lastNode =
      context.top.node.children[context.top.node.children.length - 1];
    switch (token.tokenType) {
      case TokenType.Subscript: {
        const node = createPlainNode(token);
        if (!lastNode) {
          throw new Error('Subscript without previous node');
        }
        lastNode.subscript = node;
        context.pushState(node, 1);
        break;
      }
      case TokenType.Superscript: {
        const node = createPlainNode(token);
        if (!lastNode) {
          throw new Error('Superscript without previous node');
        }
        lastNode.superscript = node;
        context.pushState(node, 1);
        break;
      }
      case TokenType.Begin: {
        lexer.nextToken();
        if (lexer.currentToken().tokenType !== TokenType.LBrace) {
          throw new Error('\\begin command must have environment.');
        }
        lexer.nextToken();
        const envToken = lexer.currentToken();
        if (envToken.tokenType !== TokenType.Alphabet) {
          throw new Error('\\begin command must have environment.');
        }
        lexer.nextToken();
        if (lexer.currentToken().tokenType !== TokenType.RBrace) {
          throw new Error('\\begin command must have environment.');
        }
        const node = createEnvironmentNode(envToken);
        context.pushEnvironment(node);
        break;
      }
      case TokenType.End: {
        lexer.nextToken();
        if (lexer.currentToken().tokenType !== TokenType.LBrace) {
          throw new Error('\\begin command must have environment.');
        }
        lexer.nextToken();
        const envToken = lexer.currentToken();
        if (envToken.tokenType !== TokenType.Alphabet) {
          throw new Error('\\begin command must have environment.');
        }
        lexer.nextToken();
        if (lexer.currentToken().tokenType !== TokenType.RBrace) {
          throw new Error('\\begin command must have environment.');
        }
        if (envToken.token !== context.environmentNode.token!.token) {
          throw new Error('Mismatched environment');
        }
        context.popEnvironment();
        break;
      }
      case TokenType.LParen: {
        const node = createNode(NodeType.PGroup, [], token);
        context.addChild(node);
        context.pushState(node);
        break;
      }
      case TokenType.RParen: {
        if (context.top.node.token?.tokenType !== TokenType.LParen) {
          throw new Error('Mismatched Parenthesis');
        }
        context.popState();
        break;
      }
      case TokenType.LBracket: {
        const node = createNode(NodeType.BGroup, [], token);
        context.addChild(node);
        context.pushState(node);
        break;
      }
      case TokenType.RBracket: {
        if (context.top.node.token?.tokenType !== TokenType.LBracket) {
          throw new Error('Mismatched Bracket');
        }
        context.popState();
        break;
      }
      case TokenType.LBrace: {
        const node = createNode(NodeType.CBGroup, [], token);
        context.addChild(node);
        context.pushState(node);
        break;
      }
      case TokenType.RBrace: {
        if (context.top.node.token?.tokenType !== TokenType.LBrace) {
          throw new Error('Mismatched Brace');
        }
        context.popState();
        break;
      }
      case TokenType.SquareRoot: {
        const node = createPlainNode(token);
        context.addChild(node);
        context.pushState(node, 1);
        break;
      }
      case TokenType.Dfrac: {
        const node = createPlainNode(token);
        context.addChild(node);
        context.pushState(node, 2);
        break;
      }
      case TokenType.DoubleBackslash:
      case TokenType.Newline: {
        context.createNewLine();
        break;
      }
      case TokenType.Paragraph: {
        context.createNewParagraph();
        break;
      }
      default: {
        const node = createPlainNode(token);
        context.addChild(node);
        break;
      }
    }
    if (context.top) {
      const numOfParams = context.top.node.children.length;
      if (context.numOfParams === numOfParams) {
        context.popState();
      }
    }
  }
  return rootNode;
}

export function printNode(node: LatexNode, depth = 0) {
  console.log('  '.repeat(depth), _nodeStr(node));
  node.superscript && printNode(node.superscript, depth + 1);
  node.subscript && printNode(node.subscript, depth + 1);
  node.children.forEach((child) => printNode(child, depth + 2));
}

function _nodeStr(node: LatexNode): string {
  return node.nodeType.toString() + ': ' + node.token?.token || '-';
}
