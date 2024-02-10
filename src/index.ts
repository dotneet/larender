import { parseLatex, printNode } from '@/parser';

const node = parseLatex('x^2_2 + (3x + 2) 3^(32)');
printNode(node);

const node2 = parseLatex('\\dfrac 3 2 \\dfrac {11} {22}');
printNode(node2);
