// sequences.js — Sequence state, math functions, and actions.
// DOM rendering lives in sequences-ui.js.

import { gameState } from './state.js';
import { ARITHMETIC_SEQ, GEOMETRIC_SEQ, SEQ_RESET, REF, BASE_SCALING, COMPLETIONS_SOFTCAP } from './balance.js';

// ── State ─────────────────────────────────────────────────────────────────────

export const seqState = {
  activeId: 'arithmetic',
  slots: {
    arithmetic: { terms: 0, completions: 0 },
    geometric:  { terms: 0, completions: 0 },
    fibonacci:  { terms: 0, completions: 0 },
    prime:      { terms: 0, completions: 0 },
    taylor:     { terms: 0, completions: 0 },
  },
  vars: {
    arithmetic: { a: 0, d: 0 },
    geometric:  { a: 0, r: 0 },
    fibonacci:  { a: 0, b: 0 },
    prime:      { k: 0 },
    taylor:     { n: 0, x: 0 },
  },
  reservePts: 0,
  refPts:     0,
  refCount:   0,
  geoUpgrades: {
    baseScaling: { level: 0, unlocked: false },
  },
};

export const SEQ_TERMS_NEEDED = ARITHMETIC_SEQ.TERMS_PER_COMP;

function applyMultSoftcap(rawMult, thresholdMult) {
  if (rawMult <= thresholdMult) return rawMult;
  return thresholdMult + Math.pow(rawMult - thresholdMult, COMPLETIONS_SOFTCAP.K);
}

// ── Sequence definitions ──────────────────────────────────────────────────────

export const SEQ_DEFS = [
  {
    id: 'arithmetic', name: 'Arithmetic Sequence',
    formula: 'a,  a+d,  a+2d,  a+3d',
    latex:   'a,\\; a+d,\\; a+2d,\\; a+3d,\\; \\ldots',
    vars: ['a', 'd'], unlockThm: ARITHMETIC_SEQ.UNLOCK_THM,
  },
  {
    id: 'geometric',  name: 'Geometric Sequence',
    formula: 'a,  a\u00b7r,  a\u00b7r\u00b2,  a\u00b7r\u00b3',
    latex:   'a,\\; ar,\\; ar^2,\\; ar^3,\\; \\ldots',
    vars: ['a', 'r'], unlockThm: 5,
  },
  {
    id: 'fibonacci',  name: 'Fibonacci Sequence',
    formula: 'a,  b,  a+b,  a+2b, ...',
    latex:   'a,\\; b,\\; a+b,\\; a+2b,\\; \\ldots',
    vars: ['a', 'b'], unlockThm: 8,
  },
  {
    id: 'prime',      name: 'Prime Sequence',
    formula: '2,  3,  5,  7,  11, ...',
    latex:   '2,\\; 3,\\; 5,\\; 7,\\; 11,\\; \\ldots',
    vars: ['k'], unlockThm: 13,
  },
  {
    id: 'taylor',     name: 'Taylor Series',
    formula: '\u03a3 f\u207f(a)/n! \u00b7 (x\u2212a)\u207f',
    latex:   '\\displaystyle\\sum_{n=0}^{\\infty} \\frac{f^{(n)}(a)}{n!}(x-a)^n',
    vars: ['n', 'x'], unlockThm: 21,
  },
];

// ── Ref multiplier ────────────────────────────────────────────────────────────

export function refMult() {
  return seqState.refPts > 0 ? Math.pow(REF.MULT_BASE, seqState.refPts) : 1;
}

// ── Arithmetic math ───────────────────────────────────────────────────────────

export function arithmeticTermCost() {
  const { terms, completions } = seqState.slots.arithmetic;
  const totalTerms = completions * SEQ_TERMS_NEEDED + terms;
  return new Decimal(ARITHMETIC_SEQ.COST_BASE)
    .mul(new Decimal(ARITHMETIC_SEQ.COST_SCALE).pow(totalTerms));
}

