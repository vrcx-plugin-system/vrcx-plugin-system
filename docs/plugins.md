# Plugin Development Guide

This guide explains how to create plugins for the VRCX Plugin System v3.0.

## Quick Start

Plugins are plain JavaScript files that extend the `window.customjs.Plugin` base class. They are loaded remotely at runtime from the [plugins repository](https://github.com/vrcx-plugin-system/plugins).

### Minimal Plugin Example

```javascript
class MyPlugin extends window.customjs.Plugin {
  constructor() {
    super({
      name: "My Plugin",
      description: "What my plugin does",
      author: "Your Name",
      version: "1.0.0",
    });
  }

  async load() {
    this.log("Plugin loading...");
  }

  async start() {
    this.log("Plugin starting...");
  }
}

// Required: Export for auto-instantiation
window.customjs.__LAST_PLUGIN_CLASS__ = MyPlugin;
```

## Plugin Structure

### Plugin Metadata

The metadata passed to `super()` defines your plugin:

```javascript
super({
  id: "my-plugin", // Optional: auto-derived from filename
  name: "My Plugin", // Display name
  description: "Does X", // What it does
  author: "Your Name", // Your name
  version: "1.0.0", // Semantic version
  dependencies: [], // Optional: array of plugin IDs
});
```

### Lifecycle Methods

Plugins have three main lifecycle methods you can override:

#### `load()`

Called immediately after plugin instantiation. Use for:

- Initial setup
- Registering hooks
- Defining settings
- Registering event listeners
- **DO NOT** start timers or modify DOM here

```javascript
async load() {
  this.log("Loading...");

  // Define settings
  this.settings = this.defineSettings({
    enabled: {
      type: window.customjs.SettingType.BOOLEAN,
      description: "Enable this feature",
      default: true,
    },
  });

  // Register hooks
  this.registerPreHook("AppApi.SendIpc", (args) => {
    this.log("IPC call intercepted");
  });

  this.loaded = true;
}
```

#### `start()`

Called after all plugins have finished loading. Use for:

- Starting timers
- Modifying DOM
- Setup that depends on other plugins

```javascript
async start() {
  this.log("Starting...");

  // Start a timer (auto-cleanup on stop)
  const timer = setInterval(() => {
    this.log("Timer tick");
  }, 60000);
  this.registerTimer(timer);

  // Add DOM element
  const button = document.createElement("button");
  button.textContent = "Click me";
  document.body.appendChild(button);
  this.registerListener(button, "click", () => {
    this.log("Button clicked!");
  });

  this.started = true;
}
```

#### `onLogin(currentUser)`

Called after successful VRChat login. Use for:

- Loading user-specific data
- Making authenticated API calls
- User-specific initialization

```javascript
async onLogin(currentUser) {
  this.log(`Logged in as: ${currentUser.displayName}`);

  // Load user-specific settings
  const userCount = this.get(`user_${currentUser.id}_count`, 0);
  this.set(`user_${currentUser.id}_count`, userCount + 1);
}
```

#### `stop()`

Called when plugin is disabled or unloaded. Use for:

- Manual cleanup (timers/listeners are auto-cleaned)
- Removing custom data
- Stopping background tasks

```javascript
async stop() {
  this.log("Stopping...");

  // Manual cleanup if needed
  // (registered resources are auto-cleaned by parent class)

  await super.stop(); // Call parent for auto-cleanup
}
```

## Type Safety with JSDoc

Use JSDoc annotations for IDE autocomplete and type checking:

```javascript
/**
 * My awesome plugin
 * @class MyPlugin
 * @extends {window.customjs.Plugin}
 */
class MyPlugin extends window.customjs.Plugin {
  /**
   * @param {string} message - The message to log
   * @param {number} count - How many times to log
   */
  logMultiple(message, count) {
    for (let i = 0; i < count; i++) {
      this.log(message);
    }
  }
}
```

## Plugin API

### Resource Management

All registered resources are automatically cleaned up when the plugin stops:

```javascript
// Timers
const timer = setInterval(() => {}, 1000);
this.registerTimer(timer);

// Event listeners
this.registerListener(element, "click", handler);

// Observers
const observer = new MutationObserver(() => {});
this.registerObserver(observer);

// Generic subscriptions
const unsubscribe = someThing.subscribe(() => {});
this.registerSubscription(unsubscribe);
```

### Hook System

Intercept and modify function calls:

#### Pre-Hook (runs before original function)

```javascript
this.registerPreHook("AppApi.SendIpc", (args) => {
  console.log("About to send IPC:", args);
  // Modify args if needed
  args[0] = "modified";
});
```

#### Post-Hook (runs after original function)

```javascript
this.registerPostHook("$app.playNoty", (result, args) => {
  console.log("Noty played with result:", result);
});
```

#### Void-Hook (prevents original function from running)

```javascript
this.registerVoidHook("$app.annoyingFunction", (args) => {
  console.log("Blocked annoying function call");
  // Original function never runs
});
```

#### Replace-Hook (replace function with your own)

```javascript
this.registerReplaceHook(
  "$app.someMethod",
  function (originalFunc, arg1, arg2) {
    console.log("Custom implementation");

    // Optionally call original
    const result = originalFunc(arg1, arg2);

    // Return modified or custom result
    return result + " modified";
  }
);
```

### Event System

Emit and listen to custom events:

```javascript
// Emit an event
this.emit("myEvent", { data: "value" });

// Listen to own events
this.on("myEvent", (data) => {
  console.log("Event received:", data);
});

// Listen to other plugin events
this.on("otherPlugin:eventName", (data) => {
  console.log("Other plugin event:", data);
});
```

### VRCX System Events

Subscribe to VRCX Pinia store changes:

```javascript
// Location changes
this.subscribe("LOCATION", ({ location, lastLocation }) => {
  console.log("Location:", location.location);
});

// User changes
this.subscribe("USER", ({ currentUser, isLogin }) => {
  console.log("User:", currentUser?.displayName);
});

// Game state
this.subscribe("GAME", ({ isGameRunning, isGameNoVR }) => {
  console.log("Game running:", isGameRunning);
});

// Game log
this.subscribe("GAMELOG", ({ gameLogTable }) => {
  console.log("Game log updated");
});

// Friends
this.subscribe("FRIENDS", ({ friends, offlineFriends }) => {
  console.log("Friends count:", friends.length);
});

// UI state
this.subscribe("UI", ({ menuActiveIndex }) => {
  console.log("Menu index:", menuActiveIndex);
});
```

### Settings System

Define plugin settings with Equicord-style API:

```javascript
this.settings = this.defineSettings({
  enabled: {
    type: window.customjs.SettingType.BOOLEAN,
    description: "Enable this feature",
    category: "general",
    default: true,
  },
  apiKey: {
    type: window.customjs.SettingType.STRING,
    description: "Your API key",
    category: "authentication",
    placeholder: "Enter key...",
    default: "",
  },
  volume: {
    type: window.customjs.SettingType.SLIDER,
    description: "Volume level",
    category: "audio",
    default: 0.5,
    markers: [0, 0.25, 0.5, 0.75, 1],
  },
  mode: {
    type: window.customjs.SettingType.SELECT,
    description: "Operating mode",
    category: "general",
    options: [
      { label: "Auto", value: "auto", default: true },
      { label: "Manual", value: "manual" },
    ],
  },
  runCount: {
    type: window.customjs.SettingType.NUMBER,
    description: "Run counter",
    hidden: true, // Hidden from UI
    default: 0,
  },
});

// Access settings (reactive)
if (this.settings.store.enabled) {
  console.log(this.settings.store.apiKey);
}

// Modify settings (auto-saves to localStorage)
this.settings.store.volume = 0.8;

// Listen to changes
this.settings.onChange("enabled", (newValue) => {
  console.log("Enabled changed to:", newValue);
});

// Alternative: direct get/set (no reactivity)
this.get("enabled", true);
this.set("enabled", false);
```

### Logging

Multiple logging methods available:

```javascript
// Console only (default)
this.log("Info message");
this.warn("Warning message");
this.error("Error message");

// VRCX UI notifications
this.logger.showInfo("Info toast");
this.logger.showSuccess("Success toast");
this.logger.showWarn("Warning toast");
this.logger.showError("Error toast");

// Desktop notifications
await this.logger.notifyDesktop("Desktop notification");

// VR overlay notifications
await this.logger.notifyXSOverlay("XSOverlay notification");
await this.logger.notifyOVRToolkit("OVRToolkit notification");
await this.logger.notifyVR("All VR overlays"); // Both

// Combined (console + UI)
this.logger.logAndShow("Message", "info");

// All outputs (console + UI + desktop + VR)
this.logger.logAndNotifyAll("Important message");
```

## Utility Functions

Access common utilities via `window.customjs.utils`:

```javascript
// Check if value is empty
window.customjs.utils.isEmpty(value);

// Time formatting
window.customjs.utils.timeToText(milliseconds); // "5m 30s"
window.customjs.utils.getTimestamp(); // "2024-01-15 14:30:00"
window.customjs.utils.formatDateTime(); // "2024-01-15 14:30:00 GMT+1"

// Clipboard
await window.customjs.utils.copyToClipboard(text, "Description");

// VRChat API helpers
await window.customjs.utils.saveBio(bio, bioLinks);
const location = await window.customjs.utils.getLocationObject(loc);

// Color manipulation
window.customjs.utils.hexToRgba("#ff0000", 0.5); // "rgba(255, 0, 0, 0.5)"
window.customjs.utils.darkenColor("#ff0000", 20); // Darker red
```

## Best Practices

### 1. Always Call Parent Methods

```javascript
async stop() {
  // Your cleanup

  // IMPORTANT: Call parent for auto-cleanup
  await super.stop();
}
```

### 2. Register Resources for Auto-Cleanup

```javascript
// Good
const timer = setInterval(() => {}, 1000);
this.registerTimer(timer);

// Bad (will leak if plugin stops)
setInterval(() => {}, 1000);
```

### 3. Use Namespaced Settings

```javascript
// Plugin ID is auto-prepended
this.set("mySetting", value);
// Stored as: "customjs.my-plugin.mySetting"
```

### 4. Check Dependencies

```javascript
constructor() {
  super({
    name: "Dependent Plugin",
    dependencies: ["required-plugin-id"],
  });
}

async load() {
  // Wait for dependency
  const requiredPlugin = await window.customjs.pluginManager
    .waitForPlugin("required-plugin-id", 5000);

  // Use the plugin
  requiredPlugin.someMethod();
}
```

### 5. Handle Errors Gracefully

```javascript
async start() {
  try {
    // Risky operation
    await this.doSomething();
  } catch (error) {
    this.error(`Failed to start: ${error.message}`);
    // Don't crash VRCX - fail gracefully
  }
}
```

### 6. Use Proper Hook Types

- **Pre-hook**: Inspect/modify arguments before call
- **Post-hook**: Inspect result after call
- **Void-hook**: Completely block the call
- **Replace-hook**: Implement custom logic (can still call original)

## Publishing Your Plugin

1. Create your plugin file: `my-plugin.js`
2. Add JSDoc comments for types
3. Test locally by loading via URL
4. Submit to [plugins repository](https://github.com/vrcx-plugin-system/plugins)
5. Follow the contribution guidelines
6. Your plugin will be available at:
   ```
   https://raw.githubusercontent.com/vrcx-plugin-system/plugins/main/my-plugin.js
   ```

## Template

See the complete template in the plugins repository:

```
https://github.com/vrcx-plugin-system/plugins/blob/main/template.js
```

## Examples

Explore existing plugins for examples:

- [plugin-manager-ui.js](https://github.com/vrcx-plugin-system/plugins/blob/main/plugin-manager-ui.js) - UI plugin example
- [protocol-links.js](https://github.com/vrcx-plugin-system/plugins/blob/main/protocol-links.js) - Hook system example
- [tag-manager.js](https://github.com/vrcx-plugin-system/plugins/blob/main/tag-manager.js) - Settings system example

## Debugging

### Console Access

```javascript
// Plugin instance
window.customjs.pluginManager.getPlugin("my-plugin-id");

// All plugins
window.customjs.plugins;

// Plugin manager
window.customjs.pluginManager;

// Config manager
window.customjs.configManager;
```

### Enable/Disable Plugins

```javascript
const plugin = window.customjs.pluginManager.getPlugin("my-plugin-id");
await plugin.disable();
await plugin.enable();
```

### View Settings

```javascript
const plugin = window.customjs.pluginManager.getPlugin("my-plugin-id");
plugin.getAllSettings(); // All settings for this plugin
```

### Clear Settings

```javascript
const plugin = window.customjs.pluginManager.getPlugin("my-plugin-id");
plugin.clearAllSettings();
```

## Support

- **Issues**: [GitHub Issues](https://github.com/vrcx-plugin-system/vrcx-plugin-system/issues)
- **Plugins Repo**: [vrcx-plugin-system/plugins](https://github.com/vrcx-plugin-system/plugins)
- **Core System**: [vrcx-plugin-system/vrcx-plugin-system](https://github.com/vrcx-plugin-system/vrcx-plugin-system)

---

**Happy plugin development!** 🎉
