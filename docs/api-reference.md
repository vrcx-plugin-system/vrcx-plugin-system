# API Reference

Complete API reference for VRCX Plugin System.

## Plugin Base Class

### Constructor

```javascript
constructor(metadata?: Partial<PluginMetadata>)
```

**Metadata:**

- `id` - Auto-derived from filename
- `name` - Display name
- `description` - Description
- `author` - Author name
- `version` - Semantic version
- `build` - Build timestamp
- `dependencies` - Array of plugin IDs

### Lifecycle Methods

```javascript
async load()      // Initial setup
async start()     // Start operations
async onLogin(currentUser)  // After VRChat login
async stop()      // Cleanup
async enable()    // Enable plugin
async disable()   // Disable plugin
async toggle()    // Toggle state
```

### Custom Action Buttons

Define custom action buttons in your plugin's constructor:

```javascript
this.actionButtons = [
  new CustomActionButton({
    title: string,          // Button text
    color?: string,         // primary|success|warning|danger|info (default: primary)
    icon?: string,          // Remix Icon class (e.g., "ri-refresh-line")
    description?: string,   // Tooltip/hover text
    callback: async () => void  // Click handler
  })
];
```

### Resource Management

```javascript
registerTimer(timerId: number): number
registerListener(element, event, handler, options?): object
registerObserver(observer): Observer
registerSubscription(unsubscribe): Function
```

### Hook Registration

```javascript
registerPreHook(path: string, callback: (args) => void)
registerPostHook(path: string, callback: (result, args) => void)
registerVoidHook(path: string, callback: (args) => void)
registerReplaceHook(path: string, callback: (original, ...args) => any)
```

### Events

```javascript
emit(eventName: string, data: any): void
on(eventName: string, callback: Function): void
subscribe(type: string, callback: Function): Function | null
```

**Event Types:** `"LOCATION"`, `"USER"`, `"GAME"`, `"GAMELOG"`, `"FRIENDS"`, `"UI"`

### Settings

```javascript
defineSettings(definition: object): SettingsObject
get(key: string, defaultValue?): any
set(key: string, value: any): boolean
deleteSetting(key: string): boolean
getAllSettings(): object
clearAllSettings(): void
```

**SettingType Enum:**

- `STRING` - Text input
- `NUMBER` - Number input
- `BOOLEAN` - Toggle switch
- `SELECT` - Dropdown
- `SLIDER` - Slider with markers
- `CUSTOM` - JSON editor

**Setting Definition:**

```javascript
{
  type: SettingType,
  description: string,
  category?: string,
  default?: any,
  placeholder?: string,      // STRING only
  markers?: number[],        // SLIDER only
  options?: Array<{          // SELECT only
    label: string,
    value: any,
    default?: boolean
  }>,
  hidden?: boolean,
  variables?: {              // For template strings
    "{placeholder}": "Description"
  }
}
```

**SettingsObject:**

```javascript
{
  store: object,              // Reactive access
  plain: object,              // Non-reactive
  def: object,                // Definitions
  onChange(key, callback): void,
  reset(key): void,
  resetAll(): void
}
```

### Logging

```javascript
// Console only
log(msg, ...args): void
warn(msg, ...args): void
error(msg, ...args): void
```

## Logger Class

Accessed via `this.logger` in plugins or `new Logger(context)`.

### Console Logging

```javascript
log(msg, ...args): void
logInfo(msg, ...args): void
logWarn(msg, ...args): void
logWarning(msg, ...args): void
logError(msg, ...args): void

// Aliases
info(msg, ...args): void
warn(msg, ...args): void
warning(msg, ...args): void
error(msg, ...args): void
```

### UI Toasts (try $message → $notify → console)

```javascript
showInfo(msg, ...args): void
showSuccess(msg, ...args): void
showWarning(msg, ...args): void
showWarn(msg, ...args): void  // Alias
showError(msg, ...args): void
```

### UI Notifications (try $notify → $message → console)

```javascript
notifyInfo(msg, ...args): void
notifySuccess(msg, ...args): void
notifyWarning(msg, ...args): void
notifyError(msg, ...args): void
```

### Desktop & VR

```javascript
notifyDesktop(msg, ...args): void
notifyVR(msg, ...args): void
notifyAll(msg, ...args): void  // Desktop + VR
```

