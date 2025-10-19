import { SettingDefinition, PluginConfig, ModuleMetadata } from '../types';

export const configMetadata: ModuleMetadata = {
  id: "config",
  name: "Configuration Manager",
  description: "Settings and configuration management system",
  authors: [
    {
      name: "Bluscream",
      description: "Core Maintainer",
    }
  ],
  tags: ["Core", "Configuration"],
};

// Setting type enum
export const SettingType = Object.freeze({
  STRING: 'string' as const,
  NUMBER: 'number' as const,
  BIGINT: 'bigint' as const,
  BOOLEAN: 'boolean' as const,
  SELECT: 'select' as const,
  SLIDER: 'slider' as const,
  TIMESPAN: 'timespan' as const,
  COMPONENT: 'component' as const,
  CUSTOM: 'custom' as const,
});

/**
 * SettingsStore - Provides proxy-based access to settings with change listeners
 */
export class SettingsStore {
  plain: Record<string, any>;
  private options: any;
  private pathListeners: Map<string, Set<Function>>;
  private globalListeners: Set<Function>;
  private definitions: Record<string, SettingDefinition>;
  store: any;

  constructor(plain: Record<string, any> = {}, options: any = {}) {
    this.plain = plain || {};
    this.options = options;
    this.pathListeners = new Map();
    this.globalListeners = new Set();
    this.definitions = options.definitions || {};

    // Create proxy for reactive access
    this.store = this.makeProxy(this.plain);
  }

  private makeProxy(target: any, path: string = ""): any {
    const self = this;

    return new Proxy(target, {
      get(obj, key: string) {
        const value = obj[key];
        const fullPath = path ? `${path}.${key}` : key;

        // Check for default value
        if (value === undefined && self.options.getDefaultValue) {
          const defaultValue = self.options.getDefaultValue({
            target: obj,
            key,
            path: fullPath,
          });
          if (defaultValue !== undefined) {
            obj[key] = defaultValue;
            return defaultValue;
          }
        }

        // Recursively proxy nested objects
        if (value && typeof value === "object" && !Array.isArray(value)) {
          return self.makeProxy(value, fullPath);
        }

        return value;
      },

      set(obj, key: string, value) {
        const oldValue = obj[key];
        if (oldValue === value) return true;

        const fullPath = path ? `${path}.${key}` : key;
        
        // Validate min/max for number and timespan types
        const definition = self.definitions[fullPath];
        if (definition && (definition.type === 'number' || definition.type === 'timespan')) {
          if (typeof value === 'number') {
            if (definition.min !== undefined && value < definition.min) {
              console.warn(`[SettingsStore] Value ${value} is below minimum ${definition.min} for ${fullPath}, clamping to min`);
              value = definition.min;
            }
            if (definition.max !== undefined && value > definition.max) {
              console.warn(`[SettingsStore] Value ${value} is above maximum ${definition.max} for ${fullPath}, clamping to max`);
              value = definition.max;
            }
          }
        }

        obj[key] = value;

        // Notify listeners
        self.notifyListeners(fullPath, value);

        return true;
      },
    });
  }

  private notifyListeners(path: string, value: any): void {
    // Notify global listeners
    this.globalListeners.forEach((callback) => {
      try {
        callback(this.plain, path);
      } catch (error) {
        console.error("[SettingsStore] Error in global listener:", error);
      }
    });

    // Notify path-specific listeners
    const listeners = this.pathListeners.get(path);
    if (listeners) {
      listeners.forEach((callback) => {
        try {
          callback(value);
        } catch (error) {
          console.error(`[SettingsStore] Error in listener for ${path}:`, error);
        }
      });
    }
  }

  addChangeListener(path: string, callback: Function): void {
    if (!this.pathListeners.has(path)) {
      this.pathListeners.set(path, new Set());
    }
    this.pathListeners.get(path)!.add(callback);
  }

  removeChangeListener(path: string, callback: Function): void {
    const listeners = this.pathListeners.get(path);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.pathListeners.delete(path);
      }
    }
  }

  addGlobalChangeListener(callback: Function): void {
    this.globalListeners.add(callback);
  }

  removeGlobalChangeListener(callback: Function): void {
    this.globalListeners.delete(callback);
  }

  markAsChanged(): void {
    this.globalListeners.forEach((cb) => cb(this.plain, ""));
  }
}

