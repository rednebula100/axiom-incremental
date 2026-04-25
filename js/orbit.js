// orbit.js — Orbit system: concentric animated circles, τ (tau) currency.

import { epochState } from './state.js';
import { ORBIT, EPOCH3 } from './balance.js';
import { showConfirm } from './confirm.js';
import { save } from './save.js';

// ── State ─────────────────────────────────────────────────────────────────────

export const orbitState = {
  tau:           0,
  layers:        1,
  speedLevels:   [0],   // per-layer speed upgrade level
  gainLevels:    [0],   // per-layer gain upgrade level
  nBoostLevel:   0,
  seqBoostLevel: 0,
  angles:        [0],   // ephemeral — current rotation angle (radians) per layer
  devTauBoost:   1,
  dirty:         true,
};

// ── Math ──────────────────────────────────────────────────────────────────────

export function layerRevRate(layer) {
  const base = ORBIT.BASE_REV_RATE / Math.pow(ORBIT.SPEED_RATIO, layer);
  return base * Math.pow(ORBIT.SPEED_MULT, orbitState.speedLevels[layer]);
}

export function layerTauPerRev(layer) {
  const base = ORBIT.BASE_TAU_PER_REV * Math.pow(ORBIT.TAU_RATIO, layer);
  return base * Math.pow(ORBIT.GAIN_MULT, orbitState.gainLevels[layer]);
}

export function tauRate() {
  let rate = 0;
  for (let i = 0; i < orbitState.layers; i++) {
    rate += layerRevRate(i) * layerTauPerRev(i);
  }
  if (epochState.epoch3) rate *= Math.pow(orbitState.tau + 1, EPOCH3.TAU_SELF_K);
  return rate;
}

export function speedUpCost(layer) {
  return Math.ceil(ORBIT.SPEED_COST_BASE * Math.pow(ORBIT.SPEED_COST_SCALE, orbitState.speedLevels[layer]) * Math.pow(2, layer));
}

export function gainUpCost(layer) {
  return Math.ceil(ORBIT.GAIN_COST_BASE * Math.pow(ORBIT.GAIN_COST_SCALE, orbitState.gainLevels[layer]) * Math.pow(2, layer));
}

export function nBoostCost() {
  return Math.ceil(ORBIT.N_BOOST_COST_BASE * Math.pow(ORBIT.N_BOOST_COST_SCALE, orbitState.nBoostLevel));
}

export function seqBoostUpCost() {
  return Math.ceil(ORBIT.SEQ_BOOST_COST_BASE * Math.pow(ORBIT.SEQ_BOOST_COST_SCALE, orbitState.seqBoostLevel));
}

export function orbitResetCost() {
  return Math.ceil(ORBIT.ORBIT_RESET_BASE * Math.pow(ORBIT.ORBIT_RESET_SCALE, orbitState.layers));
}

export function orbitNBoost() {
  const k = orbitState.nBoostLevel * ORBIT.ORBIT_N_EXP;
  if (k <= 0 || orbitState.tau < 1) return 1;
  return Math.pow(orbitState.tau, k);
}

export function orbitSeqBoost() {
  if (orbitState.seqBoostLevel === 0 || orbitState.tau < 1) return 1;
  return 1 + orbitState.seqBoostLevel * ORBIT.SEQ_BOOST_COEFF * orbitState.tau;
}

// ── Actions ───────────────────────────────────────────────────────────────────

export function buySpeedUp(layer) {
  const cost = speedUpCost(layer);
  if (orbitState.tau < cost) return;
  orbitState.tau -= cost;
  orbitState.speedLevels[layer]++;
  orbitState.dirty = true;
}

export function buyGainUp(layer) {
  const cost = gainUpCost(layer);
  if (orbitState.tau < cost) return;
  orbitState.tau -= cost;
  orbitState.gainLevels[layer]++;
  orbitState.dirty = true;
}

export function buyNBoost() {
  const cost = nBoostCost();
  if (orbitState.tau < cost) return;
  orbitState.tau -= cost;
  orbitState.nBoostLevel++;
  orbitState.dirty = true;
}

export function buySeqBoost() {
  const cost = seqBoostUpCost();
  if (orbitState.tau < cost) return;
  orbitState.tau -= cost;
  orbitState.seqBoostLevel++;
  orbitState.dirty = true;
}

