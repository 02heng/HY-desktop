import { hashText, HASH_LIMITS, HashError, normalizeHashAlgorithm } from './hash-core.js';
import { formatJson, minifyJson, JSON_FORMAT_LIMITS, JsonFormatError } from './json-format-core.js';
import {
  diffLines,
  summarizeDiff,
  formatUnifiedDiff,
  TEXT_DIFF_LIMITS,
  TextDiffError
} from './text-diff-core.js';
import {
  buildPdfFromImages,
  validateImageToPdfSelection,
  ImageToPdfError,
  IMAGE_TO_PDF_LIMITS
} from './image-to-pdf-core.js';
import {
  validateTransformSelection,
  buildTransformOptions,
  ImageTransformError
} from './image-transform-core.js';
import {
  extractTextFromBytes,
  isSupportedExtractName,
  TextExtractError
} from './text-extract-core.js';
import {
  buildDocxFromText,
  buildPdfFromPlainText,
  PdfWordError
} from './pdf-word-core.js';
import { validateVideoBatchSelection, VideoConvertError } from './video-convert-core.js';

function bindToolOpen(toolId, openFn) {
  document.querySelectorAll(`.audio-list-item[data-tool="${toolId}"]`).forEach((item) => {
    item.addEventListener('click', openFn);
    item.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        openFn();
      }
    });
  });
}

function setupOverlay(overlayId, backId, bgId, { initPlasma, disposePlasma }) {
  const overlay = document.getElementById(overlayId);
  const back = document.getElementById(backId);
  const bg = document.getElementById(bgId);
  let plasma = null;
  const open = () => {
    if (!overlay) return;
    overlay.classList.add('visible');
    if (bg && !plasma) plasma = initPlasma(bg);
  };
  const close = () => {
    if (!overlay) return;
    overlay.classList.remove('visible');
    plasma = disposePlasma(plasma);
  };
  if (back) back.addEventListener('click', close);
  return { overlay, open, close };
}

function initHashTool(deps) {
  const { overlay, open, close } = setupOverlay('hashToolOverlay', 'hashToolBack', 'hashToolBg', deps);
  const input = document.getElementById('hashToolInput');
  const output = document.getElementById('hashToolOutput');
  const runBtn = document.getElementById('hashToolRun');
  const copyBtn = document.getElementById('hashToolCopy');
  const algoGroup = document.getElementById('hashToolAlgoOptions');
  let algorithm = 'sha256';

  algoGroup?.querySelectorAll('[data-algo]').forEach((btn) => {
    btn.addEventListener('click', () => {
      algorithm = btn.dataset.algo;
      algoGroup.querySelectorAll('[data-algo]').forEach((el) => el.classList.toggle('active', el === btn));
    });
  });

  runBtn?.addEventListener('click', async () => {
    try {
      const text = input?.value || '';
      if (!text) {
        deps.toast(deps.t('home.hashTool.empty') || '请输入文本');
        return;
      }
      normalizeHashAlgorithm(algorithm);
      output.value = await hashText(algorithm, text);
    } catch (error) {
      deps.toast(error instanceof HashError ? error.message : String(error.message || error));
    }
  });

  copyBtn?.addEventListener('click', async () => {
    if (!output?.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      deps.toast(deps.t('home.hashTool.copied') || '已复制');
    } catch {
      deps.toast(deps.t('home.hashTool.copyFailed') || '复制失败');
    }
  });

  bindToolOpen('hash-tool', open);
  return { close };
}

