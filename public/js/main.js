/**
* Web Demo by Philip Newborough
* More info: https://philipnewborough.co.uk/demos/
*/

// ── Theme toggle ─────────────────────────────────────────────────────────────
(function () {
    const btn  = document.getElementById('btn-theme');
    const icon = document.getElementById('theme-icon');
    if (!btn || !icon) return;

    function applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        icon.className = theme === 'dark' ? 'bi bi-sun-fill' : 'bi bi-moon-stars-fill';
        btn.title = theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode';
    }

    // Sync icon with theme already applied by the inline script
    applyTheme(document.documentElement.getAttribute('data-theme') || 'dark');

    btn.addEventListener('click', function () {
        const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', next);
        applyTheme(next);
    });
})();

// Simple toast notification
function notify_send(title, message, type = 'info') {
    let container = document.querySelector('.notify-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notify-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `notify-toast ${type}`;
    toast.innerHTML = `<strong>${title}</strong>${message}`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}
// Get elements
const btnUpload   = document.getElementById('btn-upload');
const btnSafeZone = document.getElementById('btn-safe-zone');
const fileInput = document.getElementById('upload');
const canvas512 = document.getElementById('canvas-512');
const canvas256 = document.getElementById('canvas-256');
const canvas192 = document.getElementById('canvas-192');
const canvas180 = document.getElementById('canvas-180');
const canvas152 = document.getElementById('canvas-152');
const canvas144 = document.getElementById('canvas-144');
const canvas128 = document.getElementById('canvas-128');
const canvas96 = document.getElementById('canvas-96');
const canvas64 = document.getElementById('canvas-64');
const canvas48 = document.getElementById('canvas-48');
const canvas32 = document.getElementById('canvas-32');
const canvas16 = document.getElementById('canvas-16');
let size = null;
let canvas = null;
let ctx = null;
let originalCanvas512DataUrl = null;
let currentShape = null;
const iconSources = new Map(); // canvasId → raw (un-shaped) dataUrl for individually-uploaded icons
const iconShapes  = new Map(); // canvasId → shape override for individual icons

// Trigger upload
btnUpload.addEventListener('click', function(){
    fileInput.click();
});

// Reset to unicorn
function resetToUnicorn() {
    document.getElementById('btn-reset').disabled = true;
    const img = new Image();
    img.onload = function () {
        [[canvas512, 512], [canvas256, 256], [canvas192, 192],
         [canvas180, 180], [canvas152, 152], [canvas144, 144],
         [canvas128, 128], [canvas96,  96],  [canvas64,  64],
         [canvas48,  48],  [canvas32,  32],  [canvas16,  16]
        ].forEach(([c, s]) => {
            const cx = c.getContext('2d');
            cx.clearRect(0, 0, s, s);
            cx.imageSmoothingEnabled = true;
            cx.imageSmoothingQuality = 'high';
            cx.drawImage(img, 0, 0, s, s);
        });
        originalCanvas512DataUrl = null;
        currentShape = null;
        const rb = document.getElementById('btn-edit-restore');
        if (rb) rb.disabled = true;
        localStorage.removeItem('pwa_icon');
        iconSources.clear();
        iconShapes.clear();
        updateShapePreviews();
    };
    img.src = 'img/icon-512x512.png';
}
document.getElementById('btn-reset').addEventListener('click', resetToUnicorn);

// ── Safe zone overlay toggle ──────────────────────────────────────────────────
btnSafeZone.addEventListener('click', function () {
    const tabIcons = document.getElementById('tab-icons');
    const active   = tabIcons.classList.toggle('safe-zone-active');
    btnSafeZone.classList.toggle('btn-active', active);
});

// ── Safe zone info popover ────────────────────────────────────────────────────
(function () {
    const infoBtn = document.getElementById('btn-safe-zone-info');
    const popover = document.getElementById('safe-zone-popover');
    const closeBtn = document.getElementById('safe-zone-popover-close');
    if (!infoBtn || !popover) return;

    function openPopover() {
        popover.classList.add('open');
        popover.setAttribute('aria-hidden', 'false');
    }
    function closePopover() {
        popover.classList.remove('open');
        popover.setAttribute('aria-hidden', 'true');
    }

    infoBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        popover.classList.contains('open') ? closePopover() : openPopover();
    });

    if (closeBtn) closeBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        closePopover();
    });

    document.addEventListener('click', function (e) {
        if (!popover.contains(e.target) && e.target !== infoBtn) {
            closePopover();
        }
    });

    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closePopover();
    });
})();

