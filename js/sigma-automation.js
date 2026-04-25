// sigma-automation.js — Sigma Automation system: ℐ-powered upgrade automation.

import { gameState, epochState, iterState, upgradeCostMult } from './state.js';
import { SIGMA_AUTO, FREQ_AMP } from './balance.js';
import { fmt } from './format.js';

// ── State ─────────────────────────────────────────────────────────────────────

export const sigmaState = {
  freq:        1,
  ampLevel:    0,
  slots:       [null, null, null],
  elapsed:     0,
  currentSlot: 0,  // slot index the machine is currently targeting
  dirty:       true,
};

// ── Available automations ─────────────────────────────────────────────────────

const AUTOMATION_ITEMS = [
  { id: 'auto-successor',      label: 'upgrade auto-buy (Successor)',      slotLabel: 'Successor',      upgradeId: 'successor',      desc: 'buys one level when affordable' },
  { id: 'auto-addition',       label: 'upgrade auto-buy (Addition)',       slotLabel: 'Addition',       upgradeId: 'addition',       desc: 'buys one level when affordable' },
  { id: 'auto-multiplication', label: 'upgrade auto-buy (Multiplication)', slotLabel: 'Multiplication', upgradeId: 'multiplication', desc: 'buys one level when affordable' },
  { id: 'auto-exponentiation', label: 'upgrade auto-buy (Exponentiation)', slotLabel: 'Exponentiation', upgradeId: 'exponentiation', desc: 'buys one level when affordable' },
];

// ── Math ──────────────────────────────────────────────────────────────────────

export function freqCost() {
  return Math.ceil(
    SIGMA_AUTO.FREQ_BASE_COST * Math.pow(SIGMA_AUTO.FREQ_COST_SCALE, sigmaState.freq - 1)
  );
}

export function effectiveFreq() {
  return sigmaState.freq * Math.pow(FREQ_AMP.EFFECT_MULT, sigmaState.ampLevel);
}

export function ampCost() {
  return new Decimal(FREQ_AMP.COST_BASE).mul(new Decimal(FREQ_AMP.COST_SCALE).pow(sigmaState.ampLevel));
}

// ── Actions ───────────────────────────────────────────────────────────────────

export function buyFreq() {
  const cost = freqCost();
  if (iterState.count < cost) return;
  iterState.count -= cost;
  sigmaState.freq++;
  sigmaState.dirty = true;
  gameState.itDomDirty = true;
}

export function buyAmp() {
  const cost = ampCost();
  if (gameState.N.lt(cost)) return;
  gameState.N = gameState.N.sub(cost);
  sigmaState.ampLevel++;
  sigmaState.dirty = true;
}

function execAutoUpgradeById(upgradeId) {
  const upg = gameState.upgrades.find(u => u.id === upgradeId);
  if (!upg || !upg.unlocked) return;
  const cost = upg.costFn(upg.level).mul(new Decimal(upgradeCostMult()));
  if (gameState.N.lt(cost)) return;
  gameState.N = gameState.N.sub(cost);
  upg.level++;

  const btn = document.querySelector(`[data-buy="${upgradeId}"]`);
  if (btn) {
    btn.classList.remove('sigma-btn-flash');
    void btn.offsetWidth;
    btn.classList.add('sigma-btn-flash');
    setTimeout(() => btn.classList.remove('sigma-btn-flash'), 400);
  }
}

// Returns index of filled slot with lowest upgrade cost.
// requireAffordable=true: only consider slots where N >= cost.
function cheapestSlot(requireAffordable) {
  let bestIdx  = -1;
  let bestCost = null;
  for (let i = 0; i < sigmaState.slots.length; i++) {
    const itemId = sigmaState.slots[i];
    if (!itemId) continue;
    const item = AUTOMATION_ITEMS.find(a => a.id === itemId);
    if (!item) continue;
    const upg = gameState.upgrades.find(u => u.id === item.upgradeId);
    if (!upg || !upg.unlocked) continue;
    const cost = upg.costFn(upg.level).mul(new Decimal(upgradeCostMult()));
    if (requireAffordable && gameState.N.lt(cost)) continue;
    if (bestCost === null || cost.lt(bestCost)) { bestCost = cost; bestIdx = i; }
  }
  return bestIdx;
}

