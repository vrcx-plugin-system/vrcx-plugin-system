# VRCX Plugin System

TypeScript-based plugin management system for VRCX.

## Features

- **TypeScript-first**: Full type safety and IDE support
- **Hot-reloadable**: Load plugins without restarting VRCX
- **Repository system**: Install plugins from remote repositories
- **Settings management**: Equicord-style settings with UI integration
- **Hook system**: Intercept and modify VRCX functions
- **Event system**: Publish/subscribe event handling
- **Resource management**: Automatic cleanup on plugin unload
- **Automatic timestamps**: Build timestamps update based on source file modification times

## Quick Start

### Installation

1. Clone this repository
2. Install dependencies:

```bash
npm install
```

3. Build the system:

```bash
npm run build
```

4. Copy `dist/custom.js` to `%APPDATA%\VRCX\`

### Development

Watch mode for development:

```bash
npm run watch
```

Build production version:

```bash
npm run build
```

Clean build:

```bash
npm run clean
npm run build
```

## Building

Run the update script (recommended):

```powershell
.\update.ps1
```

Builds and copies `custom.js` to `%APPDATA%\VRCX\`.

**Note:** The build system automatically updates the build timestamp in `src/index.ts` based on the most recent file modification time in the `src/` directory.

### Build Process

1. **Pre-build**: Runs `update-build.js` to update timestamp
   - Scans all `.ts` and `.js` files in `src/`
   - Finds the most recently modified file
   - Updates `build: "XXXXX"` in `src/index.ts`
2. **Webpack**: Bundles TypeScript into `dist/custom.js`
   - Production mode: Minified
   - Development mode: Non-minified

## Plugins Repository

Plugins live in a separate repository:
https://github.com/vrcx-plugin-system/plugins

Default plugin URL format:

```
https://github.com/vrcx-plugin-system/plugins/raw/refs/heads/main/dist/{plugin-name}.js
```

Plugins are now written in TypeScript (`src/plugins/*.ts`) and compiled to JavaScript (`dist/*.js`).

## Documentation

- **[Plugin Development](docs/plugins.md)** - Complete plugin guide with examples
- **[API Reference](docs/api-reference.md)** - Full API documentation

## Configuration

### TypeScript (tsconfig.json)

- Target: ES2020
- Strict mode enabled
- No source maps (for bundle size)

### Webpack (webpack.config.js)

- Entry: `src/index.ts`
- Output: `dist/custom.js`
- Minification: TerserPlugin (production only)
- No source maps

## Project Structure

```
vrcx-plugin-system/
├── src/
│   ├── index.ts           # Entry point (contains build timestamp)
│   ├── modules/
│   │   ├── plugin.ts      # Plugin base class & manager
│   │   ├── repo.ts        # Repository management
│   │   ├── config.ts      # Settings & configuration
│   │   ├── logger.ts      # Logging system
│   │   └── utils.ts       # Utility functions
│   └── types/
│       └── index.ts       # TypeScript type definitions
├── dist/
│   └── custom.js          # Built output
├── docs/
│   ├── plugins.md         # Plugin development guide
│   └── api-reference.md   # API documentation
├── update-build.js        # Timestamp update script
├── webpack.config.js      # Webpack configuration
├── tsconfig.json          # TypeScript configuration
└── package.json           # NPM configuration
```

## Links

- **Core System**: https://github.com/vrcx-plugin-system/vrcx-plugin-system
- **Plugins**: https://github.com/vrcx-plugin-system/plugins
- **VRCX**: https://github.com/vrcx-team/VRCX

## License

MIT
