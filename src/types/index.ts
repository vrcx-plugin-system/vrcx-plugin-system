// Type definitions for VRCX Plugin System

export interface PluginMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  build: string;
  url: string | null;
  tags?: string[];
}

export interface ResourceTracking {
  timers: Set<number>;
  observers: Set<MutationObserver | IntersectionObserver | ResizeObserver>;
  listeners: Map<EventTarget, Array<{event: string; handler: EventListener; options?: AddEventListenerOptions}>>;
  subscriptions: Set<() => void>;
  hooks?: Set<{type: string; functionPath: string; callback: Function}>;
}

export interface LogOptions {
  console?: boolean;
  vrcx?: {
    notify?: boolean;
    noty?: boolean;
    message?: boolean;
  };
  event?: {
    noty?: boolean;
    external?: boolean;
  };
  desktop?: boolean;
  xsoverlay?: boolean;
  ovrtoolkit?: boolean;
  webhook?: boolean;
}

export type SettingTypeValue = 'string' | 'number' | 'bigint' | 'boolean' | 'select' | 'slider' | 'component' | 'custom';

export interface SettingDefinition {
  type: SettingTypeValue;
  description: string;
  default?: any;
  category?: string;
  placeholder?: string;
  markers?: number[];
  options?: Array<{label: string; value: any; default?: boolean}>;
  hidden?: boolean;
  variables?: Record<string, string>;
}

export interface PluginConfig {
  [url: string]: boolean;
}

export interface PluginRepoMetadata {
  id: string;
  name: string;
  description: string;
  author: string;
  build: string;
  url: string;
  enabled?: boolean;
  tags?: string[];
}

export interface PluginRepoData {
  name: string;
  description: string;
  author: string;
  build: string;
  url: string;
  plugins: PluginRepoMetadata[];
}

export interface RepoConfig {
  [repoUrl: string]: boolean;
}

// Global window type augmentation
declare global {
  interface Window {
    customjs: {
      build: string;
      logColors: {
        CustomJS: string;
        PluginLoader: string;
        PluginManager: string;
        Plugin: string;
        Config: string;
        Utils: string;
      };
      plugins: any[];
      subscriptions: Map<string, Set<() => void>>;
      hooks: {
        pre: Record<string, Array<{plugin: any; callback: Function}>>;
        post: Record<string, Array<{plugin: any; callback: Function}>>;
        void: Record<string, Array<{plugin: any; callback: Function}>>;
        replace: Record<string, Array<{plugin: any; callback: Function}>>;
      };
      functions: Record<string, Function>;
      events: Record<string, Array<Function>>;
      coreModules?: Map<string, any>;
      Logger?: any;
      systemLogger?: any;
      configManager?: any;
      ConfigManager?: any;
      SettingType?: any;
      SettingsStore?: any;
      definePluginSettings?: Function;
      pluginManager?: any;
      PluginManager?: any;
      Plugin?: any;
      PluginLoader?: any;
      repoManager?: any;
      PluginRepoManager?: any;
      PluginRepo?: any;
      utils?: Record<string, any>;
      __currentPluginUrl?: string;
      __LAST_PLUGIN_CLASS__?: any;
    };
    AppApi?: {
      ShowDevTools(): void;
      SendIpc(event: string, data: any): void;
      DesktopNotification(title: string, message: string): Promise<void>;
      XSNotification(title: string, message: string, duration: number, volume: number, icon: string): Promise<void>;
      OVRTNotification(flag1: boolean, flag2: boolean, title: string, message: string, duration: number, volume: number, icon: string | null): Promise<void>;
      ReadConfigFileSafe(): Promise<string>;
      WriteConfigFile(content: string): Promise<void>;
    };
    $pinia?: {
      location?: any;
      user?: any;
      game?: any;
      gameLog?: any;
      friends?: any;
      ui?: any;
    };
    $app?: any;
    request?: any;
  }
}