export function tickSigmaAutomation(delta) {
  if (sigmaState.slots.every(s => s === null)) { sigmaState.elapsed = 0; return; }

  // Pick cheapest affordable slot; fall back to cheapest overall while waiting
  let targetIdx = cheapestSlot(true);
  if (targetIdx < 0) {
    targetIdx = cheapestSlot(false);
    if (targetIdx < 0) return;
    if (sigmaState.currentSlot !== targetIdx) { sigmaState.currentSlot = targetIdx; sigmaState.elapsed = 0; }
    return; // nothing affordable — timer frozen
  }

  // Reset timer if a cheaper target has appeared
  if (sigmaState.currentSlot !== targetIdx) { sigmaState.currentSlot = targetIdx; sigmaState.elapsed = 0; }

  sigmaState.elapsed += delta * effectiveFreq();
  if (sigmaState.elapsed < 1) return;

  sigmaState.elapsed = 0;
  const item = AUTOMATION_ITEMS.find(a => a.id === sigmaState.slots[targetIdx]);
  if (item) execAutoUpgradeById(item.upgradeId);
}

// ── SVG ───────────────────────────────────────────────────────────────────────

const FREQ_ICON = `<svg width="40" height="32" viewBox="0 0 40 32" xmlns="http://www.w3.org/2000/svg">
  <line x1="0" y1="16" x2="40" y2="16" stroke="#3a2808" stroke-width="1"/>
  <path d="M0,16 C4,16 5,4 10,4 C15,4 16,28 20,28 C24,28 25,4 30,4 C35,4 36,16 40,16"
        stroke="#826018" stroke-width="1.5" fill="none" stroke-linejoin="round"/>
  <line x1="10" y1="12" x2="10" y2="20" stroke="#5a3e08" stroke-width="1"/>
  <line x1="20" y1="12" x2="20" y2="20" stroke="#5a3e08" stroke-width="1"/>
  <line x1="30" y1="12" x2="30" y2="20" stroke="#5a3e08" stroke-width="1"/>
</svg>`;

const AMP_ICON = `<svg width="52" height="36" viewBox="0 0 52 36" xmlns="http://www.w3.org/2000/svg">
  <line x1="2" y1="18" x2="50" y2="18" stroke="#3a2808" stroke-width="1"/>
  <path d="M2,18 C8,10 16,10 22,18 C28,26 36,26 42,18 C46,14 48,14 50,18" stroke="#5a3e08" stroke-width="1.2" fill="none"/>
  <path d="M2,18 C8,4 16,4 22,18 C28,32 36,32 42,18 C46,10 48,10 50,18" stroke="#826018" stroke-width="1.5" fill="none"/>
</svg>`;

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)                e.className   = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

let draggingId = null;

