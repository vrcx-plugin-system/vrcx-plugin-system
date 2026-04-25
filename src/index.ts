/**
 * VRCX Module System v3.1
 * TypeScript-based module management system for VRCX
 * 
 * This file is bundled into a single custom.js for VRCX
 */

import { Logger, loggerMetadata } from './modules/logger';
import { utils, utilsMetadata } from './modules/utils';
import { ConfigManager, SettingsStore, SettingType, definePluginSettings, configMetadata } from './modules/config';
import { Module, CoreModule, moduleMetadata } from './modules/module';
import { CustomModule, CustomActionButton, customModuleMetadata } from './modules/custom-module';
import { getModule, loadModule, unloadModule, reloadModule, waitForModule, getAllLoadedModules, loadAllModules, startAllModules, stopAllModules, triggerModuleLogin } from './modules/module-helpers';
import { ModuleRepository, repositoryMetadata, loadRepositories, addRepository, removeRepository, getRepository, getAllRepositories, getEnabledRepositories, getAllModules, findModuleByUrl, findModuleById } from './modules/repository';
import { EventRegistry, eventSystemMetadata } from './modules/events';

import { NavigationAPI } from './api/navigation';
import { DialogsAPI } from './api/dialogs';
import { ContextMenuAPI } from './api/contextMenu';

// Initialize window.customjs
window.customjs = {
  sourceUrl: 'https://github.com/vrcx-plugin-system/vrcx-plugin-system/raw/refs/heads/main/src/index.ts',
  build: 1777152995, // AUTO-GENERATED BUILD TIMESTAMP
  modules: [],
  repos: [],
  subscriptions: new Map(),
  hooks: {
    pre: {},
    post: {},
    void: {},
    replace: {},
  },
  functions: {},
  eventRegistry: new EventRegistry(),
  coreModules: new Map(),
  hasTriggeredLogin: false,
  classes: {} as any,
  types: {} as any,
  api: {} as any,
};

// Register core module metadata
window.customjs.coreModules.set('logger', loggerMetadata);
window.customjs.coreModules.set('utils', utilsMetadata);
window.customjs.coreModules.set('config', configMetadata);
window.customjs.coreModules.set('module', moduleMetadata);
window.customjs.coreModules.set('custom-module', customModuleMetadata);
window.customjs.coreModules.set('repository', repositoryMetadata);
window.customjs.coreModules.set('event-system', eventSystemMetadata);

// Create system logger
window.customjs.systemLogger = new Logger("");
window.customjs.systemLogger.log(`Starting Module System v3.1!`);
window.customjs.systemLogger.log(`Cache buster: ${Date.now()}`);

// Export all core classes to global scope under classes namespace
window.customjs.classes = {
  Logger,
  ConfigManager,
  SettingsStore,
  Module,
  CoreModule,
  CustomModule,
  CustomActionButton,
  ModuleRepository,
  EventRegistry,
};

// Export utilities and helpers
window.customjs.utils = utils;
window.customjs.definePluginSettings = definePluginSettings;

// Export types
window.customjs.types = {
  SettingType,
};

// Export helper functions
window.customjs.getModule = getModule;
window.customjs.waitForModule = waitForModule;
window.customjs.loadModule = loadModule;
window.customjs.unloadModule = unloadModule;
window.customjs.reloadModule = reloadModule;
window.customjs.getRepo = getRepository;
window.customjs.addRepository = addRepository;
window.customjs.removeRepository = removeRepository;

// Emergency panic function - completely disables and removes the entire system
window.customjs.panic = async () => {
  try {
    console.warn("%c[CJS] 🚨 PANIC MODE ACTIVATED - Shutting down all modules...", "color: #ff0000; font-weight: bold; font-size: 14px");
    
    // 1. Stop all modules
    const modules = [...window.customjs.modules];
    for (const module of modules) {
      try {
        await module.stop();
        console.log(`%c[CJS|Panic] ✓ Stopped: ${module.metadata.name}`, "color: #ff9800");
      } catch (error) {
        console.error(`[CJS|Panic] Failed to stop ${module.metadata.name}:`, error);
      }
    }
    
    // 2. Unload all modules
    for (const module of modules) {
      try {
        await module.unload();
        console.log(`%c[CJS|Panic] ✓ Unloaded: ${module.metadata.name}`, "color: #ff9800");
      } catch (error) {
        console.error(`[CJS|Panic] Failed to unload ${module.metadata.name}:`, error);
      }
    }
    
    // 3. Clear all event listeners
    if (window.customjs.eventRegistry) {
      (window.customjs.eventRegistry as any).events?.clear();
      (window.customjs.eventRegistry as any).wildcardListeners?.clear();
      console.log("%c[CJS|Panic] ✓ Cleared all event listeners", "color: #ff9800");
    }
    
    // 4. Clear all hooks
    window.customjs.hooks.pre = {};
    window.customjs.hooks.post = {};
    window.customjs.hooks.void = {};
    window.customjs.hooks.replace = {};
    console.log("%c[CJS|Panic] ✓ Cleared all hooks", "color: #ff9800");
    
    // 5. Clear all subscriptions
    window.customjs.subscriptions.clear();
    console.log("%c[CJS|Panic] ✓ Cleared all subscriptions", "color: #ff9800");
    
    // 6. Clear modules and repos
    window.customjs.modules = [];
    window.customjs.coreModules.clear();
    window.customjs.repos = [];
    console.log("%c[CJS|Panic] ✓ Cleared modules and repositories", "color: #ff9800");
    
    // 7. Clear functions
    window.customjs.functions = {};
    console.log("%c[CJS|Panic] ✓ Cleared all registered functions", "color: #ff9800");
    
    console.warn("%c[CJS] 🚨 PANIC COMPLETE - System disabled. Reload page to restart.", "color: #ff0000; font-weight: bold; font-size: 14px");
    
    // Show notification
    if (window.AppApi?.DesktopNotification) {
      window.AppApi.DesktopNotification("🚨 VRCX Plugin System", "Emergency shutdown complete. Reload to restart.");
    }
    
    return {
      success: true,
      message: "System completely disabled. Reload page to restart.",
      modulesUnloaded: modules.length
    };
  } catch (error) {
    console.error("%c[CJS] 🚨 PANIC FAILED:", "color: #ff0000; font-weight: bold", error);
    return {
      success: false,
      message: `Panic failed: ${error instanceof Error ? error.message : String(error)}`,
      modulesUnloaded: 0
    };
  }
};

