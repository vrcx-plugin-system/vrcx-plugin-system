# VRCX Plugin System

TypeScript-based plugin management system for VRCX, with build-time bundling and runtime plugin loading.

## Project Structure

```
vrcx-plugin-system/
├── src/                       # TypeScript source files
│   ├── index.ts              # Main entry point
│   ├── types/                # TypeScript type definitions
│   │   └── index.ts
│   └── modules/              # Core modules
│       ├── logger.ts         # Logger class
│       ├── config.ts         # ConfigManager & Settings
│       ├── utils.ts          # Utility functions
│       └── plugin.ts         # Plugin, PluginLoader, PluginManager
├── dist/                     # Build output (gitignored)
│   └── custom.js            # Bundled output file
├── node_modules/             # Dependencies (gitignored)
├── package.json              # Node.js project config
├── tsconfig.json            # TypeScript config
├── webpack.config.js        # Webpack bundler config
├── update.ps1               # Build & deploy script
└── README.md                # This file
```

## Setup & Development

### Prerequisites

- **Node.js** 20+ (with npm)
- **Git**
- **PowerShell** (for `update.ps1` script on Windows)

### Installation

1. Clone the repository:

   ```bash
   git clone https://github.com/vrcx-plugin-system/vrcx-plugin-system.git
   cd vrcx-plugin-system/vrcx-plugin-system
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Building

Build the project (production):

```bash
npm run build
```

Build for development (unminified):

```bash
npm run build:dev
```

Watch mode (auto-rebuild on changes):

```bash
npm run watch
```

Clean build artifacts:

```bash
npm run clean
```

### Deploying to VRCX

Run the PowerShell update script to build and copy to VRCX:

```powershell
.\update.ps1
```

This will:

1. Check for Node.js and npm
2. Install/update dependencies if needed
3. Build the TypeScript project
4. Copy `dist/custom.js` to `%APPDATA%\VRCX\`
5. Clear VRCX logs (optional)

## Core Modules

### Logger

Centralized logging to console, VRCX UI, VR overlays, and webhooks.

```typescript
import { Logger } from "./modules/logger";

const logger = new Logger("MyContext");
logger.info("Info message");
logger.warn("Warning message");
logger.error("Error message");
logger.showInfo("VRCX notification");
await logger.notifyDesktop("Desktop notification");
```

### ConfigManager

Equicord-inspired settings system with localStorage backend.

```typescript
// Get/Set values
window.customjs.configManager.get("key", defaultValue);
window.customjs.configManager.set("key", value);

// Plugin settings
const settings = this.defineSettings({
  enabled: {
    type: SettingType.BOOLEAN,
    description: "Enable the plugin",
    default: true,
  },
});

// Access settings
settings.store.enabled = false; // Reactive
settings.plain.enabled; // Non-reactive
```

### Utils

Utility functions for common tasks.

```typescript
window.customjs.utils.isEmpty(value);
window.customjs.utils.timeToText(milliseconds);
window.customjs.utils.copyToClipboard(text);
window.customjs.utils.getLocationObject(location);
```

### Plugin System

Base `Plugin` class, `PluginLoader` for remote plugins, and `PluginManager` for lifecycle.

```javascript
// In your plugin (plain JS with JSDoc)
/** @typedef {import('path/to/types').PluginMetadata} PluginMetadata */

class MyPlugin extends window.customjs.Plugin {
  constructor() {
    super({
      name: "My Plugin",
      description: "Does cool things",
      author: "Me",
      version: "1.0.0",
    });
  }

  async load() {
    this.log("Plugin loading...");
    // Register hooks, setup
  }

  async start() {
    this.log("Plugin starting...");
    // Start timers, modify DOM
  }

  async onLogin(currentUser) {
    this.log(`Logged in as ${currentUser.displayName}`);
  }

  async stop() {
    this.log("Plugin stopping...");
    await super.stop(); // Cleanup resources
  }
}

// Export for auto-instantiation
window.customjs.__LAST_PLUGIN_CLASS__ = MyPlugin;
```

## Plugin Development

Plugins remain as **plain JavaScript files** and are loaded remotely at runtime.

### Plugin Structure

```javascript
// JSDoc type annotations for IDE support
/** @type {typeof window.customjs.Plugin} */
const Plugin = window.customjs.Plugin;

