# Favicon & PWA Icon Generator

![Favicon & PWA Icon Generator](public/img/og-favicon-pwa-icon-generator-1200x600.png)

A free, browser-based tool that generates every icon size your website or Progressive Web App needs — no server uploads, no account required. All processing happens entirely in the browser using the Canvas API.

Live at: [favicons-pwa.philipnewborough.co.uk](https://favicons-pwa.philipnewborough.co.uk)

## Features

- **Upload any image** and instantly generate a full set of resized icons
- **Icon sizes generated:** 512×512, 256×256, 192×192, 180×180, 152×152, 144×144, 128×128, 96×96, 64×64, 48×48, 32×32, 16×16
- **Shape editor** — apply circle, squircle (iOS-style superellipse), rounded rect, or teardrop masks to your icon before export
- **Maskable icon safe zone overlay** — visualise the central 80% safe zone to ensure key artwork survives platform clipping
- **Shape previews** — see how your icon looks masked as a circle, squircle, rounded square, and teardrop
- **Manifest tab** — configure `name`, `short_name`, `theme_color`, and `background_color` for your `manifest.json`
- **HTML tab** — copy ready-to-use `<link>` and `<meta>` tags for pasting into your HTML
- **Export tab** — download all icons in a single `.zip` file (via JSZip), including a ready-made `manifest.json`
- **Light/dark theme toggle** with `localStorage` persistence and automatic system preference detection
- **Drag-and-drop** image upload support
- **PWA** — the app itself is installable, with a service worker for offline use

## Project Structure

```
public/
  index.html        # Single-page app
  manifest.json     # Web app manifest
  sw.js             # Service worker (offline caching)
  css/main.css      # Styles
  js/main.js        # All client-side logic
  img/              # Default app icon assets
  vendor/
    bootstrap-icons/ # Icon font
    jszip/           # Client-side ZIP generation
cache-bust.js       # Node script to hash and version main.css & main.js
package.json
```

## Development

**Cache-busting** — after editing `main.css` or `main.js`, run the following to update the `?v=` query strings in `index.html` and bump the service worker cache name:

```bash
npm run cache-bust
```

No build step or bundler is required. The app is plain HTML, CSS, and JavaScript.
