# Lyrics Local Save Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After the user confirms in Lyrics Studio, save the current title, style, and lyrics into a unique local project folder under the app export directory.

**Architecture:** Pure JS helpers in `ai-lyrics-core.js` assemble folder names and file text. The UI shows a Save button, opens the existing Tauri save dialog with a default path, then calls one Rust command `save_lyrics_project` that creates a unique empty directory and writes `README.md`, `style.txt`, and `lyrics.txt`. Any write failure deletes that new directory.

**Tech Stack:** Tauri 2 (`invoke`, `plugin-dialog` save), Rust `std::fs`, Vite JS modules, existing `npm run test:ai-lyrics` plus `cargo test`.

## Global Constraints

- Spec: `docs/superpowers/specs/2026-08-14-lyrics-local-save-design.md`
- Do not call MiniMax audio APIs
- Do not auto-save on generate
- Do not overwrite existing folders or files; first collision is `{name}_2`, then `{name}_3`
- Do not write uploaded novel/article body into the export folder
- Desktop only; web toast uses `home.aiLyrics.desktopOnly`
- Each of README / style / lyrics max 1 MiB UTF-8
- Files are UTF-8, no BOM, newlines `\n`
- `dialog:allow-save` already exists in `toolknit-desktop/src-tauri/capabilities/default.json`
- Skip git commit steps unless the user explicitly asked to commit
- Answer the user in Chinese when reporting progress

## File map

| File | Responsibility |
|---|---|
| `toolknit-desktop/src/ai-lyrics-core.js` | `sanitizeLyricsFolderName`, `hasLyricsProjectContent`, `normalizeLyricsFileText`, `buildLyricsReadme` |
| `toolknit-desktop/scripts/test-ai-lyrics-core.mjs` | Node assertions for the helpers |
| `toolknit-desktop/src-tauri/src/lib.rs` | `save_lyrics_project` + unique dir + cleanup tests; register in `generate_handler!` |
| `toolknit-desktop/index.html` | Save button in result actions |
| `toolknit-desktop/src/ai-lyrics-ui.js` | Dialog, invoke, toasts |
| `toolknit-desktop/src/locales/zh.json` | Chinese copy |
| `toolknit-desktop/src/locales/en.json` | English copy |
| `toolknit-desktop/src/help-data.js` | Chinese help sentence |
| `toolknit-desktop/src/help-data-en.js` | English help sentence |

---

### Task 1: Core helpers (folder name + README)

**Files:**
- Modify: `toolknit-desktop/src/ai-lyrics-core.js`
- Test: `toolknit-desktop/scripts/test-ai-lyrics-core.mjs`

**Interfaces:**
- Consumes: existing `AiLyricsError` / limits (do not change generate/parse behavior)
- Produces:
  - `export const LYRICS_PROJECT_MAX_FILE_BYTES = 1024 * 1024`
  - `export function sanitizeLyricsFolderName(raw: string): string`
  - `export function hasLyricsProjectContent({ title, style, lyrics }): boolean`
  - `export function normalizeLyricsFileText(value: string): string`
  - `export function buildLyricsReadme({ title, typeLabel, languageLabel, prompt, sourceName }): string`

- [ ] **Step 1: Write the failing assertions**

Append to `toolknit-desktop/scripts/test-ai-lyrics-core.mjs` (keep existing asserts). Import the new symbols:

```js
import {
  AI_LYRICS_LIMITS,
  AI_LYRICS_TYPES,
  AiLyricsError,
  buildLyricsMessages,
  buildLyricsReadme,
  clipSourceText,
  countMiniMaxChars,
  hasLyricsProjectContent,
  normalizeAiLyricsResult,
  normalizeLyricsFileText,
  parseAiLyricsResponse,
  resolveLyricsModel,
  sanitizeLyricsFolderName,
  validateLyricsInput
} from '../src/ai-lyrics-core.js';

assert.equal(sanitizeLyricsFolderName(''), 'untitled-lyrics');
assert.equal(sanitizeLyricsFolderName('   '), 'untitled-lyrics');
assert.equal(sanitizeLyricsFolderName('雨夜离开'), '雨夜离开');
assert.equal(sanitizeLyricsFolderName('a/b\\c:d*e?f"g<h>i|j'), 'c_d_e_f_g_h_i_j');
assert.equal(sanitizeLyricsFolderName('demo.md'), 'demo');
assert.equal(sanitizeLyricsFolderName('demo.txt'), 'demo');
assert.equal(sanitizeLyricsFolderName('song.markdown'), 'song');
assert.equal(sanitizeLyricsFolderName('ends.'), 'ends');
assert.equal(sanitizeLyricsFolderName(`${'n'.repeat(120)}.md`).length, 96);
assert.equal(hasLyricsProjectContent({ title: '', style: '', lyrics: '' }), false);
assert.equal(hasLyricsProjectContent({ title: '  ', style: '', lyrics: '' }), false);
assert.equal(hasLyricsProjectContent({ title: '', style: 'A ballad', lyrics: '' }), true);
assert.equal(normalizeLyricsFileText('a\r\nb\rc'), 'a\nb\nc');

const readme = buildLyricsReadme({
  title: '雨夜离开',
  typeLabel: '原创歌曲',
  languageLabel: '中文',
  prompt: '克制、不煽情',
  sourceName: 'novel.txt',
  sourceText: '整本小说正文不应该出现'
});
assert.match(readme, /^# 雨夜离开\n/);
assert.match(readme, /- Type: 原创歌曲\n/);
assert.match(readme, /- Language: 中文\n/);
assert.match(readme, /## Prompt\n\n克制、不煽情\n/);
assert.match(readme, /## Source\n\nnovel.txt\n/);
assert.equal(readme.includes('整本小说'), false);

const emptyReadme = buildLyricsReadme({
  title: '',
  typeLabel: '故事主题曲',
  languageLabel: '英文',
  prompt: '  ',
  sourceName: ''
});
assert.match(emptyReadme, /^# untitled-lyrics\n/);
assert.match(emptyReadme, /## Prompt\n\n\(empty\)\n/);
assert.match(emptyReadme, /## Source\n\n\(none\)\n/);
```

The `a/b\\c:...` case: take the last path segment first (`c:d*e?f"g<h>i|j`), then replace illegal chars → `c_d_e_f_g_h_i_j`.

- [ ] **Step 2: Run test to verify it fails**

Run from `toolknit-desktop`:

```bash
npm run test:ai-lyrics
```

Expected: FAIL (missing export `sanitizeLyricsFolderName` or similar).

- [ ] **Step 3: Implement helpers in `ai-lyrics-core.js`**

Add after `AI_LYRICS_LANGUAGES`:

```js
export const LYRICS_PROJECT_MAX_FILE_BYTES = 1024 * 1024;
```

Add before `parseAiLyricsResponse`:

```js
const ILLEGAL_FOLDER_CHARS = /[\\/:*?"<>|\u0000]/g;
const STRIP_FOLDER_EXT = /\.(?:md|txt|markdown)$/i;

export function hasLyricsProjectContent({ title, style, lyrics } = {}) {
  return [title, style, lyrics].some((value) => typeof value === 'string' && value.trim().length > 0);
}

export function normalizeLyricsFileText(value) {
  return String(value ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

export function sanitizeLyricsFolderName(raw) {
  const source = typeof raw === 'string' ? raw : '';
  const last = source.replace(/\\/g, '/').split('/').pop() || '';
  const withoutExt = last.replace(STRIP_FOLDER_EXT, '');
  const replaced = withoutExt.replace(ILLEGAL_FOLDER_CHARS, (ch) => (
    ch === '/' || ch === '\\' ? '_' : '_'
  )).replace(/[\u0000-\u001F\u007F]/g, '_');
  const trimmed = replaced.trim().replace(/\.+$/g, '').trim();
  const clipped = trimmed.slice(0, 96);
  return clipped || 'untitled-lyrics';
}

export function buildLyricsReadme({
  title,
  typeLabel,
  languageLabel,
  prompt,
  sourceName
} = {}) {
  const heading = typeof title === 'string' && title.trim() ? title.trim() : 'untitled-lyrics';
  const type = typeof typeLabel === 'string' && typeLabel.trim() ? typeLabel.trim() : '(empty)';
  const language = typeof languageLabel === 'string' && languageLabel.trim() ? languageLabel.trim() : '(empty)';
  const promptBody = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : '(empty)';
  const sourceBody = typeof sourceName === 'string' && sourceName.trim() ? sourceName.trim() : '(none)';
  return [
    `# ${heading}`,
    '',
    `- Type: ${type}`,
    `- Language: ${language}`,
    '',
    '## Prompt',
    '',
    promptBody,
    '',
    '## Source',
    '',
    sourceBody,
    ''
  ].join('\n');
}
```

Ignore any `sourceText` argument. `sanitizeLyricsFolderName` must use last path segment so `a/b\\c:d...` becomes `c_d_e_f_g_h_i_j`.

- [ ] **Step 4: Run tests and make sure they pass**

```bash
npm run test:ai-lyrics
```

Expected: `AI lyrics core regression checks passed`

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add toolknit-desktop/src/ai-lyrics-core.js toolknit-desktop/scripts/test-ai-lyrics-core.mjs
git commit -m "test: add lyrics project folder helpers"
```

---

### Task 2: Rust `save_lyrics_project`

**Files:**
- Modify: `toolknit-desktop/src-tauri/src/lib.rs` (insert the command just before `write_unique_file_bytes` around line 9228; add tests next to `paired_file_write_tests`; add `save_lyrics_project` to `tauri::generate_handler!` next to `write_unique_file_bytes`)

**Interfaces:**
- Consumes: existing `is_path_safe`
- Produces: Tauri command

```rust
#[tauri::command]
fn save_lyrics_project(
    requested_path: String,
    readme: String,
    style: String,
    lyrics: String,
) -> Result<String, String>
```

Frontend invoke:

```js
await invoke('save_lyrics_project', {
  requestedPath,
  readme,
  style,
  lyrics
})
```

Returns the created directory path string. Unique names: requested stem, then `{stem}_2`, `{stem}_3`, ...

- [ ] **Step 1: Write failing Rust tests**

Insert after `paired_file_write_tests` (after its closing `}`):