### Browser Alert

```javascript
alert(msg, ...args): void
```

### VRCX Log Stores

```javascript
addFeed(entry: FeedEntry): void
addGameLog(entry: GameLogEntry): void
addFriendLog(entry: FriendLogEntry): void
addNotificationLog(entry: NotificationLogEntry): void
```

**Entry Structures:**

```javascript
// FeedEntry
{
  type: string,
  message: string,
  created_at: string  // ISO 8601
}

// GameLogEntry
{
  type: string,
  dt: string,         // ISO 8601
  data: string
}

// FriendLogEntry
{
  type: string,
  created_at: string, // ISO 8601
  userId: string,
  displayName: string
}

// NotificationLogEntry
{
  type: string,
  created_at: string, // ISO 8601
  data: string
}
```

## ConfigManager

Accessed via `window.customjs.configManager`.

```javascript
get(key: string, defaultValue?): any
set(key: string, value: any): boolean
delete(key: string): boolean
has(key: string): boolean
clear(prefix?: string): void
keys(prefix?: string): string[]

getPluginConfig(pluginId?: string): object
setPluginConfig(config: object): void

export(): string
import(jsonString: string): boolean

async exportToVRChatConfig(): Promise<object>
async importFromVRChatConfig(): Promise<object>
```

## Utils

Accessed via `window.customjs.utils`.

```javascript
// Checks
isEmpty(value): boolean

// Time
timeToText(ms: number): string
getTimestamp(now?: Date): string
formatDateTime(now?: Date): string

// Clipboard
async copyToClipboard(text, description?): Promise<boolean>

// VRChat
async saveBio(bio?, bioLinks?): Promise<any>
async getLocationObject(location): Promise<object>

// Colors
hexToRgba(hex: string, alpha: number): string
darkenColor(hex: string, percent: number): string
```

## PluginManager

Accessed via `window.customjs.pluginManager`.

```javascript
registerPlugin(plugin): boolean
getPlugin(id: string): Plugin | undefined
async waitForPlugin(id: string, timeout?): Promise<Plugin>
getAllPlugins(): Plugin[]
async startAllPlugins(): void
async stopAllPlugins(): void
onLogin(callback): void
async loadAllPlugins(): void
```

## Global Objects

### window.customjs

```javascript
{
  version: string,
  build: string,

  // Classes
  Logger: typeof Logger,
  ConfigManager: typeof ConfigManager,
  Plugin: typeof Plugin,
  PluginLoader: typeof PluginLoader,
  PluginManager: typeof PluginManager,
  SettingsStore: typeof SettingsStore,

  // Utilities
  utils: object,
  SettingType: enum,
  definePluginSettings: Function,

  // Instances
  configManager: ConfigManager,
  pluginManager: PluginManager,

  // Data
  plugins: Plugin[],
  core_modules: any[],
  subscriptions: Map,
  hooks: object,
  functions: Record<string, Function>,
  events: Record<string, Function[]>
}
```

### window.$pinia

VRCX's Pinia stores:

```javascript
{
  user: { currentUser, ... },
  location: { location, lastLocation, ... },
  game: { isGameRunning, ... },
  gameLog: { gameLogTable, ... },
  friend: { friends, offlineFriends, ... },
  favorite: { favoriteFriends, ... },
  moderation: { cachedPlayerModerations, ... },
  notification: { /* notification methods */ },
  feed: { /* feed methods */ }
}
```

### window.$app

VRCX's Vue app instance:

```javascript
{
  config: {
    globalProperties: {
      $message: Function,  // Element Plus message
      $notify: Function    // Element Plus notification
    }
  }
}
```

### window.AppApi

VRCX's C# API bridge:

```javascript
{
  SendIpc(method, ...args): any,
  ShowDevTools(): void,
  DesktopNotification(title, message, icon?): void,
  StartGame(): void,
  // ... many more methods
}
```

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
  tags?: string[];
}
```

### ResourceTracking

```typescript
interface ResourceTracking {
  timers: Set<number>;
  observers: Set<Observer>;
  listeners: Map<any, any>;
  subscriptions: Set<Function>;
  hooks: Set<string>;
}
```

## Examples

See **[Plugin Development Guide](plugins.md)** for complete examples.
