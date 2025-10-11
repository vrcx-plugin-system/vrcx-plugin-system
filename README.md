# VRCX Custom Modules

A comprehensive modular JavaScript system for VRCX that provides enhanced functionality through dynamically loaded modules. The system features automatic module loading from GitHub, self-initializing components, and a clean global namespace architecture.

## 🚀 Features

- **Modular Architecture**: Clean separation of concerns with individual feature modules
- **GitHub-Based Loading**: Modules are automatically loaded from the GitHub repository
- **Self-Initializing**: All modules register themselves automatically
- **Base64 Support**: Automatic decoding of base64-encoded Steam credentials
- **Custom Tags**: Load and manage user tags from external JSON sources
- **Bio Automation**: Automatic bio updates with dynamic content
- **Registry Management**: VRChat registry settings with event-based triggers
- **Context Menus**: Enhanced context menu functionality
- **Auto-Invite System**: Automatic user invitation management
- **Instance Monitoring**: Real-time instance and player monitoring
- **Debug Tools**: Comprehensive debugging and logging utilities

## 📁 Project Structure

```
vrcx-custom/
├── custom.js              # Main module loader and configuration
├── custom.css             # Custom styling
├── update.ps1             # PowerShell update script
├── js/                    # Modular JavaScript files
│   ├── config.js          # Configuration management
│   ├── utils.js           # Utility functions and helpers
│   ├── api-helpers.js     # API wrappers and logging
│   ├── context-menu-api.js # Context menu API enhancements
│   ├── nav-menu-api.js    # Navigation menu API
│   ├── protocol-links.js  # VRCX protocol link utilities
│   ├── plugin-manager-ui.js # Plugin manager UI
│   ├── registry-overrides.js # VRChat registry management
│   ├── tag-manager.js     # Custom user tags system
│   ├── bio-updater.js     # Automatic bio updates
│   ├── auto-invite.js     # Auto-invite functionality
│   ├── managers.js        # Core management classes
│   └── debug.js           # Debug plugin (disabled by default)
└── README.md              # This file
```

## 🛠️ Core Modules

### Configuration & Utilities

- **`config.js`** - Centralized configuration management
- **`utils.js`** - Utility functions, time formatting, Steam API integration with base64 support
- **`api-helpers.js`** - API wrappers, logging, and location management

### Feature Modules

- **`context-menu-api.js`** - Enhanced context menu system with custom items for user/avatar/world/group dialogs
- **`nav-menu-api.js`** - API for adding custom navigation menu items
- **`protocol-links.js`** - VRCX protocol link generation and clipboard utilities
- **`plugin-manager-ui.js`** - Visual UI for managing plugins (adds "Plugins" nav menu item)
- **`registry-overrides.js`** - VRChat registry settings with event-based application
- **`tag-manager.js`** - Custom user tags loaded from external JSON sources
- **`bio-updater.js`** - Automatic bio updates with dynamic content templates
- **`auto-invite.js`** - Automatic user invitation system with location tracking
- **`managers.js`** - Instance monitoring, notifications, and debug tools
- **`debug.js`** - Comprehensive debug plugin with mutation observers and event logging (disabled by default)

## ⚙️ Configuration

All configuration is centralized in the `USER_CONFIG` object in `custom.js`:

```javascript
const USER_CONFIG = {
  steam: {
    id: "{env:STEAM_ID64}", // Steam ID (supports base64 encoding)
    key: "{env:STEAM_API_KEY}", // Steam API key (supports base64 encoding)
  },
  bio: {
    updateInterval: 7200000, // 2 hours
    initialDelay: 20000, // 20 seconds
    template: `...`, // Bio template with placeholders
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

### Environment Variables

The system supports environment variable substitution:

- `{env:STEAM_ID64}` - Your Steam ID64
- `{env:STEAM_API_KEY}` - Your Steam Web API key

### Base64 Encoding

Steam credentials can be base64 encoded for additional security:

```javascript
steam: {
    id: "MTIzNDU2Nzg5MA==",      // Base64 encoded Steam ID
    key: "YWJjZGVmZ2hpams="      // Base64 encoded API key
}
```

## 🏷️ Custom Tags System

The tag manager supports multiple JSON formats and automatically loads tags from external sources:

### Supported Formats

**FewTags Format:**

```json
{
  "usr_c4f62fc6-24ce-4806-8c8e-fd1857f79b66": {
    "id": -231,
    "active": true,
    "malicious": false,
    "tags": ["FewTags Owner", "Custom Tag 1"],
    "tag": "FewTags Owner",
    "foreground_color": "#ff0000",
    "sources": ["ExternalTags.json"]
  }
}
```

**Direct Array Format:**

```json
[
  {
    "UserId": "usr_12345678-1234-1234-1234-123456789012",
    "Tag": "Friend",
    "TagColour": "#00FF00"
  }
]
```

## 📝 Bio Template System

The bio updater supports dynamic placeholders:

```javascript
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
Oculus ID: {oculusId}`;
```

## 🔧 Registry Management

Registry settings can be applied based on specific events:

```javascript
registry: {
    "VRC_ALLOW_UNTRUSTED_URL": {
        value: 0,
        events: ["VRCX_START", "GAME_START", "INSTANCE_SWITCH_PUBLIC"]
    },
    "VRC_SIMPLE_SETTING": 42,  // Applied on all events
    "VRC_STRING_SETTING": "value"
}
```

## 🌐 Global Namespace

### Plugin Management (`window.plugins.*`)

```javascript
// Dynamic plugin management
plugins.loadPlugin(url); // Load a plugin from URL
plugins.unloadPlugin(url); // Unload a plugin
plugins.reloadPlugin(url); // Reload a specific plugin
plugins.reloadAllPlugins(); // Reload all plugins
plugins.startPlugin(name); // Start/restart a plugin
plugins.stopPlugin(name); // Stop a plugin
plugins.list(); // List all plugins
plugins.getPlugins(); // Get detailed plugin info

// Convenience aliases
plugins.reload(url); // Alias for reloadPlugin
plugins.reloadAll(); // Alias for reloadAllPlugins
```

### Module Instances (`window.customjs.*`)

```javascript
// Core modules
window.customjs.config; // Configuration manager
window.customjs.utils; // Utility functions
window.customjs.api; // API helpers
window.customjs.logger; // Logging functions
window.customjs.location; // Location management

// Feature modules
window.customjs.contextMenu; // Context menu API instance
window.customjs.navMenu; // Navigation menu API instance
window.customjs.protocolLinks; // Protocol links instance
window.customjs.pluginManagerUI; // Plugin manager UI instance
window.customjs.registryOverrides; // Registry overrides instance
window.customjs.tagManager; // Tag manager instance
window.customjs.bioUpdater; // Bio updater instance
window.customjs.autoInviteManager; // Auto invite manager instance

// Management classes
window.customjs.instanceMonitor; // Instance monitor instance
window.customjs.notificationHandler; // Notification handler instance
window.customjs.debugTools; // Debug tools instance
window.customjs.debug; // Debug plugin (when enabled)

// Lifecycle
window.customjs.lifecycle; // Lifecycle manager
window.on_startup(callback); // Register startup hook
window.on_login(callback); // Register login hook

// Utility functions
window.customjs.clearProcessedMenus; // Clear processed menus registry
```

## 📦 Installation

1. **Copy `custom.js`** to your VRCX AppData directory
2. **Configure `USER_CONFIG`** with your settings
3. **Set environment variables** (optional):
   ```powershell
   $env:STEAM_ID64 = "your_steam_id"
   $env:STEAM_API_KEY = "your_api_key"
   ```
4. **Restart VRCX** - modules will be automatically loaded from GitHub
5. **Check console** for loading status and any errors

