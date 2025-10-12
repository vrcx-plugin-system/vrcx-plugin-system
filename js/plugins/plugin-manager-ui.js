class PluginManagerUIPlugin extends Plugin {
  constructor() {
    super({
      name: "Plugin Manager UI",
      description: "Visual UI for managing VRCX custom plugins",
      author: "Bluscream",
      version: "5.3.0",
      build: "1728778800",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/nav-menu-api.js",
      ],
    });

    this.contentContainer = null;
    this.settingsModal = null;
  }

  async load() {
    this.logger.log("Plugin Manager UI ready");
    this.loaded = true;
  }

  async start() {
    // Setup utils shortcut
    this.utils = window.customjs.utils;

    // Wait for dependencies
    this.navMenuApi = await window.customjs.pluginManager.waitForPlugin(
      "nav-menu-api"
    );

    if (!this.navMenuApi) {
      this.logger.error("Nav Menu API plugin not found after waiting");
      return;
    }

    this.setupNavMenuItem();
    this.setupMenuWatcher();

    this.enabled = true;
    this.started = true;
    this.logger.log("Plugin Manager UI started");
  }

  async onLogin(user) {
    // No login-specific logic needed for plugin manager UI
  }

  async stop() {
    this.logger.log("Stopping Plugin Manager UI");

    if (this.navMenuApi) {
      this.navMenuApi.removeItem("plugins");
    }

    // Clean up settings modal if open
    if (this.settingsModal) {
      this.settingsModal.remove();
      this.settingsModal = null;
    }

    await super.stop();
  }

  setupNavMenuItem() {
    if (!this.navMenuApi) {
      this.logger.error("NavMenu plugin not found!");
      return;
    }

    this.navMenuApi.addItem("plugins", {
      label: "Plugins",
      icon: "ri-plug-line",
      content: () => this.createPanelContent(),
      before: "settings",
    });

    this.logger.log("Navigation menu item added");
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
        this.logger.log("Menu watcher ready");
      } else {
        setTimeout(setupWatch, 500);
      }
    };

    setTimeout(setupWatch, 2000);
  }

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

      // Defer refreshPluginList to ensure container is in DOM
      setTimeout(() => this.refreshPluginList(), 0);
    } catch (error) {
      this.logger.error("Error rendering plugin manager content:", error);
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

    const coreModules = window.customjs.core_modules || [];
    const allPlugins = pluginInfo.plugins || [];
    const pluginCount = allPlugins.length;
    const activeCount = allPlugins.filter((p) => p.enabled).length;
    const startedCount = allPlugins.filter((p) => p.started).length;
    const failedCount = pluginInfo.failed?.length || 0;
    const subscriptionCount = window.customjs.subscriptions?.size || 0;

    header.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <div>
          <h2 style="margin: 0; font-size: 28px; font-weight: 600;">
            🔌 Plugins
          </h2>
          <p style="margin: 5px 0 0 0; color: #888; font-size: 14px;"></p>
        </div>
        <div style="display: flex; gap: 10px;">
          <div style="text-align: center; padding: 10px 20px; background: linear-gradient(135deg, #17a2b8 0%, #138496 100%); border-radius: 8px; color: white; box-shadow: 0 2px 8px rgba(23,162,184,0.3);">
            <div style="font-size: 24px; font-weight: bold;">${coreModules.length}</div>
            <div style="font-size: 12px; opacity: 0.9;">Core</div>
          </div>
          <div style="text-align: center; padding: 10px 20px; background: linear-gradient(135deg, #28a745 0%, #20c997 100%); border-radius: 8px; color: white; box-shadow: 0 2px 8px rgba(40,167,69,0.3);">
            <div style="font-size: 24px; font-weight: bold;">${pluginCount}</div>
            <div style="font-size: 12px; opacity: 0.9;">Plugins</div>
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
        <i class="ri-download-cloud-line" style="color: #007bff; margin-right: 8px; font-size: 20px;"></i>
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
          <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">customjs.core_modules</code> - Core module URLs<br>
          <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">customjs.plugins</code> - Plugin instances<br>
          <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">customjs.subscriptions</code> - Pinia subscriptions<br>
          <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">customjs.config</code> - Configuration<br>
          <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">customjs.pluginManager</code> - Plugin manager<br>
          <code style="background: #f8f9fa; padding: 2px 6px; border-radius: 3px;">customjs.configManager</code> - Config manager
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
        this.logger.warn("Plugin list container not found");
        return;
      }

      container.innerHTML = "";

      // Get core modules and plugins
      const coreModules = window.customjs?.core_modules || [];
      const allPlugins = window.customjs?.plugins || [];
      const failedUrls =
        window.customjs?.pluginManager?.failedUrls || new Set();

      // Core modules section
      if (coreModules.length > 0) {
        const coreSection = this.createCoreModulesSection(coreModules);
        container.appendChild(coreSection);
      }

      // Loaded plugins section
      if (allPlugins.length > 0) {
        const loadedSection = this.createPluginCardsSection(allPlugins);
        container.appendChild(loadedSection);
      }

      // Failed plugins section
      if (failedUrls.size > 0) {
        const failedSection = this.createFailedSection(Array.from(failedUrls));
        container.appendChild(failedSection);
      }

      // System info section
      const systemSection = this.createSystemInfoSection();
      container.appendChild(systemSection);
    } catch (error) {
      this.logger.error("Error refreshing plugin list:", error);
    }
  }

  createCoreModulesSection(coreModules) {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom: 30px;";

    const header = document.createElement("h3");
    header.style.cssText = `
      margin: 0 0 15px 0;
      font-size: 20px;
      font-weight: 600;
      display: flex;
      align-items: center;
      color: #17a2b8;
    `;
    header.innerHTML = `<i class="ri-cpu-line" style="margin-right: 8px;"></i>Core Modules (${coreModules.length})`;

    section.appendChild(header);

    const list = document.createElement("div");
    list.style.cssText = "display: flex; flex-direction: column; gap: 10px;";

    coreModules.forEach((moduleUrl) => {
      const moduleName = moduleUrl.split("/").pop().replace(".js", "");
      const item = document.createElement("div");
      item.style.cssText = `
        background: linear-gradient(135deg, #e0f7fa 0%, #b2ebf2 100%);
        border: 2px solid #17a2b8;
        border-radius: 8px;
        padding: 12px 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-family: 'Consolas', monospace;
        font-size: 13px;
        color: #0c5460;
      `;

      item.innerHTML = `
        <div>
          <strong style="font-size: 14px;">${moduleName}</strong>
          <div style="font-size: 11px; margin-top: 3px; opacity: 0.8;">${moduleUrl}</div>
        </div>
        <span style="background: #17a2b8; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px;">
          ⚙️ System
        </span>
      `;

      list.appendChild(item);
    });

    section.appendChild(list);
    return section;
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

    // Sort plugins by name alphabetically
    const sortedPlugins = [...plugins].sort((a, b) => {
      const nameA = (a.metadata?.name || "Unknown").toLowerCase();
      const nameB = (b.metadata?.name || "Unknown").toLowerCase();
      return nameA.localeCompare(nameB);
    });

    sortedPlugins.forEach((plugin) => {
      try {
        const card = this.createEnhancedPluginCard(plugin);
        grid.appendChild(card);
      } catch (error) {
        this.logger.error(
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
    };

    const timerCount = resources.timers?.size || 0;
    const observerCount = resources.observers?.size || 0;
    const listenerCount = resources.listeners?.size || 0;
    const hookCount = resources.hooks?.size || 0;

    // Get subscription count from global tracking
    const globalSubscriptions = window.customjs.subscriptions?.get(
      plugin.metadata.id
    );
    const subscriptionCount = globalSubscriptions?.size || 0;

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

    // Check if plugin has settings
    const hasSettings =
      window.customjs?.configManager?.settings?.get(plugin.metadata.id)?.size >
      0;

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
      ${
        hasSettings
          ? `
      <div class="settings-section" style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e9ecef;">
        <div class="settings-toggle" style="display: flex; align-items: center; justify-content: space-between; padding: 8px 12px; background: #f8f9fa; border-radius: 6px; cursor: pointer; margin-bottom: 10px;">
          <span style="font-size: 14px; font-weight: 600; color: #212529;">
            <i class="ri-settings-3-line"></i> Plugin Settings
          </span>
          <i class="ri-arrow-down-s-line toggle-icon" style="font-size: 20px; color: #6c757d; transition: transform 0.3s;"></i>
        </div>
        <div class="settings-content" style="display: block; max-height: 400px; overflow-y: auto; padding: 0 5px;"></div>
      </div>
      `
          : ""
      }
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

      // Settings section toggle
      if (hasSettings) {
        const settingsToggle = card.querySelector(".settings-toggle");
        const settingsContent = card.querySelector(".settings-content");
        const toggleIcon = card.querySelector(".toggle-icon");

        if (settingsToggle && settingsContent) {
          // Populate settings content
          settingsContent.appendChild(this.buildSettingsUI(plugin));

          // Add toggle functionality
          let isExpanded = true; // Start expanded by default
          this.registerListener(settingsToggle, "click", (e) => {
            e.stopPropagation();
            isExpanded = !isExpanded;
            settingsContent.style.display = isExpanded ? "block" : "none";
            if (toggleIcon) {
              toggleIcon.style.transform = isExpanded
                ? "rotate(0deg)"
                : "rotate(-90deg)";
            }
          });
        }
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
        if (this.utils) {
          this.utils.copyToClipboard(url, "Failed plugin URL");
        }
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
    const voidHookCount = Object.keys(window.customjs.hooks?.void || {}).length;
    const replaceHookCount = Object.keys(
      window.customjs.hooks?.replace || {}
    ).length;
    const backedUpFunctions = Object.keys(
      window.customjs.functions || {}
    ).length;
    const totalSubscriptions = window.customjs.subscriptions?.size || 0;

    // Get loader config
    const loaderConfig = window.customjs.configManager?.getPluginConfig() || {};
    const enabledInConfig = Object.values(loaderConfig).filter(
      (v) => v === true
    ).length;
    const disabledInConfig = Object.values(loaderConfig).filter(
      (v) => v === false
    ).length;
    const loadTimeout =
      window.customjs.config?.loader?.loadTimeout?.value ??
      window.customjs.config?.loader?.loadTimeout ??
      10000;

    info.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 15px;">
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
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">Load Timeout</div>
          <div style="font-size: 20px; font-weight: 600;">${loadTimeout}ms</div>
        </div>
        <div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">Total Subscriptions</div>
          <div style="font-size: 20px; font-weight: 600;">${totalSubscriptions}</div>
        </div>
        <div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">Events Registered</div>
          <div style="font-size: 20px; font-weight: 600;">${eventCount}</div>
        </div>
        <div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">Function Hooks</div>
          <div style="font-size: 20px; font-weight: 600;">${
            preHookCount + postHookCount + voidHookCount + replaceHookCount
          }</div>
        </div>
        <div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">Backed Up Functions</div>
          <div style="font-size: 20px; font-weight: 600;">${backedUpFunctions}</div>
        </div>
        <div>
          <div style="font-size: 12px; opacity: 0.9; margin-bottom: 3px;">Enabled in Config</div>
          <div style="font-size: 20px; font-weight: 600;">${enabledInConfig}</div>
        </div>
      </div>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">Namespace Structure</div>
        <div style="font-family: 'Consolas', monospace; font-size: 12px; line-height: 1.8;">
          <code style="color: #fff;">customjs.core_modules</code> = [${
            window.customjs.core_modules?.length || 0
          } modules]<br>
          <code style="color: #fff;">customjs.plugins</code> = [${
            window.customjs.plugins.length
          } instances]<br>
          <code style="color: #fff;">customjs.subscriptions</code> = Map (${totalSubscriptions} plugins)<br>
          <code style="color: #fff;">customjs.pluginManager</code> = PluginManager<br>
          <code style="color: #fff;">customjs.configManager</code> = ConfigManager<br>
          <code style="color: #fff;">customjs.config</code> = Configuration<br>
          <code style="color: #fff;">customjs.events</code> = Events (${eventCount})<br>
          <code style="color: #fff;">customjs.hooks</code> = Hooks (pre: ${preHookCount}, post: ${postHookCount}, void: ${voidHookCount}, replace: ${replaceHookCount})
        </div>
      </div>
      <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.2);">
        <div style="font-size: 12px; opacity: 0.9; margin-bottom: 8px;">Config Location</div>
        <div style="font-family: 'Consolas', monospace; font-size: 11px; line-height: 1.6;">
          <code style="color: #fff;">vrcx.customjs.loader.plugins</code> - Plugin enable/disable states<br>
          <code style="color: #fff;">vrcx.customjs.loader.loadTimeout</code> - ${loadTimeout}ms<br>
          <code style="color: #fff;">vrcx.customjs.settings</code> - Plugin settings<br>
          <code style="color: #fff;">vrcx.customjs.logger</code> - Logger settings
        </div>
      </div>
    `;

    section.appendChild(info);
    return section;
  }

  async handleTogglePlugin(pluginId) {
    try {
      const plugin = window.customjs.pluginManager.getPlugin(pluginId);
      if (!plugin) {
        this.logger.error(`Plugin not found: ${pluginId}`);
        this.logger.showError(`Plugin not found: ${pluginId}`);
        return;
      }

      await plugin.toggle();
      this.logger.log(
        `Toggled plugin ${pluginId}: ${plugin.enabled ? "enabled" : "disabled"}`
      );

      // Update plugin config and save
      if (plugin.metadata.url && window.customjs.pluginManager) {
        const config = window.customjs.pluginManager.getPluginConfig();
        config[plugin.metadata.url] = plugin.enabled;
        window.customjs.pluginManager.savePluginConfig(config);
        // Settings are now auto-saved to localStorage!
      }

      setTimeout(() => this.refreshPluginList(), 100);

      const statusMsg = plugin.enabled ? "enabled" : "disabled";
      this.logger.showSuccess(`${plugin.metadata.name} ${statusMsg}`);
    } catch (error) {
      this.logger.error(`Error toggling plugin ${pluginId}:`, error);
      this.logger.showError(`Error: ${error.message}`);
    }
  }

  async handleReloadPlugin(pluginUrl) {
    if (!pluginUrl) {
      this.logger.warn("No URL available for reload");
      this.logger.showWarn("Plugin URL not available");
      return;
    }

    try {
      this.logger.log(`Reloading plugin from ${pluginUrl}`);
      this.logger.showInfo("Reloading plugin...");

      const result = await window.customjs.pluginManager.reloadPlugin(
        pluginUrl
      );

      if (result.success) {
        this.logger.log("Plugin reloaded successfully");
        this.logger.showSuccess("Plugin reloaded successfully");
        setTimeout(() => this.refreshPluginList(), 500);
      } else {
        this.logger.error(`Reload failed: ${result.message}`);
        this.logger.showError(`Reload failed: ${result.message}`);
      }
    } catch (error) {
      this.logger.error("Error reloading plugin:", error);
      this.logger.showError(`Error: ${error.message}`);
    }
  }

  handleShowDetails(plugin) {
    // Dump full plugin object to console
    console.log(plugin); // eslint-disable-line no-console
    // Open devtools for debugging
    if (window.AppApi?.ShowDevTools) {
      window.AppApi.ShowDevTools();
    }
  }

  async handleRemovePlugin(pluginUrl) {
    if (!pluginUrl) {
      this.logger.warn("No URL available for removal");
      this.logger.showWarn("Plugin URL not available");
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
      this.logger.log(`Removing plugin from ${pluginUrl}`);

      const result = await window.customjs.pluginManager.removePlugin(
        pluginUrl
      );

      if (result.success) {
        this.logger.log("Plugin removed successfully");
        this.logger.showSuccess(
          "Plugin removed (restart VRCX to fully unload)"
        );
        setTimeout(() => this.refreshPluginList(), 500);
      } else {
        this.logger.error(`Removal failed: ${result.message}`);
        this.logger.showError(`Removal failed: ${result.message}`);
      }
    } catch (error) {
      this.logger.error("Error removing plugin:", error);
      this.logger.showError(`Error: ${error.message}`);
    }
  }

  async handleRetryFailedPlugin(url) {
    try {
      this.logger.log(`Retrying failed plugin: ${url}`);
      this.logger.showInfo("Retrying plugin load...");

      // Remove from failed set
      window.customjs.pluginManager.failedUrls.delete(url);

      // Try loading again
      const result = await window.customjs.pluginManager.addPlugin(url);

      if (result.success) {
        this.logger.showSuccess("Plugin loaded successfully!");
        setTimeout(() => this.refreshPluginList(), 500);
      } else {
        this.logger.showError(`Failed again: ${result.message}`);
      }
    } catch (error) {
      this.logger.error("Error retrying plugin:", error);
      this.logger.showError(`Error: ${error.message}`);
    }
  }

  handleShowSettings(plugin) {
    // Check if plugin has settings (either PluginSetting instances or raw localStorage)
    const hasConfigDefinitions =
      plugin.config && Object.keys(plugin.config).length > 0;
    const storedSettings =
      window.customjs?.configManager?.getPluginConfig(plugin.metadata.id) || {};
    const hasStoredSettings = Object.keys(storedSettings).length > 0;

    if (!hasConfigDefinitions && !hasStoredSettings) {
      this.logger.showWarn("This plugin has no configurable settings");
      return;
    }

    this.showSettingsModal(plugin);
  }

  showSettingsModal(plugin) {
    // Remove existing modal if any
    if (this.settingsModal) {
      this.settingsModal.remove();
      this.settingsModal = null;
    }

    // Create modal overlay
    const overlay = document.createElement("div");
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      backdrop-filter: blur(2px);
    `;

    // Create modal container
    const modal = document.createElement("div");
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 700px;
      max-height: 80vh;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    `;

    // Create header
    const header = document.createElement("div");
    header.style.cssText = `
      padding: 20px 25px;
      border-bottom: 1px solid #e9ecef;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    `;
    header.innerHTML = `
      <h3 style="margin: 0; font-size: 20px; font-weight: 600;">
        <i class="ri-settings-3-line"></i> ${plugin.metadata.name} Settings
      </h3>
      <p style="margin: 5px 0 0 0; font-size: 13px; opacity: 0.9;">
        Configure plugin settings • Changes are saved automatically
      </p>
    `;

    // Create content area
    const content = document.createElement("div");
    content.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 20px 25px;
    `;

    // Build settings UI
    content.appendChild(this.buildSettingsUI(plugin));

    // Create footer
    const footer = document.createElement("div");
    footer.style.cssText = `
      padding: 15px 25px;
      border-top: 1px solid #e9ecef;
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #f8f9fa;
    `;

    const infoText = document.createElement("span");
    infoText.style.cssText = "font-size: 12px; color: #6c757d;";
    infoText.textContent = "Settings are automatically saved";

    const buttonGroup = document.createElement("div");
    buttonGroup.style.cssText = "display: flex; gap: 10px;";

    const resetBtn = document.createElement("button");
    resetBtn.className = "el-button el-button--small el-button--warning";
    resetBtn.innerHTML = '<i class="ri-restart-line"></i> Reset to Defaults';

    const closeBtn = document.createElement("button");
    closeBtn.className = "el-button el-button--small el-button--primary";
    closeBtn.innerHTML = '<i class="ri-close-line"></i> Close';

    buttonGroup.appendChild(resetBtn);
    buttonGroup.appendChild(closeBtn);

    footer.appendChild(infoText);
    footer.appendChild(buttonGroup);

    // Assemble modal
    modal.appendChild(header);
    modal.appendChild(content);
    modal.appendChild(footer);
    overlay.appendChild(modal);

    // Event handlers
    this.registerListener(closeBtn, "click", () => {
      overlay.remove();
      this.settingsModal = null;
    });

    this.registerListener(resetBtn, "click", async () => {
      if (
        confirm(
          `Reset all settings for "${plugin.metadata.name}" to their default values?`
        )
      ) {
        // Clear all settings for this plugin
        plugin.clearAllSettings();
        this.logger.showSuccess("Settings cleared (will use defaults)");
        // Refresh the modal
        content.innerHTML = "";
        content.appendChild(this.buildSettingsUI(plugin));
      }
    });

    this.registerListener(overlay, "click", (e) => {
      if (e.target === overlay) {
        overlay.remove();
        this.settingsModal = null;
      }
    });

    // Add to DOM
    document.body.appendChild(overlay);
    this.settingsModal = overlay;
  }

  buildSettingsUI(plugin) {
    const container = document.createElement("div");

    // Try to use PluginSetting definitions from plugin.config first (has metadata)
    if (plugin.config && Object.keys(plugin.config).length > 0) {
      // Group PluginSettings by category
      const categorized = {};

      Object.entries(plugin.config).forEach(([configKey, settingInstance]) => {
        if (settingInstance instanceof window.customjs.PluginSetting) {
          const category = settingInstance.category || "general";
          if (!categorized[category]) {
            categorized[category] = [];
          }
          categorized[category].push(settingInstance);
        }
      });

      if (Object.keys(categorized).length > 0) {
        // Render with metadata from PluginSetting instances
        Object.entries(categorized).forEach(([categoryKey, settingsArray]) => {
          this.renderCategoryWithMetadata(
            container,
            categoryKey,
            settingsArray
          );
        });
        return container;
      }
    }

    // Fallback: Get all settings from localStorage as nested object (no metadata)
    const allSettings =
      window.customjs.configManager.getPluginConfig(plugin.metadata.id) || {};

    if (Object.keys(allSettings).length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #6c757d;">
          <i class="ri-inbox-line" style="font-size: 48px; opacity: 0.5;"></i>
          <p style="margin-top: 15px; font-size: 14px;">This plugin has no configurable settings</p>
        </div>
      `;
      return container;
    }

    // Render each category (top-level keys) - raw localStorage without metadata
    Object.entries(allSettings).forEach(([categoryKey, categorySettings]) => {
      // Category header
      const categoryHeader = document.createElement("div");
      categoryHeader.style.cssText = `
        margin-bottom: 20px;
        padding-bottom: 10px;
        border-bottom: 2px solid #e9ecef;
      `;
      categoryHeader.innerHTML = `
        <h4 style="margin: 0 0 5px 0; font-size: 16px; font-weight: 600; color: #212529;">
          ${this.formatCategoryName(categoryKey)}
        </h4>
      `;
      container.appendChild(categoryHeader);

      // Settings in category
      const settingsContainer = document.createElement("div");
      settingsContainer.style.cssText =
        "display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px;";

      // Render each setting in the category
      if (
        typeof categorySettings === "object" &&
        !Array.isArray(categorySettings)
      ) {
        Object.entries(categorySettings).forEach(
          ([settingKey, settingValue]) => {
            const settingRow = this.createSettingInput(
              plugin,
              categoryKey,
              settingKey,
              settingValue
            );
            settingsContainer.appendChild(settingRow);
          }
        );
      }

      container.appendChild(settingsContainer);
    });

    return container;
  }

  /**
   * Render category with PluginSetting metadata
   * @param {HTMLElement} container - Container to append to
   * @param {string} categoryKey - Category key
   * @param {PluginSetting[]} settingsArray - Array of PluginSetting instances
   */
  renderCategoryWithMetadata(container, categoryKey, settingsArray) {
    // Category header
    const categoryHeader = document.createElement("div");
    categoryHeader.style.cssText = `
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 2px solid #e9ecef;
    `;
    categoryHeader.innerHTML = `
      <h4 style="margin: 0 0 5px 0; font-size: 16px; font-weight: 600; color: #212529;">
        ${this.formatCategoryName(categoryKey)}
      </h4>
    `;
    container.appendChild(categoryHeader);

    // Settings in category
    const settingsContainer = document.createElement("div");
    settingsContainer.style.cssText =
      "display: flex; flex-direction: column; gap: 15px; margin-bottom: 30px;";

    settingsArray.forEach((setting) => {
      const settingRow = this.createSettingInputWithMetadata(setting);
      settingsContainer.appendChild(settingRow);
    });

    container.appendChild(settingsContainer);
  }

  /**
   * Create setting input using PluginSetting metadata
   * @param {PluginSetting} setting - PluginSetting instance
   * @returns {HTMLElement} Setting row
   */
  createSettingInputWithMetadata(setting) {
    const row = document.createElement("div");
    row.style.cssText = `
      display: flex;
      align-items: center;
      padding: 12px 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    `;

    // Label section (with metadata)
    const labelSection = document.createElement("div");
    labelSection.style.cssText = "flex: 1; min-width: 0;";

    const label = document.createElement("div");
    label.style.cssText =
      "font-size: 14px; font-weight: 500; color: #212529; margin-bottom: 3px;";
    label.textContent = setting.name;

    const description = document.createElement("div");
    description.style.cssText = "font-size: 12px; color: #6c757d;";
    description.textContent = setting.description || "";

    const keyInfo = document.createElement("div");
    keyInfo.style.cssText =
      "font-size: 11px; color: #adb5bd; font-family: monospace; margin-top: 2px;";
    keyInfo.textContent = setting.toKey();

    labelSection.appendChild(label);
    if (setting.description) {
      labelSection.appendChild(description);
    }
    labelSection.appendChild(keyInfo);

    // Input section
    const inputSection = document.createElement("div");
    inputSection.style.cssText = "margin-left: 15px; min-width: 200px;";

    const input = this.createInputForType(setting);
    inputSection.appendChild(input);

    row.appendChild(labelSection);
    row.appendChild(inputSection);

    return row;
  }

  /**
   * Create input element for PluginSetting based on type
   * @param {PluginSetting} setting - PluginSetting instance
   * @returns {HTMLElement} Input element
   */
  createInputForType(setting) {
    const currentValue = setting.get();

    switch (setting.type) {
      case "boolean":
        return this.createBooleanInputFor(setting, currentValue);
      case "number":
        return this.createNumberInputFor(setting, currentValue);
      case "string":
        return this.createStringInputFor(setting, currentValue);
      case "array":
      case "object":
        return this.createJsonInputFor(setting, currentValue);
      default:
        const span = document.createElement("span");
        span.textContent = `Unsupported type: ${setting.type}`;
        span.style.cssText = "color: #f56c6c; font-size: 13px;";
        return span;
    }
  }

  createBooleanInputFor(setting, currentValue) {
    const label = document.createElement("label");
    label.className = "el-switch";
    label.style.cssText = "cursor: pointer;";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = currentValue;
    checkbox.style.cssText = "display: none;";

    const core = document.createElement("span");
    core.style.cssText = `
      display: inline-block;
      position: relative;
      width: 40px;
      height: 20px;
      border-radius: 10px;
      background: ${currentValue ? "#409eff" : "#dcdfe6"};
      transition: background-color 0.3s;
      cursor: pointer;
    `;

    const action = document.createElement("span");
    action.style.cssText = `
      position: absolute;
      top: 1px;
      left: ${currentValue ? "21px" : "1px"};
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      transition: all 0.3s;
    `;

    core.appendChild(action);
    label.appendChild(checkbox);
    label.appendChild(core);

    this.registerListener(label, "click", () => {
      const newValue = !setting.get();
      setting.set(newValue);
      checkbox.checked = newValue;
      core.style.background = newValue ? "#409eff" : "#dcdfe6";
      action.style.left = newValue ? "21px" : "1px";
      this.logger.log(`Updated ${setting.name} to ${newValue}`);
    });

    return label;
  }

  createNumberInputFor(setting, currentValue) {
    const input = document.createElement("input");
    input.type = "number";
    input.className = "el-input__inner";
    input.value = currentValue;
    input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
    `;

    this.registerListener(input, "change", () => {
      const newValue = parseFloat(input.value);
      if (!isNaN(newValue)) {
        setting.set(newValue);
        this.logger.log(`Updated ${setting.name} to ${newValue}`);
      }
    });

    return input;
  }

  createStringInputFor(setting, currentValue) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "el-input__inner";
    input.value = currentValue || "";
    input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 14px;
    `;

    this.registerListener(input, "change", () => {
      setting.set(input.value);
      this.logger.log(`Updated ${setting.name} to ${input.value}`);
    });

    return input;
  }

  createJsonInputFor(setting, currentValue) {
    const input = document.createElement("textarea");
    input.className = "el-textarea__inner";
    input.value = JSON.stringify(currentValue, null, 2);
    input.rows = 4;
    input.style.cssText = `
      width: 100%;
      padding: 8px 12px;
      border: 1px solid #dcdfe6;
      border-radius: 4px;
      font-size: 13px;
      font-family: 'Consolas', monospace;
      resize: vertical;
    `;

    this.registerListener(input, "change", () => {
      try {
        const newValue = JSON.parse(input.value);
        setting.set(newValue);
        input.style.borderColor = "#dcdfe6";
        this.logger.log(`Updated ${setting.name}`);
      } catch (error) {
        input.style.borderColor = "#f56c6c";
        this.logger.showError("Invalid JSON format");
      }
    });

    return input;
  }

  /**
   * Format category name for display
   * @param {string} key - Category key
   * @returns {string} Formatted name
   */
  formatCategoryName(key) {
    // Convert camelCase or snake_case to Title Case
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Format setting name for display
   * @param {string} key - Setting key
   * @returns {string} Formatted name
   */
  formatSettingName(key) {
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Infer type from value
   * @param {any} value - Value to check
   * @returns {string} Type name
   */
  inferType(value) {
    if (value === null || value === undefined) return "string";
    if (typeof value === "boolean") return "boolean";
    if (typeof value === "number") return "number";
    if (Array.isArray(value)) return "array";
    if (typeof value === "object") return "object";
    return "string";
  }

  createSettingInput(plugin, categoryKey, settingKey, settingValue) {
    const row = document.createElement("div");
    row.style.cssText = `
      display: flex;
      align-items: center;
      padding: 12px 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #dee2e6;
    `;

    // Label section
    const labelSection = document.createElement("div");
    labelSection.style.cssText = "flex: 1; min-width: 0;";

    const label = document.createElement("div");
    label.style.cssText =
      "font-size: 14px; font-weight: 500; color: #212529; margin-bottom: 3px;";
    label.textContent = this.formatSettingName(settingKey);

    const description = document.createElement("div");
    description.style.cssText =
      "font-size: 12px; color: #6c757d; font-family: monospace;";
    description.textContent = `${categoryKey}.${settingKey}`;

    labelSection.appendChild(label);
    labelSection.appendChild(description);

    // Input section
    const inputSection = document.createElement("div");
    inputSection.style.cssText = "margin-left: 15px; min-width: 200px;";

    let input;
    const settingType = this.inferType(settingValue);

    switch (settingType) {
      case "boolean":
        input = document.createElement("label");
        input.className = "el-switch";
        input.style.cssText = "cursor: pointer;";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.className = "el-switch__input";
        checkbox.checked = settingValue;
        checkbox.style.cssText = "display: none;";

        const core = document.createElement("span");
        core.className = "el-switch__core";
        core.style.cssText = `
          display: inline-block;
          position: relative;
          width: 40px;
          height: 20px;
          border-radius: 10px;
          background: ${settingValue ? "#409eff" : "#dcdfe6"};
          transition: background-color 0.3s;
          cursor: pointer;
        `;

        const action = document.createElement("span");
        action.className = "el-switch__action";
        action.style.cssText = `
          position: absolute;
          top: 1px;
          left: ${settingValue ? "21px" : "1px"};
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: white;
          transition: all 0.3s;
        `;

        core.appendChild(action);
        input.appendChild(checkbox);
        input.appendChild(core);

        this.registerListener(input, "click", async () => {
          const newValue = !plugin.get(`${categoryKey}.${settingKey}`, false);
          plugin.set(`${categoryKey}.${settingKey}`, newValue);
          checkbox.checked = newValue;
          core.style.background = newValue ? "#409eff" : "#dcdfe6";
          action.style.left = newValue ? "21px" : "1px";
          this.logger.log(`Updated ${settingKey} to ${newValue}`);
        });
        break;

      case "number":
        input = document.createElement("input");
        input.type = "number";
        input.className = "el-input__inner";
        input.value = settingValue;
        input.style.cssText = `
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #dcdfe6;
          border-radius: 4px;
          font-size: 14px;
        `;

        this.registerListener(input, "change", async () => {
          const newValue = parseFloat(input.value);
          if (!isNaN(newValue)) {
            plugin.set(`${categoryKey}.${settingKey}`, newValue);
            this.logger.log(`Updated ${settingKey} to ${newValue}`);
          }
        });
        break;

      case "string":
        input = document.createElement("input");
        input.type = "text";
        input.className = "el-input__inner";
        input.value = settingValue;
        input.style.cssText = `
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #dcdfe6;
          border-radius: 4px;
          font-size: 14px;
        `;

        this.registerListener(input, "change", async () => {
          plugin.set(`${categoryKey}.${settingKey}`, input.value);
          this.logger.log(`Updated ${settingKey} to ${input.value}`);
        });
        break;

      case "array":
      case "object":
        input = document.createElement("textarea");
        input.className = "el-textarea__inner";
        input.value = JSON.stringify(settingValue, null, 2);
        input.rows = 4;
        input.style.cssText = `
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #dcdfe6;
          border-radius: 4px;
          font-size: 13px;
          font-family: 'Consolas', monospace;
          resize: vertical;
        `;

        this.registerListener(input, "change", async () => {
          try {
            const newValue = JSON.parse(input.value);
            plugin.set(`${categoryKey}.${settingKey}`, newValue);
            input.style.borderColor = "#dcdfe6";
            this.logger.log(`Updated ${settingKey}`);
          } catch (error) {
            input.style.borderColor = "#f56c6c";
            this.logger.showError("Invalid JSON format");
          }
        });
        break;

      default:
        input = document.createElement("span");
        input.textContent = `Unsupported type: ${settingType}`;
        input.style.cssText = "color: #f56c6c; font-size: 13px;";
    }

    inputSection.appendChild(input);

    row.appendChild(labelSection);
    row.appendChild(inputSection);

    return row;
  }
}

// Export plugin class for PluginManager
window.customjs.__LAST_PLUGIN_CLASS__ = PluginManagerUIPlugin;
