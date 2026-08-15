import {
  AI_LYRICS_COMPLETION,
  AI_LYRICS_LIMITS,
  LYRICS_PROJECT_MAX_FILE_BYTES,
  AiLyricsError,
  buildLyricsMessages,
  buildLyricsReadme,
  clipSourceText,
  countMiniMaxChars,
  hasLyricsProjectContent,
  lyricsFolderNameFromPath,
  lyricsLibraryJoin,
  lyricsSaveErrorMessage,
  normalizeLyricsFileText,
  parseAiLyricsResponse,
  parseLyricsProjectFiles,
  resolveLyricsModel,
  sanitizeLyricsFolderName,
  validateLyricsInput,
  isLyricsInvokeMissing,
  bytesToUtf8,
  advanceLyricsTimeout,
  isLyricsRequestBackgrounded,
  LYRICS_LIBRARY_SUBFOLDER,
  LYRICS_LIBRARY_INDEX_NAME
} from './ai-lyrics-core.js';
import {
  DEFAULT_GENRE_GROUP,
  DEFAULT_GENRE_SUB,
  LYRICS_GENRE_GROUPS,
  genreLabel,
  resolveLyricsGenre
} from './ai-lyrics-genres.js';
import { getLang, onLangChange } from './i18n.js';

const REQUEST_TIMEOUT_MS = AI_LYRICS_COMPLETION.timeoutMs;

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.left = '-9999px';
  document.body.appendChild(area);
  area.select();
  document.execCommand('copy');
  area.remove();
}

async function readSourceFile(path, name) {
  const { invoke } = await import('@tauri-apps/api/core');
  const bytes = new Uint8Array(
    await invoke('read_file_bytes_limited', { path, maxBytes: 8 * 1024 * 1024 })
  );
  const { extractTextFromBytes, getExtractExtension } = await import('./text-extract-core.js');
  const ext = getExtractExtension(name);
  if (!['txt', 'md', 'docx'].includes(ext)) {
    throw new AiLyricsError('unsupported_input', 'Unsupported file type');
  }
  let mammoth;
  if (ext === 'docx') {
    mammoth = await import('mammoth');
  }
  const text = await extractTextFromBytes(name, bytes, { mammoth });
  return clipSourceText(text);
}

/**
 * @param {{
 *   t: Function,
 *   toast: Function,
 *   callAi: Function,
 *   getPlatform: Function,
 *   getModel: Function,
 *   openToolWithAiCheck: Function,
 *   initPlasma: Function,
 *   disposePlasma: Function,
 *   isTauri: boolean,
 *   getOutputDir?: Function,
 *   refreshIcons?: Function
 * }} deps
 */
