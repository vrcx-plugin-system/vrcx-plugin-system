# Plugin Development Guide

Complete guide for creating VRCX plugins.

## Quick Start

```javascript
class MyPlugin extends window.customjs.classes.Plugin {
  constructor() {
    super({
      name: "My Plugin",
      description: "What it does",
      author: "Your Name",
      version: "1.0.0",
    });
  }

  async load() {
    // Setup: define settings, register hooks
    this.settings = this.defineSettings({
      enabled: {
        type: window.customjs.SettingType.BOOLEAN,
        description: "Enable feature",
        default: true,
      },
    });
  }

  async start() {
    // Start: timers, DOM modifications
    const timer = setInterval(() => {
      this.log("Tick");
    }, 60000);
    this.registerTimer(timer);
  }

  async onLogin(user) {
    // User-specific initialization
    this.log(`Logged in as ${user.displayName}`);
  }

  async stop() {
    // Auto-cleanup runs here
    await super.stop();
  }
}

window.customjs.__LAST_PLUGIN_CLASS__ = MyPlugin;
```

## Lifecycle

### `load()` - Initial Setup

- Define settings
- Register hooks
- Setup subscriptions
- **Don't** start timers or modify DOM

### `start()` - Start Operations

- Start timers
- Modify DOM
- Wait for dependencies

### `onLogin(currentUser)` - User-Specific

- Load user data
- Authenticated API calls

### `stop()` - Cleanup

- Auto-cleanup of registered resources
- Call `await super.stop()`

## Features

### Custom Action Buttons

Add buttons to Plugin Manager UI in your constructor:

```javascript
constructor() {
  super({ name: "My Plugin", ... });
  
  this.actionButtons = [
    new CustomActionButton({
      title: "Update Now",
      color: "success",              // primary|success|warning|danger|info
      icon: "ri-refresh-line",       // Remix Icon class
      description: "Tooltip text",   // Hover tooltip
      callback: async () => {
        await this.doUpdate();
        this.logger.showSuccess("Updated!");
      },
    }),
    new CustomActionButton({
      title: "Clear Cache",
      color: "danger",
      icon: "ri-delete-bin-line",
      callback: async () => {
        if (confirm("Clear all data?")) {
          this.clearCache();
        }
      },
    }),
  ];
}
```

### Settings System

Equicord-inspired reactive settings:

```javascript
this.settings = this.defineSettings({
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
    default: 0.5,
    markers: [0, 0.25, 0.5, 0.75, 1],
  },
  mode: {
    type: window.customjs.SettingType.SELECT,
    description: "Operating mode",
    options: [
      { label: "Auto", value: "auto", default: true },
      { label: "Manual", value: "manual" },
    ],
  },
  template: {
    type: window.customjs.SettingType.STRING,
    description: "Bio template",
    default: "Playtime: {playtime}",
    variables: {
      "{playtime}": "Total playtime in hours",
      "{friends}": "Friend count",
    },
  },
});

// Access (reactive)
if (this.settings.store.enabled) {
  console.log(this.settings.store.apiKey);
}

// Modify (auto-saves)
this.settings.store.volume = 0.8;

// Listen to changes
this.settings.onChange("enabled", (newValue) => {
  console.log("Changed:", newValue);
});
```

**Setting Types**: `STRING`, `NUMBER`, `BOOLEAN`, `SELECT`, `SLIDER`, `CUSTOM`

### Resource Management

Auto-cleanup when plugin stops:

```javascript
// Timers
const timer = setInterval(() => {}, 1000);
this.registerTimer(timer);

// Event listeners
this.registerListener(button, "click", () => {});

// Observers
const observer = new MutationObserver(() => {});
this.registerObserver(observer);

// Generic subscriptions
const unsub = thing.subscribe(() => {});
this.registerSubscription(unsub);
```

### Hook System

Intercept and modify function calls:

```javascript
// Pre-hook (runs before)
this.registerPreHook("AppApi.SendIpc", (args) => {
  console.log("About to send:", args);
  args[0] = "modified"; // Modify arguments
});

// Post-hook (runs after)
this.registerPostHook("$app.playNoty", (result, args) => {
  console.log("Result:", result);
});

// Void-hook (blocks execution)
this.registerVoidHook("annoyingFunc", (args) => {
  console.log("Blocked!");
});

// Replace-hook (custom implementation)
this.registerReplaceHook("func", function (original, ...args) {
  const result = original(...args);
  return result + " modified";
});
```

### Event System

```javascript
// Emit event
this.emit("myEvent", { data: "value" });

// Listen to own events
this.on("myEvent", (data) => {
  console.log("Got:", data);
});

// Listen to other plugin
this.on("otherPlugin:eventName", (data) => {});
```

### VRCX System Events

