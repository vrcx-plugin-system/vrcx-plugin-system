// ============================================================================
// PLUGIN MANAGER UI PLUGIN
// Version: 3.0.0
// Build: 1728668400
// ============================================================================

/**
 * Plugin Manager UI Plugin
 * Comprehensive visual UI for managing VRCX custom plugins
 * Adds a "Plugins" navigation menu item with full management interface
 */
class PluginManagerUIPlugin extends Plugin {
  constructor() {
    super({
      name: "Plugin Manager UI",
      description: "Visual UI for managing VRCX custom plugins",
      author: "Bluscream",
      version: "3.0.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/Plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/nav-menu-api.js",
      ],
    });

    this.contentContainer = null;
  }

  async load() {
    this.log("Plugin Manager UI ready");
    this.loaded = true;
  }

  async start() {
    // Wait for Nav Menu API to be available
    const navMenu = await window.customjs.pluginManager.waitForPlugin(
      "nav-menu-api"
    );
    if (!navMenu) {
      this.error("Nav Menu API plugin not found after waiting");
      return;
    }

    this.setupNavMenuItem();
    this.setupMenuWatcher();

    this.enabled = true;
    this.started = true;
    this.log("Plugin Manager UI started");
  }

  async onLogin(user) {
    // No login-specific logic needed for plugin manager UI
  }

  async stop() {
    this.log("Stopping Plugin Manager UI");

    const navMenu = window.customjs?.pluginManager?.getPlugin("nav-menu-api");
    if (navMenu) {
      navMenu.removeItem("plugins");
    }

    await super.stop();
  }

  // ============================================================================
  // SETUP
  // ============================================================================

  setupNavMenuItem() {
    const navMenu = window.customjs?.pluginManager?.getPlugin("nav-menu-api");
    if (!navMenu) {
      this.error("NavMenu plugin not found!");
      return;
    }

    navMenu.addItem("plugins", {
      label: "Plugins",
      icon: "ri-plug-line",
      content: () => this.createPanelContent(),
      before: "settings",
    });

    this.log("Navigation menu item added");
  }

  setupMenuWatcher() {
    const setupWatch = () => {
      if (window.$pinia?.ui?.$subscribe) {
        const unsubscribe = window.$pinia.ui.$subscribe(() => {
          if (window.$pinia.ui.menuActiveIndex === "plugins") {
            this.refreshPluginList();
          }
        });

        this.registerSubscription(unsubscribe);
        this.log("Menu watcher ready");
      } else {
        setTimeout(setupWatch, 500);
      }
    };

    setTimeout(setupWatch, 2000);
  }

  // ============================================================================
  // UI CREATION
  // ============================================================================

  createPanelContent() {
    const container = document.createElement("div");
    container.style.cssText = `
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    `;

    this.contentContainer = container;
    this.renderContent(container);
    return container;
  }

  renderContent(container) {
    try {
      container.innerHTML = "";

      const header = this.createHeader();
      container.appendChild(header);

      const loadSection = this.createLoadPluginSection();
      container.appendChild(loadSection);

      const pluginList = document.createElement("div");
      pluginList.id = "plugin-list-container";
      container.appendChild(pluginList);

      this.refreshPluginList();
    } catch (error) {
      this.error("Error rendering plugin manager content:", error);
      container.innerHTML = `
        <div style="padding: 20px; text-align: center; color: #dc3545;">
          <h3>❌ Error Loading Plugin Manager</h3>
          <p>${error.message}</p>
          <button class="el-button el-button--primary" onclick="location.reload()">
            <i class="ri-restart-line"></i> Reload VRCX
          </button>
        </div>
      `;
    }
  }

  createHeader() {
    const header = document.createElement("div");
    header.style.cssText = "margin-bottom: 30px;";

    const pluginInfo = window.customjs.pluginManager?.getPluginList() || {
      loaded: [],
      failed: [],
      plugins: [],
    };

    const loadedCount = pluginInfo.plugins?.length || 0;
    const activeCount =
      pluginInfo.plugins?.filter((p) => p.enabled).length || 0;
    const startedCount =
      pluginInfo.plugins?.filter((p) => p.started).length || 0;
    const failedCount = pluginInfo.failed?.length || 0;

    header.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <div>
          <h2 style="margin: 0; font-size: 28px; font-weight: 600;">
            🔌 Plugin Manager v${window.customjs.version}
          </h2>
          <p style="margin: 5px 0 0 0; color: #888; font-size: 14px;">
            Manage VRCX Custom JS Plugins - Everything under <code>customjs</code>
          </p>
        </div>
        <div style="display: flex; gap: 10px;">
          <div style="text-align: center; padding: 10px 20px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 8px; color: white; box-shadow: 0 2px 8px rgba(40,167,69,0.3);">
            <div style="font-size: 24px; font-weight: bold;">${loadedCount}</div>
            <div style="font-size: 12px; opacity: 0.9;">Loaded</div>
          </div>
          <div style="text-align: center; padding: 10px 20px; background: linear-gradient(135deg, #007bff 0%, #0056b3 100%); border-radius: 8px; color: white; box-shadow: 0 2px 8px rgba(0,123,255,0.3);">
            <div style="font-size: 24px; font-weight: bold;">${activeCount}</div>
            <div style="font-size: 12px; opacity: 0.9;">Enabled</div>
          </div>
          <div style="text-align: center; padding: 10px 20px; background: linear-gradient(135deg, #6f42c1 0%, #5a32a3 100%); border-radius: 8px; color: white; box-shadow: 0 2px 8px rgba(111,66,193,0.3);">
            <div style="font-size: 24px; font-weight: bold;">${startedCount}</div>
            <div style="font-size: 12px; opacity: 0.9;">Started</div>
          </div>
          <div style="text-align: center; padding: 10px 20px; background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); border-radius: 8px; color: white; box-shadow: 0 2px 8px rgba(220,53,69,0.3);">
            <div style="font-size: 24px; font-weight: bold;">${failedCount}</div>
            <div style="font-size: 12px; opacity: 0.9;">Failed</div>
          </div>
        </div>
      </div>
    `;

    return header;
  }

  createLoadPluginSection() {
    const section = document.createElement("div");
    section.style.cssText = `
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px dashed #dee2e6;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    `;

    section.innerHTML = `
      <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center;">
        <i class="ri-download-cloud-line" style="margin-right: 8px; font-size: 20px;"></i>
        Load Plugin from URL
      </h3>
      <div style="display: flex; gap: 10px; margin-bottom: 10px;">
        <input 
          type="text" 
          id="plugin-url-input" 
          placeholder="https://github.com/USER/REPO/raw/refs/heads/main/js/plugins/my-plugin.js"
          style="flex: 1; padding: 10px 15px; border: 2px solid #ced4da; border-radius: 6px; font-size: 14px; font-family: 'Consolas', monospace;"
        />
        <button 
          id="load-plugin-btn"
          class="el-button el-button--primary"
          style="padding: 10px 20px;"
        >
          <i class="ri-download-line"></i> Load
        </button>
      </div>
      <div id="load-plugin-status" style="margin-top: 10px; font-size: 13px; color: #6c757d;"></div>
      <div style="margin-top: 15px; padding: 10px; background: #fff; border-radius: 6px; border: 1px solid #dee2e6;">
        <div style="font-size: 12px; color: #666; line-height: 1.6;">
          <strong>Quick Access:</strong><br>
          <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">customjs.plugins</code> - All plugin instances<br>
          <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">customjs.pluginManager</code> - Plugin manager<br>
          <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">customjs.config</code> - User configuration
        </div>
      </div>
    `;

    setTimeout(() => {
      const input = section.querySelector("#plugin-url-input");
      const button = section.querySelector("#load-plugin-btn");
      const status = section.querySelector("#load-plugin-status");

      if (button) {
        this.registerListener(button, "click", async () => {
          await this.handleLoadPlugin(input, status);
        });
      }

      if (input) {
        this.registerListener(input, "keypress", async (e) => {
          if (e.key === "Enter") {
            await this.handleLoadPlugin(input, status);
          }
        });
      }
    }, 0);

    return section;
  }

  async handleLoadPlugin(input, status) {
    const url = input.value.trim();

    if (!url) {
      status.textContent = "⚠️ Please enter a URL";
      status.style.color = "#ffc107";
      return;
    }

    status.textContent = `⏳ Loading plugin from ${url}...`;
    status.style.color = "#007bff";

    try {
      const result = await window.customjs.pluginManager.addPlugin(url);

      if (result.success) {
        status.textContent = `✅ Plugin loaded successfully!`;
        status.style.color = "#28a745";
        input.value = "";
        setTimeout(() => this.refreshPluginList(), 500);
      } else {
        status.textContent = `❌ Failed to load: ${result.message}`;
        status.style.color = "#dc3545";
      }
    } catch (error) {
      status.textContent = `❌ Error: ${error.message}`;
      status.style.color = "#dc3545";
    }
  }

  refreshPluginList() {
    try {
      const container = this.contentContainer?.querySelector(
        "#plugin-list-container"
      );
      if (!container) {
        this.warn("Plugin list container not found");
        return;
      }

      container.innerHTML = "";

      // Get plugin info from customjs
      const allPlugins = window.customjs?.plugins || [];
      const failedUrls =
        window.customjs?.pluginManager?.failedUrls || new Set();

      // Loaded plugins section
      const loadedSection = this.createPluginCardsSection(allPlugins);
      container.appendChild(loadedSection);

      // Failed plugins section
      if (failedUrls.size > 0) {
        const failedSection = this.createFailedSection(Array.from(failedUrls));
        container.appendChild(failedSection);
      }

      // System info section
      const systemSection = this.createSystemInfoSection();
      container.appendChild(systemSection);
    } catch (error) {
      this.error("Error refreshing plugin list:", error);
    }
  }

  createPluginCardsSection(plugins) {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom: 30px;";

    const header = document.createElement("h3");
    header.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      color: #28a745;
    `;
    header.innerHTML = `<i class="ri-checkbox-circle-line" style="margin-right: 8px;"></i>Loaded Plugins (${plugins.length})`;

    section.appendChild(header);

    const grid = document.createElement("div");
    grid.style.cssText = `
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
      gap: 20px;
    `;

    plugins.forEach((plugin) => {
      try {
        const card = this.createEnhancedPluginCard(plugin);
        grid.appendChild(card);
      } catch (error) {
        this.error(
          `Error creating card for plugin: ${
            plugin?.metadata?.name || "unknown"
          }`,
          error
        );
      }
    });

    section.appendChild(grid);
    return section;
  }

  createEnhancedPluginCard(plugin) {
    const card = document.createElement("div");
    card.style.cssText = `
      background: white;
      border: 2px solid ${plugin.enabled ? "#28a745" : "#6c757d"};
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
      transition: all 0.3s;
      cursor: pointer;
      position: relative;
    `;

    // Build dependency list
    const deps = plugin.metadata.dependencies || [];
    const depsHtml =
      deps.length > 0
        ? `<div style="font-size: 11px; color: #999; margin-top: 5px;">
             <i class="ri-link"></i> ${deps.length} ${
            deps.length === 1 ? "dependency" : "dependencies"
          }
           </div>`
        : "";

    // Status badges
    const badges = [];
    if (plugin.loaded)
      badges.push(
        '<span style="background: #28a745; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-right: 4px;">Loaded</span>'
      );
    if (plugin.started)
      badges.push(
        '<span style="background: #007bff; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-right: 4px;">Started</span>'
      );
    if (plugin.enabled)
      badges.push(
        '<span style="background: #6f42c1; color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-right: 4px;">Enabled</span>'
      );

    // Resource counts
    const resources = plugin.resources || {
      timers: new Set(),
      observers: new Set(),
      listeners: new Map(),
      hooks: new Set(),
      subscriptions: new Set(),
    };

    const timerCount = resources.timers?.size || 0;
    const observerCount = resources.observers?.size || 0;
    const listenerCount = resources.listeners?.size || 0;
    const hookCount = resources.hooks?.size || 0;
    const subscriptionCount = resources.subscriptions?.size || 0;
    const totalResources =
      timerCount +
      observerCount +
      listenerCount +
      hookCount +
      subscriptionCount;

    // Build resource display
    const resourceItems = [];
    if (timerCount > 0)
      resourceItems.push(`⏱️ ${timerCount} timer${timerCount > 1 ? "s" : ""}`);
    if (observerCount > 0)
      resourceItems.push(
        `👁️ ${observerCount} observer${observerCount > 1 ? "s" : ""}`
      );
    if (listenerCount > 0)
      resourceItems.push(
        `🎧 ${listenerCount} listener${listenerCount > 1 ? "s" : ""}`
      );
    if (hookCount > 0)
      resourceItems.push(`🪝 ${hookCount} hook${hookCount > 1 ? "s" : ""}`);
    if (subscriptionCount > 0)
      resourceItems.push(
        `📊 ${subscriptionCount} subscription${
          subscriptionCount > 1 ? "s" : ""
        }`
      );

    const resourcesHtml =
      totalResources > 0
        ? `<div style="font-size: 11px; color: #555; margin-top: 8px; padding: 8px; background: #f8f9fa; border-radius: 6px; border-left: 3px solid #007bff;">
           <div style="font-weight: 600; margin-bottom: 4px; color: #007bff;">
             <i class="ri-cpu-line"></i> Resources (${totalResources})
           </div>
           <div style="line-height: 1.6;">
             ${resourceItems.join(" • ")}
           </div>
         </div>`
        : '<div style="font-size: 11px; color: #999; margin-top: 8px; font-style: italic;">No active resources</div>';

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
        <div style="flex: 1;">
          <h4 style="margin: 0 0 5px 0; font-size: 18px; font-weight: 600; color: #212529;">
            ${plugin.metadata?.name || "Unknown Plugin"}
          </h4>
          <div style="font-size: 11px; color: #6c757d; font-family: monospace; margin-bottom: 8px;">
            ID: ${plugin.metadata?.id || "unknown"} • v${
      plugin.metadata?.version || "0.0.0"
    } • Build: ${plugin.metadata?.build || "unknown"}
          </div>
          <div style="margin-bottom: 8px;">
            ${badges.join("")}
          </div>
          ${
            plugin.metadata?.description
              ? `<p style="font-size: 13px; color: #666; margin: 8px 0 0 0; line-height: 1.4;">${plugin.metadata.description}</p>`
              : ""
          }
          ${depsHtml}
          ${resourcesHtml}
        </div>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
        <button class="toggle-btn el-button el-button--small ${
          plugin.enabled ? "el-button--warning" : "el-button--success"
        }" style="flex: 1;">
          <i class="${
            plugin.enabled ? "ri-pause-circle-line" : "ri-play-circle-line"
          }"></i>
          ${plugin.enabled ? "Disable" : "Enable"}
        </button>
        <button class="reload-btn el-button el-button--small el-button--info" style="flex: 1;">
          <i class="ri-restart-line"></i> Reload
        </button>
        <button class="details-btn el-button el-button--small" style="flex: 1;">
          <i class="ri-information-line"></i> Details
        </button>
        <button class="remove-btn el-button el-button--small el-button--danger">
          <i class="ri-delete-bin-line"></i>
        </button>
      </div>
    `;

    // Hover effects
    this.registerListener(card, "mouseenter", () => {
      card.style.boxShadow = "0 8px 16px rgba(0,0,0,0.15)";
      card.style.transform = "translateY(-4px)";
    });

    this.registerListener(card, "mouseleave", () => {
      card.style.boxShadow = "0 4px 6px rgba(0,0,0,0.1)";
      card.style.transform = "translateY(0)";
    });

    // Button handlers
    setTimeout(() => {
      const toggleBtn = card.querySelector(".toggle-btn");
      const reloadBtn = card.querySelector(".reload-btn");
      const detailsBtn = card.querySelector(".details-btn");
      const removeBtn = card.querySelector(".remove-btn");

      if (toggleBtn) {
        this.registerListener(toggleBtn, "click", async (e) => {
          e.stopPropagation();
          await this.handleTogglePlugin(plugin.metadata.id);
        });
      }

      if (reloadBtn) {
        this.registerListener(reloadBtn, "click", async (e) => {
          e.stopPropagation();
          await this.handleReloadPlugin(plugin.metadata.url);
        });
      }

      if (detailsBtn) {
        this.registerListener(detailsBtn, "click", (e) => {
          e.stopPropagation();
          this.handleShowDetails(plugin);
        });
      }

      if (removeBtn) {
        this.registerListener(removeBtn, "click", async (e) => {
          e.stopPropagation();
          await this.handleRemovePlugin(plugin.metadata.url);
        });
      }
    }, 0);

    return card;
  }

  createFailedSection(failedUrls) {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom: 30px;";

    const header = document.createElement("h3");
    header.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      color: #dc3545;
    `;
    header.innerHTML = `<i class="ri-error-warning-line" style="margin-right: 8px;"></i>Failed to Load (${failedUrls.length})`;

    section.appendChild(header);

    const list = document.createElement("div");
    list.style.cssText = "display: flex; flex-direction: column; gap: 10px;";

    failedUrls.forEach((url) => {
      const item = document.createElement("div");
      item.style.cssText = `
        background: #fff5f5;
        border: 1px solid #fecaca;
        border-radius: 8px;
        padding: 12px 15px;
        font-size: 13px;
        font-family: 'Consolas', monospace;
        color: #dc3545;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        justify-content: space-between;
        align-items: center;
      `;

      const urlText = document.createElement("span");
      urlText.textContent = url;
      urlText.style.flex = "1";

      const retryBtn = document.createElement("button");
      retryBtn.className = "el-button el-button--small el-button--danger";
      retryBtn.innerHTML = '<i class="ri-restart-line"></i> Retry';

      item.appendChild(urlText);
      item.appendChild(retryBtn);

      this.registerListener(item, "mouseenter", () => {
        item.style.background = "#ffe6e6";
      });

      this.registerListener(item, "mouseleave", () => {
        item.style.background = "#fff5f5";
      });

      this.registerListener(urlText, "click", () => {
        window.customjs?.utils?.copyToClipboard(url, "Failed plugin URL");
      });

      this.registerListener(retryBtn, "click", async (e) => {
        e.stopPropagation();
        await this.handleRetryFailedPlugin(url);
      });

      list.appendChild(item);
    });

    section.appendChild(list);
    return section;
  }

  createSystemInfoSection() {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom: 30px;";

    const header = document.createElement("h3");
    header.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
    `;
    header.innerHTML = `<i class="ri-information-line" style="margin-right: 8px;"></i>System Information`;

    section.appendChild(header);

    const info = document.createElement("div");
    info.style.cssText = `
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(102,126,234,0.3);
    `;

    const eventCount = Object.keys(window.customjs.events || {}).length;
    const preHookCount = Object.keys(window.customjs.hooks?.pre || {}).length;
    const postHookCount = Object.keys(window.customjs.hooks?.post || {}).length;
    const backedUpFunctions = Object.keys(
      window.customjs.functions || {}
    ).length;

    info.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
        <div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">System Version</div>
          <div style="font-size: 20px; font-weight: 600;">${
            window.customjs.version
          }</div>
        </div>
        <div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">Build</div>
          <div style="font-size: 20px; font-weight: 600;">${
            window.customjs.build
          }</div>
        </div>
        <div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">Events Registered</div>
          <div style="font-size: 20px; font-weight: 600;">${eventCount}</div>
        </div>
        <div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">Pre-Hooks</div>
          <div style="font-size: 20px; font-weight: 600;">${preHookCount}</div>
        </div>
        <div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">Post-Hooks</div>
          <div style="font-size: 20px; font-weight: 600;">${postHookCount}</div>
        </div>
        <div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">Backed Up Functions</div>
          <div style="font-size: 20px; font-weight: 600;">${backedUpFunctions}</div>
        </div>
      </div>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">Namespace Structure</div>
        <div style="font-family: 'Consolas', monospace; font-size: 12px; line-height: 1.8;">
          <code style="color: #fff;">customjs.plugins</code> = [${
            window.customjs.plugins.length
          } Plugin instances]<br>
          <code style="color: #fff;">customjs.pluginManager</code> = PluginManager instance<br>
          <code style="color: #fff;">customjs.config</code> = User configuration<br>
          <code style="color: #fff;">customjs.events</code> = Event registry (${eventCount} events)<br>
          <code style="color: #fff;">customjs.hooks</code> = Function hooks (${
            preHookCount + postHookCount
          } total)
        </div>
      </div>
    `;

    return section;
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  async handleTogglePlugin(pluginId) {
    try {
      const plugin = window.customjs.pluginManager.getPlugin(pluginId);
      if (!plugin) {
        this.error(`Plugin not found: ${pluginId}`);
        window.customjs?.utils?.showError(`Plugin not found: ${pluginId}`);
        return;
      }

      await plugin.toggle();
      this.log(
        `Toggled plugin ${pluginId}: ${plugin.enabled ? "enabled" : "disabled"}`
      );

      setTimeout(() => this.refreshPluginList(), 100);

      const statusMsg = plugin.enabled ? "enabled" : "disabled";
      window.customjs?.utils?.showSuccess(
        `${plugin.metadata.name} ${statusMsg}`
      );
    } catch (error) {
      this.error(`Error toggling plugin ${pluginId}:`, error);
      window.customjs?.utils?.showError(`Error: ${error.message}`);
    }
  }

  async handleReloadPlugin(pluginUrl) {
    if (!pluginUrl) {
      this.warn("No URL available for reload");
      window.customjs?.utils?.showWarning("Plugin URL not available");
      return;
    }

    try {
      this.log(`Reloading plugin from ${pluginUrl}`);
      window.customjs?.utils?.showInfo("Reloading plugin...");

      const result = await window.customjs.pluginManager.reloadPlugin(
        pluginUrl
      );

      if (result.success) {
        this.log("Plugin reloaded successfully");
        window.customjs?.utils?.showSuccess("Plugin reloaded successfully");
        setTimeout(() => this.refreshPluginList(), 500);
      } else {
        this.error(`Reload failed: ${result.message}`);
        window.customjs?.utils?.showError(`Reload failed: ${result.message}`);
      }
    } catch (error) {
      this.error("Error reloading plugin:", error);
      window.customjs?.utils?.showError(`Error: ${error.message}`);
    }
  }

  handleShowDetails(plugin) {
    this.log("Showing plugin details:", plugin);

    // Open devtools for debugging
    if (window.AppApi?.ShowDevTools) {
      window.AppApi.ShowDevTools();
    }

    // Intentionally using console.* for structured debug output
    console.group(`Plugin Details: ${plugin.metadata.name}`); // eslint-disable-line no-console
    console.dir(plugin.metadata); // eslint-disable-line no-console
    console.table({
      // eslint-disable-line no-console
      enabled: plugin.enabled,
      loaded: plugin.loaded,
      started: plugin.started,
    });
    console.log("Resources:"); // eslint-disable-line no-console
    console.dir(plugin.resources); // eslint-disable-line no-console
    console.log("Full Plugin Object:"); // eslint-disable-line no-console
    console.dir(plugin); // eslint-disable-line no-console
    console.groupEnd(); // eslint-disable-line no-console

    window.customjs?.utils?.showInfo(
      `${plugin.metadata.name} details logged to console (DevTools opened)`
    );
  }

  async handleRemovePlugin(pluginUrl) {
    if (!pluginUrl) {
      this.warn("No URL available for removal");
      window.customjs?.utils?.showWarning("Plugin URL not available");
      return;
    }

    if (
      !confirm(
        `Are you sure you want to remove this plugin?\n\nNote: Code will remain in memory until VRCX restart.`
      )
    ) {
      return;
    }

    try {
      this.log(`Removing plugin from ${pluginUrl}`);

      const result = await window.customjs.pluginManager.removePlugin(
        pluginUrl
      );

      if (result.success) {
        this.log("Plugin removed successfully");
        window.customjs?.utils?.showSuccess(
          "Plugin removed (restart VRCX to fully unload)"
        );
        setTimeout(() => this.refreshPluginList(), 500);
      } else {
        this.error(`Removal failed: ${result.message}`);
        window.customjs?.utils?.showError(`Removal failed: ${result.message}`);
      }
    } catch (error) {
      this.error("Error removing plugin:", error);
      window.customjs?.utils?.showError(`Error: ${error.message}`);
    }
  }

  async handleRetryFailedPlugin(url) {
    try {
      this.log(`Retrying failed plugin: ${url}`);
      window.customjs?.utils?.showInfo("Retrying plugin load...");

      // Remove from failed set
      window.customjs.pluginManager.failedUrls.delete(url);

      // Try loading again
      const result = await window.customjs.pluginManager.addPlugin(url);

      if (result.success) {
        window.customjs?.utils?.showSuccess("Plugin loaded successfully!");
        setTimeout(() => this.refreshPluginList(), 500);
      } else {
        window.customjs?.utils?.showError(`Failed again: ${result.message}`);
      }
    } catch (error) {
      this.error("Error retrying plugin:", error);
      window.customjs?.utils?.showError(`Error: ${error.message}`);
    }
  }
}

// Export plugin class for PluginManager
window.__LAST_PLUGIN_CLASS__ = PluginManagerUIPlugin;