export function initAiLyricsTool(deps) {
  const overlay = document.getElementById('aiLyricsOverlay');
  const back = document.getElementById('aiLyricsBack');
  const bg = document.getElementById('aiLyricsBg');
  const promptEl = document.getElementById('aiLyricsPrompt');
  const generateBtn = document.getElementById('aiLyricsGenerateBtn');
  const pickBtn = document.getElementById('aiLyricsPickBtn');
  const clearSourceBtn = document.getElementById('aiLyricsClearSourceBtn');
  const sourceMeta = document.getElementById('aiLyricsSourceMeta');
  const resultWrap = document.getElementById('aiLyricsResult');
  const titleEl = document.getElementById('aiLyricsTitle');
  const styleEl = document.getElementById('aiLyricsStyle');
  const lyricsEl = document.getElementById('aiLyricsLyrics');
  const meterEl = document.getElementById('aiLyricsMeter');
  const mask = document.getElementById('aiLyricsMask');
  const maskText = document.getElementById('aiLyricsMaskText');
  const typeGroup = document.getElementById('aiLyricsTypeOptions');
  const langGroup = document.getElementById('aiLyricsLangOptions');
  const genreGroupEl = document.getElementById('aiLyricsGenreGroupOptions');
  const genreSubEl = document.getElementById('aiLyricsGenreSubOptions');
  const saveBtn = document.getElementById('aiLyricsSaveBtn');
  const libraryEmpty = document.getElementById('aiLyricsLibraryEmpty');
  const libraryList = document.getElementById('aiLyricsLibraryList');
  const openLibraryBtn = document.getElementById('aiLyricsOpenLibraryBtn');

  let type = 'original';
  let language = 'zh';
  let genreGroup = DEFAULT_GENRE_GROUP;
  let genreSub = DEFAULT_GENRE_SUB;
  let sourceText = '';
  let sourceName = '';
  let plasmaDispose = null;
  let requestId = 0;
  let controller = null;
  let timeoutId = null;
  let elapsedId = null;
  let visibilityHandler = null;

  const TYPE_I18N = {
    original: 'home.aiLyrics.typeOriginal',
    story: 'home.aiLyrics.typeStory',
    character: 'home.aiLyrics.typeCharacter',
    scene: 'home.aiLyrics.typeScene'
  };
  const LANG_I18N = {
    zh: 'home.aiLyrics.langZh',
    en: 'home.aiLyrics.langEn',
    mixed: 'home.aiLyrics.langMixed'
  };

  function utf8Bytes(text) {
    return new TextEncoder().encode(text).length;
  }

  function textBytes(text) {
    return Array.from(new TextEncoder().encode(text));
  }

  async function nativeInvoke() {
    const { invoke } = await import('@tauri-apps/api/core');
    return invoke;
  }

  async function resolveLibraryRoot() {
    if (typeof deps.getOutputDir === 'function') {
      return deps.getOutputDir(LYRICS_LIBRARY_SUBFOLDER);
    }
    const { invoke } = await nativeInvoke();
    const custom = await invoke('get_output_root');
    const root = typeof custom === 'string' && custom.trim()
      ? custom.trim()
      : await invoke('get_default_output_root');
    return lyricsLibraryJoin(root, LYRICS_LIBRARY_SUBFOLDER);
  }

  function indexPathFor(libraryRoot) {
    return lyricsLibraryJoin(libraryRoot, LYRICS_LIBRARY_INDEX_NAME);
  }

  async function readIndex(invoke, libraryRoot) {
    try {
      const bytes = await invoke('read_file_bytes', { path: indexPathFor(libraryRoot) });
      const parsed = JSON.parse(bytesToUtf8(bytes) || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async function writeIndex(invoke, libraryRoot, items) {
    const payload = JSON.stringify(items, null, 2);
    await invoke('write_file_bytes', {
      path: indexPathFor(libraryRoot),
      bytes: textBytes(payload)
    });
  }

  async function saveProjectFiles(invoke, requestedFull, readme, style, lyrics) {
    try {
      return await invoke('save_lyrics_project', {
        requestedPath: requestedFull,
        readme,
        style,
        lyrics
      });
    } catch (error) {
      if (!isLyricsInvokeMissing(error)) throw error;
      let directory = requestedFull;
      let counter = 2;
      while (await invoke('exists_path', { path: directory })) {
        directory = `${requestedFull}_${counter}`;
        counter += 1;
        if (counter > 10000) throw new Error('Unable to reserve a unique lyrics folder');
      }
      const files = [
        ['README.md', readme],
        ['style.txt', style],
        ['lyrics.txt', lyrics]
      ];
      for (const [name, content] of files) {
        await invoke('write_file_bytes', {
          path: lyricsLibraryJoin(directory, name),
          bytes: textBytes(content)
        });
      }
      return directory;
    }
  }

  function applyProject({ title, style, lyrics }) {
    if (titleEl) titleEl.value = title || '';
    if (styleEl) styleEl.value = style || '';
    if (lyricsEl) lyricsEl.value = lyrics || '';
    if (resultWrap) resultWrap.hidden = false;
    updateMeter();
    deps.refreshIcons?.();
  }

  async function loadProject(path) {
    const invoke = await nativeInvoke();
    try {
      const loaded = await invoke('read_lyrics_project', { directory: path });
      applyProject(parseLyricsProjectFiles({
        readme: loaded.readme,
        style: loaded.style,
        lyrics: loaded.lyrics,
        folderName: loaded.title || lyricsFolderNameFromPath(path)
      }));
      return;
    } catch (error) {
      if (!isLyricsInvokeMissing(error)) throw error;
    }
    const [readmeBytes, styleBytes, lyricsBytes] = await Promise.all([
      invoke('read_file_bytes', { path: lyricsLibraryJoin(path, 'README.md') }).catch(() => []),
      invoke('read_file_bytes', { path: lyricsLibraryJoin(path, 'style.txt') }).catch(() => []),
      invoke('read_file_bytes', { path: lyricsLibraryJoin(path, 'lyrics.txt') }).catch(() => [])
    ]);
    applyProject(parseLyricsProjectFiles({
      readme: bytesToUtf8(readmeBytes),
      style: bytesToUtf8(styleBytes),
      lyrics: bytesToUtf8(lyricsBytes),
      folderName: lyricsFolderNameFromPath(path)
    }));
  }

  function renderLibrary(items) {
    if (!libraryList) return;
    libraryList.replaceChildren();
    const hasItems = Array.isArray(items) && items.length > 0;
    if (libraryEmpty) libraryEmpty.hidden = hasItems;
    if (!hasItems) return;
    for (const item of items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'ai-lyrics-library-item';
      button.dataset.path = item.path;
      const title = document.createElement('span');
      title.className = 'ai-lyrics-library-item-title';
      title.textContent = item.title || item.name || 'untitled-lyrics';
      button.appendChild(title);
      if (item.name && item.name !== item.title) {
        const name = document.createElement('span');
        name.className = 'ai-lyrics-library-item-name';
        name.textContent = item.name;
        button.appendChild(name);
      }
      button.addEventListener('click', async () => {
        try {
          await loadProject(item.path);
          deps.toast(deps.t('home.aiLyrics.libraryLoaded') || '已打开作品');
        } catch (error) {
          deps.toast(lyricsSaveErrorMessage(error, deps.t('home.aiLyrics.libraryLoadFailed') || '打开作品失败'));
        }
      });
      libraryList.appendChild(button);
    }
  }

  async function refreshLibrary() {
    if (!deps.isTauri) {
      renderLibrary([]);
      return;
    }
    try {
      const libraryRoot = await resolveLibraryRoot();
      const invoke = await nativeInvoke();
      try {
        const items = await invoke('list_lyrics_projects', { libraryRoot });
        renderLibrary(Array.isArray(items) ? items : []);
        return;
      } catch (error) {
        if (!isLyricsInvokeMissing(error)) throw error;
      }
      const indexed = await readIndex(invoke, libraryRoot);
      renderLibrary(indexed);
    } catch {
      renderLibrary([]);
    }
  }

  function setChipGroup(group, value) {
    group?.querySelectorAll('[data-value]').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.value === value);
    });
  }

  function renderGenreChips(container, items, selectedId, onSelect) {
    if (!container) return;
    const lang = getLang();
    container.replaceChildren();
    for (const item of items) {
      const btn = document.createElement('button');
      btn.className = 'audio-convert-format-option';
      btn.type = 'button';
      btn.dataset.value = item.id;
      btn.textContent = genreLabel(item, lang);
      if (item.id === selectedId) btn.classList.add('active');
      btn.addEventListener('click', () => onSelect(item.id));
      container.appendChild(btn);
    }
  }

  function renderGenreGroups() {
    renderGenreChips(genreGroupEl, LYRICS_GENRE_GROUPS, genreGroup, (id) => {
      genreGroup = id;
      const group = LYRICS_GENRE_GROUPS.find((item) => item.id === id);
      if (!group?.subs.some((item) => item.id === genreSub)) {
        genreSub = group?.subs[0]?.id || DEFAULT_GENRE_SUB;
      }
      renderGenreGroups();
      renderGenreSubs();
    });
  }

  function renderGenreSubs() {
    const { group, sub } = resolveLyricsGenre(genreGroup, genreSub);
    genreGroup = group.id;
    genreSub = sub.id;
    renderGenreChips(genreSubEl, group.subs, genreSub, (id) => {
      genreSub = id;
      renderGenreSubs();
    });
  }

  function updateMeter() {
    if (!meterEl || !lyricsEl) return;
    const units = countMiniMaxChars(lyricsEl.value);
    meterEl.textContent = deps.t('home.aiLyrics.meter', {
      used: units,
      max: AI_LYRICS_LIMITS.maxMiniMaxUnits
    }) || `${units} / ${AI_LYRICS_LIMITS.maxMiniMaxUnits}`;
    meterEl.classList.toggle('is-over', units > AI_LYRICS_LIMITS.maxMiniMaxUnits);
  }

  function showSourceMeta() {
    if (!sourceMeta) return;
    if (!sourceName) {
      sourceMeta.hidden = true;
      sourceMeta.textContent = '';
      if (clearSourceBtn) clearSourceBtn.hidden = true;
      return;
    }
    sourceMeta.hidden = false;
    sourceMeta.textContent =
      deps.t('home.aiLyrics.sourceLoaded', { name: sourceName, chars: sourceText.length }) ||
      `${sourceName} · ${sourceText.length}`;
    if (clearSourceBtn) clearSourceBtn.hidden = false;
  }

  function resetResult() {
    if (resultWrap) resultWrap.hidden = true;
    if (titleEl) titleEl.value = '';
    if (styleEl) styleEl.value = '';
    if (lyricsEl) lyricsEl.value = '';
    updateMeter();
  }

  function stopTimeoutClock() {
    if (timeoutId !== null) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    if (elapsedId !== null) {
      clearInterval(elapsedId);
      elapsedId = null;
    }
    if (visibilityHandler) {
      document.removeEventListener('visibilitychange', visibilityHandler);
      window.removeEventListener('focus', visibilityHandler);
      window.removeEventListener('blur', visibilityHandler);
      visibilityHandler = null;
    }
  }

  function abortRequest() {
    requestId += 1;
    stopTimeoutClock();
    if (controller) {
      controller.abort();
      controller = null;
    }
    mask?.classList.remove('visible');
  }

  function open() {
    if (!overlay) return;
    overlay.classList.add('visible');
    if (bg && !plasmaDispose) plasmaDispose = deps.initPlasma(bg);
    void refreshLibrary();
  }

  function close() {
    abortRequest();
    overlay?.classList.remove('visible');
    if (plasmaDispose) {
      deps.disposePlasma(plasmaDispose);
      plasmaDispose = null;
    }
  }

  typeGroup?.querySelectorAll('[data-value]').forEach((btn) => {
    btn.addEventListener('click', () => {
      type = btn.dataset.value;
      setChipGroup(typeGroup, type);
    });
  });
  langGroup?.querySelectorAll('[data-value]').forEach((btn) => {
    btn.addEventListener('click', () => {
      language = btn.dataset.value;
      setChipGroup(langGroup, language);
    });
  });

  pickBtn?.addEventListener('click', async () => {
    try {
      if (!deps.isTauri) {
        deps.toast(deps.t('home.aiLyrics.desktopOnly') || '需要桌面端上传文档');
        return;
      }
      const { open: openDialog } = await import('@tauri-apps/plugin-dialog');
      const selected = await openDialog({
        multiple: false,
        filters: [{ name: 'Documents', extensions: ['txt', 'md', 'docx'] }]
      });
      if (!selected) return;
      const path = Array.isArray(selected) ? selected[0] : selected;
      const name = String(path).split(/[/\\]/).pop() || 'document';
      sourceText = await readSourceFile(path, name);
      sourceName = name;
      showSourceMeta();
      deps.toast(deps.t('home.aiLyrics.sourceReady') || '文档已载入');
    } catch (error) {
      sourceText = '';
      sourceName = '';
      showSourceMeta();
      deps.toast(error?.message || String(error));
    }
  });

  clearSourceBtn?.addEventListener('click', () => {
    sourceText = '';
    sourceName = '';
    showSourceMeta();
  });

  lyricsEl?.addEventListener('input', updateMeter);

  generateBtn?.addEventListener('click', async () => {
    try {
      validateLyricsInput({
        type,
        language,
        prompt: promptEl?.value || '',
        sourceText
      });
    } catch (error) {
      if (error instanceof AiLyricsError && error.code === 'empty_input') {
        deps.toast(deps.t('home.aiLyrics.emptyInput') || '请输入提示词或上传文档');
        return;
      }
      deps.toast(error?.message || String(error));
      return;
    }

    abortRequest();
    const currentId = requestId;
    controller = new AbortController();
    let remainingMs = REQUEST_TIMEOUT_MS;
    let lastTick = Date.now();
    const startedAt = lastTick;

    const syncTimeoutClock = () => {
      lastTick = Date.now();
    };
    visibilityHandler = syncTimeoutClock;
    document.addEventListener('visibilitychange', visibilityHandler);
    window.addEventListener('focus', visibilityHandler);
    window.addEventListener('blur', visibilityHandler);

    const tickTimeout = () => {
      if (currentId !== requestId) return;
      const now = Date.now();
      remainingMs = advanceLyricsTimeout(
        remainingMs,
        now - lastTick,
        isLyricsRequestBackgrounded(document)
      );
      lastTick = now;
      if (remainingMs <= 0) {
        controller.abort();
        return;
      }
      timeoutId = setTimeout(tickTimeout, 1000);
    };
    timeoutId = setTimeout(tickTimeout, 1000);

    mask?.classList.add('visible');
    const renderElapsed = () => {
      if (currentId !== requestId || !maskText) return;
      const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
      maskText.textContent = deps.t('home.aiLyrics.generatingElapsed', { seconds })
        || `正在创作歌词… ${seconds} 秒（切走窗口不会中断）`;
    };
    if (maskText) maskText.textContent = deps.t('home.aiLyrics.generating') || '正在创作歌词…';
    elapsedId = setInterval(renderElapsed, 1000);
    renderElapsed();

    try {
      const messages = buildLyricsMessages({
        type,
        language,
        genreGroup,
        genreSub,
        prompt: promptEl?.value || '',
        sourceText,
        sourceName
      });
      const model = resolveLyricsModel(deps.getPlatform(), deps.getModel());
      const raw = await deps.callAi(
        messages,
        controller.signal,
        AI_LYRICS_COMPLETION.maxTokens,
        model,
        { thinking: AI_LYRICS_COMPLETION.thinking, frequencyPenalty: AI_LYRICS_COMPLETION.frequencyPenalty }
      );
      if (currentId !== requestId) return;
      const result = parseAiLyricsResponse(raw);
      if (titleEl) titleEl.value = result.title;
      if (styleEl) styleEl.value = result.style;
      if (lyricsEl) lyricsEl.value = result.lyrics;
      if (resultWrap) resultWrap.hidden = false;
      updateMeter();
      deps.refreshIcons?.();
    } catch (error) {
      if (currentId !== requestId) return;
      if (controller?.signal.aborted) {
        deps.toast(deps.t('home.aiLyrics.requestTimeout') || '生成超时，请稍后重试');
      } else if (error instanceof AiLyricsError) {
        deps.toast(
          error.code === 'result_too_large'
            ? deps.t('home.aiLyrics.resultTooLarge') || '返回内容过长'
            : deps.t('home.aiLyrics.parseError') || '解析歌词失败，请重试'
        );
      } else {
        deps.toast(error?.message || deps.t('home.aiLyrics.networkError') || '生成失败');
      }
    } finally {
      if (currentId === requestId) {
        stopTimeoutClock();
        controller = null;
        mask?.classList.remove('visible');
      }
    }
  });

  async function copyField(text, okKey) {
    const value = (text || '').trim();
    if (!value) {
      deps.toast(deps.t('home.aiLyrics.nothingToCopy') || '没有可复制的内容');
      return;
    }
    try {
      await copyText(value);
      deps.toast(deps.t(okKey) || '已复制');
    } catch {
      deps.toast(deps.t('home.aiLyrics.copyFailed') || '复制失败');
    }
  }

  document.getElementById('aiLyricsCopyTitle')?.addEventListener('click', () => {
    void copyField(titleEl?.value, 'home.aiLyrics.copiedTitle');
  });
  document.getElementById('aiLyricsCopyStyle')?.addEventListener('click', () => {
    void copyField(styleEl?.value, 'home.aiLyrics.copiedStyle');
  });
  document.getElementById('aiLyricsCopyLyrics')?.addEventListener('click', () => {
    void copyField(lyricsEl?.value, 'home.aiLyrics.copiedLyrics');
  });
  document.getElementById('aiLyricsCopyAll')?.addEventListener('click', () => {
    const title = titleEl?.value?.trim() || '';
    const style = styleEl?.value?.trim() || '';
    const lyrics = lyricsEl?.value?.trim() || '';
    const packed = [`# ${title}`, '', '## Style', style, '', '## Lyrics', lyrics].join('\n');
    void copyField(packed, 'home.aiLyrics.copiedAll');
  });

  saveBtn?.addEventListener('click', async () => {
    const title = titleEl?.value || '';
    const style = normalizeLyricsFileText(styleEl?.value || '');
    const lyrics = normalizeLyricsFileText(lyricsEl?.value || '');
    if (!hasLyricsProjectContent({ title, style, lyrics })) {
      deps.toast(deps.t('home.aiLyrics.nothingToSave') || '没有可保存的内容');
      return;
    }
    if (!deps.isTauri) {
      deps.toast(deps.t('home.aiLyrics.saveDesktopOnly') || '保存作品需要桌面端');
      return;
    }
    const { group, sub } = resolveLyricsGenre(genreGroup, genreSub);
    const lang = getLang();
    const readme = buildLyricsReadme({
      title,
      typeLabel: deps.t(TYPE_I18N[type] || TYPE_I18N.original),
      languageLabel: deps.t(LANG_I18N[language] || LANG_I18N.zh),
      genreLabel: `${genreLabel(group, lang)} / ${genreLabel(sub, lang)}`,
      prompt: promptEl?.value || '',
      sourceName
    });
    if ([readme, style, lyrics].some((part) => utf8Bytes(part) > LYRICS_PROJECT_MAX_FILE_BYTES)) {
      deps.toast(deps.t('home.aiLyrics.saveFailed') || '保存失败');
      return;
    }
    saveBtn.disabled = true;
    try {
      const libraryRoot = await resolveLibraryRoot();
      const requestedFull = lyricsLibraryJoin(libraryRoot, sanitizeLyricsFolderName(title));
      const invoke = await nativeInvoke();
      const savedPath = await saveProjectFiles(invoke, requestedFull, readme, style, lyrics);
      try {
        const indexed = await readIndex(invoke, libraryRoot);
        const nextItem = {
          path: savedPath,
          name: lyricsFolderNameFromPath(savedPath),
          title: title.trim() || lyricsFolderNameFromPath(savedPath),
          modified_at: Date.now()
        };
        await writeIndex(invoke, libraryRoot, [
          nextItem,
          ...indexed.filter((item) => item?.path !== savedPath)
        ]);
      } catch {
        /* listing can still use list_lyrics_projects */
      }
      deps.toast(deps.t('home.aiLyrics.saved', { path: savedPath }) || `已保存到 ${savedPath}`);
      await refreshLibrary();
    } catch (error) {
      deps.toast(
        lyricsSaveErrorMessage(error, deps.t('home.aiLyrics.saveFailed') || '保存失败')
      );
    } finally {
      saveBtn.disabled = false;
    }
  });

  openLibraryBtn?.addEventListener('click', async () => {
    if (!deps.isTauri) {
      deps.toast(deps.t('home.aiLyrics.saveDesktopOnly') || '保存作品需要桌面端');
      return;
    }
    try {
      const libraryRoot = await resolveLibraryRoot();
      const invoke = await nativeInvoke();
      try {
        await invoke('open_path', { path: libraryRoot });
      } catch {
        await writeIndex(invoke, libraryRoot, await readIndex(invoke, libraryRoot));
        await invoke('open_path', { path: libraryRoot });
      }
    } catch (error) {
      deps.toast(lyricsSaveErrorMessage(error, deps.t('home.aiLyrics.saveFailed') || '打开失败'));
    }
  });

  back?.addEventListener('click', close);
  document.querySelectorAll('.audio-list-item[data-tool="ai-lyrics"]').forEach((item) => {
    item.addEventListener('click', () => deps.openToolWithAiCheck(open));
    item.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        deps.openToolWithAiCheck(open);
      }
    });
  });

  setChipGroup(typeGroup, type);
  setChipGroup(langGroup, language);
  renderGenreGroups();
  renderGenreSubs();
  onLangChange(() => {
    renderGenreGroups();
    renderGenreSubs();
  });
  showSourceMeta();
  resetResult();
}