class MyPlugin extends Plugin {
  constructor() {
    super({
      name: "My Plugin",
      version: "1.0.0",
    });
  }

  async load() {
    // Initial setup
  }

  async start() {
    // Start running
  }
}

window.customjs.__LAST_PLUGIN_CLASS__ = MyPlugin;
```

### Plugin API

- **Resource Management**: `registerTimer()`, `registerListener()`, `registerObserver()`
- **Hooks**: `registerPreHook()`, `registerPostHook()`, `registerVoidHook()`, `registerReplaceHook()`
- **Events**: `emit()`, `on()`, `subscribe()`
- **Settings**: `defineSettings()`, `get()`, `set()`
- **Logging**: `log()`, `warn()`, `error()`

### Plugin Repository

Plugins are maintained separately at:
https://github.com/vrcx-plugin-system/plugins

Default plugins are loaded from:

```
https://raw.githubusercontent.com/vrcx-plugin-system/plugins/main/{plugin-name}.js
```

## GitHub Actions

### Manual Release Workflow

Create a release with GitHub Actions:

1. Go to **Actions** tab
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Optionally mark as pre-release
5. Workflow will:
   - Build the TypeScript project
   - Create a release named "VRCX Plugin Manager v{unixtime}"
   - Upload `custom.js` to the release

### Download URLs

**Latest release:**

```
https://github.com/vrcx-plugin-system/vrcx-plugin-system/releases/latest/download/custom.js
```

**Specific version:**

```
https://github.com/vrcx-plugin-system/vrcx-plugin-system/releases/download/v{timestamp}/custom.js
```

## Configuration

### Webpack (webpack.config.js)

- **Entry**: `src/index.ts`
- **Output**: `dist/custom.js` (single file)
- **Minification**: Terser (production mode)
- **Source Maps**: Disabled
- **Target**: Browser (web)

### TypeScript (tsconfig.json)

- **Target**: ES2020
- **Module**: ESNext
- **Strict**: true
- **No source maps**
- **No declarations**

### Git (.gitignore)

Ignored directories:

- `node_modules/`
- `dist/`
- `plugins/` (now in separate repo)

## Migration Guide

### For Core Module Developers

**Before (v2.x):**

```javascript
class MyModule extends CoreModule {
  constructor() {
    super({ id: "mymodule", ... });
  }
}
new MyModule();
```

**After (v3.x):**

```typescript
// In src/modules/mymodule.ts
export class MyModule {
  // No base class needed
}

// In src/index.ts
import { MyModule } from "./modules/mymodule";
const myModule = new MyModule();
window.customjs.myModule = myModule;
```

### For Plugin Developers

**No changes required!** Plugins continue to work the same way. Just ensure:

1. Your plugin extends `window.customjs.Plugin`
2. You export via `window.customjs.__LAST_PLUGIN_CLASS__ = YourPlugin`
3. You're using JSDoc comments for type hints

## Troubleshooting

### Build Errors

```bash
# Clean and reinstall
npm run clean
rm -rf node_modules package-lock.json
npm install
npm run build
```

### TypeScript Errors

Check `tsconfig.json` and ensure all source files are in `src/` directory.

### Deployment Issues

If `update.ps1` fails to copy:

1. Close VRCX completely
2. Run `update.ps1` again
3. Check that `%APPDATA%\VRCX` exists

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Make your changes in `src/`
4. Test with `npm run build:dev`
5. Commit with descriptive messages
6. Push to your fork
7. Open a Pull Request

## License

MIT License - see LICENSE file for details

## Documentation

- **[Plugin Development Guide](docs/plugins.md)** - Complete guide for plugin developers
- **[API Reference](docs/api-reference.md)** - Full API documentation
- **[Migration Guide](MIGRATION-GUIDE.md)** - Migrating from v2.x to
- **[Changelog](CHANGELOG.md)** - Version history and changes

## Links

- **Main Repository**: https://github.com/vrcx-plugin-system/vrcx-plugin-system
- **Plugins Repository**: https://github.com/vrcx-plugin-system/plugins
- **VRCX**: https://github.com/vrcx-team/VRCX

## Credits

- Original VRCX Custom JS by Bluscream
- TypeScript refactor and build system
- Equicord-inspired settings system
- Community plugin developers

---
