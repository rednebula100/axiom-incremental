// epoch.js — Epoch system: permanent one-time enhancements above ℐ layer.

import { gameState, epochState, iterState } from './state.js';
import { EPOCH, EPOCH3, SEQ_RESET } from './balance.js';
import { showConfirm } from './confirm.js';
import { orbitState } from './orbit.js';

// ── Math ──────────────────────────────────────────────────────────────────────

export function epoch1IterBoost() {
  if (!epochState.epoch1 || iterState.count <= 0) return 1;
  return Math.max(1, Math.pow(Math.log10(iterState.count + 1), EPOCH.E1_ITER_K));
}

// ── Action ────────────────────────────────────────────────────────────────────

export function buyEpoch1() {
  if (epochState.epoch1 || iterState.count < EPOCH.E1_COST) return;
  iterState.count -= EPOCH.E1_COST;
  epochState.epoch1 = true;
  epochState.dirty  = true;
  gameState.itDomDirty = true;
}

export function buyEpoch2() {
  if (!epochState.epoch1 || epochState.epoch2 || iterState.count < EPOCH.E2_COST) return;
  iterState.count -= EPOCH.E2_COST;
  epochState.epoch2 = true;
  epochState.dirty  = true;
  gameState.itDomDirty = true;
}

export function buyEpoch3() {
  if (!epochState.epoch2 || epochState.epoch3 || iterState.count < EPOCH3.COST) return;
  iterState.count -= EPOCH3.COST;
  epochState.epoch3 = true;
  epochState.dirty  = true;
  gameState.itDomDirty = true;
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls)                e.className   = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

// ── DOM Build ─────────────────────────────────────────────────────────────────