// ── Shape preview rendering ───────────────────────────────────────────────────
function clipSquircle(ctx, size) {
    // iOS-style superellipse (n ≈ 5)
    const n  = 5;
    const cx = size / 2, cy = size / 2;
    const r  = size / 2;
    ctx.beginPath();
    for (let i = 0; i <= 360; i++) {
        const angle = (i * Math.PI) / 180;
        const cos   = Math.cos(angle);
        const sin   = Math.sin(angle);
        const px    = cx + r * Math.sign(cos) * Math.pow(Math.abs(cos), 2 / n);
        const py    = cy + r * Math.sign(sin) * Math.pow(Math.abs(sin), 2 / n);
        if (i === 0) ctx.moveTo(px, py);
        else         ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.clip();
}

function updateShapePreviews() {
    const shapes = ['circle', 'squircle', 'rounded', 'teardrop'];
    shapes.forEach(shape => {
        const previewCanvas = document.getElementById(`canvas-shape-${shape}`);
        if (!previewCanvas) return;
        const sz   = previewCanvas.width; // 200
        const pCtx = previewCanvas.getContext('2d');
        pCtx.clearRect(0, 0, sz, sz);
        pCtx.save();
        if (shape === 'circle') {
            pCtx.beginPath();
            pCtx.arc(sz / 2, sz / 2, sz / 2, 0, Math.PI * 2);
            pCtx.clip();
        } else if (shape === 'squircle') {
            clipSquircle(pCtx, sz);
        } else if (shape === 'rounded') {
            const radius = sz * 0.22;
            pCtx.beginPath();
            pCtx.roundRect(0, 0, sz, sz, radius);
            pCtx.clip();
        } else if (shape === 'teardrop') {
            pCtx.beginPath();
            pCtx.roundRect(0, 0, sz, sz, [sz * 0.22, sz * 0.22, sz * 0.04, sz * 0.22]);
            pCtx.clip();
        }
        pCtx.imageSmoothingEnabled = true;
        pCtx.imageSmoothingQuality = 'high';
        pCtx.drawImage(canvas512, 0, 0, sz, sz);
        pCtx.restore();
    });
};

// ── Shape edit ───────────────────────────────────────────────────────────────
function applyClipPath(ctx, shape, size) {
    if (shape === 'circle') {
        ctx.beginPath();
        ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
        ctx.clip();
    } else if (shape === 'squircle') {
        clipSquircle(ctx, size);
    } else if (shape === 'rounded') {
        ctx.beginPath();
        ctx.roundRect(0, 0, size, size, size * 0.22);
        ctx.clip();
    }
}

function applyShapeEdit(shape) {
    currentShape = shape;
    // Always apply from the unedited original so switching shapes doesn't compound
    const srcDataUrl = originalCanvas512DataUrl || canvas512.toDataURL();
    if (!originalCanvas512DataUrl) {
        originalCanvas512DataUrl = srcDataUrl;
    }
    const sz = 512;
    const srcImg = new Image();
    srcImg.onload = function () {
        const offscreen = document.createElement('canvas');
        offscreen.width = offscreen.height = sz;
        const offCtx = offscreen.getContext('2d');
        offCtx.save();
        applyClipPath(offCtx, shape, sz);
        offCtx.imageSmoothingEnabled = true;
        offCtx.imageSmoothingQuality = 'high';
        offCtx.drawImage(srcImg, 0, 0, sz, sz);
        offCtx.restore();
        [[canvas512, 512], [canvas256, 256], [canvas192, 192],
         [canvas180, 180], [canvas152, 152], [canvas144, 144],
         [canvas128, 128], [canvas96,  96],  [canvas64,  64],
         [canvas48,  48],  [canvas32,  32],  [canvas16,  16]
        ].forEach(([c, s]) => {
            const cx = c.getContext('2d');
            cx.clearRect(0, 0, s, s);
            cx.imageSmoothingEnabled = true;
            cx.imageSmoothingQuality = 'high';
            cx.drawImage(offscreen, 0, 0, s, s);
        });
        reapplyIconCustomizations();
        updateShapePreviews();
        saveIconToStorage();
        document.getElementById('btn-edit-restore').disabled = false;
    };
    srcImg.src = srcDataUrl;
}

// Draws one icon canvas from its source (individual upload or canvas512) plus any active shape.
function redrawIconCanvas(canvasId) {
    const c = document.getElementById(canvasId);
    if (!c) return;
    const s     = c.width;
    const shape = iconShapes.get(canvasId) || currentShape || null;
    const cx    = c.getContext('2d');

    function paint(sourceImg) {
        if (shape) {
            const off    = document.createElement('canvas');
            off.width    = s;
            off.height   = s;
            const offCtx = off.getContext('2d');
            offCtx.save();
            applyClipPath(offCtx, shape, s);
            offCtx.imageSmoothingEnabled = true;
            offCtx.imageSmoothingQuality = 'high';
            offCtx.drawImage(sourceImg, 0, 0, s, s);
            offCtx.restore();
            cx.clearRect(0, 0, s, s);
            cx.drawImage(off, 0, 0, s, s);
        } else {
            cx.clearRect(0, 0, s, s);
            cx.imageSmoothingEnabled = true;
            cx.imageSmoothingQuality = 'high';
            cx.drawImage(sourceImg, 0, 0, s, s);
        }
    }

    if (iconSources.has(canvasId)) {
        const img = new Image();
        img.onload = function () { paint(img); };
        img.src = iconSources.get(canvasId);
    } else {
        paint(canvas512);
    }
}

function reapplyIconCustomizations() {
    const allIds = new Set([...iconSources.keys(), ...iconShapes.keys()]);
    allIds.forEach(function (canvasId) { redrawIconCanvas(canvasId); });
}

function restoreOriginalIcon() {
    if (!originalCanvas512DataUrl) return;
    const img = new Image();
    img.onload = function () {
        [[canvas512, 512], [canvas256, 256], [canvas192, 192],
         [canvas180, 180], [canvas152, 152], [canvas144, 144],
         [canvas128, 128], [canvas96,  96],  [canvas64,  64],
         [canvas48,  48],  [canvas32,  32],  [canvas16,  16]
        ].forEach(([c, s]) => {
            const cx = c.getContext('2d');
            cx.clearRect(0, 0, s, s);
            cx.imageSmoothingEnabled = true;
            cx.imageSmoothingQuality = 'high';
            cx.drawImage(img, 0, 0, s, s);
        });
        originalCanvas512DataUrl = null;
        currentShape = null;
        document.getElementById('btn-edit-restore').disabled = true;
        reapplyIconCustomizations();
        updateShapePreviews();
        saveIconToStorage();
    };
    img.src = originalCanvas512DataUrl;
}

// Edit dropdown toggle
(function () {
    const btn  = document.getElementById('btn-edit-shape');
    const menu = document.getElementById('edit-dropdown-menu');
    if (!btn || !menu) return;

    function closeMenu() {
        menu.classList.remove('open');
        menu.setAttribute('aria-hidden', 'true');
    }

    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        const opening = !menu.classList.contains('open');
        menu.classList.toggle('open', opening);
        menu.setAttribute('aria-hidden', String(!opening));
    });

    menu.querySelectorAll('[data-shape]').forEach(function (item) {
        item.addEventListener('click', function (e) {
            e.stopPropagation();
            applyShapeEdit(this.dataset.shape);
            closeMenu();
        });
    });

    document.getElementById('btn-edit-restore').addEventListener('click', function (e) {
        e.stopPropagation();
        restoreOriginalIcon();
        closeMenu();
    });

    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
    });
})();

