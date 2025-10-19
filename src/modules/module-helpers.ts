/**
 * Helper functions for module management
 */

import { CustomModule } from './custom-module';
import { PluginConfig } from '../types';
import { getAllModules } from './repository';

/**
 * Get a module by ID or URL
 */
export function getModule(idOrUrl: string): CustomModule | undefined {
  if (!window.customjs.modules) {
    return undefined;
  }
  
  return window.customjs.modules.find((m: CustomModule) => 
    m.metadata.id === idOrUrl || m.metadata.url === idOrUrl
  );
}

/**
 * Get all modules
 */
export function getAllLoadedModules(): CustomModule[] {
  return window.customjs.modules || [];
}

/**
 * Wait for a module to be loaded
 */
export async function waitForModule(moduleId: string, timeout: number = 10000): Promise<CustomModule> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const module = getModule(moduleId);
    if (module && module.loaded) {
      return module;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  throw new Error(`Timeout waiting for module: ${moduleId}`);
}

/**
 * Load a module from URL
 */
export async function loadModule(moduleUrl: string): Promise<{success: boolean; message?: string; module?: CustomModule}> {
  try {
    const existing = getModule(moduleUrl);
    if (existing) {
      return { success: false, message: "Module already loaded", module: existing };
    }

    const module = await CustomModule.loadFromUrl(moduleUrl);

    if (module) {
      await module.load();
      if (module.enabled) {
        await module.start();
      }
      
      // Save to config
      const config = getModuleConfig();
      config[moduleUrl] = module.enabled;
      saveModuleConfig(config);
      
      return { success: true, module };
    }

    return { success: false, message: "Failed to load module code" };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Unload a module
 */
export async function unloadModule(idOrUrl: string): Promise<{success: boolean; message?: string}> {
  try {
    const module = getModule(idOrUrl);
    
    if (!module) {
      return { success: false, message: "Module not found" };
    }

    await module.unload();

    // Update config
    if (module.metadata.url) {
      const config = getModuleConfig();
      delete config[module.metadata.url];
      saveModuleConfig(config);
    }

    return { success: true };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Reload a module
 */
export async function reloadModule(idOrUrl: string): Promise<{success: boolean; message?: string; module?: CustomModule}> {
  try {
    const module = getModule(idOrUrl);
    if (!module) {
      return { success: false, message: "Module not found" };
    }

    const reloadedModule = await module.reload();
    if (reloadedModule) {
      await reloadedModule.load();
      if (reloadedModule.enabled) {
        await reloadedModule.start();
      }
      return { success: true, module: reloadedModule };
    }

    return { success: false, message: "Failed to reload module" };
  } catch (error) {
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Get module configuration
 */
export function getModuleConfig(): PluginConfig {
  const config: PluginConfig = {};

  // Get defaults from repositories
  const allModules = getAllModules();
  allModules.forEach((module) => {
    config[module.url] = module.enabled ?? true;
  });

  // Load from ConfigManager (overrides defaults)
  if (window.customjs?.configManager) {
    const loadedConfig = window.customjs.configManager.getPluginConfig();
    if (loadedConfig && typeof loadedConfig === "object") {
      Object.assign(config, loadedConfig);
    }
  }

  return config;
}

/**
 * Save module configuration
 */
export function saveModuleConfig(config: PluginConfig): void {
  if (window.customjs?.configManager) {
    window.customjs.configManager.setPluginConfig(config);
  }
}

/**
 * Load all enabled modules from repositories
 */
export async function loadAllModules(): Promise<void> {
  const logColor = '#4caf50';
  
  console.log(`%c[CJS|ModuleSystem] Loading all enabled modules...`, `color: ${logColor}`);
  
  const moduleConfig = getModuleConfig();
  const enabledModules = Object.entries(moduleConfig)
    .filter(([url, enabled]) => enabled)
    .map(([url]) => url);

  console.log(`%c[CJS|ModuleSystem] Loading ${enabledModules.length} modules from config...`, `color: ${logColor}`);

  let loadedCount = 0;
  let failedCount = 0;

  for (const moduleUrl of enabledModules) {
    const module = await CustomModule.loadFromUrl(moduleUrl);
    if (module) {
      loadedCount++;
    } else {
      failedCount++;
    }
  }

  console.log(`%c[CJS|ModuleSystem] Module code loading complete. Loaded: ${loadedCount}, Failed: ${failedCount}`, `color: ${logColor}`);

  // Call load() on all modules
  console.log(`%c[CJS|ModuleSystem] Calling load() on ${window.customjs.modules.length} modules...`, `color: ${logColor}`);
  
  for (const module of window.customjs.modules) {
    try {
      if (module.metadata.url && moduleConfig[module.metadata.url] !== undefined) {
        module.enabled = moduleConfig[module.metadata.url];
      }
      
      await module.load();
    } catch (error) {
      console.error(`%c[CJS|ModuleSystem] ✗ Error loading ${module.metadata.name}:`, `color: ${logColor}`, error);
    }
  }

  // Call start() on enabled modules
  await startAllModules();

  // Save config
  saveModuleConfig(moduleConfig);

  console.log(`%c[CJS|ModuleSystem] ✓ Module system ready! Loaded ${loadedCount} modules`, `color: ${logColor}`);
}

/**
 * Start all enabled modules
 */
export async function startAllModules(): Promise<void> {
  const logColor = '#4caf50';
  
  console.log(`%c[CJS|ModuleSystem] Starting enabled modules...`, `color: ${logColor}`);

  for (const module of window.customjs.modules) {
    try {
      if (module.enabled && !module.started) {
        await module.start();
        console.log(`%c[CJS|ModuleSystem] ✓ Started ${module.metadata.name} (build: ${module.metadata.build})`, `color: ${logColor}`);
      }
    } catch (error) {
      console.error(`%c[CJS|ModuleSystem] ✗ Error starting ${module.metadata.name}:`, `color: ${logColor}`, error);
    }
  }
}

/**
 * Stop all modules
 */
export async function stopAllModules(): Promise<void> {
  for (const module of window.customjs.modules) {
    try {
      await module.stop();
    } catch (error) {
      console.error(`Error stopping ${module.metadata.name}:`, error);
    }
  }
}

/**
 * Trigger onLogin on all modules
 */
export async function triggerModuleLogin(currentUser: any): Promise<void> {
  const logColor = '#4caf50';
  const user = currentUser || window.$pinia?.user?.currentUser;
  
  console.log(`[CJS] ✓ User logged in: ${user?.displayName || "Unknown"}`);

  for (const module of window.customjs.modules) {
    try {
      if (module.enabled && typeof module.onLogin === "function") {
        await module.onLogin(user);
      }
    } catch (error) {
      console.error(`%c[CJS|ModuleSystem] Error in ${module.metadata.name}.onLogin:`, `color: ${logColor}`, error);
    }
  }
}
