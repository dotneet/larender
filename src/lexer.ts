// LaTeX Lexer written in TypeScript

import { Token, TokenType } from './ast.ts';

export class Lexer {
  private input: string;
  private index: number;
  private token: string;
  private tokenType: TokenType;

  constructor(input: string) {
    this.input = input;
    this.index = 0;
    this.token = '';
    this.tokenType = TokenType.Unknown;
  }

  public hasMoreTokens(): boolean {
    return this.index < this.input.length;
  }

  currentToken(): Token {
    return {
      token: this.token,
      tokenType: this.tokenType,
    };
  }

  public nextToken(): void {
    this.token = '';
    while (this.index < this.input.length) {
      const char = this.input[this.index];
      if (char === ' ') {
        this.index++;
      } else if (char === '+') {
        this.token = char;
        this.tokenType = TokenType.Plus;
        this.index++;
        break;
      } else if (char === '-') {
        this.token = char;
        this.tokenType = TokenType.Minus;
        this.index++;
        break;
      } else if (char === '\\') {
        this.index++;
        this.token = char;
        while (this.index < this.input.length) {
          const nextChar = this.input[this.index];
          if (nextChar.match(/[a-zA-Z]/)) {
            this.token += nextChar;
            this.index++;
          } else {
            break;
          }
        }
        this.tokenType = getTokenTypeFromCommand(this.token);
        break;
      } else if (char === '%') {
        this.token = char;
        this.tokenType = TokenType.Percent;
        this.index++;
        break;
      } else if (char === '=') {
        this.token = char;
        this.tokenType = TokenType.Equals;
        this.index++;
        break;
      } else if (char === '(') {
        this.token = char;
        this.tokenType = TokenType.LParen;
        this.index++;
        break;
      } else if (char === ')') {
        this.token = char;
        this.tokenType = TokenType.RParen;
        this.index++;
        break;
      } else if (char === '{') {
        this.token = char;
        this.tokenType = TokenType.LBrace;
        this.index++;
        break;
      } else if (char === '}') {
        this.token = char;
        this.tokenType = TokenType.RBrace;
        this.index++;
        break;
      } else if (char === '[') {
        this.token = char;
        this.tokenType = TokenType.LBracket;
        this.index++;
        break;
      } else if (char === ']') {
        this.token = char;
        this.tokenType = TokenType.RBracket;
        this.index++;
        break;
      } else if (char === '^') {
        this.token = char;
        this.tokenType = TokenType.Superscript;
        this.index++;
        break;
      } else if (char === '_') {
        this.token = char;
        this.tokenType = TokenType.Subscript;
        this.index++;
        break;
      } else if (char.match(/[0-9]/)) {
        this.token = char;
        this.tokenType = TokenType.Number;
        this.index++;
        break;
      } else if (char.match(/[a-zA-Z]/)) {
        this.token = char;
        this.tokenType = TokenType.Alphabet;
        this.index++;
        break;
      } else {
        throw new Error('Invalid Token');
      }
    }
  }
}

function getTokenTypeFromCommand(command: string): TokenType {
  // TODO: check if the command is a valid LaTeX command
  return command as TokenType;
}
