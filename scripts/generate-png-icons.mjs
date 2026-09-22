import fs from 'node:fs';
import zlib from 'node:zlib';

function createPNG(width, height, r, g, b, a = 255) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData.writeUInt8(8, 8); // 8-bit depth
  ihdrData.writeUInt8(6, 9); // RGBA color type
  ihdrData.writeUInt8(0, 10); // Compression
  ihdrData.writeUInt8(0, 11); // Filter
  ihdrData.writeUInt8(0, 12); // Interlace

  const ihdrChunk = createChunk('IHDR', ihdrData);

  // Raw image data with scanline filter bytes
  const rawData = Buffer.alloc(height * (width * 4 + 1));
  let offset = 0;

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.42;
  const innerRadius = radius * 0.5;

  for (let y = 0; y < height; y++) {
    rawData[offset++] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Dark background gradient #030712
      let pr = 3;
      let pg = 7;
      let pb = 18;
      let pa = 255;

      // Draw radar circles and center pinpoint
      if (Math.abs(dist - radius) < 2 || Math.abs(dist - radius * 0.7) < 1.5 || Math.abs(dist - radius * 0.4) < 1.5) {
        // Sky blue radar ring #38bdf8
        pr = 56;
        pg = 189;
        pb = 248;
      } else if (dist < innerRadius * 0.5) {
        // Center neon glow #38bdf8
        pr = 56;
        pg = 189;
        pb = 248;
      } else if (dist < innerRadius * 0.25) {
        // Core white
        pr = 255;
        pg = 255;
        pb = 255;
      }

      // Draw subtle crosshair lines
      if ((Math.abs(x - cx) < 1 && dist < radius * 1.1) || (Math.abs(y - cy) < 1 && dist < radius * 1.1)) {
        pr = Math.min(255, pr + 40);
        pg = Math.min(255, pg + 100);
        pb = Math.min(255, pb + 140);
      }

      rawData[offset++] = pr;
      rawData[offset++] = pg;
      rawData[offset++] = pb;
      rawData[offset++] = pa;
    }
  }

  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = createChunk('IDAT', compressedData);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);

  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = crc32(crcData);

  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc, 0);

  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

// CRC32 table & function
const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    if (c & 1) {
      c = 0xedb88320 ^ (c >>> 1);
    } else {
      c = c >>> 1;
    }
  }
  crcTable[n] = c;
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate PWA Icon Files
const publicDir = './public';
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

fs.writeFileSync(`${publicDir}/pwa-192x192.png`, createPNG(192, 192, 56, 189, 248));
fs.writeFileSync(`${publicDir}/pwa-512x512.png`, createPNG(512, 512, 56, 189, 248));
fs.writeFileSync(`${publicDir}/pwa-maskable-512x512.png`, createPNG(512, 512, 56, 189, 248));
fs.writeFileSync(`${publicDir}/apple-touch-icon.png`, createPNG(180, 180, 56, 189, 248));
fs.writeFileSync(`${publicDir}/favicon.ico`, createPNG(32, 32, 56, 189, 248));

console.log('✅ PWA PNG icons generated successfully!');