function initJsonTool(deps) {
  const { open } = setupOverlay('jsonToolOverlay', 'jsonToolBack', 'jsonToolBg', deps);
  const input = document.getElementById('jsonToolInput');
  const output = document.getElementById('jsonToolOutput');

  document.getElementById('jsonToolPretty')?.addEventListener('click', () => {
    try {
      output.value = formatJson(input?.value || '', 2);
    } catch (error) {
      deps.toast(error instanceof JsonFormatError ? error.message : String(error.message || error));
    }
  });
  document.getElementById('jsonToolMinify')?.addEventListener('click', () => {
    try {
      output.value = minifyJson(input?.value || '');
    } catch (error) {
      deps.toast(error instanceof JsonFormatError ? error.message : String(error.message || error));
    }
  });
  document.getElementById('jsonToolCopy')?.addEventListener('click', async () => {
    if (!output?.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      deps.toast(deps.t('home.jsonTool.copied') || '已复制');
    } catch {
      deps.toast(deps.t('home.jsonTool.copyFailed') || '复制失败');
    }
  });
  document.getElementById('jsonToolClear')?.addEventListener('click', () => {
    if (input) input.value = '';
    if (output) output.value = '';
  });

  input?.addEventListener('input', () => {
    if (input.value.length > JSON_FORMAT_LIMITS.maxInputChars) {
      input.value = input.value.slice(0, JSON_FORMAT_LIMITS.maxInputChars);
    }
  });

  bindToolOpen('json-format', open);
}

function initDiffTool(deps) {
  const { open } = setupOverlay('textDiffOverlay', 'textDiffBack', 'textDiffBg', deps);
  const left = document.getElementById('textDiffLeft');
  const right = document.getElementById('textDiffRight');
  const output = document.getElementById('textDiffOutput');
  const summary = document.getElementById('textDiffSummary');

  document.getElementById('textDiffRun')?.addEventListener('click', () => {
    try {
      const changes = diffLines(left?.value || '', right?.value || '');
      const stats = summarizeDiff(changes);
      if (summary) {
        summary.textContent = deps.t('home.textDiff.summary', {
          added: stats.added,
          removed: stats.removed,
          equal: stats.equal
        }) || `+${stats.added} / -${stats.removed} / =${stats.equal}`;
      }
      if (output) output.value = formatUnifiedDiff(changes, 'left', 'right');
    } catch (error) {
      deps.toast(error instanceof TextDiffError ? error.message : String(error.message || error));
    }
  });

  for (const el of [left, right]) {
    el?.addEventListener('input', () => {
      if (el.value.length > TEXT_DIFF_LIMITS.maxInputChars) {
        el.value = el.value.slice(0, TEXT_DIFF_LIMITS.maxInputChars);
      }
    });
  }

  bindToolOpen('text-diff', open);
}

async function pickImageFiles(multiple = true) {
  const { open } = await import('@tauri-apps/plugin-dialog');
  const selected = await open({
    multiple,
    filters: [{ name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp'] }]
  });
  if (!selected) return [];
  const paths = Array.isArray(selected) ? selected : [selected];
  return paths.map((path) => ({
    path,
    name: path.split(/[/\\]/).pop() || 'image',
    size: 0
  }));
}

function initImageToPdfTool(deps) {
  const { open, close } = setupOverlay('imageToPdfOverlay', 'imageToPdfBack', 'imageToPdfBg', deps);
  const listEl = document.getElementById('imageToPdfFiles');
  const processBtn = document.getElementById('imageToPdfProcessBtn');
  let files = [];

  function render() {
    if (!listEl) return;
    listEl.innerHTML = files
      .map(
        (file, index) =>
          `<div class="audio-convert-file-item"><span class="audio-convert-file-name">${deps.escapeHtml(file.name)}</span><button class="audio-convert-file-remove" data-index="${index}">×</button></div>`
      )
      .join('');
    listEl.querySelectorAll('.audio-convert-file-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        files.splice(Number(btn.dataset.index), 1);
        render();
      });
    });
    if (processBtn) processBtn.style.display = files.length ? '' : 'none';
  }

  document.getElementById('imageToPdfCta')?.addEventListener('click', async () => {
    try {
      const picked = await pickImageFiles(true);
      const jpgPng = picked.filter((f) => /\.(jpe?g|png)$/i.test(f.name));
      const next = [...files, ...jpgPng];
      validateImageToPdfSelection(next.map((f) => ({ ...f, size: f.size || 1 })));
      files = next;
      render();
    } catch (error) {
      deps.toast(error instanceof ImageToPdfError ? error.message : String(error.message || error));
    }
  });

  processBtn?.addEventListener('click', async () => {
    try {
      validateImageToPdfSelection(files.map((f) => ({ ...f, size: f.size || 1 })));
      if (!deps.isTauri) {
        deps.toast('需要桌面端运行');
        return;
      }
      const { invoke } = await import('@tauri-apps/api/core');
      const images = [];
      for (const file of files) {
        const bytes = new Uint8Array(await invoke('read_file_bytes', { path: file.path }));
        if (bytes.byteLength > IMAGE_TO_PDF_LIMITS.maxBytesPerFile) {
          throw new ImageToPdfError('file_too_large', `${file.name} too large`);
        }
        images.push({ name: file.name, bytes });
      }
      const pdfBytes = await buildPdfFromImages(images);
      const outputDir = await deps.getOutputDir('Images/Image to PDF');
      const outputPath = await invoke('write_unique_file_bytes', {
        directory: outputDir,
        fileName: 'images.pdf',
        bytes: Array.from(pdfBytes)
      });
      deps.toast((deps.t('home.imageToPdf.done') || '已保存：') + outputPath);
      files = [];
      render();
      close();
    } catch (error) {
      deps.toast(error instanceof ImageToPdfError ? error.message : String(error.message || error));
    }
  });

  bindToolOpen('image-to-pdf', open);
}

