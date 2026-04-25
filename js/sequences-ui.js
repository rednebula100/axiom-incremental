// sequences-ui.js — DOM building and per-frame updates for the Sequences tab.
// Pure logic (state, math, actions) lives in sequences.js.

import { gameState, reservePtsCap } from './state.js';
import { showConfirm } from './confirm.js';
import { fmt } from './format.js';
import { ARITHMETIC_SEQ, GEOMETRIC_SEQ, COMPLETIONS_SOFTCAP } from './balance.js';
import { save } from './save.js';
import { sigmaState } from './sigma-automation.js';
import {
  seqState, SEQ_TERMS_NEEDED, SEQ_DEFS,
  arithmeticTermCost, arithmeticCompletionsMult,
  geometricTermCost, geometricRatio, geometricMult_at,
  computeSeqPoints, refMult,
  buyArithmeticTerm, buyGeometricTerm, reformulate, doSeqReset,
  effectiveGeoABoost, geoUpgradeCostAt, buyGeoUpgrade,
} from './sequences.js';

// ── Geo upgrade icon ──────────────────────────────────────────────────────────

const BASE_SCALING_ICON = `<svg width="36" height="36" viewBox="0 0 36 36" xmlns="http://www.w3.org/2000/svg">
  <line x1="8"  y1="28" x2="8"  y2="22" stroke="#666" stroke-width="2"/>
  <line x1="15" y1="28" x2="15" y2="18" stroke="#666" stroke-width="2"/>
  <line x1="22" y1="28" x2="22" y2="13" stroke="#666" stroke-width="2"/>
  <line x1="29" y1="28" x2="29" y2="8"  stroke="#666" stroke-width="2"/>
  <line x1="5"  y1="28" x2="32" y2="28" stroke="#555" stroke-width="1.2"/>
</svg>`;

function geoUpgDesc(level) {
  if (level === 0) return 'a boost scales with geometric terms purchased';
  const { terms, completions } = seqState.slots.geometric;
  const totalTerms = completions * GEOMETRIC_SEQ.TERMS_PER_COMP + terms;
  const mult = effectiveGeoABoost() / GEOMETRIC_SEQ.A_BOOST_PER_PT;
  return `a boost \u00d7${mult.toFixed(3)}  [${totalTerms} terms]`;
}

// ── DOM helper ────────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)                e.className   = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function renderFormula(container, latex, fallback) {
  if (window.katex) {
    try { katex.render(latex, container, { throwOnError: false, displayMode: true }); return; }
    catch (_) {}
  }
  container.textContent = fallback;
}

// ── Slider handler (live, no apply button) ────────────────────────────────────

function onVarSlider(key, sliderEl) {
  const vars         = seqState.vars[seqState.activeId];
  const currentAlloc = Object.values(vars).reduce((s, v) => s + v, 0);
  const totalAvail   = seqState.reservePts + currentAlloc;
  const othersTotal  = currentAlloc - vars[key];
  const newVal       = Math.min(parseInt(sliderEl.value, 10) || 0, totalAvail - othersTotal);
  vars[key]          = newVal;
  seqState.reservePts   = totalAvail - othersTotal - newVal;
  sliderEl.value     = String(newVal);
}

// ── DOM Build ─────────────────────────────────────────────────────────────────

