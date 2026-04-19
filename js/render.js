// render.js — DOM building (on dirty flag) and per-frame text patching.

import {
  gameState, axiomRequirement, upgradeCostMult,
  totalAxiomMult, totalTheoremMult, theoremRequirement, MILESTONES, THEOREM_MILESTONES,
} from './state.js';
import { totalSeqMult } from './sequences.js';
import { buildSequencesDOM, updateSequencesText } from './sequences-ui.js';
import { computeProduction } from './production.js';
import { fmt, fmtRate } from './format.js';
import { buyUpgrade, doAxiom, doTheorem } from './actions.js';
import { showConfirm } from './confirm.js';
import { buildIterationDOM, updateIterationText } from './iteration.js';

// ── Upgrade icons ─────────────────────────────────────────────────────────────

function iconSVG(id) {
  if (id === 'icon-successor') {
    return `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="8"  x2="18" y2="28" stroke="#666" stroke-width="1.5"/>
      <line x1="8"  y1="18" x2="28" y2="18" stroke="#666" stroke-width="1.5"/>
    </svg>`;
  }
  if (id === 'icon-addition') {
    return `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <line x1="8" y1="12" x2="28" y2="12" stroke="#666" stroke-width="1.5"/>
      <line x1="8" y1="18" x2="28" y2="18" stroke="#666" stroke-width="1.5"/>
      <line x1="8" y1="24" x2="28" y2="24" stroke="#666" stroke-width="1.5"/>
    </svg>`;
  }
  if (id === 'icon-multiplication') {
    return `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <line x1="9"  y1="9"  x2="27" y2="27" stroke="#666" stroke-width="1.5"/>
      <line x1="27" y1="9"  x2="9"  y2="27" stroke="#666" stroke-width="1.5"/>
    </svg>`;
  }
  if (id === 'icon-exponentiation') {
    // Caret ( ^ ) — just two lines, no baseline, consistent minimal style
    return `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
      <line x1="7"  y1="26" x2="18" y2="10" stroke="#666" stroke-width="1.5"/>
      <line x1="18" y1="10" x2="29" y2="26" stroke="#666" stroke-width="1.5"/>
    </svg>`;
  }
  return '';
}

// ── Reset icons (higher-tier feel) ───────────────────────────────────────────

const AXIOM_ICON = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
  <polygon points="18,5 31,18 18,31 5,18" stroke="#666" stroke-width="1.5" fill="none"/>
  <line x1="18" y1="11" x2="18" y2="25" stroke="#555" stroke-width="1.2"/>
  <line x1="11" y1="18" x2="25" y2="18" stroke="#555" stroke-width="1.2"/>
</svg>`;

// Three nested diamonds — visually more complex to signal higher tier
const THEOREM_ICON = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
  <polygon points="18,4 32,18 18,32 4,18"   stroke="#999" stroke-width="1.5" fill="none"/>
  <polygon points="18,9 27,18 18,27 9,18"   stroke="#999" stroke-width="1.5" fill="none"/>
  <polygon points="18,14 22,18 18,22 14,18" stroke="#999" stroke-width="1"   fill="none"/>
</svg>`;

// ── Section helpers ───────────────────────────────────────────────────────────

function createSectionHeader(text) {
  const el = document.createElement('div');
  el.className = 'section-header';
  el.textContent = text;
  return el;
}


// ── Upgrade card ──────────────────────────────────────────────────────────────

function createUpgradeCard(upg, isFirst) {
  const card = document.createElement('div');
  card.className = 'upgrade-card' + (isFirst ? ' first-in-group' : '');
  card.dataset.upgId = upg.id;

  const iconDiv = document.createElement('div');
  iconDiv.className = 'upgrade-icon';
  iconDiv.innerHTML = iconSVG(upg.iconId);

  const info = document.createElement('div');
  info.className = 'upgrade-info';

  const nameRow = document.createElement('div');
  nameRow.className = 'upgrade-name';
  nameRow.innerHTML =
    `${upg.name} <span class="level-badge" data-lvl="${upg.id}">lv.${upg.level}</span>`;

  const desc = document.createElement('div');
  desc.className = 'upgrade-desc';
  desc.dataset.desc = upg.id;
  desc.textContent = upg.descTemplate(upg.level);

  info.appendChild(nameRow);
  info.appendChild(desc);

  const right = document.createElement('div');
  right.className = 'upgrade-right';

  const costEl = document.createElement('div');
  costEl.className = 'upgrade-cost';
  costEl.dataset.cost = upg.id;

  const btn = document.createElement('button');
  btn.className = 'buy-btn';
  btn.dataset.buy = upg.id;
  btn.textContent = gameState.buyMax ? 'max' : 'buy';
  btn.addEventListener('click', () => buyUpgrade(upg.id));

  right.appendChild(costEl);
  right.appendChild(btn);
  card.appendChild(iconDiv);
  card.appendChild(info);
  card.appendChild(right);
  return card;
}

