# Settings System Migration Guide

## Overview

VRCX Custom has been upgraded with an **Equicord-inspired settings system** that provides better type safety, metadata support, and reactive updates. This guide explains the new system and how to migrate from the old approach.

## What Changed?

### Version 4.0.0 - Equicord-Style Settings

The new settings system provides:

- ✨ **Type-safe settings** with `SettingType` enum (STRING, NUMBER, BOOLEAN, SELECT, SLIDER, etc.)
- 🔄 **Reactive access** via `settings.store.propertyName`
- 📝 **Metadata support** (descriptions, placeholders, defaults)
- 🎯 **Change listeners** for reactive behavior
- 💾 **Auto-save** to localStorage on any change
- 🎛️ **Advanced types** like SLIDER and SELECT dropdowns

### Backward Compatibility

The old `PluginSetting` class and `this.get()/this.set()` methods are still supported but deprecated.

## Three Ways to Use Settings

### Method 1: Simple Get/Set (Basic/Ad-hoc Settings)

Good for simple, one-off settings:

```javascript
// In load()
const value = this.get("myKey", "defaultValue");
this.set("myKey", "newValue");
```

### Method 2: PluginSetting (DEPRECATED)

The old way - still works but not recommended:

```javascript
// In load()
this.config.enabled = this.createSetting({
  key: "enabled",
  category: "general",
  name: "Enable Feature",
  description: "Enable the main feature",
  type: "boolean",
  defaultValue: true,
});

// Access
const enabled = this.config.enabled.get();
this.config.enabled.set(false);
```

### Method 3: Equicord-Style (RECOMMENDED) ⭐

The new way - cleaner, type-safe, and reactive:

```javascript
// In load()
const SettingType = window.customjs.SettingType;

this.settings = this.defineSettings({
  enabled: {
    type: SettingType.BOOLEAN,
    description: "Enable the main feature",
    default: true,
  },
  apiKey: {
    type: SettingType.STRING,
    description: "API Key",
    placeholder: "Enter your key...",
    default: "",
  },
  volume: {
    type: SettingType.SLIDER,
    description: "Volume",
    default: 0.5,
    markers: [0, 0.25, 0.5, 0.75, 1],
  },
  mode: {
    type: SettingType.SELECT,
    description: "Mode",
    options: [
      { label: "Auto", value: "auto", default: true },
      { label: "Manual", value: "manual" },
      { label: "Advanced", value: "advanced" },
    ],
  },
});

// Access (reactive) - automatically saved on change
const enabled = this.settings.store.enabled;
this.settings.store.enabled = false; // Auto-saves!

// Listen for changes
this.settings.onChange("enabled", (newValue) => {
  console.log("enabled changed to:", newValue);
});

// Reset to default
this.settings.reset("enabled");

// Reset all
this.settings.resetAll();
```

## Available Setting Types

```javascript
const SettingType = window.customjs.SettingType;

SettingType.STRING; // Text input
SettingType.NUMBER; // Number input
SettingType.BIGINT; // BigInt input
SettingType.BOOLEAN; // Toggle/checkbox
SettingType.SELECT; // Dropdown with options
SettingType.SLIDER; // Slider with markers
SettingType.COMPONENT; // Custom UI component (future)
SettingType.CUSTOM; // Arbitrary objects/arrays
```

## Special Properties

### Hidden Settings

Use `hidden: true` for settings that should be stored but not shown in UI:

```javascript
statsTotalChecked: {
  type: SettingType.NUMBER,
  description: "Total checks performed",
  default: 0,
  hidden: true, // Won't show in UI
}
```

**Use cases:**
- Statistics and counters
- Internal state that needs persistence
- Debug information
- Timestamps

### Template Variables

For STRING settings that use placeholders, document them with `variables`:

```javascript
messageTemplate: {
  type: SettingType.STRING,
  description: "Custom message template",
  default: "Hello {userName} from {worldName}!",
  variables: {
    "{userName}": "The user's display name",
    "{worldName}": "Current world name",
    "{now}": "Current date/time",
  }
}
```

