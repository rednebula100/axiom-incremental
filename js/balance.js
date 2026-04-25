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
  MULT_THRESHOLD:      7,      // axiomCount at which HIGH kicks in

  COST_REDUCTION_AX:   5,      // axiomCount that unlocks -25% upgrade costs
  COST_REDUCTION_MULT: 0.75,

  RECURSION_AX:        3,      // axiomCount at which base bonus activates
  RECURSION_PER_AXIOM: 2,      // +N N/s per axiom once active

  AX20_LOG_EXP:        1.5,    // ax.20 boost = log10(axioms+1)^k
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
  NEXT_REFORMULATE_COST: 1000,  // pts to switch from geometric to polynomial
  TERMS_PER_COMP:   5,
  COST_BASE:        5e9,  // 100× more expensive than arithmetic
  COST_SCALE:       6,    // steeper per-term scaling

  BASE_R:           1.5,  // base ratio when r pts = 0
  A_BOOST_PER_PT:   0.08, // each a pt → +8% flat multiplier
  R_BOOST_PER_PT:   0.05, // each r pt → +0.05 to ratio
};

// ── Sequence Reset (mini-prestige inside Sequences tab) ───────────────────

export const SEQ_RESET = {
  POINTS_BASE:    5e5,  // N threshold for first point at 0 pts held
  POINTS_SCALE:   3,    // ×3 N per additional point (log3 curve)
  PTS_HELD_SCALE: 1.08, // POINTS_BASE multiplied by this for each pt currently held
  POINT_BOOST:    0.25, // each allocated point adds +25% to active sequence's final multiplier
  PTS_CAP:        500,  // total pts ceiling (reserve + allocated); excess is not earned
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
// ℐ earned = floor(log10(N+1)^K / SCALE)   e.g. at 1Ud (1e36): floor(36^2/1296) = 1 ℐ
// Production multiplier = (ℐ + 1)^MULT_EXP
export const ITER = {
  UNLOCK_AT_AX: 20,    // axiomCount to permanently unlock Iteration tab
  K:            2,     // exponent in acquisition formula
  SCALE:        1296,  // divisor so that N=1Ud (1e36) → earn exactly 1 ℐ
  MULT_EXP:     0.75,  // production multiplier exponent: (ℐ+1)^MULT_EXP
};

// ── Sigma Automation ─────────────────────────────────────────────────────────
// freq cost for level n→n+1: ceil(FREQ_BASE_COST × FREQ_COST_SCALE^(n-1))
// freq=1→2: 1 ℐ  ·  2→3: 3 ℐ  ·  3→4: 9 ℐ  ·  4→5: 27 ℐ
export const SIGMA_AUTO = {
  FREQ_BASE_COST:  1,
  FREQ_COST_SCALE: 3,
};

// ── Harmonic Amplifier ────────────────────────────────────────────────────────
// Harmonic Amplifier: each level multiplies effective freq by EFFECT_MULT
// cost for level n: ceil(COST_BASE * COST_SCALE^n)
// lv0→1: 3 ℐ  lv1→2: 12 ℐ  lv2→3: 48 ℐ
export const FREQ_AMP = {
  COST_BASE:   1e21,   // 1 Sx N for first purchase
  COST_SCALE:  1000,   // ×1000 N per level
  EFFECT_MULT: 1.1,    // ×1.1 effective freq per level
};

// ── Epoch ─────────────────────────────────────────────────────────────────────
// Epoch 1: permanent one-time purchase.
// E1_ITER_K: boost = max(1, log10(ℐ+1)^k)  e.g. at 100 ℐ → ×4,  1000 ℐ → ×9
// Epoch 2: unlocks Orbit tab; requires Epoch 1.
export const EPOCH = {
  E1_COST:       1,     // ℐ cost
  E1_FLAT_BOOST: 3,     // ×3 N production
  E1_ITER_K:     2,     // log10(ℐ+1)^k exponent
  E1_PTS_CAP:    750,   // reserve pts cap (replaces SEQ_RESET.PTS_CAP = 500)

  E2_COST:       1,     // ℐ cost
  E2_N_BOOST:    2,     // ×2 N production (permanent)
  E2_PTS_MULT:   1.2,   // ×1.2 pts earned per sequence reset
};

// ── Epoch 3 ───────────────────────────────────────────────────────────────────
export const EPOCH3 = {
  COST:        1,     // ℐ cost
  EXP_COST_K:  0.5,  // exponentiation cost × (1 / log10(ℐ+1)^k)
  TAU_SELF_K:  0.15, // τ gain × (τ+1)^k
};

// ── Orbit ─────────────────────────────────────────────────────────────────────
// Concentric orbits earn τ (tau) per revolution.
// Layer 0 is innermost (fastest, least τ/rev); each reset adds one outer layer.
export const ORBIT = {
  BASE_REV_RATE:        0.1,    // inner orbit: 1 revolution per 10 seconds
  SPEED_RATIO:          2.5,    // each outer layer is 2.5× slower
  BASE_TAU_PER_REV:     1,      // inner orbit: 1 τ per revolution
  TAU_RATIO:            3,      // each outer layer earns 3× more τ/rev
  SPEED_COST_BASE:      10,     // τ cost for speed lv0→1
  SPEED_COST_SCALE:     3,      // ×3 per level
  SPEED_MULT:           1.3,    // ×1.3 rev/s per speed level
  GAIN_COST_BASE:       15,     // τ cost for gain lv0→1
  GAIN_COST_SCALE:      3,
  GAIN_MULT:            1.5,    // ×1.5 τ/rev per gain level
  ORBIT_N_EXP:          0.15,   // k per nBoostLevel: production × τ^(level × k)
  N_BOOST_COST_BASE:    100,
  N_BOOST_COST_SCALE:   5,
  SEQ_BOOST_COEFF:      0.02,   // seq mult × (1 + seqBoostLevel × coeff × τ)
  SEQ_BOOST_COST_BASE:  200,
  SEQ_BOOST_COST_SCALE: 5,
  CANVAS_SIZE:          220,
  RADIUS_BASE:          35,     // innermost circle radius (px)
  RADIUS_STEP:          25,     // radius increment per outer layer
  ORBIT_RESET_BASE:     10,     // τ cost for first new orbit
  ORBIT_RESET_SCALE:    10,     // ×N per current layer count
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
