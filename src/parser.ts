import { LatexNode, NodeType, TokenType, createNode } from './ast.ts';
import { Lexer } from './lexer.ts';

type ParseState = {
  node: LatexNode;
  // このノードがパラメータとして持つべき子ノードの数
  numOfParams: number | null;
};

class ParseContext {
  private stateStacks: ParseState[] = [];

  constructor(private rootNode: LatexNode) {
    this.stateStacks.push({ node: rootNode, numOfParams: null });
  }

  public pushState(node: LatexNode, numOfParams: number | null = null) {
    this.stateStacks.push({ node, numOfParams: numOfParams });
  }

  public popState() {
    this.stateStacks.pop();
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
  const rootNode = createNode(
    { token: 'Root', tokenType: TokenType.Unknown },
    NodeType.Root
  );
  const context = new ParseContext(rootNode);
  while (lexer.hasMoreTokens()) {
    lexer.nextToken();
    const token = lexer.currentToken();
    const lastNode =
      context.top.node.children[context.top.node.children.length - 1];
    switch (token.tokenType) {
      case TokenType.Subscript: {
        const node = createNode(token);
        if (!lastNode) {
          throw new Error('Subscript without previous node');
        }
        lastNode.subscript = node;
        context.pushState(node, 1);
        break;
      }
      case TokenType.Superscript: {
        const node = createNode(token);
        if (!lastNode) {
          throw new Error('Superscript without previous node');
        }
        lastNode.superscript = node;
        context.pushState(node, 1);
        break;
      }
      case TokenType.LParen: {
        const node = createNode(token, NodeType.PGroup);
        context.addChild(node);
        context.pushState(node);
        break;
      }
      case TokenType.RParen: {
        if (context.top.node.token.tokenType !== TokenType.LParen) {
          throw new Error('Mismatched Parenthesis');
        }
        context.popState();
        break;
      }
      case TokenType.LBracket: {
        const node = createNode(token, NodeType.BGroup);
        context.addChild(node);
        context.pushState(node);
        break;
      }
      case TokenType.RBracket: {
        if (context.top.node.token.tokenType !== TokenType.LBracket) {
          throw new Error('Mismatched Bracket');
        }
        context.popState();
        break;
      }
      case TokenType.LBrace: {
        const node = createNode(token, NodeType.CBGroup);
        context.addChild(node);
        context.pushState(node);
        break;
      }
      case TokenType.RBrace: {
        if (context.top.node.token.tokenType !== TokenType.LBrace) {
          throw new Error('Mismatched Brace');
        }
        context.popState();
        break;
      }
      // Single Parameter Nodes
      case TokenType.Sin:
      case TokenType.Cos:
      case TokenType.Tan:
      case TokenType.SquareRoot: {
        const node = createNode(token);
        context.addChild(node);
        context.pushState(node, 1);
        break;
      }
      case TokenType.Dfrac: {
        const node = createNode(token);
        context.addChild(node);
        context.pushState(node, 2);
        break;
      }
      default: {
        const node = createNode(token);
        context.addChild(node);
        break;
      }
    }
    const numOfParams = context.top.node.children.length;
    if (context.numOfParams === numOfParams) {
      context.popState();
    }
  }
  return rootNode;
}

export function printNode(node: LatexNode, depth = 0) {
  console.log('  '.repeat(depth), node.token.token);
  node.superscript && printNode(node.superscript, depth + 1);
  node.subscript && printNode(node.subscript, depth + 1);
  node.children.forEach((child) => printNode(child, depth + 2));
}
