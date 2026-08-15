use std::path::PathBuf;
use std::sync::Mutex;

use serde::Serialize;
use tauri::{
    AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, PhysicalSize, Position, Size,
};

#[derive(Clone)]
struct PendingCapture {
    rgba: Vec<u8>,
    width: u32,
    height: u32,
    preview_path: PathBuf,
}

#[derive(Clone)]
struct SavedMainGeometry {
    x: i32,
    y: i32,
    width: u32,
    height: u32,
}

pub struct ScreenshotState {
    pending: Mutex<Option<PendingCapture>>,
    saved_main: Mutex<Option<SavedMainGeometry>>,
}

impl Default for ScreenshotState {
    fn default() -> Self {
        Self {
            pending: Mutex::new(None),
            saved_main: Mutex::new(None),
        }
    }
}

#[derive(Clone, Serialize)]
pub struct ScreenshotResult {
    pub path: String,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Serialize)]
pub struct ScreenshotPreviewInfo {
    pub path: String,
    pub width: u32,
    pub height: u32,
}

fn display_path(path: &std::path::Path) -> String {
    let text = path.to_string_lossy().into_owned();
    #[cfg(target_os = "windows")]
    {
        if let Some(rest) = text.strip_prefix(r"\\?\UNC\") {
            return format!(r"\\{}", rest);
        }
        if let Some(rest) = text.strip_prefix(r"\\?\") {
            return rest.to_string();
        }
    }
    text
}

fn screenshots_dir() -> Result<PathBuf, String> {
    let root = if let Some(custom) = crate::configured_output_root() {
        custom
    } else {
        let downloads = dirs::download_dir()
            .or_else(dirs::document_dir)
            .ok_or("Cannot find a default output folder")?;
        downloads.join("HY")
    };
    let dir = root.join("screenshots");
    std::fs::create_dir_all(&dir)
        .map_err(|error| format!("Cannot create screenshots folder: {error}"))?;
    Ok(dir)
}

fn local_timestamp() -> String {
    #[cfg(target_os = "windows")]
    {
        use windows::Win32::System::SystemInformation::GetLocalTime;
        let st = unsafe { GetLocalTime() };
        return format!(
            "{:04}{:02}{:02}-{:02}{:02}{:02}",
            st.wYear, st.wMonth, st.wDay, st.wHour, st.wMinute, st.wSecond
        );
    }
    #[cfg(not(target_os = "windows"))]
    {
        use std::time::{SystemTime, UNIX_EPOCH};
        let secs = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .map(|d| d.as_secs())
            .unwrap_or(0);
        format!("{secs}")
    }
}

