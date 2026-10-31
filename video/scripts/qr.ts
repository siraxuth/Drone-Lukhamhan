// สร้าง QR code ไปหน้าเว็บ: bun scripts/qr.ts → public/img/qr.svg
import QRCode from 'qrcode';
await QRCode.toFile('public/img/qr.svg', 'https://drone.dekgp.com', { type: 'svg', margin: 1, color: { dark: '#1c1f25', light: '#ffffff' }, errorCorrectionLevel: 'M' });
console.log('saved public/img/qr.svg');