```rust
#[cfg(test)]
mod lyrics_project_save_tests {
    use super::*;

    fn test_directory() -> std::path::PathBuf {
        let suffix = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .expect("clock must be after epoch")
            .as_nanos();
        let directory = std::env::temp_dir().join(format!("toolknit-lyrics-output-{}", suffix));
        std::fs::create_dir_all(&directory).expect("create test directory");
        directory
    }

    #[test]
    fn save_lyrics_project_writes_three_files() {
        let parent = test_directory();
        let requested = parent.join("雨夜离开");
        let saved = save_lyrics_project(
            requested.to_string_lossy().into_owned(),
            "# 雨夜离开\n".to_string(),
            "A ballad\n".to_string(),
            "[Verse]\n雨还在下\n".to_string(),
        )
        .expect("save lyrics project");
        let dir = std::path::PathBuf::from(&saved);
        assert_eq!(dir.file_name().unwrap(), "雨夜离开");
        assert_eq!(
            std::fs::read_to_string(dir.join("README.md")).unwrap(),
            "# 雨夜离开\n"
        );
        assert_eq!(
            std::fs::read_to_string(dir.join("style.txt")).unwrap(),
            "A ballad\n"
        );
        assert_eq!(
            std::fs::read_to_string(dir.join("lyrics.txt")).unwrap(),
            "[Verse]\n雨还在下\n"
        );
        std::fs::remove_dir_all(&parent).expect("cleanup");
    }

    #[test]
    fn save_lyrics_project_uses_underscore_two_when_name_exists() {
        let parent = test_directory();
        let first_path = parent.join("雨夜离开");
        std::fs::create_dir_all(&first_path).expect("occupy first name");
        let saved = save_lyrics_project(
            first_path.to_string_lossy().into_owned(),
            "readme".to_string(),
            "style".to_string(),
            "lyrics".to_string(),
        )
        .expect("save unique lyrics project");
        assert!(saved.ends_with("雨夜离开_2") || saved.ends_with("雨夜离开_2\\") || saved.contains("雨夜离开_2"));
        let dir = std::path::PathBuf::from(&saved);
        assert!(dir.join("lyrics.txt").is_file());
        assert!(first_path.join("lyrics.txt").exists() == false);
        std::fs::remove_dir_all(&parent).expect("cleanup");
    }

    #[test]
    fn save_lyrics_project_removes_dir_when_a_file_write_is_blocked() {
        let parent = test_directory();
        let requested = parent.join("blocked-song");
        std::fs::create_dir_all(&requested).expect("occupy requested name so unique dir is _2");
        // After unique dir is created as blocked-song_2, writing README.md must fail.
        // Pre-create blocked-song_2/README.md as a directory via a race-free helper:
        // First call succeeds on blocked-song_2; instead block by making parent unwritable is OS-specific.
        // Use commit helper: create unique dir then plant a directory named README.md.
        let unique = create_unique_lyrics_directory(&parent, "blocked-song").expect("unique dir");
        std::fs::create_dir(unique.join("README.md")).expect("block README write");
        let result = commit_lyrics_project_dir(
            unique.clone(),
            "readme".to_string(),
            "style".to_string(),
            "lyrics".to_string(),
        );
        assert!(result.is_err());
        assert!(!unique.exists());
        std::fs::remove_dir_all(&parent).expect("cleanup");
    }

    #[test]
    fn save_lyrics_project_rejects_oversized_payload() {
        let parent = test_directory();
        let requested = parent.join("huge");
        let huge = "x".repeat(1024 * 1024 + 1);
        let result = save_lyrics_project(
            requested.to_string_lossy().into_owned(),
            huge,
            "s".to_string(),
            "l".to_string(),
        );
        assert!(result.is_err());
        assert!(!requested.exists());
        std::fs::remove_dir_all(&parent).expect("cleanup");
    }
}
```

- [ ] **Step 2: Run tests to verify they fail**

From `toolknit-desktop/src-tauri`:

```bash
cargo test --lib lyrics_project_save_tests -- --nocapture
```

Expected: FAIL compiling (`save_lyrics_project` / `create_unique_lyrics_directory` / `commit_lyrics_project_dir` not found).

- [ ] **Step 3: Implement the command**

Place helpers + command immediately above `write_unique_file_bytes`. Use `create_dir` (not `create_dir_all` on the leaf) so an existing file or directory at the candidate path is treated as a collision.