/**
 * definePluginSettings - Create a settings object with metadata and reactive access
 */
export function definePluginSettings(definition: Record<string, SettingDefinition>, plugin: any): any {
  if (!plugin) {
    throw new Error("definePluginSettings requires a plugin instance");
  }

  const pluginId = plugin.metadata?.id || "unknown";

  // Get default values from definition
  const getDefaultValue = ({ key }: { key: string }): any => {
    const setting = definition[key];
    if (!setting) return undefined;

    // Check for explicit default
    if ("default" in setting) {
      return setting.default;
    }

    // Check for SELECT type with default option
    if (setting.type === SettingType.SELECT && setting.options) {
      const defaultOption = setting.options.find((opt) => opt.default);
      return defaultOption?.value;
    }

    return undefined;
  };

  // Load existing settings from localStorage
  const loadSettings = (): Record<string, any> => {
    const settings: Record<string, any> = {};
    for (const key in definition) {
      const defaultValue = getDefaultValue({ key });
      const storedValue = plugin.get(key, defaultValue);
      settings[key] = storedValue;
    }
    return settings;
  };

  const plainSettings = loadSettings();

  // Create settings store with change listener that saves to localStorage
  const settingsStore = new SettingsStore(plainSettings, {
    getDefaultValue,
    definitions: definition
  });

  // Auto-save to localStorage on any change
  settingsStore.addGlobalChangeListener((data: Record<string, any>, path: string) => {
    // Extract the setting key from the path
    const key = path.split(".")[0];
    if (key && definition[key]) {
      plugin.set(key, data[key]);
    }
  });

  const definedSettings = {
    // Reactive store access
    get store() {
      return settingsStore.store;
    },

    // Non-reactive plain access
    get plain() {
      return settingsStore.plain;
    },

    // Definition metadata
    def: definition,

    // Plugin reference
    pluginName: pluginId,

    // Add change listener
    onChange(key: string, callback: Function) {
      settingsStore.addChangeListener(key, callback);
    },

    // Remove change listener
    offChange(key: string, callback: Function) {
      settingsStore.removeChangeListener(key, callback);
    },

    // Reset a setting to default
    reset(key: string) {
      const defaultValue = getDefaultValue({ key });
      if (defaultValue !== undefined) {
        settingsStore.store[key] = defaultValue;
      }
    },

    // Reset all settings to defaults
    resetAll() {
      for (const key in definition) {
        this.reset(key);
      }
    },

    // Get visible settings (exclude hidden ones)
    getVisibleSettings() {
      const visible: Record<string, SettingDefinition> = {};
      for (const key in definition) {
        if (!definition[key].hidden) {
          visible[key] = definition[key];
        }
      }
      return visible;
    },

    // Get hidden settings
    getHiddenSettings() {
      const hidden: Record<string, SettingDefinition> = {};
      for (const key in definition) {
        if (definition[key].hidden) {
          hidden[key] = definition[key];
        }
      }
      return hidden;
    },

    // Get settings grouped by category
    getSettingsByCategory() {
      const categories: Record<string, Record<string, SettingDefinition>> = {};
      for (const key in definition) {
        const category = definition[key].category || "general";
        if (!categories[category]) {
          categories[category] = {};
        }
        categories[category][key] = definition[key];
      }
      return categories;
    },

    // Get settings for a specific category
    getCategorySettings(categoryKey: string) {
      const categorySettings: Record<string, SettingDefinition> = {};
      for (const key in definition) {
        if (definition[key].category === categoryKey) {
          categorySettings[key] = definition[key];
        }
      }
      return categorySettings;
    },
  };

  return definedSettings;
}

/**
 * ConfigManager - Manages plugin configuration storage
 */
export class ConfigManager {
  keyPrefix: string = "customjs";
  vrchatConfigPath: string = "%APPDATA%\\..\\LocalLow\\VRChat\\VRChat\\config.json";

  constructor() {
    console.log(
      `[CJS|ConfigManager] ConfigManager initialized - Equicord-inspired settings system`
    );
  }

