<img width="4096" height="2304" alt="HI7SqdvboAMhOW4" src="https://github.com/user-attachments/assets/24b7f1e6-5140-472c-8788-2e312cf42b2b" />

# Skriva

A markdown note editor for macOS, built with Electron, React, and TipTap.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
$ npm install
```

### Development

```bash
$ npm run dev
```

### Build

```bash
$ npm run build:mac
```

The signed and notarized `.dmg` will be written to `dist/`. Signing and notarization require an Apple Developer ID certificate in your keychain and the `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID` environment variables to be set.
