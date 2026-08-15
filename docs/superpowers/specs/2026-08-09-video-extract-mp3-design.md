# Video category: Extract MP3 (reuse audio extract)

## Goal
Add a video-tools entry that opens the existing audio-extract overlay with MP3 pre-selected.

## Behavior
- New list item under video tools: `data-tool="video-extract-mp3"`
- Click/keyboard opens existing `audioExtractOverlay`
- Default output format = MP3; user can still change format
- Audio-category "音频提取" unchanged

## Implementation
- `index.html`: list item + i18n keys
- `main.js`: bind open → existing open handler + select MP3 format option
- No changes to `audio-extract-core` / FFmpeg pipeline