```rust
const LYRICS_PROJECT_MAX_FILE_BYTES: usize = 1024 * 1024;

fn lyrics_folder_stem(requested_path: &std::path::Path) -> Result<String, String> {
    let raw = requested_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("")
        .trim();
    let stripped = raw
        .strip_suffix(".markdown")
        .or_else(|| raw.strip_suffix(".md"))
        .or_else(|| raw.strip_suffix(".txt"))
        .or_else(|| raw.strip_suffix(".MD"))
        .or_else(|| raw.strip_suffix(".TXT"))
        .unwrap_or(raw);
    let mut cleaned: String = stripped
        .chars()
        .map(|character| {
            if matches!(
                character,
                '\\' | '/' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '\0'
            ) || character.is_control()
            {
                '_'
            } else {
                character
            }
        })
        .collect();
    while cleaned.ends_with('.') || cleaned.ends_with(' ') {
        cleaned.pop();
    }
    let clipped: String = cleaned.chars().take(96).collect();
    if clipped.is_empty() {
        Ok("untitled-lyrics".to_string())
    } else {
        Ok(clipped)
    }
}

fn create_unique_lyrics_directory(
    parent: &std::path::Path,
    stem: &str,
) -> Result<std::path::PathBuf, String> {
    std::fs::create_dir_all(parent).map_err(|error| format!("Failed to create directory: {error}"))?;
    for counter in 0..10_000_u32 {
        let name = if counter == 0 {
            stem.to_string()
        } else {
            format!("{}_{}", stem, counter + 1)
        };
        let candidate = parent.join(name);
        match std::fs::create_dir(&candidate) {
            Ok(()) => return Ok(candidate),
            Err(error) if error.kind() == std::io::ErrorKind::AlreadyExists => continue,
            Err(error) => return Err(format!("Failed to create lyrics folder: {error}")),
        }
    }
    Err("Unable to reserve a unique lyrics folder".to_string())
}

fn write_lyrics_project_contents(
    directory: &std::path::Path,
    readme: &str,
    style: &str,
    lyrics: &str,
) -> Result<(), String> {
    let files = [
        ("README.md", readme),
        ("style.txt", style),
        ("lyrics.txt", lyrics),
    ];
    for (name, content) in files {
        std::fs::write(directory.join(name), content.as_bytes())
            .map_err(|error| format!("Failed to write {name}: {error}"))?;
    }
    Ok(())
}

fn commit_lyrics_project_dir(
    directory: std::path::PathBuf,
    readme: String,
    style: String,
    lyrics: String,
) -> Result<String, String> {
    if let Err(error) = write_lyrics_project_contents(&directory, &readme, &style, &lyrics) {
        let _ = std::fs::remove_dir_all(&directory);
        return Err(error);
    }
    Ok(directory.to_string_lossy().into_owned())
}

#[tauri::command]
fn save_lyrics_project(
    requested_path: String,
    readme: String,
    style: String,
    lyrics: String,
) -> Result<String, String> {
    if requested_path.contains('\0')
        || readme.len() > LYRICS_PROJECT_MAX_FILE_BYTES
        || style.len() > LYRICS_PROJECT_MAX_FILE_BYTES
        || lyrics.len() > LYRICS_PROJECT_MAX_FILE_BYTES
    {
        return Err("Invalid lyrics project".to_string());
    }
    let requested = std::path::PathBuf::from(&requested_path);
    let parent = requested
        .parent()
        .filter(|path| !path.as_os_str().is_empty())
        .ok_or_else(|| "Invalid lyrics folder".to_string())?;
    is_path_safe(parent)?;
    let stem = lyrics_folder_stem(&requested)?;
    let directory = create_unique_lyrics_directory(parent, &stem)?;
    commit_lyrics_project_dir(directory, readme, style, lyrics)
}
```

Register in `generate_handler!` immediately after `write_unique_file_bytes`:

```rust
            write_unique_file_bytes,
            save_lyrics_project,
```

Case-insensitive `.md` strip: if `strip_suffix(".md")` misses `.MD`, the extra `.MD` / `.TXT` arms cover Windows save-dialog extensions. Also handle `.Markdown` by checking with `to_ascii_lowercase()` on the extension instead if the suffix chain is brittle:

Prefer this stem implementation if the suffix chain fails tests:

```rust
    let file_name = requested_path
        .file_name()
        .and_then(|value| value.to_str())
        .unwrap_or("");
    let path_for_ext = std::path::Path::new(file_name);
    let stem_raw = match path_for_ext
        .extension()
        .and_then(|value| value.to_str())
        .map(|value| value.to_ascii_lowercase())
        .as_deref()
    {
        Some("md" | "txt" | "markdown") => path_for_ext
            .file_stem()
            .and_then(|value| value.to_str())
            .unwrap_or(file_name),
        _ => file_name,
    };
```

Use the extension-based version in the actual implementation.

- [ ] **Step 4: Run tests and make sure they pass**

```bash
cargo test --lib lyrics_project_save_tests -- --nocapture
```

Expected: all 4 tests `ok`.

Also keep `paired_file_write_tests` passing:

```bash
cargo test --lib paired_file_write_tests -- --nocapture
```

- [ ] **Step 5: Commit (only if the user asked)**