function initImageTransformTool(deps) {
  const { open, close } = setupOverlay('imageTransformOverlay', 'imageTransformBack', 'imageTransformBg', deps);
  const listEl = document.getElementById('imageTransformFiles');
  const processBtn = document.getElementById('imageTransformProcessBtn');
  const opSelect = document.getElementById('imageTransformOp');
  const widthInput = document.getElementById('imageTransformWidth');
  const heightInput = document.getElementById('imageTransformHeight');
  const degreesSelect = document.getElementById('imageTransformDegrees');
  const axisSelect = document.getElementById('imageTransformAxis');
  const cropX = document.getElementById('imageTransformCropX');
  const cropY = document.getElementById('imageTransformCropY');
  const cropW = document.getElementById('imageTransformCropW');
  const cropH = document.getElementById('imageTransformCropH');
  const gridRows = document.getElementById('imageTransformRows');
  const gridCols = document.getElementById('imageTransformCols');
  let files = [];

  function render() {
    if (!listEl) return;
    listEl.innerHTML = files
      .map(
        (file, index) =>
          `<div class="audio-convert-file-item"><span class="audio-convert-file-name">${deps.escapeHtml(file.name)}</span><button class="audio-convert-file-remove" data-index="${index}">×</button></div>`
      )
      .join('');
    listEl.querySelectorAll('.audio-convert-file-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        files.splice(Number(btn.dataset.index), 1);
        render();
      });
    });
    if (processBtn) processBtn.style.display = files.length ? '' : 'none';
  }

  function currentOptions() {
    const op = opSelect?.value || 'resize';
    return buildTransformOptions(op, {
      width: Number(widthInput?.value || cropW?.value || 0),
      height: Number(heightInput?.value || cropH?.value || 0),
      keepAspect: document.getElementById('imageTransformKeepAspect')?.checked !== false,
      degrees: Number(degreesSelect?.value || 90),
      axis: axisSelect?.value || 'horizontal',
      x: Number(cropX?.value || 0),
      y: Number(cropY?.value || 0),
      rows: Number(gridRows?.value || 3),
      cols: Number(gridCols?.value || 3)
    });
  }

  document.getElementById('imageTransformCta')?.addEventListener('click', async () => {
    try {
      const picked = await pickImageFiles(true);
      const next = [...files, ...picked];
      validateTransformSelection(next);
      files = next;
      render();
    } catch (error) {
      deps.toast(error instanceof ImageTransformError ? error.message : String(error.message || error));
    }
  });

  processBtn?.addEventListener('click', async () => {
    try {
      validateTransformSelection(files);
      const options = currentOptions();
      if (!deps.isTauri) {
        deps.toast('需要桌面端运行');
        return;
      }
      const { invoke } = await import('@tauri-apps/api/core');
      const outputDir = await deps.getOutputDir('Images/Image Transform');
      const result = await invoke('transform_image_batch', {
        inputPaths: files.map((f) => f.path),
        outputDir,
        options
      });
      deps.toast(
        deps.t('home.imageTransform.done', {
          ok: result.success_count ?? result.successCount ?? 0,
          fail: result.fail_count ?? result.failCount ?? 0
        }) || `完成 ${result.success_count ?? 0}，失败 ${result.fail_count ?? 0}`
      );
      files = [];
      render();
      close();
    } catch (error) {
      deps.toast(error instanceof ImageTransformError ? error.message : String(error.message || error));
    }
  });

  bindToolOpen('image-transform', open);
  // Also map planned aliases from the catalog.
  bindToolOpen('img-resize', () => {
    if (opSelect) opSelect.value = 'resize';
    open();
  });
  bindToolOpen('img-crop', () => {
    if (opSelect) opSelect.value = 'crop';
    open();
  });
  bindToolOpen('grid-split', () => {
    if (opSelect) opSelect.value = 'grid_split';
    open();
  });
  bindToolOpen('img-flip-rotate', () => {
    if (opSelect) opSelect.value = 'rotate';
    open();
  });
}

