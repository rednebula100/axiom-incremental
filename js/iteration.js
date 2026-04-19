// iteration.js — Iteration prestige layer: ℐ system.
// Sits above Theorems and Sequences; resets all of layer 0.

import { gameState } from './state.js';
import { showConfirm } from './confirm.js';
import { fmt } from './format.js';
import { ITER } from './balance.js';
import { seqState, resetSeqState } from './sequences.js';

// ── State ─────────────────────────────────────────────────────────────────────

export const iterState = {
  count: 0,  // cumulative ℐ, never resets
};

// ── Math ──────────────────────────────────────────────────────────────────────

// floor(log10(N+1)^K) — returns 0 for N=0, grows with N magnitude
export function computeIter(N) {
  if (N.lte(0)) return 0;
  const log10 = N.add(1).log10();  // break_infinity returns plain JS number
  return Math.max(0, Math.floor(Math.pow(log10, ITER.K)));
}

// (ℐ + 1)^MULT_EXP — neutral at 0 ℐ, meaningful after first iteration
export function iterMult() {
  if (iterState.count <= 0) return 1;
  return Math.pow(iterState.count + 1, ITER.MULT_EXP);
}

// ── Action ────────────────────────────────────────────────────────────────────

export function doIter() {
  const earned = computeIter(gameState.N);
  if (earned <= 0) return;

  iterState.count += earned;

  // Full layer-0 reset
  gameState.N               = new Decimal(0);
  gameState.axiomCount      = 0;
  gameState.theoremCount    = 0;
  gameState.theoremUnlocked = false;
  for (const upg of gameState.upgrades) {
    upg.level = 0;
    if (upg.unlockCondition !== null) upg.unlocked = false;
  }

  // Full sequence reset (slots, vars, pts, ref, geoUpgrades)
  resetSeqState({ keepPts: false });
  seqState.refPts   = 0;
  seqState.refCount = 0;
  seqState.geoUpgrades.baseScaling.level    = 0;
  seqState.geoUpgrades.baseScaling.unlocked = false;

  // Hide sequences tab until re-earned
  gameState.sequencesUnlocked = false;
  const seqTab = document.getElementById('tab-sequences');
  if (seqTab) seqTab.style.display = 'none';

  gameState.domDirty    = true;
  gameState.seqDomDirty = true;
  gameState.itDomDirty  = true;
}

// ── DOM helper ────────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)                e.className   = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ── SVG icon — concentric rings with cardinal ticks (cosmos / recursion) ──────

const ITER_ICON = `<svg width="52" height="52" viewBox="0 0 52 52" xmlns="http://www.w3.org/2000/svg">
  <circle cx="26" cy="26" r="22" stroke="#5a3e08" stroke-width="1.2" fill="none"/>
  <circle cx="26" cy="26" r="14" stroke="#6e4e10" stroke-width="1.2" fill="none"/>
  <circle cx="26" cy="26" r="6"  stroke="#826018" stroke-width="1.2" fill="none"/>
  <line x1="26" y1="4"  x2="26" y2="10" stroke="#826018" stroke-width="1.6"/>
  <line x1="26" y1="42" x2="26" y2="48" stroke="#826018" stroke-width="1.6"/>
  <line x1="4"  y1="26" x2="10" y2="26" stroke="#826018" stroke-width="1.6"/>
  <line x1="42" y1="26" x2="48" y2="26" stroke="#826018" stroke-width="1.6"/>
  <line x1="10" y1="10" x2="14" y2="14" stroke="#5a3e08" stroke-width="1"/>
  <line x1="42" y1="10" x2="38" y2="14" stroke="#5a3e08" stroke-width="1"/>
  <line x1="10" y1="42" x2="14" y2="38" stroke="#5a3e08" stroke-width="1"/>
  <line x1="42" y1="42" x2="38" y2="38" stroke="#5a3e08" stroke-width="1"/>
</svg>`;

// ── DOM Build ─────────────────────────────────────────────────────────────────

export function buildIterationDOM() {
  const col = document.getElementById('iteration-column');
  if (!col) return;
  col.innerHTML = '';

  col.appendChild(el('div', 'section-header', 'ITERATION'));

  const card = el('div', 'iteration-card first-in-group');

  const iconWrap = el('div', 'iteration-icon');
  iconWrap.innerHTML = ITER_ICON;
  card.appendChild(iconWrap);

  card.appendChild(el('div', 'iteration-label', 'ℐ  ·  iterate'));
  card.appendChild(el('div', 'iter-divider'));

  // Stat rows
  const rows = [
    { label: 'earn',       attr: 'iterEarn',  extra: '' },
    { label: 'total ℐ',   attr: 'iterTotal', extra: '' },
    { label: 'production', attr: 'iterMult',  extra: 'iter-val-mult' },
  ];
  for (const { label, attr, extra } of rows) {
    const row = el('div', 'iter-stat-row');
    row.appendChild(el('span', 'iter-stat-label', label));
    const val = el('span', 'iter-stat-val' + (extra ? ' ' + extra : ''));
    val.dataset[attr] = '';
    row.appendChild(val);
    card.appendChild(row);
  }

  card.appendChild(el('div', 'iter-divider'));
  card.appendChild(el('div', 'iter-warning',
    'costs everything  \u00b7  all progress resets  \u00b7  a new layer begins'));

  const btn = el('button', 'iterate-btn', '[ iterate ]');
  btn.dataset.iterBtn = '';
  btn.addEventListener('click', () =>
    showConfirm('perform iteration? all layer\u00a00 progress resets.', doIter));
  card.appendChild(btn);

  col.appendChild(card);
}

// ── Per-frame update ──────────────────────────────────────────────────────────

export function updateIterationText() {
  const earned = computeIter(gameState.N);
  const total  = iterState.count;
  const mult   = iterMult();

  const earnEl  = document.querySelector('[data-iter-earn]');
  const totalEl = document.querySelector('[data-iter-total]');
  const multEl  = document.querySelector('[data-iter-mult]');
  const btnEl   = document.querySelector('[data-iter-btn]');

  if (earnEl)  earnEl.textContent  = '+' + earned + ' \u2110';
  if (totalEl) totalEl.textContent = total + ' \u2110';
  if (multEl)  multEl.textContent  = '\u00d7' + (mult <= 1 ? '1.000' : mult.toFixed(3));
  if (btnEl)   btnEl.disabled      = earned <= 0;
}
