# VRCX Custom Modules

This directory contains the modular JavaScript files for VRCX custom functionality. The main `custom.js` file now acts as a module loader that dynamically loads these individual modules from GitHub. All modules are self-initializing and register themselves in the global `window.customjs.*` namespace.

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

1. **Loads modules from GitHub** using the raw file URLs
2. **Handles loading errors** gracefully with timeout protection
3. **Creates global namespace** `window.customjs.*` for all functionality
4. **Auto-initializes modules** - each module registers itself automatically
5. **Loads in dependency order** - base modules first, then dependent modules

### GitHub Module URLs

All modules are loaded from the GitHub repository:

```javascript
const MODULE_CONFIG = {
  modules: [
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/config.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/api-helpers.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/context-menu.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/registry-overrides.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/tag-manager.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/bio-updater.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/auto-invite.js",
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/managers.js",
  ],
  loadTimeout: 10000,
};
```

## Module Dependencies

Each module includes a `dependencies` array in its SCRIPT metadata that specifies which other modules it depends on:

```javascript
const SCRIPT = {
  name: "API Helpers Module",
  description:
    "API wrapper functions, logging, and location management for VRCX custom modules",
  author: "Bluscream",
  version: "1.0.0",
  dependencies: [
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js",
  ],
};
```

### Dependency Chain

- **Base modules** (no dependencies): `config.js`, `utils.js`, `context-menu.js`
- **Level 1 dependencies**: `api-helpers.js` (depends on `utils.js`), `registry-overrides.js` (depends on `config.js`)
- **Level 2 dependencies**: `managers.js` (depends on `api-helpers.js`, `utils.js`)
- **Level 3 dependencies**: `auto-invite.js` (depends on `api-helpers.js`, `context-menu.js`, `utils.js`), `bio-updater.js` (depends on `config.js`, `api-helpers.js`, `utils.js`), `tag-manager.js` (depends on `config.js`, `api-helpers.js`, `utils.js`)

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

User-configurable settings are in the main `custom.js` file under `USER_CONFIG`:

```javascript
const USER_CONFIG = {
  url: "https://gist.github.com/Bluscream/7842ad23efb6cbb73f6a1bb17008deed",
  steam: {
    id: "", // TODO: Remove
    key: "",
  },
  bio: {
    updateInterval: 7200000, // 2 hours
    initialDelay: 20000, // 20 seconds
    template: `
-
Relationship: {partners} <3
Auto Accept: {autojoin}
Auto Invite: {autoinvite}

Real Rank: {rank}
Friends: {friends} | Blocked: {blocked} | Muted: {muted}
Time played: {playtime}
Date joined: {date_joined}
Last updated: {now} (every 2h)
Tags loaded: {tags_loaded}

User ID: {userId}
Steam ID: {steamId}
Oculus ID: {oculusId}`,
  },
  registry: {
    // Registry settings to apply/override
    VRC_ALLOW_UNTRUSTED_URL: {
      value: 0,
      events: [
        "VRCX_START",
        "GAME_START",
        "INSTANCE_SWITCH_PUBLIC",
        "INSTANCE_SWITCH_PRIVATE",
      ],
    },
    VRC_ALLOW_INSECURE_CONTENT: {
      value: "yes",
      events: ["VRCX_START", "GAME_START"],
    },
  },
  tags: {
    urls: [
      "https://github.com/Bluscream/FewTags/raw/refs/heads/main/usertags.json",
    ],
    updateInterval: 3600000, // 1 hour
    initialDelay: 5000, // 5 seconds
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
  dependencies: [
    "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/dependency.js",
  ],
};
```

## Self-Initialization

Each module automatically:

1. **Registers itself** in `window.customjs.*`
2. **Stores metadata** in `window.customjs.script.*`
3. **Maintains backward compatibility** by also registering globally
4. **Logs loading status** with module name, version, and author

## Benefits of GitHub-Based Loading

1. **Centralized Updates** - All modules are loaded from the GitHub repository
2. **No Local Dependencies** - Users don't need to maintain local copies of JS modules
3. **Version Consistency** - Everyone gets the same version from the main branch
4. **Easier Maintenance** - Updates can be pushed to GitHub and are immediately available
5. **Dependency Management** - Each module declares its dependencies with full URLs
6. **Self-Initializing** - Modules automatically register themselves
7. **Global Namespace** - Organized access via `window.customjs.*`
8. **Script Metadata** - Each module has name, description, author, version, dependencies
9. **Backward Compatibility** - Old global variables still work
10. **Error Isolation** - Failed modules don't break the entire system

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
console.log(window.customjs.script.tagManager.dependencies); // Array of dependency URLs
```

## Development

When adding new features:

1. **Create a new module file** in the `js/` directory
2. **Add SCRIPT metadata** with name, description, author, version, and dependencies
3. **Add it to the modules array** in `custom.js` in the correct dependency order
4. **Make the module self-initializing** with auto-registration
5. **Register in window.customjs.\* namespace**
6. **Update this README** with documentation
7. **Commit and push to GitHub** - changes are immediately available to all users

## Installation

To use this system:

1. **Copy `custom.js`** to your VRCX AppData directory
2. **Configure USER_CONFIG** in `custom.js` with your settings
3. **Restart VRCX** - modules will be automatically loaded from GitHub
4. **Check console** for loading status and any errors

## Troubleshooting

- **Check console logs** for module loading status
- **Verify internet connection** - modules are loaded from GitHub
- **Check GitHub repository** - ensure the repository is accessible
- **Verify module URLs** - ensure the GitHub URLs are correct
- **Check dependencies** - ensure all required modules are loaded in the correct order

## Backup

The original monolithic `custom.js` file has been backed up as `custom.js.backup` in the AppData directory.