export function buildSequencesDOM() {
  const col = document.getElementById('sequences-column');
  if (!col) return;
  col.innerHTML = '';

  const activeId     = seqState.activeId;
  const activeDef    = SEQ_DEFS.find(d => d.id === activeId) || SEQ_DEFS[0];
  const vars         = seqState.vars[activeId] || {};
  const varKeys      = Object.keys(vars);
  const currentAlloc = Object.values(vars).reduce((s, v) => s + v, 0);
  const totalPts     = seqState.reservePts + currentAlloc;

  // ── 1. Sequence Reset card ──
  col.appendChild(el('div', 'section-header', 'SEQUENCE RESET'));

  const resetCard = el('div', 'seq-panel-card first-in-group');
  resetCard.appendChild(el('div', 'seq-panel-label seq-reset-warning',
    'resets run (N, axioms, upgrades, theorems)  \u00b7  earns sequence points'));

  const ptsPreview = el('div', 'seq-pts-preview'); ptsPreview.dataset.seqPtsPreview = '';
  resetCard.appendChild(ptsPreview);

  const ptsCapRow   = el('div', 'seq-pts-cap-row');
  const ptsCapLabel = el('span', 'seq-ref-label', 'reserve');
  const ptsCapWrap  = el('div', 'seq-pts-cap-bar-wrap');
  const ptsCapFill  = el('div', 'seq-pts-cap-bar-fill'); ptsCapFill.dataset.ptsCapFill = '';
  ptsCapWrap.appendChild(ptsCapFill);
  const ptsCapCount = el('span', 'seq-pts-cap-count'); ptsCapCount.dataset.ptsCapCount = '';
  ptsCapRow.appendChild(ptsCapLabel);
  ptsCapRow.appendChild(ptsCapWrap);
  ptsCapRow.appendChild(ptsCapCount);
  resetCard.appendChild(ptsCapRow);

  const seqResetBtn = el('button', 'seq-panel-btn', 'sequence reset');
  seqResetBtn.id = 'seq-reset-btn';
  seqResetBtn.addEventListener('click', () => showConfirm('perform sequence reset?', () => { doSeqReset(); sigmaState.elapsed = 0; sigmaState.currentSlot = 0; save(); }));
  resetCard.appendChild(seqResetBtn);

  col.appendChild(resetCard);

  if (totalPts === 0) return;

  // ── 2. Formula card ──
  col.appendChild(el('div', 'section-header seq-section-gap', activeDef.name.toUpperCase()));

  const card = el('div', 'seq-formula-card first-in-group');

  const formulaBox = el('div', 'seq-formula-box');
  renderFormula(formulaBox, activeDef.latex, activeDef.formula);
  card.appendChild(formulaBox);

  // Variable sliders
  const varsSection = el('div', 'seq-vars-section');
  const freeRow = el('div', 'seq-var-free-row');
  const freeEl  = el('span', 'seq-var-free', ''); freeEl.dataset.seqFree = '';
  freeRow.appendChild(freeEl);
  varsSection.appendChild(freeRow);

  for (const key of varKeys) {
    const row    = el('div', 'seq-var-row');
    const valPts = el('span', 'seq-var-val-pts', vars[key] + ' pts');
    valPts.dataset.seqSliderVal = key;

    const slider = el('input', 'seq-var-slider');
    slider.type  = 'range';
    slider.min   = '0';
    slider.max   = String(totalPts);
    slider.value = String(vars[key]);
    slider.dataset.seqSlider = key;
    slider.addEventListener('input', () => onVarSlider(key, slider));

    const effEl = el('span', 'seq-var-effect', ''); effEl.dataset.varEff = key;

    row.appendChild(el('span', 'seq-var-letter', key));
    row.appendChild(valPts);
    row.appendChild(slider);
    row.appendChild(effEl);
    varsSection.appendChild(row);
  }
  card.appendChild(varsSection);

  card.appendChild(el('div', 'seq-card-divider'));

  // Controls
  const controls = el('div', 'seq-card-controls');
  const topRow   = el('div', 'seq-controls-top');

  const progEl = el('div', 'seq-progress'); progEl.dataset.seqProg = activeId;
  topRow.appendChild(progEl);

  if (activeId === 'arithmetic') {
    const buyBtn = el('button', 'seq-btn', 'buy term');
    buyBtn.dataset.seqBtn = 'arithmetic';
    buyBtn.addEventListener('click', buyArithmeticTerm);
    topRow.appendChild(buyBtn);
  } else if (activeId === 'geometric') {
    const buyBtn = el('button', 'seq-btn', 'buy term');
    buyBtn.dataset.seqBtn = 'geometric';
    buyBtn.addEventListener('click', buyGeometricTerm);
    topRow.appendChild(buyBtn);
  }

  controls.appendChild(topRow);
  const statsEl = el('div', 'seq-stats'); statsEl.dataset.seqStats = activeId;
  controls.appendChild(statsEl);
  card.appendChild(controls);
  col.appendChild(card);

  // ── 3. Geometric upgrades (only when geometric is active and unlocked) ──
  if (activeId === 'geometric' && seqState.geoUpgrades.baseScaling.unlocked) {
    col.appendChild(el('div', 'section-header seq-section-gap', 'GEOMETRIC UPGRADES'));

    const upgCard = el('div', 'upgrade-card first-in-group');
    upgCard.dataset.geoUpg = 'baseScaling';

    const iconDiv = el('div', 'upgrade-icon');
    iconDiv.innerHTML = BASE_SCALING_ICON;

    const info = el('div', 'upgrade-info');
    const nameRow = el('div', 'upgrade-name');
    const lvlBadge = el('span', 'level-badge');
    lvlBadge.dataset.geoUpgLvl = 'baseScaling';
    lvlBadge.textContent = 'lv.' + seqState.geoUpgrades.baseScaling.level;
    nameRow.textContent = 'Base Scaling ';
    nameRow.appendChild(lvlBadge);

    const desc = el('div', 'upgrade-desc');
    desc.dataset.geoUpgDesc = 'baseScaling';
    desc.textContent = geoUpgDesc(seqState.geoUpgrades.baseScaling.level);

    info.appendChild(nameRow);
    info.appendChild(desc);

    const right = el('div', 'upgrade-right');
    const costEl = el('div', 'upgrade-cost');
    costEl.dataset.geoUpgCost = 'baseScaling';
    const btn = el('button', 'buy-btn');
    btn.dataset.geoUpgBtn = 'baseScaling';
    btn.textContent = 'buy';
    btn.addEventListener('click', () => buyGeoUpgrade('baseScaling'));
    right.appendChild(costEl);
    right.appendChild(btn);

    upgCard.appendChild(iconDiv);
    upgCard.appendChild(info);
    upgCard.appendChild(right);
    col.appendChild(upgCard);
  }

  // ── 4. Reformulate card (bottom) ──
  if (activeId === 'arithmetic' || activeId === 'geometric') {
    const isArith = activeId === 'arithmetic';
    const rfCost  = isArith ? GEOMETRIC_SEQ.REFORMULATE_COST : GEOMETRIC_SEQ.NEXT_REFORMULATE_COST;
    const rfFrom  = isArith ? 'Arithmetic Sequence' : 'Geometric Sequence';
    const rfTo    = isArith ? 'Geometric Sequence'  : 'Polynomial Sequence';
    const rfInfo  = `costs ${rfCost} pts \u00b7 completions reset \u00b7 the sequence is redefined`;

    col.appendChild(el('div', 'section-header seq-section-gap', 'REFORMULATE'));

    const refCard = el('div', 'seq-reformulate-card first-in-group');

    const refRow    = el('div', 'seq-ref-row');
    const refLabel  = el('span', 'seq-ref-label', 'reserve');
    const refWrap   = el('div',  'seq-ref-bar-wrap');
    const refFill   = el('div',  'seq-ref-bar-fill'); refFill.dataset.refFill = '';
    refWrap.appendChild(refFill);
    const refCountEl = el('span', 'seq-ref-count'); refCountEl.dataset.refCount = '';
    refRow.appendChild(refLabel);
    refRow.appendChild(refWrap);
    refRow.appendChild(refCountEl);
    refCard.appendChild(refRow);

    refCard.appendChild(el('div', 'seq-reformulate-info', rfInfo));

    if (isArith) {
      refCard.appendChild(el('div', 'seq-reformulate-unlock-hint', '\u25b8 unlocks Base Scaling upgrade'));
    }

    const refDisplay = el('div', 'seq-ref-display'); refDisplay.dataset.seqRefDisplay = '';
    refCard.appendChild(refDisplay);

    refCard.appendChild(el('div', 'seq-reformulate-target', `${rfFrom}  \u2192  ${rfTo}`));

    const refBtn = el('button', 'seq-reformulate-btn', '[ reformulate ]');
    refBtn.dataset.reformulateBtn = '';
    if (isArith) refBtn.addEventListener('click', reformulate);
    else         refBtn.disabled = true;
    refCard.appendChild(refBtn);

    col.appendChild(refCard);
  }
}