#[cfg(target_os = "windows")]
fn capture_virtual_screen_rgba() -> Result<(Vec<u8>, u32, u32, i32, i32), String> {
    use windows::Win32::Foundation::HWND;
    use windows::Win32::Graphics::Gdi::{
        BitBlt, CreateCompatibleBitmap, CreateCompatibleDC, DeleteDC, DeleteObject, GetDC,
        GetDIBits, ReleaseDC, SelectObject, BITMAPINFO, BITMAPINFOHEADER, BI_RGB, DIB_RGB_COLORS,
        HGDIOBJ, SRCCOPY,
    };
    use windows::Win32::UI::WindowsAndMessaging::{
        GetSystemMetrics, SM_CXVIRTUALSCREEN, SM_CYVIRTUALSCREEN, SM_XVIRTUALSCREEN,
        SM_YVIRTUALSCREEN,
    };

    unsafe {
        let origin_x = GetSystemMetrics(SM_XVIRTUALSCREEN);
        let origin_y = GetSystemMetrics(SM_YVIRTUALSCREEN);
        let width = GetSystemMetrics(SM_CXVIRTUALSCREEN);
        let height = GetSystemMetrics(SM_CYVIRTUALSCREEN);
        if width <= 0 || height <= 0 {
            return Err("Invalid virtual screen size".to_string());
        }

        let hdc_screen = GetDC(HWND::default());
        if hdc_screen.is_invalid() {
            return Err("GetDC failed".to_string());
        }
        let hdc_mem = CreateCompatibleDC(hdc_screen);
        if hdc_mem.is_invalid() {
            ReleaseDC(HWND::default(), hdc_screen);
            return Err("CreateCompatibleDC failed".to_string());
        }
        let bitmap = CreateCompatibleBitmap(hdc_screen, width, height);
        if bitmap.is_invalid() {
            let _ = DeleteDC(hdc_mem);
            ReleaseDC(HWND::default(), hdc_screen);
            return Err("CreateCompatibleBitmap failed".to_string());
        }
        let old = SelectObject(hdc_mem, HGDIOBJ(bitmap.0));
        if BitBlt(
            hdc_mem,
            0,
            0,
            width,
            height,
            hdc_screen,
            origin_x,
            origin_y,
            SRCCOPY,
        )
        .is_err()
        {
            SelectObject(hdc_mem, old);
            let _ = DeleteObject(HGDIOBJ(bitmap.0));
            let _ = DeleteDC(hdc_mem);
            ReleaseDC(HWND::default(), hdc_screen);
            return Err("BitBlt failed".to_string());
        }

        let mut info = BITMAPINFO {
            bmiHeader: BITMAPINFOHEADER {
                biSize: std::mem::size_of::<BITMAPINFOHEADER>() as u32,
                biWidth: width,
                biHeight: -height,
                biPlanes: 1,
                biBitCount: 32,
                biCompression: BI_RGB.0,
                biSizeImage: 0,
                biXPelsPerMeter: 0,
                biYPelsPerMeter: 0,
                biClrUsed: 0,
                biClrImportant: 0,
            },
            bmiColors: [Default::default()],
        };
        let mut bgra = vec![0u8; (width as usize) * (height as usize) * 4];
        let copied = GetDIBits(
            hdc_mem,
            bitmap,
            0,
            height as u32,
            Some(bgra.as_mut_ptr().cast()),
            &mut info,
            DIB_RGB_COLORS,
        );

        SelectObject(hdc_mem, old);
        let _ = DeleteObject(HGDIOBJ(bitmap.0));
        let _ = DeleteDC(hdc_mem);
        ReleaseDC(HWND::default(), hdc_screen);

        if copied == 0 {
            return Err("GetDIBits failed".to_string());
        }

        for pixel in bgra.chunks_exact_mut(4) {
            pixel.swap(0, 2);
            pixel[3] = 255;
        }

        Ok((bgra, width as u32, height as u32, origin_x, origin_y))
    }
}

#[cfg(not(target_os = "windows"))]
fn capture_virtual_screen_rgba() -> Result<(Vec<u8>, u32, u32, i32, i32), String> {
    Err("Screenshot is only available on Windows".to_string())
}

fn encode_png(rgba: &[u8], width: u32, height: u32) -> Result<Vec<u8>, String> {
    let image = image::RgbaImage::from_raw(width, height, rgba.to_vec())
        .ok_or("Invalid image buffer")?;
    let mut bytes = Vec::new();
    let mut cursor = std::io::Cursor::new(&mut bytes);
    image::DynamicImage::ImageRgba8(image)
        .write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|error| format!("PNG encode failed: {error}"))?;
    Ok(bytes)
}

fn write_preview_png(rgba: &[u8], width: u32, height: u32) -> Result<PathBuf, String> {
    let path = std::env::temp_dir().join(format!("hy-screenshot-preview-{}.png", local_timestamp()));
    let png = encode_png(rgba, width, height)?;
    std::fs::write(&path, png).map_err(|error| format!("Cannot write preview: {error}"))?;
    Ok(path)
}

