# API Reference

Complete API reference for VRCX Plugin System v3.0.

## Core Classes

### Plugin

Base class for all plugins.

#### Constructor

```javascript
constructor(metadata?: Partial<PluginMetadata>)
```

**Metadata Properties:**

- `id` (string, optional) - Auto-derived from filename if not provided
- `name` (string) - Display name
- `description` (string) - Plugin description
- `author` (string) - Author name
- `version` (string) - Semantic version (e.g., "1.0.0")
- `dependencies` (string[]) - Array of required plugin IDs

#### Properties

- `metadata: PluginMetadata` - Plugin metadata
- `loaded: boolean` - Whether `load()` has completed
- `started: boolean` - Whether `start()` has completed
- `enabled: boolean` - Whether plugin is enabled
- `logger: Logger` - Personal logger instance
- `resources: ResourceTracking` - Tracked resources for cleanup

#### Lifecycle Methods

**`async load(): Promise<void>`**

- Called immediately after instantiation
- Use for: Initial setup, registering hooks, defining settings
- Should NOT start timers or modify DOM

**`async start(): Promise<void>`**

- Called after all plugins have loaded
- Use for: Starting timers, modifying DOM, plugin-dependent setup

**`async onLogin(currentUser: any): Promise<void>`**

- Called after successful VRChat login
- Use for: User-specific initialization, loading user data

**`async stop(): Promise<void>`**

- Called when plugin is disabled or unloaded
- Automatically cleans up registered resources
- Override to add custom cleanup

**`async enable(): Promise<boolean>`**

- Enable the plugin
- Returns `true` if enabled, `false` if already enabled

**`async disable(): Promise<boolean>`**

- Disable the plugin (calls `stop()`)
- Returns `true` if disabled, `false` if already disabled

**`async toggle(): Promise<boolean>`**

- Toggle enabled state
- Returns new enabled state

#### Resource Management

**`registerTimer(timerId: number): number`**

- Register a timer for automatic cleanup
- Works with `setInterval()` and `setTimeout()`

**`registerObserver(observer: Observer): Observer`**

- Register an observer for automatic cleanup
- Works with MutationObserver, IntersectionObserver, etc.

**`registerListener(element: EventTarget, event: string, handler: Function, options?: object): object`**

- Register an event listener for automatic cleanup
- Returns listener info object

**`registerSubscription(unsubscribe: Function): Function`**

- Register a subscription for automatic cleanup
- Returns the unsubscribe function

**`registerResource(unsubscribe: Function): Function`**

- Alias for `registerSubscription()`

#### Hook Registration

**`registerPreHook(functionPath: string, callback: Function): void`**

- Register a pre-hook (runs before original function)
- `callback` receives: `(args: any[]) => void`

**`registerPostHook(functionPath: string, callback: Function): void`**

- Register a post-hook (runs after original function)
- `callback` receives: `(result: any, args: any[]) => void`

**`registerVoidHook(functionPath: string, callback: Function): void`**

- Register a void-hook (prevents original function execution)
- `callback` receives: `(args: any[]) => void`

**`registerReplaceHook(functionPath: string, callback: Function): void`**

- Register a replace-hook (replace function with custom implementation)
- `callback` receives: `(originalFunc: Function, ...args: any[]) => any`

#### Events

**`emit(eventName: string, data: any): void`**

- Emit an event that other plugins can listen to
- Event name is auto-prefixed with plugin ID

**`on(eventName: string, callback: Function): void`**

- Listen to events (from this or other plugins)
- Use format `"pluginId:eventName"` for other plugins

**`subscribe(eventType: string, callback: Function): Function | null`**

- Subscribe to VRCX system events
- Event types: `"LOCATION"`, `"USER"`, `"GAME"`, `"GAMELOG"`, `"FRIENDS"`, `"UI"`
- Returns unsubscribe function or null if failed

#### Settings

**`defineSettings(definition: object): SettingsObject`**

- Define plugin settings using Equicord-style system
- Returns settings object with `store`, `plain`, `def` properties

**`get(key: string, defaultValue?: any): any`**

- Get setting value (auto-prefixes plugin ID)

**`set(key: string, value: any): boolean`**

- Set setting value (auto-prefixes plugin ID)

**`deleteSetting(key: string): boolean`**

- Delete a setting

