# fzDates Vanilla JavaScript Demo

This directory contains a self-contained vanilla JavaScript example that showcases the `fzdates` parser in the browser. It runs on top of [Vite](https://vitejs.dev/) for a lightweight development server and uses the local workspace build of the library via a `file:` dependency.

## Getting Started

```bash
npm install
npm run dev
```

The first install step will build the root `fzdates` package (via its `prepare` script) and link it into the example. After starting the dev server, open the URL printed by Vite (defaults to `http://localhost:5173`).

## Cross-Platform Notes

This example pins the Windows Rollup native binary (`@rollup/rollup-win32-x64-msvc`). If you are on macOS or Linux you can swap in the matching package and reinstall:

| Platform | Command |
| --- | --- |
| Windows (x64) | _already bundled_ |
| macOS (Intel) | `npm install --save-dev @rollup/rollup-darwin-x64` |
| macOS (Apple Silicon) | `npm install --save-dev @rollup/rollup-darwin-arm64` |
| Linux (glibc x64) | `npm install --save-dev @rollup/rollup-linux-x64-gnu` |

If you prefer a clean slate:

```bash
rm -rf node_modules package-lock.json
npm install
npm install --save-dev @rollup/rollup-<platform-package>
```

Alternatively, you can remove the explicit `@rollup/*` package from `devDependencies` and reinstall—Rollup’s optional dependencies.
