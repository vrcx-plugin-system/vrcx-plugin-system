/**
 * VRCX Plugin System v3.0
 * TypeScript-based plugin management system for VRCX
 * 
 * This file is bundled into a single custom.js for VRCX
 */

import { Logger, loggerMetadata } from './modules/logger';
import { utils, utilsMetadata } from './modules/utils';
import { ConfigManager, SettingsStore, SettingType, definePluginSettings, configMetadata } from './modules/config';
import { Plugin, PluginLoader, PluginManager, pluginModuleMetadata } from './modules/plugin';
import { PluginRepo, PluginRepoManager, repoMetadata } from './modules/repo';

// Show dev tools
// if (window.AppApi?.ShowDevTools) {
//   window.AppApi.ShowDevTools();
// }

// Initialize window.customjs
window.customjs = {
  build: "1760846413",
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
  coreModules: new Map(),
};

// Register core module metadata
window.customjs.coreModules!.set('logger', loggerMetadata);
window.customjs.coreModules!.set('utils', utilsMetadata);
window.customjs.coreModules!.set('config', configMetadata);
window.customjs.coreModules!.set('plugin', pluginModuleMetadata);
window.customjs.coreModules!.set('repo', repoMetadata);

// Create system logger
window.customjs.systemLogger = new Logger("");
window.customjs.systemLogger.log(`Starting Plugin System (Build: ${window.customjs.build})!`);
window.customjs.systemLogger.log(`Cache buster: ${Date.now()}`);

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
window.customjs.PluginRepo = PluginRepo;
window.customjs.PluginRepoManager = PluginRepoManager;

// Note: We don't export to global window scope - plugins get these via destructuring in the loader

// Initialize ConfigManager
window.customjs.configManager = new ConfigManager();

// Initialize ConfigManager
async function initializeConfigManager() {
  window.customjs.systemLogger.log("Initializing ConfigManager...");
  await window.customjs.configManager.init();
  window.customjs.systemLogger.log("✓ ConfigManager initialized");
}

// Expose Element Plus notification functions globally
async function exposeElementPlus() {
  return new Promise<void>((resolve) => {
    let attempts = 0;
    const maxAttempts = 50;
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      // Check if Vue app is loaded with global properties
      if ((window as any).$app?.config?.globalProperties) {
        const globalProps = (window as any).$app.config.globalProperties;
        
        // Expose $message and $notify directly to window for easier access
        if (globalProps.$message || globalProps.$notify) {
          if (globalProps.$message) {
            (window as any).ElMessage = globalProps.$message;
          }
          if (globalProps.$notify) {
            (window as any).ElNotification = globalProps.$notify;
          }
          clearInterval(checkInterval);
          window.customjs.systemLogger.log("✓ Element Plus notifications exposed globally");
          resolve();
          return;
        }
      }
      
      // Timeout after max attempts - proceed anyway
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        window.customjs.systemLogger.logWarn("Element Plus not detected yet, will use Vue global properties fallback");
        resolve();
      }
    }, 100);
  });
}

// Bootstrap function: Initialize core modules, then start plugin system
async function bootstrapPluginSystem() {
  try {
    // Step 1: Initialize ConfigManager
    await initializeConfigManager();

    window.customjs.systemLogger.log("Core modules loaded, initializing plugin system...");

    // Step 2: Wait for Element Plus to be available
    await exposeElementPlus();

    // Step 3: Instantiate PluginManager and load plugins
    window.customjs.pluginManager = new PluginManager();
    await window.customjs.pluginManager.loadAllPlugins();

    window.customjs.systemLogger.log("✓ Plugin system fully initialized");
    window.customjs.systemLogger.showSuccess("VRCX Plugin System loaded successfully");
  } catch (error) {
    window.customjs.systemLogger.logError("Bootstrap failed:", error);
    window.customjs.systemLogger.showError(`Failed to initialize plugin system: ${(error as Error).message}`);
  }
}

// Wait for DOM ready, then bootstrap
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapPluginSystem);
} else {
  bootstrapPluginSystem();
}
