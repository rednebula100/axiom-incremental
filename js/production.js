// production.js — Computes total N/s production each frame.

import { gameState, totalAxiomMult, totalTheoremMult, totalSigmaMult, epochState } from './state.js';
import { totalSeqMult } from './sequences.js';
import { iterMult } from './iteration.js';
import { epoch1IterBoost } from './epoch.js';
import { orbitNBoost, orbitSeqBoost } from './orbit.js';
import { AXIOM, SIGMA, EPOCH, ITER } from './balance.js';

export function computeProduction() {
  const [successor, addition, multiplication, exponentiation] = gameState.upgrades;

  // ── Successor: flat +N/s (덧셈) ────────────────────────────────────────────
  const bonusBase = gameState.axiomCount >= AXIOM.RECURSION_AX
    ? AXIOM.RECURSION_PER_AXIOM * gameState.axiomCount
    : 0;
  let base = new Decimal(1 + bonusBase).add(successor.effectFlat(successor.level));

  // ── Upgrade chain: A^(M^E) ────────────────────────────────────────────────
  //   A  = Addition.effectBase(lvl)    — base value (곱셈)
  //   M  = Multiplication.effectExp(lvl) — exponent applied to A (지수)
  //   E  = Exponentiation.effectExpExp(lvl) — exponent applied to M (지수의 지수)
  //   result: base × A^(M^E)
  const A = addition.level > 0 ? addition.effectBase(addition.level) : 1;
  const M = multiplication.level > 0 ? multiplication.effectExp(multiplication.level) : 1;
  const E = (exponentiation && exponentiation.level > 0)
    ? exponentiation.effectExpExp(exponentiation.level)
    : 1;

  if (addition.level > 0) {
    const totalExp = Math.pow(M, E);   // M^E
    base = base.mul(new Decimal(A).pow(totalExp));
  }

  // ── Prestige multipliers (applied after upgrade chain) ────────────────────

  // Axiom permanent multiplier
  if (gameState.axiomCount > 0) {
    base = base.mul(new Decimal(totalAxiomMult()));
  }

  // Theorem multiplier
  if (gameState.theoremCount > 0) {
    base = base.mul(new Decimal(totalTheoremMult()));
  }

  // Sigma milestone: scales with total upgrade levels
  if (gameState.theoremCount >= SIGMA.UNLOCK_THM) {
    base = base.mul(new Decimal(totalSigmaMult()));
  }

  // Sequence multiplier (with optional orbit resonance boost)
  if (gameState.sequencesUnlocked) {
    const sMult     = totalSeqMult();
    const seqBoost  = orbitSeqBoost();
    const effective = sMult * seqBoost;
    if (effective > 1) base = base.mul(new Decimal(effective));
  }

  // Iteration multiplier
  const iMult = iterMult();
  if (iMult > 1) base = base.mul(new Decimal(iMult));

  // ax.20 log boost: log10(axioms+1)^k
  if (gameState.axiomCount >= ITER.UNLOCK_AT_AX) {
    const logBoost = Math.pow(Math.log10(gameState.axiomCount + 1), AXIOM.AX20_LOG_EXP);
    if (logBoost > 1) base = base.mul(new Decimal(logBoost));
  }

  // Orbit N amplifier: production × τ^k
  const nBoost = orbitNBoost();
  if (nBoost > 1) base = base.mul(new Decimal(nBoost));

  // Epoch 1 boosts (outermost — applied last)
  if (epochState.epoch1) {
    base = base.mul(new Decimal(EPOCH.E1_FLAT_BOOST));
    const iterBoost = epoch1IterBoost();
    if (iterBoost > 1) base = base.mul(new Decimal(iterBoost));
  }

  // Epoch 2 N boost
  if (epochState.epoch2) {
    base = base.mul(new Decimal(EPOCH.E2_N_BOOST));
  }

  return base;
}