// ── Reset card (Axiom / Theorem) ─────────────────────────────────────────────

function createResetCard({ id, iconHTML, label, btnId, onReset, milestones = [], msType = 'axiom', unlockedCount = milestones.length }) {
  const card = document.createElement('div');
  card.id = id;
  card.className = 'reset-card';

  const iconWrap = document.createElement('div');
  iconWrap.className = 'reset-card-icon';
  iconWrap.innerHTML = iconHTML;

  const lbl = document.createElement('div');
  lbl.className = 'reset-card-label';
  lbl.textContent = label;

  const countEl = document.createElement('div');
  countEl.id = `${id}-count`;
  countEl.className = 'reset-card-count';

  const boostEl = document.createElement('div');
  boostEl.id = `${id}-boost`;
  boostEl.className = 'reset-card-boost';

  const reqEl = document.createElement('div');
  reqEl.id = `${id}-req`;
  reqEl.className = 'reset-card-req';

  const btn = document.createElement('button');
  btn.id = btnId;
  btn.className = 'reset-btn';
  btn.addEventListener('click', () => showConfirm(`perform ${label.toLowerCase()}?`, onReset));

  card.appendChild(iconWrap);
  card.appendChild(lbl);
  card.appendChild(countEl);
  card.appendChild(boostEl);
  card.appendChild(reqEl);
  card.appendChild(btn);

  // ── Milestone drawer ──
  // Visible: all achieved + the very next unachieved (dimmed preview)
  const visibleMs = milestones.slice(0, unlockedCount + 1);
  if (visibleMs.length > 0) {
    const toggle = document.createElement('div');
    toggle.className = 'ms-toggle';

    const arrow = document.createElement('span');
    arrow.className = 'ms-arrow';
    arrow.textContent = '\u25b8';   // ▸

    const countLbl = document.createElement('span');
    countLbl.textContent = `${unlockedCount} milestone${unlockedCount !== 1 ? 's' : ''}`;

    toggle.appendChild(arrow);
    toggle.appendChild(countLbl);

    const drawer = document.createElement('div');
    drawer.className = 'ms-drawer';

    visibleMs.forEach((ms, i) => {
      const isNext = i === unlockedCount;
      drawer.appendChild(createMilestoneRow(ms, i === 0, msType, isNext));
    });

    toggle.addEventListener('click', () => {
      const open = card.classList.toggle('ms-open');
      arrow.textContent = open ? '\u25be' : '\u25b8';   // ▾ : ▸
    });

    card.appendChild(toggle);
    card.appendChild(drawer);
  }

  return card;
}

// ── Milestone row ─────────────────────────────────────────────────────────────

function createMilestoneRow(ms, isFirst, type = 'axiom', isNext = false) {
  const row = document.createElement('div');
  const baseClass = type === 'theorem' ? 'theorem-milestone-row' : 'milestone-row';
  row.className = baseClass + (isFirst ? ' first-in-group' : '') + (isNext ? ' ms-locked' : '');

  const indicator = document.createElement('span');
  indicator.className = 'ms-indicator';
  indicator.textContent = isNext ? '\u00b7' : '\u2713';

  const req = document.createElement('span');
  req.className = 'ms-req';
  req.textContent = type === 'theorem' ? `th.${ms.req}` : `ax.${ms.req}`;

  const name = document.createElement('span');
  name.className = 'ms-name';
  name.textContent = isNext ? '???' : ms.name;

  const desc = document.createElement('span');
  desc.className = 'ms-desc';
  desc.textContent = isNext ? '???' : ms.descFn();

  row.appendChild(indicator);
  row.appendChild(req);
  row.appendChild(name);
  row.appendChild(desc);
  return row;
}

