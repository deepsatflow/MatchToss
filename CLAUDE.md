# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Match Toss — an Expo (SDK 54) React Native app for cricket coin tosses: flip an animated coin with sound/haptics, then scratch a digital card to reveal the winner. Ships to Google Play as `com.eatmadi.matchtoss`.

## Commands

```bash
npx expo start          # dev server (press a = Android, i = iOS, w = web)
npx expo start --web    # web build directly (useful for headless screenshots)
npm run lint            # expo lint
```

There are no tests.

Release (see TOOLS.md for the full walkthrough):

```bash
eas build -p android --profile production   # builds an .aab
eas submit -p android --latest              # submits to Play (draft track)
```

## Gitignored config — do not "fix" this

`app.json`, `eas.json`, and the Play service-account key (`matchtoss-*.json`) are **deliberately gitignored** (past commits removed internal info). They exist only on the local machine; never commit them or re-add them to git. The store-relevant version is `expo.version` in `app.json` (package.json's version is not used).

## Architecture

Two-screen expo-router app under `app/`:

- `app/index.tsx` — home/toss screen. Animated coin flip (rotateY), plays `coinflip.mp3`, then navigates to the reveal screen. The toss result is decided here and passed via route param.
- `app/reveal.tsx` — scratch-card reveal. Route is `/reveal?outcome=head|tail` (defaults to head). Scratching is a PanResponder drawing strokes into an SVG mask over the winner card; progress is tracked on a 30×30 grid. At 50% scratched it auto-reveals, plays a drum roll, shows a short countdown, then navigates home.

Things that are easy to get wrong:

- **Brand colors are hardcoded inline** in the two screen files, not centralized: gold `#d4af37`, green `#0f8f57`, navy `#0d2b45`, off-white `#f7f7f2`, ink `#0f172a`. `constants/theme.ts` is unused Expo-template code — don't take it as the app palette.
- Product Sans Bold (`assets/fonts/product_sans_bold.ttf`) is loaded per-screen with `useFonts`, family name `ProductSansBold`.
- Coin faces are photos of a real ₹10 coin (`assets/images/head.png` / `tail.png`) with white corners; they are masked round via `borderRadius` in styles — keep that when touching coin image styles.
- `app/reveal.tsx` contains leftover styles for a Lottie celebration modal that is no longer rendered.

## Assets & store graphics

- Icon/splash source art is `assets/images/MatchToss.png` (batsman mascot, white background — keep the background as-is per owner preference). It feeds `app-icon.png`, `adaptive-icon.png` (mascot at ~66% on white, so Android's mask doesn't crop it), `splash-icon.png`, and `favicon.png`.
- `store-assets/` holds the Play Console listing graphics (512×512 icon, 1024×500 feature graphic, framed phone/7"/10" tablet screenshots). Screenshots were captured from the running web build with headless Chrome/puppeteer and composed into branded HTML frames — regenerate the same way if screens change.
- Never add stock imagery with watermarks; a watermarked `toss.png` was removed for this reason.