export function doOrbitReset() {
  if (orbitState.tau < orbitResetCost()) return;
  orbitState.tau          = 0;
  orbitState.layers++;
  orbitState.speedLevels  = new Array(orbitState.layers).fill(0);
  orbitState.gainLevels   = new Array(orbitState.layers).fill(0);
  orbitState.nBoostLevel  = 0;
  orbitState.seqBoostLevel = 0;
  orbitState.angles = new Array(orbitState.layers).fill(0);
  orbitState.dirty = true;
  save();
}

// ── Tick ──────────────────────────────────────────────────────────────────────

export function tickOrbit(delta) {
  if (!epochState.epoch2) return;
  for (let i = 0; i < orbitState.layers; i++) {
    const newAngle = orbitState.angles[i] + layerRevRate(i) * Math.PI * 2 * delta;
    const revs     = Math.floor(newAngle / (Math.PI * 2));
    if (revs > 0) {
      const selfBoost = epochState.epoch3 ? Math.pow(orbitState.tau + 1, EPOCH3.TAU_SELF_K) : 1;
      orbitState.tau += layerTauPerRev(i) * selfBoost * orbitState.devTauBoost * revs;
    }
    orbitState.angles[i] = newAngle % (Math.PI * 2);
  }
}

// ── Cycle colors ──────────────────────────────────────────────────────────────

const CYCLE_COLORS = [
  '#22d3ee', '#1fb8d4', '#1a94bc', '#1a6fa8',
  '#3a4ec0', '#5535d4', '#6d28d9', '#8b5cf6',
  '#a78bfa', '#e2e8f0', '#fca5a5', '#f87171',
  '#ef4444', '#f97316', '#fb923c', '#fbbf24',
  '#facc15', '#a3e635', '#22c55e', '#22c55e',
];

export function getCycleColor(i) {
  return CYCLE_COLORS[Math.min(i, 19)];
}

function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}

// ── Canvas drawing ────────────────────────────────────────────────────────────