// extraComps=0: current mult · extraComps=1: next completion preview
export function arithmeticCompletionsMult(dPts, extraComps = 0) {
  const rawComps = seqState.slots.arithmetic.completions + extraComps;
  if (rawComps <= 0) return 1;
  const step = ARITHMETIC_SEQ.MULT_STEP + (dPts || 0) * ARITHMETIC_SEQ.D_STEP_PER_PT;
  let rawMult = 1;
  for (let i = 1; i <= rawComps; i++) rawMult *= ARITHMETIC_SEQ.MULT_BASE + step * i;
  if (rawComps <= COMPLETIONS_SOFTCAP.THRESHOLD) return rawMult;
  let thresholdMult = 1;
  for (let i = 1; i <= COMPLETIONS_SOFTCAP.THRESHOLD; i++) thresholdMult *= ARITHMETIC_SEQ.MULT_BASE + step * i;
  return applyMultSoftcap(rawMult, thresholdMult);
}

// ── Geometric math ────────────────────────────────────────────────────────────

export function geometricTermCost() {
  const { terms, completions } = seqState.slots.geometric;
  const totalTerms = completions * GEOMETRIC_SEQ.TERMS_PER_COMP + terms;
  return new Decimal(GEOMETRIC_SEQ.COST_BASE)
    .mul(new Decimal(GEOMETRIC_SEQ.COST_SCALE).pow(totalTerms));
}

export function geometricRatio(rPts) {
  return GEOMETRIC_SEQ.BASE_R + (rPts || 0) * GEOMETRIC_SEQ.R_BOOST_PER_PT;
}

// aBoost defaults to base constant; pass effectiveGeoABoost() to include upgrade scaling.
export function geometricMult_at(aPts, rPts, comps, aBoost = GEOMETRIC_SEQ.A_BOOST_PER_PT) {
  const aMult = 1 + (aPts || 0) * aBoost;
  const ratio = geometricRatio(rPts);
  const rawMult = comps <= 0 ? aMult : aMult * Math.pow(ratio, comps);
  if (comps <= COMPLETIONS_SOFTCAP.THRESHOLD) return rawMult;
  const thresholdMult = aMult * Math.pow(ratio, COMPLETIONS_SOFTCAP.THRESHOLD);
  return applyMultSoftcap(rawMult, thresholdMult);
}

// Effective 'a' boost per pt, scaling with Base Scaling level × total geometric terms bought.
export function effectiveGeoABoost() {
  const level = seqState.geoUpgrades.baseScaling.level;
  if (level <= 0) return GEOMETRIC_SEQ.A_BOOST_PER_PT;
  const { terms, completions } = seqState.slots.geometric;
  const totalTerms = completions * GEOMETRIC_SEQ.TERMS_PER_COMP + terms;
  return GEOMETRIC_SEQ.A_BOOST_PER_PT * (1 + level * BASE_SCALING.TERM_RATE * totalTerms);
}

export function geoUpgradeCostAt(level) {
  return Math.ceil(BASE_SCALING.COST_BASE * Math.pow(BASE_SCALING.COST_SCALE, level));
}

// ── Unified sequence multiplier (used by production.js) ──────────────────────

export function totalSeqMult() {
  if (!gameState.sequencesUnlocked) return 1;
  let mult = 1;
  if (seqState.activeId === 'arithmetic') {
    const { a, d } = seqState.vars.arithmetic;
    mult = arithmeticCompletionsMult(d) * (1 + a * ARITHMETIC_SEQ.A_BOOST_PER_PT);
  } else if (seqState.activeId === 'geometric') {
    const { a, r } = seqState.vars.geometric;
    mult = geometricMult_at(a, r, seqState.slots.geometric.completions, effectiveGeoABoost());
  }
  return mult * refMult();
}

export function computeSeqPoints(N) {
  if (N.lt(SEQ_RESET.POINTS_BASE)) return 0;
  return Math.max(0, Math.floor(N.div(SEQ_RESET.POINTS_BASE).log10() / Math.log10(SEQ_RESET.POINTS_SCALE)));
}

// ── Actions ───────────────────────────────────────────────────────────────────

export function buyArithmeticTerm() {
  if (!gameState.sequencesUnlocked || seqState.activeId !== 'arithmetic') return;
  const slot = seqState.slots.arithmetic;
  const cost = arithmeticTermCost();
  if (gameState.N.lt(cost)) return;
  gameState.N = gameState.N.sub(cost);
  slot.terms++;
  if (slot.terms >= SEQ_TERMS_NEEDED) {
    slot.completions++;
    slot.terms = 0;
    gameState.seqDomDirty = true;
  }
}

