# HY Desktop

本地优先的 Windows 多功能文件工具箱。

PDF / 图片 / 音视频 / 文本 / AI 辅助能力集于一处，默认本机处理，不上传文件到陌生服务器。

## 功能概览

- **PDF**：合并、拆分、转图、旋转、加解密、压缩、增强、PDF↔Word（文本版）
- **图片**：格式转换、压缩、长图拼接、图标生成、图片转 PDF、变换、HEIC→JPG、屏幕截图、抠图、去水印
- **音视频**：格式转换、剪辑、BPM、抽音、单帧、GIF、视频压缩、离线转写
- **文本**：统计、格式化、JSON、对比、哈希、文本提取
- **其它**：计算器、创意小工具、硬件信息、大文件清理、AI 润色/翻译/文档/表格

## 安装

1. 从 [Releases](https://github.com/02heng/HY-desktop/releases) 下载 `HY_*_x64-setup.exe`
2. 双击安装，从开始菜单启动 **HY**

也可直接运行绿色版 `HY.exe`。

## 开发

```powershell
cd toolknit-desktop
npm ci
# 需要 Rust + Visual Studio C++ Build Tools
npm run tauri dev
```

打包安装程序：

```powershell
npm run tauri build
# 产物：src-tauri/target/release/bundle/nsis/HY_*_x64-setup.exe
```

## 许可与致谢

Apache License 2.0（主项目）。

「图片抠图」集成 [@imgly/background-removal](https://github.com/imgly/background-removal-js)（**AGPL-3.0**）。若分发包含该功能的安装包，需自行遵守 AGPL 义务。详见 [NOTICE](NOTICE)。

「去水印」使用 [MI-GAN](https://github.com/Picsart-AI-Research/MI-GAN)（ONNX）本地推理，模型首次按需下载并缓存；推理路径参考 [inpaint-web](https://github.com/lxfater/inpaint-web)。

本项目基于 [ToolKnit Desktop](https://github.com/ZihangDong/toolknit-desktop) 改造扩展，并保留其 Apache-2.0 许可声明；不使用 ToolKnit 商标与品牌标识。
