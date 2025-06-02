const fs = require('fs');
const path = require('path');

// Create SVG icon with Ebdaa branding
const createEbdaaIconSVG = (size = 512) => {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <!-- Background Circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2-10}" fill="url(#gradient1)" stroke="white" stroke-width="4"/>
  
  <!-- Inner Circle -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/2-60}" fill="white" opacity="0.95"/>
  
  <!-- Creative Spark Pattern - Scale appropriately -->
  <g stroke="currentColor" stroke-width="${size/128}" opacity="0.8">
    <!-- Central Star Pattern -->
    <path d="M${size/2} ${size/8} L${size/2+size/32} ${size/3} L${size/2} ${size/2} L${size/2-size/32} ${size/3} Z" fill="url(#gradient2)" />
    <path d="M${size*7/8} ${size/2} L${size*2/3} ${size/2+size/32} L${size/2} ${size/2} L${size*2/3} ${size/2-size/32} Z" fill="url(#gradient2)" />
    <path d="M${size/2} ${size*7/8} L${size/2-size/32} ${size*2/3} L${size/2} ${size/2} L${size/2+size/32} ${size*2/3} Z" fill="url(#gradient2)" />
    <path d="M${size/8} ${size/2} L${size/3} ${size/2-size/32} L${size/2} ${size/2} L${size/3} ${size/2+size/32} Z" fill="url(#gradient2)" />
  </g>
  
  <!-- Time Elements -->
  <g stroke="currentColor" stroke-linecap="round" opacity="0.9">
    <!-- Hour Hand -->
    <line x1="${size/2}" y1="${size/2}" x2="${size/2+size/8}" y2="${size/2}" stroke-width="${size/64}" />
    <!-- Minute Hand -->
    <line x1="${size/2}" y1="${size/2}" x2="${size/2}" y2="${size/2-size/6}" stroke-width="${size/96}" />
    <!-- Second Hand -->
    <line x1="${size/2}" y1="${size/2}" x2="${size/2+size/12}" y2="${size/2-size/12}" stroke-width="${size/128}" stroke="#ef4444" />
  </g>
  
  <!-- Center Hub -->
  <circle cx="${size/2}" cy="${size/2}" r="${size/32}" fill="url(#gradient2)" />
  
  <!-- Ebdaa Text (E) -->
  <text x="${size/2}" y="${size*3/4}" font-family="Arial, sans-serif" font-size="${size/8}" font-weight="bold" 
        text-anchor="middle" fill="url(#gradient3)">E</text>
  
  <!-- Gradients -->
  <defs>
    <linearGradient id="gradient1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3b82f6" />
      <stop offset="50%" stop-color="#6366f1" />
      <stop offset="100%" stop-color="#8b5cf6" />
    </linearGradient>
    <linearGradient id="gradient2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#ef4444" />
    </linearGradient>
    <linearGradient id="gradient3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#10b981" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>
  </defs>
</svg>`;
};

// Save the SVG icon
const iconSVG = createEbdaaIconSVG(512);
fs.writeFileSync('build/ebdaa-icon.svg', iconSVG);

console.log('✅ Created Ebdaa-branded icon SVG: build/ebdaa-icon.svg');
console.log('📋 Next steps:');
console.log('1. Convert SVG to PNG: Use online converter or design tool');
console.log('2. Create ICNS: Use iconutil on macOS or online converter');
console.log('3. Replace build/icon.icns with the new branded version'); 