**`hasSetting(key: string): boolean`**

- Check if setting exists

**`getAllSettingKeys(): string[]`**

- Get all setting keys for this plugin

**`getAllSettings(): object`**

- Get all settings as nested object

**`clearAllSettings(): void`**

- Clear all settings for this plugin

#### Logging

**`log(message: string, ...args: any[]): void`**

- Log info message to console

**`warn(message: string, ...args: any[]): void`**

- Log warning message to console

**`error(message: string, ...args: any[]): void`**

- Log error message to console

---

## Logger

Centralized logging system with multiple output targets.

### Constructor

```javascript
new Logger(context: string = "CJS", options?: LogOptions)
```

### Methods

**`log(msg: string, options?: LogOptions, level?: string, timestamp?: boolean): void`**

- Main logging method with full control
- `level`: `"info"` | `"warn"` | `"error"` | `"log"`

**`logInfo(msg: string): void`**
**`info(msg: string): void`**

- Log info message to console only

**`logWarn(msg: string): void`**
**`warn(msg: string): void`**

- Log warning message to console only

**`logError(msg: string): void`**
**`error(msg: string): void`**

- Log error message to console only

**`logDebug(msg: string): void`**
**`debug(msg: string): void`**

- Log debug message with timestamp

**`showInfo(msg: string): void`**

- Show info notification in VRCX (no console)

**`showSuccess(msg: string): void`**

- Show success notification in VRCX

**`showWarn(msg: string): void`**

- Show warning notification in VRCX

**`showError(msg: string): void`**

- Show error notification in VRCX

**`async notifyDesktop(msg: string): Promise<void>`**

- Send desktop notification

**`async notifyXSOverlay(msg: string, duration?: number): Promise<void>`**

- Send XSOverlay notification

**`async notifyOVRToolkit(msg: string, duration?: number): Promise<void>`**

- Send OVRToolkit notification

**`async notifyVR(msg: string): Promise<void>`**

- Send to all VR overlays

**`logAndShow(msg: string, level?: string): void`**

- Log to console and show in VRCX UI

**`logAndNotifyAll(msg: string, level?: string): void`**

- Log to all outputs (console, UI, desktop, VR)

---

## ConfigManager

Configuration management with localStorage backend.

### Methods

**`get(key: string, defaultValue?: any): any`**

- Get value from localStorage (auto-prefixed with "customjs.")

**`set(key: string, value: any): boolean`**

- Set value in localStorage

**`delete(key: string): boolean`**

- Delete value from localStorage

**`has(key: string): boolean`**

- Check if key exists

**`clear(prefix?: string): void`**

- Clear all keys with prefix

**`keys(prefix?: string): string[]`**

- Get all keys with prefix

**`getPluginConfig(pluginId?: string): object`**

- Get plugin configuration
- If no pluginId: returns url → enabled mapping
- With pluginId: returns all settings for that plugin

**`setPluginConfig(config: object): void`**

- Set plugin configuration (url → enabled mapping)

**`export(): string`**

- Export all settings to JSON string

**`import(jsonString: string): boolean`**

- Import settings from JSON string

**`async exportToVRChatConfig(): Promise<object>`**

- Export to VRChat config.json

**`async importFromVRChatConfig(): Promise<object>`**

- Import from VRChat config.json

---

## Settings System

Equicord-inspired settings system.

### SettingType Enum

```javascript
window.customjs.SettingType.STRING;
window.customjs.SettingType.NUMBER;
window.customjs.SettingType.BIGINT;
window.customjs.SettingType.BOOLEAN;
window.customjs.SettingType.SELECT;
window.customjs.SettingType.SLIDER;
window.customjs.SettingType.COMPONENT;
window.customjs.SettingType.CUSTOM;
```

### definePluginSettings

```javascript
definePluginSettings(definition: object, plugin: Plugin): SettingsObject
```

**Definition Properties:**

- `type` (SettingType) - Required setting type
- `description` (string) - Required description
- `default` (any) - Default value
- `category` (string) - Category for grouping
- `placeholder` (string) - Placeholder text (STRING only)
- `markers` (number[]) - Slider markers (SLIDER only)
- `options` (array) - Dropdown options (SELECT only)
- `hidden` (boolean) - Hide from UI
- `variables` (object) - Template variables (STRING templates)

