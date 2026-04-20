// mobile-preview.js — shows QR code for mobile testing
// Runs automatically with: npm run mobile

import { networkInterfaces } from "os";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const qrcode = require("qrcode-terminal");

const PORT = 1421; // Port for ebs-mobile

function getLocalIP() {
  const nets = networkInterfaces();
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === "IPv4" && !net.internal) {
        return net.address;
      }
    }
  }
  return "localhost";
}

// Wait 2s for Vite to start before printing
setTimeout(() => {
  const ip = getLocalIP();
  const url = `http://${ip}:${PORT}`;

  console.log("\n\x1b[36m╔══════════════════════════════════════════════╗");
  console.log("║    📱  EBS MOBILE VIEW PREVIEW — Ready!     ║");
  console.log("╚══════════════════════════════════════════════╝\x1b[0m\n");
  console.log(`\x1b[32m✅ Mobile App URL:\x1b[0m \x1b[1m\x1b[33m${url}\x1b[0m\n`);
  console.log("\x1b[35m📷 Scan with your phone camera:\x1b[0m\n");

  qrcode.generate(url, { small: true });

  console.log("\n\x1b[36m📌 Steps:\x1b[0m");
  console.log("   1. Connect phone to \x1b[1msame WiFi\x1b[0m as this PC");
  console.log("   2. Scan the QR code above with your camera");
  console.log(`   3. Or open \x1b[33m${url}\x1b[0m manually in Chrome`);
  console.log("   4. Page \x1b[32mauto-refreshes\x1b[0m on every file save ✨\n");
  console.log("\x1b[90m─────────────────────────────────────────────────\x1b[0m\n");
}, 2000);
