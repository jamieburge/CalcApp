# Randomiser

A mobile-first web app with several ways to make a random choice. No build step.

**Modes:** Dice (custom faces), Wheel spin, Plinko, Choosr (everyone touches the screen, one is picked).

Every mode takes its options from either *quick entry* or a saved **list** (e.g. "Pubs near me"). Lists are created under the Lists tab and stored in the browser's `localStorage`.

```
npm install
npm start        # http://localhost:3000
npm test
```

Code lives in `public/` (`js/modes/*` is one file per mode). The original `/flip` coin-flip endpoint is still served by `server.js`.
