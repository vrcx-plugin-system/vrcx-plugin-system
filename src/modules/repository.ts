import { PluginRepoData, PluginRepoMetadata, RepoConfig, ModuleMetadata } from '../types';

export const repositoryMetadata: ModuleMetadata = {
  id: "repository",
  name: "Repository System",
  description: "Module repository management and fetching system",
  authors: [
    {
      name: "Bluscream",
      description: "Core Maintainer",
    }
  ],
  tags: ["Core", "Repository"],
};

/**
 * ModuleRepository - Represents a module repository
 */
export class ModuleRepository {
  public url: string;
  public data: PluginRepoData | null = null;
  public loaded: boolean = false;
  public enabled: boolean = true;
  private logColor: string = '#ff9800';

  constructor(url: string) {
    this.url = url;
  }

  /**
   * Fetch and parse the repository data
   */
  async fetch(): Promise<boolean> {
    try {
      this.log(`Fetching repository: ${this.url}`);
      
      const response = await fetch(this.url + '?v=' + Date.now());
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const repoData: PluginRepoData = await response.json();
      
      if (!repoData.name || !repoData.modules || !Array.isArray(repoData.modules)) {
        throw new Error('Invalid repository format');
      }

      this.data = repoData;
      this.loaded = true;
      this.log(`✓ Repository loaded: ${repoData.name} (${repoData.modules.length} modules)`);
      
      return true;
    } catch (error: any) {
      this.error(`Failed to fetch repository: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all modules from this repository
   */
  getModules(): PluginRepoMetadata[] {
    const modules = this.data?.modules || [];
    
    // Add repository reference to each module and use repo authors as fallback
    return modules.map(module => {
      const updatedModule = { ...module };
      
      // Add repository reference
      (updatedModule as any).repository = this;
      
      // Use repo authors as fallback if module has no authors
      if (this.data?.authors && (!module.authors || module.authors.length === 0 || !module.authors[0].name)) {
        updatedModule.authors = this.data.authors;
      }
      
      return updatedModule;
    });
  }

  /**
   * Get modules by tag
   */
  getModulesByTag(tag: string): PluginRepoMetadata[] {
    return this.getModules().filter(m => m.tags?.includes(tag));
  }

  /**
   * Get a specific module by ID
   */
  getModule(id: string): PluginRepoMetadata | null {
    return this.getModules().find(m => m.id === id) || null;
  }

  /**
   * Get a specific module by URL
   */
  getModuleByUrl(url: string): PluginRepoMetadata | null {
    return this.getModules().find(m => m.url === url) || null;
  }

  log(message: string, ...args: any[]): void {
    console.log(`%c[CJS|Repository] ${message}`, `color: ${this.logColor}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`%c[CJS|Repository] ${message}`, `color: ${this.logColor}`, ...args);
  }
}

// Helper functions for repository management (moved from RepoManager)

/**
 * Get repository configuration
 */
export function getRepoConfig(): RepoConfig {
  const config: RepoConfig = {};

  // Default repositories
  const defaultRepos = [
    "https://github.com/vrcx-plugin-system/plugins/raw/refs/heads/main/dist/repo.json"
  ];

  defaultRepos.forEach(url => {
    config[url] = true;
  });

  // Load from ConfigManager if available
  if (window.customjs?.configManager) {
    const loadedConfig = window.customjs.configManager.get('repositories');
    if (loadedConfig && typeof loadedConfig === 'object') {
      Object.assign(config, loadedConfig);
    }
  }

  return config;
}

/**
 * Save repository configuration
 */
export function saveRepoConfig(config: RepoConfig): void {
  if (window.customjs?.configManager) {
    window.customjs.configManager.set('repositories', config);
  }
}

/**
 * Add a repository
 */
export async function addRepository(url: string, saveConfig: boolean = true): Promise<{ success: boolean; message: string; repo?: ModuleRepository }> {
  try {
    if (!window.customjs.repos) {
      window.customjs.repos = [];
    }

    // Check if already exists
    const existing = window.customjs.repos.find(r => r.url === url);
    if (existing) {
      return { success: false, message: 'Repository already exists' };
    }

    const repo = new ModuleRepository(url);
    const success = await repo.fetch();

    if (!success) {
      return { success: false, message: 'Failed to fetch repository' };
    }

    window.customjs.repos.push(repo);
    console.log(`%c[CJS|Repository] Added repository: ${repo.data?.name}`, `color: #4caf50`);

    if (saveConfig) {
      const config = getRepoConfig();
      config[url] = true;
      saveRepoConfig(config);
    }

    return { success: true, message: 'Repository added successfully', repo };
  } catch (error: any) {
    console.error(`%c[CJS|Repository] Error adding repository: ${error.message}`, `color: #4caf50`);
    return { success: false, message: error.message };
  }
}

/**
 * Remove a repository
 */
export function removeRepository(url: string): boolean {
  if (!window.customjs.repos) {
    return false;
  }

  const index = window.customjs.repos.findIndex(r => r.url === url);
  if (index === -1) {
    return false;
  }

  window.customjs.repos.splice(index, 1);
  console.log(`%c[CJS|Repository] Removed repository: ${url}`, `color: #4caf50`);

  const config = getRepoConfig();
  delete config[url];
  saveRepoConfig(config);

  return true;
}

/**
 * Get a repository by URL
 */
export function getRepository(url: string): ModuleRepository | null {
  if (!window.customjs.repos) {
    return null;
  }
  return window.customjs.repos.find(r => r.url === url) || null;
}

/**
 * Get all repositories
 */
export function getAllRepositories(): ModuleRepository[] {
  return window.customjs.repos || [];
}

/**
 * Get all enabled repositories
 */
export function getEnabledRepositories(): ModuleRepository[] {
  return getAllRepositories().filter(r => r.enabled);
}

/**
 * Refresh a repository
 */
export async function refreshRepository(url: string): Promise<boolean> {
  const repo = getRepository(url);
  if (!repo) {
    console.error(`%c[CJS|Repository] Repository not found: ${url}`, `color: #4caf50`);
    return false;
  }
  return await repo.fetch();
}

/**
 * Refresh all repositories
 */
export async function refreshAllRepositories(): Promise<void> {
  console.log('%c[CJS|Repository] Refreshing all repositories...', `color: #4caf50`);
  const promises = getAllRepositories().map(repo => repo.fetch());
  await Promise.all(promises);
  console.log('%c[CJS|Repository] All repositories refreshed', `color: #4caf50`);
}

/**
 * Get all modules from all enabled repositories
 */
export function getAllModules(): PluginRepoMetadata[] {
  const modules: PluginRepoMetadata[] = [];
  for (const repo of getEnabledRepositories()) {
    modules.push(...repo.getModules());
  }
  return modules;
}

/**
 * Find a module by URL across all repositories
 */
export function findModuleByUrl(url: string): { module: PluginRepoMetadata; repo: ModuleRepository } | null {
  for (const repo of getEnabledRepositories()) {
    const module = repo.getModuleByUrl(url);
    if (module) {
      return { module, repo };
    }
  }
  return null;
}

/**
 * Find a module by ID across all repositories
 */
export function findModuleById(id: string): { module: PluginRepoMetadata; repo: ModuleRepository } | null {
  for (const repo of getEnabledRepositories()) {
    const module = repo.getModule(id);
    if (module) {
      return { module, repo };
    }
  }
  return null;
}

/**
 * Load repositories from config
 */
export async function loadRepositories(): Promise<void> {
  console.log('%c[CJS|Repository] Loading repositories...', `color: #4caf50`);
  
  const repoConfig = getRepoConfig();
  const repoUrls = Object.keys(repoConfig);

  console.log(`%c[CJS|Repository] Found ${repoUrls.length} repositories in config`, `color: #4caf50`);

  if (!window.customjs.repos) {
    window.customjs.repos = [];
  }

  for (const url of repoUrls) {
    const result = await addRepository(url, false);
    
    if (result.success && result.repo) {
      result.repo.enabled = repoConfig[url];
    }
  }

  const enabledCount = getEnabledRepositories().length;
  console.log(`%c[CJS|Repository] Loaded ${window.customjs.repos.length} repositories (${enabledCount} enabled)`, `color: #ff9800`);
}
