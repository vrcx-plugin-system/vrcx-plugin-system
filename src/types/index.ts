/**
 * Type definitions for VRCX Plugin System
 */

/**
 * Author information for modules and plugins
 */
export interface ModuleAuthor {
  name: string;
  description?: string;
  userId?: string;
  avatarUrl?: string;
}

/**
 * Metadata for both core modules and custom modules
 */
export interface ModuleMetadata {
  id: string;
  name: string;
  description: string;
  authors: ModuleAuthor[];
  build?: string;
  url?: string | null;
  tags?: string[];
  required_dependencies?: string[];
  optional_dependencies?: string[];
}

export interface ResourceTracking {
  timers: Set<number>;
  observers: Set<MutationObserver | IntersectionObserver | ResizeObserver>;
  listeners: Map<EventTarget, Array<{event: string; handler: EventListener; options?: AddEventListenerOptions}>>;
  subscriptions: Set<() => void>;
  hooks: Set<{type: string; functionPath: string; callback: Function}>;
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

export type SettingTypeValue = 'string' | 'number' | 'bigint' | 'boolean' | 'select' | 'slider' | 'timespan' | 'component' | 'custom';

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
  min?: number;
  max?: number;
}

export interface PluginConfig {
  [url: string]: boolean;
}

/**
 * Module metadata for repository system
 */
export interface PluginRepoMetadata {
  id: string;
  name: string;
  description: string;
  authors: ModuleAuthor[];
  build: string;
  url: string;
  enabled?: boolean;
  tags?: string[];
  repository?: any;
}

export interface PluginRepoData {
  name: string;
  description: string;
  authors: ModuleAuthor[];
  build: string;
  url: string;
  modules: PluginRepoMetadata[];
}

export interface RepoConfig {
  [repoUrl: string]: boolean;
}

// Import global type augmentations
import './customjs';
import './vrcx';
import './pinia';
