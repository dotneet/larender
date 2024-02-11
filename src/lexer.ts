// LaTeX Lexer written in TypeScript

import { Token, TokenType } from './ast.ts';

export const simpleCharMap: { [key: string]: TokenType } = {
  '+': TokenType.Plus,
  '-': TokenType.Minus,
  '%': TokenType.Percent,
  '=': TokenType.Equals,
  '(': TokenType.LParen,
  ')': TokenType.RParen,
  '{': TokenType.LBrace,
  '}': TokenType.RBrace,
  '[': TokenType.LBracket,
  ']': TokenType.RBracket,
  '^': TokenType.Superscript,
  _: TokenType.Subscript,
  '.': TokenType.Period,
  ',': TokenType.Comma,
  ':': TokenType.Colon,
  ';': TokenType.Semicolon,
  '>': TokenType.GreaterThan,
  '<': TokenType.LessThan,
  '@': TokenType.At,
};

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
      } else if (simpleCharMap[char] !== undefined) {
        this.token = char;
        this.tokenType = simpleCharMap[char];
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