export function drawOrbitCanvas() {
  const canvas = document.getElementById('orbit-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const sz  = ORBIT.CANVAS_SIZE;
  const cx  = sz / 2;
  const cy  = sz / 2;
  ctx.clearRect(0, 0, sz, sz);

  // Dashed axis lines
  ctx.strokeStyle = 'rgba(0,90,90,0.22)';
  ctx.lineWidth   = 0.5;
  ctx.setLineDash([4, 8]);
  ctx.beginPath();
  ctx.moveTo(6, cy); ctx.lineTo(sz - 6, cy);
  ctx.moveTo(cx, 6); ctx.lineTo(cx, sz - 6);
  ctx.stroke();
  ctx.setLineDash([]);

  const outerR  = ORBIT.RADIUS_BASE + (orbitState.layers - 1) * ORBIT.RADIUS_STEP;
  const scale   = (cx * 0.9) / outerR;

  for (let i = orbitState.layers - 1; i >= 0; i--) {
    const r     = (ORBIT.RADIUS_BASE + i * ORBIT.RADIUS_STEP) * scale;
    const angle = orbitState.angles[i];
    const { r: cr, g: cg, b: cb } = hexToRgb(getCycleColor(i));

    // Orbit circle
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.25)`;
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();

    // Arc from 12 o'clock to current position
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.5)`;
    ctx.lineWidth   = 1.5;
    ctx.beginPath();
    ctx.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + angle, false);
    ctx.stroke();

    // Dot at current position
    const dotX = cx + r * Math.sin(angle);
    const dotY = cy - r * Math.cos(angle);

    // Radial spoke (faint)
    ctx.strokeStyle = `rgba(${cr},${cg},${cb},0.1)`;
    ctx.lineWidth   = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(dotX, dotY);
    ctx.stroke();

    // Dot
    ctx.fillStyle = `rgba(${cr},${cg},${cb},0.9)`;
    ctx.beginPath();
    ctx.arc(dotX, dotY, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // Origin point
  ctx.fillStyle = 'rgba(0,130,130,0.55)';
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

// ── SVG icons ─────────────────────────────────────────────────────────────────

const SPEED_ICON = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
  <line x1="4" y1="10" x2="28" y2="10" stroke="#666" stroke-width="1.5"/>
  <polyline points="24,7 28,10 24,13" stroke="#666" stroke-width="1.5" fill="none"/>
  <line x1="9" y1="18" x2="28" y2="18" stroke="#666" stroke-width="1.5"/>
  <polyline points="24,15 28,18 24,21" stroke="#666" stroke-width="1.5" fill="none"/>
  <line x1="14" y1="26" x2="28" y2="26" stroke="#666" stroke-width="1.5"/>
  <polyline points="24,23 28,26 24,29" stroke="#666" stroke-width="1.5" fill="none"/>
</svg>`;

const GAIN_ICON = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
  <circle cx="18" cy="18" r="11" stroke="#666" stroke-width="1.2" fill="none"/>
  <circle cx="18" cy="7" r="2.5" fill="#666"/>
  <line x1="18" y1="7" x2="18" y2="18" stroke="#555" stroke-width="0.8"/>
  <line x1="18" y1="18" x2="18" y2="29" stroke="#555" stroke-width="0.8" opacity="0.35"/>
</svg>`;

const N_BOOST_ICON = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
  <circle cx="18" cy="18" r="4"  stroke="#666" stroke-width="1.2" fill="none"/>
  <circle cx="18" cy="18" r="9"  stroke="#666" stroke-width="1"   fill="none" opacity="0.6"/>
  <circle cx="18" cy="18" r="14" stroke="#666" stroke-width="0.8" fill="none" opacity="0.3"/>
</svg>`;

const SEQ_BOOST_ICON = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
  <line x1="5"  y1="30" x2="5"  y2="22" stroke="#666" stroke-width="1.2"/>
  <line x1="11" y1="30" x2="11" y2="22" stroke="#666" stroke-width="1.2"/>
  <line x1="17" y1="30" x2="17" y2="22" stroke="#666" stroke-width="1.2"/>
  <line x1="23" y1="30" x2="23" y2="22" stroke="#666" stroke-width="1.2"/>
  <line x1="29" y1="30" x2="29" y2="22" stroke="#666" stroke-width="1.2"/>
  <path d="M3,16 C5,8 9,8 11,16 C13,24 17,24 19,16 C21,8 25,8 27,16 C29,24 33,24 33,20" stroke="#666" stroke-width="1.2" fill="none"/>
</svg>`;

const NEW_ORBIT_ICON = `<svg width="20" height="20" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-right:5px;opacity:0.75"><circle cx="10" cy="10" r="3" stroke="currentColor" stroke-width="1" fill="none"/><circle cx="10" cy="10" r="6" stroke="currentColor" stroke-width="1" fill="none" opacity="0.6"/><path d="M10,1 A9,9 0 1,1 1,10" stroke="currentColor" stroke-width="1" fill="none"/><polyline points="-1,8 1,11 3,8" stroke="currentColor" stroke-width="1" fill="none"/></svg>`;

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)  e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function buildUpgradeCard(iconHTML, name, level, descText, costText, isFirst, onBuy, layerAttrKey, layerAttrVal) {
  const card = document.createElement('div');
  card.className = 'upgrade-card' + (isFirst ? ' first-in-group' : '');
  card.dataset[layerAttrKey] = layerAttrVal;

  const iconDiv = el('div', 'upgrade-icon');
  iconDiv.innerHTML = iconHTML;

  const info    = el('div', 'upgrade-info');
  const nameRow = el('div', 'upgrade-name');
  nameRow.textContent = name + ' ';
  const lvBadge = el('span', 'level-badge', 'lv.' + level);
  nameRow.appendChild(lvBadge);

  const desc = el('div', 'upgrade-desc', descText);
  info.appendChild(nameRow);
  info.appendChild(desc);

  const right  = el('div', 'upgrade-right');
  const costEl = el('div', 'upgrade-cost', costText);
  const btn    = el('button', 'buy-btn', 'buy');
  btn.addEventListener('click', onBuy);
  right.appendChild(costEl);
  right.appendChild(btn);

  card.appendChild(iconDiv);
  card.appendChild(info);
  card.appendChild(right);
  return card;
}

// ── DOM Build ─────────────────────────────────────────────────────────────────

export function buildOrbitDOM() {
  const col = document.getElementById('iter-orbit-column');
  if (!col) return;
  col.innerHTML = '';

  col.appendChild(el('div', 'section-header', 'ORBIT'));

  // Canvas visualization card
  const canvasCard = el('div', 'orbit-canvas-card first-in-group');
  const canvas = document.createElement('canvas');
  canvas.id     = 'orbit-canvas';
  canvas.width  = ORBIT.CANVAS_SIZE;
  canvas.height = ORBIT.CANVAS_SIZE;
  canvas.className = 'orbit-canvas';
  canvasCard.appendChild(canvas);

  const statsRow = el('div', 'orbit-stats-row');
  const tauEl  = el('span', 'orbit-stat');
  tauEl.dataset.orbitTau = '';
  const rateEl = el('span', 'orbit-stat-dim');
  rateEl.dataset.orbitRate = '';
  statsRow.appendChild(tauEl);
  statsRow.appendChild(rateEl);
  canvasCard.appendChild(statsRow);
  col.appendChild(canvasCard);

  // Per-layer upgrade cards
  for (let i = 0; i < orbitState.layers; i++) {
    const cycleHeader = el('div', 'orbit-layer-header section-header', `CYCLE ${i + 1}`);
    cycleHeader.style.color = getCycleColor(i);
    col.appendChild(cycleHeader);

    const speedDesc = `rev/s ×${Math.pow(ORBIT.SPEED_MULT, orbitState.speedLevels[i]).toFixed(3)}  [×${ORBIT.SPEED_MULT}/lv]`;
    col.appendChild(buildUpgradeCard(
      SPEED_ICON, 'Rotation Speed', orbitState.speedLevels[i], speedDesc,
      speedUpCost(i) + ' τ', true,
      () => buySpeedUp(i), 'orbitSpeedLayer', String(i)
    ));

    const gainDesc = `τ/rev ×${Math.pow(ORBIT.GAIN_MULT, orbitState.gainLevels[i]).toFixed(3)}  [×${ORBIT.GAIN_MULT}/lv]`;
    col.appendChild(buildUpgradeCard(
      GAIN_ICON, 'τ per Revolution', orbitState.gainLevels[i], gainDesc,
      gainUpCost(i) + ' τ', false,
      () => buyGainUp(i), 'orbitGainLayer', String(i)
    ));
  }

  // External effects
  col.appendChild(el('div', 'section-header orbit-ext-header', 'EXTERNAL EFFECTS'));

  const nk    = orbitState.nBoostLevel * ORBIT.ORBIT_N_EXP;
  const nDesc = orbitState.nBoostLevel === 0
    ? `N × τ^k  [k = +${ORBIT.ORBIT_N_EXP}/lv]`
    : `N × τ^${nk.toFixed(2)}  [×${orbitNBoost().toFixed(3)} now]`;
  col.appendChild(buildUpgradeCard(
    N_BOOST_ICON, 'N Amplifier', orbitState.nBoostLevel, nDesc,
    nBoostCost() + ' τ', true,
    buyNBoost, 'orbitNLayer', ''
  ));

  const seqDesc = orbitState.seqBoostLevel === 0
    ? `seq ×(1 + lv × ${ORBIT.SEQ_BOOST_COEFF} × τ)`
    : `seq ×${orbitSeqBoost().toFixed(3)}  [+${ORBIT.SEQ_BOOST_COEFF}/lv·τ]`;
  col.appendChild(buildUpgradeCard(
    SEQ_BOOST_ICON, 'Sequence Resonance', orbitState.seqBoostLevel, seqDesc,
    seqBoostUpCost() + ' τ', false,
    buySeqBoost, 'orbitSeqLayer', ''
  ));

  // New orbit section
  const nextColor = getCycleColor(orbitState.layers);
  const { r: nr, g: ng, b: nb } = hexToRgb(nextColor);

  const warningEl = el('div', 'orbit-reset-warning',
    'adds outer orbit  ·  resets τ and orbit upgrades');
  warningEl.style.color = `rgba(${nr},${ng},${nb},0.55)`;
  col.appendChild(warningEl);

  const newRow = el('div', 'orbit-new-row');

  const R    = 19;
  const circ = +(2 * Math.PI * R).toFixed(2);
  const prog = Math.min(1, orbitState.tau / orbitResetCost());
  const off  = +(circ * (1 - prog)).toFixed(2);

  const ringSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ringSvg.setAttribute('width', '44');
  ringSvg.setAttribute('height', '44');
  ringSvg.setAttribute('viewBox', '0 0 44 44');
  ringSvg.setAttribute('class', 'orbit-progress-ring');

  const bgArc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  bgArc.setAttribute('cx', '22'); bgArc.setAttribute('cy', '22');
  bgArc.setAttribute('r', String(R));
  bgArc.setAttribute('stroke', `rgba(${nr},${ng},${nb},0.18)`);
  bgArc.setAttribute('stroke-width', '1.5');
  bgArc.setAttribute('fill', 'none');

  const fgArc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  fgArc.setAttribute('cx', '22'); fgArc.setAttribute('cy', '22');
  fgArc.setAttribute('r', String(R));
  fgArc.setAttribute('stroke', nextColor);
  fgArc.setAttribute('stroke-width', '1.5');
  fgArc.setAttribute('fill', 'none');
  fgArc.setAttribute('stroke-dasharray', `${circ} ${circ}`);
  fgArc.setAttribute('stroke-dashoffset', String(off));
  fgArc.style.transform = 'rotate(-90deg)';
  fgArc.style.transformOrigin = '22px 22px';
  fgArc.dataset.orbitProgressArc = '';

  const pctText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  pctText.setAttribute('x', '22');
  pctText.setAttribute('y', '22');
  pctText.setAttribute('text-anchor', 'middle');
  pctText.setAttribute('dominant-baseline', 'central');
  pctText.setAttribute('fill', nextColor);
  pctText.setAttribute('font-size', '9');
  pctText.setAttribute('font-family', 'JetBrains Mono, monospace');
  pctText.textContent = Math.round(prog * 100) + '%';
  pctText.dataset.orbitProgressPct = '';

  ringSvg.appendChild(bgArc);
  ringSvg.appendChild(fgArc);
  ringSvg.appendChild(pctText);
  newRow.appendChild(ringSvg);

  const resetBtn = el('button', 'orbit-reset-btn');
  resetBtn.innerHTML = NEW_ORBIT_ICON + '[ new orbit ]';
  resetBtn.style.color       = `rgba(${nr},${ng},${nb},0.6)`;
  resetBtn.style.borderColor = `rgba(${nr},${ng},${nb},0.25)`;
  resetBtn.dataset.orbitResetBtn = '';
  resetBtn.addEventListener('click', () =>
    showConfirm('perform orbit reset? τ and all orbit upgrades reset, new outer orbit added.', doOrbitReset));
  newRow.appendChild(resetBtn);

  col.appendChild(newRow);
}

// ── Per-frame update ──────────────────────────────────────────────────────────

export function updateOrbitText() {
  drawOrbitCanvas();

  const rate  = tauRate();
  const tauEl  = document.querySelector('[data-orbit-tau]');
  const rateEl = document.querySelector('[data-orbit-rate]');
  if (tauEl)  tauEl.textContent  = 'τ  ' + orbitState.tau.toFixed(2);
  if (rateEl) rateEl.textContent = '+' + rate.toFixed(4) + ' τ/s';

  // Per-layer speed cards
  document.querySelectorAll('[data-orbit-speed-layer]').forEach(card => {
    const i         = parseInt(card.dataset.orbitSpeedLayer);
    const lvl       = orbitState.speedLevels[i];
    const cost      = speedUpCost(i);
    const canAfford = orbitState.tau >= cost;
    const lvBadge   = card.querySelector('.level-badge');
    const descEl    = card.querySelector('.upgrade-desc');
    const costEl    = card.querySelector('.upgrade-cost');
    const btnEl     = card.querySelector('.buy-btn');
    if (lvBadge) lvBadge.textContent = 'lv.' + lvl;
    if (descEl)  descEl.textContent  = `rev/s ×${Math.pow(ORBIT.SPEED_MULT, lvl).toFixed(3)}  [×${ORBIT.SPEED_MULT}/lv]`;
    if (costEl)  { costEl.textContent = cost + ' τ'; costEl.className = 'upgrade-cost' + (canAfford ? '' : ' cannot-afford'); }
    if (btnEl)   btnEl.disabled = !canAfford;
  });

  // Per-layer gain cards
  document.querySelectorAll('[data-orbit-gain-layer]').forEach(card => {
    const i         = parseInt(card.dataset.orbitGainLayer);
    const lvl       = orbitState.gainLevels[i];
    const cost      = gainUpCost(i);
    const canAfford = orbitState.tau >= cost;
    const lvBadge   = card.querySelector('.level-badge');
    const descEl    = card.querySelector('.upgrade-desc');
    const costEl    = card.querySelector('.upgrade-cost');
    const btnEl     = card.querySelector('.buy-btn');
    if (lvBadge) lvBadge.textContent = 'lv.' + lvl;
    if (descEl)  descEl.textContent  = `τ/rev ×${Math.pow(ORBIT.GAIN_MULT, lvl).toFixed(3)}  [×${ORBIT.GAIN_MULT}/lv]`;
    if (costEl)  { costEl.textContent = cost + ' τ'; costEl.className = 'upgrade-cost' + (canAfford ? '' : ' cannot-afford'); }
    if (btnEl)   btnEl.disabled = !canAfford;
  });

  // N boost card
  const nCard = document.querySelector('[data-orbit-n-layer]');
  if (nCard) {
    const lvl       = orbitState.nBoostLevel;
    const cost      = nBoostCost();
    const canAfford = orbitState.tau >= cost;
    const k         = lvl * ORBIT.ORBIT_N_EXP;
    const lvBadge   = nCard.querySelector('.level-badge');
    const descEl    = nCard.querySelector('.upgrade-desc');
    const costEl    = nCard.querySelector('.upgrade-cost');
    const btnEl     = nCard.querySelector('.buy-btn');
    if (lvBadge) lvBadge.textContent = 'lv.' + lvl;
    if (descEl)  descEl.textContent  = lvl === 0
      ? `N × τ^k  [k = +${ORBIT.ORBIT_N_EXP}/lv]`
      : `N × τ^${k.toFixed(2)}  [×${orbitNBoost().toFixed(3)} now]`;
    if (costEl)  { costEl.textContent = cost + ' τ'; costEl.className = 'upgrade-cost' + (canAfford ? '' : ' cannot-afford'); }
    if (btnEl)   btnEl.disabled = !canAfford;
  }

  // Progress ring + reset button
  const progressArc = document.querySelector('[data-orbit-progress-arc]');
  const progressPct = document.querySelector('[data-orbit-progress-pct]');
  if (progressArc || progressPct) {
    const R    = 19;
    const circ = 2 * Math.PI * R;
    const cost = orbitResetCost();
    const prog = Math.min(1, orbitState.tau / cost);
    if (progressArc) progressArc.setAttribute('stroke-dashoffset', (circ * (1 - prog)).toFixed(2));
    if (progressPct) progressPct.textContent = Math.round(prog * 100) + '%';
  }
  const resetBtnEl = document.querySelector('[data-orbit-reset-btn]');
  if (resetBtnEl) resetBtnEl.disabled = orbitState.tau < orbitResetCost();

  // Seq boost card
  const seqCard = document.querySelector('[data-orbit-seq-layer]');
  if (seqCard) {
    const lvl       = orbitState.seqBoostLevel;
    const cost      = seqBoostUpCost();
    const canAfford = orbitState.tau >= cost;
    const lvBadge   = seqCard.querySelector('.level-badge');
    const descEl    = seqCard.querySelector('.upgrade-desc');
    const costEl    = seqCard.querySelector('.upgrade-cost');
    const btnEl     = seqCard.querySelector('.buy-btn');
    if (lvBadge) lvBadge.textContent = 'lv.' + lvl;
    if (descEl)  descEl.textContent  = lvl === 0
      ? `seq ×(1 + lv × ${ORBIT.SEQ_BOOST_COEFF} × τ)`
      : `seq ×${orbitSeqBoost().toFixed(3)}  [+${ORBIT.SEQ_BOOST_COEFF}/lv·τ]`;
    if (costEl)  { costEl.textContent = cost + ' τ'; costEl.className = 'upgrade-cost' + (canAfford ? '' : ' cannot-afford'); }
    if (btnEl)   btnEl.disabled = !canAfford;
  }
}