This provides self-documentation for available template variables.

## Migration Examples

### Example 1: Boolean Setting

**Old Way:**

```javascript
this.config.enabled = this.createSetting({
  key: "enabled",
  category: "general",
  name: "Enable Feature",
  description: "Enable the main feature",
  type: "boolean",
  defaultValue: true,
});

if (this.config.enabled.get()) {
  // do something
}
```

**New Way:**

```javascript
this.settings = this.defineSettings({
  enabled: {
    type: SettingType.BOOLEAN,
    description: "Enable the main feature",
    default: true,
  },
});

if (this.settings.store.enabled) {
  // do something
}
```

### Example 2: String with Categories

**Old Way:**

```javascript
this.config.apiKey = this.createSetting({
  key: "apiKey",
  category: "advanced",
  name: "API Key",
  description: "Your API key",
  type: "string",
  defaultValue: "",
});

const key = this.config.apiKey.get();
```

**New Way:**

```javascript
this.settings = this.defineSettings({
  apiKey: {
    type: SettingType.STRING,
    description: "Your API key",
    placeholder: "Enter API key...",
    default: "",
  },
});

const key = this.settings.store.apiKey;
```

**Note:** Categories are no longer needed - organize settings in the definition object itself.

### Example 3: Number Setting

**Old Way:**

```javascript
this.config.interval = this.createSetting({
  key: "interval",
  category: "general",
  type: "number",
  defaultValue: 5000,
});

const interval = this.config.interval.get();
```

**New Way:**

```javascript
this.settings = this.defineSettings({
  interval: {
    type: SettingType.NUMBER,
    description: "Update interval (ms)",
    default: 5000,
  },
});

const interval = this.settings.store.interval;
```

### Example 4: Select Dropdown (NEW!)

```javascript
this.settings = this.defineSettings({
  mode: {
    type: SettingType.SELECT,
    description: "Operating mode",
    options: [
      { label: "Automatic", value: "auto", default: true },
      { label: "Manual", value: "manual" },
      { label: "Custom", value: "custom" },
    ],
  },
});

// Access
const mode = this.settings.store.mode; // "auto" | "manual" | "custom"
```

### Example 5: Slider (NEW!)

```javascript
this.settings = this.defineSettings({
  volume: {
    type: SettingType.SLIDER,
    description: "Volume",
    default: 0.5,
    markers: [0, 0.25, 0.5, 0.75, 1],
  },
});

// Access
const volume = this.settings.store.volume; // 0.0 to 1.0
```

## Change Listeners

Listen for setting changes:

```javascript
// Listen to specific setting
this.settings.onChange("enabled", (newValue) => {
  console.log("enabled changed to:", newValue);
  this.updateFeatureState(newValue);
});

// Remove listener
const callback = (newValue) => console.log(newValue);
this.settings.onChange("enabled", callback);
// Later...
this.settings.offChange("enabled", callback);
```

## Storage

### Where Settings Are Stored

All plugin settings are stored in localStorage with the key pattern:

```
customjs.{pluginId}.{settingKey}
```

### Storage Structure

**Old System (per-key):**

```
customjs.my-plugin.general.enabled = true
customjs.my-plugin.general.apiKey = "key123"
customjs.my-plugin.notifications.sound = true
```

**New System (flat):**

```
customjs.my-plugin.enabled = true
customjs.my-plugin.apiKey = "key123"
customjs.my-plugin.sound = true
```

## API Reference

### defineSettings(definition, plugin)

Creates a settings object with metadata and reactive access.

**Parameters:**

- `definition` - Settings definition object
- `plugin` - Plugin instance (usually `this`)

**Returns:**

```javascript
{
  store: {},        // Reactive proxy - use for reading/writing
  plain: {},        // Non-reactive plain object
  def: {},          // Settings definition
  pluginName: "",   // Plugin ID
  onChange(key, callback) {},  // Add change listener
  offChange(key, callback) {}, // Remove change listener
  reset(key) {},    // Reset setting to default
  resetAll() {}     // Reset all settings
}
```

