// main.js — Entry point: initialises state, runs the RAF game loop.

import { gameState, initState } from './state.js';
import { computeProduction } from './production.js';
import { render } from './render.js';
import { save, load, showAutosaveToast } from './save.js';
import { initTabs } from './tabs.js';
import { fmt } from './format.js';
import { ENGINE, THEOREM, ARITHMETIC_SEQ, ITER } from './balance.js';
import { setupParticles, tickParticles } from './particles.js';

// ── Unlock checks ────────────────────────────────────────────────────────────

function checkUnlocks() {
  for (const upg of gameState.upgrades) {
    if (!upg.unlocked && upg.unlockCondition?.(gameState)) {
      upg.unlocked = true;
      gameState.domDirty = true;
    }
  }
  // Theorem unlocks permanently when axiomCount first hits the threshold
  if (!gameState.theoremUnlocked && gameState.axiomCount >= THEOREM.UNLOCK_AT_AX) {
    gameState.theoremUnlocked = true;
    gameState.domDirty = true;
  }

  // Iteration tab unlocks permanently at axiomCount >= ITER.UNLOCK_AT_AX
  if (!gameState.iterationUnlocked && gameState.axiomCount >= ITER.UNLOCK_AT_AX) {
    gameState.iterationUnlocked = true;
    gameState.domDirty = true;
    const iterTab = document.getElementById('tab-iteration');
    if (iterTab) iterTab.style.display = '';
  }

  // Sequences tab unlocks at the configured theorem count
  if (!gameState.sequencesUnlocked && gameState.theoremCount >= ARITHMETIC_SEQ.UNLOCK_THM) {
    gameState.sequencesUnlocked = true;
    gameState.seqDomDirty = true;
    const seqTab = document.getElementById('tab-sequences');
    if (seqTab) seqTab.style.display = '';
  }
}

// ── Per-frame update ─────────────────────────────────────────────────────────

function update(delta) {
  checkUnlocks();
  gameState.totalPlaytime += delta;

  const prod = computeProduction();
  const boost = gameState.devBoost > 1 ? new Decimal(gameState.devBoost) : new Decimal(1);
  gameState.N = gameState.N.add(prod.mul(boost).mul(new Decimal(delta)));

  if (Date.now() - gameState.lastSave > gameState.autosaveInterval * 1000) {
    save();
    showAutosaveToast();
  }
}

// ── Game loop ────────────────────────────────────────────────────────────────

function loop(timestamp) {
  if (gameState.lastTick === null) {
    gameState.lastTick = timestamp;
  }

  const delta = Math.min((timestamp - gameState.lastTick) / 1000, ENGINE.DELTA_CAP);
  gameState.lastTick = timestamp;

  update(delta);
  tickParticles(delta);
  render();

  requestAnimationFrame(loop);
}

// ── Init ─────────────────────────────────────────────────────────────────────

initState();   // creates gameState.N — must come before load() or any Decimal use
load();

// Offline progress — apply production for time away (capped at ENGINE.OFFLINE_CAP_SECONDS)
{
  const elapsed = Math.min((Date.now() - gameState.lastSave) / 1000, ENGINE.OFFLINE_CAP_SECONDS);
  if (gameState.offlineProduction && elapsed > ENGINE.OFFLINE_MIN_SECONDS) {
    const gain = computeProduction().mul(new Decimal(elapsed));
    gameState.N = gameState.N.add(gain);
    console.log(`[Axiom] 오프라인 보상: +${fmt(gain)} N (${Math.floor(elapsed / 60)}분 ${Math.floor(elapsed % 60)}초)`);
  }
}

initTabs();
setupParticles();
gameState.domDirty = true;
requestAnimationFrame(loop);
