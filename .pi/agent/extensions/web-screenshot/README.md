# Pi web screenshots

`web_screenshot` is a global Pi tool for one-call visual review using
Playwright's managed Chromium. Pass up to four HTTP(S) pages or project-local
HTML files and any viewport sizes between 320 and 4096 CSS pixels. It captures
at most eight images per call, attaches JPEGs to the tool result, and saves
full-resolution originals to a new OS temporary directory. The default is
1440×900 and 390×844. Optional `scrollY`, `fullPage`, and `colorScheme` support
below-the-fold and light/dark checks. Browser contexts do not share cookies.

Install dependencies from this directory with `npm install`. If Chromium is
missing, run `npx playwright install chromium` here (on a fresh Linux server,
provision browser system dependencies separately). Pi discovers `index.ts` as
a global extension. Run `/reload` after changing the extension.

Test with `node --test web-screenshot.test.mjs` and `npx tsc --noEmit -p
tsconfig.json`. Screenshot output in the OS temporary directory is ephemeral.
