# HY 功能路线图

基于 Apache-2.0 的 ToolKnit Desktop 改造；网页端专有源码不拷贝。  
策略：**仓库已有 → 保留改造；缺失 → 本地从零实现**。

品牌：HY（不使用 ToolKnit 商标/域名）。

## 已有（来自上游，改造中）

PDF：合并 / 拆分 / 转图 / 旋转 / 加解密 / 压缩 / 增强  
图像：格式转换 / 压缩 / 长图拼接 / 图标生成  
音频：格式转换 / BPM / 剪辑 / 视频抽音  
视频：格式转换 / 单帧 / GIF  
文本：转写 / 统计 / 格式化  
计算：BMI / 时间戳 / 房贷 / 利息 / 密码  
创意：配色提取 / 打字测试  
AI：润色 / 翻译 / 文档 / 表格  
其它：硬件信息、大文件清理、CLI/MCP

## 本阶段新增（High）

| 工具 | 状态 | 实现 |
|------|------|------|
| 图片转 PDF | 进行中 | pdf-lib + 本地文件 |
| 调整尺寸 | 进行中 | Rust `image` crate |
| 翻转/旋转 | 进行中 | Rust `image` crate |
| 九宫格切图 | 进行中 | Rust `image` crate |
| 图片裁剪 | 进行中 | Rust 矩形裁剪（先坐标版） |
| 哈希生成 | 进行中 | Web Crypto + MD5 |
| JSON 格式化 | 进行中 | 纯 JS |
| 文本对比 | 进行中 | 纯 JS LCS/行 diff |
| 视频压缩 | 计划中 | 复用 FFmpeg CRF 预设 |
| 文本提取 | 计划中 | pdfjs + mammoth |
| HEIC→JPG | 计划中 | libheif / heic-convert |
| 背景移除 | 计划中 | 本地 ONNX |
| PDF↔Word | 计划中 | docx + pdf-lib / 后续 sidecar |

## Medium / Low

见缺口分析：二维码、渐变、签名、像素画、丝网半色调（MIT 独立仓库可移植）、节拍器、番茄钟、单位换算等。按使用频率分批补齐。

## 合规要点

1. 保留 Apache-2.0 与上游版权声明（NOTICE）。
2. 不使用 ToolKnit 名称/Logo/官网素材做对外品牌。
3. 不逆向 toolknit.com 专有前端源码。
4. 第三方库（FFmpeg、qpdf、Whisper 等）遵守各自许可证。
