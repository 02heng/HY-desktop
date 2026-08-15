# HY Desktop · 图片抠图 & 去水印设计

日期：2026-08-09  
状态：已实现（2026-08-09）  
范围：图片分类新增「图片抠图」「去水印」

## 1. 目标

1. **图片抠图**：本地 AI 去除背景，输出透明 PNG  
2. **去水印**：用户画笔涂抹水印区域，本地图像修补后导出  

全部在设备本地完成，不上传业务图片到第三方处理服务（模型资源可按需下载到本机缓存）。

## 2. 已确认决策

| 项 | 选择 |
|----|------|
| 抠图方案 | `@imgly/background-removal` + `onnxruntime-web`（效果优先） |
| 抠图许可 | **AGPL-3.0**；用户接受，需在 NOTICE/README 披露并对分发合规负责 |
| 去水印交互 | 涂抹消除（不做自动检测） |
| 去水印算法 | MI-GAN（ONNX / onnxruntime-web）；见 `2026-08-09-watermark-migan-design.md` |
| 批量 | 本期单张 |

## 3. 非目标

- 自动检测水印  
- 视频抠图 / 去水印  
- 精细手动修边（发丝级编辑器）  
- 云端 API 抠图  

## 4. 用户体验

### 4.1 图片抠图

1. 图片分类卡片：「图片抠图」  
2. 上传 JPG/PNG/WebP  
3. 首次使用提示将下载 ONNX/WASM 资源（可显示进度）  
4. 处理中显示进度；完成后棋盘格预览透明图  
5. 保存到 `{output_root}/image-matting/hy-matting-时间戳.png`  
6. 可选：复制结果预览 / 打开输出目录  

### 4.2 去水印

1. 图片分类卡片：「去水印」  
2. 上传图片后进入画布  
3. 工具：画笔尺寸、清除遮罩、执行消除、撤销（至少支持清除重涂）  
4. 涂抹区域为「待消除」遮罩（半透明高亮）  
5. 点击「开始消除」→ OpenCV inpaint → 预览  
6. 保存到 `{output_root}/watermark-remove/hy-nowm-时间戳.png`  

## 5. 技术方案

### 5.1 抠图

- 依赖：`@imgly/background-removal`、`onnxruntime-web`（按官方 peer 版本钉死）  
- 配置：`publicPath` 指向可缓存的本地/CDN；优先本机缓存目录（如 AppData/HY/models/background-removal）或 Vite `public` 静态资源  
- 核心模块：`src/image-matting-core.js` + 工具页逻辑（可放 `hy-extra-tools.js` 或独立 init）  
- 注意 CSP：`tauri.conf.json` 需允许 wasm / worker / blob（按 imgly 运行时要求调整）  
- 许可文件：根目录 `NOTICE`、`README` 增加 AGPL 组件说明  

### 5.2 去水印

- 依赖：`@techstark/opencv-js` 或官方 `opencv.js` 构建（选维护活跃、可 npm 安装的包）  
- 流程：ImageData → mask（涂抹=255）→ `cv.inpaint` → Canvas 导出 PNG  
- 核心：`src/watermark-remove-core.js`（纯函数：inpaintFromImageData）便于单测  

### 5.3 UI 接入

- `index.html`：两个 list item + 两个 overlay（风格对齐现有图片工具）  
- `zh.json` / `en.json` 文案  
- Lucide 图标：抠图可用 `scissors` / `person-standing`；去水印可用 `eraser`  

## 6. 验收标准

1. 抠图：人物/物体照片可得到透明背景 PNG，并成功保存  
2. 去水印：对角标/文字水印涂抹后，区域被修补，文件可保存  
3. 工具出现在图片分类列表  
4. README/NOTICE 写明 imgly AGPL  
5. 无网络时首次抠图有明确下载/失败提示（若走远程 publicPath）  

## 7. 风险

- **AGPL**：分发 HY 安装包时法律义务更严；需用户知情（已确认接受）  
- imgly 模型体积约数十 MB，首次较慢  
- OpenCV inpaint 对大面积/纹理复杂水印效果有限（产品文案需说明「适合小面积水印」）  
- CSP / COOP / wasm 路径在 Tauri WebView 下可能需调试  

## 8. 实现顺序

1. 去水印（OpenCV 涂抹）— 依赖清晰、易验收  
2. 抠图（imgly）— 处理模型路径、CSP、AGPL 声明  
3. i18n + 列表入口 + 手动验收  