## 🔄 Updates

The system includes an automated update mechanism:

```powershell
# Run the update script
.\update.ps1
```

The update script will:

- Backup your current configuration
- Download the latest modules from GitHub
- Preserve your custom settings
- Restart VRCX automatically

## 🐛 Debugging

### Debug Plugin

Enable comprehensive debugging by uncommenting the debug module in `custom.js`:

```javascript
// Uncomment below to enable comprehensive debug logging:
"https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/debug.js",
```

When enabled, the debug plugin will automatically log:

- ✓ All dialog additions/removals (user, avatar, world, group)
- ✓ All dropdown menu visibility changes
- ✓ Button clicks on dialogs and links
- ✓ Pinia store state changes (dialog visibility, location)
- ✓ All logs are saved to `%APPDATA%\VRCX\logs\VRCX*.log`

### Plugin Management Commands

```javascript
// Load a plugin dynamically
await plugins.loadPlugin("https://example.com/my-plugin.js");

// Unload a plugin (marks as unloaded, refresh VRCX for full removal)
plugins.unloadPlugin("https://example.com/my-plugin.js");

// Reload a specific plugin
await plugins.reloadPlugin("https://example.com/my-plugin.js");
// or use the alias
await plugins.reload("https://example.com/my-plugin.js");

// Reload all plugins at once
await plugins.reloadAllPlugins();
// or use the alias
await plugins.reloadAll();

// Start a plugin (calls on_startup hook)
plugins.startPlugin("debug");

// Stop a plugin (calls cleanup method)
plugins.stopPlugin("debug");

// List all plugins
plugins.list();
// or
plugins.getPlugins();
```

### Debug Commands

```javascript
// Inspect current VRCX state
window.logVRCXState();

// Find elements in DOM
window.debugFindElements(".x-dialog");
window.debugFindElements("button[aria-haspopup='menu']");

// Watch specific element for changes
window.debugWatchElement(".x-avatar-dialog");

// Stop all debug observers
window.debugPlugin.cleanup();

// Clear processed menus
window.customjs.clearProcessedMenus();
```

### Console Logs

Check the browser console or log files for detailed information:

```
[Debug:Init] Initialized 2 mutation observers
[Debug:Init] Registered 9 event listeners
[Debug:Dialog] User dialog added to DOM | {"id":"el-id-123-456"}
[Debug:Dropdown] Dropdown menu shown (avatar) | {"menuId":"el-id-789-012"}
[Debug:Pinia] avatarDialog.visible changed: false → true
```

### Common Issues

- **"No tag URLs configured"** - Check your `tags.urls` configuration
- **Steam API errors** - Verify your Steam ID and API key
- **Module loading failures** - Check internet connection and GitHub access

## 🔒 Security Features

- **Base64 Encoding**: Steam credentials can be base64 encoded
- **Environment Variables**: Sensitive data can be stored in environment variables
- **Error Isolation**: Failed modules don't break the entire system
- **Timeout Protection**: Module loading has built-in timeout protection

## 🚀 Performance

- **Lazy Loading**: Modules are loaded only when needed
- **Caching**: Built-in cache busting for fresh module updates
- **Error Recovery**: Graceful handling of network and loading errors
- **Memory Management**: Proper cleanup and resource management

## 📚 API Reference

### Utils Module

```javascript
// Clipboard operations (v1.1.0+)
await Utils.copyToClipboard(text, "Description"); // Returns true/false, works even when unfocused
// Handles both modern API and fallback for unfocused documents

// Notifications (v1.1.0+)
Utils.showSuccess("Success message"); // Green notification
Utils.showError("Error message"); // Red notification
Utils.showInfo("Info message"); // Blue notification

// Time formatting
Utils.timeToText(ms); // Convert milliseconds to readable text
Utils.getTimestamp(); // Get formatted timestamp
Utils.formatDateTime(); // Get formatted date/time

// Steam integration
Utils.getSteamPlaytime(steamId, apiKey); // Get VRChat playtime from Steam
Utils.tryDecodeBase64(str); // Decode base64 strings

// Utility functions
Utils.isEmpty(v); // Check if value is empty
Utils.clearProcessedMenus(); // Clear processed menus registry
```

