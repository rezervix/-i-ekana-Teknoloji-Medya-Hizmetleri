import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ARTIFACT_DIR = 'C:/Users/!/.gemini/antigravity-ide/brain/ff29f683-fa80-415e-9650-320a35d21c55';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

const viewports = [
  { width: 360, height: 800, name: '360x800' },
  { width: 390, height: 844, name: '390x844' },
  { width: 768, height: 1024, name: '768x1024' },
  { width: 1440, height: 900, name: '1440x900' },
];

const urls = [
  { path: '/services/ai-automation?v2=1', label: 'list' },
  { path: '/services/ai-automation/faktura?v2=1', label: 'detail' },
];

async function capture(urlObj, vp) {
  const fullUrl = `http://localhost:3000${urlObj.path}`;
  const outFilename = `${urlObj.label}_${vp.name}.png`;
  const outPath = path.join(ARTIFACT_DIR, outFilename);

  // We can launch Chrome with --headless=new --window-size and --screenshot
  const args = [
    '--headless=new',
    '--disable-gpu',
    `--window-size=${vp.width},${vp.height}`,
    `--screenshot=${outPath}`,
    fullUrl
  ];

  await new Promise((resolve, reject) => {
    const proc = spawn(CHROME_PATH, args, { stdio: 'ignore' });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Exit code ${code}`));
    });
  });

  console.log(`Captured ${outFilename}`);
}

async function run() {
  for (const urlObj of urls) {
    for (const vp of viewports) {
      await capture(urlObj, vp);
    }
  }
}

run().catch(console.error);
