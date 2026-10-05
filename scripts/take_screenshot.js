import { execFile } from 'child_process';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const outputPath = 'D:\\vibe code project\\screenshots\\bangla_mode.png';
const url = 'http://localhost:5173/?lang=bn';

const args = [
  '--headless=new',
  '--no-sandbox',
  '--no-first-run',
  '--disable-gpu',
  '--user-data-dir=C:\\Users\\Afif\\AppData\\Local\\Temp\\chrome_temp3',
  '--window-size=1360,880',
  `--screenshot=${outputPath}`,
  url
];

execFile(chromePath, args, (err, stdout, stderr) => {
  if (err) {
    console.error('Error:', err);
    process.exit(1);
  }
  console.log('Bangla mode screenshot captured to:', outputPath);
});
