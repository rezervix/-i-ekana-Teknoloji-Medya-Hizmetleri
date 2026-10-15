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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

async function sendCdp(ws, method, params = {}) {
  const id = Math.floor(Math.random() * 1000000);
  return new Promise((resolve, reject) => {
    const handler = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.id === id) {
        ws.removeEventListener('message', handler);
        if (msg.error) reject(msg.error);
        else resolve(msg.result);
      }
    };
    ws.addEventListener('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

async function run() {
  console.log('Starting Chrome with debugging port 9222...');
  const chromeProc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  await sleep(1500);

  const results = [];

  try {
    const versionInfo = await fetchJson('http://127.0.0.1:9222/json/version');
    console.log('Connected to Chrome:', versionInfo['Browser']);

    const targets = await fetchJson('http://127.0.0.1:9222/json');
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

    await new Promise((resolve) => ws.addEventListener('open', resolve));

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'DOM.enable');

    for (const urlObj of urls) {
      for (const vp of viewports) {
        // Set Device Metrics
        await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
          width: vp.width,
          height: vp.height,
          deviceScaleFactor: 1,
          mobile: vp.width < 768,
        });

        // Navigate
        await sendCdp(ws, 'Page.navigate', {
          url: `http://localhost:3000${urlObj.path}`,
        });

        // Wait for page to load & render
        await sleep(2500);

        // Evaluate overflow
        const evalRes = await sendCdp(ws, 'Runtime.evaluate', {
          expression: `(() => {
            const innerWidth = window.innerWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const bodyScrollWidth = document.body.scrollWidth;
            const maxScrollWidth = Math.max(scrollWidth, bodyScrollWidth);
            const hasOverflow = maxScrollWidth > innerWidth;
            
            // Find offending elements if any
            const offending = [];
            if (hasOverflow) {
              const all = document.querySelectorAll('*');
              for (const el of all) {
                const rect = el.getBoundingClientRect();
                if (rect.right > innerWidth + 1 || rect.left < -1) {
                  offending.push({
                    tag: el.tagName,
                    class: el.className ? String(el.className).slice(0, 50) : '',
                    id: el.id,
                    right: Math.round(rect.right),
                    innerWidth
                  });
                }
              }
            }

            return {
              innerWidth,
              scrollWidth,
              bodyScrollWidth,
              hasOverflow,
              offending: offending.slice(0, 5)
            };
          })()`,
          returnByValue: true,
        });

        const overflowData = evalRes.result.value;

        // Screenshot
        const screenshotRes = await sendCdp(ws, 'Page.captureScreenshot', {
          format: 'png',
        });

        const filename = `${urlObj.label}_${vp.name}.png`;
        const filepath = path.join(ARTIFACT_DIR, filename);
        fs.writeFileSync(filepath, Buffer.from(screenshotRes.data, 'base64'));

        results.push({
          page: urlObj.label,
          url: urlObj.path,
          viewport: vp.name,
          ...overflowData,
          screenshot: filename,
        });

        console.log(
          `[${urlObj.label}] ${vp.name}: innerWidth=${overflowData.innerWidth}, scrollWidth=${overflowData.scrollWidth}, hasOverflow=${overflowData.hasOverflow}`
        );
      }
    }

    ws.close();
  } finally {
    chromeProc.kill();
  }

  const resultPath = path.join(ARTIFACT_DIR, 'overflow_results.json');
  fs.writeFileSync(resultPath, JSON.stringify(results, null, 2));
  console.log('Results written to', resultPath);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
