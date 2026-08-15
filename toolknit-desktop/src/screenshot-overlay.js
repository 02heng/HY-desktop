import { convertFileSrc, invoke } from '@tauri-apps/api/core';

const stage = document.getElementById('stage');
const selection = document.getElementById('selection');
const sizeTag = document.getElementById('sizeTag');
const mask = document.getElementById('mask');

let dragStart = null;
let currentRect = null;
let confirming = false;

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function toImageRect(clientRect) {
  const scaleX = (currentMeta?.width || stage.clientWidth) / Math.max(1, stage.clientWidth);
  const scaleY = (currentMeta?.height || stage.clientHeight) / Math.max(1, stage.clientHeight);
  const x = Math.round(clientRect.x * scaleX);
  const y = Math.round(clientRect.y * scaleY);
  const width = Math.max(1, Math.round(clientRect.width * scaleX));
  const height = Math.max(1, Math.round(clientRect.height * scaleY));
  return { x, y, width, height };
}

function renderRect(rect) {
  if (!rect || rect.width < 2 || rect.height < 2) {
    selection.style.display = 'none';
    sizeTag.style.display = 'none';
    mask.style.display = 'block';
    return;
  }
  mask.style.display = 'none';
  selection.style.display = 'block';
  selection.style.left = `${rect.x}px`;
  selection.style.top = `${rect.y}px`;
  selection.style.width = `${rect.width}px`;
  selection.style.height = `${rect.height}px`;
  sizeTag.style.display = 'block';
  sizeTag.style.left = `${Math.max(12, rect.x)}px`;
  sizeTag.style.top = `${Math.max(12, rect.y - 28)}px`;
  const imageRect = toImageRect(rect);
  sizeTag.textContent = `${imageRect.width} × ${imageRect.height}`;
}

async function confirm() {
  if (confirming || !currentRect || currentRect.width < 2 || currentRect.height < 2) return;
  confirming = true;
  try {
    const imageRect = toImageRect(currentRect);
    await invoke('confirm_screenshot_region', imageRect);
  } catch (error) {
    confirming = false;
    console.error(error);
    await invoke('cancel_screenshot').catch(() => {});
  }
}

async function cancel() {
  if (confirming) return;
  confirming = true;
  try {
    await invoke('cancel_screenshot');
  } catch (error) {
    console.error(error);
  }
}

let currentMeta = null;

async function boot() {
  try {
    currentMeta = await invoke('get_screenshot_preview_path');
    stage.style.backgroundImage = `url("${convertFileSrc(currentMeta.path)}")`;
  } catch (error) {
    console.error(error);
    await cancel();
  }
}

stage.addEventListener('mousedown', (event) => {
  if (event.button !== 0 || confirming) return;
  dragStart = {
    x: clamp(event.clientX, 0, stage.clientWidth),
    y: clamp(event.clientY, 0, stage.clientHeight)
  };
  currentRect = { x: dragStart.x, y: dragStart.y, width: 0, height: 0 };
  renderRect(currentRect);
});

window.addEventListener('mousemove', (event) => {
  if (!dragStart || confirming) return;
  const x2 = clamp(event.clientX, 0, stage.clientWidth);
  const y2 = clamp(event.clientY, 0, stage.clientHeight);
  const x = Math.min(dragStart.x, x2);
  const y = Math.min(dragStart.y, y2);
  currentRect = {
    x,
    y,
    width: Math.abs(x2 - dragStart.x),
    height: Math.abs(y2 - dragStart.y)
  };
  renderRect(currentRect);
});

window.addEventListener('mouseup', async () => {
  if (!dragStart || confirming) return;
  dragStart = null;
  if (currentRect && currentRect.width >= 2 && currentRect.height >= 2) {
    await confirm();
  }
});

window.addEventListener('keydown', async (event) => {
  if (event.key === 'Escape') {
    event.preventDefault();
    await cancel();
  } else if (event.key === 'Enter') {
    event.preventDefault();
    await confirm();
  }
});

void boot();
