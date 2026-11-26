import fs from 'fs';
import path from 'path';

// Minimal valid 1x1 blue PNG base64
const bluePngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN88eLFfwAIJQN2W836bwAAAABJRU5ErkJggg==';
const buf = Buffer.from(bluePngBase64, 'base64');

const files = [
  'public/apple-touch-icon.png',
  'public/pwa-192x192.png',
  'public/pwa-512x512.png',
  'public/pwa-maskable-512x512.png'
];

for (const f of files) {
  const fullPath = path.resolve(process.cwd(), f);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buf);
}
console.log('PWA PNG placeholders generated successfully.');
