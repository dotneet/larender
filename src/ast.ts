// LaTeX AST Tokens
export enum TokenType {
  Unknown = 'Unknown',

  // Number
  Number = 'Number',
  // alphabets
  Alphabet = 'Alphabet',
  // subscripts
  Subscript = '_',
  // superscripts
  Superscript = '^',
  // Math Symbols
  Plus = '+',
  Minus = '-',
  Modulus = '\\mod',
  Percent = '\\%',
  Times = '\\times',
  Divide = '\\div',
  Equals = '=',
  SquareRoot = '\\sqrt',
  Dfrac = '\\dfrac',
  // Comparison Operators
  LessThan = '<',
  GreaterThan = '>',
  LessThanOrEqual = '\\leq',
  GreaterThanOrEqual = '\\geq',
  // Geometry Symbols
  Triangle = '\\triangle',
  Circle = '\\circle',
  Square = '\\square',
  Bottom = '\\bot',
  // Parentheses
  LParen = '(',
  RParen = ')',
  // Bracket
  LBracket = '[',
  RBracket = ']',
  // Curly Brace
  LBrace = '{',
  RBrace = '}',
  // Greek Letters
  Alpha = '\\alpha',
  Beta = '\\beta',
  Gamma = '\\gamma',
  Delta = '\\delta',
  Epsilon = '\\epsilon',
  Zeta = '\\zeta',
  Eta = '\\eta',
  Theta = '\\theta',
  Iota = '\\iota',
  Kappa = '\\kappa',
  Lambda = '\\lambda',
  Mu = '\\mu',
  Nu = '\\nu',
  Xi = '\\xi',
  Omicron = 'o',
  Pi = '\\pi',
  Rho = '\\rho',
  Sigma = '\\sigma',
  Tau = '\\tau',
  Upsilon = '\\upsilon',
  Phi = '\\phi',
  Chi = '\\chi',
  Psi = '\\psi',
  Omega = '\\omega',
  // Operators
  Sin = '\\sin',
  Cos = '\\cos',
  Tan = '\\tan',
  Log = '\\log',
  // Units
  Liter = 'L',
  MilliLiter = 'mL',
  Ell = 'ell',
}

export type Token = {
  token: string;
  tokenType: TokenType;
};

export enum NodeType {
  Root = 'Root',
  Plain = 'Plain',
  PGroup = 'Parenthesis',
  BGroup = 'Bracket',
  CBGroup = 'CurlyBrace',
}

export type LatexNode = {
  nodeType: string;
  token: Token;
  children: LatexNode[];
  subscript?: LatexNode;
  superscript?: LatexNode;
};

export const createNode = (
  token: Token,
  nodeType: NodeType = NodeType.Plain,
  children: LatexNode[] = []
): LatexNode => {
  return {
    token,
    nodeType,
    children,
  };
};
