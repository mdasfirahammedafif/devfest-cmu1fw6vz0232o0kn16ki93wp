import { execFile, spawn } from 'child_process';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

async function capture(url, outputPath) {
  return new Promise((resolve, reject) => {
    const args = [
      '--headless=new',
      '--no-sandbox',
      '--no-first-run',
      '--disable-gpu',
      '--user-data-dir=C:\\Users\\Afif\\AppData\\Local\\Temp\\chrome_snap',
      '--window-size=1360,880',
      `--screenshot=${outputPath}`,
      url
    ];

    execFile(chromePath, args, (err) => {
      if (err) return reject(err);
      console.log('Saved:', outputPath);
      resolve();
    });
  });
}

async function run() {
  const preview = spawn('npx', ['vite', 'preview', '--port', '4173', '--strictPort'], { shell: true });
  await new Promise(r => setTimeout(r, 2000));

  try {
    await capture('http://localhost:4173/?start=R1', 'D:\\vibe code project\\screenshots\\baseline_route.png');
    await capture('http://localhost:4173/?start=R1&block=C2', 'D:\\vibe code project\\screenshots\\rerouting_blocked_c2.png');
    await capture('http://localhost:4173/?lang=bn', 'D:\\vibe code project\\screenshots\\bangla_mode.png');
    console.log('All screenshots refreshed successfully!');
  } finally {
    preview.kill();
  }
}

run().catch(console.error);
