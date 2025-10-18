# VRCX Plugin System

TypeScript-based plugin management system for VRCX with runtime plugin loading and Equicord-inspired UI.

## Quick Start

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Deploy to VRCX
.\update.ps1
```

## Project Structure

```
vrcx-plugin-system/
├── src/                    # TypeScript source
│   ├── index.ts           # Entry point & bootstrap
│   ├── modules/           # Core modules
│   │   ├── config.ts     # Settings & config management
│   │   ├── logger.ts     # Multi-output logging system
│   │   ├── plugin.ts     # Plugin base class & loader
│   │   └── utils.ts      # Utility functions
│   └── types/            # TypeScript type definitions
├── dist/                  # Build output (gitignored)
│   └── custom.js         # Bundled output
├── docs/                  # Documentation
├── package.json          # Dependencies
├── tsconfig.json         # TypeScript config
├── webpack.config.js     # Build config
└── update.ps1            # Build & deploy script
```

## Core Features

### Plugin System

- **Remote Loading**: Plugins loaded from GitHub at runtime
- **Resource Management**: Auto-cleanup of timers, listeners, observers
- **Hook System**: Pre/post/void/replace hooks for function interception
- **Event System**: Pub/sub event bus for plugin communication
- **Settings**: Equicord-inspired reactive settings with categories
- **UI Integration**: Plugin Manager with visual settings editor

### Logger

Multi-target logging with console, VRCX UI, VR overlays, and desktop notifications.

```javascript
logger.log("Console message");
logger.showSuccess("UI toast");
logger.notifyDesktop("Desktop notification");
logger.addFeed({
  /* feed entry */
});
```

### Config Manager

Persistent settings with localStorage backend and VRChat config.json sync.

```javascript
configManager.get("key", defaultValue);
configManager.set("key", value);
configManager.exportToVRChatConfig();
```

### Utilities

Common helpers for time formatting, clipboard, color manipulation, and VRCX integration.

```javascript
utils.timeToText(ms); // "5m 30s"
utils.copyToClipboard(text);
utils.saveBio(bio);
utils.hexToRgba("#ff0000", 0.5);
```

## Plugin Development

Plugins are plain JavaScript files extending `window.customjs.Plugin`:

```javascript
class MyPlugin extends window.customjs.Plugin {
  constructor() {
    super({
      name: "My Plugin",
      description: "What it does",
      author: "Your Name",
      version: "1.0.0",
    });
  }

  async load() {
    // Initial setup, define settings, register hooks
  }

  async start() {
    // Start timers, modify DOM
  }

  async onLogin(user) {
    // User-specific initialization
  }
}

window.customjs.__LAST_PLUGIN_CLASS__ = MyPlugin;
```

### Custom Action Buttons

Plugins can define custom buttons for the Plugin Manager UI:

```javascript
getActionButtons() {
  return [
    {
      label: "Refresh Data",
      color: "success",       // primary, success, warning, danger, info
      icon: "ri-refresh-line",
      title: "Reload data from API",
      callback: async () => {
        await this.refreshData();
      },
    },
  ];
}
```

See **[Plugin Development Guide](docs/plugins.md)** for complete documentation.

## Build System

```bash
npm run build      # Production (minified)
npm run build:dev  # Development (unminified)
npm run watch      # Auto-rebuild on changes
npm run clean      # Clean build artifacts
```

### Deploy to VRCX

```powershell
.\update.ps1
```

Builds and copies `custom.js` to `%APPDATA%\VRCX\`.

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

- Single bundle output: `dist/custom.js`
- Minified in production mode
- Browser target (web)

## Links

- **Core System**: https://github.com/vrcx-plugin-system/vrcx-plugin-system
- **Plugins**: https://github.com/vrcx-plugin-system/plugins
- **VRCX**: https://github.com/vrcx-team/VRCX

## License

MIT License
