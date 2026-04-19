// save.js — Serialize / deserialize game state to localStorage, plus export/import.

import { gameState } from './state.js';
import { seqState } from './sequences.js';
import { iterState } from './iteration.js';

const SAVE_KEY = 'axiom_save_v1';

export function showAutosaveToast() {
  const el = document.getElementById('autosave-toast');
  if (!el) return;
  el.classList.remove('autosave-active');
  void el.offsetWidth;
  el.classList.add('autosave-active');
}

export function exportSave() {
  save();
  const raw = localStorage.getItem(SAVE_KEY);
  return raw ? btoa(raw) : '';
}

export function importSave(encoded) {
  try {
    const raw = atob(encoded.trim());
    JSON.parse(raw);
    localStorage.setItem(SAVE_KEY, raw);
    location.reload();
  } catch (_) {
    return false;
  }
  return true;
}

export function save() {
  const data = {
    N: gameState.N.toString(),
    axiomCount: gameState.axiomCount,
    theoremCount: gameState.theoremCount,
    theoremUnlocked: gameState.theoremUnlocked,
    buyMax: gameState.buyMax,
    upgrades: gameState.upgrades.map((u) => ({
      id: u.id,
      level: u.level,
      unlocked: u.unlocked,
    })),
    sequencesUnlocked: gameState.sequencesUnlocked,
    seqActiveId: seqState.activeId,
    seqSlots: seqState.slots,
    seqVars: seqState.vars,
    seqReservePts: seqState.reservePts,
    offlineProduction:  gameState.offlineProduction,
    scientificNotation: gameState.scientificNotation,
    confirmResets:      gameState.confirmResets,
    totalPlaytime:      gameState.totalPlaytime,
    autosaveInterval:   gameState.autosaveInterval,
    seqRefPts:   seqState.refPts,
    seqRefCount: seqState.refCount,
    seqGeoBaseScalingLevel:    seqState.geoUpgrades.baseScaling.level,
    seqGeoBaseScalingUnlocked: seqState.geoUpgrades.baseScaling.unlocked,
    iterCount:         iterState.count,
    iterationUnlocked: gameState.iterationUnlocked,
    timestamp: Date.now(),
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  gameState.lastSave = Date.now();
}

export function load() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return;
  try {
    const data = JSON.parse(raw);
    if (data.timestamp !== undefined)       gameState.lastSave        = data.timestamp;
    if (data.N !== undefined)               gameState.N               = new Decimal(data.N);
    if (data.axiomCount !== undefined)      gameState.axiomCount      = data.axiomCount;
    if (data.theoremCount !== undefined)    gameState.theoremCount    = data.theoremCount;
    if (data.theoremUnlocked !== undefined) gameState.theoremUnlocked = data.theoremUnlocked;
    if (data.buyMax !== undefined)          gameState.buyMax          = data.buyMax;

    if (Array.isArray(data.upgrades)) {
      for (const saved of data.upgrades) {
        const upg = gameState.upgrades.find((u) => u.id === saved.id);
        if (!upg) continue;
        upg.level = saved.level ?? 0;
        if (saved.unlocked !== undefined) upg.unlocked = saved.unlocked;
      }
    }

    for (const upg of gameState.upgrades) {
      if (!upg.unlocked && upg.unlockCondition?.(gameState)) upg.unlocked = true;
    }

    if (data.sequencesUnlocked !== undefined) {
      gameState.sequencesUnlocked = data.sequencesUnlocked;
      if (gameState.sequencesUnlocked) {
        const seqTab = document.getElementById('tab-sequences');
        if (seqTab) seqTab.style.display = '';
      }
    }

    if (data.seqActiveId !== undefined) seqState.activeId = data.seqActiveId;
    if (data.seqReservePts !== undefined) seqState.reservePts = data.seqReservePts;
    if (data.offlineProduction  !== undefined) gameState.offlineProduction  = data.offlineProduction;
    if (data.scientificNotation !== undefined) gameState.scientificNotation = data.scientificNotation;
    if (data.confirmResets      !== undefined) gameState.confirmResets      = data.confirmResets;
    if (data.totalPlaytime      !== undefined) gameState.totalPlaytime      = data.totalPlaytime;
    if (data.autosaveInterval   !== undefined) gameState.autosaveInterval   = data.autosaveInterval;
    else if (data.seqBankPts !== undefined) seqState.reservePts = data.seqBankPts; // legacy
    if (data.seqRefPts   !== undefined) seqState.refPts   = data.seqRefPts;
    if (data.seqRefCount !== undefined) seqState.refCount = data.seqRefCount;
    if (data.seqGeoBaseScalingLevel    !== undefined) seqState.geoUpgrades.baseScaling.level    = data.seqGeoBaseScalingLevel;
    if (data.seqGeoBaseScalingUnlocked !== undefined) seqState.geoUpgrades.baseScaling.unlocked = data.seqGeoBaseScalingUnlocked;
    if (data.iterCount !== undefined) iterState.count = data.iterCount;
    if (data.iterationUnlocked !== undefined) {
      gameState.iterationUnlocked = data.iterationUnlocked;
      if (gameState.iterationUnlocked) {
        const iterTab = document.getElementById('tab-iteration');
        if (iterTab) iterTab.style.display = '';
      }
    }

    if (data.seqSlots && typeof data.seqSlots === 'object') {
      for (const id of Object.keys(seqState.slots)) {
        if (data.seqSlots[id]) {
          seqState.slots[id] = {
            terms:       data.seqSlots[id].terms       ?? 0,
            completions: data.seqSlots[id].completions ?? 0,
          };
        }
      }
    }

    if (data.seqVars && typeof data.seqVars === 'object') {
      for (const id of Object.keys(seqState.vars)) {
        if (data.seqVars[id]) {
          for (const k of Object.keys(seqState.vars[id])) {
            if (data.seqVars[id][k] !== undefined) seqState.vars[id][k] = data.seqVars[id][k];
          }
        }
      }
    }

    // Legacy compat: old single-field saves
    if (data.seqArithmeticTerms !== undefined)
      seqState.slots.arithmetic.terms = data.seqArithmeticTerms;
    if (data.seqArithmeticCompletions !== undefined)
      seqState.slots.arithmetic.completions = data.seqArithmeticCompletions;
    if (data.seqAllocPts !== undefined)
      seqState.vars.arithmetic.a = data.seqAllocPts; // migrate old alloc to 'a'

  } catch (e) {
    console.warn('[axiom] Failed to load save:', e);
  }
}
