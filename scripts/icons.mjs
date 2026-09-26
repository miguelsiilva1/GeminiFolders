// Renders assets/logo.svg to the extension icons (public/icon/*.png) and assets/logo.png.
// Run after editing the logo: npm run icons
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';

const svg = readFileSync('assets/logo.svg');
const render = (size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();

mkdirSync('public/icon', { recursive: true });
for (const size of [16, 32, 48, 128]) writeFileSync(`public/icon/${size}.png`, render(size));
writeFileSync('assets/logo.png', render(512));
console.log('Icons written.');
