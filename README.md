# Ice Runner

A tiny endless-runner prototype built with Expo/React Native. You're a snowman sprinting through subway-like ice tunnels while dodging ICE cubes. Swipe to move lanes or jump over obstacles. Colliding with ICE resets your score.

## Getting started

1. Install dependencies (requires Node.js and `npm`).

```bash
npm install
```

2. Launch Expo locally.

```bash
npx expo start
```

3. Use the QR code or `s` to open the Expo Go app, or press `i` / `a` for iOS/Android simulators.

### Controls

- Swipe left/right or tap the on-screen buttons to move lanes.
- Swipe up or tap Jump to hop over ICE.
- Every ICE you avoid increases speed and score; getting hit freezes you.

### Customizing

- Update `App.js` to tweak lane counts, obstacle speeds, or sprites.
- Replace placeholder shapes with actual art by creating PNGs under `assets/` and rendering them with `Image` components.

Have fun extending the prototype into a full subway-surfer-style game!