// ── Full DOM rebuild ──────────────────────────────────────────────────────────

export function buildUpgradeDOM() {
  const col      = document.getElementById('upgrade-column');
  const prestige = document.getElementById('prestige-column');
  col.innerHTML      = '';
  prestige.innerHTML = '';

  // ── Upgrades ──
  const unlockedUpgrades = gameState.upgrades.filter((u) => u.unlocked);
  if (unlockedUpgrades.length > 0) {
    col.appendChild(createSectionHeader('UPGRADES'));
    unlockedUpgrades.forEach((upg, i) => col.appendChild(createUpgradeCard(upg, i === 0)));
  }

  // ── Prestige resets in their own wider column ──
  const showAxiom = gameState.N.gte(axiomRequirement()) || gameState.axiomCount > 0 || gameState.theoremCount >= 1;
  if (showAxiom) {
    const unlockedMs    = MILESTONES.filter((ms) => gameState.axiomCount   >= ms.req);
    const unlockedTMCnt = THEOREM_MILESTONES.filter((ms) => gameState.theoremCount >= ms.req).length;

    prestige.appendChild(createSectionHeader('PRESTIGE'));

    const resetRow = document.createElement('div');
    resetRow.id = 'reset-row';

    resetRow.appendChild(createResetCard({
      id: 'axiom-section',
      iconHTML: AXIOM_ICON,
      label: 'AXIOM',
      btnId: 'axiom-btn',
      onReset: doAxiom,
      milestones: unlockedMs,
      msType: 'axiom',
    }));

    if (gameState.theoremUnlocked) {
      resetRow.appendChild(createResetCard({
        id: 'theorem-section',
        iconHTML: THEOREM_ICON,
        label: 'THEOREM',
        btnId: 'theorem-btn',
        onReset: doTheorem,
        milestones: THEOREM_MILESTONES.slice(0, unlockedTMCnt),
        msType: 'theorem',
      }));
    }

    prestige.appendChild(resetRow);
  }
}

// ── Per-frame text patches ────────────────────────────────────────────────────

export function updateCardText() {
  const costMult = upgradeCostMult();
  const isBuyMax = gameState.buyMax;

  for (const upg of gameState.upgrades) {
    if (!upg.unlocked) continue;

    const cost      = upg.costFn(upg.level).mul(new Decimal(costMult));
    const canAfford = gameState.N.gte(cost);

    const costEl = document.querySelector(`[data-cost="${upg.id}"]`);
    const btnEl  = document.querySelector(`[data-buy="${upg.id}"]`);
    const descEl = document.querySelector(`[data-desc="${upg.id}"]`);
    const lvlEl  = document.querySelector(`[data-lvl="${upg.id}"]`);

    if (costEl) {
      costEl.textContent = fmt(cost) + ' N';
      costEl.className   = 'upgrade-cost' + (canAfford ? '' : ' cannot-afford');
    }
    if (btnEl) {
      btnEl.disabled     = !canAfford;
      btnEl.textContent  = isBuyMax ? 'max' : 'buy';
    }
    if (descEl) descEl.textContent = upg.descTemplate(upg.level);
    if (lvlEl)  lvlEl.textContent  = 'lv.' + upg.level;
  }

  // ── Axiom card ──
  const axiomBtn   = document.getElementById('axiom-btn');
  if (axiomBtn) {
    const req      = axiomRequirement();
    const canAxiom = gameState.N.gte(req);
    const nextTotal = totalAxiomMult(gameState.axiomCount + 1).toFixed(2);
    axiomBtn.disabled    = !canAxiom;
    axiomBtn.textContent = `axiom  [ \u00d7${nextTotal} ]`;

    const countEl = document.getElementById('axiom-section-count');
    const boostEl = document.getElementById('axiom-section-boost');
    const reqEl   = document.getElementById('axiom-section-req');
    if (countEl) countEl.textContent =
      `count: ${gameState.axiomCount}`;
    if (boostEl) boostEl.textContent =
      gameState.axiomCount > 0 ? `boost: \u00d7${totalAxiomMult().toFixed(2)}` : 'boost: \u00d71.00';
    if (reqEl)   reqEl.textContent   = `req \u2265 ${fmt(req)}`;
  }

  // ── Theorem card ──
  const theoremBtn = document.getElementById('theorem-btn');
  if (theoremBtn) {
    const req        = theoremRequirement();
    const canTheorem = gameState.N.gte(req);
    const nextTotal  = totalTheoremMult(gameState.theoremCount + 1).toFixed(2);
    theoremBtn.disabled    = !canTheorem;
    theoremBtn.textContent = `theorem  [ \u00d7${nextTotal} ]`;

    const countEl = document.getElementById('theorem-section-count');
    const boostEl = document.getElementById('theorem-section-boost');
    const reqEl   = document.getElementById('theorem-section-req');
    if (countEl) countEl.textContent =
      `count: ${gameState.theoremCount}`;
    if (boostEl) boostEl.textContent =
      gameState.theoremCount > 0 ? `boost: \u00d7${totalTheoremMult().toFixed(2)}` : 'boost: \u00d71.00';
    if (reqEl)   reqEl.textContent   = `req \u2265 ${fmt(req)}`;
  }

  // Trigger rebuild when axiom section becomes visible
  if (!document.getElementById('axiom-section') && gameState.N.gte(axiomRequirement())) {
    gameState.domDirty = true;
  }
}