export function buildEpochDOM() {
  const col = document.getElementById('epoch-column');
  if (!col) return;
  col.innerHTML = '';

  col.appendChild(el('div', 'section-header', 'EPOCH'));

  const done = epochState.epoch1;

  // ── Epoch 1 card ──────────────────────────────────────────────────────────
  const card = el('div', 'epoch-card first-in-group' + (done ? ' epoch-card-done' : ''));

  const header = el('div', 'epoch-card-header');
  header.appendChild(el('span', 'epoch-card-num', 'epoch 1'));
  header.appendChild(done
    ? el('span', 'epoch-done-badge', 'active')
    : el('span', 'epoch-card-cost', 'cost  ' + EPOCH.E1_COST + ' ℐ'));
  card.appendChild(header);

  card.appendChild(el('div', 'epoch-divider'));

  if (!done) {
    // ── Pre-purchase: description rows + buy button ──────────────────────────
    const effList = el('div', 'epoch-effects');
    const effRows = [
      { name: 'sigma automation',                                              sub: 'subtab unlock', attr: null },
      { name: 'N production ×' + EPOCH.E1_FLAT_BOOST,                        sub: 'permanent',     attr: null },
      { name: 'ℐ boost',                                                      sub: null,            attr: 'epochIterBoostVal' },
      { name: 'reserve pts cap  ' + SEQ_RESET.PTS_CAP + ' → ' + EPOCH.E1_PTS_CAP, sub: null,      attr: null },
    ];
    for (const row of effRows) {
      const rowEl = el('div', 'epoch-effect-row');
      rowEl.appendChild(el('span', 'epoch-effect-dot', '·'));
      const body = el('div', 'epoch-effect-body');
      body.appendChild(el('span', 'epoch-effect-name', row.name));
      if (row.attr) {
        const valEl = el('span', 'epoch-effect-sub');
        valEl.dataset[row.attr] = '';
        body.appendChild(valEl);
      } else if (row.sub) {
        body.appendChild(el('span', 'epoch-effect-sub', row.sub));
      }
      rowEl.appendChild(body);
      effList.appendChild(rowEl);
    }
    card.appendChild(effList);
    card.appendChild(el('div', 'epoch-divider'));

    const btn = el('button', 'epoch-btn', '[ epoch 1 ]');
    btn.dataset.epochBtn = '';
    btn.addEventListener('click', () =>
      showConfirm('unlock epoch 1? costs 1 ℐ.', buyEpoch1));
    card.appendChild(btn);
  } else {
    // ── Post-purchase: collapsible effect list ───────────────────────────────
    const msRows = [
      { label: 'sigma automation', val: 'active',                   valAttr: null },
      { label: 'N production',      val: '×' + EPOCH.E1_FLAT_BOOST, valAttr: null },
      { label: 'ℐ boost',           val: '',                         valAttr: 'epochIterBoostVal' },
      { label: 'reserve pts cap',   val: String(EPOCH.E1_PTS_CAP),  valAttr: null },
    ];

    const toggle = el('div', 'epoch-ms-toggle');
    const arrow  = el('span', 'epoch-ms-arrow', '▸');
    toggle.appendChild(arrow);
    toggle.appendChild(el('span', null, msRows.length + ' effects  ·  permanent'));

    const drawer = el('div', 'epoch-ms-drawer');
    msRows.forEach((row, i) => {
      const rowEl = el('div', 'epoch-ms-row' + (i === 0 ? ' first-in-group' : ''));
      rowEl.appendChild(el('span', 'epoch-ms-indicator', '✦'));
      rowEl.appendChild(el('span', 'epoch-ms-name', row.label));
      const valEl = el('span', 'epoch-ms-val', row.val);
      if (row.valAttr) valEl.dataset[row.valAttr] = '';
      rowEl.appendChild(valEl);
      drawer.appendChild(rowEl);
    });

    toggle.addEventListener('click', () => {
      const open = card.classList.toggle('epoch-ms-open');
      arrow.textContent = open ? '▾' : '▸';
    });

    card.appendChild(toggle);
    card.appendChild(drawer);
  }

  col.appendChild(card);

  // ── Epoch 2 card ──────────────────────────────────────────────────────────
  const e2done   = epochState.epoch2;
  const e2avail  = epochState.epoch1 && !e2done;
  const e2locked = !epochState.epoch1;

  const e2card = el('div', 'epoch-card' +
    (e2done   ? ' epoch-card-done'   : '') +
    (e2locked ? ' epoch-card-locked' : ''));

  const e2header = el('div', 'epoch-card-header');
  e2header.appendChild(el('span', 'epoch-card-num', 'epoch 2'));
  if (e2done) {
    e2header.appendChild(el('span', 'epoch-done-badge', 'active'));
  } else if (e2avail) {
    e2header.appendChild(el('span', 'epoch-card-cost', 'cost  ' + EPOCH.E2_COST + ' ℐ'));
  } else {
    e2header.appendChild(el('span', 'epoch-locked-label', 'locked'));
  }
  e2card.appendChild(e2header);

  if (!e2locked) {
    e2card.appendChild(el('div', 'epoch-divider'));

    const e2effRows = [
      { name: 'orbit',              sub: 'subtab unlock'           },
      { name: 'N production ×' + EPOCH.E2_N_BOOST, sub: 'permanent' },
      { name: 'pts ×' + EPOCH.E2_PTS_MULT,          sub: 'per seq reset' },
    ];

    if (!e2done) {
      const effList = el('div', 'epoch-effects');
      for (const row of e2effRows) {
        const rowEl = el('div', 'epoch-effect-row');
        rowEl.appendChild(el('span', 'epoch-effect-dot', '·'));
        const body = el('div', 'epoch-effect-body');
        body.appendChild(el('span', 'epoch-effect-name', row.name));
        body.appendChild(el('span', 'epoch-effect-sub', row.sub));
        rowEl.appendChild(body);
        effList.appendChild(rowEl);
      }
      e2card.appendChild(effList);
      e2card.appendChild(el('div', 'epoch-divider'));

      const e2btn = el('button', 'epoch-btn', '[ epoch 2 ]');
      e2btn.dataset.epoch2Btn = '';
      e2btn.addEventListener('click', () =>
        showConfirm('unlock epoch 2? costs ' + EPOCH.E2_COST + ' ℐ.', buyEpoch2));
      e2card.appendChild(e2btn);
    } else {
      const msRows = [
        { label: 'orbit',       val: 'active'                 },
        { label: 'N production', val: '×' + EPOCH.E2_N_BOOST  },
        { label: 'pts earned',   val: '×' + EPOCH.E2_PTS_MULT },
      ];
      const toggle = el('div', 'epoch-ms-toggle');
      const arrow  = el('span', 'epoch-ms-arrow', '▸');
      toggle.appendChild(arrow);
      toggle.appendChild(el('span', null, msRows.length + ' effects  ·  permanent'));

      const drawer = el('div', 'epoch-ms-drawer');
      msRows.forEach((row, i) => {
        const rowEl = el('div', 'epoch-ms-row' + (i === 0 ? ' first-in-group' : ''));
        rowEl.appendChild(el('span', 'epoch-ms-indicator', '✦'));
        rowEl.appendChild(el('span', 'epoch-ms-name', row.label));
        rowEl.appendChild(el('span', 'epoch-ms-val', row.val));
        drawer.appendChild(rowEl);
      });

      toggle.addEventListener('click', () => {
        const open = e2card.classList.toggle('epoch-ms-open');
        arrow.textContent = open ? '▾' : '▸';
      });

      e2card.appendChild(toggle);
      e2card.appendChild(drawer);
    }
  }

  col.appendChild(e2card);

  // ── Epoch 3 card ──────────────────────────────────────────────────────────
  const e3done   = epochState.epoch3;
  const e3locked = !epochState.epoch2;

  const e3card = el('div', 'epoch-card' +
    (e3done   ? ' epoch-card-done'   : '') +
    (e3locked ? ' epoch-card-locked' : ''));

  const e3header = el('div', 'epoch-card-header');
  e3header.appendChild(el('span', 'epoch-card-num', 'epoch 3'));
  if (e3done) {
    e3header.appendChild(el('span', 'epoch-done-badge', 'active'));
  } else if (!e3locked) {
    e3header.appendChild(el('span', 'epoch-card-cost', 'cost  ' + EPOCH3.COST + ' ℐ'));
  } else {
    e3header.appendChild(el('span', 'epoch-locked-label', 'locked'));
  }
  e3card.appendChild(e3header);

  if (!e3locked) {
    e3card.appendChild(el('div', 'epoch-divider'));

    if (!e3done) {
      const effList = el('div', 'epoch-effects');
      const e3effRows = [
        { name: 'exponentiation cost', sub: '×(1/log₁₀(ℐ+1)^' + EPOCH3.EXP_COST_K + ')' },
        { name: 'sigma slot +1',        sub: '3 → 4' },
        { name: 'τ self-boost',    sub: '×(τ+1)^' + EPOCH3.TAU_SELF_K },
      ];
      for (const row of e3effRows) {
        const rowEl = el('div', 'epoch-effect-row');
        rowEl.appendChild(el('span', 'epoch-effect-dot', '·'));
        const body = el('div', 'epoch-effect-body');
        body.appendChild(el('span', 'epoch-effect-name', row.name));
        body.appendChild(el('span', 'epoch-effect-sub', row.sub));
        rowEl.appendChild(body);
        effList.appendChild(rowEl);
      }
      e3card.appendChild(effList);
      e3card.appendChild(el('div', 'epoch-divider'));

      const e3btn = el('button', 'epoch-btn', '[ epoch 3 ]');
      e3btn.dataset.epoch3Btn = '';
      e3btn.addEventListener('click', () =>
        showConfirm('unlock epoch 3? costs ' + EPOCH3.COST + ' ℐ.', buyEpoch3));
      e3card.appendChild(e3btn);
    } else {
      const msRows = [
        { label: 'exponentiation cost', val: '', valAttr: 'epoch3ExpCostVal' },
        { label: 'sigma slots',          val: '4 active' },
        { label: 'τ self-boost',         val: '', valAttr: 'epoch3TauBoostVal' },
      ];
      const toggle = el('div', 'epoch-ms-toggle');
      const arrow  = el('span', 'epoch-ms-arrow', '▸');
      toggle.appendChild(arrow);
      toggle.appendChild(el('span', null, msRows.length + ' effects  ·  permanent'));

      const drawer = el('div', 'epoch-ms-drawer');
      msRows.forEach((row, i) => {
        const rowEl = el('div', 'epoch-ms-row' + (i === 0 ? ' first-in-group' : ''));
        rowEl.appendChild(el('span', 'epoch-ms-indicator', '✦'));
        rowEl.appendChild(el('span', 'epoch-ms-name', row.label));
        const valEl = el('span', 'epoch-ms-val', row.val || '');
        if (row.valAttr) valEl.dataset[row.valAttr] = '';
        rowEl.appendChild(valEl);
        drawer.appendChild(rowEl);
      });

      toggle.addEventListener('click', () => {
        const open = e3card.classList.toggle('epoch-ms-open');
        arrow.textContent = open ? '▾' : '▸';
      });

      e3card.appendChild(toggle);
      e3card.appendChild(drawer);
    }
  }

  col.appendChild(e3card);
}

