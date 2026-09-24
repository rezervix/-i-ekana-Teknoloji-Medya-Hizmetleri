const fs = require('fs');
const path = require('path');

function checkEncoding(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      checkEncoding(fullPath);
    } else {
      const buffer = fs.readFileSync(fullPath);
      // Check for BOM
      if (buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf) {
        console.log(`BOM found: ${fullPath}`);
      }
      // Check for non-UTF8 sequences (approximate)
      const content = buffer.toString('utf8');
      if (content.includes('\uFFFD')) {
        console.log(`Potential encoding issue: ${fullPath}`);
      }
    }
  }
}

const srcPath = process.argv[2] || '.';
checkEncoding(srcPath);