// Initialize ConfigManager
window.customjs.configManager = new ConfigManager();

// Initialize ConfigManager
async function initializeConfigManager() {
  window.customjs.systemLogger.log("Initializing ConfigManager...");
  await window.customjs.configManager.init();
  window.customjs.systemLogger.log("✓ ConfigManager initialized");
}

// Expose notification bridge for plugins
// VRCX no longer uses Element Plus — uses vue-sonner toast + shadcn dialogs instead.
// Since vue-sonner's toast() is a module import and not accessible from injected scripts,
// we expose a simple bridge that plugins can use for notifications.
async function exposeNotifications() {
  return new Promise<void>((resolve) => {
    let attempts = 0;
    const maxAttempts = 50;
    
    const checkInterval = setInterval(() => {
      attempts++;
      
      if (window.$pinia) {
        clearInterval(checkInterval);
        
        // Create notification bridge on customjs
        window.customjs.notify = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
          // Use VRCX desktop notification as the primary toast replacement
          if ((window as any).AppApi?.DesktopNotification) {
            const prefix = type === 'error' ? '❌' : type === 'warning' ? '⚠️' : type === 'success' ? '✅' : 'ℹ️';
            (window as any).AppApi.DesktopNotification(`${prefix} VRCX Plugin`, message).catch(() => {});
          }
          
          // Always log to console as well
          const logMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'info';
          console[logMethod](`%c[CJS|Notify] ${message}`, 'color: #9c27b0');
        };

        window.customjs.systemLogger.log("✓ Notification bridge exposed");
        resolve();
        return;
      }
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        window.customjs.systemLogger.logWarn("Pinia not detected, notifications will use console fallback only");
        
        // Provide console-only fallback
        window.customjs.notify = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info') => {
          const logMethod = type === 'error' ? 'error' : type === 'warning' ? 'warn' : 'info';
          console[logMethod](`%c[CJS|Notify] ${message}`, 'color: #9c27b0');
        };
        
        resolve();
      }
    }, 100);
  });
}

// Start login monitoring
function startLoginMonitoring(): void {
  const setupWatch = () => {
    if (window.$pinia?.user?.$subscribe) {
      window.$pinia.user.$subscribe(() => {
        const currentUser = (window.$pinia!.user as any).currentUser;
        if (currentUser && currentUser.id && !window.customjs.hasTriggeredLogin) {
          window.customjs.hasTriggeredLogin = true;
          triggerModuleLogin(currentUser);
        }
      });
      console.log("%c[CJS] Login monitoring active", "color: #888888");
      return;
    }
    setTimeout(setupWatch, 500);
  };
  setupWatch();
}

// Bootstrap function: Initialize core modules, then start module system
async function bootstrapModuleSystem() {
  try {
    // Step 1: Initialize ConfigManager
    await initializeConfigManager();

    window.customjs.systemLogger.log("Core modules loaded, initializing module system...");

    // Step 2: Wait for Pinia and expose notification bridge
    await exposeNotifications();

    // Step 3: Initialize APIs
    window.customjs.systemLogger.log("Initializing APIs...");
    window.customjs.api = {
      navigation: new NavigationAPI(),
      dialogs: new DialogsAPI(),
      contextMenu: new ContextMenuAPI()
    };
    await window.customjs.api.navigation.init();
    await window.customjs.api.dialogs.init();
    await window.customjs.api.contextMenu.init();

    // Step 4: Initialize repository system and load repositories
    window.customjs.systemLogger.log("Loading repositories...");
    await loadRepositories();
    
    const enabledRepos = getEnabledRepositories();
    const allModules = getAllModules();
    window.customjs.systemLogger.log(`✓ Loaded ${enabledRepos.length} repositories with ${allModules.length} modules`);

    // Step 4: Load all enabled modules
    await loadAllModules();

    // Step 5: Start login monitoring
    startLoginMonitoring();

    window.customjs.systemLogger.log("✓ Module system fully initialized");
    window.customjs.systemLogger.showSuccess("VRCX Module System loaded successfully");
  } catch (error) {
    window.customjs.systemLogger.logError("Bootstrap failed:", error);
    window.customjs.systemLogger.showError(`Failed to initialize module system: ${(error as Error).message}`);
  }
}

// Wait for DOM ready, then bootstrap
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", bootstrapModuleSystem);
} else {
  bootstrapModuleSystem();
}
