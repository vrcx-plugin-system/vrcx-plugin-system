/**
 * VRCX Plugin System v3.0
 * TypeScript-based plugin management system for VRCX
 * 
 * This file is bundled into a single custom.js for VRCX
 */

import { Logger } from './modules/logger';
import { utils } from './modules/utils';
import { ConfigManager, SettingsStore, SettingType, definePluginSettings } from './modules/config';
import { Plugin, PluginLoader, PluginManager } from './modules/plugin';

// Show dev tools
if (window.AppApi?.ShowDevTools) {
  window.AppApi.ShowDevTools();
}

// Initialize window.customjs
window.customjs = {
  version: "3.0.0",
  build: Math.floor(Date.now() / 1000).toString(),
  logColors: {
    CustomJS: "#00ff88",
    PluginLoader: "#2196f3",
    PluginManager: "#4caf50",
    Plugin: "#888888",
    Config: "#ff9800",
    Utils: "#9c27b0",
  },
  plugins: [],
  subscriptions: new Map(),
  hooks: {
    pre: {},
    post: {},
    void: {},
    replace: {},
  },
  functions: {},
  events: {},
};

console.log(
  `%c[CJS] Starting Plugin System v${window.customjs.version} (Build: ${window.customjs.build})`,
  `color: ${window.customjs.logColors.CustomJS}`
);
console.log(
  `%c[CJS] Cache buster: ${Date.now()}`,
  `color: ${window.customjs.logColors.CustomJS}`
);

// Export all core classes to global scope
window.customjs.Logger = Logger;
window.customjs.utils = utils;
window.customjs.ConfigManager = ConfigManager;
window.customjs.SettingsStore = SettingsStore;
window.customjs.SettingType = SettingType;
window.customjs.definePluginSettings = definePluginSettings;
window.customjs.Plugin = Plugin;
window.customjs.PluginLoader = PluginLoader;
window.customjs.PluginManager = PluginManager;

// Also export Plugin class and other commonly used classes directly to global scope for plugins to extend
(window as any).Plugin = Plugin;
(window as any).Logger = Logger;
(window as any).SettingType = SettingType;

// Initialize ConfigManager
const configManager = new ConfigManager();
window.customjs.configManager = configManager;

// Initialize ConfigManager
async function initializeConfigManager() {
  console.log(
    `%c[CJS] %cInitializing ConfigManager...`,
    "font-weight: bold; color: #00ff88",
    "color: #888"
  );
  await configManager.init();
  console.log(
    `%c[CJS] %c✓ ConfigManager initialized`,
    "font-weight: bold; color: #00ff88",
    "color: #888"
  );
}

// Bootstrap function: Initialize core modules, then start plugin system
async function bootstrapPluginSystem() {
  try {
    // Step 1: Initialize ConfigManager
    await initializeConfigManager();

    console.log(
      `%c[CJS] %cCore modules loaded, initializing plugin system...`,
      "font-weight: bold; color: #00ff88",
      "color: #888"
    );

    // Step 2: Instantiate PluginManager and load plugins
    const manager = new PluginManager();
    await manager.loadAllPlugins();

    console.log(
      `%c[CJS] %c✓ Plugin system fully initialized`,
      "font-weight: bold; color: #00ff88",
      "color: #888"
    );
  } catch (error) {
    console.error("[CJS] Bootstrap failed:", error);
    alert(
      `CustomJS: Failed to initialize plugin system.\n\n${(error as Error).message}\n\nCheck console for details.`
    );
  }
}

// Wait for DOM ready, then bootstrap
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapPluginSystem);
} else {
  bootstrapPluginSystem();
}
