import yargs from 'yargs';
import { renderLatex } from './render';

import fs from 'fs';

function main() {
  const args = yargs(process.argv.slice(2))
    .command('* <latex> <output>', 'Render LaTeX to an image')
    .parseSync();

  const latex = args.latex as string;
  const output = args.output as string;
  const buffer = renderLatex(latex as string);
  fs.writeFileSync(output, buffer);
}

main();