fn copy_rgba_to_clipboard(rgba: &[u8], width: u32, height: u32) -> Result<(), String> {
    let mut clipboard =
        arboard::Clipboard::new().map_err(|error| format!("Clipboard unavailable: {error}"))?;
    clipboard
        .set_image(arboard::ImageData {
            width: width as usize,
            height: height as usize,
            bytes: std::borrow::Cow::Borrowed(rgba),
        })
        .map_err(|error| format!("Cannot copy screenshot: {error}"))
}

fn save_png_file(rgba: &[u8], width: u32, height: u32) -> Result<PathBuf, String> {
    let dir = screenshots_dir()?;
    let path = dir.join(format!("hy-shot-{}.png", local_timestamp()));
    let png = encode_png(rgba, width, height)?;
    std::fs::write(&path, png).map_err(|error| format!("Cannot save screenshot: {error}"))?;
    Ok(path)
}

fn crop_rgba(
    rgba: &[u8],
    width: u32,
    height: u32,
    x: u32,
    y: u32,
    w: u32,
    h: u32,
) -> Result<Vec<u8>, String> {
    if w == 0 || h == 0 {
        return Err("Selection is empty".to_string());
    }
    if x >= width || y >= height {
        return Err("Selection out of bounds".to_string());
    }
    let w = w.min(width - x);
    let h = h.min(height - y);
    let mut out = vec![0u8; (w as usize) * (h as usize) * 4];
    for row in 0..h {
        let src_start = (((y + row) * width + x) * 4) as usize;
        let dst_start = ((row * w) * 4) as usize;
        let len = (w * 4) as usize;
        out[dst_start..dst_start + len].copy_from_slice(&rgba[src_start..src_start + len]);
    }
    Ok(out)
}

fn hide_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.hide();
    }
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn screenshot_state(app: &AppHandle) -> Result<tauri::State<'_, ScreenshotState>, String> {
    Ok(app.state::<ScreenshotState>())
}

fn save_main_geometry(app: &AppHandle) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window missing".to_string())?;
    let pos = window
        .outer_position()
        .map_err(|error| format!("Cannot read window position: {error}"))?;
    let size = window
        .outer_size()
        .map_err(|error| format!("Cannot read window size: {error}"))?;
    let state = screenshot_state(app)?;
    let mut guard = state
        .saved_main
        .lock()
        .map_err(|_| "Screenshot state locked".to_string())?;
    *guard = Some(SavedMainGeometry {
        x: pos.x,
        y: pos.y,
        width: size.width,
        height: size.height,
    });
    Ok(())
}

fn restore_main_geometry(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let saved = screenshot_state(app)
        .ok()
        .and_then(|state| state.saved_main.lock().ok()?.take());
    // Hide before resizing: a transparent fullscreen WebView otherwise leaves a
    // DWM "ghost" of the previous page (e.g. 去水印) floating on the desktop.
    let _ = window.hide();
    let _ = window.set_always_on_top(false);
    // Match tauri.conf.json main window constraints.
    let _ = window.set_min_size(Some(Size::Logical(LogicalSize::new(1210.0, 780.0))));
    if let Some(geo) = saved {
        let _ = window.set_size(Size::Physical(PhysicalSize::new(geo.width, geo.height)));
        let _ = window.set_position(Position::Physical(PhysicalPosition::new(geo.x, geo.y)));
    } else {
        let _ = window.set_size(Size::Logical(LogicalSize::new(1210.0, 780.0)));
    }
    let _ = window.set_resizable(false);
    let _ = window.unminimize();
    let _ = window.show();
    let _ = window.set_focus();
}

fn clear_pending(state: &ScreenshotState) {
    if let Ok(mut guard) = state.pending.lock() {
        if let Some(pending) = guard.take() {
            let _ = std::fs::remove_file(pending.preview_path);
        }
    }
}

fn end_region_ui(app: &AppHandle) {
    let _ = app.emit("screenshot-region-close", ());
    restore_main_geometry(app);
}

