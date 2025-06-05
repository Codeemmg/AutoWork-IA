const fs = require('fs');
const path = require('path');

function processFile(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');
    let fileName = path.basename(filePath);

    // Regex para função tradicional
    content = content.replace(/function (\w+)\s*\(([^)]*)\)\s*{/, (match, fnName, params) => {
        if (content.includes(`[DEBUG] Entrou em ${fileName} > ${fnName}`)) return match; // evita duplicação
        return `function ${fnName}(${params}) {\n    console.log('[DEBUG] Entrou em ${fileName} > ${fnName}');`;
    });

    // Regex para função arrow exportada (module.exports ou exports.)
    content = content.replace(/(module\.exports\s*=\s*|exports\.(\w+)\s*=\s*)?(\w+)?\s*=\s*\(([^)]*)\)\s*=>\s*{/, (match, exp1, exp2, varName, params) => {
        let fnName = varName || exp2 || 'anon';
        if (content.includes(`[DEBUG] Entrou em ${fileName} > ${fnName}`)) return match;
        return `${match}\n    console.log('[DEBUG] Entrou em ${fileName} > ${fnName}');`;
    });

    fs.writeFileSync(filePath, content, 'utf8');
}

function processDir(dirPath) {
    fs.readdirSync(dirPath).forEach(file => {
        const fullPath = path.join(dirPath, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (file.endsWith('.js')) {
            processFile(fullPath);
        }
    });
}

// Caminhos das pastas que você quer rastrear
const dirs = [
    path.join(__dirname, 'agent'),
    path.join(__dirname, 'tools')
];

dirs.forEach(dir => {
    if (fs.existsSync(dir)) {
        processDir(dir);
    }
});

console.log('✅ Logs injetados com sucesso!');
