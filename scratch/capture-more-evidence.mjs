import http from 'http';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

const ARTIFACT_DIR = 'C:/Users/!/.gemini/antigravity-ide/brain/ff29f683-fa80-415e-9650-320a35d21c55';
const CHROME_PATH = 'C:/Program Files/Google/Chrome/Application/chrome.exe';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function fetchJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', (c) => (data += c));
      res.on('end', () => resolve(JSON.parse(data)));
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
  const tmpDir = path.join(process.cwd(), 'scratch', 'chrome-user-dir');
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

  const chromeProc = spawn(
    CHROME_PATH,
    [
      '--headless=new',
      '--disable-gpu',
      `--user-data-dir=${tmpDir}`,
      '--remote-debugging-port=9222',
      '--no-first-run',
      '--no-default-browser-check',
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  let connected = false;
  let targets = null;
  for (let i = 0; i < 15; i++) {
    await sleep(500);
    try {
      targets = await fetchJson('http://127.0.0.1:9222/json');
      if (targets && targets.length > 0) {
        connected = true;
        break;
      }
    } catch (e) {}
  }

  if (!connected) {
    chromeProc.kill();
    throw new Error('Could not connect to Chrome debugging port 9222');
  }

  try {
    const pageTarget = targets.find((t) => t.type === 'page') || targets[0];
    const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);
    await new Promise((resolve) => ws.addEventListener('open', resolve));

    await sendCdp(ws, 'Page.enable');
    await sendCdp(ws, 'DOM.enable');

    // 1. Mobile 390x844 with Cookie Accepted -> Shows fixed bottom bar
    await sendCdp(ws, 'Emulation.setDeviceMetricsOverride', {
      width: 390,
      height: 844,
      deviceScaleFactor: 1,
      mobile: true,
    });

    await sendCdp(ws, 'Page.navigate', {
      url: 'http://localhost:3000/services/ai-automation/faktura?v2=1',
    });
    await sleep(2000);

    // Accept cookie in localStorage
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `localStorage.setItem('cicekana-cookie-consent', 'accepted'); location.reload();`,
    });
    await sleep(2500);

    let screenshot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'detail_390x844_with_sticky_bar.png'), Buffer.from(screenshot.data, 'base64'));

    // 2. Scroll to Packages
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `document.getElementById('paketler')?.scrollIntoView({ behavior: 'instant' });`,
    });
    await sleep(1000);

    screenshot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'detail_390x844_packages.png'), Buffer.from(screenshot.data, 'base64'));

    // 3. Scroll to Trust & Accordion
    await sendCdp(ws, 'Runtime.evaluate', {
      expression: `document.getElementById('guven')?.scrollIntoView({ behavior: 'instant' });`,
    });
    await sleep(1000);

    screenshot = await sendCdp(ws, 'Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'detail_390x844_trust_accordion.png'), Buffer.from(screenshot.data, 'base64'));

    // 4. Test clicking package to verify cart & checkout redirection
    const cartRedir = await sendCdp(ws, 'Runtime.evaluate', {
      expression: `(() => {
        const btn = document.querySelector('#paketler button[type="button"]');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      })()`,
      returnByValue: true
    });
    console.log('Clicked package button:', cartRedir.result.value);
    await sleep(2000);

    const currentUrlRes = await sendCdp(ws, 'Runtime.evaluate', {
      expression: 'window.location.href',
      returnByValue: true
    });
    console.log('URL after package click:', currentUrlRes.result.value);

    ws.close();
  } finally {
    chromeProc.kill();
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
