// particles.js — Background canvas particle system; opacity and glyph pool scale with N magnitude.

import { gameState } from './state.js';

// N log10 → tier 0-5 breakpoints (log10 of Ce ≈ 303)
const TIER_LOG_MAX = 303;

// Glyph pool: base has 4× dots + n; higher tiers append doubled glyphs to keep dots dominant
const BASE_POOL   = ['·', '·', '·', '·', 'n'];
const TIER_GLYPHS = [
  [],                      // tier 0 — base only
  ['+', '+'],              // tier 1
  ['\u00d7', '\u00d7'],   // tier 2: ×
  ['^'],                   // tier 3
  ['\u2191\u2191'],        // tier 4: ↑↑
  ['\u2191\u2191\u2191', '\u2135'], // tier 5: ↑↑↑ ℵ
];


let canvas, ctx;
let particles = [];
let animTime  = 0;

export function setupParticles() {
  canvas = document.getElementById('particles-canvas');
  if (!canvas) return;
  ctx = canvas.getContext('2d');
  ensureSize();
  window.addEventListener('resize', () => { ensureSize(); respawnParticles(); });
}

function ensureSize() {
  if (!canvas) return;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
    canvas.width  = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width  = w + 'px';
    canvas.style.height = h + 'px';
  }
}

function getTierFloat() {
  if (!gameState.N || gameState.N.lte(0)) return 0;
  const log = gameState.N.log10();
  return Math.min(5, Math.max(0, log / TIER_LOG_MAX * 5));
}


function buildGlyphPool(tier) {
  const pool = [...BASE_POOL];
  const limit = Math.min(Math.floor(tier) + 1, TIER_GLYPHS.length);
  for (let t = 1; t < limit; t++) pool.push(...TIER_GLYPHS[t]);
  return pool;
}

function makeParticle(w, h, glyphs) {
  return {
    x:         Math.random() * w,
    y:         Math.random() * h,
    glyph:     glyphs[Math.floor(Math.random() * glyphs.length)],
    speed:     0.3 + Math.random() * 1.2,
    baseAlpha: 0.1 + Math.random() * 0.35,
  };
}

function respawnParticles() {
  const tier   = getTierFloat();
  const count  = Math.round(20 + tier * 90);
  const glyphs = buildGlyphPool(tier);
  const w = window.innerWidth;
  const h = window.innerHeight;
  particles = [];
  for (let i = 0; i < count; i++) particles.push(makeParticle(w, h, glyphs));
}

let lastTier = -1;

export function tickParticles(delta) {
  if (!canvas || !ctx) return;

  ensureSize();

  const dpr  = Math.min(2, window.devicePixelRatio || 1);
  const w    = window.innerWidth;
  const h    = window.innerHeight;
  const tier = getTierFloat();
  // Re-spawn when tier integer changes so glyph palette updates
  const tierInt = Math.floor(tier);
  if (tierInt !== lastTier) {
    lastTier = tierInt;
    respawnParticles();
  }

  const count  = Math.round(20 + tier * 90);
  const glyphs = buildGlyphPool(tier);
  while (particles.length < count) particles.push(makeParticle(w, h, glyphs));
  while (particles.length > count) particles.pop();

  // Update canvas opacity only when it actually changes (lets CSS transition work)
  const targetOpacity = (0.35 + 0.35 * (tier / 5)).toFixed(3);
  if (canvas.style.opacity !== targetOpacity) canvas.style.opacity = targetOpacity;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  animTime += delta;

  // Trail: near-black fill at alpha 0.14 — do NOT use clearRect
  ctx.fillStyle = 'rgba(8,8,9,0.14)';
  ctx.fillRect(0, 0, w, h);

  // Reference vector field uses t = rafTimestamp/3000.
  // animTime is cumulative seconds, so animTime/3 ≈ ts/3000.
  const t = animTime / 3;

  const fill = 'oklch(70% 0.005 80)';

  ctx.font = "11px 'JetBrains Mono', monospace";
  ctx.textBaseline = 'middle';
  ctx.textAlign    = 'center';

  for (const p of particles) {
    // Vector field: separate x/y spatial frequencies and amplitudes
    const vx = Math.sin((p.y + t * 20) * 0.006) * 0.6 + Math.cos(p.x * 0.004 + t) * 0.2;
    const vy = Math.cos((p.x + t * 10) * 0.005) * 0.4 + Math.sin(p.y * 0.003 - t) * 0.3;

    p.x += vx * p.speed;
    p.y += vy * p.speed;

    if (p.x < -20) p.x = w + 20;
    else if (p.x > w + 20) p.x = -20;
    if (p.y < -20) p.y = h + 20;
    else if (p.y > h + 20) p.y = -20;

    const alpha = p.baseAlpha * (0.4 + 0.6 * tier / 5);
    ctx.globalAlpha = alpha;
    ctx.fillStyle   = fill;
    ctx.fillText(p.glyph, p.x, p.y);
  }

  ctx.globalAlpha = 1;
}
