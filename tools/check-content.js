// Checks a content file without a browser, using the same checks the simulation runs before it starts.
// Run from the build folder: node tools/check-content.js sfl2   (for developers; the browser shows the same list)
const fs = require('fs');
global.window = { addEventListener() {} };
eval(fs.readFileSync('js/marking.js', 'utf8') + ';global.MARKING = MARKING;');
eval(fs.readFileSync('js/content.js', 'utf8') + ';global.CONTENT = CONTENT;');
const name = process.argv[2] || 'sfl2';
eval(fs.readFileSync('data/' + name + '/content.js', 'utf8'));
const res = CONTENT.validate(window.SFL_CONTENT);
console.log(name + ': ' + res.errors.length + ' error(s), ' + res.warnings.length + ' warning(s)');
res.errors.forEach(e => console.log('  ERROR   ' + e));
res.warnings.forEach(w => console.log('  WARNING ' + w));
process.exit(res.errors.length || res.warnings.length ? 1 : 0);
