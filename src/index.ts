import yargs from 'yargs';
import { initRendering, renderLatex } from './render';

import fs from 'fs';

function main() {
  const args = yargs(process.argv.slice(2))
    .command('* <latex> <output>', 'Render LaTeX to an image')
    .parseSync();

  const latex = args.latex as string;
  const output = args.output as string;
  initRendering();
  const options = {
    width: 600,
    height: 400,
    fontSize: 48,
    marginRatio: 0.1,
  };
  const buffer = renderLatex(latex as string, options);
  fs.writeFileSync(output, buffer);
}

main();
