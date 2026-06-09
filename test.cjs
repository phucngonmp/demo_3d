const glob = require('fast-glob');
const paths = glob.sync('src/assets/textures/*/*/*.{jpg,JPG,jpeg,JPEG,png,PNG,webp,WEBP,avif}', { cwd: process.cwd() });
console.log('Total files found:', paths.length);
paths.slice(0, 20).forEach(p => console.log(p));