### Navigation Menu API

The Nav Menu API now **automatically manages tab content** - just provide a `content` parameter!

```javascript
// Add nav item with automatic tab content management
window.customjs.navMenu.addItem("myPlugin", {
  label: "My Plugin",
  icon: "ri-plugin-line",
  content: () => {
    const container = document.createElement("div");
    container.innerHTML =
      "<h1>My Plugin Content</h1><p>This content automatically shows/hides!</p>";
    return container;
  },
  before: "settings", // Optional: insert before settings
  after: "tools", // Optional: insert after tools
});

// Or use HTML string directly
window.customjs.navMenu.addItem("myPlugin", {
  label: "My Plugin",
  icon: "ri-plugin-line",
  content: "<h1>My Plugin</h1><p>Tab content here!</p>",
  before: "settings",
});

// Or use an existing HTMLElement
const myContent = document.createElement("div");
myContent.innerHTML = "<h1>Hello!</h1>";
window.customjs.navMenu.addItem("myPlugin", {
  label: "My Plugin",
  icon: "ri-plugin-line",
  content: myContent,
});

// Add nav item without content (just onClick)
window.customjs.navMenu.addItem("myAction", {
  label: "Do Something",
  icon: "ri-play-line",
  onClick: () => console.log("Action triggered!"),
});

// Remove a nav menu item (removes both button and content)
window.customjs.navMenu.removeItem("myPlugin");

// Update an existing item
window.customjs.navMenu.updateItem("myPlugin", {
  label: "New Label",
  icon: "ri-star-line",
});

// Check if item exists
window.customjs.navMenu.hasItem("myPlugin");

// Get all custom items
window.customjs.navMenu.getAllItems();

// Clear all custom items
window.customjs.navMenu.clearAllItems();
```

**How it works:**

- Nav Menu API automatically creates content containers
- Watches `menuActiveIndex` and shows/hides content
- Integrates seamlessly with VRCX's tab system
- No manual visibility management needed!

### Plugin Manager UI

The Plugin Manager UI adds a "Plugins" menu item to the navigation bar. Click it to:

- View all loaded and failed plugins
- Reload individual plugins
- Reload all plugins at once
- Unload plugins
- Retry failed plugins
- See active module instances

### Tag Manager

```javascript
// Manual tag management
window.customjs.tagManager.addTag(userId, tag, color);
window.customjs.tagManager.refreshTags();
window.customjs.tagManager.getLoadedTagsCount();
window.customjs.tagManager.getUserTags(userId);
```

### Registry Overrides

```javascript
// Trigger registry updates
window.customjs.registryOverrides.triggerEvent("GAME_START");
window.customjs.registryOverrides.triggerEvent("INSTANCE_SWITCH_PUBLIC");
```

## 🤝 Contributing

When adding new features:

1. **Create a new module file** in the `js/` directory
2. **Add SCRIPT metadata** with name, description, author, version, and dependencies
3. **Add it to the modules array** in `custom.js` in the correct dependency order
4. **Make the module self-initializing** with auto-registration
5. **Register in `window.customjs.*` namespace**
6. **Update this README** with documentation
7. **Test thoroughly** before committing
8. **Commit and push to GitHub** - changes are immediately available to all users

## 📄 License

This project is part of the VRCX ecosystem. Please refer to the main VRCX repository for licensing information.

## 🆘 Support

For issues and support:

1. Check the console logs for error messages
2. Verify your configuration settings
3. Ensure all environment variables are set correctly
4. Check the GitHub repository for updates
5. Review this README for configuration examples

---

**Version**: 2.0  
**Author**: Bluscream  
**Last Updated**: 2024
