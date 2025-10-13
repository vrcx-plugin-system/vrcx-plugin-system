# VRCX Custom.js - Advanced Plugin System

> **A powerful, modular plugin framework for VRCX with centralized configuration management, automatic resource cleanup, and persistent settings.**

A modern JavaScript plugin system that extends VRCX with features like custom navigation tabs, context menus, user tagging, bio automation, protocol link handlers, and comprehensive plugin management UI. Built on a robust architecture with proper lifecycle management, centralized configuration, and automatic resource tracking.

**🎯 Status:** Production Ready ✅ | **📦 Version:** 2.1.0 | **🔌 Plugins:** 17 Available | **⚙️ Core Modules:** 4

---

## 📋 Table of Contents

- [Features](#-features)
- [Quick Start](#-quick-start)
- [Architecture Overview](#-architecture-overview)
- [Configuration System](#-configuration-system)
- [Core Modules](#-core-modules)
- [Available Plugins](#-available-plugins)
- [Plugin Development](#-plugin-development)
- [API Reference](#-api-reference)
- [Troubleshooting](#-troubleshooting)

---

## ✨ Features

### 🏗️ **Core System**

- **Modular Architecture** - Core modules + Plugin system
- **Centralized Configuration** - All settings in `vrcx.customjs` section of VRChat config
- **Lifecycle Management** - `load()` → `start()` → `onLogin()` → `stop()`
- **Hot Reload** - Enable/disable/reload plugins without restarting VRCX
- **Automatic Cleanup** - Timers, observers, listeners, subscriptions tracked and cleaned up
- **Fallback Logger** - System continues working even if modules fail to load

### 🎨 **Plugin Features**

- **Navigation Tabs** - Add custom tabs to VRCX navigation
- **Context Menus** - Add items to user/world/avatar/group dialog menus
- **Protocol Links** - Copy VRCX protocol links for quick sharing
- **User Tagging** - Load and display 6000+ custom user tags
- **Registry Management** - Control VRChat registry settings
- **Auto Invite/Follow** - Automatic invitation and following systems
- **Bio Updates** - Dynamic bio templates with placeholders
- **Plugin Manager UI** - Visual management dashboard

### 🔧 **Developer Features**

- **Event System** - Inter-plugin communication via events
- **Hook System** - Intercept and modify function calls (pre/post/void/replace)
- **Resource Tracking** - Automatic cleanup of timers, observers, listeners, subscriptions
- **Pinia Subscriptions** - Centralized tracking via `window.customjs.subscriptions`
- **Type Safety** - Configuration type validation
- **Debug Tools** - Comprehensive debugging utilities

---

## 🚀 Quick Start

### Installation

1. **Clone or download** this repository to your workspace

2. **Copy `custom.js` to VRCX AppData folder:**

   ```
   %APPDATA%\VRCX\custom.js
   ```

3. **Restart VRCX** - The plugin system will initialize automatically

4. **(Optional) Use the update script** for automated deployment:
   ```powershell
   cd vrcx-custom
   .\update.ps1
   ```

### First Run

On first run, the system will:

1. Load 4 core modules (logger, config, utils, plugin)
2. Initialize ConfigManager and load settings from VRChat's config.json
3. Load enabled plugins from `vrcx.customjs.loader.plugins`
4. Start all loaded plugins
5. Save current configuration to disk

### Enabling/Disabling Plugins

**Method 1: Via Config File**

Edit `%LOCALAPPDATA%\VRChat\VRChat\config.json`:

```json
{
  "vrcx": {
    "customjs": {
      "loader": {
        "plugins": {
          "https://github.com/.../plugin-name.js": true, // enabled
          "https://github.com/.../other-plugin.js": false // disabled
        },
        "loadTimeout": 10000
      }
    }
  }
}
```

**Method 2: Via Console**

```javascript
// Get plugin config
const config = customjs.pluginManager.getPluginConfig();

// Enable/disable a plugin
config["https://...plugin.js"] = true; // or false

// Save config
customjs.pluginManager.savePluginConfig(config);
await customjs.configManager.save();
```

**Method 3: Via Plugin Manager UI**

1. Load the `plugin-manager-ui` plugin
2. Navigate to the "Plugins" tab
3. Use the toggle buttons to enable/disable plugins

---

## 🏗️ Architecture Overview

### System Structure

```
┌─────────────────────────────────────────────────────────┐
│                    custom.js (Entry Point)               │
│  - Module/CoreModule/Plugin base classes                │
│  - ModuleLoader for core module loading                 │
│  - Bootstrap function to initialize plugin system       │
└─────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Core Modules │  │    Plugins   │  │    Config    │
│  (Always)    │  │ (Conditional)│  │ (Persistent) │
└──────────────┘  └──────────────┘  └──────────────┘
        │                 │                   │
        ▼                 ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ logger.js    │  │ context-menu │  │ vrcx.customjs│
│ config.js    │  │ nav-menu     │  │  .loader     │
│ utils.js     │  │ protocol     │  │  .settings   │
│ plugin.js    │  │ tag-manager  │  │  .logger     │
└──────────────┘  │ auto-invite  │  └──────────────┘
                  │ auto-follow  │
                  │ registry     │
                  │ bio-updater  │
                  │ ... (14 total)│
                  └──────────────┘
```

### Global Namespace: `window.customjs`

```javascript
window.customjs = {
  // System info
  version: "2.1.0", // Plugin system version
  build: "1728778800", // Build timestamp

  // Core components
  Module: Module, // Base Module class
  CoreModule: CoreModule, // Core module class
  ModuleLoader: ModuleLoader, // Module loading class
  PluginManager: PluginManager, // Plugin manager class
  coreModules: Map, // Map of loaded core modules (id -> instance)
  plugins: [], // Array of loaded Plugin instances

  // Managers
  pluginManager: PluginManager, // Plugin lifecycle manager
  configManager: ConfigManager, // Configuration manager
  Logger: Logger, // Logger class (for creating instances)

  // Configuration (proxied from ConfigManager)
  config: {
    settings: {}, // Plugin settings (pluginId -> category -> setting)
    loader: {}, // Loader settings (plugins, loadTimeout)
    logger: {}, // Logger settings (webhook, etc.)
  },

  // Tracking systems
  subscriptions: Map, // pluginId -> Set of unsubscribe functions
  hooks: {
    // Function hooks
    pre: {}, // Before function calls
    post: {}, // After function calls
    void: {}, // Cancel function calls
    replace: {}, // Replace function implementation
  },
  functions: {}, // Original function backups
  events: {}, // Event registry for inter-plugin communication

  // Utilities
  utils: {}, // Utility functions (from utils.js)
};
```

---

## ⚙️ Configuration System

### Config File Location

All configuration is stored in VRChat's config file:

```
%LOCALAPPDATA%\VRChat\VRChat\config.json
```

### Config Structure

```json
{
  "vrcx": {
    "customjs": {
      "loader": {
        "plugins": {
          "https://...plugin1.js": true, // Plugin enabled
          "https://...plugin2.js": false // Plugin disabled
        },
        "loadTimeout": 10000 // Plugin load timeout (ms)
      },
      "settings": {
        "plugin-id": {
          "category-name": {
            "setting-key": "value"
          }
        }
      },
      "logger": {
        "webhook": "http://homeassistant.local:8123/api/webhook/vrcx"
      }
    }
  }
}
```

### Configuration Hierarchy

1. **`vrcx.customjs.loader`** - Loader configuration

   - `plugins` - Object mapping plugin URLs to enabled state
   - `loadTimeout` - Timeout for loading plugins (milliseconds)

2. **`vrcx.customjs.settings`** - Plugin-specific settings

   - Organized by plugin ID → category → setting key
   - All settings saved (including defaults)
   - Type validated automatically

3. **`vrcx.customjs.logger`** - Logger configuration

   - `webhook` - Webhook URL for remote logging

4. **`vrcx.customjs.[category]`** - Other general settings
   - Can be extended with custom categories via `registerGeneralCategory()`

### Accessing Configuration

**In Plugins:**

```javascript
// Access your plugin's settings (PluginSetting objects)
this.config.general.enabled.value; // Current value
this.config.general.enabled.defaultValue; // Default value
this.config.general.enabled.isModified(); // Is changed from default?

// Modify and save
this.config.general.enabled.value = false;
await this.saveSettings();
```

**From Global Namespace:**

```javascript
// Direct value access (proxied)
window.customjs.config.settings.pluginId.category.setting;

// General settings
window.customjs.config.logger.webhook.value;
window.customjs.config.loader.loadTimeout.value;

// ConfigManager API
await customjs.configManager.save(); // Save all
await customjs.configManager.load(); // Reload from disk
customjs.configManager.reset(); // Reset all to defaults
customjs.configManager.reset("plugin-id"); // Reset specific plugin
customjs.configManager.debug(); // Get full config structure
```

---

## 🧩 Core Modules

Core modules are always loaded before plugins. They provide the foundation for the plugin system.

### 1. **logger.js** - Logging System

**Purpose:** Provides comprehensive logging with multiple output channels

**Features:**

- Console logging with formatted context
- VRCX UI notifications (noty, notify, message)
- Desktop notifications
- VR overlay notifications (XSOverlay, OVRToolkit)
- Webhook integration for remote logging
- Per-plugin logger instances

**Usage:**

```javascript
// Each plugin automatically gets this.logger
this.logger.log("Info message");
this.logger.warn("Warning message");
this.logger.error("Error message");
this.logger.showSuccess("Toast notification");
this.logger.notifyDesktop("Desktop notification");
this.logger.notifyVR("VR overlay notification");

// Advanced logging with multiple outputs
this.logger.log(
  "Message",
  {
    console: true,
    vrcx: { noty: true },
    desktop: true,
    xsoverlay: true,
    webhook: true,
  },
  "info"
);
```

**Configuration:**

```json
{
  "vrcx": {
    "customjs": {
      "logger": {
        "webhook": "http://your-webhook-url"
      }
    }
  }
}
```

### 2. **config.js** - Configuration Manager

**Purpose:** Centralized configuration management with type validation and persistence

**Features:**

- Plugin settings organized by categories
- General (non-plugin) settings support
- Type validation (string, number, boolean, object, array)
- Only saves to VRChat's config.json
- Proxy system for easy access
- Tracks modified vs default values

**Classes:**

- `PluginSetting` - Individual setting with metadata
- `ConfigManager` - Main configuration manager

**API:**

```javascript
// Register plugin settings
this.registerSettingCategory("general", "General Settings", "Description");
this.registerSetting(
  "general",
  "enabled",
  "Enable Feature",
  "boolean",
  true,
  "Description"
);

// Register general settings
customjs.configManager.registerGeneralCategory("mycat", "My Category", "Desc");
customjs.configManager.registerGeneralSetting(
  "mycat",
  "key",
  "Name",
  "string",
  "default",
  "Desc"
);

// Access settings
this.config.general.enabled.value; // From plugin
customjs.config.settings.pluginId.general.enabled; // From global

// Save/load
await customjs.configManager.save();
await customjs.configManager.load();
customjs.configManager.debug(); // Inspect structure
```

### 3. **utils.js** - Utility Functions

**Purpose:** Common utility functions used across plugins

**Functions:**

- `isEmpty(value)` - Check if value is null/undefined/empty
- `timeToText(ms)` - Convert milliseconds to human-readable format ("2d 3h")
- `getTimestamp(date)` - Get localized timestamp
- `formatDateTime(date)` - Format as "YYYY-MM-DD HH:MM:SS GMT+1"
- `copyToClipboard(text, desc)` - Copy to clipboard with fallback
- `saveBio(bio, bioLinks)` - Save bio with smart defaults
- `getLocationObject(loc)` - Parse location string/object

**Usage:**

```javascript
// Direct access (not a plugin, just utilities)
window.customjs.utils.copyToClipboard("text", "Description");
window.customjs.utils.timeToText(3600000); // "1h 0m"
window.customjs.utils.isEmpty(value);
```

### 4. **plugin.js** - Plugin Base Class

**Purpose:** Base class that all plugins extend

**Features:**

- Lifecycle methods (load, start, onLogin, stop)
- Resource tracking and auto-cleanup
- Personal logger instance per plugin
- Configuration registration
- Event system (emit/on)
- Hook registration (pre/post/void/replace)
- Enable/disable/toggle functionality

**Lifecycle:**

```javascript
class MyPlugin extends Plugin {
  async load() {
    // Called when plugin code loads
    // - Register settings
    // - Setup hooks
    // - Prepare but don't start
  }

  async start() {
    // Called after all plugins loaded
    // - Start timers
    // - Setup UI
    // - Activate features
  }

  async onLogin(currentUser) {
    // Called after VRChat login
    // - Load user data
    // - Make authenticated API calls
  }

  async stop() {
    // Called when disabled/unloaded
    // - Custom cleanup
    // - Auto-cleanup (timers, observers, etc.)
  }
}
```

---

## 🔌 Available Plugins

### UI & Navigation

| Plugin                | Description                              | Default     |
| --------------------- | ---------------------------------------- | ----------- |
| **config-proxy**      | Proxy config access for plugin settings  | ✅ Enabled  |
| **context-menu-api**  | Add custom items to dialog context menus | ✅ Enabled  |
| **nav-menu-api**      | Create custom navigation tabs            | ✅ Enabled  |
| **plugin-manager-ui** | Visual plugin management dashboard       | ⚠️ Disabled |

### Features

| Plugin                 | Description                                 | Default    |
| ---------------------- | ------------------------------------------- | ---------- |
| **protocol-links**     | Copy VRCX protocol links (vrcx://user/...)  | ✅ Enabled |
| **tag-manager**        | Load and display custom user tags from JSON | ✅ Enabled |
| **registry-overrides** | Manage VRChat registry settings             | ✅ Enabled |
| **auto-invite**        | Automatically invite users when traveling   | ✅ Enabled |
| **auto-follow**        | Follow users and send invite requests       | ✅ Enabled |
| **avatar-log**         | Log and submit avatar IDs to databases      | ✅ Enabled |
| **yoinker-detector**   | Detect and log yoinker/avatar ripper users  | ✅ Enabled |

### Advanced Features

| Plugin                         | Description                                   | Default     |
| ------------------------------ | --------------------------------------------- | ----------- |
| **bio-updater**                | Auto-update bio with dynamic templates        | ⚠️ Disabled |
| **monitor-invisibleplayers**   | Monitor invisible players in instances        | ⚠️ Disabled |
| **selfinvite-onblockedplayer** | Create self-invites when blocked players join | ⚠️ Disabled |

### Development

| Plugin              | Description                           | Default     |
| ------------------- | ------------------------------------- | ----------- |
| **debug**           | Debug utilities and system inspection | ⚠️ Disabled |
| **template**        | Comprehensive plugin example/template | ⚠️ Disabled |
| **invite-message-api** | Legacy invite message API (deprecated) | ✅ Enabled |

---

## 📁 Project Structure

```
vrcx-custom/
├── custom.js                    # Main entry point & PluginManager
├── custom.css                   # Custom styling (optional)
├── update.ps1                   # Deployment script
├── README.md                    # This file
│
├── js/                          # CORE MODULES (Always Loaded)
│   ├── logger.js                # Logging system with multiple outputs
│   ├── config.js                # Configuration manager with persistence
│   ├── utils.js                 # Utility functions
│   └── plugin.js                # Plugin base class
│
└── js/plugins/                  # PLUGINS (Conditionally Loaded)
    ├── config-proxy.js          # Config access proxy
    ├── context-menu-api.js      # Context menu management
    ├── nav-menu-api.js          # Navigation tab API
    ├── invite-message-api.js    # Invite message API (legacy)
    ├── protocol-links.js        # VRCX protocol links
    ├── registry-overrides.js    # VRChat registry settings
    ├── tag-manager.js           # Custom user tags
    ├── yoinker-detector.js      # Yoinker/ripper detection
    ├── auto-invite.js           # Auto invitation system
    ├── auto-follow.js           # Auto follow system
    ├── bio-updater.js           # Bio automation
    ├── plugin-manager-ui.js     # Plugin management UI
    ├── monitor-invisibleplayers.js  # Invisible player monitor
    ├── selfinvite-onblockedplayer.js # Self-invite on block
    ├── avatar-log.js            # Avatar ID logger
    ├── avatar-log.README.md     # Avatar logger documentation
    ├── debug.js                 # Debug utilities
    └── template.js              # Plugin template/example
```

---

## 🔧 Plugin Development

### Creating a New Plugin

Use `template.js` as your starting point:

```javascript
class MyPlugin extends Plugin {
  constructor() {
    super({
      name: "My Plugin",
      description: "What this plugin does",
      author: "Your Name",
      version: "1.0.0",
      build: "1760411000",
      dependencies: [
        "https://github.com/.../plugin.js", // Required
      ],
    });
  }

  async load() {
    // Register settings
    this.registerSettingCategory("general", "General Settings", "Description");
    this.registerSetting(
      "general",
      "enabled",
      "Enable Feature",
      "boolean",
      true
    );

    this.loaded = true;
    this.logger.log("Plugin loaded");
  }

  async start() {
    // Start timers with auto-cleanup
    this.registerTimer(
      setInterval(() => {
        if (this.config.general.enabled.value) {
          this.doSomething();
        }
      }, 5000)
    );

    // Register Pinia subscription with auto-cleanup
    this.registerSubscription(
      window.$pinia.location.$subscribe((mutation, state) => {
        this.onLocationChange(state.location);
      })
    );

    this.started = true;
    this.logger.log("Plugin started");
  }

  async onLogin(currentUser) {
    this.logger.log(`User logged in: ${currentUser.displayName}`);
  }

  async stop() {
    this.logger.log("Plugin stopping");
    await super.stop(); // Auto-cleanup
  }

  doSomething() {
    this.logger.log("Doing something!");
  }

  onLocationChange(location) {
    this.logger.log(`Location changed: ${location?.instanceId}`);
  }
}

// Export for PluginManager
window.customjs.__lastPluginClass = MyPlugin;
```

### Registration & Settings

**Register Setting Categories:**

```javascript
this.registerSettingCategory(
  "general",
  "General Settings",
  "Basic configuration"
);
this.registerSettingCategory("timing", "Timing", "Timing configuration");
```

**Register Settings:**

```javascript
// Types: "string", "number", "boolean", "object", "array"
this.registerSetting(
  "general",
  "enabled",
  "Enable Feature",
  "boolean",
  true,
  "Enable/disable main feature"
);
this.registerSetting(
  "general",
  "message",
  "Custom Message",
  "string",
  "Hello!",
  "Message to display"
);
this.registerSetting(
  "timing",
  "interval",
  "Update Interval",
  "number",
  60000,
  "Milliseconds"
);
this.registerSetting(
  "general",
  "urls",
  "URL List",
  "array",
  [],
  "List of URLs"
);
this.registerSetting(
  "general",
  "config",
  "Advanced Config",
  "object",
  {},
  "JSON object"
);
```

**Access Settings:**

```javascript
// From within plugin
this.config.general.enabled.value; // Get value
this.config.general.enabled.value = false; // Set value
this.config.general.enabled.defaultValue; // Get default
this.config.general.enabled.isModified(); // Check if changed
await this.saveSettings(); // Save to disk

// From global namespace
window.customjs.config.settings.myplugin.general.enabled; // Direct value
```

### Resource Management

All registered resources are automatically cleaned up when plugin stops:

```javascript
// Timers
const timerId = setInterval(() => { ... }, 1000);
this.registerTimer(timerId);

// Observers
const observer = new MutationObserver(() => { ... });
this.registerObserver(observer);
observer.observe(target, options);

// Event Listeners
this.registerListener(element, 'click', handler);

// Pinia Subscriptions (centralized tracking)
this.registerSubscription(
  window.$pinia.store.$subscribe((mutation, state) => { ... })
);

// Alias for subscriptions
this.registerResource(unsubscribeFunction);
```

### Inter-Plugin Communication

**Events:**

```javascript
// Emit event
this.emit("my-event", { data: "value" });

// Listen to your own events
this.on("my-event", (data) => {
  console.log("Received:", data);
});

// Listen to other plugin's events
this.on("other-plugin:event-name", (data) => {
  console.log("From other plugin:", data);
});
```

**Accessing Other Plugins:**

```javascript
// Get plugin immediately
const utils = window.customjs.pluginManager.getPlugin("utils");

// Wait for plugin to load (use in start())
const contextMenu = await window.customjs.pluginManager.waitForPlugin(
  "context-menu-api"
);

// Access via plugins array
const allPlugins = window.customjs.plugins;
```

### Function Hooks

**Pre-Hook (run before):**

```javascript
this.registerPreHook("AppApi.SendIpc", (args) => {
  console.log("About to call SendIpc with:", args);
});
```

**Post-Hook (run after):**

```javascript
this.registerPostHook("AppApi.SendIpc", (result, args) => {
  console.log("SendIpc returned:", result);
});
```

**Void Hook (cancel execution):**

```javascript
this.registerVoidHook("AppApi.SendIpc", (args) => {
  console.log("SendIpc called but cancelled:", args);
  // Original function will NOT execute
});
```

**Replace Hook (replace implementation):**

```javascript
this.registerReplaceHook("AppApi.SendIpc", function (originalFunc, ...args) {
  console.log("Replacing SendIpc");
  // Optionally call original
  const result = originalFunc(...args);
  // Or return your own result
  return result;
});
```

---

## 🌐 API Reference

### PluginManager API

```javascript
// Plugin management
customjs.pluginManager.getPlugin(pluginId)           // Get plugin instance
customjs.pluginManager.getAllPlugins()               // Get all plugins
await customjs.pluginManager.waitForPlugin(id, ms)   // Wait for plugin to load

// Plugin loading
await customjs.pluginManager.addPlugin(url)          // Load new plugin
await customjs.pluginManager.removePlugin(url)       // Remove plugin
await customjs.pluginManager.reloadPlugin(url)       // Reload plugin
await customjs.pluginManager.reloadAllPlugins()      // Reload all

// Lifecycle
await customjs.pluginManager.startAllPlugins()       // Start all plugins
await customjs.pluginManager.stopAllPlugins()        // Stop all plugins

// Login callbacks
customjs.pluginManager.onLogin((user) => { ... })    // Register login callback

// Config
customjs.pluginManager.getPluginConfig()             // Get { url: enabled } mapping
customjs.pluginManager.savePluginConfig(config)      // Save plugin config

// Info
customjs.pluginManager.getPluginList()               // Get load status
customjs.pluginManager.findPluginByUrl(url)          // Find plugin by URL

// Hooks
customjs.pluginManager.registerPreHook(path, fn, plugin)
customjs.pluginManager.registerPostHook(path, fn, plugin)
customjs.pluginManager.registerVoidHook(path, fn, plugin)
customjs.pluginManager.registerReplaceHook(path, fn, plugin)

// Subscriptions
customjs.pluginManager.registerSubscription(pluginId, unsubscribe)
customjs.pluginManager.unregisterSubscriptions(pluginId)
```

### ConfigManager API

```javascript
// General settings
configManager.registerGeneralCategory(key, name, description);
configManager.registerGeneralSetting(
  category,
  key,
  name,
  type,
  defaultValue,
  description
);

// Plugin settings
configManager.registerPluginSettingCategory(plugin, key, name, description);
configManager.registerPluginSetting(
  plugin,
  category,
  key,
  name,
  type,
  defaultValue,
  description
);

// Access settings
configManager.get(pluginId, category, key, defaultValue);
configManager.set(pluginId, category, key, value);
configManager.getPluginSettings(pluginId);
configManager.getPluginCategories(pluginId);

// Plugin config
configManager.getPluginConfig(); // Get { url: enabled } mapping
configManager.setPluginConfig(config); // Set plugin config

// Persistence
await configManager.save(); // Save to disk
await configManager.load(); // Load from disk
configManager.reset(pluginId); // Reset to defaults

// Debug
configManager.debug(); // Get full structure
```

### Plugin Base Class API

```javascript
// Lifecycle (override these)
async load()
async start()
async onLogin(currentUser)
async stop()

// State management
await plugin.enable()
await plugin.disable()
await plugin.toggle()

// Settings
registerSettingCategory(key, name, description)
registerSetting(category, key, name, type, defaultValue, description)
await saveSettings()

// Resource tracking
registerTimer(timerId)
registerObserver(observer)
registerListener(element, event, handler, options)
registerSubscription(unsubscribe)
registerResource(unsubscribe)  // Alias for registerSubscription

// Hooks
registerPreHook(functionPath, callback)
registerPostHook(functionPath, callback)
registerVoidHook(functionPath, callback)
registerReplaceHook(functionPath, callback)

// Events
emit(eventName, data)
on(eventName, callback)

// Logging
log(message, ...args)
warn(message, ...args)
error(message, ...args)

// Properties
metadata: { id, name, description, author, version, build, dependencies, url }
enabled: boolean
loaded: boolean
started: boolean
config: {}  // Plugin settings (populated by ConfigManager)
logger: Logger  // Personal logger instance
```

### Logger API

```javascript
// Console logging
logger.log(msg, options, level);
logger.logInfo(msg) / logger.info(msg);
logger.logWarn(msg) / logger.warn(msg);
logger.logError(msg) / logger.error(msg);
logger.logDebug(msg) / logger.debug(msg);

// UI notifications
logger.showInfo(msg);
logger.showSuccess(msg);
logger.showWarn(msg);
logger.showError(msg);

// System notifications
await logger.notifyDesktop(msg);
await logger.notifyXSOverlay(msg, duration);
await logger.notifyOVRToolkit(msg, duration);
await logger.notifyVR(msg); // Both XSOverlay + OVRToolkit

// Combined
logger.logAndShow(msg, level);
logger.logAndNotifyAll(msg, level); // Console + VRCX + Desktop + VR
```

### Utils API

```javascript
// Type checking
utils.isEmpty(value); // null, undefined, or ""

// Time formatting
utils.timeToText(ms); // "2d 3h" or "45m 30s"
utils.getTimestamp(date); // Localized timestamp
utils.formatDateTime(date); // "2025-10-12 14:30:45 GMT+1"

// Clipboard
await utils.copyToClipboard(text, description);

// VRC API helpers
await utils.saveBio(bio, bioLinks);
await utils.getLocationObject(locationString);
```

---

## 🎮 Usage Examples

### Example 1: Simple Timer Plugin

```javascript
class TimerPlugin extends Plugin {
  constructor() {
    super({
      name: "Simple Timer",
      version: "1.0.0",
      build: "1760411000",
    });
  }

  async load() {
    this.registerSettingCategory("general", "General");
    this.registerSetting("general", "interval", "Interval", "number", 5000);
    this.loaded = true;
  }

  async start() {
    this.registerTimer(
      setInterval(() => {
        this.logger.log(
          `Timer tick! Interval: ${this.config.general.interval.value}ms`
        );
      }, this.config.general.interval.value)
    );

    this.started = true;
  }
}

window.customjs.__lastPluginClass = TimerPlugin;
```

### Example 2: Location Watcher

```javascript
class LocationWatcherPlugin extends Plugin {
  async start() {
    // Watch location changes
    this.registerSubscription(
      window.$pinia.location.$subscribe(async (mutation, state) => {
        if (state.location?.instanceId) {
          const loc = await window.customjs.utils.getLocationObject(
            state.location
          );
          this.logger.showInfo(`Joined: ${loc.worldName}`);
        }
      })
    );

    this.started = true;
  }
}

window.customjs.__lastPluginClass = LocationWatcherPlugin;
```

### Example 3: Context Menu Item

```javascript
class ContextMenuExamplePlugin extends Plugin {
  async start() {
    const contextMenu = await customjs.pluginManager.waitForPlugin(
      "context-menu-api"
    );

    contextMenu.addUserItem("my-action", {
      label: "My Custom Action",
      icon: "ri-star-line",
      handler: (context, item) => {
        this.logger.showSuccess(`Clicked on ${context.data.displayName}`);
        console.log("User data:", context.data);
      },
    });

    this.started = true;
  }
}

window.customjs.__lastPluginClass = ContextMenuExamplePlugin;
```

---

## 🐛 Troubleshooting

### Common Issues

**"Logger is not a constructor"**

- Logger failed to load from network
- Fallback logger will activate automatically
- Check console for network errors

**"Plugin not registered"**

- Missing `window.customjs.__lastPluginClass = YourPlugin;` at end of file
- Check class name matches exported name
- Verify constructor calls `super()`

**"Plugin timeout"**

- Plugin took > 10 seconds to load
- Increase `vrcx.customjs.loader.loadTimeout` in config
- Check for slow network or large plugin files

**Settings showing `[object Object]`**

- Accessing PluginSetting object instead of value
- Use `.value` property: `setting.value` or `setting?.value ?? setting`

**Subscriptions not cleaning up**

- Use `this.registerSubscription()` or `this.registerResource()`
- Don't call unsubscribe manually (PluginManager handles it)

### Debug Commands

```javascript
// Inspect system
console.log(customjs);
console.log(customjs.plugins);
console.log(customjs.subscriptions);

// Get config structure
customjs.configManager.debug();

// List all plugins
customjs.pluginManager.getPluginList();

// Check plugin state
const plugin = customjs.pluginManager.getPlugin("plugin-id");
console.log(plugin.enabled, plugin.loaded, plugin.started);

// Check subscriptions for a plugin
console.log(customjs.subscriptions.get("plugin-id"));

// Reload a plugin
await customjs.pluginManager.reloadPlugin("https://...plugin.js");

// Force save config
await customjs.configManager.save();
```

### Enable Debug Plugin

Edit your config to enable the debug plugin:

```json
{
  "vrcx": {
    "customjs": {
      "loader": {
        "plugins": {
          "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/debug.js": true
        }
      }
    }
  }
}
```

---

## 🔄 Updates & Deployment

### Using the Update Script

The `update.ps1` script automates deployment:

```powershell
cd vrcx-custom
.\update.ps1
```

**What it does:**

1. ✅ Validates JavaScript syntax (requires Node.js)
2. ✅ Switches to main branch
3. ✅ Stages and commits changes
4. ✅ Pushes to GitHub
5. ✅ Processes `{VERSION}` and `{BUILD}` placeholders
6. ✅ Replaces environment variables (`{env:VARIABLE}`)
7. ✅ Copies to `%APPDATA%\VRCX\`
8. ✅ Clears log files

### Version & Build System

Plugins can use placeholder values that get replaced during deployment:

```javascript
version: "{VERSION}",  // Replaced with git commit count for that file
build: "{BUILD}",      // Replaced with file's last modification timestamp (Unix)
```

### Environment Variables

Sensitive data can be stored in environment variables:

```powershell
[System.Environment]::SetEnvironmentVariable("STEAM_ID64", "your_id", "User")
[System.Environment]::SetEnvironmentVariable("STEAM_API_KEY", "your_key", "User")
```

In code:

```javascript
steamId: "{env:STEAM_ID64}",  // Replaced during deployment
apiKey: "{env:STEAM_API_KEY}",
```

---

## 📊 System Internals

### Plugin Loading Sequence

```
1. Load core modules (logger, config, utils, plugin)
   ├─ Fallback logger if main fails
   └─ Create ConfigManager instance

2. Initialize ConfigManager
   ├─ Load config from VRChat config.json
   ├─ Register loader settings
   └─ Merge with defaults

3. Load enabled plugins from config
   ├─ Fetch plugin code from URLs
   ├─ Execute in isolated scope
   ├─ Instantiate plugin class
   └─ Register with PluginManager

4. Call load() on all plugins
   └─ Plugins register settings, hooks, etc.

5. Setup config proxies
   └─ Create getters/setters for easy access

6. Call start() on all plugins
   └─ Plugins activate features

7. Setup login monitoring
   └─ Trigger onLogin() when user logs in

8. Save configuration
   └─ Persist enabled states and settings
```

### Subscription Tracking

Subscriptions are tracked centrally in `window.customjs.subscriptions`:

```javascript
// Map structure
window.customjs.subscriptions = Map {
  "plugin-id-1" => Set {
    unsubscribeFunction1,
    unsubscribeFunction2,
  },
  "plugin-id-2" => Set {
    unsubscribeFunction3,
  },
}

// When plugin stops
pluginManager.unregisterSubscriptions("plugin-id");
// All subscription functions are called automatically
```

### Hook System

Functions are wrapped to support hooks:

```javascript
// Original function backed up
customjs.functions["AppApi.SendIpc"] = originalFunction;

// Wrapped function calls hooks in order:
1. Check void hooks → if any exist, skip everything else
2. Call pre-hooks → inspect/log arguments
3. Call replace hooks (or original) → chain multiple replacements
4. Call post-hooks → inspect/log result
5. Return result
```

---

## 🔐 Security & Performance

### Security

- **Base64 Support** - Credentials can be base64 encoded
- **Environment Variables** - Sensitive data in env vars, not in code
- **Error Isolation** - Failed plugins don't break the system
- **Resource Cleanup** - Prevents memory leaks and dangling references

### Performance

- **Lazy Loading** - Plugins loaded on demand
- **Cache Busting** - URLs timestamped to bypass cache
- **Error Recovery** - Graceful degradation on failures
- **Memory Management** - Automatic resource cleanup
- **Hot Reload** - No VRCX restart required for plugin changes

---

## 📝 Best Practices

### DO ✅

- Always call `super(metadata)` in constructor
- Use `this.registerTimer()`, `registerObserver()`, `registerListener()`, `registerSubscription()`
- Access other plugins via `customjs.pluginManager.getPlugin()`
- Use `await waitForPlugin()` for dependencies in `start()`
- Call `await super.stop()` in your `stop()` method
- Use `this.logger` for all logging
- Register all settings in `load()`, start features in `start()`
- Export with `window.customjs.__lastPluginClass`

### DON'T ❌

- Don't expose plugin to `window.customjs.yourPluginName`
- Don't access other plugins via `window.customjs.pluginName` (use PluginManager)
- Don't manually call `unsubscribe()` on registered subscriptions (auto-handled)
- Don't start timers or modify DOM in `load()` (use `start()`)
- Don't make authenticated API calls in `load()` or `start()` (use `onLogin()`)
- Don't use IIFE wrapper (PluginManager handles scope)
- Don't forget to set `loaded`, `started` flags

---

## 🤝 Contributing

1. Fork the repository
2. Create your plugin in `js/plugins/your-plugin.js`
3. Extend the `Plugin` base class
4. Add to the default plugin list in `js/plugin.js` (PluginLoader.defaultPlugins)
5. Test thoroughly
6. Update this README
7. Submit a pull request

---

## 📄 License

See [LICENSE](LICENSE) file for details.

---

## 👤 Author

**Bluscream**

- GitHub: [@Bluscream](https://github.com/Bluscream)
- Repository: [vrcx-custom](https://github.com/Bluscream/vrcx-custom)

---

## 🆘 Support

### Getting Help

1. Check console for error messages
2. Verify config.json structure
3. Enable debug plugin for detailed logging
4. Check GitHub issues for similar problems
5. Open a new issue with:
   - VRCX version
   - Plugin system version
   - Console errors
   - Steps to reproduce

### Useful Resources

- **Config Location:** `%LOCALAPPDATA%\VRChat\VRChat\config.json`
- **VRCX AppData:** `%APPDATA%\VRCX\`
- **Console:** F12 in VRCX to open DevTools
- **GitHub Repo:** https://github.com/Bluscream/vrcx-custom

---

**Last Updated:** October 12, 2025  
**Maintained by:** Bluscream