export function buyGeometricTerm() {
  if (!gameState.sequencesUnlocked || seqState.activeId !== 'geometric') return;
  const slot = seqState.slots.geometric;
  const cost = geometricTermCost();
  if (gameState.N.lt(cost)) return;
  gameState.N = gameState.N.sub(cost);
  slot.terms++;
  if (slot.terms >= GEOMETRIC_SEQ.TERMS_PER_COMP) {
    slot.completions++;
    slot.terms = 0;
    gameState.seqDomDirty = true;
  }
}

export function reformulate() {
  if (seqState.activeId !== 'arithmetic') return;
  const currentAlloc = Object.values(seqState.vars.arithmetic).reduce((s, v) => s + v, 0);
  const totalPts = seqState.reservePts + currentAlloc;
  if (totalPts < GEOMETRIC_SEQ.REFORMULATE_COST) return;

  // Refund arithmetic alloc back to reserve, then deduct cost
  for (const k of Object.keys(seqState.vars.arithmetic)) {
    seqState.reservePts += seqState.vars.arithmetic[k];
    seqState.vars.arithmetic[k] = 0;
  }
  seqState.reservePts -= GEOMETRIC_SEQ.REFORMULATE_COST;
  seqState.slots.arithmetic = { terms: 0, completions: 0 };
  seqState.activeId = 'geometric';
  seqState.slots.geometric  = { terms: 0, completions: 0 };

  seqState.refCount++;
  seqState.refPts += seqState.refCount * REF.PTS_STEP;

  // Unlock Base Scaling on first reformulate; reset level on any reformulate.
  seqState.geoUpgrades.baseScaling.unlocked = true;
  seqState.geoUpgrades.baseScaling.level    = 0;

  gameState.seqDomDirty = true;
}

export function buyGeoUpgrade(id) {
  const upg = seqState.geoUpgrades[id];
  if (!upg || !upg.unlocked) return;
  const cost = geoUpgradeCostAt(upg.level);
  if (seqState.reservePts < cost) return;
  seqState.reservePts -= cost;
  upg.level++;
}

export function doSeqReset() {
  if (!gameState.sequencesUnlocked) return;
  const currentAlloc = Object.values(seqState.vars[seqState.activeId] || {}).reduce((s, v) => s + v, 0);
  const totalPts = seqState.reservePts + currentAlloc;
  const earned   = computeSeqPoints(gameState.N);
  seqState.reservePts += Math.min(earned, Math.max(0, SEQ_RESET.PTS_CAP - totalPts));

  gameState.N               = new Decimal(0);
  gameState.axiomCount      = 0;
  gameState.theoremCount    = 0;
  gameState.theoremUnlocked = false;
  for (const upg of gameState.upgrades) {
    upg.level = 0;
    if (upg.unlockCondition !== null) upg.unlocked = false;
  }

  gameState.domDirty    = true;
  gameState.seqDomDirty = true;
}

export function setActiveSequence(id) {
  if (seqState.activeId === id) return;
  const oldVars = seqState.vars[seqState.activeId];
  if (oldVars) {
    for (const v of Object.values(oldVars)) seqState.reservePts += v;
    for (const k of Object.keys(oldVars)) oldVars[k] = 0;
  }
  seqState.slots[seqState.activeId] = { terms: 0, completions: 0 };
  seqState.activeId = id;
  seqState.slots[id] = { terms: 0, completions: 0 };
  const newVars = seqState.vars[id];
  if (newVars) {
    for (const v of Object.values(newVars)) seqState.reservePts += v;
    for (const k of Object.keys(newVars)) newVars[k] = 0;
  }
  gameState.seqDomDirty = true;
}

export function resetSeqState({ keepPts = false } = {}) {
  if (!keepPts) {
    seqState.activeId = 'arithmetic';
    for (const id of Object.keys(seqState.slots)) seqState.slots[id] = { terms: 0, completions: 0 };
    for (const id of Object.keys(seqState.vars))
      for (const k of Object.keys(seqState.vars[id])) seqState.vars[id][k] = 0;
    seqState.reservePts = 0;
  }
}
