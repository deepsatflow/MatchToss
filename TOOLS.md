# MatchToss (Expo)

A fresh Expo/React Native port of the original MatchToss Android app. Flip a coin with animation and sound, then scratch the digital card to reveal who won. Built to be Play Store ready.

## Running the app

- Install deps: `npm install`
- Start locally: `npx expo start`
  - Android emulator: press `a`
  - iOS simulator (macOS): press `i`
  - Expo Go on device: scan the QR shown in the terminal

## What’s inside

- Coin flip animation with haptics + `coinflip.mp3`
- Scratch-card reveal (SVG mask) with progress tracking
- Celebration modal with Lottie (`assets/lottie/play_animation.json`) and drum roll audio
- Product Sans Bold font copied from the original app
- Assets: `head.png`, `tail.png`, `toss.png`, icon replaced with the original launcher art

## Building for Play Store (EAS)

1. Install the CLI once: `npm install -g eas-cli`
2. In this folder run: `eas login` (if not already) then `eas init`
3. Build an Android bundle: `eas build -p android --profile production`
   - Uses package id `com.eatmadi.matchtoss` configured in `app.json`
4. Submit the latest build: `eas submit -p android --latest`
   - Or point to a specific `.aab` from `eas build`
5. Create your Play Console listing (screenshots, description, content rating) and upload the generated `.aab`

Notes
- Keep the icon at `assets/images/icon.png` and splash at `assets/images/splash-icon.png` if you update branding.
- To change the package id or app name, edit `app.json` (`android.package`, `name`, `slug`, `scheme`).
- For production audio behavior on iOS, the app requests `playsInSilentModeIOS` so sounds play even with the ringer off.