function processImageFile(file) {
    if (!file || !file.type.match('image.*')){
        notify_send('Error!', 'Please upload an image file.', 'danger');
        return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.src = objectUrl;
    img.onload = function () {
        URL.revokeObjectURL(objectUrl);
        // New image loaded — clear any prior shape edit
        originalCanvas512DataUrl = null;
        currentShape = null;
        const rb = document.getElementById('btn-edit-restore');
        if (rb) rb.disabled = true;
        const srcW = img.naturalWidth;
        const srcH = img.naturalHeight;

        // Scale so the smallest dimension fills the target square (cover), then center.
        function drawCover(targetCtx, s) {
            const scale    = s / Math.min(srcW, srcH);
            const scaledW  = srcW * scale;
            const scaledH  = srcH * scale;
            const dx       = (s - scaledW) / 2;
            const dy       = (s - scaledH) / 2;
            targetCtx.clearRect(0, 0, s, s);
            targetCtx.imageSmoothingEnabled = true;
            targetCtx.imageSmoothingQuality = 'high';
            targetCtx.drawImage(img, dx, dy, scaledW, scaledH);
        }

        [[canvas512, 512], [canvas256, 256], [canvas192, 192],
         [canvas180, 180], [canvas152, 152], [canvas144, 144],
         [canvas128, 128], [canvas96,  96],  [canvas64,  64],
         [canvas48,  48],  [canvas32,  32],  [canvas16,  16]
        ].forEach(([c, s]) => drawCover(c.getContext('2d'), s));

        iconSources.clear();
        iconShapes.clear();
        document.getElementById('btn-reset').disabled = false;
        saveIconToStorage();
        updateShapePreviews();
    };
}

fileInput.addEventListener('change', (event) => {
    processImageFile(event.target.files[0]);
});

// Drag-and-drop onto the icons pane
const tabIcons    = document.getElementById('tab-icons');
const dropOverlay = document.getElementById('drop-overlay');
let dragCounter   = 0;

tabIcons.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    dropOverlay.classList.add('active');
});

tabIcons.addEventListener('dragleave', () => {
    dragCounter--;
    if (dragCounter === 0) {
        dropOverlay.classList.remove('active');
    }
});

tabIcons.addEventListener('dragover', (e) => {
    e.preventDefault();
});

tabIcons.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    dropOverlay.classList.remove('active');
    processImageFile(e.dataTransfer.files[0]);
});