function initVideoCompressTool(deps) {
  const { open, close } = setupOverlay('videoCompressOverlay', 'videoCompressBack', 'videoCompressBg', deps);
  const listEl = document.getElementById('videoCompressFiles');
  const processBtn = document.getElementById('videoCompressProcessBtn');
  const qualityGroup = document.getElementById('videoCompressQualityOptions');
  let files = [];
  let quality = 'medium';

  qualityGroup?.querySelectorAll('[data-quality]').forEach((btn) => {
    btn.addEventListener('click', () => {
      quality = btn.dataset.quality;
      qualityGroup.querySelectorAll('[data-quality]').forEach((el) => el.classList.toggle('active', el === btn));
    });
  });

  function render() {
    if (!listEl) return;
    listEl.innerHTML = files
      .map(
        (file, index) =>
          `<div class="audio-convert-file-item"><span class="audio-convert-file-name">${deps.escapeHtml(file.name)}</span><button class="audio-convert-file-remove" data-index="${index}">×</button></div>`
      )
      .join('');
    listEl.querySelectorAll('.audio-convert-file-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        files.splice(Number(btn.dataset.index), 1);
        render();
      });
    });
    if (processBtn) processBtn.style.display = files.length ? '' : 'none';
  }

  document.getElementById('videoCompressCta')?.addEventListener('click', async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const selected = await open({
        multiple: true,
        filters: [{ name: 'Video', extensions: ['mp4', 'avi', 'mkv', 'mov', 'webm', 'flv', 'wmv', 'ts', 'm4v'] }]
      });
      if (!selected) return;
      const paths = Array.isArray(selected) ? selected : [selected];
      const next = [
        ...files,
        ...paths.map((path) => ({ path, name: path.split(/[/\\]/).pop() || 'video.mp4', size: 0 }))
      ];
      validateVideoBatchSelection(next);
      files = next;
      render();
    } catch (error) {
      deps.toast(error instanceof VideoConvertError ? error.message : String(error.message || error));
    }
  });

  processBtn?.addEventListener('click', async () => {
    try {
      validateVideoBatchSelection(files);
      if (!deps.isTauri) {
        deps.toast('需要桌面端运行');
        return;
      }
      if (typeof deps.ensureFfmpegAvailable === 'function') {
        const ready = await deps.ensureFfmpegAvailable();
        if (!ready) return;
      }
      const { invoke } = await import('@tauri-apps/api/core');
      const outputDir = await deps.getOutputDir('Videos/Compress');
      const result = await invoke('compress_video_batch', {
        inputPaths: files.map((f) => f.path),
        outputDir,
        quality
      });
      deps.toast(
        `压缩完成 ${result.success_count ?? result.successCount ?? 0}，失败 ${result.fail_count ?? result.failCount ?? 0}`
      );
      files = [];
      render();
      close();
    } catch (error) {
      deps.toast(String(error?.message || error));
    }
  });

  const openWithCheck = () => {
    if (typeof deps.openWithFfmpegCheck === 'function') deps.openWithFfmpegCheck(open);
    else open();
  };
  bindToolOpen('video-compress', openWithCheck);
}