  async init(): Promise<void> {
    console.log("[CJS|ConfigManager] ✓ Initialized (localStorage ready)");
  }

  private buildKey(key: string): string {
    return `${this.keyPrefix}.${key}`;
  }

  get(key: string, defaultValue: any = null): any {
    try {
      const fullKey = this.buildKey(key);
      const stored = localStorage.getItem(fullKey);

      if (stored === null) {
        return defaultValue;
      }

      // Try to parse as JSON
      try {
        return JSON.parse(stored);
      } catch {
        // If not JSON, return as string
        return stored;
      }
    } catch (error) {
      console.error(`[CJS|ConfigManager] Error getting ${key}:`, error);
      return defaultValue;
    }
  }

  set(key: string, value: any): boolean {
    try {
      const fullKey = this.buildKey(key);
      const jsonValue = JSON.stringify(value);
      localStorage.setItem(fullKey, jsonValue);
      return true;
    } catch (error) {
      console.error(`[CJS|ConfigManager] Error setting ${key}:`, error);
      return false;
    }
  }

  delete(key: string): boolean {
    try {
      const fullKey = this.buildKey(key);
      localStorage.removeItem(fullKey);
      return true;
    } catch (error) {
      console.error(`[CJS|ConfigManager] Error deleting ${key}:`, error);
      return false;
    }
  }

  has(key: string): boolean {
    const fullKey = this.buildKey(key);
    return localStorage.getItem(fullKey) !== null;
  }

  clear(prefix: string = ""): void {
    const searchKey = prefix ? this.buildKey(prefix) : this.keyPrefix;
    const keysToDelete: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(searchKey)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach((key) => localStorage.removeItem(key));
    console.log(`[CJS|ConfigManager] Cleared ${keysToDelete.length} keys with prefix: ${searchKey}`);
  }

