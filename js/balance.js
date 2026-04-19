// ── balance.js ────────────────────────────────────────────────────────────────
// Single source of truth for all numerical balance parameters.
// Change values here; nothing else needs touching.

// ── Upgrades ──────────────────────────────────────────────────────────────────

export const SUCCESSOR = {
  COST_BASE:  10,
  COST_SCALE: 1.8,
};

export const ADDITION = {
  COST_BASE:      100,
  COST_SCALE:     2.5,
  EFFECT_EXP:     1.2,   // A = (lvl+1)^EXP  — base that Multiplication will exponentiate
  UNLOCK_AT_SUCC: 3,      // Successor levels required
};

export const MULTIPLICATION = {
  COST_BASE:      1500,
  COST_SCALE:     6,
  EFFECT_COEFF:   2.02,   // M = 1 + log10(lvl+1)*COEFF  → A^M (exponent on Addition's base)
  UNLOCK_AT_ADD:  2,      // Addition levels required
};

export const EXPONENTIATION = {
  COST_BASE:       5000,
  COST_SCALE:      95,
  EFFECT_COEFF:    0.3,  // E = 1 + log10(lvl+1)*COEFF  → M^E (exponent of Multiplication's exponent)
  UNLOCK_AT_THMS:  1,     // Theorems required
};

// ── Prestige: Axiom ───────────────────────────────────────────────────────────

export const AXIOM = {
  REQ_BASE:            1e4,
  // n ≤ REQ_ACC_THRESHOLD : REQ_BASE × REQ_EXP_BASE^n
  // n >  REQ_ACC_THRESHOLD : REQ_BASE × REQ_EXP_BASE^(n × REQ_ACC_RATE^(n - REQ_ACC_THRESHOLD))
  REQ_EXP_BASE:        2,
  REQ_ACC_RATE:        1.09,

  MULT_PER_AXIOM:      1.75,   // production ×N per axiom (before threshold)
  MULT_PER_AXIOM_HIGH: 1.62,   // retroactive boost at MULT_THRESHOLD
  MULT_THRESHOLD:      7,     // axiomCount at which HIGH kicks in

  COST_REDUCTION_AX:   5,     // axiomCount that unlocks -25% upgrade costs
  COST_REDUCTION_MULT: 0.75,

  RECURSION_AX:        3,     // axiomCount at which base bonus activates
  RECURSION_PER_AXIOM: 2,     // +N N/s per axiom once active
};

// ── Prestige: Theorem ─────────────────────────────────────────────────────────

export const THEOREM = {
  REQ_BASE:     1e11,
  // REQ_BASE × REQ_EXP_BASE^(n × REQ_ACC_RATE^n)  — accelerates from the first reset
  // n=0: 10B  n=1: ~28B  n=2: ~226B  n=3: ~11T  n=4: ~12e15
  REQ_EXP_BASE: 4,
  REQ_ACC_RATE: 2.5,

  MULT_PER_THM: 1.5,  // production ×N per theorem

  UNLOCK_AT_AX: 10,   // axiomCount needed to permanently unlock Theorems
};

// ── Milestone: Sigma (th.2) ───────────────────────────────────────────────────

export const SIGMA = {
  COEFF:      0.08,   // +N% production per total upgrade level
  UNLOCK_THM: 2,
};

// ── Sequences ─────────────────────────────────────────────────────────────────

export const ARITHMETIC_SEQ = {
  UNLOCK_THM:       3,     // Theorems needed to unlock

  TERMS_PER_COMP:   5,     // terms to buy before a completion triggers

  COST_BASE:        5e7,   // N cost of term 0
  COST_SCALE:       5,     // ×N per total term (completions×5 + terms) — pure exponential

  // totalMult = ∏ (MULT_BASE + MULT_STEP * i)  for i = 1..completions
  MULT_BASE:  1.3,
  MULT_STEP:  0.1,

  A_BOOST_PER_PT: 0.10,  // each pt allocated to 'a' → +10% base multiplier
  D_STEP_PER_PT:  0.025, // each pt allocated to 'd' → +0.025 per-completion mult step
};

export const GEOMETRIC_SEQ = {
  REFORMULATE_COST:      100,   // pts to switch from arithmetic
  NEXT_REFORMULATE_COST: 7500,  // pts to switch from geometric to polynomial
  TERMS_PER_COMP:   5,
  COST_BASE:        5e9,  // 100× more expensive than arithmetic
  COST_SCALE:       6,    // steeper per-term scaling

  BASE_R:           1.5,  // base ratio when r pts = 0
  A_BOOST_PER_PT:   0.08, // each a pt → +8% flat multiplier
  R_BOOST_PER_PT:   0.05, // each r pt → +0.05 to ratio
};

// ── Sequence Reset (mini-prestige inside Sequences tab) ───────────────────

export const SEQ_RESET = {
  POINTS_BASE:  5e5,   // N threshold for first point (exponential: each next point needs ×SCALE more N)
  POINTS_SCALE: 3,     // ×3 N per additional point (log3 curve — ~20 pts at 3Qa N)
  POINT_BOOST:  0.25,  // each allocated point adds +25% to active sequence's final multiplier
  PTS_CAP:      500,   // total pts ceiling (reserve + allocated); excess is not earned
};

// ── Completion Softcap ────────────────────────────────────────────────────────
// effective_mult = threshold_mult + (raw_mult - threshold_mult)^K  for comps > THRESHOLD
export const COMPLETIONS_SOFTCAP = {
  THRESHOLD: 5,
  K:         0.5,  // square-root feel — clear diminishing returns past comp 5
};

// ── Geometric Sequence: Base Scaling upgrade ──────────────────────────────────
// Each level amplifies 'a' variable's contribution based on total terms bought.
// effectiveABoost = A_BOOST_PER_PT × (1 + level × TERM_RATE × totalTerms)
export const BASE_SCALING = {
  COST_BASE:  1,    // pts cost for level 1
  COST_SCALE: 2.5,   // cost ×N per additional level  (lv1=15, lv2=38, lv3=94…)
  TERM_RATE:  0.01, // a boost multiplier per term per upgrade level
};

// ── Reformulate ref ───────────────────────────────────────────────────────────
// nth reformulate (1-indexed) earns n pts; mult = MULT_BASE^refPts
export const REF = {
  PTS_STEP:  1,     // pts earned per reformulate = refCount × PTS_STEP
  MULT_BASE: 2,  // ref mult = MULT_BASE^refPts
};

// ── Iteration (ℐ) ─────────────────────────────────────────────────────────────
// ℐ earned = floor(log10(N+1)^K)         e.g. at 3Qa N: floor(15.48^2) = 239 ℐ
// Production multiplier = (ℐ + 1)^MULT_EXP   e.g. 239 ℐ → ×53
export const ITER = {
  UNLOCK_AT_AX: 20,    // axiomCount to permanently unlock Iteration tab
  K:            2,     // exponent in acquisition formula
  MULT_EXP:     0.75,  // production multiplier exponent: (ℐ+1)^MULT_EXP
};

// ── Engine ────────────────────────────────────────────────────────────────────

export const ENGINE = {
  DELTA_CAP:           30,        // max seconds per tick (backgrounded-tab protection)
  OFFLINE_CAP_SECONDS: 4 * 3600,  // max offline production credit (4 hours)
  OFFLINE_MIN_SECONDS: 5,         // don't bother below this threshold
  SAVE_INTERVAL_MS:    314_000,
  BUY_MAX_CAP:         500,       // max levels purchased in one buy-max click
  AUTOSAVE_OPTIONS:    [60, 314, 600, 3141],  // selectable autosave intervals (seconds)
};