// ── Per-frame update ──────────────────────────────────────────────────────────

export function updateSequencesText() {
  const col = document.getElementById('sequences-column');
  if (!col) return;

  const activeId     = seqState.activeId;
  const activeVars   = seqState.vars[activeId] || {};
  const currentAlloc = Object.values(activeVars).reduce((s, v) => s + v, 0);
  const totalPts     = seqState.reservePts + currentAlloc;

  // Free pts display
  const freeEl = col.querySelector('[data-seq-free]');
  if (freeEl) {
    freeEl.textContent = `reserve: ${seqState.reservePts} pts  \u00b7  total: ${totalPts} pts`;
    freeEl.className   = 'seq-var-free' + (seqState.reservePts > 0 ? ' pts-avail' : '');
  }

  // Slider maxes
  col.querySelectorAll('[data-seq-slider]').forEach(slider => {
    const key  = slider.dataset.seqSlider;
    slider.max = String(seqState.reservePts + (activeVars[key] || 0));
    const valEl = col.querySelector(`[data-seq-slider-val="${key}"]`);
    if (valEl) valEl.textContent = (activeVars[key] || 0) + ' pts';
  });

  // Variable effects
  if (activeId === 'arithmetic') {
    const { a, d } = seqState.vars.arithmetic;
    const aEl = col.querySelector('[data-var-eff="a"]');
    const dEl = col.querySelector('[data-var-eff="d"]');
    if (aEl) aEl.textContent = `\u00d7${(1 + a * ARITHMETIC_SEQ.A_BOOST_PER_PT).toFixed(2)} base`;
    if (dEl) dEl.textContent = `step ${(ARITHMETIC_SEQ.MULT_STEP + d * ARITHMETIC_SEQ.D_STEP_PER_PT).toFixed(3)}`;
  } else if (activeId === 'geometric') {
    const { a, r } = seqState.vars.geometric;
    const aEl = col.querySelector('[data-var-eff="a"]');
    const rEl = col.querySelector('[data-var-eff="r"]');
    if (aEl) aEl.textContent = `\u00d7${(1 + a * effectiveGeoABoost()).toFixed(2)} base`;
    if (rEl) rEl.textContent = `ratio ${geometricRatio(r).toFixed(3)}`;
  }

  // Progress blocks
  const progEl = col.querySelector('[data-seq-prog]');
  if (progEl) {
    const termsPerComp = activeId === 'geometric' ? GEOMETRIC_SEQ.TERMS_PER_COMP : SEQ_TERMS_NEEDED;
    const terms = seqState.slots[activeId]?.terms ?? 0;
    progEl.innerHTML = '';
    const blocks = el('div', 'seq-blocks');
    for (let i = 0; i < termsPerComp; i++)
      blocks.appendChild(el('span', 'seq-block' + (i < terms ? ' filled' : '')));
    progEl.appendChild(blocks);
    progEl.appendChild(el('span', 'seq-prog-count', terms + ' / ' + termsPerComp));
  }

  // Stats
  const statsEl = col.querySelector('[data-seq-stats]');
  if (statsEl) {
    statsEl.innerHTML = '';
    let rows = [];

    if (activeId === 'arithmetic') {
      const { a, d } = seqState.vars.arithmetic;
      const cost    = arithmeticTermCost();
      const comps   = seqState.slots.arithmetic.completions;
      const capped  = comps >= COMPLETIONS_SOFTCAP.THRESHOLD;
      const curMult = arithmeticCompletionsMult(d)    * (1 + a * ARITHMETIC_SEQ.A_BOOST_PER_PT);
      const nxtMult = arithmeticCompletionsMult(d, 1) * (1 + a * ARITHMETIC_SEQ.A_BOOST_PER_PT);
      rows = [
        { label: 'completions', val: String(comps) },
        { label: 'mult',        val: '\u00d7' + fmt(curMult) + (capped ? '  \u00b7 softcapped' : ''), softcap: capped },
        { label: 'next',        val: '\u00d7' + fmt(nxtMult) },
        { label: 'cost',        val: fmt(cost) + ' N', dim: !gameState.N.gte(cost) },
      ];
    } else if (activeId === 'geometric') {
      const { a, r } = seqState.vars.geometric;
      const cost    = geometricTermCost();
      const comps   = seqState.slots.geometric.completions;
      const capped  = comps >= COMPLETIONS_SOFTCAP.THRESHOLD;
      const curMult = geometricMult_at(a, r, comps);
      const nxtMult = geometricMult_at(a, r, comps + 1);
      rows = [
        { label: 'completions', val: String(comps) },
        { label: 'mult',        val: '\u00d7' + fmt(curMult) + (capped ? '  \u00b7 softcapped' : ''), softcap: capped },
        { label: 'next',        val: '\u00d7' + fmt(nxtMult) },
        { label: 'ratio',       val: geometricRatio(r).toFixed(3) },
        { label: 'cost',        val: fmt(cost) + ' N', dim: !gameState.N.gte(cost) },
      ];
    }

    for (const r of rows) {
      const row = el('div', 'seq-stat-row');
      row.appendChild(el('span', 'seq-stat-label', r.label));
      const valCls = 'seq-stat-val' + (r.dim ? ' cannot-afford' : '') + (r.softcap ? ' softcapped' : '');
      row.appendChild(el('span', valCls, r.val));
      statsEl.appendChild(row);
    }
  }

  // Buy button disabled state
  const arithBuy = col.querySelector('[data-seq-btn="arithmetic"]');
  if (arithBuy) arithBuy.disabled = gameState.N.lt(arithmeticTermCost());
  const geomBuy = col.querySelector('[data-seq-btn="geometric"]');
  if (geomBuy) geomBuy.disabled = gameState.N.lt(geometricTermCost());

  // Reformulate card
  const refBtn = col.querySelector('[data-reformulate-btn]');
  if (refBtn) {
    const activeCost = activeId === 'arithmetic'
      ? GEOMETRIC_SEQ.REFORMULATE_COST
      : GEOMETRIC_SEQ.NEXT_REFORMULATE_COST;
    refBtn.disabled = totalPts < activeCost;
  }

  const refFill    = col.querySelector('[data-ref-fill]');
  const refCountEl = col.querySelector('[data-ref-count]');
  if (refFill && refCountEl) {
    const cost  = activeId === 'arithmetic'
      ? GEOMETRIC_SEQ.REFORMULATE_COST
      : GEOMETRIC_SEQ.NEXT_REFORMULATE_COST;
    const ready = totalPts >= cost;
    const pct   = Math.min(100, (totalPts / cost) * 100).toFixed(2);
    refFill.style.width  = pct + '%';
    refFill.className    = 'seq-ref-bar-fill' + (ready ? ' ref-ready' : '');
    refCountEl.textContent = `${totalPts} / ${cost} pts`;
    refCountEl.className   = 'seq-ref-count'  + (ready ? ' ref-ready' : '');
  }

  // Reset card
  const previewEl = col.querySelector('[data-seq-pts-preview]');
  if (previewEl) previewEl.textContent = `current N: ${fmt(gameState.N)}   \u2192   +${computeSeqPoints(gameState.N, totalPts)} pts`;
  const ptsCapFill  = col.querySelector('[data-pts-cap-fill]');
  const ptsCapCount = col.querySelector('[data-pts-cap-count]');
  if (ptsCapFill && ptsCapCount) {
    const cap   = reservePtsCap();
    const atCap = totalPts >= cap;
    ptsCapFill.style.width = Math.min(100, (totalPts / cap) * 100).toFixed(2) + '%';
    ptsCapFill.className   = 'seq-pts-cap-bar-fill' + (atCap ? ' pts-cap-full' : '');
    ptsCapCount.textContent = `${totalPts} / ${cap} pts`;
    ptsCapCount.className   = 'seq-pts-cap-count'  + (atCap ? ' pts-cap-full' : '');
  }

  const refDisplayEl = col.querySelector('[data-seq-ref-display]');
  if (refDisplayEl) {
    if (seqState.refCount > 0) {
      refDisplayEl.textContent = `ref: ${seqState.refPts} pts  \u00b7  mult: \u00d7${fmt(refMult())}`;
      refDisplayEl.style.display = '';
    } else {
      refDisplayEl.style.display = 'none';
    }
  }

  const seqResetBtn = document.getElementById('seq-reset-btn');
  if (seqResetBtn) seqResetBtn.disabled = computeSeqPoints(gameState.N, totalPts) === 0 || totalPts >= reservePtsCap();

  // Geo upgrade card (only present when geometric active + unlocked)
  const geoUpgCard = col.querySelector('[data-geo-upg="baseScaling"]');
  if (geoUpgCard) {
    const level    = seqState.geoUpgrades.baseScaling.level;
    const cost     = geoUpgradeCostAt(level);
    const canBuy   = seqState.reservePts >= cost;

    const costEl = geoUpgCard.querySelector('[data-geo-upg-cost="baseScaling"]');
    if (costEl) {
      costEl.textContent = cost + ' pts';
      costEl.className   = 'upgrade-cost' + (canBuy ? '' : ' cannot-afford');
    }
    const btnEl = geoUpgCard.querySelector('[data-geo-upg-btn="baseScaling"]');
    if (btnEl) btnEl.disabled = !canBuy;
    const descEl = geoUpgCard.querySelector('[data-geo-upg-desc="baseScaling"]');
    if (descEl) descEl.textContent = geoUpgDesc(level);
    const lvlEl = geoUpgCard.querySelector('[data-geo-upg-lvl="baseScaling"]');
    if (lvlEl) lvlEl.textContent = 'lv.' + level;
  }
}
