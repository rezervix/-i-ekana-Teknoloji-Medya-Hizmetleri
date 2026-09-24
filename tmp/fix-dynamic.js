const fs = require('fs');
const path = require('path');

function walk(dir) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (file === 'route.ts' || file === 'page.tsx') {
      let content = fs.readFileSync(fullPath, 'utf8');
      if (!content.includes('force-dynamic')) {
        // Find the last import statement
        let lastImportIndex = 0;
        const lines = content.split('\n');
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().startsWith('import ')) {
            lastImportIndex = i;
          }
        }
        lines.splice(lastImportIndex + 1, 0, '\nexport const dynamic = "force-dynamic";\n');
        fs.writeFileSync(fullPath, lines.join('\n'));
      }
    }
  });
}

walk('src/app/api/admin');
walk('src/app/api/sungur');
walk('src/app/admin');
