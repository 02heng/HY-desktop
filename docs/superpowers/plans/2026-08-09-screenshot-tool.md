# Screenshot Tool Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add region/fullscreen screenshot to HY image tools with global Ctrl+A, clipboard copy + save under `screenshots/`.

**Architecture:** Rust captures virtual desktop (GDI), optional borderless overlay window for drag-select, then crop → PNG → clipboard (`arboard`) + disk. Hotkey via `tauri-plugin-global-shortcut`.

**Tech Stack:** Tauri 2, Windows GDI, `image`, `arboard`, `tauri-plugin-global-shortcut`, Vite multi-page overlay.

## Files

| File | Role |
|------|------|
| `src-tauri/src/screenshot.rs` | Capture, crop, clipboard, save, overlay lifecycle |
| `src-tauri/src/lib.rs` | Register module, commands, hotkey setup |
| `src-tauri/Cargo.toml` | Deps |
| `src-tauri/capabilities/default.json` | Overlay window + shortcut permissions |
| `screenshot.html` + `src/screenshot-overlay.js` + CSS | Selection UI |
| `vite.config.js` | Multi-page input |
| `index.html` / `main.js` / locales | Tool entry |

## Tasks

### Task 1: Rust capture + export pipeline
- [x] Add `arboard`, `tauri-plugin-global-shortcut`
- [x] Implement `screenshot.rs`: virtual screen capture, PNG encode, save to `{output}/screenshots/`, clipboard
- [x] Commands: `start_region_screenshot`, `start_fullscreen_screenshot`, `confirm_screenshot_region`, `cancel_screenshot`, `get_screenshot_preview_path`

### Task 2: Overlay window + hotkey
- [x] Create/show `screenshot-overlay` WebviewWindow covering virtual screen
- [x] Register Ctrl+A in setup; emit/start region flow
- [x] Capabilities + vite page

### Task 3: Frontend tool entry
- [x] Image list card + tool overlay with Region / Fullscreen buttons
- [x] i18n zh/en; listen completion toast

### Task 4: Manual verify
- [ ] Ctrl+A region, Esc cancel, fullscreen button, clipboard paste, file exists