// Load canvases with a placeholder unicorn
const imgInit = new Image();
imgInit.addEventListener('load', function(){
    ctx = canvas512.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(imgInit, 0, 0, 512, 512);

    ctx = canvas256.getContext('2d');
    ctx.drawImage(imgInit, 0, 0, 256, 256);

    ctx = canvas192.getContext('2d');
    ctx.drawImage(imgInit, 0, 0, 192, 192);

    ctx = canvas180.getContext('2d');
    ctx.drawImage(imgInit, 0, 0, 180, 180);

    ctx = canvas152.getContext('2d');
    ctx.drawImage(imgInit, 0, 0, 152, 152);

    ctx = canvas144.getContext('2d');
    ctx.drawImage(imgInit, 0, 0, 144, 144);

    ctx = canvas128.getContext('2d');
    ctx.drawImage(imgInit, 0, 0, 128, 128);

    ctx = canvas96.getContext('2d');
    ctx.drawImage(imgInit, 0, 0, 96, 96);

    ctx = canvas64.getContext('2d');
    ctx.drawImage(imgInit, 0, 0, 64, 64);

    ctx = canvas48.getContext('2d');
    ctx.drawImage(imgInit, 0, 0, 48, 48);

    ctx = canvas32.getContext('2d');
    ctx.drawImage(imgInit, 0, 0, 32, 32);

    ctx = canvas16.getContext('2d');
    ctx.drawImage(imgInit, 0, 0, 16, 16);
    updateShapePreviews();
});
if (!loadIconFromStorage()) {
    imgInit.src = 'img/icon-512x512.png';
}

// Event Listener for Downloads
const elements = document.querySelectorAll('.btn-save');
// Loop through each element and attach an event listener
elements.forEach(element => {
    element.addEventListener('click', (event) => {
        let canvas = element.getAttribute('data-canvas');
        const fileName = element.getAttribute('data-filename');
        canvas = document.getElementById(canvas);
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
});

// Tab switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    });
});

// Generate a screenshot canvas (off-screen) filled with the manifest background color
// and the 512px icon centered at 50% of the shorter dimension
function generateScreenshotCanvas(width, height) {
    const bgColor = document.getElementById('manifest-bg-color').value;
    const offCanvas = document.createElement('canvas');
    offCanvas.width  = width;
    offCanvas.height = height;
    const offCtx = offCanvas.getContext('2d');
    offCtx.fillStyle = bgColor;
    offCtx.fillRect(0, 0, width, height);
    const iconSize = Math.round(Math.min(width, height) * 0.5);
    const x = Math.round((width  - iconSize) / 2);
    const y = Math.round((height - iconSize) / 2);
    offCtx.imageSmoothingEnabled = true;
    offCtx.imageSmoothingQuality = 'high';
    offCtx.drawImage(canvas512, x, y, iconSize, iconSize);
    return offCanvas;
}

// ── Persistence (localStorage) ────────────────────────────────────────────────
function saveFormToStorage() {
    const data = {
        name:        document.getElementById('manifest-name').value,
        shortName:   document.getElementById('manifest-short-name').value,
        description: document.getElementById('manifest-description').value,
        themeColor:  document.getElementById('manifest-theme-color').value,
        bgColor:     document.getElementById('manifest-bg-color').value,
        display:     document.getElementById('manifest-display').value,
        startUrl:    document.getElementById('manifest-start-url').value,
    };
    localStorage.setItem('pwa_form', JSON.stringify(data));
}

function loadFormFromStorage() {
    let data;
    try { data = JSON.parse(localStorage.getItem('pwa_form')); } catch (e) {}
    if (!data) return;
    if (data.name        !== undefined) document.getElementById('manifest-name').value        = data.name;
    if (data.shortName   !== undefined) document.getElementById('manifest-short-name').value  = data.shortName;
    if (data.description !== undefined) document.getElementById('manifest-description').value = data.description;
    if (data.themeColor  !== undefined) {
        document.getElementById('manifest-theme-color').value        = data.themeColor;
        document.getElementById('manifest-theme-color-picker').value = data.themeColor;
    }
    if (data.bgColor !== undefined) {
        document.getElementById('manifest-bg-color').value        = data.bgColor;
        document.getElementById('manifest-bg-color-picker').value = data.bgColor;
    }
    if (data.display !== undefined) document.getElementById('manifest-display').value = data.display;
    if (data.startUrl !== undefined) document.getElementById('manifest-start-url').value = data.startUrl;
}

function saveIconToStorage() {
    try {
        localStorage.setItem('pwa_icon', canvas512.toDataURL('image/png'));
    } catch (e) {
        // Quota exceeded — silently ignore
    }
}