fn finalize_rgba(
    app: &AppHandle,
    state: &ScreenshotState,
    rgba: Vec<u8>,
    width: u32,
    height: u32,
) -> Result<ScreenshotResult, String> {
    if let Err(error) = copy_rgba_to_clipboard(&rgba, width, height) {
        log::warn!("Screenshot clipboard copy failed: {error}");
    }
    let path = save_png_file(&rgba, width, height)?;
    clear_pending(state);
    end_region_ui(app);
    let result = ScreenshotResult {
        path: display_path(&path),
        width,
        height,
    };
    let _ = app.emit("screenshot-finished", &result);
    Ok(result)
}

async fn present_region_ui(
    app: &AppHandle,
    origin_x: i32,
    origin_y: i32,
    width: u32,
    height: u32,
    preview_path: &std::path::Path,
) -> Result<(), String> {
    let window = app
        .get_webview_window("main")
        .ok_or_else(|| "Main window missing".to_string())?;

    // Geometry was saved before capture hide; only unlock + cover here.
    let _ = window.set_resizable(true);
    let _ = window.set_min_size(None::<Size>);
    let _ = window.set_always_on_top(true);
    window
        .set_size(Size::Physical(PhysicalSize::new(width, height)))
        .map_err(|error| format!("Cannot resize for screenshot: {error}"))?;
    window
        .set_position(Position::Physical(PhysicalPosition::new(origin_x, origin_y)))
        .map_err(|error| format!("Cannot move for screenshot: {error}"))?;
    let _ = window.unminimize();
    window
        .show()
        .map_err(|error| format!("Cannot show screenshot UI: {error}"))?;
    let _ = window.set_focus();

    let info = ScreenshotPreviewInfo {
        path: display_path(preview_path),
        width,
        height,
    };
    app.emit("screenshot-region-open", &info)
        .map_err(|error| format!("Cannot open screenshot UI: {error}"))?;
    Ok(())
}

