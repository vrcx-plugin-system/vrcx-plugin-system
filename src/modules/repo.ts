import { PluginRepoData, PluginRepoMetadata, RepoConfig } from '../types';

/**
 * PluginRepo - Represents a plugin repository
 */
export class PluginRepo {
  public url: string;
  public data: PluginRepoData | null = null;
  public loaded: boolean = false;
  public enabled: boolean = true;
  private logColor: string;

  constructor(url: string) {
    this.url = url;
    this.logColor = window.customjs?.logColors?.PluginManager || '#4caf50';
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
      
      // Validate required fields
      if (!repoData.name || !repoData.plugins || !Array.isArray(repoData.plugins)) {
        throw new Error('Invalid repository format');
      }

      this.data = repoData;
      this.loaded = true;
      this.log(`✓ Repository loaded: ${repoData.name} (${repoData.plugins.length} plugins)`);
      
      return true;
    } catch (error: any) {
      this.error(`Failed to fetch repository: ${error.message}`);
      return false;
    }
  }

  /**
   * Get all plugins from this repository
   */
  getPlugins(): PluginRepoMetadata[] {
    return this.data?.plugins || [];
  }

  /**
   * Get plugins by category
   */
  getPluginsByCategory(category: string): PluginRepoMetadata[] {
    return this.getPlugins().filter(p => p.category === category);
  }

  /**
   * Get a specific plugin by ID
   */
  getPlugin(id: string): PluginRepoMetadata | null {
    return this.getPlugins().find(p => p.id === id) || null;
  }

  log(message: string, ...args: any[]): void {
    console.log(`%c[CJS|PluginRepo] ${message}`, `color: ${this.logColor}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`%c[CJS|PluginRepo] ${message}`, `color: ${this.logColor}`, ...args);
  }
}

/**
 * PluginRepoManager - Manages multiple plugin repositories
 */
export class PluginRepoManager {
  private repositories: Map<string, PluginRepo> = new Map();
  private logColor: string;
  
  // Default repositories
  defaultRepos: string[] = [
    "https://github.com/vrcx-plugin-system/plugins/raw/refs/heads/main/repo.json"
  ];

  constructor() {
    this.logColor = window.customjs?.logColors?.PluginManager || '#4caf50';
    
    // Register in global namespace
    window.customjs = window.customjs || {} as any;
    window.customjs.repoManager = this;
    window.customjs.PluginRepoManager = PluginRepoManager;
    window.customjs.PluginRepo = PluginRepo;
  }

  /**
   * Add a repository by URL
   * @param url Repository URL
   * @param saveConfig Whether to save config (default: true)
   */
  async addRepository(url: string, saveConfig: boolean = true): Promise<{ success: boolean; message: string; repo?: PluginRepo }> {
    try {
      if (this.repositories.has(url)) {
        return { success: false, message: 'Repository already exists' };
      }

      const repo = new PluginRepo(url);
      const success = await repo.fetch();

      if (!success) {
        return { success: false, message: 'Failed to fetch repository' };
      }

      this.repositories.set(url, repo);
      this.log(`Added repository: ${repo.data?.name}`);

      // Save config if requested
      if (saveConfig) {
        const config = this.getRepoConfig();
        config[url] = true;
        this.saveRepoConfig(config);
      }

      return { success: true, message: 'Repository added successfully', repo };
    } catch (error: any) {
      this.error(`Error adding repository: ${error.message}`);
      return { success: false, message: error.message };
    }
  }

  /**
   * Remove a repository by URL
   */
  removeRepository(url: string): boolean {
    const removed = this.repositories.delete(url);
    if (removed) {
      this.log(`Removed repository: ${url}`);
      
      // Save config (remove from config)
      const config = this.getRepoConfig();
      delete config[url];
      this.saveRepoConfig(config);
    }
    return removed;
  }

  /**
   * Enable or disable a repository
   */
  setRepositoryEnabled(url: string, enabled: boolean): boolean {
    const repo = this.repositories.get(url);
    if (!repo) {
      this.error(`Repository not found: ${url}`);
      return false;
    }

    repo.enabled = enabled;
    this.log(`Repository ${enabled ? 'enabled' : 'disabled'}: ${url}`);

    // Save config
    const config = this.getRepoConfig();
    config[url] = enabled;
    this.saveRepoConfig(config);

    return true;
  }

  /**
   * Get a repository by URL
   */
  getRepository(url: string): PluginRepo | null {
    return this.repositories.get(url) || null;
  }

  /**
   * Get all repositories
   */
  getAllRepositories(): PluginRepo[] {
    return Array.from(this.repositories.values());
  }

  /**
   * Get all enabled repositories
   */
  getEnabledRepositories(): PluginRepo[] {
    return this.getAllRepositories().filter(r => r.enabled);
  }

  /**
   * Refresh a repository (re-fetch data)
   */
  async refreshRepository(url: string): Promise<boolean> {
    const repo = this.repositories.get(url);
    if (!repo) {
      this.error(`Repository not found: ${url}`);
      return false;
    }

    return await repo.fetch();
  }

  /**
   * Refresh all repositories
   */
  async refreshAllRepositories(): Promise<void> {
    this.log('Refreshing all repositories...');
    
    const promises = Array.from(this.repositories.values()).map(repo => repo.fetch());
    await Promise.all(promises);
    
    this.log('All repositories refreshed');
  }

  /**
   * Get all plugins from all enabled repositories
   */
  getAllPlugins(): PluginRepoMetadata[] {
    const plugins: PluginRepoMetadata[] = [];
    
    for (const repo of this.getEnabledRepositories()) {
      plugins.push(...repo.getPlugins());
    }
    
    return plugins;
  }

  /**
   * Find a plugin by URL across all repositories
   */
  findPluginByUrl(url: string): { plugin: PluginRepoMetadata; repo: PluginRepo } | null {
    for (const repo of this.getEnabledRepositories()) {
      const plugin = repo.getPlugins().find(p => p.url === url);
      if (plugin) {
        return { plugin, repo };
      }
    }
    return null;
  }

  /**
   * Find a plugin by ID across all repositories
   */
  findPluginById(id: string): { plugin: PluginRepoMetadata; repo: PluginRepo } | null {
    for (const repo of this.getEnabledRepositories()) {
      const plugin = repo.getPlugin(id);
      if (plugin) {
        return { plugin, repo };
      }
    }
    return null;
  }

  /**
   * Load repositories from config
   */
  async loadRepositories(): Promise<void> {
    this.log('Loading repositories...');
    
    const repoConfig = this.getRepoConfig();
    const repoUrls = Object.keys(repoConfig);

    this.log(`Found ${repoUrls.length} repositories in config`);

    for (const url of repoUrls) {
      // Don't save config during initial load (avoid overwriting existing config)
      const result = await this.addRepository(url, false);
      
      // Apply enabled state from config
      if (result.success && result.repo) {
        result.repo.enabled = repoConfig[url];
      }
    }

    this.log(`Loaded ${this.repositories.size} repositories (${this.getEnabledRepositories().length} enabled)`);
  }

  /**
   * Get repository configuration
   */
  getRepoConfig(): RepoConfig {
    const config: RepoConfig = {};

    // Start with default repos
    this.defaultRepos.forEach(url => {
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
  saveRepoConfig(config: RepoConfig): void {
    if (window.customjs?.configManager) {
      window.customjs.configManager.set('repositories', config);
    }
  }

  log(message: string, ...args: any[]): void {
    console.log(`%c[CJS|RepoManager] ${message}`, `color: ${this.logColor}`, ...args);
  }

  error(message: string, ...args: any[]): void {
    console.error(`%c[CJS|RepoManager] ${message}`, `color: ${this.logColor}`, ...args);
  }
}