function initTextExtractTool(deps) {
  const { open } = setupOverlay('textExtractOverlay', 'textExtractBack', 'textExtractBg', deps);
  const output = document.getElementById('textExtractOutput');
  const meta = document.getElementById('textExtractMeta');

  document.getElementById('textExtractCta')?.addEventListener('click', async () => {
    try {
      if (!deps.isTauri) {
        deps.toast('需要桌面端运行');
        return;
      }
      const { open: openDialog } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: 'Documents', extensions: ['pdf', 'txt', 'md', 'docx', 'csv', 'json', 'log'] }]
      });
      if (!selected) return;
      const path = Array.isArray(selected) ? selected[0] : selected;
      const name = path.split(/[/\\]/).pop() || 'file';
      if (!isSupportedExtractName(name)) throw new TextExtractError('unsupported_input', '不支持的文件类型');
      const bytes = new Uint8Array(await invoke('read_file_bytes', { path }));
      const pdfjsLib = await import('pdfjs-dist');
      const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
      pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
      const mammoth = await import('mammoth');
      const text = await extractTextFromBytes(name, bytes, { pdfjsLib, mammoth });
      if (output) output.value = text;
      if (meta) meta.textContent = `${name} · ${text.length} 字符`;
    } catch (error) {
      deps.toast(error instanceof TextExtractError ? error.message : String(error.message || error));
    }
  });

  document.getElementById('textExtractCopy')?.addEventListener('click', async () => {
    if (!output?.value) return;
    try {
      await navigator.clipboard.writeText(output.value);
      deps.toast('已复制');
    } catch {
      deps.toast('复制失败');
    }
  });

  document.getElementById('textExtractSave')?.addEventListener('click', async () => {
    try {
      if (!output?.value || !deps.isTauri) return;
      const { invoke } = await import('@tauri-apps/api/core');
      const outputDir = await deps.getOutputDir('Text/Extract');
      const outputPath = await invoke('write_unique_file_bytes', {
        directory: outputDir,
        fileName: 'extracted.txt',
        bytes: Array.from(new TextEncoder().encode(output.value))
      });
      deps.toast(`已保存：${outputPath}`);
    } catch (error) {
      deps.toast(String(error.message || error));
    }
  });

  bindToolOpen('text-extract', open);
}

function initPdfWordTool(deps) {
  const { open } = setupOverlay('pdfWordOverlay', 'pdfWordBack', 'pdfWordBg', deps);
  const modeSelect = document.getElementById('pdfWordMode');
  const status = document.getElementById('pdfWordStatus');

  document.getElementById('pdfWordCta')?.addEventListener('click', async () => {
    try {
      if (!deps.isTauri) {
        deps.toast('需要桌面端运行');
        return;
      }
      const mode = modeSelect?.value || 'pdf-to-word';
      const { open: openDialog } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');
      const selected = await openDialog({
        multiple: false,
        filters: [
          mode === 'pdf-to-word'
            ? { name: 'PDF', extensions: ['pdf'] }
            : { name: 'Word/Text', extensions: ['docx', 'txt', 'md'] }
        ]
      });
      if (!selected) return;
      const path = Array.isArray(selected) ? selected[0] : selected;
      const name = path.split(/[/\\]/).pop() || 'file';
      const bytes = new Uint8Array(await invoke('read_file_bytes', { path }));
      if (status) status.textContent = '处理中...';

      if (mode === 'pdf-to-word') {
        const pdfjsLib = await import('pdfjs-dist');
        const workerUrl = (await import('pdfjs-dist/build/pdf.worker.mjs?url')).default;
        pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;
        const text = await extractTextFromBytes(name, bytes, { pdfjsLib });
        const docxBytes = await buildDocxFromText(text, name.replace(/\.pdf$/i, ''));
        const outputDir = await deps.getOutputDir('PDF/Word');
        const outputPath = await invoke('write_unique_file_bytes', {
          directory: outputDir,
          fileName: name.replace(/\.pdf$/i, '') + '.docx',
          bytes: Array.from(docxBytes)
        });
        if (status) status.textContent = `已导出：${outputPath}`;
        deps.toast('PDF → Word 完成（文本版）');
        return;
      }

      let text = '';
      if (/\.docx$/i.test(name)) {
        const mammoth = await import('mammoth');
        text = await extractTextFromBytes(name, bytes, { mammoth });
      } else {
        text = new TextDecoder('utf-8', { fatal: false }).decode(bytes);
      }
      const pdfBytes = await buildPdfFromPlainText(text, name.replace(/\.[^.]+$/, ''));
      const outputDir = await deps.getOutputDir('PDF/Word');
      const outputPath = await invoke('write_unique_file_bytes', {
        directory: outputDir,
        fileName: name.replace(/\.[^.]+$/, '') + '.pdf',
        bytes: Array.from(pdfBytes)
      });
      if (status) status.textContent = `已导出：${outputPath}`;
      deps.toast('Word/文本 → PDF 完成');
    } catch (error) {
      if (status) status.textContent = '';
      deps.toast(
        error instanceof PdfWordError || error instanceof TextExtractError
          ? error.message
          : String(error.message || error)
      );
    }
  });

  bindToolOpen('pdf-word', open);
}

