import { initRendering, renderLatex } from '../src/render';

function main() {
  const options = {
    width: 600,
    height: 400,
    fontSize: 48,
    marginRatio: 0.2,
  };
  initRendering();
  const start = Date.now();
  for (let i = 0; i < 100; i++) {
    renderLatex('x^2 + y^2 = 1', options);
  }
  const end = Date.now();
  console.log(end - start);
  const renderPerSecond = 100 / ((end - start) / 1000);
  console.log('render per seconds:', renderPerSecond);
}
main();