```bash
git add toolknit-desktop/src-tauri/src/lib.rs
git commit -m "feat: save lyrics projects to unique local folders"
```

---

### Task 3: UI, i18n, help

**Files:**
- Modify: `toolknit-desktop/index.html` (result actions around `aiLyricsCopyAll`)
- Modify: `toolknit-desktop/src/ai-lyrics-ui.js`
- Modify: `toolknit-desktop/src/locales/zh.json` (`home.aiLyrics`)
- Modify: `toolknit-desktop/src/locales/en.json` (`home.aiLyrics`)
- Modify: `toolknit-desktop/src/help-data.js` (`ai-lyrics` steps)
- Modify: `toolknit-desktop/src/help-data-en.js` (`ai-lyrics` steps)

**Interfaces:**
- Consumes: Task 1 helpers; Task 2 `save_lyrics_project`; existing `get_output_root`, `get_default_output_root`; `@tauri-apps/plugin-dialog` `save`
- Produces: visible Save button after generate; no generate-path changes

- [ ] **Step 1: Add locale strings**

In both locale files, inside `home.aiLyrics`, after `copyFailed`:

`zh.json`:

```json
      "saveLocal": "保存到本地",
      "saving": "正在保存…",
      "saved": "已保存到 {path}",
      "saveFailed": "保存失败",
      "nothingToSave": "没有可保存的内容",
      "saveDialogTitle": "保存歌词作品文件夹"
```

`en.json`:

```json
      "saveLocal": "Save locally",
      "saving": "Saving…",
      "saved": "Saved to {path}",
      "saveFailed": "Save failed",
      "nothingToSave": "Nothing to save",
      "saveDialogTitle": "Save lyrics project folder"
```

Keep valid JSON (no trailing comma issues). If `zh.json` has a UTF-8 BOM, preserve the file's existing encoding.

- [ ] **Step 2: Add the button in `index.html`**

Inside `#aiLyricsResult .ai-lyrics-result-actions`, after Copy All:

```html
              <button class="settings-btn" id="aiLyricsSaveBtn" type="button" data-i18n="home.aiLyrics.saveLocal">保存到本地</button>
```

- [ ] **Step 3: Wire save in `ai-lyrics-ui.js`**

Extend the import:

```js
import {
  AI_LYRICS_LIMITS,
  AiLyricsError,
  buildLyricsMessages,
  buildLyricsReadme,
  clipSourceText,
  countMiniMaxChars,
  hasLyricsProjectContent,
  normalizeLyricsFileText,
  parseAiLyricsResponse,
  resolveLyricsModel,
  sanitizeLyricsFolderName,
  validateLyricsInput
} from './ai-lyrics-core.js';
```

After `const langGroup = ...` add:

```js
  const saveBtn = document.getElementById('aiLyricsSaveBtn');
```

Add type/language label maps using i18n keys:

