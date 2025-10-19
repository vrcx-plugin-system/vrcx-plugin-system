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

// Initialize window.customjs
window.customjs = {
  sourceUrl: 'https://github.com/vrcx-plugin-system/vrcx-plugin-system/raw/refs/heads/main/src/index.ts',
  build: 1760888619, // AUTO-GENERATED BUILD TIMESTAMP
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
  events: {},
  coreModules: new Map(),
  classes: {} as any,
  types: {} as any,
};

// Register core module metadata
window.customjs.coreModules!.set('logger', loggerMetadata);
window.customjs.coreModules!.set('utils', utilsMetadata);
window.customjs.coreModules!.set('config', configMetadata);
window.customjs.coreModules!.set('module', moduleMetadata);
window.customjs.coreModules!.set('custom-module', customModuleMetadata);
window.customjs.coreModules!.set('repository', repositoryMetadata);

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
      
      if ((window as any).$app?.config?.globalProperties) {
        const globalProps = (window as any).$app.config.globalProperties;
        
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
      
      if (attempts >= maxAttempts) {
        clearInterval(checkInterval);
        window.customjs.systemLogger.logWarn("Element Plus not detected yet, will use Vue global properties fallback");
        resolve();
      }
    }, 100);
  });
}

// Start login monitoring
let hasTriggeredLogin = false;

function startLoginMonitoring(): void {
  const setupWatch = () => {
    if (window.$pinia?.user?.$subscribe) {
      window.$pinia.user.$subscribe(() => {
        const currentUser = (window.$pinia!.user as any).currentUser;
        if (currentUser && currentUser.id && !hasTriggeredLogin) {
          hasTriggeredLogin = true;
          triggerModuleLogin(currentUser);
        }
      });
    } else {
      setTimeout(setupWatch, 500);
    }
  };

  setTimeout(setupWatch, 100);
}

// Bootstrap function: Initialize core modules, then start module system
async function bootstrapModuleSystem() {
  try {
    // Step 1: Initialize ConfigManager
    await initializeConfigManager();

    window.customjs.systemLogger.log("Core modules loaded, initializing module system...");

    // Step 2: Wait for Element Plus to be available
    await exposeElementPlus();

    // Step 3: Initialize repository system and load repositories
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