// ── Manual unlock display ─────────────────────────────────────────────────────

function updateManual() {
  const showPrestige  = gameState.N.gte(axiomRequirement())
    || gameState.axiomCount > 0
    || gameState.theoremCount >= 1;
  const showSequences = gameState.sequencesUnlocked;

  const secPrestige  = document.getElementById('manual-section-prestige');
  const secSequences = document.getElementById('manual-section-sequences');
  const secUnknown   = document.getElementById('manual-section-unknown');

  if (secPrestige)  secPrestige.style.display  = showPrestige  ? '' : 'none';
  if (secSequences) secSequences.style.display = showSequences ? '' : 'none';
  if (secUnknown)   secUnknown.style.display   = '';
}

// ── Main render entry ─────────────────────────────────────────────────────────

export function render() {
  const prod = computeProduction();

  document.getElementById('topbar-n').textContent    = 'N: ' + fmt(gameState.N);
  document.getElementById('topbar-rate').textContent = fmtRate(prod);

  if (gameState.domDirty) {
    gameState.domDirty = false;
    buildUpgradeDOM();
  }

  if (gameState.seqDomDirty) {
    gameState.seqDomDirty = false;
    buildSequencesDOM();
  }

  if (gameState.itDomDirty) {
    gameState.itDomDirty = false;
    buildIterationDOM();
  }

  updateCardText();

  const settingsPanel = document.getElementById('panel-settings');
  if (settingsPanel && settingsPanel.classList.contains('active')) {
    const pt = gameState.totalPlaytime;
    const h  = Math.floor(pt / 3600);
    const m  = Math.floor((pt % 3600) / 60);
    const s  = Math.floor(pt % 60);
    const el = document.getElementById('settings-playtime');
    if (el) el.textContent =
      `playtime: ${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }

  const seqPanel = document.getElementById('panel-sequences');
  if (seqPanel && seqPanel.classList.contains('active')) {
    updateSequencesText();
  }

  const manualPanel = document.getElementById('panel-manual');
  if (manualPanel && manualPanel.classList.contains('active')) {
    updateManual();
  }

  const iterPanel = document.getElementById('panel-iteration');
  if (iterPanel && iterPanel.classList.contains('active')) {
    updateIterationText();
  }

  const seqMult = gameState.sequencesUnlocked ? totalSeqMult() : 1;
  const seqDivider = document.getElementById('topbar-seq-divider');
  const seqEl = document.getElementById('topbar-seq');
  if (seqDivider && seqEl) {
    const show = seqMult > 1;
    seqDivider.style.display = show ? '' : 'none';
    seqEl.style.display = show ? '' : 'none';
    if (show) seqEl.textContent = 'seq \u00d7' + seqMult.toFixed(3);
  }
}
