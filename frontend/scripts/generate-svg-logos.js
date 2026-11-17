const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const iconBuf = fs.readFileSync(path.join(publicDir, 'logo-icon.png'));
const iconB64 = iconBuf.toString('base64');

function makeSvg(dark) {
  const textColor = dark ? '#ffffff' : '#0f172a';
  const dscColor = dark ? '#c084fc' : '#7c3aed';
  const taglineColor = dark ? '#94a3b8' : '#64748b';
  const dividerColor = dark ? 'rgba(255,255,255,0.25)' : '#cbd5e1';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 460 110" width="460" height="110" fill="none">
  <defs>
    <linearGradient id="dscGrad-${dark ? 'dark' : 'light'}" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${dark ? '#c084fc' : '#7c3aed'}" />
      <stop offset="100%" stop-color="${dark ? '#a855f7' : '#4f46e5'}" />
    </linearGradient>
  </defs>
  <!-- 3D Ribbon Icon -->
  <image href="data:image/png;base64,${iconB64}" x="8" y="10" width="90" height="90" preserveAspectRatio="xMidYMid meet" />

  <!-- Divider -->
  <line x1="114" y1="24" x2="114" y2="86" stroke="${dividerColor}" stroke-width="2" stroke-linecap="round" />

  <!-- Brand Text -->
  <text x="130" y="63" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="44" font-weight="800" fill="${textColor}" letter-spacing="-0.8">
    Simpl<tspan fill="url(#dscGrad-${dark ? 'dark' : 'light'})" font-weight="900">DSC</tspan><tspan font-size="19" font-weight="700" fill="${dscColor}" dy="-18">™</tspan>
  </text>

  <!-- Tagline -->
  <text x="132" y="85" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" font-size="10.5" font-weight="700" fill="${taglineColor}" letter-spacing="3.2">
    DIGITAL SIGNATURES, MADE SIMPLE.
  </text>
</svg>`;
}

fs.writeFileSync(path.join(publicDir, 'logo.svg'), makeSvg(false), 'utf8');
fs.writeFileSync(path.join(publicDir, 'logo-dark.svg'), makeSvg(true), 'utf8');
console.log('Successfully generated logo.svg and logo-dark.svg in public directory.');