**Returns:**

```javascript
{
  store: object,          // Reactive access to settings
  plain: object,          // Non-reactive access
  def: object,            // Definition metadata
  pluginName: string,     // Plugin ID

  // Methods
  onChange(key, callback): void,
  offChange(key, callback): void,
  reset(key): void,
  resetAll(): void,
  getVisibleSettings(): object,
  getHiddenSettings(): object,
  getSettingsByCategory(): object,
  getCategorySettings(category): object,
}
```

---

## Utils

Utility functions accessible via `window.customjs.utils`.

### Methods

**`isEmpty(v: any): boolean`**

- Check if value is empty (null, undefined, or "")

**`timeToText(ms: number): string`**

- Convert milliseconds to human-readable text
- Example: `300000` → `"5m 0s"`

**`getTimestamp(now?: Date): string`**

- Get formatted timestamp
- Format: `"MM/DD/YYYY, HH:MM:SS"`

**`formatDateTime(now?: Date): string`**

- Format date and time
- Format: `"YYYY-MM-DD HH:MM:SS GMT+1"`

**`async copyToClipboard(text: string, description?: string): Promise<boolean>`**

- Copy text to clipboard with fallback

**`saveBio(bio?: string, bioLinks?: any): Promise<any>`**

- Save VRChat user bio

**`async getLocationObject(loc: any): Promise<object>`**

- Get location object from various formats

**`hexToRgba(hex: string, alpha: number): string`**

- Convert hex color to rgba
- Example: `hexToRgba("#ff0000", 0.5)` → `"rgba(255, 0, 0, 0.5)"`

**`darkenColor(hex: string, percent: number): string`**

- Darken a hex color by percentage
- Example: `darkenColor("#ff0000", 20)` → darker red

---

## PluginManager

Global plugin lifecycle manager.

Access via: `window.customjs.pluginManager`

### Methods

**`registerPlugin(plugin: Plugin): boolean`**

- Register a plugin (called automatically)

**`getPlugin(pluginId: string): Plugin | undefined`**

- Get plugin by ID

**`async waitForPlugin(pluginId: string, timeout?: number): Promise<Plugin>`**

- Wait for a plugin to be available

**`getAllPlugins(): Plugin[]`**

- Get all registered plugins

**`async startAllPlugins(): Promise<void>`**

- Start all plugins

**`async stopAllPlugins(): Promise<void>`**

- Stop all plugins

**`onLogin(callback: Function): void`**

- Register callback for login event

**`async loadAllPlugins(): Promise<void>`**

- Load all enabled plugins from config

---

## Global Objects

### window.customjs

Main namespace for the plugin system.

```javascript
{
  version: string,                  // System version
  build: string,                    // Build timestamp

  // Core classes
  Logger: typeof Logger,
  ConfigManager: typeof ConfigManager,
  Plugin: typeof Plugin,
  PluginLoader: typeof PluginLoader,
  PluginManager: typeof PluginManager,
  SettingsStore: typeof SettingsStore,

  // Utilities
  utils: object,
  SettingType: object,
  definePluginSettings: Function,

  // Instances
  configManager: ConfigManager,
  pluginManager: PluginManager,

  // Plugin tracking
  plugins: Plugin[],
  subscriptions: Map<string, Set<Function>>,
  hooks: object,
  functions: Record<string, Function>,
  events: Record<string, Function[]>,
}
```

---

## Type Definitions

### PluginMetadata

```typescript
interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  build: string;
  url: string | null;
}
```

### LogOptions

```typescript
interface LogOptions {
  console?: boolean;
  vrcx?: {
    notify?: boolean;
    noty?: boolean;
    message?: boolean;
  };
  event?: {
    noty?: boolean;
    external?: boolean;
  };
  desktop?: boolean;
  xsoverlay?: boolean;
  ovrtoolkit?: boolean;
  webhook?: boolean;
}
```

### SettingDefinition

```typescript
interface SettingDefinition {
  type: SettingType;
  description: string;
  default?: any;
  category?: string;
  placeholder?: string;
  markers?: number[];
  options?: Array<{ label: string; value: any; default?: boolean }>;
  hidden?: boolean;
  variables?: Record<string, string>;
}
```

---

For complete examples, see the [Plugin Development Guide](plugins.md).
