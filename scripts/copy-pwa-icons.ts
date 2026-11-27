import fs from 'fs';
import path from 'path';

const srcImg = path.resolve(process.cwd(), 'src/assets/images/pwa_icon_1795767003962.jpg');
if (!fs.existsSync(srcImg)) {
  console.error('Source PWA icon not found at:', srcImg);
  process.exit(1);
}

const targets = [
  'public/pwa-192x192.png',
  'public/pwa-512x512.png',
  'public/pwa-maskable-512x512.png',
  'public/apple-touch-icon.png',
];

for (const t of targets) {
  const dest = path.resolve(process.cwd(), t);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(srcImg, dest);
  console.log(`Copied PWA icon to ${t}`);
}
