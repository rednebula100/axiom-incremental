// All upgrade definitions and shared game state live here.
// Decimal is a global set by break_infinity before any module evaluates.

import {
  SUCCESSOR, ADDITION, MULTIPLICATION, EXPONENTIATION,
  AXIOM, THEOREM, SIGMA, ARITHMETIC_SEQ, ITER,
} from './balance.js';

export const upgradeDefs = [
  {
    id: 'successor',
    name: 'Successor',
    // n → n+1 : each level permanently adds +1 N/s to the base
    descTemplate: (lvl) =>
      lvl === 0 ? 'n \u2192 n+1 \u2003 adds +1 N/s per level' : `base +${lvl} N/s`,
    costFn: (lvl) => new Decimal(SUCCESSOR.COST_BASE).mul(new Decimal(SUCCESSOR.COST_SCALE).pow(lvl)),
    effectFlat: (lvl) => new Decimal(lvl),
    level: 0,
    unlocked: true,
    unlockCondition: null,
    iconId: 'icon-successor',
  },
  {
    id: 'addition',
    name: 'Addition',
    // n + n : provides base A = (lvl+1)^EXP, which Multiplication will exponentiate
    // Production × A^M  (Multiplication determines M)
    descTemplate: (lvl) =>
      lvl === 0
        ? 'n + n \u2003 A = (lvl+1)^exp \u2003 [base for \u00d7]'
        : `A = ${Math.pow(lvl + 1, ADDITION.EFFECT_EXP).toFixed(3)}`,
    costFn: (lvl) => new Decimal(ADDITION.COST_BASE).mul(new Decimal(ADDITION.COST_SCALE).pow(lvl)),
    effectBase: (lvl) => Math.pow(lvl + 1, ADDITION.EFFECT_EXP),
    level: 0,
    unlocked: false,
    unlockCondition: (state) => state.upgrades[0].level >= ADDITION.UNLOCK_AT_SUCC,
    iconId: 'icon-addition',
  },
  {
    id: 'multiplication',
    name: 'Multiplication',
    // n × n : exponent M applied to Addition's base A → production × A^M
    // M = 1 + log10(lvl+1) * COEFF
    descTemplate: (lvl) =>
      lvl === 0
        ? 'n \u00d7 n \u2003 A^M \u2003 [exp for Addition]'
        : `M = ${(1 + Math.log10(lvl + 1) * MULTIPLICATION.EFFECT_COEFF).toFixed(3)}`,
    costFn: (lvl) => new Decimal(MULTIPLICATION.COST_BASE).mul(new Decimal(MULTIPLICATION.COST_SCALE).pow(lvl)),
    effectExp: (lvl) => 1 + Math.log10(lvl + 1) * MULTIPLICATION.EFFECT_COEFF,
    level: 0,
    unlocked: false,
    unlockCondition: (state) => state.upgrades[1].level >= MULTIPLICATION.UNLOCK_AT_ADD,
    iconId: 'icon-multiplication',
  },
  {
    id: 'exponentiation',
    name: 'Exponentiation',
    // n ^ n : raises Multiplication's exponent M to a power E → production × A^(M^E)
    // E = 1 + log10(lvl+1) * COEFF  (E=1 at lv0 = neutral)
    descTemplate: (lvl) =>
      lvl === 0
        ? 'n ^ n \u2003 A^(M^E) \u2003 [exp for Mult]'
        : `E = ${(1 + Math.log10(lvl + 1) * EXPONENTIATION.EFFECT_COEFF).toFixed(3)}`,
    costFn: (lvl) => new Decimal(EXPONENTIATION.COST_BASE).mul(new Decimal(EXPONENTIATION.COST_SCALE).pow(lvl)),
    effectExpExp: (lvl) => 1 + Math.log10(lvl + 1) * EXPONENTIATION.EFFECT_COEFF,
    level: 0,
    unlocked: false,
    unlockCondition: (state) => state.theoremCount >= EXPONENTIATION.UNLOCK_AT_THMS && state.upgrades[2].level >= 1,
    iconId: 'icon-exponentiation',
  },
];

export const gameState = {
  N: null,           // set by initState() — never call new Decimal at module level
  axiomCount: 0,
  theoremCount: 0,
  theoremUnlocked: false, // set permanently true when axiomCount first reaches THEOREM.UNLOCK_AT_AX
  buyMax: false,
  upgrades: upgradeDefs,
  lastSave: Date.now(),
  lastTick: null,
  domDirty: true,
  sequencesUnlocked: false,
  seqDomDirty: true,
  devBoost: 1,
  offlineProduction:  true,
  scientificNotation: false,
  confirmResets:      true,
  totalPlaytime:      0,
  autosaveInterval:   314,
  iterationUnlocked:  false,
  itDomDirty:         true,
};