  keys(prefix: string = ""): string[] {
    const searchKey = prefix ? this.buildKey(prefix) : this.keyPrefix;
    const keys: string[] = [];

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(searchKey + ".")) {
        keys.push(key.substring(searchKey.length + 1));
      }
    }

    return keys;
  }

  getPluginConfig(pluginId: string | null = null): any {
    // If no plugin ID, return loader config (url -> enabled)
    if (!pluginId) {
      return this.get("plugins", {});
    }

    // Get all keys for this plugin and build nested object
    const prefix = `${pluginId}.`;
    const result: Record<string, any> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${this.keyPrefix}.${prefix}`)) {
        const settingPath = key.substring(`${this.keyPrefix}.${prefix}`.length);

        let value: any;
        try {
          value = JSON.parse(localStorage.getItem(key)!);
        } catch {
          value = localStorage.getItem(key);
        }

        // Build nested object structure
        const parts = settingPath.split(".");
        let current: any = result;

        for (let j = 0; j < parts.length - 1; j++) {
          const part = parts[j];
          if (!current[part]) {
            current[part] = {};
          }
          current = current[part];
        }

        current[parts[parts.length - 1]] = value;
      }
    }

    return result;
  }

  setPluginConfig(config: PluginConfig): void {
    this.set("plugins", config);
  }

  export(): string {
    const data: Record<string, any> = {};

    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.keyPrefix + ".")) {
        const shortKey = key.substring(this.keyPrefix.length + 1);
        try {
          data[shortKey] = JSON.parse(localStorage.getItem(key)!);
        } catch {
          data[shortKey] = localStorage.getItem(key);
        }
      }
    }

    return JSON.stringify(data, null, 2);
  }

  import(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);

      Object.entries(data).forEach(([key, value]) => {
        this.set(key, value);
      });

      console.log(`[CJS|ConfigManager] Imported ${Object.keys(data).length} settings`);
      return true;
    } catch (error) {
      console.error("[CJS|ConfigManager] Error importing settings:", error);
      return false;
    }
  }

  async exportToVRChatConfig(): Promise<{success: boolean; settingsCount: number; filePath: string | null}> {
    try {
      console.log("[CJS|ConfigManager] Exporting to VRChat config.json...");

      const customjsData: Record<string, any> = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(this.keyPrefix + ".")) {
          const shortKey = key.substring(this.keyPrefix.length + 1);
          customjsData[shortKey] = this.get(shortKey);
        }
      }

      const vrcxCustomjs = {
        loader: {
          plugins: customjsData.plugins || {},
          loadTimeout: customjsData.loadTimeout || 10000,
        },
        settings: {} as Record<string, any>,
      };

      // Organize plugin settings
      Object.keys(customjsData).forEach((key) => {
        if (key === "plugins" || key === "loadTimeout") {
          return;
        }

        const parts = key.split(".");
        if (parts.length >= 2) {
          const pluginId = parts[0];
          const settingPath = parts.slice(1).join(".");

          if (!vrcxCustomjs.settings[pluginId]) {
            vrcxCustomjs.settings[pluginId] = {};
          }

          const settingParts = settingPath.split(".");
          let current: any = vrcxCustomjs.settings[pluginId];

          for (let i = 0; i < settingParts.length - 1; i++) {
            const part = settingParts[i];
            if (!current[part]) {
              current[part] = {};
            }
            current = current[part];
          }

          current[settingParts[settingParts.length - 1]] = customjsData[key];
        }
      });

      const currentConfigJson = await window.AppApi!.ReadConfigFileSafe();
      const currentConfig = currentConfigJson ? JSON.parse(currentConfigJson) : {};

      if (!currentConfig.vrcx) {
        currentConfig.vrcx = {};
      }
      currentConfig.vrcx.customjs = vrcxCustomjs;

      await window.AppApi!.WriteConfigFile(JSON.stringify(currentConfig, null, 2));

      console.log(
        `[CJS|ConfigManager] ✓ Exported ${Object.keys(customjsData).length} settings to VRChat config.json`
      );
      return {
        success: true,
        settingsCount: Object.keys(customjsData).length,
        filePath: this.vrchatConfigPath,
      };
    } catch (error) {
      console.error("[CJS|ConfigManager] Error exporting to VRChat config:", error);
      return { success: false, settingsCount: 0, filePath: null };
    }
  }

  async importFromVRChatConfig(): Promise<{success: boolean; importCount: number}> {
    try {
      console.log("[CJS|ConfigManager] Importing from VRChat config.json...");

      const configJson = await window.AppApi!.ReadConfigFileSafe();
      if (!configJson) {
        console.warn("[CJS|ConfigManager] VRChat config.json is empty");
        return { success: false, importCount: 0 };
      }

      const config = JSON.parse(configJson);
      const vrcxCustomjs = config?.vrcx?.customjs;

      if (!vrcxCustomjs) {
        console.warn("[CJS|ConfigManager] No vrcx.customjs section in VRChat config");
        return { success: true, importCount: 0 };
      }

      let importCount = 0;

      // Import loader settings
      if (vrcxCustomjs.loader) {
        if (vrcxCustomjs.loader.plugins) {
          this.set("plugins", vrcxCustomjs.loader.plugins);
          importCount++;
        }
        if (vrcxCustomjs.loader.loadTimeout) {
          this.set("loadTimeout", vrcxCustomjs.loader.loadTimeout);
          importCount++;
        }
      }

      // Import plugin settings
      if (vrcxCustomjs.settings) {
        const flattenSettings = (obj: Record<string, any>, prefix: string = ""): void => {
          for (const [key, value] of Object.entries(obj)) {
            const fullKey = prefix ? `${prefix}.${key}` : key;

            if (value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length > 0) {
              const allPrimitives = Object.values(value).every(
                (v) => v === null || typeof v !== "object" || Array.isArray(v)
              );

              if (allPrimitives) {
                this.set(fullKey, value);
                importCount++;
              } else {
                flattenSettings(value, fullKey);
              }
            } else {
              this.set(fullKey, value);
              importCount++;
            }
          }
        };

        flattenSettings(vrcxCustomjs.settings);
      }

      console.log(`[CJS|ConfigManager] ✓ Imported ${importCount} settings from VRChat config.json`);
      return { success: true, importCount: importCount };
    } catch (error) {
      console.error("[CJS|ConfigManager] Error importing from VRChat config:", error);
      return { success: false, importCount: 0 };
    }
  }
}