/// Export a cropped region of the pending capture as PNG base64 (for annotate / mosaic).
#[tauri::command]
pub fn export_pending_region_png_base64(
    app: AppHandle,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> Result<String, String> {
    use base64::Engine;
    let state = screenshot_state(&app)?;
    let guard = state
        .pending
        .lock()
        .map_err(|_| "Screenshot state locked".to_string())?;
    let pending = guard
        .as_ref()
        .ok_or_else(|| "No pending screenshot".to_string())?;
    let cropped = crop_rgba(
        &pending.rgba,
        pending.width,
        pending.height,
        x,
        y,
        width,
        height,
    )?;
    let out_w = width.min(pending.width.saturating_sub(x));
    let out_h = height.min(pending.height.saturating_sub(y));
    let png = encode_png(&cropped, out_w, out_h)?;
    Ok(base64::engine::general_purpose::STANDARD.encode(png))
}

#[tauri::command]
pub async fn start_region_screenshot(app: AppHandle) -> Result<(), String> {
    // Save while still at normal size — after hide/resize Windows can report wrong bounds.
    let _ = save_main_geometry(&app);
    hide_main_window(&app);
    // Brief delay so the main window disappears before capture.
    tokio::time::sleep(std::time::Duration::from_millis(160)).await;

    let (rgba, width, height, origin_x, origin_y) = match capture_virtual_screen_rgba() {
        Ok(value) => value,
        Err(error) => {
            show_main_window(&app);
            return Err(error);
        }
    };
    let preview_path = match write_preview_png(&rgba, width, height) {
        Ok(path) => path,
        Err(error) => {
            show_main_window(&app);
            return Err(error);
        }
    };

    {
        let state = screenshot_state(&app)?;
        let mut guard = state
            .pending
            .lock()
            .map_err(|_| "Screenshot state locked".to_string())?;
        *guard = Some(PendingCapture {
            rgba,
            width,
            height,
            preview_path: preview_path.clone(),
        });
    }

    if let Err(error) =
        present_region_ui(&app, origin_x, origin_y, width, height, &preview_path).await
    {
        if let Ok(state) = screenshot_state(&app) {
            clear_pending(&state);
        }
        end_region_ui(&app);
        return Err(error);
    }
    Ok(())
}

#[tauri::command]
pub async fn start_fullscreen_screenshot(app: AppHandle) -> Result<ScreenshotResult, String> {
    let _ = save_main_geometry(&app);
    hide_main_window(&app);
    tokio::time::sleep(std::time::Duration::from_millis(160)).await;

    let (rgba, width, height, _x, _y) = match capture_virtual_screen_rgba() {
        Ok(value) => value,
        Err(error) => {
            show_main_window(&app);
            return Err(error);
        }
    };
    let state = screenshot_state(&app)?;
    finalize_rgba(&app, &state, rgba, width, height)
}

#[tauri::command]
pub fn get_screenshot_preview_path(app: AppHandle) -> Result<ScreenshotPreviewInfo, String> {
    let state = screenshot_state(&app)?;
    let guard = state
        .pending
        .lock()
        .map_err(|_| "Screenshot state locked".to_string())?;
    let pending = guard
        .as_ref()
        .ok_or_else(|| "No screenshot preview available".to_string())?;
    Ok(ScreenshotPreviewInfo {
        path: display_path(&pending.preview_path),
        width: pending.width,
        height: pending.height,
    })
}

#[tauri::command]
pub fn confirm_screenshot_region(
    app: AppHandle,
    x: u32,
    y: u32,
    width: u32,
    height: u32,
) -> Result<ScreenshotResult, String> {
    let pending = {
        let state = screenshot_state(&app)?;
        let mut guard = state
            .pending
            .lock()
            .map_err(|_| "Screenshot state locked".to_string())?;
        guard
            .take()
            .ok_or_else(|| "No pending screenshot".to_string())?
    };
    let _ = std::fs::remove_file(&pending.preview_path);
    let cropped = match crop_rgba(
        &pending.rgba,
        pending.width,
        pending.height,
        x,
        y,
        width,
        height,
    ) {
        Ok(value) => value,
        Err(error) => {
            end_region_ui(&app);
            return Err(error);
        }
    };
    let out_w = width.min(pending.width.saturating_sub(x));
    let out_h = height.min(pending.height.saturating_sub(y));
    let state = screenshot_state(&app)?;
    finalize_rgba(&app, &state, cropped, out_w, out_h)
}

#[tauri::command]
pub fn cancel_screenshot(app: AppHandle) -> Result<(), String> {
    if let Ok(state) = screenshot_state(&app) {
        clear_pending(&state);
    }
    end_region_ui(&app);
    Ok(())
}

/// Finish screenshot with a frontend-composited PNG (includes annotations).
/// Prefer base64 to avoid huge JSON number-arrays over IPC.
#[tauri::command]
pub fn complete_screenshot_png(
    app: AppHandle,
    data_base64: String,
) -> Result<ScreenshotResult, String> {
    use base64::Engine;
    let bytes = base64::engine::general_purpose::STANDARD
        .decode(data_base64.trim())
        .map_err(|error| format!("Invalid screenshot payload: {error}"))?;
    if bytes.is_empty() {
        return Err("Empty screenshot".to_string());
    }
    let image = image::load_from_memory(&bytes)
        .map_err(|error| format!("Invalid PNG: {error}"))?
        .into_rgba8();
    let width = image.width();
    let height = image.height();
    let rgba = image.into_raw();
    let state = screenshot_state(&app)?;
    clear_pending(&state);
    if let Err(error) = copy_rgba_to_clipboard(&rgba, width, height) {
        log::warn!("Screenshot clipboard copy failed: {error}");
    }
    let path = {
        let dir = screenshots_dir()?;
        let path = dir.join(format!("hy-shot-{}.png", local_timestamp()));
        std::fs::write(&path, &bytes).map_err(|error| format!("Cannot save screenshot: {error}"))?;
        path
    };
    end_region_ui(&app);
    let result = ScreenshotResult {
        path: display_path(&path),
        width,
        height,
    };
    let _ = app.emit("screenshot-finished", &result);
    Ok(result)
}