// ── Per-frame update ──────────────────────────────────────────────────────────

export function updateEpochText() {
  const epochCol = document.getElementById('epoch-column');
  if (epochCol) epochCol.style.display = (epochState.epoch1 || iterState.count > 0) ? '' : 'none';

  const sigmaTab = document.querySelector('[data-iter-subtab="sigma"]');
  if (sigmaTab) sigmaTab.style.display = epochState.epoch1 ? '' : 'none';

  const orbitTab = document.querySelector('[data-iter-subtab="orbit"]');
  if (orbitTab) orbitTab.style.display = epochState.epoch2 ? '' : 'none';

  const boostEl = document.querySelector('[data-epoch-iter-boost-val]');
  if (boostEl) {
    const boost = epoch1IterBoost();
    boostEl.textContent = epochState.epoch1
      ? '×' + boost.toFixed(3)
      : 'log10(ℐ+1)^' + EPOCH.E1_ITER_K + '  ·  ×' + boost.toFixed(3);
  }

  const btnEl = document.querySelector('[data-epoch-btn]');
  if (btnEl) btnEl.disabled = iterState.count < EPOCH.E1_COST;

  const btn2El = document.querySelector('[data-epoch2-btn]');
  if (btn2El) btn2El.disabled = iterState.count < EPOCH.E2_COST;

  const btn3El = document.querySelector('[data-epoch3-btn]');
  if (btn3El) btn3El.disabled = iterState.count < EPOCH3.COST;

  const exp3El = document.querySelector('[data-epoch3-exp-cost-val]');
  if (exp3El) {
    const reducer = iterState.count > 0
      ? Math.min(1, 1 / Math.pow(Math.log10(iterState.count + 1), EPOCH3.EXP_COST_K))
      : 1;
    exp3El.textContent = '×' + reducer.toFixed(3);
  }

  const tau3El = document.querySelector('[data-epoch3-tau-boost-val]');
  if (tau3El) {
    const boost = Math.pow(orbitState.tau + 1, EPOCH3.TAU_SELF_K);
    tau3El.textContent = '×(τ+1)^' + EPOCH3.TAU_SELF_K + '  ·  ×' + boost.toFixed(3);
  }
}
