# Bplugins // BZaudio

GitHub-ready, framework-free Vanilla HTML/CSS/JavaScript build.

## Files

- `index.html` — public floor, screenshot-style Artist Core login/create account, shop, about, contact.
- `dashboard.html` — signed-in artist workbench: publish plugin package + image + audio sample, inspect trades.
- `admin.html` — hidden curator gateway.
- `styles.css` — visual system.
- `app.js` — IndexedDB account/plugin/comment/vote/trade engine, Web Audio engine and UI.
- `login-engine.js` — SHA-256 curator admission.
- `image_gJ_vgo.png` — supplied artwork background.

## GitHub Pages

Put all files in the repository root and enable GitHub Pages from the repository's Pages settings. No build step is required.

## Important architecture limitation

GitHub Pages is a static host. It cannot securely provide a shared database or server-side account authentication by itself.

This build therefore uses:

- Web Crypto for password hashing.
- IndexedDB for accounts, plugin files, comments, votes and trades.
- Web Audio API for the 55 Hz / 140 Hz audition.
- `sessionStorage` for the signed-in browser session.

That means the community database is **per browser/device** in this GitHub-only version. Two different visitors do not share uploaded plugins or comments.

For a real public marketplace where every visitor shares the same accounts, uploads, votes, comments and trades, keep this exact frontend and connect `app.js` to a real backend (for example Supabase, Firebase, or your own API). Do not put database service-role secrets in this frontend.

## Features included

- Account creation and login.
- Passwords stored as SHA-256 hashes rather than plaintext.
- Screenshot-style glass Artist Core.
- Hidden `bza` curator route.
- Curator login.
- Plugin package upload.
- Plugin name, description and starting value.
- Plugin cover image.
- Audio sample player.
- Plugin download.
- One applause vote per account per plugin.
- Value increase based on applause.
- Elite / Artisan / Exhibition tiers.
- Comments ("commits") on plugins.
- Trade offers between account-owned plugins.
- Accept/reject incoming trades.
- Email barter package.
- Responsive mobile layout.
- No React, Tailwind, Bootstrap, jQuery or other frameworks.
