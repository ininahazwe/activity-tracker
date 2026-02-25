const fs = require('fs');
const path = require('path');

const ignore = ['node_modules', '.git', 'dist', 'build', '.env'];

function generateTree(dir, prefix = '') {
    let output = '';
    const items = fs.readdirSync(dir).filter(item => !ignore.includes(item)).sort();

    items.forEach((item, index) => {
        const itemPath = path.join(dir, item);
        const stats = fs.statSync(itemPath);
        const isLast = index === items.length - 1;
        const connector = isLast ? '└── ' : '├── ';

        output += prefix + connector + item + '\n';

        if (stats.isDirectory()) {
            const extension = isLast ? '    ' : '│   ';
            output += generateTree(itemPath, prefix + extension);
        }
    });

    return output;
}

const structure = 'src/\n' + generateTree('./src');
fs.writeFileSync('structure.txt', structure);
console.log('Arborescence src/ générée dans structure.txt');