#!/usr/bin/env node

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// SVG splash screen template
const createSplashSVG = (width, height) => {
  const centerX = width / 2;
  const centerY = height / 2;
  const radius = Math.min(width, height) * 0.15;
  const fontSize = Math.min(width, height) * 0.08;
  const subFontSize = Math.min(width, height) * 0.03;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">
  <rect width="100%" height="100%" fill="#0066FF"/>
  <circle cx="${centerX}" cy="${centerY}" r="${radius}" fill="#FFFFFF" opacity="0.9"/>
  <text x="${centerX}" y="${centerY + Math.min(width, height) * 0.25}" 
        font-family="Arial, sans-serif" 
        font-size="${fontSize}" 
        font-weight="bold" 
        fill="#FFFFFF" 
        text-anchor="middle">OnTime</text>
  <text x="${centerX}" y="${centerY + Math.min(width, height) * 0.32}" 
        font-family="Arial, sans-serif" 
        font-size="${subFontSize}" 
        fill="#FFFFFF" 
        opacity="0.8" 
        text-anchor="middle">No more waiting</text>
</svg>`;
};

const sizes = [
  { width: 640, height: 1136 },
  { width: 750, height: 1334 },
  { width: 1242, height: 2208 },
  { width: 1125, height: 2436 },
  { width: 1242, height: 2688 },
  { width: 828, height: 1792 },
  { width: 1170, height: 2532 },
  { width: 1284, height: 2778 },
  { width: 390, height: 844 },
];

console.log("🎨 OnTime - Creating placeholder splash screens...\n");

const publicDir = path.join(__dirname, "..", "public");

sizes.forEach(({ width, height }) => {
  const svgFileName = `splash-${width}x${height}.svg`;
  const svgPath = path.join(publicDir, svgFileName);

  const svg = createSplashSVG(width, height);
  fs.writeFileSync(svgPath, svg);

  console.log(`✅ Created ${svgFileName}`);
});

const screenshotSvg = createSplashSVG(390, 844);
fs.writeFileSync(path.join(publicDir, "screenshot-mobile.svg"), screenshotSvg);
console.log(`✅ Created screenshot-mobile.svg`);

console.log("\n✨ Placeholder splash screens created!");
console.log("\n📝 Note: These are SVG placeholders.");
console.log("For production, generate PNG versions using:");
console.log("  1. Open http://localhost:3000/splash-generator.html");
console.log("  2. Or use ImageMagick: ./scripts/generate-splash-screens.sh");
console.log(
  "\n🎨 SVG files can be converted to PNG using online tools or ImageMagick\n",
);
