# VRCX Plugin System

TypeScript-based extensible plugin system for VRCX with hot-reload support, settings management, and comprehensive APIs.

## Features

- ✅ **TypeScript-first** - Full type safety with IDE autocomplete
- ✅ **Hot-reload** - Load/reload plugins without restarting VRCX
- ✅ **Repository system** - Install plugins from remote repositories
- ✅ **Settings management** - Equicord-style settings with categories and validation
- ✅ **Dependency resolution** - Required and optional dependencies with timeouts
- ✅ **Hook system** - Intercept and modify any function
- ✅ **Event system** - Publish/subscribe pattern for plugin communication
- ✅ **Resource management** - Automatic cleanup of timers, listeners, observers
- ✅ **Parallel loading** - Optimized startup with concurrent module fetching
- ✅ **Testing** - Comprehensive Jest test suite
- ✅ **Min/max validation** - Built-in setting value clamping

## Installation

### For Users

1. **Download the latest release:**

   Download [custom.js](https://github.com/vrcx-plugin-system/vrcx-plugin-system/releases/latest/download/custom.js)

2. **Place in VRCX directory:**

   Copy `custom.js` to `%APPDATA%\VRCX\`

   (On Windows, paste `%APPDATA%\VRCX\` into File Explorer's address bar)

3. **Restart VRCX**

That's it! The plugin system will load automatically.

### For Developers

If you want to build from source or contribute:

#### Prerequisites

- Node.js (v16 or higher)
- PowerShell (for build script)
- Git (optional, for releases)

#### Setup

1. **Clone the repository:**

```bash
git clone https://github.com/vrcx-plugin-system/vrcx-plugin-system
cd vrcx-plugin-system/vrcx-plugin-system
```

2. **Install dependencies:**

```bash
npm install
```

3. **Build and deploy:**

```powershell
.\update.ps1
```

This runs tests, builds the system, and copies to `%APPDATA%\VRCX\`.

#### Development Workflow

**Watch Mode** (auto-rebuild on changes):

```bash
npm run watch
```

**Manual Build Steps:**

```bash
# Run tests
npm test

# Build the system
npm run build

# Copy to VRCX
copy dist\custom.js %APPDATA%\VRCX\
```

**Hot Reload:**

After updating `custom.js`, reload VRCX to test changes.

#### Build Script Options

```powershell
.\update.ps1 --skip-tests     # Skip Jest tests
.\update.ps1 --skip-deploy    # Don't copy to AppData
.\update.ps1 --no-timestamp   # Don't update build timestamp
.\update.ps1 --skip-git       # Skip git operations
```

#### Build Output

The build script provides a detailed summary:

```
╔════════════════════════════════════════════════════════════╗
║                     BUILD SUMMARY                          ║
╠════════════════════════════════════════════════════════════╣

Core System:
  TS Size:     41.25 KB
  JS Size:     41.80 KB
  Reduction:   -1.3%

Tests:
  Passed:      59
  Failed:      0
  Total:       59

Build: ✓ SUCCESS
Deploy: ✓ SUCCESS
```

The script automatically creates a GitHub release with the built `custom.js` file.

## Architecture

### Core Modules

| Module               | File                | Purpose                                 |
| -------------------- | ------------------- | --------------------------------------- |
| **CustomModule**     | `custom-module.ts`  | Base class for all plugins              |
| **Module**           | `module.ts`         | Base class for core and custom modules  |
| **ModuleHelpers**    | `module-helpers.ts` | Module loading and lifecycle management |
| **ModuleRepository** | `repository.ts`     | Repository fetching and management      |
| **ConfigManager**    | `config.ts`         | Settings and configuration system       |
| **Utils**            | `utils.ts`          | Utility functions (clipboard, etc.)     |

### Type System

All types defined in `src/types/index.ts`:

| Type                 | Purpose                            |
| -------------------- | ---------------------------------- |
| `ModuleMetadata`     | Plugin metadata structure          |
| `SettingDefinition`  | Setting configuration with min/max |
| `CustomActionButton` | Action button interface            |
| `ModuleLogger`       | Logging interface                  |
| `SettingType`        | Enum of setting types              |

## Plugin Development

### Extending CustomModule

```typescript
class MyPlugin extends CustomModule {
  constructor() {
    super({
      name: 'My Plugin 🎯',
      description: 'What it does',
      authors: [{name: 'Me', userId: 'usr_xxx'}],
      tags: ['Utility'],
      required_dependencies: ['dialog-api'],
      optional_dependencies: ['plugin-analyzer']
    });
  }

  async load() {
    this.settings = this.defineSettings({...});
    this.loaded = true;
  }

  async start() {
    this.started = true;
  }

  async stop() {
    await super.stop();
  }
}

window.customjs.__LAST_PLUGIN_CLASS__ = MyPlugin;
```

### Settings with Validation

```typescript
this.settings = this.defineSettings({
  interval: {
    type: SettingType.TIMESPAN,
    description: "Update interval",
    default: 60000,
    min: 5000, // 5 seconds minimum
    max: 3600000, // 1 hour maximum
  },
  volume: {
    type: SettingType.NUMBER,
    description: "Volume level",
    default: 50,
    min: 0,
    max: 100,
  },
});
```

Values are automatically clamped to min/max when set.

### Resource Management

```typescript
// All automatically cleaned up on plugin.stop()
this.registerTimer(setInterval(() => {}, 1000));
this.registerObserver(new MutationObserver(() => {}));
this.registerListener(button, "click", () => {});
this.registerSubscription(unsubscribeFn);
this.registerPreHook("path.to.function", (args) => {});
```

### Dialog Helpers

```typescript
// Automatic fallback to native confirm/alert
const confirmed = await this.showConfirmDialog(
  "Title",
  "Message",
  "Confirm",
  "Cancel"
);

await this.showAlertDialog("Title", "Message", "OK");
```

## Module Loading

### Parallel Optimization

Modules load in three phases:

1. **Fetch** (parallel) - All module code downloaded simultaneously
2. **Initialize** (parallel) - All `load()` methods called concurrently
3. **Start** (sequential with dependencies) - Respects dependency order

### Dependency Resolution

**Required Dependencies:**

- Module waits up to 10 seconds for each
- Throws error if unavailable
- Module fails to start if any missing

**Optional Dependencies:**

- Module waits up to 2 seconds for each
- Logs warning if unavailable
- Module continues without them

## Testing

### Run Tests

```bash
npm test
```

### Test Coverage

```bash
npm run test:coverage
```

### Watch Mode

```bash
npm run test:watch
```

### Test Suites

| Suite            | File                       | Tests    |
| ---------------- | -------------------------- | -------- |
| Module           | `module.test.ts`           | 8 tests  |
| CustomModule     | `custom-module.test.ts`    | 10 tests |
| Module Helpers   | `module-helpers.test.ts`   | 12 tests |
| Utils            | `utils.test.ts`            | 8 tests  |
| Repository       | `repository.test.ts`       | 7 tests  |
| Parallel Loading | `parallel-loading.test.ts` | 6 tests  |
| Lifecycle        | `lifecycle.test.ts`        | 8 tests  |

**Total: 59 tests** ensuring core functionality works correctly.

## Build System

### update.ps1 Features

| Feature              | Description                            |
| -------------------- | -------------------------------------- |
| **Testing**          | Runs Jest tests before building        |
| **Timestamp Update** | Updates build number in `src/index.ts` |
| **Build**            | Compiles TypeScript with webpack       |
| **Size Metrics**     | Tracks TS→JS size reduction            |
| **Deployment**       | Copies to `%APPDATA%\VRCX\`            |
| **Build Summary**    | Shows detailed table with all metrics  |

### Build Flags

| Flag             | Purpose                     |
| ---------------- | --------------------------- |
| `--no-timestamp` | Skip build timestamp update |
| `--skip-tests`   | Skip Jest test execution    |
| `--skip-deploy`  | Skip copying to AppData     |
| `--skip-git`     | Skip git operations         |

### Example Output

```
╔════════════════════════════════════════════════════════════╗
║                     BUILD SUMMARY                          ║
╠════════════════════════════════════════════════════════════╣

Core System:
  TS Size:     41.25 KB
  JS Size:     41.80 KB
  Reduction:   -1.3%

Tests:
  Passed:      59
  Failed:      0
  Total:       59

Build: ✓ SUCCESS
Deploy: ✓ SUCCESS
```

## Configuration

### TypeScript (tsconfig.json)

```json
{
  "target": "ES2020",
  "module": "ESNext",
  "strict": true,
  "moduleResolution": "node"
}
```

### Webpack (webpack.config.js)

```javascript
{
  entry: './src/index.ts',
  output: 'dist/custom.js',
  mode: 'production',
  optimization: {
    minimize: true
  }
}
```

## Global API

### window.customjs

| Property        | Type                 | Description            |
| --------------- | -------------------- | ---------------------- |
| `modules`       | `CustomModule[]`     | All loaded modules     |
| `repos`         | `ModuleRepository[]` | All repositories       |
| `configManager` | `ConfigManager`      | Settings manager       |
| `types`         | `{SettingType}`      | Type enums             |
| `classes`       | `{CustomModule}`     | Class references       |
| `sourceUrl`     | `string`             | Core system source URL |
| `build`         | `number`             | Build timestamp        |

### Functions

| Function                 | Parameters     | Returns                     | Description             |
| ------------------------ | -------------- | --------------------------- | ----------------------- |
| `getModule()`            | `id: string`   | `CustomModule \| undefined` | Get module by ID        |
| `reloadModule()`         | `id: string`   | `Promise<Result>`           | Reload module           |
| `waitForModule()`        | `id, timeout?` | `Promise<CustomModule>`     | Wait for module to load |
| `definePluginSettings()` | `def, plugin`  | `ModuleSettings`            | Define plugin settings  |

## Project Structure

```
vrcx-plugin-system/
├── src/
│   ├── index.ts              # Entry point, global initialization
│   ├── modules/
│   │   ├── module.ts         # Base Module class
│   │   ├── custom-module.ts  # CustomModule class with APIs
│   │   ├── module-helpers.ts # Loading and lifecycle
│   │   ├── repository.ts     # Repository management
│   │   ├── config.ts         # Settings and config
│   │   └── utils.ts          # Utility functions
│   └── types/
│       └── index.ts          # TypeScript definitions
├── tests/                    # Jest test suites
├── dist/
│   └── custom.js             # Built output
├── docs/
│   ├── api-reference.md      # Complete API docs
│   └── plugins.md            # Plugin development guide
├── webpack.config.js
├── tsconfig.json
├── jest.config.js
├── package.json
└── update.ps1                # Build and deployment script
```

## Development Workflow

1. **Edit source**: Modify TypeScript files
2. **Run tests**: `npm test` to verify changes
3. **Build**: `npm run build` or use watch mode
4. **Deploy**: Copy `dist/custom.js` to `%APPDATA%\VRCX\`
5. **Test in VRCX**: Reload VRCX or use hot-reload
6. **Iterate**: Repeat until satisfied

### Automated Workflow

```powershell
.\update.ps1
```

Does everything automatically with detailed logging.

## Troubleshooting

| Issue                  | Solution                                |
| ---------------------- | --------------------------------------- |
| Build fails            | Check TypeScript errors, run `npm test` |
| Plugin not loading     | Verify class export, check console      |
| Settings not appearing | Check `defineSettings()` syntax         |
| Dependencies timeout   | Verify dependency IDs, check load order |
| Tests failing          | Fix breaking changes, update tests      |

## Performance

### Load Time Optimizations

| Optimization            | Benefit                             |
| ----------------------- | ----------------------------------- |
| Parallel fetching       | All modules download simultaneously |
| Parallel initialization | `load()` methods run concurrently   |
| Script execution lock   | Prevents race conditions            |
| Dependency batching     | Groups by dependency requirements   |

### Typical Load Times

- **Fetch 21 modules**: ~2 seconds (parallel)
- **Initialize**: ~200ms (parallel)
- **Start with deps**: ~3 seconds (sequential)
- **Total**: ~5-6 seconds for full system

## Security

- Plugins run in browser context with full access
- Only install plugins from trusted sources
- Review plugin code before enabling
- Use Plugin Analyzer to inspect code

## Links

- **Core System**: https://github.com/vrcx-plugin-system/vrcx-plugin-system
- **Plugins**: https://github.com/vrcx-plugin-system/plugins
- **VRCX**: https://github.com/vrcx-team/VRCX

## License

MIT