function initHeicTool(deps) {
  const { open, close } = setupOverlay('heicConvertOverlay', 'heicConvertBack', 'heicConvertBg', deps);
  const listEl = document.getElementById('heicConvertFiles');
  const processBtn = document.getElementById('heicConvertProcessBtn');
  let files = [];

  function render() {
    if (!listEl) return;
    listEl.innerHTML = files
      .map(
        (file, index) =>
          `<div class="audio-convert-file-item"><span class="audio-convert-file-name">${deps.escapeHtml(file.name)}</span><button class="audio-convert-file-remove" data-index="${index}">×</button></div>`
      )
      .join('');
    listEl.querySelectorAll('.audio-convert-file-remove').forEach((btn) => {
      btn.addEventListener('click', () => {
        files.splice(Number(btn.dataset.index), 1);
        render();
      });
    });
    if (processBtn) processBtn.style.display = files.length ? '' : 'none';
  }

  document.getElementById('heicConvertCta')?.addEventListener('click', async () => {
    const { open: openDialog } = await import('@tauri-apps/plugin-dialog');
    const selected = await openDialog({
      multiple: true,
      filters: [{ name: 'HEIC', extensions: ['heic', 'heif'] }]
    });
    if (!selected) return;
    const paths = Array.isArray(selected) ? selected : [selected];
    files = [
      ...files,
      ...paths.map((path) => ({ path, name: path.split(/[/\\]/).pop() || 'image.heic' }))
    ];
    render();
  });

  processBtn?.addEventListener('click', async () => {
    try {
      if (!deps.isTauri) {
        deps.toast('需要桌面端运行');
        return;
      }
      const { invoke } = await import('@tauri-apps/api/core');
      const heic2any = (await import('heic2any')).default;
      const outputDir = await deps.getOutputDir('Images/HEIC');
      let ok = 0;
      for (const file of files) {
        const bytes = new Uint8Array(await invoke('read_file_bytes', { path: file.path }));
        const blob = new Blob([bytes], { type: 'image/heic' });
        const result = await heic2any({ blob, toType: 'image/jpeg', quality: 0.9 });
        const jpegBlob = Array.isArray(result) ? result[0] : result;
        const buffer = new Uint8Array(await jpegBlob.arrayBuffer());
        await invoke('write_unique_file_bytes', {
          directory: outputDir,
          fileName: file.name.replace(/\.hei[cf]$/i, '') + '.jpg',
          bytes: Array.from(buffer)
        });
        ok += 1;
      }
      deps.toast(`HEIC 转换完成：${ok} 个`);
      files = [];
      render();
      close();
    } catch (error) {
      deps.toast(`HEIC 转换失败：${error?.message || error}`);
    }
  });

  bindToolOpen('heic-convert', open);
}

/**
 * @param {{
 *   t: Function,
 *   toast: Function,
 *   escapeHtml: Function,
 *   getOutputDir: Function,
 *   initPlasma: Function,
 *   disposePlasma: Function,
 *   isTauri: boolean,
 *   ensureFfmpegAvailable?: Function,
 *   openWithFfmpegCheck?: Function
 * }} deps
 */
export function initHYExtraTools(deps) {
  initHashTool(deps);
  initJsonTool(deps);
  initDiffTool(deps);
  initImageToPdfTool(deps);
  initImageTransformTool(deps);
  initVideoCompressTool(deps);
  initTextExtractTool(deps);
  initPdfWordTool(deps);
  initHeicTool(deps);
}