### Setting Definition Properties

```javascript
{
  type: SettingType,      // Required: Setting type
  description: string,    // Required: Description
  default: any,          // Default value
  placeholder: string,   // Placeholder text (STRING only)
  markers: number[],     // Slider markers (SLIDER only)
  options: [...],        // Dropdown options (SELECT only)
  hidden: boolean,       // Hide from UI (still stored/accessible)
  variables: {...},      // Template variables dict (STRING only)
}
```

### Hidden Settings

Use `hidden: true` for settings that should be stored but not visible in UI (e.g., stats):

```javascript
statsTotalChecked: {
  type: SettingType.NUMBER,
  description: "Total users checked (hidden stat)",
  default: 0,
  hidden: true,
}
```

Access hidden settings normally:
```javascript
this.settings.store.statsTotalChecked++;
```

Get only visible/hidden settings:
```javascript
const visible = this.settings.getVisibleSettings();
const hidden = this.settings.getHiddenSettings();
```

### Template Variables

For STRING settings that use template variables, document them with a `variables` dict:

```javascript
template: {
  type: SettingType.STRING,
  description: "Bio template with placeholders",
  default: "Hello {userName}!",
  variables: {
    "{userName}": "The user's display name",
    "{userId}": "The user's ID",
    "{now}": "Current date/time",
  }
}
```

This helps document which placeholders are available and what they mean.

### SELECT Options

```javascript
{
  label: string,    // Display text
  value: any,      // Actual value
  default: boolean // Mark as default (optional)
}
```

## Migration Checklist

When migrating a plugin:

- [ ] Replace `this.config.x = this.createSetting(...)` with `this.settings = this.defineSettings({...})`
- [ ] Replace `this.config.x.get()` with `this.settings.store.x`
- [ ] Replace `this.config.x.set(value)` with `this.settings.store.x = value`
- [ ] Remove category nesting (flatten settings structure)
- [ ] Add `SettingType` to each setting
- [ ] Add descriptions to all settings
- [ ] Consider using SELECT or SLIDER for appropriate settings
- [ ] Update version to 3.0.0+
- [ ] Test all setting reads/writes

## Migrated Plugins

✅ Plugins using new system:

- `monitor-invisibleplayers.js` (v3.0.0)
- `yoinker-detector.js` (v3.0.0)
- `template.js` (v3.0.0)

⏳ Plugins still using old system:

- Check other plugins and migrate as needed

## Complete Example

**monitor-invisibleplayers.js** - Before & After:

### Before (Old System)

```javascript
async load() {
  this.config.enabled = this.createSetting({
    key: "enabled",
    category: "general",
    name: "Enable Monitoring",
    description: "Enable invisible player detection",
    type: "boolean",
    defaultValue: true,
  });

  this.config.notify = this.createSetting({
    key: "showNotification",
    category: "notifications",
    name: "Show Notification",
    description: "Show notification when detected",
    type: "boolean",
    defaultValue: true,
  });
}

handleInstanceData(data) {
  if (!this.config.enabled.get()) return;

  if (this.config.notify.get()) {
    this.logger.log("Invisible players detected!");
  }
}
```

### After (New System)

```javascript
async load() {
  const SettingType = window.customjs.SettingType;

  this.settings = this.defineSettings({
    enabled: {
      type: SettingType.BOOLEAN,
      description: "Enable invisible player detection",
      default: true,
    },
    notify: {
      type: SettingType.BOOLEAN,
      description: "Show notification when detected",
      default: true,
    },
  });
}

handleInstanceData(data) {
  if (!this.settings.store.enabled) return;

  if (this.settings.store.notify) {
    this.logger.log("Invisible players detected!");
  }
}
```

## Need Help?

- Check `template.js` for complete working example
- Look at migrated plugins for real-world usage
- Settings are auto-saved to localStorage on any change
- All old methods still work for backward compatibility

---

**Happy Coding! 🚀**
