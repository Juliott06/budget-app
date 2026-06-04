# Budget Dashboard

A personal money allocation PWA for tracking income, expenses, savings, and goals. Runs entirely on-device with no backend, no login, and no bank connections.

## Quick Start

```bash
cd budget-app
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Generate PWA Icons

Before deploying, generate PNG icons from the SVG source:

**Option A** (easiest): Convert `public/icons/icon-512.svg` to PNG using https://svgtopng.com — save as `icon-192.png` (192×192) and `icon-512.png` (512×512) in `public/icons/`.

**Option B** (automated):
```bash
npm install sharp --save-dev
node scripts/generate-icons.js
```

## Test on Your Phone (Local Network)

1. Find your computer's local IP: `ipconfig` (Windows) or `ifconfig` (Mac)
2. Run the dev server with host flag:
   ```bash
   npx vite --host
   ```
3. On your iPhone (same Wi-Fi), open: `http://YOUR_IP:5173`
4. Test the app in Safari

## Deploy Free (Vercel)

1. Push to GitHub
2. Go to https://vercel.com → Import your repo
3. Framework Preset: **Vite**
4. Click Deploy
5. Your app will be live at `https://your-app.vercel.app`

## Deploy Free (Netlify)

1. Push to GitHub
2. Go to https://app.netlify.com → Import from Git
3. Build command: `npm run build`
4. Publish directory: `dist`
5. Click Deploy

## Add to iPhone Home Screen

1. Open your deployed URL in **Safari** on iPhone
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Name it "Budget" and tap Add
5. The app will appear on your home screen and run in standalone mode (no Safari UI)

## Important Notes

- **All data is stored locally** in your browser using IndexedDB
- **Clearing Safari data or browser cache WILL delete your budget data**
- Use the **Settings → Export Backup** feature regularly
- To transfer data to another device, export JSON and import on the new device

## Tech Stack

- React 18 + TypeScript
- Vite + vite-plugin-pwa
- Dexie.js (IndexedDB wrapper)
- Recharts (net worth chart)
- React Router
- Pure CSS (no UI library)