// Called explicitly from main.js after the page (and break_infinity) has loaded.
export function initState() {
  gameState.N = new Decimal(0);
}

export function axiomRequirement() {
  const n = gameState.axiomCount;
  // REQ_BASE × REQ_EXP_BASE^(n × REQ_ACC_RATE^n) — accelerates from axiom 0
  const exponent = new Decimal(n).mul(new Decimal(AXIOM.REQ_ACC_RATE).pow(n));
  return new Decimal(AXIOM.REQ_BASE).mul(new Decimal(AXIOM.REQ_EXP_BASE).pow(exponent));
}

export function theoremRequirement() {
  const n = gameState.theoremCount;
  // REQ_BASE × REQ_EXP_BASE^(n × REQ_ACC_RATE^n)
  const exponent = new Decimal(n).mul(new Decimal(THEOREM.REQ_ACC_RATE).pow(n));
  return new Decimal(THEOREM.REQ_BASE).mul(new Decimal(THEOREM.REQ_EXP_BASE).pow(exponent));
}

// Total prod multiplier from Theorem resets
export function totalTheoremMult(count) {
  if (count === undefined) count = gameState.theoremCount;
  return count <= 0 ? 1 : Math.pow(THEOREM.MULT_PER_THM, count);
}

// Upgrade cost multiplier: reduced after milestone
export function upgradeCostMult() {
  return gameState.axiomCount >= AXIOM.COST_REDUCTION_AX ? AXIOM.COST_REDUCTION_MULT : 1.0;
}

// Total production multiplier after N axioms.
export function totalAxiomMult(count) {
  if (count === undefined) count = gameState.axiomCount;
  if (count <= 0) return 1;
  return count >= AXIOM.MULT_THRESHOLD
    ? Math.pow(AXIOM.MULT_PER_AXIOM_HIGH, count)
    : Math.pow(AXIOM.MULT_PER_AXIOM, count);
}

// Milestones: only appear when unlocked (axiomCount >= req).
// descFn() is called at render time so scaling values stay current.
export const MILESTONES = [
  {
    req: 1,
    name: 'First Axiom',
    descFn: () => `\u00d7${totalAxiomMult().toFixed(2)} prod  [\u00d7${AXIOM.MULT_PER_AXIOM}/ax]`,
  },
  {
    req: AXIOM.RECURSION_AX,
    name: 'Recursion',
    descFn: () => `base +${AXIOM.RECURSION_PER_AXIOM * gameState.axiomCount} N/s  [+${AXIOM.RECURSION_PER_AXIOM}/ax]`,
  },
  {
    req: AXIOM.COST_REDUCTION_AX,
    name: 'Convergence',
    descFn: () => `costs \u00d7${AXIOM.COST_REDUCTION_MULT}`,
  },
  {
    req: AXIOM.MULT_THRESHOLD,
    name: 'Resonance',
    descFn: () => `axiom \u00d7${AXIOM.MULT_PER_AXIOM_HIGH}/reset  [\u00d7${totalAxiomMult().toFixed(2)} total]`,
  },
  {
    req: THEOREM.UNLOCK_AT_AX,
    name: 'Transcendence',
    descFn: () => `unlocks Theorem`,
  },
  {
    req: ITER.UNLOCK_AT_AX,
    name: 'Iteration',
    descFn: () => `unlocks Iteration tab`,
  },
];

// Sigma milestone: scales with total upgrade levels (th.2)
export function totalSigmaMult() {
  if (gameState.theoremCount < SIGMA.UNLOCK_THM) return 1;
  const total = gameState.upgrades.reduce((s, u) => s + u.level, 0);
  return Math.max(1, 1 + total * SIGMA.COEFF);
}

export const THEOREM_MILESTONES = [
  {
    req: EXPONENTIATION.UNLOCK_AT_THMS,
    name: 'Exponentiation',
    descFn: () => `unlocks Exponentiation upgrade`,
  },
  {
    req: SIGMA.UNLOCK_THM,
    name: 'Sigma',
    descFn: () => `\u03a3 \u00d7${totalSigmaMult().toFixed(2)}  [+${SIGMA.COEFF * 100}%/lvl]`,
  },
  {
    req: ARITHMETIC_SEQ.UNLOCK_THM,
    name: 'Sequences',
    descFn: () => `unlocks Sequences tab`,
  },
];
