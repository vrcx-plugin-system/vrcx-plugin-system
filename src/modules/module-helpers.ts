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
      // Check config to determine if module should be enabled
      const config = getModuleConfig();
      const shouldBeEnabled = config[moduleUrl] !== undefined ? config[moduleUrl] : true;
      
      module.enabled = shouldBeEnabled;
      
      await module.load();
      
      if (module.enabled) {
        await module.start();
      }
      
      // Save to config
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

  console.log(`%c[CJS|ModuleSystem] Fetching ${enabledModules.length} module(s) in parallel...`, `color: ${logColor}`);

  // Fetch all module code in parallel for faster loading
  const fetchResults = await Promise.allSettled(
    enabledModules.map(moduleUrl => CustomModule.loadFromUrl(moduleUrl))
  );

  const loadedCount = fetchResults.filter(r => r.status === 'fulfilled' && r.value).length;
  const failedCount = fetchResults.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value)).length;

  console.log(`%c[CJS|ModuleSystem] Module code fetched. Loaded: ${loadedCount}, Failed: ${failedCount}`, `color: ${logColor}`);

  // Call load() on all modules in parallel
  console.log(`%c[CJS|ModuleSystem] Initializing ${window.customjs.modules.length} module(s) in parallel...`, `color: ${logColor}`);
  
  await Promise.all(window.customjs.modules.map(async (module) => {
    try {
      if (module.metadata.url && moduleConfig[module.metadata.url] !== undefined) {
        module.enabled = moduleConfig[module.metadata.url];
      }
      
      await module.load();
      console.log(`%c[CJS|ModuleSystem]   ✓ Initialized ${module.metadata.name}`, `color: ${logColor}`);
    } catch (error) {
      console.error(`%c[CJS|ModuleSystem]   ✗ Error initializing ${module.metadata.name}:`, `color: ${logColor}`, error);
    }
  }));

  // Call start() on enabled modules
  await startAllModules();

  // Save config
  saveModuleConfig(moduleConfig);

  console.log(`%c[CJS|ModuleSystem] ✓ Module system ready! Loaded ${loadedCount} modules`, `color: ${logColor}`);
}

/**
 * Start all enabled modules (with dependency resolution)
 */
export async function startAllModules(): Promise<void> {
  const logColor = '#4caf50';
  
  console.log(`%c[CJS|ModuleSystem] Starting enabled modules...`, `color: ${logColor}`);

  // Build dependency graph
  const modulesWithDeps = window.customjs.modules.filter(m => m.enabled && !m.started);
  const noDeps = modulesWithDeps.filter(m => !(m as any).dependencies || (m as any).dependencies.length === 0);
  const withDeps = modulesWithDeps.filter(m => (m as any).dependencies && (m as any).dependencies.length > 0);
  
  // Start modules without dependencies in parallel
  if (noDeps.length > 0) {
    console.log(`%c[CJS|ModuleSystem] Starting ${noDeps.length} modules without dependencies in parallel...`, `color: ${logColor}`);
    await Promise.all(noDeps.map(async (module) => {
      try {
        await module.start();
        console.log(`%c[CJS|ModuleSystem] ✓ Started ${module.metadata.name}`, `color: ${logColor}`);
      } catch (error) {
        console.error(`%c[CJS|ModuleSystem] ✗ Error starting ${module.metadata.name}:`, `color: ${logColor}`, error);
      }
    }));
  }
  
  // Start modules with dependencies sequentially (they need to wait for deps)
  for (const module of withDeps) {
    try {
      if ((module as any).dependencies && (module as any).dependencies.length > 0) {
        console.log(`%c[CJS|ModuleSystem] Waiting for ${(module as any).dependencies.length} dependencies for ${module.metadata.name}...`, `color: ${logColor}`);
        
        for (const depId of (module as any).dependencies) {
          try {
            await waitForModule(depId, 10000);
            console.log(`%c[CJS|ModuleSystem]   ✓ Dependency ready: ${depId}`, `color: ${logColor}`);
          } catch (error) {
            console.error(`%c[CJS|ModuleSystem]   ✗ Dependency failed: ${depId}`, `color: ${logColor}`, error);
            throw new Error(`Dependency ${depId} not available for ${module.metadata.name}`);
          }
        }
      }
      
      await module.start();
      console.log(`%c[CJS|ModuleSystem] ✓ Started ${module.metadata.name}`, `color: ${logColor}`);
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
