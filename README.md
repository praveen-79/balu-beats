# 🎵 PulseBeats — Mobile Music Player & Multi-App Spotify Bridge

A zero-setup mobile music player app that streams **full-length 320kbps tracks**, **global official charts (Apple/iTunes)**, **Audius indie/EDM streams**, **24/7 Live World Radio**, and **time-synced karaoke lyrics**, while connecting directly to **Spotify**, **YouTube Music**, **Apple Music**, and **JioSaavn**.

---

## 🚀 3 Ways to Use, Share & Deploy

### 1. Share the Single-File App Directly (`PulseBeats_Shareable_App.html`)
Send [`PulseBeats_Shareable_App.html`](./PulseBeats_Shareable_App.html) directly to friends on **WhatsApp, Telegram, Email, or Google Drive**:
- It is **100% self-contained** in one file.
- Anyone who opens that file on an Android phone, iPhone, Windows PC, or Mac gets the complete working music player immediately — **no installation or API keys required**.

### 2. Run Locally & Install on Mobile Over Wi-Fi (PWA)
Double-click [`Start_Music_App.bat`](./Start_Music_App.bat) or run:
```bash
python start_server.py
```
- Opens `http://localhost:8080` on your PC.
- Prints your **LAN Wi-Fi URL** (e.g., `http://192.168.x.x:8080`) so any phone on the same Wi-Fi can open it and tap **"Add to Home Screen / Install App"**.

### 3. Deploy Free to the Public Web (10 Seconds)
- **Netlify Drop (No account or CLI needed)**: Drag and drop the `pulsebeats-music-app` folder onto [https://app.netlify.com/drop](https://app.netlify.com/drop) to get an instant `https://...netlify.app` link you can share with anyone.
- **GitHub Pages / Vercel**: Push this folder to GitHub and enable GitHub Pages or import into Vercel ([`vercel.json`](./vercel.json) and [`netlify.toml`](./netlify.toml) are pre-configured).

---

## 📱 Native Android / iOS App (React Native + Expo)
Inside [`mobile-app/`](./mobile-app):
- [`mobile-app/App.js`](./mobile-app/App.js) — Complete React Native (`expo-av`) mobile player with 320kbps streaming & Spotify deep-linking.
- **Instant Cloud Preview & APK**: Copy [`mobile-app/App.js`](./mobile-app/App.js) into [https://snack.expo.dev](https://snack.expo.dev) to run it on your phone via **Expo Go**, or run `npx eas build -p android --profile preview` ([`mobile-app/eas.json`](./mobile-app/eas.json)) to generate a shareable `.apk` file.
