class PluginManagerUIPlugin extends Plugin {
  constructor() {
    super({
      name: "Plugin Manager UI",
      description:
        "Visual UI for managing VRCX custom plugins - Equicord inspired",
      author: "Bluscream",
      version: "6.0.0",
      build: "1734091200",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/nav-menu-api.js",
      ],
    });

    this.contentContainer = null;
    this.settingsModal = null;
    this.searchValue = { value: "", filter: "all" }; // all, enabled, disabled, core, failed, new
    this.visibleCount = 12;
    this.pluginsPerPage = 12;
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
            this.refreshPluginGrid();
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

      // Stats cards section
      const statsSection = this.createStatsSection();
      container.appendChild(statsSection);

      // Load plugin section
      const loadSection = this.createLoadPluginSection();
      container.appendChild(loadSection);

      // Filter section
      const filterSection = this.createFilterSection();
      container.appendChild(filterSection);

      // Plugin grid container
      const pluginGrid = document.createElement("div");
      pluginGrid.id = "plugin-grid-container";
      pluginGrid.className = "vc-plugins-grid";
      container.appendChild(pluginGrid);

      // Defer refresh to ensure container is in DOM
      setTimeout(() => this.refreshPluginGrid(), 0);
    } catch (error) {
      this.logger.error("Error rendering plugin manager content:", error);
      const errorDiv = document.createElement("div");
      errorDiv.style.cssText =
        "padding: 20px; text-align: center; color: #dc3545;";

      const errorTitle = document.createElement("h3");
      errorTitle.textContent = "❌ Error Loading Plugin Manager";

      const errorMsg = document.createElement("p");
      errorMsg.textContent = error.message;

      const reloadBtn = document.createElement("button");
      reloadBtn.className = "el-button el-button--primary";
      reloadBtn.innerHTML = '<i class="ri-restart-line"></i> Reload VRCX';
      this.registerListener(reloadBtn, "click", () => location.reload());

      errorDiv.appendChild(errorTitle);
      errorDiv.appendChild(errorMsg);
      errorDiv.appendChild(reloadBtn);
      container.appendChild(errorDiv);
    }
  }

  createStatsSection() {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom: 20px;";

    // Title
    const title = document.createElement("h2");
    title.style.cssText =
      "margin: 0 0 16px 0; font-size: 24px; font-weight: 600;";
    title.textContent = "🔌 Plugin Management";
    section.appendChild(title);

    // Stats container
    const statsContainer = document.createElement("div");
    statsContainer.style.cssText =
      "display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px;";

    // Get plugin data
    const allPlugins = window.customjs?.plugins || [];
    const coreModules = window.customjs?.core_modules || [];
    const failedUrls = window.customjs?.pluginManager?.failedUrls || new Set();

    const enabledCount = allPlugins.filter((p) => p.enabled).length;
    const startedCount = allPlugins.filter((p) => p.started).length;

    // Create stat cards
    const stats = [
      { label: "Core Modules", value: coreModules.length, color: "#17a2b8" },
      { label: "Total Plugins", value: allPlugins.length, color: "#28a745" },
      { label: "Enabled", value: enabledCount, color: "#007bff" },
      { label: "Started", value: startedCount, color: "#6f42c1" },
      { label: "Failed", value: failedUrls.size, color: "#dc3545" },
    ];

    stats.forEach((stat) => {
      const card = this.createStatCard(stat.label, stat.value, stat.color);
      statsContainer.appendChild(card);
    });

    section.appendChild(statsContainer);
    return section;
  }

  createStatCard(label, value, color) {
    const card = document.createElement("div");
    card.style.cssText = `
      text-align: center;
      padding: 16px;
      background: linear-gradient(135deg, ${color} 0%, ${window.customjs.utils.darkenColor(
      color,
      20
    )} 100%);
      border-radius: 8px;
      color: white;
      box-shadow: 0 2px 8px ${window.customjs.utils.hexToRgba(color, 0.3)};
      transition: transform 0.2s;
    `;

    const valueEl = document.createElement("div");
    valueEl.style.cssText = "font-size: 28px; font-weight: bold;";
    valueEl.textContent = value;

    const labelEl = document.createElement("div");
    labelEl.style.cssText = "font-size: 12px; opacity: 0.9; margin-top: 4px;";
    labelEl.textContent = label;

    card.appendChild(valueEl);
    card.appendChild(labelEl);

    // Hover effect
    this.registerListener(card, "mouseenter", () => {
      card.style.transform = "translateY(-2px)";
    });
    this.registerListener(card, "mouseleave", () => {
      card.style.transform = "translateY(0)";
    });

    return card;
  }

  createFilterSection() {
    const section = document.createElement("div");
    section.style.cssText = "margin-bottom: 20px;";

    // Title
    const title = document.createElement("h5");
    title.style.cssText =
      "margin: 0 0 12px 0; font-size: 16px; font-weight: 600;";
    title.textContent = "Filters";
    section.appendChild(title);

    // Filter controls container
    const controlsContainer = document.createElement("div");
    controlsContainer.style.cssText =
      "display: flex; gap: 12px; margin-bottom: 16px;";

    // Search input
    const searchInput = document.createElement("input");
    searchInput.type = "text";
    searchInput.placeholder = "Search for a plugin...";
    searchInput.className = "el-input__inner";
    searchInput.style.cssText =
      "flex: 1; padding: 8px 12px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 14px;";
    searchInput.value = this.searchValue.value;

    this.registerListener(searchInput, "input", (e) => {
      this.searchValue.value = e.target.value.toLowerCase();
      this.refreshPluginGrid();
    });

    // Filter dropdown
    const filterSelect = document.createElement("select");
    filterSelect.className = "el-select";
    filterSelect.style.cssText =
      "padding: 8px 32px 8px 12px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 14px; min-width: 150px; background: white; cursor: pointer;";

    const filters = [
      { value: "all", label: "Show All" },
      { value: "enabled", label: "Show Enabled" },
      { value: "disabled", label: "Show Disabled" },
      { value: "core", label: "Show Core" },
      { value: "failed", label: "Show Failed" },
    ];

    filters.forEach((filter) => {
      const option = document.createElement("option");
      option.value = filter.value;
      option.textContent = filter.label;
      if (filter.value === this.searchValue.filter) {
        option.selected = true;
      }
      filterSelect.appendChild(option);
    });

    this.registerListener(filterSelect, "change", (e) => {
      this.searchValue.filter = e.target.value;
      this.refreshPluginGrid();
    });

    controlsContainer.appendChild(searchInput);
    controlsContainer.appendChild(filterSelect);
    section.appendChild(controlsContainer);

    return section;
  }

  createLoadPluginSection() {
    const section = document.createElement("div");
    section.style.cssText = `
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      border: 2px dashed #dee2e6;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
    `;

    // Title with icon
    const titleContainer = document.createElement("h3");
    titleContainer.style.cssText =
      "margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center;";

    const icon = document.createElement("i");
    icon.className = "ri-download-cloud-line";
    icon.style.cssText = "color: #007bff; margin-right: 8px; font-size: 20px;";

    const titleText = document.createTextNode("Load Plugin from URL");

    titleContainer.appendChild(icon);
    titleContainer.appendChild(titleText);
    section.appendChild(titleContainer);

    // Input container
    const inputContainer = document.createElement("div");
    inputContainer.style.cssText =
      "display: flex; gap: 10px; margin-bottom: 10px;";

    const urlInput = document.createElement("input");
    urlInput.type = "text";
    urlInput.id = "plugin-url-input";
    urlInput.placeholder =
      "https://github.com/USER/REPO/raw/refs/heads/main/js/plugins/my-plugin.js";
    urlInput.className = "el-input__inner";
    urlInput.style.cssText =
      "flex: 1; padding: 10px 15px; border: 2px solid #ced4da; border-radius: 6px; font-size: 14px; font-family: 'Consolas', monospace;";

    const loadButton = document.createElement("button");
    loadButton.id = "load-plugin-btn";
    loadButton.className = "el-button el-button--primary";
    loadButton.style.cssText = "padding: 10px 20px;";
    loadButton.innerHTML = '<i class="ri-download-line"></i> Load';

    inputContainer.appendChild(urlInput);
    inputContainer.appendChild(loadButton);
    section.appendChild(inputContainer);

    // Status message
    const statusDiv = document.createElement("div");
    statusDiv.id = "load-plugin-status";
    statusDiv.style.cssText =
      "margin-top: 10px; font-size: 13px; color: #6c757d;";
    section.appendChild(statusDiv);

    // Quick access info
    const infoDiv = document.createElement("div");
    infoDiv.style.cssText =
      "margin-top: 15px; padding: 10px; background: #fff; border-radius: 6px; border: 1px solid #dee2e6;";

    const infoContent = document.createElement("div");
    infoContent.style.cssText =
      "font-size: 12px; color: #666; line-height: 1.6;";

    const createCodeTag = (text) => {
      const code = document.createElement("code");
      code.style.cssText =
        "background: #f8f9fa; padding: 2px 6px; border-radius: 3px;";
      code.textContent = text;
      return code;
    };

    const infoTitle = document.createElement("strong");
    infoTitle.textContent = "Quick Access:";
    infoContent.appendChild(infoTitle);
    infoContent.appendChild(document.createElement("br"));

    const quickAccessItems = [
      "customjs.core_modules - Core module URLs",
      "customjs.plugins - Plugin instances",
      "customjs.subscriptions - Pinia subscriptions",
      "customjs.config - Configuration",
      "customjs.pluginManager - Plugin manager",
      "customjs.configManager - Config manager",
    ];

    quickAccessItems.forEach((item, idx) => {
      const parts = item.split(" - ");
      infoContent.appendChild(createCodeTag(parts[0]));
      infoContent.appendChild(document.createTextNode(" - " + parts[1]));
      if (idx < quickAccessItems.length - 1) {
        infoContent.appendChild(document.createElement("br"));
      }
    });

    infoDiv.appendChild(infoContent);
    section.appendChild(infoDiv);

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
        setTimeout(() => this.refreshPluginGrid(), 500);
      } else {
        status.textContent = `❌ Failed to load: ${result.message}`;
        status.style.color = "#dc3545";
      }
    } catch (error) {
      status.textContent = `❌ Error: ${error.message}`;
      status.style.color = "#dc3545";
    }
  }

  refreshPluginGrid() {
    try {
      const gridContainer = this.contentContainer?.querySelector(
        "#plugin-grid-container"
      );
      if (!gridContainer) {
        this.logger.warn("Plugin grid container not found");
        return;
      }

      gridContainer.innerHTML = "";

      // Get all plugins and apply filters
      const allPlugins = window.customjs?.plugins || [];
      const coreModules = window.customjs?.core_modules || [];
      const failedUrls =
        window.customjs?.pluginManager?.failedUrls || new Set();

      // Filter plugins
      const filteredPlugins = this.filterPlugins(
        allPlugins,
        coreModules,
        failedUrls
      );

      // Reset visible count when filter changes
      this.visibleCount = Math.min(this.pluginsPerPage, filteredPlugins.length);

      // Create title for plugins section
      const pluginsTitle = document.createElement("h5");
      pluginsTitle.style.cssText =
        "margin: 0 0 16px 0; font-size: 16px; font-weight: 600;";
      pluginsTitle.textContent = `Plugins (${filteredPlugins.length})`;
      gridContainer.appendChild(pluginsTitle);

      // Create grid
      const grid = document.createElement("div");
      grid.style.cssText =
        "display: grid; grid-template-columns: repeat(auto-fill, minmax(400px, 1fr)); gap: 16px; margin-bottom: 20px;";

      if (filteredPlugins.length === 0) {
        const noResults = document.createElement("div");
        noResults.style.cssText =
          "padding: 40px; text-align: center; color: #6c757d;";
        noResults.textContent = "No plugins meet the search criteria.";
        gridContainer.appendChild(noResults);
        return;
      }

      // Show only visible plugins
      const visiblePlugins = filteredPlugins.slice(0, this.visibleCount);
      visiblePlugins.forEach((plugin) => {
        const card = this.createPluginCard(plugin);
        grid.appendChild(card);
      });

      gridContainer.appendChild(grid);

      // Load more button if needed
      if (this.visibleCount < filteredPlugins.length) {
        const loadMoreBtn = document.createElement("button");
        loadMoreBtn.className = "el-button el-button--default";
        loadMoreBtn.style.cssText = "width: 100%; margin-top: 16px;";
        loadMoreBtn.textContent = `Load More (${
          filteredPlugins.length - this.visibleCount
        } remaining)`;

        this.registerListener(loadMoreBtn, "click", () => {
          this.visibleCount = Math.min(
            this.visibleCount + this.pluginsPerPage,
            filteredPlugins.length
          );
          this.refreshPluginGrid();
        });

        gridContainer.appendChild(loadMoreBtn);
      }
    } catch (error) {
      this.logger.error("Error refreshing plugin grid:", error);
    }
  }

  filterPlugins(allPlugins, coreModules, failedUrls) {
    const { value: search, filter } = this.searchValue;

    let plugins = [...allPlugins];

    // Apply filter
    if (filter === "enabled") {
      plugins = plugins.filter((p) => p.enabled);
    } else if (filter === "disabled") {
      plugins = plugins.filter((p) => !p.enabled);
    } else if (filter === "core") {
      // Return empty for core since we show them separately if needed
      plugins = [];
    } else if (filter === "failed") {
      plugins = [];
    }

    // Apply search
    if (search) {
      plugins = plugins.filter(
        (p) =>
          p.metadata.name.toLowerCase().includes(search) ||
          p.metadata.description.toLowerCase().includes(search) ||
          p.metadata.id.toLowerCase().includes(search)
      );
    }

    // Sort alphabetically
    plugins.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));

    return plugins;
  }

  createPluginCard(plugin) {
    const card = document.createElement("div");
    card.className = "vc-plugin-card";
    card.style.cssText = `
      background: white;
      border: 2px solid ${plugin.enabled ? "#28a745" : "#6c757d"};
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
    `;

    // Header with name, switch, and info button
    const header = document.createElement("div");
    header.style.cssText =
      "display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;";

    // Name and author section
    const nameSection = document.createElement("div");
    nameSection.style.cssText = "flex: 1; min-width: 0;";

    const name = document.createElement("div");
    name.style.cssText =
      "font-size: 16px; font-weight: 600; color: #212529; margin-bottom: 4px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;";
    name.textContent = plugin.metadata?.name || "Unknown Plugin";

    const meta = document.createElement("div");
    meta.style.cssText =
      "font-size: 11px; color: #6c757d; font-family: monospace;";
    meta.textContent = `v${plugin.metadata?.version || "0.0.0"}`;

    nameSection.appendChild(name);
    nameSection.appendChild(meta);

    // Info button
    const infoBtn = document.createElement("button");
    infoBtn.className = "el-button el-button--small";
    infoBtn.style.cssText = "margin: 0 8px;";
    infoBtn.innerHTML = '<i class="ri-information-line"></i>';
    this.registerListener(infoBtn, "click", (e) => {
      e.stopPropagation();
      this.handleShowDetails(plugin);
    });

    // Toggle switch
    const switchContainer = document.createElement("label");
    switchContainer.className = "el-switch";
    switchContainer.style.cssText =
      "cursor: pointer; display: flex; align-items: center;";

    const switchInput = document.createElement("input");
    switchInput.type = "checkbox";
    switchInput.checked = plugin.enabled;
    switchInput.style.display = "none";

    const switchCore = document.createElement("span");
    switchCore.style.cssText = `
      display: inline-block;
      position: relative;
      width: 40px;
      height: 20px;
      border-radius: 10px;
      background: ${plugin.enabled ? "#409eff" : "#dcdfe6"};
      transition: background-color 0.3s;
      cursor: pointer;
    `;

    const switchAction = document.createElement("span");
    switchAction.style.cssText = `
      position: absolute;
      top: 1px;
      left: ${plugin.enabled ? "21px" : "1px"};
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: white;
      transition: all 0.3s;
    `;

    switchCore.appendChild(switchAction);
    switchContainer.appendChild(switchInput);
    switchContainer.appendChild(switchCore);

    this.registerListener(switchContainer, "click", async (e) => {
      e.stopPropagation();
      await this.handleTogglePlugin(plugin.metadata.id);
    });

    header.appendChild(nameSection);
    header.appendChild(infoBtn);
    header.appendChild(switchContainer);

    // Description
    const description = document.createElement("div");
    description.style.cssText =
      "font-size: 13px; color: #666; line-height: 1.4; margin-bottom: 12px; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;";
    description.textContent =
      plugin.metadata?.description || "No description available";

    // Status badges
    const badgesContainer = document.createElement("div");
    badgesContainer.style.cssText =
      "display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 12px;";

    if (plugin.loaded) {
      const badge = this.createBadge("Loaded", "#28a745");
      badgesContainer.appendChild(badge);
    }
    if (plugin.started) {
      const badge = this.createBadge("Started", "#007bff");
      badgesContainer.appendChild(badge);
    }
    if (plugin.enabled) {
      const badge = this.createBadge("Enabled", "#6f42c1");
      badgesContainer.appendChild(badge);
    }

    // Action buttons
    const actions = document.createElement("div");
    actions.style.cssText =
      "display: flex; gap: 8px; margin-top: auto; padding-top: 12px; border-top: 1px solid #e9ecef;";

    const reloadBtn = document.createElement("button");
    reloadBtn.className = "el-button el-button--small el-button--info";
    reloadBtn.style.cssText = "flex: 1;";
    reloadBtn.innerHTML = '<i class="ri-restart-line"></i> Reload';
    this.registerListener(reloadBtn, "click", async (e) => {
      e.stopPropagation();
      await this.handleReloadPlugin(plugin.metadata.url);
    });

    const removeBtn = document.createElement("button");
    removeBtn.className = "el-button el-button--small el-button--danger";
    removeBtn.innerHTML = '<i class="ri-delete-bin-line"></i>';
    this.registerListener(removeBtn, "click", async (e) => {
      e.stopPropagation();
      await this.handleRemovePlugin(plugin.metadata.url);
    });

    actions.appendChild(reloadBtn);
    actions.appendChild(removeBtn);

    // Assemble card
    card.appendChild(header);
    card.appendChild(description);
    if (badgesContainer.children.length > 0) {
      card.appendChild(badgesContainer);
    }
    card.appendChild(actions);

    // Hover effects
    this.registerListener(card, "mouseenter", () => {
      card.style.boxShadow = "0 4px 12px rgba(0,0,0,0.15)";
      card.style.transform = "translateY(-2px)";
    });

    this.registerListener(card, "mouseleave", () => {
      card.style.boxShadow = "0 2px 4px rgba(0,0,0,0.1)";
      card.style.transform = "translateY(0)";
    });

    return card;
  }

  createBadge(text, color) {
    const badge = document.createElement("span");
    badge.style.cssText = `
      background: ${color};
      color: white;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
    `;
    badge.textContent = text;
    return badge;
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
      }

      setTimeout(() => this.refreshPluginGrid(), 100);

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
        setTimeout(() => this.refreshPluginGrid(), 500);
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
    // Check if plugin has settings
    const hasSettings =
      plugin.settings?.def && Object.keys(plugin.settings.def).length > 0;

    if (hasSettings) {
      // Show settings modal
      this.showSettingsModal(plugin);
    } else {
      // Just dump to console and open devtools
      console.log(plugin); // eslint-disable-line no-console
      if (window.AppApi?.ShowDevTools) {
        window.AppApi.ShowDevTools();
      }
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
        setTimeout(() => this.refreshPluginGrid(), 500);
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
        setTimeout(() => this.refreshPluginGrid(), 500);
      } else {
        this.logger.showError(`Failed again: ${result.message}`);
      }
    } catch (error) {
      this.logger.error("Error retrying plugin:", error);
      this.logger.showError(`Error: ${error.message}`);
    }
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
        // Reset settings using new API if available
        if (plugin.settings?.resetAll) {
          plugin.settings.resetAll();
        } else {
          // Legacy: clear all settings
          plugin.clearAllSettings();
        }
        this.logger.showSuccess("Settings reset to defaults");
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
    container.style.cssText = "padding: 12px 0;";

    // Check if plugin uses new definePluginSettings (has settings.def)
    if (plugin.settings?.def && Object.keys(plugin.settings.def).length > 0) {
      // New SettingsStore API
      const settingsDef = plugin.settings.def;
      const visibleSettings = {};

      // Filter out hidden settings
      for (const key in settingsDef) {
        if (!settingsDef[key].hidden) {
          visibleSettings[key] = settingsDef[key];
        }
      }

      if (Object.keys(visibleSettings).length === 0) {
        const noSettings = document.createElement("div");
        noSettings.style.cssText =
          "text-align: center; padding: 20px; color: #6c757d;";

        const icon = document.createElement("i");
        icon.className = "ri-inbox-line";
        icon.style.cssText =
          "font-size: 32px; opacity: 0.5; display: block; margin-bottom: 8px;";

        const text = document.createElement("p");
        text.style.cssText = "margin: 0; font-size: 13px;";
        text.textContent = "This plugin has no configurable settings";

        noSettings.appendChild(icon);
        noSettings.appendChild(text);
        container.appendChild(noSettings);
        return container;
      }

      // Render each setting
      Object.entries(visibleSettings).forEach(([key, settingDef]) => {
        const settingRow = this.createSettingRow(plugin, key, settingDef);
        container.appendChild(settingRow);
      });

      return container;
    }

    // No settings found
    const noSettings = document.createElement("div");
    noSettings.style.cssText =
      "text-align: center; padding: 20px; color: #6c757d;";

    const icon = document.createElement("i");
    icon.className = "ri-inbox-line";
    icon.style.cssText =
      "font-size: 32px; opacity: 0.5; display: block; margin-bottom: 8px;";

    const text = document.createElement("p");
    text.style.cssText = "margin: 0; font-size: 13px;";
    text.textContent = "This plugin has no configurable settings";

    noSettings.appendChild(icon);
    noSettings.appendChild(text);
    container.appendChild(noSettings);
    return container;
  }

  createSettingRow(plugin, key, settingDef) {
    const row = document.createElement("div");
    row.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 12px;
      background: #f8f9fa;
      border-radius: 6px;
      margin-bottom: 8px;
      border: 1px solid #dee2e6;
    `;

    // Label section
    const labelSection = document.createElement("div");
    labelSection.style.cssText = "flex: 1; min-width: 0; margin-right: 12px;";

    const label = document.createElement("div");
    label.style.cssText =
      "font-size: 13px; font-weight: 500; color: #212529; margin-bottom: 2px;";
    label.textContent = settingDef.description || key;

    if (settingDef.placeholder) {
      const placeholder = document.createElement("div");
      placeholder.style.cssText = "font-size: 11px; color: #6c757d;";
      placeholder.textContent = settingDef.placeholder;
      labelSection.appendChild(label);
      labelSection.appendChild(placeholder);
    } else {
      labelSection.appendChild(label);
    }

    // Input section
    const inputSection = document.createElement("div");
    inputSection.style.cssText =
      "min-width: 140px; display: flex; justify-content: flex-end;";

    const input = this.createInputForSetting(plugin, key, settingDef);
    inputSection.appendChild(input);

    row.appendChild(labelSection);
    row.appendChild(inputSection);

    return row;
  }

  createInputForSetting(plugin, key, settingDef) {
    const currentValue = plugin.settings.store[key];
    const SettingType = window.customjs.SettingType;

    switch (settingDef.type) {
      case SettingType.BOOLEAN:
        return this.createBooleanInput(plugin, key, currentValue);

      case SettingType.NUMBER:
      case SettingType.BIGINT:
        return this.createNumberInput(plugin, key, currentValue);

      case SettingType.STRING:
        return this.createStringInput(
          plugin,
          key,
          currentValue,
          settingDef.placeholder
        );

      case SettingType.SELECT:
        return this.createSelectInput(
          plugin,
          key,
          currentValue,
          settingDef.options || []
        );

      case SettingType.SLIDER:
        return this.createSliderInput(
          plugin,
          key,
          currentValue,
          settingDef.markers || []
        );

      default:
        const span = document.createElement("span");
        span.style.cssText = "color: #f56c6c; font-size: 12px;";
        span.textContent = `Unsupported type: ${settingDef.type}`;
        return span;
    }
  }

  createBooleanInput(plugin, key, currentValue) {
    const label = document.createElement("label");
    label.className = "el-switch";
    label.style.cssText =
      "cursor: pointer; display: flex; align-items: center;";

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = currentValue;
    checkbox.style.display = "none";

    const core = document.createElement("span");
    core.style.cssText = `
      display: inline-block;
      position: relative;
      width: 40px;
      height: 20px;
      border-radius: 10px;
      background: ${currentValue ? "#409eff" : "#dcdfe6"};
      transition: background-color 0.3s;
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
      const newValue = !plugin.settings.store[key];
      plugin.settings.store[key] = newValue;
      checkbox.checked = newValue;
      core.style.background = newValue ? "#409eff" : "#dcdfe6";
      action.style.left = newValue ? "21px" : "1px";
    });

    return label;
  }

  createNumberInput(plugin, key, currentValue) {
    const input = document.createElement("input");
    input.type = "number";
    input.className = "el-input__inner";
    input.value = currentValue ?? "";
    input.style.cssText =
      "width: 100%; padding: 6px 10px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 13px;";

    this.registerListener(input, "change", () => {
      const newValue = parseFloat(input.value);
      if (!isNaN(newValue)) {
        plugin.settings.store[key] = newValue;
      }
    });

    return input;
  }

  createStringInput(plugin, key, currentValue, placeholder) {
    const input = document.createElement("input");
    input.type = "text";
    input.className = "el-input__inner";
    input.value = currentValue || "";
    input.placeholder = placeholder || "";
    input.style.cssText =
      "width: 100%; padding: 6px 10px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 13px;";

    this.registerListener(input, "change", () => {
      plugin.settings.store[key] = input.value;
    });

    return input;
  }

  createSelectInput(plugin, key, currentValue, options) {
    const select = document.createElement("select");
    select.className = "el-select";
    select.style.cssText =
      "padding: 6px 28px 6px 10px; border: 1px solid #dcdfe6; border-radius: 4px; font-size: 13px; background: white; cursor: pointer;";

    options.forEach((opt) => {
      const option = document.createElement("option");
      option.value = opt.value;
      option.textContent = opt.label || opt.value;
      if (opt.value === currentValue || opt.default) {
        option.selected = true;
      }
      select.appendChild(option);
    });

    this.registerListener(select, "change", () => {
      plugin.settings.store[key] = select.value;
    });

    return select;
  }

  createSliderInput(plugin, key, currentValue, markers) {
    const container = document.createElement("div");
    container.style.cssText = "width: 100%; min-width: 120px;";

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = markers[0] ?? 0;
    slider.max = markers[markers.length - 1] ?? 1;
    slider.step = markers.length > 1 ? markers[1] - markers[0] : 0.1;
    slider.value = currentValue ?? markers[0] ?? 0;
    slider.style.cssText = "width: 100%; cursor: pointer;";

    const valueDisplay = document.createElement("div");
    valueDisplay.style.cssText =
      "text-align: center; font-size: 12px; color: #606266; margin-top: 4px;";
    valueDisplay.textContent = slider.value;

    this.registerListener(slider, "input", () => {
      valueDisplay.textContent = slider.value;
      plugin.settings.store[key] = parseFloat(slider.value);
    });

    container.appendChild(slider);
    container.appendChild(valueDisplay);

    return container;
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
}

// Export plugin class for PluginManager
window.customjs.__LAST_PLUGIN_CLASS__ = PluginManagerUIPlugin;
