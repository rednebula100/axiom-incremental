// actions.js — Upgrade purchases and prestige resets (Axiom / Theorem).

import { gameState, axiomRequirement, upgradeCostMult, theoremRequirement } from './state.js';
import { ENGINE } from './balance.js';
import { resetSeqState } from './sequences.js';

// Shared helper: zero N and reset all upgrades to level 0 / locked.
function resetUpgrades() {
  gameState.N = new Decimal(0);
  for (const upg of gameState.upgrades) {
    upg.level = 0;
    if (upg.unlockCondition !== null) upg.unlocked = false;
  }
}

export function buyUpgrade(id) {
  const upg = gameState.upgrades.find((u) => u.id === id);
  if (!upg) return;

  const mult = upgradeCostMult();

  if (gameState.buyMax) {
    // Buy as many levels as currently affordable (geometric series sum)
    let totalCost = new Decimal(0);
    let k = 0;
    while (k < ENGINE.BUY_MAX_CAP) {
      const next = upg.costFn(upg.level + k).mul(new Decimal(mult));
      if (gameState.N.sub(totalCost).lt(next)) break;
      totalCost = totalCost.add(next);
      k++;
    }
    if (k === 0) return;
    gameState.N = gameState.N.sub(totalCost);
    upg.level += k;
  } else {
    const cost = upg.costFn(upg.level).mul(new Decimal(mult));
    if (gameState.N.lt(cost)) return;
    gameState.N = gameState.N.sub(cost);
    upg.level++;
  }

  gameState.domDirty = true;
}

export function doAxiom() {
  if (gameState.N.lt(axiomRequirement())) return;
  resetUpgrades();
  gameState.axiomCount++;
  gameState.domDirty = true;
}

export function doTheorem() {
  if (!gameState.theoremUnlocked) return;
  if (gameState.N.lt(theoremRequirement())) return;
  resetUpgrades();
  gameState.axiomCount = 0;
  gameState.theoremCount++;
  resetSeqState({ keepPts: true });
  gameState.domDirty    = true;
  gameState.seqDomDirty = true;
}
