// confirm.js — Reusable confirmation modal; bypassed when gameState.confirmResets is false.

import { gameState } from './state.js';

let modal = null;

function buildModal() {
  const overlay = document.createElement('div');
  overlay.className = 'confirm-overlay';

  const box = document.createElement('div');
  box.className = 'confirm-box';

  const labelEl = document.createElement('div');
  labelEl.className = 'confirm-label';

  const btnRow = document.createElement('div');
  btnRow.className = 'confirm-btn-row';

  const yesBtn = document.createElement('button');
  yesBtn.className = 'confirm-btn confirm-yes';
  yesBtn.textContent = 'confirm';

  const noBtn = document.createElement('button');
  noBtn.className = 'confirm-btn confirm-no';
  noBtn.textContent = 'cancel';

  btnRow.appendChild(yesBtn);
  btnRow.appendChild(noBtn);
  box.appendChild(labelEl);
  box.appendChild(btnRow);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
  overlay.style.display = 'none';

  noBtn.addEventListener('click', hide);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) hide(); });

  return { overlay, labelEl, yesBtn };
}

function hide() {
  if (modal) {
    modal.overlay.style.display = 'none';
    modal.yesBtn.onclick = null;
  }
}

export function showConfirm(text, onConfirm) {
  if (!gameState.confirmResets) { onConfirm(); return; }
  if (!modal) modal = buildModal();
  modal.labelEl.textContent = text;
  modal.overlay.style.display = 'flex';
  modal.yesBtn.onclick = () => { hide(); onConfirm(); };
}
