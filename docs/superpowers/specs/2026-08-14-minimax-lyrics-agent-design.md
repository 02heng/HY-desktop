# HY Desktop · MiniMax 歌词智能体

日期：2026-08-14  
状态：已实现（2026-08-14）  
范围：AI 分类新增「歌词创作」，输出可复制到 MiniMax Music 的歌词与风格

## 1. 目标

用设置里的 API Key 调用 **deepseek-v4-flash**（DeepSeek 平台时强制该模型），生成适配 MiniMax Music 高级模式的：

- 歌名
- 风格提示词（英文叙述句）
- 带结构标签的歌词

用户可在结果区微调，并一键复制歌词 / 风格 / 全部。不调用 MiniMax 出歌 API。本地作品文件夹见 [歌词作品本地保存](./2026-08-14-lyrics-local-save-design.md)。

## 2. 非目标

- 嵌入 DeepSeek Harness / Hermes Agent 运行时
- MiniMax 音频生成
- 自动检测水印类无关能力

## 3. 交互

1. 选择类型：原创 / 故事主题曲 / 人物主题曲 / 场景主题曲  
2. 选择语言：中文 / 英文 / 中英混  
3. 输入提示词（可选，与文档至少填一项）  
4. 可选上传 `.txt` `.md` `.docx` `.pdf`，本地抽文本后作为故事/人物素材  
5. 生成 → 右侧可编辑歌名、风格、歌词  
6. 复制到 MiniMax 官网粘贴

## 4. 格式约束（MiniMax 指南）

- 歌词结构标签：`[Intro]` `[Verse]` `[Pre-chorus]` `[Chorus]` `[Hook]` `[Drop]` `[Bridge]` `[Solo]` `[Build-up]` `[Instrumental]` `[Breakdown]` `[Break]` `[Interlude]` `[Outro]`
- MiniMax 歌词计量：汉字 2、其它字符 1，上限 3500
- 风格：英文句子，含情绪/曲风/人声/场景/乐器，上限 2000 字符
