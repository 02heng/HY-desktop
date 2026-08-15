# HY Desktop · 去水印升级为 MI-GAN

日期：2026-08-09  
状态：已实现（2026-08-09）  
范围：将「去水印」从 OpenCV inpaint 升级为本地 MI-GAN（ONNX）

## 1. 目标

- 保持现有涂抹交互与单张流程
- 用 **MI-GAN pipeline v2**（`onnxruntime-web`）替换 OpenCV Telea/NS
- 首次使用下载并缓存模型；图片不离开本机

## 2. 决策

| 项 | 选择 |
|----|------|
| 模型 | `migan_pipeline_v2.onnx`（Hugging Face `andraniksargsyan/migan`） |
| 参考实现 | [lxfater/inpaint-web](https://github.com/lxfater/inpaint-web) |
| 运行时 | 已有依赖 `onnxruntime-web`；WebGPU 优先，WASM 回退 |
| OpenCV | 移除 `@techstark/opencv-js`（仅去水印使用） |
| 大图 | 最长边 > 2048 时缩小推理，再按遮罩合成回原图 |

## 3. 非目标

- 自动检测水印
- 视频去水印
- 捆绑 LaMa / IOPaint / PyTorch

## 4. 验收

1. 涂抹小面积水印后消除效果明显优于旧 OpenCV
2. 首次有模型下载进度；再次使用走缓存
3. 无 WebGPU 时 WASM 仍可完成
4. NOTICE/README 注明 MI-GAN 与模型来源