function buildSlot(index) {
  const filled = sigmaState.slots[index] !== null;
  const slot   = el('div', 'sigma-slot' + (filled ? ' sigma-slot-filled' : ''));
  slot.dataset.slotIndex = String(index);

  slot.addEventListener('dragover', (e) => {
    if (!draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    slot.classList.add('sigma-slot-hover');
  });
  slot.addEventListener('dragleave', () => slot.classList.remove('sigma-slot-hover'));
  slot.addEventListener('drop', (e) => {
    e.preventDefault();
    slot.classList.remove('sigma-slot-hover');
    if (!draggingId) return;
    sigmaState.slots[index] = draggingId;
    sigmaState.dirty = true;
  });

  if (filled) {
    const item = AUTOMATION_ITEMS.find(a => a.id === sigmaState.slots[index]);
    const nameEl = el('span', 'sigma-slot-label', item ? item.slotLabel : sigmaState.slots[index]);
    slot.appendChild(nameEl);
    const rmBtn = el('button', 'sigma-slot-remove', '×');
    rmBtn.addEventListener('click', () => {
      sigmaState.slots[index] = null;
      sigmaState.dirty = true;
    });
    slot.appendChild(rmBtn);

    const barWrap = el('div', 'sigma-slot-bar-wrap');
    const barFill = el('div', 'sigma-slot-bar-fill');
    barFill.dataset.slotBar = String(index);
    barWrap.appendChild(barFill);
    slot.appendChild(barWrap);
  } else {
    slot.appendChild(el('span', 'sigma-slot-empty', 'empty'));
  }

  return slot;
}

// ── DOM Build ─────────────────────────────────────────────────────────────────

export function buildSigmaAutomationDOM() {
  const col = document.getElementById('iter-sigma-column');
  if (!col) return;
  col.innerHTML = '';

  const targetSlotCount = epochState.epoch3 ? 4 : 3;
  if (sigmaState.slots.length !== targetSlotCount) {
    sigmaState.slots = new Array(targetSlotCount).fill(null);
  }

  col.appendChild(el('div', 'section-header', 'SIGMA AUTOMATION'));

  // ── 1. Freq exchange card ─────────────────────────────────────────────────
  const exchCard = el('div', 'sigma-exchange-card first-in-group');

  exchCard.appendChild(el('div', 'sigma-freq-card-label', 'freq  ·  sigma'));

  const exchRow = el('div', 'sigma-exch-row');

  const iterCell = el('div', 'sigma-exch-cell');
  iterCell.appendChild(el('span', 'sigma-exch-cell-label', 'ℐ'));
  const iterValEl = el('span', 'sigma-exch-cell-val');
  iterValEl.dataset.sigmaExchIter = '';
  iterCell.appendChild(iterValEl);
  exchRow.appendChild(iterCell);

  exchRow.appendChild(el('span', 'sigma-exch-arrow', '→'));

  const freqCell = el('div', 'sigma-exch-cell');
  freqCell.appendChild(el('span', 'sigma-exch-cell-label', 'freq'));
  const freqValEl = el('span', 'sigma-exch-cell-val');
  freqValEl.dataset.sigmaExchFreq = '';
  freqCell.appendChild(freqValEl);
  exchRow.appendChild(freqCell);

  exchCard.appendChild(exchRow);

  exchCard.appendChild(el('div', 'sigma-freq-divider'));

  const exchBottom = el('div', 'sigma-exch-bottom');
  const costSpan = el('span', 'sigma-exch-cost');
  costSpan.dataset.sigmaFreqCost = '';
  exchBottom.appendChild(costSpan);
  const freqBtn = el('button', 'sigma-freq-btn', '[ + freq ]');
  freqBtn.dataset.sigmaFreqBtn = '';
  freqBtn.addEventListener('click', buyFreq);
  exchBottom.appendChild(freqBtn);
  exchCard.appendChild(exchBottom);

  col.appendChild(exchCard);

  // ── 2. Sigma main card ────────────────────────────────────────────────────
  const sigmaCard = el('div', 'sigma-main-card');

  const formulaRow = el('div', 'sigma-formula-row');

  const katexWrap = document.createElement('span');
  katexWrap.className = 'sigma-katex-wrap';
  katexWrap.dataset.sigmaKatex = '';
  if (typeof katex !== 'undefined') {
    const slotCount = sigmaState.slots.length;
    const kLabel = Array.from({length: slotCount}, (_, i) => i + 1).join(',');
    katex.render(`\\sum_{k=${kLabel}}^{${sigmaState.freq}}`, katexWrap, {
      throwOnError: false,
      displayMode:  true,
      output:       'html',
    });
  }
  formulaRow.appendChild(katexWrap);

  const slotsRow = el('div', 'sigma-slots-row');
  for (let i = 0; i < sigmaState.slots.length; i++) {
    slotsRow.appendChild(buildSlot(i));
  }
  formulaRow.appendChild(slotsRow);
  sigmaCard.appendChild(formulaRow);

  sigmaCard.appendChild(el('div', 'sigma-main-divider'));

  const statusEl = el('div', 'sigma-status');
  statusEl.dataset.sigmaStatus = '';
  sigmaCard.appendChild(statusEl);

  col.appendChild(sigmaCard);

  // ── 3. Harmonic Amplifier card ────────────────────────────────────────────
  const ampCard = el('div', 'sigma-amp-card');

  const ampHeader = el('div', 'sigma-amp-header');

  const ampIconWrap = el('div', 'sigma-amp-icon');
  ampIconWrap.innerHTML = AMP_ICON;
  ampHeader.appendChild(ampIconWrap);

  const ampInfo = el('div', 'sigma-amp-info');
  ampInfo.appendChild(el('span', 'sigma-amp-name', 'Harmonic Amplifier'));
  const ampDesc = el('span', 'sigma-amp-desc');
  ampDesc.dataset.sigmaAmpDesc = '';
  ampInfo.appendChild(ampDesc);
  ampHeader.appendChild(ampInfo);
  ampCard.appendChild(ampHeader);

  const ampStatLevel = el('div', 'sigma-amp-stat-row');
  ampStatLevel.appendChild(el('span', 'sigma-amp-stat-label', 'level'));
  const ampLevelVal = el('span', 'sigma-amp-stat-val');
  ampLevelVal.dataset.sigmaAmpLevel = '';
  ampStatLevel.appendChild(ampLevelVal);
  ampCard.appendChild(ampStatLevel);

  const ampStatCost = el('div', 'sigma-amp-stat-row');
  ampStatCost.appendChild(el('span', 'sigma-amp-stat-label', 'cost'));
  const ampCostVal = el('span', 'sigma-amp-stat-val');
  ampCostVal.dataset.sigmaAmpCost = '';
  ampStatCost.appendChild(ampCostVal);
  ampCard.appendChild(ampStatCost);

  ampCard.appendChild(el('div', 'sigma-amp-divider'));

  const ampBtn = el('button', 'sigma-freq-btn sigma-amp-btn', '[ + amplifier ]');
  ampBtn.dataset.sigmaAmpBtn = '';
  ampBtn.addEventListener('click', buyAmp);
  ampCard.appendChild(ampBtn);

  // ── 4. Automations list ───────────────────────────────────────────────────
  const itemsCard = el('div', 'sigma-items-card');
  itemsCard.appendChild(el('div', 'sigma-items-header', 'automations  ·  drag to slot'));

  for (const item of AUTOMATION_ITEMS) {
    const itemEl = el('div', 'sigma-item');
    itemEl.draggable = true;
    itemEl.dataset.autoId = item.id;

    const handleEl = el('span', 'sigma-item-handle', '⠿');
    itemEl.appendChild(handleEl);

    const bodyEl = el('div', 'sigma-item-body');
    bodyEl.appendChild(el('span', 'sigma-item-label', item.label));
    bodyEl.appendChild(el('span', 'sigma-item-desc', item.desc));
    itemEl.appendChild(bodyEl);

    itemEl.addEventListener('dragstart', (e) => {
      draggingId = item.id;
      e.dataTransfer.effectAllowed = 'copy';
      itemEl.classList.add('sigma-item-dragging');
    });
    itemEl.addEventListener('dragend', () => {
      draggingId = null;
      itemEl.classList.remove('sigma-item-dragging');
    });
    itemsCard.appendChild(itemEl);
  }

  col.appendChild(itemsCard);
  col.appendChild(ampCard);
}

// ── Per-frame update ──────────────────────────────────────────────────────────

export function updateSigmaText() {
  const cost        = freqCost();
  const activeSlots = sigmaState.slots.filter(s => s !== null).length;
  const effFreq     = effectiveFreq();
  const interval    = (1 / effFreq).toFixed(1);
  const isRunning   = activeSlots > 0;

  const exchIterEl = document.querySelector('[data-sigma-exch-iter]');
  const exchFreqEl = document.querySelector('[data-sigma-exch-freq]');
  const freqCostEl = document.querySelector('[data-sigma-freq-cost]');
  const freqBtnEl  = document.querySelector('[data-sigma-freq-btn]');
  const statusEl   = document.querySelector('[data-sigma-status]');
  const ampLevelEl = document.querySelector('[data-sigma-amp-level]');
  const ampCostEl  = document.querySelector('[data-sigma-amp-cost]');
  const ampDescEl  = document.querySelector('[data-sigma-amp-desc]');
  const ampBtnEl   = document.querySelector('[data-sigma-amp-btn]');

  if (exchIterEl) exchIterEl.textContent = iterState.count + ' ℐ';
  if (exchFreqEl) exchFreqEl.textContent = sigmaState.freq;
  if (freqCostEl) freqCostEl.textContent = cost + ' ℐ';
  if (freqBtnEl)  freqBtnEl.disabled     = iterState.count < cost;

  if (ampLevelEl) ampLevelEl.textContent = sigmaState.ampLevel;
  if (ampCostEl)  ampCostEl.textContent  = fmt(ampCost()) + ' N';
  if (ampDescEl)  ampDescEl.textContent  = `interval ×${(1 / Math.pow(FREQ_AMP.EFFECT_MULT, sigmaState.ampLevel)).toFixed(3)}  [×${(1 / FREQ_AMP.EFFECT_MULT).toFixed(3)}/lv]`;
  if (ampBtnEl)   ampBtnEl.disabled      = gameState.N.lt(ampCost());

  if (statusEl) {
    const slotWord = activeSlots === 1 ? 'slot' : 'slots';
    statusEl.textContent = isRunning
      ? `running  ·  interval ${interval}s  ·  ${activeSlots} ${slotWord} active`
      : `idle  ·  interval ${interval}s  ·  no slots active`;
  }

  // Clear automation-driven inline styles from all buy buttons
  document.querySelectorAll('[data-buy]').forEach(btn => {
    btn.style.color = '';
    btn.style.borderColor = '';
  });

  for (let i = 0; i < sigmaState.slots.length; i++) {
    const barFill = document.querySelector(`[data-slot-bar="${i}"]`);
    if (!barFill) continue;
    if (!sigmaState.slots[i]) continue;

    if (i !== sigmaState.currentSlot) {
      barFill.style.width = '0%';
      barFill.className = 'sigma-slot-bar-fill bar-queued';
      continue;
    }

    const item = AUTOMATION_ITEMS.find(a => a.id === sigmaState.slots[i]);
    const upg  = item ? gameState.upgrades.find(u => u.id === item.upgradeId) : null;
    const affordable = upg && upg.unlocked && gameState.N.gte(
      upg.costFn(upg.level).mul(new Decimal(upgradeCostMult()))
    );

    if (affordable) {
      const t = Math.min(1, sigmaState.elapsed);
      barFill.style.width = (t * 100).toFixed(1) + '%';
      barFill.className = 'sigma-slot-bar-fill bar-active';

      // Gradually brighten the target buy button 120→255 as bar fills
      const btn = item ? document.querySelector(`[data-buy="${item.upgradeId}"]`) : null;
      if (btn && !btn.disabled && t > 0) {
        const v = Math.round(120 + 135 * t);
        const c = `rgb(${v},${v},${v})`;
        btn.style.color = c;
        btn.style.borderColor = c;
      }
    } else {
      barFill.style.width = '100%';
      barFill.className = 'sigma-slot-bar-fill bar-waiting';
    }
  }
}
