# API Reference

Complete API reference for the VRCX Plugin System.

## Table of Contents

- [CustomModule Class](#custommodule-class)
- [Module Metadata](#module-metadata)
- [Settings System](#settings-system)
- [Action Buttons](#action-buttons)
- [Resource Management](#resource-management)
- [Hook System](#hook-system)
- [Event System](#event-system)
- [Logger](#logger)
- [Dialog Helpers](#dialog-helpers)
- [Global API](#global-api)

## CustomModule Class

Base class for all plugins.

### Constructor

```typescript
constructor(metadata?: Partial<ModuleMetadata>)
```

**Parameters:**

| Parameter  | Type                      | Description     |
| ---------- | ------------------------- | --------------- |
| `metadata` | `Partial<ModuleMetadata>` | Plugin metadata |

**Example:**

```typescript
super({
  name: "My Plugin 🎯",
  description: "What it does",
  authors: [
    {
      name: "Author Name",
      description: "Role",
      userId: "usr_xxx-xxx-xxx",
      avatarUrl: "https://...", // Optional
    },
  ],
  tags: ["Utility", "Social"],
  required_dependencies: ["dialog-api"],
  optional_dependencies: ["plugin-analyzer"],
});
```

### Properties

| Property                | Type                              | Description             |
| ----------------------- | --------------------------------- | ----------------------- |
| `metadata`              | `ModuleMetadata`                  | Plugin metadata         |
| `enabled`               | `boolean`                         | Plugin enabled state    |
| `loaded`                | `boolean`                         | Plugin loaded state     |
| `started`               | `boolean`                         | Plugin started state    |
| `logger`                | `ModuleLogger`                    | Logging interface       |
| `resources`             | `ModuleResources`                 | Resource tracking       |
| `settings`              | `ModuleSettings`                  | Plugin settings         |
| `categories`            | `Record<string, SettingCategory>` | Setting categories      |
| `required_dependencies` | `string[]`                        | Required dependency IDs |
| `optional_dependencies` | `string[]`                        | Optional dependency IDs |
| `actionButtons`         | `CustomActionButton[]`            | Action buttons          |

### Lifecycle Methods

#### load()

```typescript
async load(): Promise<void>
```

Called once when plugin is first loaded. Use for:

- Defining settings
- Loading data from storage
- Initial setup

**Example:**

```typescript
async load() {
  await super.load();

  this.settings = this.defineSettings({...});
  this.categories = this.defineSettingsCategories({...});

  this.loaded = true;
}
```

#### start()

```typescript
async start(): Promise<void>
```

Called when plugin is enabled. Use for:

- Starting timers
- Registering hooks
- Beginning operations

**Example:**

```typescript
async start() {
  if (!this.enabled) return;

  this.startMonitoring();
  this.started = true;
}
```

#### stop()

```typescript
async stop(): Promise<void>
```

Called when plugin is disabled or unloaded. Use for:

- Cleanup (automatic if using register methods)
- Saving state

**Example:**

```typescript
async stop() {
  this.saveState();
  await super.stop(); // Handles automatic cleanup
}
```

#### onLogin()

```typescript
async onLogin(currentUser: any): Promise<void>
```

Called after user logs into VRChat.

**currentUser fields:**

| Field                   | Type     | Description      |
| ----------------------- | -------- | ---------------- |
| `id`                    | `string` | User ID          |
| `displayName`           | `string` | Display name     |
| `bio`                   | `string` | User bio         |
| `currentAvatarImageUrl` | `string` | Avatar thumbnail |

**Example:**

```typescript
async onLogin(user) {
  this.logger.log(`User logged in: ${user.displayName}`);
  await this.initializeUserData(user);
}
```

## Module Metadata

```typescript
interface ModuleMetadata {
  id?: string; // Auto-derived from filename
  name: string; // Display name
  description: string; // Description
  authors: ModuleAuthor[]; // Author(s)
  build?: string; // Build timestamp
  url?: string | null; // Module URL
  required_dependencies?: string[]; // Required modules
  optional_dependencies?: string[]; // Optional modules
  tags?: string[]; // Category tags
}
```

### ModuleAuthor

```typescript
interface ModuleAuthor {
  name: string; // Author name
  description?: string; // Role/title
  userId?: string; // VRChat user ID
  avatarUrl?: string; // Avatar image URL
}
```

## Settings System

### defineSettings()

```typescript
defineSettings(definition: Record<string, SettingDefinition>): ModuleSettings
```

**SettingDefinition:**

```typescript
interface SettingDefinition {
  type: SettingType;
  description: string;
  default?: any;
  category?: string; // Group settings
  placeholder?: string; // Input placeholder
  hidden?: boolean; // Hide in UI
  markers?: number[]; // Slider markers
  options?: SelectOption[]; // Select options
  variables?: Record<string, string>; // Template var hints
  label?: string; // Setting label
  min?: number; // Minimum value (number/timespan)
  max?: number; // Maximum value (number/timespan)
}
```

### SettingType Enum

```typescript
enum SettingType {
  STRING = "string",
  NUMBER = "number",
  BIGINT = "bigint",
  BOOLEAN = "boolean",
  SELECT = "select",
  SLIDER = "slider",
  TIMESPAN = "timespan",
  COMPONENT = "component",
  CUSTOM = "custom",
}
```

### Setting Categories

```typescript
defineSettingsCategories(categories: Record<string, SettingCategory>)
```

**SettingCategory:**

```typescript
interface SettingCategory {
  name: string; // Category display name
  description: string; // Category description
}
```

**Example:**

```typescript
this.categories = this.defineSettingsCategories({
  general: {
    name: "⚙️ General",
    description: "Basic settings",
  },
  advanced: {
    name: "🔧 Advanced",
    description: "Advanced options",
  },
});

this.settings = this.defineSettings({
  myOption: {
    type: SettingType.BOOLEAN,
    description: "Enable feature",
    category: "general",
    default: true,
  },
});
```

### Settings Access

```typescript
// Get setting value
const value = this.settings.store.settingName;

// Set setting value (auto-validates min/max)
this.settings.store.settingName = newValue;

// Reset single setting
this.settings.reset("settingName");

// Reset all settings
this.settings.resetAll();

// Check if setting exists
if (this.settings.def.settingName) {
}
```

### Min/Max Validation

For `NUMBER` and `TIMESPAN` types:

```typescript
myNumber: {
  type: SettingType.NUMBER,
  default: 50,
  min: 0,      // Values < 0 clamped to 0
  max: 100     // Values > 100 clamped to 100
}
```

Validation happens automatically when setting values via `settings.store`.

## Action Buttons

```typescript
interface CustomActionButton {
  title: string;
  color: "primary" | "success" | "warning" | "danger" | "info";
  icon?: string; // RemixIcon class
  description?: string;
  callback: () => void | Promise<void>;
}
```

**Example:**

```typescript
this.actionButtons = [
  {
    title: "Refresh Data",
    color: "primary",
    icon: "ri-refresh-line",
    description: "Reload data from server",
    callback: async () => {
      await this.refreshData();
    },
  },
];
```

## Resource Management

All registered resources are automatically cleaned up when plugin stops.

### Timers

```typescript
registerTimer(timer: number | NodeJS.Timeout): number | NodeJS.Timeout
```

**Example:**

```typescript
const timer = setInterval(() => this.update(), 1000);
this.registerTimer(timer);
// Auto-cleared on stop()
```

### Event Listeners

```typescript
registerListener(
  target: EventTarget,
  event: string,
  callback: EventListener,
  options?: AddEventListenerOptions
): {element, event, handler}
```

**Example:**

```typescript
const button = document.querySelector("#my-button");
this.registerListener(button, "click", () => this.handleClick());
// Auto-removed on stop()
```

### Observers

```typescript
registerObserver(
  observer: MutationObserver | IntersectionObserver | ResizeObserver
): Observer
```

**Example:**

```typescript
const observer = new MutationObserver((mutations) =>
  this.handleMutations(mutations)
);
observer.observe(document.body, { childList: true });
this.registerObserver(observer);
// Auto-disconnected on stop()
```

### Subscriptions

```typescript
registerSubscription(unsubscribe: () => void): () => void
```

**Example:**

```typescript
const unsubscribe = window.$pinia?.user?.store.$subscribe((mutation, state) => {
  this.handleUserChange(state);
});
this.registerSubscription(unsubscribe);
// Auto-unsubscribed on stop()
```

## Hook System

Intercept and modify function calls.

### Pre-Hook

Runs **before** target function:

```typescript
registerPreHook(functionPath: string, callback: (args: any[]) => void): void
```

**Example:**

```typescript
this.registerPreHook("window.API.sendInvite", (args) => {
  console.log("Sending invite with args:", args);
  // Can modify args array here
});
```

### Post-Hook

Runs **after** target function:

```typescript
registerPostHook(functionPath: string, callback: (result: any, args: any[]) => void): void
```

**Example:**

```typescript
this.registerPostHook("window.API.getUser", (result, args) => {
  console.log("Got user:", result);
  // Can modify result here
});
```

### Void-Hook

For functions that don't return a value:

```typescript
registerVoidHook(functionPath: string, callback: (args: any[]) => void): void
```

### Replace-Hook

Completely replace function:

```typescript
registerReplaceHook(functionPath: string, callback: (originalFunc: Function, ...args: any[]) => any): void
```

**Example:**

```typescript
this.registerReplaceHook("window.API.someMethod", (original, ...args) => {
  // Do something before
  const result = original(...args);
  // Do something after
  return result;
});
```

## Event System

Modern event system with automatic plugin tracking and IPC broadcasting.

### Register Event

Register an event that your plugin can emit:

```typescript
registerEvent(eventName: string, options: {
  description: string;
  payload?: Record<string, string>;
  broadcastIPC?: boolean;     // default: true
  logToConsole?: boolean;     // default: true
}): void
```

**Example:**

```typescript
async load() {
  this.registerEvent('user-updated', {
    description: 'Fired when user profile is updated',
    payload: {
      userId: 'string - VRChat user ID',
      changes: 'object - Changed fields'
    },
    broadcastIPC: true,
    logToConsole: false  // Disable for high-frequency events
  });
}
```

### Emit Event

Emit an event with automatic plugin injection:

```typescript
emit(eventName: string, payload: any): void
```

**Example:**

```typescript
this.emit('user-updated', { userId: 'usr_123', changes: {...} });
// System transforms to: { plugin: <this>, userId: 'usr_123', changes: {...} }
```

**Key Features:**

- Plugin object automatically injected as `data.plugin`
- Global event namespace (no plugin IDs in names)
- Automatic IPC broadcasting (if enabled)
- Automatic console logging (if enabled)
- Statistics tracking (emit count, last emitted)

### Listen to Events

Subscribe to events from any plugin:

```typescript
on(eventName: string, callback: (data: any) => void): () => void
```

**Example:**

```typescript
// Listen to specific event
this.on("bio-updated", (data) => {
  console.log("Bio updated by:", data.plugin.metadata.name);
  console.log("New bio:", data.bio);
});

// Listen to own events
this.on("user-updated", (data) => {
  console.log("Event from:", data.plugin.metadata.id);
});

// Listen to ALL events (wildcard)
this.on("*", (eventName, data) => {
  console.log(`Event ${eventName} from ${data.plugin.metadata.name}`);
});
```

### Unsubscribe from Events

```typescript
off(eventName: string, callback: Function): void
```

**Example:**

```typescript
const handler = (data) => console.log(data);
this.on("bio-updated", handler);
// Later:
this.off("bio-updated", handler);
```

### Get Registered Events

```typescript
// Get event names registered by this plugin
this.events; // getter, returns string[]

// Get detailed metadata
this.getEvents(); // returns EventMetadata[]
```

**Example:**

```typescript
console.log(this.events);
// → ['bio-updated', 'settings-changed']

console.log(this.getEvents());
// → [{ eventName: 'bio-updated', registeredBy: ['bio-updater'], emitCount: 5, ... }]
```

### Global Event Discovery

```typescript
// List all events
window.customjs.eventRegistry.list();

// List events by plugin
window.customjs.eventRegistry.list("bio-updater");

// Get event metadata
window.customjs.eventRegistry.get("bio-updated");

// Get statistics
window.customjs.eventRegistry.getStats();
window.customjs.eventRegistry.getStats("bio-updated");
```

### Store Subscriptions

```typescript
subscribe(storeName: string, callback: (mutation, state) => void): Function | null
```

**Available Stores:**

| Store Name   | Description         |
| ------------ | ------------------- |
| `user`       | User data and state |
| `location`   | Current location    |
| `friends`    | Friends list        |
| `favorite`   | Favorite friends    |
| `moderation` | Blocked/muted users |
| `world`      | World data          |
| `instance`   | Instance data       |
| `avatar`     | Avatar data         |
| `group`      | Group data          |

**Example:**

```typescript
this.subscribe("location", (mutation, state) => {
  console.log("Location changed:", state);
});
```

## Logger

### Console Methods

```typescript
log(message: string, ...args: any[]): void
warn(message: string, ...args: any[]): void
error(message: string, ...args: any[]): void
```

**Best Practice for Errors:**

```typescript
try {
  await riskyOperation();
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  this.logger.error(`Operation failed: ${errorMsg}`);
}
```

### VRCX Notification Methods

```typescript
showInfo(message: string): void
showSuccess(message: string): void
showWarning(message: string): void
showError(message: string): void
```

**Example:**

```typescript
this.logger.showSuccess("Data saved successfully!");
this.logger.showError("Failed to save data");
```

## Dialog Helpers

Automatically fall back to native dialogs if dialog-api unavailable.

### showConfirmDialog()

```typescript
async showConfirmDialog(
  title: string,
  message: string,
  confirmText?: string,  // Default: 'OK'
  cancelText?: string    // Default: 'Cancel'
): Promise<boolean>
```

Returns `true` if user confirmed, `false` if cancelled.

**Example:**

```typescript
const confirmed = await this.showConfirmDialog(
  "Delete Item",
  "Are you sure you want to delete this item?",
  "Delete",
  "Cancel"
);

if (confirmed) {
  this.deleteItem();
}
```

### showAlertDialog()

```typescript
async showAlertDialog(
  title: string,
  message: string,
  confirmText?: string   // Default: 'OK'
): Promise<void>
```

**Example:**

```typescript
await this.showAlertDialog(
  "Success",
  "Operation completed successfully!",
  "OK"
);
```

## Global API

### window.customjs

Main global object exposing the plugin system.

#### Properties

| Property            | Type                         | Description                            |
| ------------------- | ---------------------------- | -------------------------------------- |
| `sourceUrl`         | `string`                     | Source repository URL                  |
| `build`             | `number`                     | Build timestamp                        |
| `modules`           | `CustomModule[]`             | All loaded modules                     |
| `repos`             | `ModuleRepository[]`         | All repositories                       |
| `eventRegistry`     | `EventRegistry`              | Event management system                |
| `coreModules`       | `Map<string, any>`           | Core module metadata                   |
| `hasTriggeredLogin` | `boolean`                    | Login trigger state                    |
| `configManager`     | `ConfigManager`              | Settings manager                       |
| `systemLogger`      | `Logger`                     | System-wide logger                     |
| `utils`             | `UtilityFunctions`           | Utility functions                      |
| `classes`           | `Object`                     | Core classes (Logger, CustomModule...) |
| `types`             | `{SettingType}`              | Type enums                             |
| `subscriptions`     | `Map<string, Set<Function>>` | Global subscription tracking           |
| `hooks`             | `Object`                     | Pre/post/void/replace hooks            |
| `functions`         | `Record<string, Function>`   | Registered global functions            |

#### Methods

**Module Management:**

| Method                        | Returns                                 | Description                 |
| ----------------------------- | --------------------------------------- | --------------------------- |
| `getModule(idOrUrl)`          | `CustomModule \| undefined`             | Get loaded module by ID/URL |
| `waitForModule(id, timeout?)` | `Promise<CustomModule>`                 | Wait for module to load     |
| `loadModule(url)`             | `Promise<{success, message?, module?}>` | Load module from URL        |
| `unloadModule(idOrUrl)`       | `Promise<{success, message?}>`          | Unload module by ID/URL     |
| `reloadModule(idOrUrl)`       | `Promise<{success, message?}>`          | Reload module by ID/URL     |

**Repository Management:**

| Method                            | Returns                              | Description              |
| --------------------------------- | ------------------------------------ | ------------------------ |
| `getRepo(url)`                    | `ModuleRepository \| undefined`      | Get repository by URL    |
| `addRepository(url, saveConfig?)` | `Promise<{success, message, repo?}>` | Add plugin repository    |
| `removeRepository(url)`           | `boolean`                            | Remove repository by URL |

**Emergency Shutdown:**

| Method    | Returns                                        | Description              |
| --------- | ---------------------------------------------- | ------------------------ |
| `panic()` | `Promise<{success, message, modulesUnloaded}>` | Complete system shutdown |

##### getModule()

```typescript
getModule(idOrUrl: string): CustomModule | undefined
```

**Example:**

```typescript
const dialogApi = window.customjs.getModule('dialog-api');
if (dialogApi) {
  dialogApi.registerDialog('my-dialog', {...});
}
```

##### reloadModule()

```typescript
async reloadModule(idOrUrl: string): Promise<{
  success: boolean;
  message?: string;
  module?: CustomModule;
}>
```

**Example:**

```typescript
const result = await window.customjs.reloadModule("my-plugin");
if (result.success) {
  console.log("Plugin reloaded!");
}
```

##### waitForModule()

```typescript
async waitForModule(
  moduleId: string,
  timeout?: number  // Default: 10000ms
): Promise<CustomModule>
```

Waits for module to be loaded and started.

**Example:**

```typescript
try {
  const dialogApi = await window.customjs.waitForModule("dialog-api", 5000);
  // Use dialogApi
} catch (error) {
  console.error("dialog-api not available");
}
```

##### definePluginSettings()

```typescript
definePluginSettings(
  definition: Record<string, SettingDefinition>,
  plugin: CustomModule
): ModuleSettings
```

Internal method called by `plugin.defineSettings()`.

## Module Repository

### ModuleRepository Class

```typescript
class ModuleRepository {
  url: string;
  data: PluginRepoData | null;
  loaded: boolean;
  enabled: boolean;

  async fetch(): Promise<boolean>;
  getModules(): PluginRepoMetadata[];
  getModulesByTag(tag: string): PluginRepoMetadata[];
  getModule(id: string): PluginRepoMetadata | null;
  getModuleByUrl(url: string): PluginRepoMetadata | null;
}
```

### Repository Data Format

```json
{
  "name": "Repository Name",
  "description": "Repository description",
  "authors": [{
    "name": "Author Name",
    "userId": "usr_xxx"
  }],
  "modules": [
    {
      "id": "plugin-id",
      "name": "Plugin Name",
      "description": "...",
      "url": "https://.../plugin.js",
      "sourceUrl": "https://.../plugin.ts",
      "enabled": true,
      "tags": ["Utility"],
      "authors": [...]
    }
  ]
}
```

## Utils Module

### Utility Functions

Available via `window.customjs.utils`:

#### copyToClipboard()

```typescript
async copyToClipboard(text: string): Promise<boolean>
```

Cross-browser clipboard copying with fallbacks.

**Example:**

```typescript
const success = await window.customjs.utils.copyToClipboard("Hello World");
if (success) {
  console.log("Copied!");
}
```

## ConfigManager

Settings and configuration management.

### Methods

```typescript
get(key: string, defaultValue?: any): any
set(key: string, value: any): boolean
has(key: string): boolean
delete(key: string): boolean
clear(): void
getPluginConfig(): PluginConfig
setPluginConfig(config: PluginConfig): void
```

**Example:**

```typescript
const config = window.customjs.configManager;

// Get value
const value = config.get("my-plugin.setting", "default");

// Set value
config.set("my-plugin.setting", "new value");

// Check existence
if (config.has("my-plugin.setting")) {
}
```

## Type Reference

### SettingType Values

| Type        | Input       | Description                           |
| ----------- | ----------- | ------------------------------------- |
| `STRING`    | Text        | String value                          |
| `NUMBER`    | Number      | Numeric value with min/max            |
| `BIGINT`    | Number      | Large integer                         |
| `BOOLEAN`   | Toggle      | True/false                            |
| `SELECT`    | Dropdown    | Choose from options                   |
| `SLIDER`    | Slider      | Number with markers                   |
| `TIMESPAN`  | Time input  | Duration in milliseconds with min/max |
| `COMPONENT` | Custom      | Custom Vue component                  |
| `CUSTOM`    | JSON editor | Free-form JSON                        |

### CustomActionButton

```typescript
interface CustomActionButton {
  title: string;
  color: "primary" | "success" | "warning" | "danger" | "info";
  icon?: string;
  description?: string;
  callback: () => void | Promise<void>;
}
```

## Advanced Features

### Dependency System

#### Required Dependencies

```typescript
required_dependencies: ["dialog-api", "nav-menu-api"];
```

- Plugin waits up to 10 seconds for each
- Error thrown if unavailable
- Plugin fails to start if missing

#### Optional Dependencies

```typescript
optional_dependencies: ["plugin-analyzer"];
```

- Plugin waits up to 2 seconds for each
- Warning logged if unavailable
- Plugin continues without them

### Parallel Loading

Modules load in optimized phases:

1. **Fetch** (parallel) - All module code downloaded simultaneously
2. **Load** (parallel) - All `load()` methods called concurrently
3. **Start** (dependency-ordered) - Sequential with dependency resolution

### Script Execution Lock

Prevents race conditions during parallel loading:

- Scripts fetched in parallel
- Scripts executed sequentially
- Ensures `__LAST_PLUGIN_CLASS__` correct for each module

## Helper Methods

### showConfirmDialog()

```typescript
async showConfirmDialog(
  title: string,
  message: string,
  confirmText?: string,
  cancelText?: string
): Promise<boolean>
```

Tries `dialog-api.showConfirmDialogAsync()`, falls back to `confirm()`.

### showAlertDialog()

```typescript
async showAlertDialog(
  title: string,
  message: string,
  confirmText?: string
): Promise<void>
```

Tries `dialog-api.showConfirmDialogAsync()`, falls back to `alert()`.

## Best Practices

### Error Handling

```typescript
try {
  await operation();
} catch (error) {
  const errorMsg = error instanceof Error ? error.message : String(error);
  this.logger.error(`Operation failed: ${errorMsg}`);
  this.logger.showError("Operation failed");
}
```

### Async Callbacks

Always use `async` for callbacks that await:

```typescript
this.actionButtons = [
  {
    title: "Load Data",
    callback: async () => {
      // <-- async
      await this.loadData();
    },
  },
];
```

### Resource Cleanup

```typescript
// DON'T: Manual cleanup required
const timer = setInterval(() => {}, 1000);

// DO: Automatic cleanup
const timer = setInterval(() => {}, 1000);
this.registerTimer(timer);
```

### Settings Access

```typescript
// DON'T: Direct localStorage access
localStorage.getItem("my-plugin.setting");

// DO: Use settings store
this.settings.store.settingName;
```

## Common Patterns

### Wait for API

```typescript
async start() {
  const api = await window.customjs.waitForModule('some-api');
  // Use api
}
```

### Conditional Logic Based on Dependencies

```typescript
async start() {
  const analyzer = window.customjs.getModule('plugin-analyzer');

  if (analyzer) {
    this.enableAnalysisFeatures();
  } else {
    this.useBasicFeatures();
  }
}
```

### Periodic Updates

```typescript
async start() {
  const timer = setInterval(() => {
    this.update();
  }, this.settings.store.updateInterval);

  this.registerTimer(timer);
}
```

### Dynamic Settings

```typescript
async load() {
  this.settings = this.defineSettings({...});

  // React to setting changes
  this.settings.onChange('myOption', (newValue) => {
    this.handleOptionChange(newValue);
  });
}
```

## See Also

- [Plugin Development Guide](plugins.md)
- [Plugin Repository](../../plugins/README.md)
- [Template Plugin](../../plugins/src/plugins/template.md)