function loadIconFromStorage() {
    const dataUrl = localStorage.getItem('pwa_icon');
    if (!dataUrl) return false;
    const img = new Image();
    img.onload = function () {
        [[canvas512, 512], [canvas256, 256], [canvas192, 192],
         [canvas180, 180], [canvas152, 152], [canvas144, 144],
         [canvas128, 128], [canvas96,  96],  [canvas64,  64],
         [canvas48,  48],  [canvas32,  32],  [canvas16,  16]
        ].forEach(([c, s]) => {
            const cx = c.getContext('2d');
            cx.clearRect(0, 0, s, s);
            cx.imageSmoothingEnabled = true;
            cx.imageSmoothingQuality = 'high';
            cx.drawImage(img, 0, 0, s, s);
        });
        updateShapePreviews();
        // Restored from storage — treat as fresh original, no edit applied
        originalCanvas512DataUrl = null;
        const rb = document.getElementById('btn-edit-restore');
        if (rb) rb.disabled = true;
        document.getElementById('btn-reset').disabled = false;
    };
    img.src = dataUrl;
    return true;
}

// Manifest generator
function generateManifest() {
    const name        = document.getElementById('manifest-name').value;
    const shortName   = document.getElementById('manifest-short-name').value;
    const description = document.getElementById('manifest-description').value;
    const startUrl    = document.getElementById('manifest-start-url').value || '/';
    const themeColor  = document.getElementById('manifest-theme-color').value;
    const bgColor     = document.getElementById('manifest-bg-color').value;
    const display     = document.getElementById('manifest-display').value;
    const iconSizes   = ['512x512', '256x256', '192x192', '152x152', '144x144', '128x128', '96x96', '64x64', '48x48', '32x32', '16x16'];
    const icons = iconSizes.map(sizes => ({
        src: `icon-${sizes}.png`,
        sizes,
        type: 'image/png',
        purpose: 'maskable'
    }));
    icons.unshift({ src: 'apple-touch-icon.png', sizes: '180x180', type: 'image/png', purpose: 'any' });
    icons.push({ src: 'icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' });
    const screenshots = [
        { src: 'screenshot-mobile.png', sizes: '390x844',  type: 'image/png', form_factor: 'narrow' },
        { src: 'screenshot-wide.png',   sizes: '1280x800', type: 'image/png', form_factor: 'wide'   }
    ];
    const manifest = {
        name,
        short_name: shortName,
        start_url: startUrl,
        description,
        theme_color: themeColor,
        background_color: bgColor,
        display,
        icons,
        screenshots
    };
    return JSON.stringify(manifest, null, 2);
}

function updateManifestPreview() {
    document.getElementById('manifest-preview').textContent = generateManifest();
}

// Sync colour picker <-> hex text input
function syncColor(pickerId, textId) {
    const picker = document.getElementById(pickerId);
    const text   = document.getElementById(textId);
    picker.addEventListener('input', () => {
        text.value = picker.value;
        updateManifestPreview();
    });
    text.addEventListener('input', () => {
        if (/^#[0-9a-fA-F]{6}$/.test(text.value)) {
            picker.value = text.value;
        }
        updateManifestPreview();
    });
}

syncColor('manifest-theme-color-picker', 'manifest-theme-color');
syncColor('manifest-bg-color-picker',    'manifest-bg-color');

['manifest-name', 'manifest-short-name', 'manifest-description', 'manifest-display', 'manifest-start-url'].forEach(id => {
    document.getElementById(id).addEventListener('input', updateManifestPreview);
});

document.getElementById('manifest-form').addEventListener('input', saveFormToStorage);

