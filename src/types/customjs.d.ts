/**
 * Custom.js Plugin System Type Declarations
 */

declare global {
  interface Window {
    customjs: {
      sourceUrl: string;
      build: number;
      modules: any[];
      repos: any[];
      subscriptions: Map<string, Set<() => void>>;
      hooks: {
        pre: Record<string, Array<{plugin: any; callback: Function}>>;
        post: Record<string, Array<{plugin: any; callback: Function}>>;
        void: Record<string, Array<{plugin: any; callback: Function}>>;
        replace: Record<string, Array<{plugin: any; callback: Function}>>;
      };
      functions: Record<string, Function>;
      eventRegistry: any;
      coreModules: Map<string, any>;
      hasTriggeredLogin: boolean;
      classes: {
        Logger: any;
        ConfigManager: any;
        SettingsStore: any;
        Module: any;
        CoreModule: any;
        CustomModule: any;
        CustomActionButton: any;
        ModuleRepository: any;
        EventRegistry: any;
      };
      systemLogger?: any;
      configManager?: any;
      types: {
        SettingType: any;
      };
      definePluginSettings?: Function;
      utils?: Record<string, any>;
      getModule?: (idOrUrl: string) => any;
      waitForModule?: (moduleId: string, timeout?: number) => Promise<any>;
      getRepo?: (url: string) => any;
      loadModule?: (url: string) => Promise<{success: boolean; message?: string; module?: any}>;
      unloadModule?: (idOrUrl: string) => Promise<{success: boolean; message?: string}>;
      reloadModule?: (idOrUrl: string) => Promise<{success: boolean; message?: string}>;
      addRepository?: (url: string, saveConfig?: boolean) => Promise<{success: boolean; message: string; repo?: any}>;
      removeRepository?: (url: string) => boolean;
      panic?: () => Promise<{success: boolean; message: string; modulesUnloaded: number}>;
      __currentPluginUrl?: string;
      __LAST_PLUGIN_CLASS__?: any;
    };
  }
}

export {};
