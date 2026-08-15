# HY Desktop · 屏幕截图工具设计

日期：2026-08-09  
状态：待用户审阅规格  
范围：图片分类新增「屏幕截图」；全局快捷键 Ctrl+A

## 1. 目标

在 HY Desktop 图片工具中增加屏幕截图能力：

- 全局快捷键 **Ctrl+A** 唤起截图（应用在后台也可）
- 默认流程为 **框选区域**；工具页另提供 **截取全屏**
- 结果默认：**复制到剪贴板**，并 **自动保存 PNG** 到 HY 输出目录下的 `screenshots/`

## 2. 非目标（本期不做）

- 标注/马赛克/箭头等二次编辑
- 滚动长截图
- 多显示器逐屏独立选择 UI（仍应能覆盖虚拟桌面坐标）
- 可配置快捷键 UI（本期写死 Ctrl+A；后续可加）
- macOS / Linux（本期仅 Windows）

## 3. 用户体验

### 3.1 入口

1. 首页「图片」分类卡片：**屏幕截图**（副文案提示 `Ctrl+A`）
2. 工具页按钮：
   - **开始框选**（与 Ctrl+A 相同流程）
   - **截取全屏**
3. 全局快捷键：Ctrl+A（`tauri-plugin-global-shortcut`）

### 3.2 框选流程

1. 触发后尽量隐藏/最小化主窗口，避免截到 HY 自身
2. Rust 侧先抓取虚拟桌面位图（整屏快照）
3. 显示全屏半透明遮罩 + 背景为刚才的快照
4. 用户拖拽矩形；显示宽×高
5. 确认：鼠标松开（或 Enter）；取消：Esc
6. 按矩形裁剪 → PNG → 剪贴板 + 落盘 → Toast 提示 → 恢复主窗口

### 3.3 全屏流程

与框选相同，但跳过遮罩选择，直接使用整张虚拟桌面快照。

### 3.4 输出

- 剪贴板：PNG 位图
- 文件：`{output_root}/screenshots/hy-shot-YYYYMMDD-HHMMSS.png`  
  `output_root` 复用现有输出目录配置；默认约等于 `Downloads/HY`
- Toast：`已复制到剪贴板，并保存到 …`

### 3.5 快捷键冲突（已知取舍）

用户明确要求 Ctrl+A。注册成功后，HY 运行期间会与系统/其他应用的「全选」冲突。规格接受该取舍；失败时（被占用）Toast 提示注册失败，工具页按钮仍可用。

## 4. 技术方案（方案 A）

参考：[Anonpic](https://github.com/WHots/Anonpic) 的「先快照再遮罩」思路；快捷键用官方 [tauri-plugin-global-shortcut](https://github.com/tauri-apps/tauri-plugin-global-shortcut)。

### 4.1 依赖

- Rust：`tauri-plugin-global-shortcut`、截屏用现有 `windows` crate（GDI/`BitBlt`）或引入 `xcap`（二选一，优先能稳定覆盖多显示器的实现）
- 剪贴板：Windows CF_DIB / PNG 写入（可用 `arboard` 或 Win32）
- 前端：新增工具 overlay + 截图选择层（独立全屏窗口或同窗口全屏层）

### 4.2 推荐窗口模型

- **主窗口**：现有 HY UI  
- **截图 overlay 窗口**（新建）：无边框、置顶、覆盖虚拟屏工作区；加载轻量 `screenshot.html`（或同页路由层）  
  原因：主窗口隐藏后仍需独立 UI 做框选；与 Anonpic 一致更稳

### 4.3 核心命令（Rust）

| 命令 | 作用 |
|------|------|
| `start_region_screenshot` | 隐藏主窗 → 抓屏 → 打开 overlay |
| `start_fullscreen_screenshot` | 隐藏主窗 → 抓屏 → 直接导出 |
| `confirm_screenshot_region { x, y, w, h }` | 裁剪、写剪贴板、落盘、关 overlay、恢复主窗 |
| `cancel_screenshot` | 关 overlay、恢复主窗 |
| `register_screenshot_hotkey` / setup 内注册 | Ctrl+A → `start_region_screenshot` |

权限：在 `capabilities/default.json` 增加 global-shortcut 相关 allow。

### 4.4 前端

- `index.html`：图片分类卡片 + `screenshotOverlay` 工具页（说明、两个按钮、最近保存路径）
- `main.js`：打开工具、调用命令、监听完成事件刷新路径
- `screenshot-overlay` 页：指针拖拽、尺寸标签、Esc/确认
- i18n：`zh.json` / `en.json` 文案

### 4.5 与现有模块衔接

- 输出目录：复用 `get_output_root` / `get_default_output_root`
- 外观：沿用 HY 强调色，遮罩暗色半透明，选区描边用 `--hy-accent`
- 不引入 iLovePDF 或任何云截图服务；全部本地

## 5. 验收标准

1. 运行 HY 后按 Ctrl+A，可进入框选；Esc 取消且主窗恢复  
2. 框选确认后剪贴板可粘贴到画图/Word，且 `screenshots/` 下有 PNG  
3. 工具页「截取全屏」同样复制 + 保存  
4. 图片分类可见「屏幕截图」入口  
5. 若 Ctrl+A 注册失败，按钮流程仍可用，并有错误提示  

## 6. 风险

- Ctrl+A 全局冲突（已接受）  
- 多显示器 DPI / 坐标换算偏差 → 实现时用虚拟屏坐标与物理像素对齐测试  
- 开发版热重载时快捷键重复注册 → setup/卸载时注意 unregister  

## 7. 实现顺序（摘要）

1. 加 global-shortcut 插件与权限  
2. Rust 抓屏 / 裁剪 / 剪贴板 / 落盘  
3. Overlay 窗口与框选 UI  
4. 图片工具入口与 i18n  
5. 手动验收上述标准  