// Download manifest.json
const btnDownloadManifest = document.getElementById('btn-download-manifest');
if (btnDownloadManifest) btnDownloadManifest.addEventListener('click', () => {
    const blob = new Blob([generateManifest()], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href     = url;
    link.download = 'manifest.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
});

// Initial preview render
loadFormFromStorage();
updateManifestPreview();

// Build a multi-size favicon.ico (containing 16x16 and 32x32 PNG frames)
async function generateFaviconIco() {
    const getCanvasPNG = (canvasEl) => new Promise(resolve => {
        canvasEl.toBlob(blob => blob.arrayBuffer().then(resolve), 'image/png');
    });
    const png16 = await getCanvasPNG(canvas16);
    const png32 = await getCanvasPNG(canvas32);
    const numImages = 2;
    const headerSize   = 6;
    const dirEntrySize = 16;
    const offset0 = headerSize + numImages * dirEntrySize; // 38
    const offset1 = offset0 + png16.byteLength;
    const buffer  = new ArrayBuffer(offset1 + png32.byteLength);
    const view    = new DataView(buffer);
    const bytes   = new Uint8Array(buffer);
    // ICO header
    view.setUint16(0, 0, true); // reserved
    view.setUint16(2, 1, true); // type: ICO
    view.setUint16(4, numImages, true);
    // Directory entry – 16x16
    view.setUint8(6, 16); view.setUint8(7, 16);
    view.setUint8(8, 0);  view.setUint8(9, 0);
    view.setUint16(10, 1,  true); view.setUint16(12, 32, true);
    view.setUint32(14, png16.byteLength, true);
    view.setUint32(18, offset0, true);
    // Directory entry – 32x32
    view.setUint8(22, 32); view.setUint8(23, 32);
    view.setUint8(24, 0);  view.setUint8(25, 0);
    view.setUint16(26, 1,  true); view.setUint16(28, 32, true);
    view.setUint32(30, png32.byteLength, true);
    view.setUint32(34, offset1, true);
    // PNG image data
    bytes.set(new Uint8Array(png16), offset0);
    bytes.set(new Uint8Array(png32), offset1);
    return buffer;
}

// Export all icons + manifest as ZIP
document.getElementById('btn-export-zip').addEventListener('click', async () => {
    const checked = document.querySelectorAll('input[name="export-file"]:checked');
    if (checked.length === 0) {
        notify_send('Nothing selected!', 'Please select at least one file to export.', 'danger');
        return;
    }
    const zip = new JSZip();
    for (const cb of checked) {
        const filename = cb.dataset.filename;
        if (cb.value === 'manifest') {
            zip.file(filename, generateManifest());
        } else if (cb.value === 'favicon-ico') {
            const icoBuffer = await generateFaviconIco();
            zip.file(filename, icoBuffer);
        } else if (cb.value === 'screenshot-mobile') {
            const sc = generateScreenshotCanvas(390, 844);
            const base64 = sc.toDataURL('image/png').split(',')[1];
            zip.file(filename, base64, { base64: true });
        } else if (cb.value === 'screenshot-wide') {
            const sc = generateScreenshotCanvas(1280, 800);
            const base64 = sc.toDataURL('image/png').split(',')[1];
            zip.file(filename, base64, { base64: true });
        } else if (cb.value === 'readme') {
            zip.file(filename, generateReadme());
        } else {
            const canvasEl = document.getElementById(cb.value);
            const base64 = canvasEl.toDataURL('image/png').split(',')[1];
            zip.file(filename, base64, { base64: true });
        }
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    if (window.showSaveFilePicker) {
        try {
            const handle = await window.showSaveFilePicker({
                suggestedName: 'icons-export.zip',
                types: [{ description: 'ZIP Archive', accept: { 'application/zip': ['.zip'] } }]
            });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        } catch (err) {
            if (err.name !== 'AbortError') throw err;
            return;
        }
    } else {
        const url  = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href     = url;
        link.download = 'icons-export.zip';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    }
    notify_send('Success!', 'ZIP archive downloaded.', 'success');
});

// HTML head-tags generator
function generateHtmlHeadTags() {
    const themeColor = document.getElementById('manifest-theme-color').value;
    return [
        '<!-- Favicon -->',
        '<link rel="icon" href="favicon.ico" sizes="any">',
        '<link rel="icon" type="image/png" sizes="32x32" href="icon-32x32.png">',
        '<link rel="icon" type="image/png" sizes="16x16" href="icon-16x16.png">',
        '',
        '<!-- Apple Touch Icon -->',
        '<link rel="apple-touch-icon" sizes="180x180" href="apple-touch-icon.png">',
        '',
        '<!-- Web App Manifest -->',
        '<link rel="manifest" href="manifest.json">',
        '',
        '<!-- Theme Colour -->',
        `<meta name="theme-color" content="${themeColor}">`,
    ].join('\n');
}

function updateHtmlPreview() {
    const el = document.getElementById('html-preview');
    if (el) el.textContent = generateHtmlHeadTags();
}

// Keep HTML preview in sync with theme-colour changes
document.getElementById('manifest-theme-color').addEventListener('input', updateHtmlPreview);
document.getElementById('manifest-theme-color-picker').addEventListener('input', updateHtmlPreview);

// Initial render
updateHtmlPreview();

// README generator
function generateReadme() {
    const name     = document.getElementById('manifest-name').value || 'My App';
    const headTags = generateHtmlHeadTags();
    return `# ${name} — Favicon & PWA Icon Files

This archive was generated with the [Favicon & PWA Icon Generator](https://favicons-pwa.philipnewbrough.co.uk).

## Files Included

| File | Purpose |
|------|---------|
| \`favicon.ico\` | Multi-size ICO (16×16 & 32×32) for legacy browser support |
| \`icon-16x16.png\` | Small favicon for browser tabs |
| \`icon-32x32.png\` | Standard favicon for most browsers |
| \`icon-48x48.png\` | General-purpose icon |
| \`icon-64x64.png\` | General-purpose icon |
| \`icon-96x96.png\` | Android Chrome (older) |
| \`icon-128x128.png\` | Chrome Web Store icon |
| \`icon-144x144.png\` | Windows pinned-site tile |
| \`icon-152x152.png\` | iPad Retina touch icon |
| \`apple-touch-icon.png\` | iOS / macOS Safari home screen icon (180×180) |
| \`icon-192x192.png\` | Android Chrome home screen icon |
| \`icon-256x256.png\` | High-resolution general icon |
| \`icon-512x512.png\` | PWA splash screen & maskable icon |
| \`screenshot-mobile.png\` | PWA install prompt screenshot — narrow (390×844) |
| \`screenshot-wide.png\` | PWA install prompt screenshot — wide (1280×800) |
| \`manifest.json\` | Web App Manifest |

## Deployment

Copy all files to the root of your web server, alongside your \`index.html\`.

## HTML \`<head>\` Tags

Add the following inside the \`<head>\` element of your HTML:

\`\`\`html
${headTags}
\`\`\`

## manifest.json

The \`manifest.json\` file tells browsers how your web app should appear and behave when installed. Key fields:

- **name** — Full app name shown on install prompts and splash screens.
- **short_name** — Short label shown beneath the home screen icon.
- **display** — Controls browser chrome when launched. \`standalone\` hides the browser UI.
- **theme_color** — Colour of the browser toolbar / status bar.
- **background_color** — Background colour shown on the splash screen while the app loads.
- **icons** — Icon files used for the home screen, app switcher, and splash screen.
- **screenshots** — Preview images shown in the PWA install prompt (where supported).

## Notes

- All icon files should sit in the same directory as \`manifest.json\` and your HTML. If you move them to a sub-folder, update the \`src\` paths in \`manifest.json\` and the \`href\` values in your HTML accordingly.
- \`screenshot-mobile.png\` and \`screenshot-wide.png\` are placeholder screenshots generated from your icon. Replace them with real screenshots of your app for a better install experience.
- \`apple-touch-icon.png\` is listed in \`manifest.json\` under a separate \`"purpose": "any"\` entry so it is displayed as-is without masking or cropping.
`;
}

// ── Per-icon context menu (click on canvas → Download / Upload / Edit) ──────
(function () {
    // Build the floating dropdown
    const menu = document.createElement('div');
    menu.id        = 'icon-ctx-menu';
    menu.className = 'icon-ctx-menu';
    menu.setAttribute('aria-hidden', 'true');
    menu.innerHTML =
        '<button class="icon-ctx-item" id="icon-ctx-download"><i class="bi bi-download"></i> Download</button>' +
        '<div class="icon-ctx-divider"></div>' +
        '<button class="icon-ctx-item" id="icon-ctx-upload"><i class="bi bi-upload"></i> Upload</button>' +
        '<div class="icon-ctx-divider"></div>' +
        '<button class="icon-ctx-item" data-icon-shape="circle"><i class="bi bi-circle"></i> Round</button>' +
        '<button class="icon-ctx-item" data-icon-shape="squircle"><i class="bi bi-app"></i> Squircle</button>' +
        '<button class="icon-ctx-item" data-icon-shape="rounded"><i class="bi bi-square"></i> Rounded</button>' +
        '<div class="icon-ctx-divider"></div>' +
        '<button class="icon-ctx-item" id="icon-ctx-restore"><i class="bi bi-arrow-counterclockwise"></i> Restore original</button>';
    document.body.appendChild(menu);

    // Dedicated hidden file input for per-icon uploads
    const iconUploadInput  = document.createElement('input');
    iconUploadInput.type   = 'file';
    iconUploadInput.accept = 'image/*';
    iconUploadInput.style.display = 'none';
    document.body.appendChild(iconUploadInput);

    let activeCanvas = null;
    let activeSize   = null;

    function closeMenu() {
        menu.classList.remove('open');
        menu.setAttribute('aria-hidden', 'true');
    }

    function updateRestoreBtn() {
        const btn = document.getElementById('icon-ctx-restore');
        if (!btn || !activeCanvas) return;
        btn.disabled = !iconSources.has(activeCanvas.id) && !iconShapes.has(activeCanvas.id);
    }

    function openMenu(canvasEl, size, e) {
        activeCanvas = canvasEl;
        activeSize   = size;

        // Position below the canvas, adjusted for scroll
        const rect = canvasEl.getBoundingClientRect();
        let left = rect.left + window.scrollX;
        let top  = rect.bottom + window.scrollY + 6;
        menu.style.left = left + 'px';
        menu.style.top  = top  + 'px';

        updateRestoreBtn();
        menu.classList.add('open');
        menu.setAttribute('aria-hidden', 'false');
        e.stopPropagation();

        // Clamp to viewport after layout
        requestAnimationFrame(function () {
            const mRect = menu.getBoundingClientRect();
            if (mRect.right > window.innerWidth - 8) {
                menu.style.left = (Math.max(8, window.innerWidth - mRect.width - 8) + window.scrollX) + 'px';
            }
        });
    }

    // Attach click to every icon canvas inside a .canvas-wrap
    document.querySelectorAll('.canvas-wrap canvas').forEach(function (canvas) {
        const size = parseInt(canvas.getAttribute('width'), 10);
        canvas.addEventListener('click', function (e) {
            if (menu.classList.contains('open') && activeCanvas === canvas) {
                closeMenu();
            } else {
                openMenu(canvas, size, e);
            }
        });
    });

    // Download the active icon
    document.getElementById('icon-ctx-download').addEventListener('click', function () {
        if (!activeCanvas) return;
        const filename = 'icon-' + activeSize + 'x' + activeSize + '.png';
        const link = document.createElement('a');
        link.href     = activeCanvas.toDataURL('image/png');
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        closeMenu();
    });

    // Upload: open file picker (keep activeCanvas/Size for the change handler)
    document.getElementById('icon-ctx-upload').addEventListener('click', function () {
        iconUploadInput.value = '';   // allow re-selecting the same file
        iconUploadInput.click();
        closeMenu();
    });

    // Draw the chosen file onto only the target canvas
    iconUploadInput.addEventListener('change', function () {
        const file = this.files[0];
        if (!file || !file.type.match('image.*')) {
            notify_send('Error!', 'Please upload an image file.', 'danger');
            return;
        }
        if (!activeCanvas || !activeSize) return;
        const s   = activeSize;
        const img = new Image();
        const objectUrl = URL.createObjectURL(file);
        img.src = objectUrl;
        img.onload = function () {
            URL.revokeObjectURL(objectUrl);
            const srcW  = img.naturalWidth;
            const srcH  = img.naturalHeight;
            const scale = s / Math.min(srcW, srcH);
            const sw    = srcW * scale;
            const sh    = srcH * scale;
            const dx    = (s - sw) / 2;
            const dy    = (s - sh) / 2;
            // Capture raw cover-scaled source (no shape)
            const tmp       = document.createElement('canvas');
            tmp.width       = s;
            tmp.height      = s;
            const tmpCtx    = tmp.getContext('2d');
            tmpCtx.imageSmoothingEnabled = true;
            tmpCtx.imageSmoothingQuality = 'high';
            tmpCtx.drawImage(img, dx, dy, sw, sh);
            iconSources.set(activeCanvas.id, tmp.toDataURL());
            iconShapes.delete(activeCanvas.id); // new source starts fresh
            redrawIconCanvas(activeCanvas.id);
            document.getElementById('btn-reset').disabled = false;
        };
    });

    // Per-icon shape edit
    menu.querySelectorAll('[data-icon-shape]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            if (!activeCanvas) return;
            const shape    = this.dataset.iconShape;
            const canvasId = activeCanvas.id;
            // Capture source from canvas512 if not individually uploaded
            if (!iconSources.has(canvasId)) {
                const s   = activeSize;
                const tmp = document.createElement('canvas');
                tmp.width = tmp.height = s;
                const tCtx = tmp.getContext('2d');
                tCtx.imageSmoothingEnabled = true;
                tCtx.imageSmoothingQuality = 'high';
                tCtx.drawImage(canvas512, 0, 0, s, s);
                iconSources.set(canvasId, tmp.toDataURL());
            }
            iconShapes.set(canvasId, shape);
            redrawIconCanvas(canvasId);
            document.getElementById('btn-reset').disabled = false;
            updateRestoreBtn();
            closeMenu();
        });
    });

    // Restore this icon to the global base + global shape
    document.getElementById('icon-ctx-restore').addEventListener('click', function (e) {
        e.stopPropagation();
        if (!activeCanvas) return;
        const canvasId = activeCanvas.id;
        iconSources.delete(canvasId);
        iconShapes.delete(canvasId);
        // Redraw from canvas512 with global shape (if any)
        const s  = activeSize;
        const cx = activeCanvas.getContext('2d');
        if (currentShape) {
            const off    = document.createElement('canvas');
            off.width    = s;
            off.height   = s;
            const offCtx = off.getContext('2d');
            offCtx.save();
            applyClipPath(offCtx, currentShape, s);
            offCtx.imageSmoothingEnabled = true;
            offCtx.imageSmoothingQuality = 'high';
            offCtx.drawImage(canvas512, 0, 0, s, s);
            offCtx.restore();
            cx.clearRect(0, 0, s, s);
            cx.drawImage(off, 0, 0, s, s);
        } else {
            cx.clearRect(0, 0, s, s);
            cx.imageSmoothingEnabled = true;
            cx.imageSmoothingQuality = 'high';
            cx.drawImage(canvas512, 0, 0, s, s);
        }
        updateRestoreBtn();
        closeMenu();
    });

    // Dismiss on outside click or Escape
    document.addEventListener('click', closeMenu);
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') closeMenu();
    });
})();