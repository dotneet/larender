// LaTeX AST Tokens
export enum TokenType {
  Unknown = 'Unknown',

  // Layout
  DoubleBackslash = '\\\\',
  Newline = '\\newline',
  Paragraph = '\\par',
  Begin = '\\begin',
  End = '\\end',

  // Number
  Number = 'Number',
  // alphabets
  Alphabet = 'Alphabet',
  // character
  Character = 'Character',
  // subscripts
  Subscript = '_',
  // superscripts
  Superscript = '^',
  // Math Symbols
  Plus = '+',
  Minus = '-',
  PlusMinus = '\\pm',
  Modulus = '\\mod',
  Percent = '\\%',
  Times = '\\times',
  Divide = '\\div',
  Equals = '=',
  Equivalent = '\\equiv',
  SquareRoot = '\\sqrt',
  Dfrac = '\\dfrac',
  Infinity = '\\infty',
  Integrate = '\\int',
  Summation = '\\sum',
  Product = '\\prod',
  Limit = '\\lim',
  // Comparison Operators
  LessThan = '<',
  GreaterThan = '>',
  LessThanOrEqual = '\\leq',
  GreaterThanOrEqual = '\\geq',
  // Geometry Symbols
  Angle = '\\angle',
  Triangle = '\\triangle',
  Circle = '\\circ',
  Sim = '\\sim',
  Simeq = '\\simeq',
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
  // Comma, Period
  Comma = ',',
  Period = '.',
  Cdot = '\\cdot',
  Cdots = '\\cdots',
  // Colon  and Semicolon
  Colon = ':',
  Semicolon = ';',
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
  Ell = '\\ell',
  At = '@',
}

export type Token = {
  token: string;
  tokenType: TokenType;
};

export enum NodeType {
  Document = 'Document',
  Environment = 'Environment',
  Paragraph = 'Paragraph',
  Line = 'Line',
  Plain = 'Plain',

  PGroup = 'Parenthesis',
  BGroup = 'Bracket',
  CBGroup = 'CurlyBrace',
}

export type LatexNode = {
  nodeType: string;
  token: Token | null;
  children: LatexNode[];
  subscript?: LatexNode;
  superscript?: LatexNode;
};

export const createNode = (
  nodeType: NodeType = NodeType.Plain,
  children: LatexNode[] = [],
  token: Token | null = null
): LatexNode => {
  return {
    token,
    nodeType,
    children,
  };
};

// Node Structure:
//
// DocumentNode
//  - EnvironmentNode
//    - ParagraphNode
//      - LineNode
export const createDocumentNode = (): LatexNode => {
  return createNode(NodeType.Document, [
    createEnvironmentNode({ token: 'document', tokenType: TokenType.Alphabet }),
  ]);
};

export const createEnvironmentNode = (envToken: Token): LatexNode => {
  return createNode(NodeType.Environment, [createParagraphNode()], envToken);
};

export const createParagraphNode = (): LatexNode => {
  return createNode(NodeType.Paragraph, [createNode(NodeType.Line)]);
};

export const createPlainNode = (token: Token): LatexNode => {
  return createNode(NodeType.Plain, [], token);
};
