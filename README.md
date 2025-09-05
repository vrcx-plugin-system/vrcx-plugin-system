# VRCX Custom Modules

This directory contains the modular JavaScript files for VRCX custom functionality. The main `custom.js` file now acts as a module loader that dynamically loads these individual modules. All modules are self-initializing and register themselves in the global `window.customjs.*` namespace.

## File Structure

### Core Files

- **`config.js`** - Configuration management using user settings from main custom.js
- **`utils.js`** - Utility classes and helper functions (Utils, global variables)
- **`api-helpers.js`** - API wrapper functions, logging, and location management

### Feature Modules

- **`context-menu.js`** - CustomContextMenu class for managing context menu items
- **`registry-overrides.js`** - RegistryOverrides class for managing VRChat registry settings
- **`tag-manager.js`** - CustomTagManager class for loading and managing custom user tags
- **`bio-updater.js`** - BioUpdater class for automatic bio updating
- **`auto-invite.js`** - AutoInviteManager class for automatic user invitations
- **`managers.js`** - Management classes (InstanceMonitor, NotificationHandler, DebugTools)

## Module Loading

The main `custom.js` file uses a `ModuleLoader` class that:

1. **Loads local modules** from the `customjs/` directory
2. **Supports external modules** via URLs (configurable in `MODULE_CONFIG.externalModules`)
3. **Handles loading errors** gracefully with timeout protection
4. **Creates global namespace** `window.customjs.*` for all functionality
5. **Auto-initializes modules** - each module registers itself automatically

## Global Namespace

All functionality is available through the `window.customjs.*` namespace:

```javascript
// Access modules
window.customjs.config; // Configuration manager
window.customjs.utils; // Utility functions
window.customjs.api; // API helpers
window.customjs.logger; // Logging functions
window.customjs.location; // Location management
window.customjs.contextMenu; // Context menu instance
window.customjs.registryOverrides; // Registry overrides instance
window.customjs.tagManager; // Tag manager instance
window.customjs.autoInviteManager; // Auto invite manager instance
window.customjs.bioUpdater; // Bio updater instance
window.customjs.instanceMonitor; // Instance monitor instance
window.customjs.notificationHandler; // Notification handler instance
window.customjs.debugTools; // Debug tools instance
window.customjs.debug; // Debug functions
window.customjs.clearProcessedMenus; // Utility function

// Access script metadata
window.customjs.script.config; // Config module metadata
window.customjs.script.utils; // Utils module metadata
// ... etc for each module
```

## User Configuration

User-configurable settings are now in the main `custom.js` file under `USER_CONFIG`:

```javascript
const USER_CONFIG = {
  author: "Bluscream",
  date: "2025-04-02 23:17:32 GMT+1",
  url: "https://gist.github.com/Bluscream/...",
  steam: {
    id: "76561198022446661",
    key: "6D46DA3A460BC5B096E95A4142A487CB",
  },
  bio: {
    updateInterval: 7200000, // 2 hours
    initialDelay: 20000, // 20 seconds
    template: `...`, // Bio template
  },
  registry: {
    VRC_ALLOW_UNTRUSTED_URL: {
      value: 0,
      events: [
        "VRCX_START",
        "GAME_START",
        "INSTANCE_SWITCH_PUBLIC",
        "INSTANCE_SWITCH_PRIVATE",
      ],
    },
    // ... more registry settings
  },
  tags: {
    urls: [
      "https://github.com/Bluscream/FewTags/raw/refs/heads/main/usertags.json",
    ],
    updateInterval: 3600000,
    initialDelay: 5000,
  },
};
```

## Module Metadata

Each module includes metadata in a `SCRIPT` constant:

```javascript
const SCRIPT = {
  name: "Module Name",
  description: "Module description",
  author: "Bluscream",
  version: "1.0.0",
};
```

## Self-Initialization

Each module automatically:

1. **Registers itself** in `window.customjs.*`
2. **Stores metadata** in `window.customjs.script.*`
3. **Maintains backward compatibility** by also registering globally
4. **Logs loading status** with module name, version, and author

## Configuration

### Module Loading Configuration

```javascript
const MODULE_CONFIG = {
  modules: [
    "customjs/config.js",
    "customjs/utils.js",
    "customjs/api-helpers.js",
    "customjs/context-menu.js",
    "customjs/registry-overrides.js",
    "customjs/tag-manager.js",
    "customjs/bio-updater.js",
    "customjs/auto-invite.js",
    "customjs/managers.js",
  ],
  externalModules: [
    // Add external module URLs here
  ],
  loadTimeout: 10000,
};
```

### Adding External Modules

To load modules from external URLs, add them to the `externalModules` array:

```javascript
externalModules: [
  "https://example.com/my-custom-module.js",
  "https://raw.githubusercontent.com/user/repo/main/module.js",
];
```

## Benefits of New Structure

1. **User Configuration** - All user settings in one place (main custom.js)
2. **Self-Initializing** - Modules automatically register themselves
3. **Global Namespace** - Organized access via `window.customjs.*`
4. **Script Metadata** - Each module has name, description, author, version
5. **Backward Compatibility** - Old global variables still work
6. **Error Isolation** - Failed modules don't break the entire system
7. **External Loading** - Support for loading modules from URLs
8. **Development** - Easier to work on individual features

## Usage

The new system maintains full backward compatibility while providing organized access:

```javascript
// New namespace access
window.customjs.tagManager.addTag("usr_123", "Friend", "#00FF00");
window.customjs.registryOverrides.triggerEvent("GAME_START");

// Old global access still works
customTagManager.addTag("usr_123", "Friend", "#00FF00");
registryOverrides.triggerEvent("GAME_START");

// Access module metadata
console.log(window.customjs.script.tagManager.name); // "Tag Manager Module"
console.log(window.customjs.script.tagManager.version); // "1.0.0"
```

## Development

When adding new features:

1. **Create a new module file** in the `customjs/` directory
2. **Add SCRIPT metadata** with name, description, author, version
3. **Add it to the modules array** in `custom.js`
4. **Make the module self-initializing** with auto-registration
5. **Register in window.customjs.\*** namespace
6. **Update this README** with documentation

## Backup

The original monolithic `custom.js` file has been backed up as `custom.js.backup` in the AppData directory.