```javascript
// Location changes
this.subscribe("LOCATION", ({ location }) => {
  console.log("Location:", location.location);
});

// User changes
this.subscribe("USER", ({ currentUser, isLogin }) => {
  console.log("User:", currentUser?.displayName);
});

// Game state
this.subscribe("GAME", ({ isGameRunning }) => {});

// Game log
this.subscribe("GAMELOG", ({ gameLogTable }) => {});

// Friends
this.subscribe("FRIENDS", ({ friends }) => {});

// UI state
this.subscribe("UI", ({ menuActiveIndex }) => {});
```

### Logging

```javascript
// Console only
this.log("Info");
this.warn("Warning");
this.error("Error");

// VRCX UI toasts/notifications
this.logger.showInfo("Info toast");
this.logger.showSuccess("Success!");
this.logger.showWarning("Warning");
this.logger.showError("Error");

this.logger.notifyInfo("Notification");
this.logger.notifySuccess("Success notification");
this.logger.notifyWarning("Warning notification");
this.logger.notifyError("Error notification");

// Desktop/VR
this.logger.notifyDesktop("Desktop notification");
this.logger.notifyVR("VR overlay notification");
this.logger.notifyAll("All outputs");

// Browser alert
this.logger.alert("Alert dialog");

// Add to VRCX logs
this.logger.addFeed({
  type: "custom",
  message: "Feed message",
  created_at: new Date().toJSON(),
});

this.logger.addGameLog({
  type: "custom",
  dt: new Date().toJSON(),
  data: "Log message",
});

this.logger.addFriendLog({
  type: "custom",
  created_at: new Date().toJSON(),
  userId: "usr_xxx",
  displayName: "User",
});
```

## Utilities

```javascript
const utils = window.customjs.utils;

// Time
utils.timeToText(300000); // "5m 0s"
utils.formatDateTime(); // "2024-01-15 14:30:00 GMT+1"

// Clipboard
await utils.copyToClipboard("Text");

// VRChat
await utils.saveBio("Bio text");
const loc = await utils.getLocationObject(location);

// Colors
utils.hexToRgba("#ff0000", 0.5); // "rgba(255, 0, 0, 0.5)"
utils.darkenColor("#ff0000", 20); // Darker red

// Checks
utils.isEmpty(value); // null/undefined/""
```

## Dependencies

```javascript
constructor() {
  super({
    name: "Dependent Plugin",
    dependencies: ["required-plugin-id"],
  });
}

async start() {
  // Wait for dependency (5s timeout)
  const plugin = await window.customjs.pluginManager
    .waitForPlugin("required-plugin-id", 5000);

  plugin.someMethod();
}
```

## Best Practices

### 1. Always call parent methods

```javascript
async stop() {
  // Your cleanup
  await super.stop(); // REQUIRED for auto-cleanup
}
```

### 2. Register all resources

```javascript
// Good ✓
const timer = setInterval(() => {}, 1000);
this.registerTimer(timer);

// Bad ✗ (memory leak)
setInterval(() => {}, 1000);
```

### 3. Handle errors gracefully

```javascript
async start() {
  try {
    await this.riskyOperation();
  } catch (error) {
    this.error(`Failed: ${error.message}`);
    // Don't crash VRCX
  }
}
```

### 4. Use proper hook types

- **Pre**: Modify arguments before call
- **Post**: Inspect result after call
- **Void**: Block call completely
- **Replace**: Custom implementation (can call original)

## Type Safety (JSDoc)

```javascript
/**
 * @param {string} userId - VRChat user ID
 * @param {number} timeout - Timeout in milliseconds
 * @returns {Promise<object>} User data
 */
async getUserData(userId, timeout = 5000) {
  // Implementation
}
```

## Testing & Debugging

```javascript
// Get plugin instance
const plugin = window.customjs.pluginManager.getPlugin("my-plugin");

// View all settings
plugin.getAllSettings();

// Enable/disable
await plugin.toggle();

// View resources
plugin.resources;
```

## Examples

See existing plugins:

- **plugin-manager-ui.js** - UI plugin
- **tag-manager.js** - Settings & auto-update
- **protocol-links.js** - Hook system
- **template.js** - Complete example

## Publishing

1. Create `src/plugins/my-plugin.ts` in TypeScript
2. Test locally via Plugin Manager UI
3. Build with `npm run build` (compiles to `dist/my-plugin.js`)
4. Submit PR to [plugins repo](https://github.com/vrcx-plugin-system/plugins)
5. Available at: `https://github.com/vrcx-plugin-system/plugins/raw/refs/heads/main/dist/my-plugin.js`

## Support

- **[API Reference](api-reference.md)** - Complete API docs
- **[Issues](https://github.com/vrcx-plugin-system/vrcx-plugin-system/issues)** - Bug reports & features
