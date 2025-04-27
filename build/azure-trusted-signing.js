const { writeFileSync } = require('node:fs');
const path = require('node:path');
writeFileSync(path.join(process.cwd(), 'vars.txt'), process.argv.toString());