```js
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

  async function resolveExportRoot() {
    const { invoke } = await import('@tauri-apps/api/core');
    const custom = await invoke('get_output_root');
    if (typeof custom === 'string' && custom.trim()) return custom.trim();
    return invoke('get_default_output_root');
  }

  function joinPath(root, name) {
    const base = String(root || '').replace(/[\\/]+$/, '');
    const sep = base.includes('/') && !base.includes('\\') ? '/' : '\\';
    return `${base}${sep}${name}`;
  }

  saveBtn?.addEventListener('click', async () => {
    const title = titleEl?.value || '';
    const style = normalizeLyricsFileText(styleEl?.value || '');
    const lyrics = normalizeLyricsFileText(lyricsEl?.value || '');
    if (!hasLyricsProjectContent({ title, style, lyrics })) {
      deps.toast(deps.t('home.aiLyrics.nothingToSave') || '没有可保存的内容');
      return;
    }
    if (!deps.isTauri) {
      deps.toast(deps.t('home.aiLyrics.desktopOnly') || '需要桌面端');
      return;
    }
    const readme = buildLyricsReadme({
      title,
      typeLabel: deps.t(TYPE_I18N[type] || TYPE_I18N.original),
      languageLabel: deps.t(LANG_I18N[language] || LANG_I18N.zh),
      prompt: promptEl?.value || '',
      sourceName
    });
    if ([readme, style, lyrics].some((part) => utf8Bytes(part) > 1024 * 1024)) {
      deps.toast(deps.t('home.aiLyrics.saveFailed') || '保存失败');
      return;
    }
    try {
      const root = await resolveExportRoot();
      const { save: saveDialog } = await import('@tauri-apps/plugin-dialog');
      const selected = await saveDialog({
        defaultPath: joinPath(root, sanitizeLyricsFolderName(title)),
        title: deps.t('home.aiLyrics.saveDialogTitle') || '保存歌词作品文件夹'
      });
      if (!selected) return;
      const selectedPath = Array.isArray(selected) ? selected[0] : selected;
      if (!selectedPath) return;
      const normalizedSelected = String(selectedPath).replace(/[\\/]+$/, '');
      const folderName = sanitizeLyricsFolderName(normalizedSelected);
      const sepIndex = Math.max(
        normalizedSelected.lastIndexOf('\\'),
        normalizedSelected.lastIndexOf('/')
      );
      const parentDir = sepIndex > 0 ? normalizedSelected.slice(0, sepIndex) : root;
      const requestedFull = joinPath(parentDir, folderName);
      const { invoke } = await import('@tauri-apps/api/core');
      const savedPath = await invoke('save_lyrics_project', {
        requestedPath: requestedFull,
        readme,
        style,
        lyrics
      });
      deps.toast(deps.t('home.aiLyrics.saved', { path: savedPath }));
    } catch (error) {
      deps.toast(error?.message || deps.t('home.aiLyrics.saveFailed') || '保存失败');
    }
  });
```

`deps.t` already interpolates `{path}` the same way as `home.aiLyrics.meter`.

- [ ] **Step 4: Help text**

`help-data.js` add a fifth step and extend the note:

```html
        <li>确认后点击“保存到本地”，选择或改名作品文件夹；将写入 README.md、style.txt、lyrics.txt</li>
```

Note append: `确认后可保存为本地作品文件夹，仍不上传、不生成音频。`

`help-data-en.js`:

```html
        <li>When you are happy with the text, choose Save locally. You can rename the folder. HY writes README.md, style.txt, and lyrics.txt</li>
```

Note append: `Saving stores a local project folder only. Audio is never uploaded or generated.`

- [ ] **Step 5: Verify tests still pass**

From `toolknit-desktop`:

```bash
npm run test:ai-lyrics
npm run test:help
```

Expected: both pass.

If the app is already running via `tauri dev`, generate lyrics, click Save, confirm the dialog, then check the folder contains the three files and a second save of the same name creates `_2`.

- [ ] **Step 6: Commit (only if the user asked)**

```bash
git add toolknit-desktop/index.html toolknit-desktop/src/ai-lyrics-ui.js toolknit-desktop/src/locales/zh.json toolknit-desktop/src/locales/en.json toolknit-desktop/src/help-data.js toolknit-desktop/src/help-data-en.js
git commit -m "feat: save confirmed lyrics projects locally"
```

---

## Spec coverage

| Spec section | Task |
|---|---|
| Confirm-then-save, not auto-save | Task 3 button only |
| Default export dir + rename in save dialog | Task 3 `get_output_root` / `save` |
| `README.md` `style.txt` `lyrics.txt` | Task 1 + 2 |
| Unique `_2` `_3`, no overwrite | Task 2 |
| Sanitize + untitled-lyrics + strip md/txt | Task 1 + 2 |
| No novel body | Task 1 `buildLyricsReadme` ignores `sourceText` |
| Desktop only | Task 3 |
| 1 MiB limit | Task 2 + 3 utf8 check |
| Cleanup on write failure | Task 2 `commit_lyrics_project_dir` |
| i18n / help | Task 3 |
| `npm run test:ai-lyrics` | Task 1 / 3 |
