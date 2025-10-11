// ============================================================================
// PLUGIN MANAGER UI
// ============================================================================

class PluginManagerUI {
  static SCRIPT = {
    name: "Plugin Manager UI",
    description: "Visual UI for managing VRCX custom plugins",
    author: "Bluscream",
    version: "1.1.0",
    build: "1760222919",
    dependencies: [
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/nav-menu-api.js",
    ],
  };

  constructor() {
    this.contentContainer = null;
    this.on_startup();
  }

  on_startup() {
    // Wait for nav menu API to be ready
    setTimeout(() => {
      this.setupNavMenuItem();
    }, 2000);

    // Watch for menu selection to refresh plugin list
    setTimeout(() => {
      if (window.$app && typeof window.$app.$watch === "function") {
        window.$app.$watch(
          () => window.$pinia?.ui?.menuActiveIndex,
          (activeIndex) => {
            if (activeIndex === "plugins") {
              this.refreshPluginList();
            }
          }
        );
      }
    }, 2000);
  }

  setupNavMenuItem() {
    const navMenu = window.customjs?.navMenu;
    if (!navMenu) {
      console.error("[PluginManager] NavMenu API not available");
      return;
    }

    navMenu.addItem("plugins", {
      label: "Plugin Manager",
      icon: "ri-plug-line",
      content: () => this.createPanelContent(),
      before: "settings", // Insert before settings
    });
  }

  createPanelContent() {
    // Create the main container
    const container = document.createElement("div");
    container.style.cssText = "padding: 20px;";

    // Store reference for refreshing
    this.contentContainer = container;

    // Render the content
    this.renderContent(container);

    return container;
  }

  renderContent(container) {
    const header = document.createElement("div");
    header.style.cssText = "margin-bottom: 20px;";
    header.innerHTML = `
      <h2 style="margin: 0 0 10px 0; font-size: 24px;">Plugin Manager</h2>
      <p style="color: var(--color-text-secondary); margin: 0;">Manage VRCX custom plugins dynamically</p>
    `;

    const controls = document.createElement("div");
    controls.style.cssText = "margin-bottom: 20px; display: flex; gap: 10px;";

    const reloadAllBtn = this.createButton(
      "Reload All Plugins",
      "ri-refresh-line",
      async () => {
        const result = await plugins.reloadAll();
        this.showNotification(
          `Reloaded: ${result.success.length}, Failed: ${result.failed.length}`,
          result.failed.length > 0 ? "warning" : "success"
        );
        this.refreshPluginList();
      }
    );

    const refreshBtn = this.createButton(
      "Refresh List",
      "ri-loop-right-line",
      () => {
        this.refreshPluginList();
      }
    );

    controls.appendChild(reloadAllBtn);
    controls.appendChild(refreshBtn);

    const pluginList = document.createElement("div");
    pluginList.id = "plugin-list-container";

    container.appendChild(header);
    container.appendChild(controls);
    container.appendChild(pluginList);

    // Populate the plugin list immediately
    this.refreshPluginList();
  }

  createButton(label, icon, onClick) {
    const btn = document.createElement("button");
    btn.className = "el-button el-button--primary el-button--small";
    btn.innerHTML = `<i class="${icon}" style="margin-right: 5px;"></i>${label}`;
    btn.onclick = onClick;
    return btn;
  }

  refreshPluginList() {
    if (!this.contentContainer) return;

    const container = this.contentContainer.querySelector(
      "#plugin-list-container"
    );
    if (!container) return;

    if (!window.plugins?.list) {
      container.innerHTML =
        '<p style="color: var(--color-text-secondary);">Plugin API not ready yet. Please wait...</p>';
      return;
    }

    const info = plugins.list();

    container.innerHTML = `
      <div style="background: var(--color-background-mute); padding: 15px; border-radius: 8px; margin-bottom: 20px;">
        <div style="font-size: 14px; color: var(--color-text-secondary);">
          <strong>Loaded:</strong> ${info.loaded.length} | 
          <strong>Failed:</strong> ${info.failed.length} | 
          <strong>Active Modules:</strong> ${info.modules.length}
        </div>
      </div>
    `;

    // Loaded plugins section
    const loadedSection = document.createElement("div");
    loadedSection.innerHTML =
      '<h3 style="margin: 20px 0 10px 0;">Loaded Plugins</h3>';

    info.loaded.forEach((url) => {
      const pluginName = url.split("/").pop().replace(".js", "");
      const card = this.createPluginCard(pluginName, url, "loaded");
      loadedSection.appendChild(card);
    });

    // Failed plugins section
    if (info.failed.length > 0) {
      const failedSection = document.createElement("div");
      failedSection.innerHTML =
        '<h3 style="margin: 20px 0 10px 0; color: var(--el-color-danger);">Failed Plugins</h3>';

      info.failed.forEach((url) => {
        const pluginName = url.split("/").pop().replace(".js", "");
        const card = this.createPluginCard(pluginName, url, "failed");
        failedSection.appendChild(card);
      });

      container.appendChild(failedSection);
    }

    container.appendChild(loadedSection);

    // Active modules section
    const modulesSection = document.createElement("div");
    modulesSection.innerHTML =
      '<h3 style="margin: 20px 0 10px 0;">Active Module Instances</h3>';

    const modulesList = document.createElement("div");
    modulesList.style.cssText =
      "display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px;";

    info.modules.forEach((moduleName) => {
      const moduleTag = document.createElement("div");
      moduleTag.style.cssText =
        "background: var(--el-color-info-light-9); padding: 8px 12px; border-radius: 4px; font-size: 12px; text-align: center;";
      moduleTag.textContent = moduleName;
      modulesList.appendChild(moduleTag);
    });

    modulesSection.appendChild(modulesList);
    container.appendChild(modulesSection);
  }

  createPluginCard(name, url, status) {
    const card = document.createElement("div");
    card.style.cssText = `
      background: var(--color-background-mute);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 15px;
      margin-bottom: 10px;
    `;

    const nameEl = document.createElement("div");
    nameEl.style.cssText =
      "font-size: 16px; font-weight: bold; margin-bottom: 5px;";
    nameEl.textContent = name;

    const urlEl = document.createElement("div");
    urlEl.style.cssText =
      "font-size: 11px; color: var(--color-text-secondary); margin-bottom: 10px; word-break: break-all; font-family: monospace;";
    urlEl.textContent = url;

    const actions = document.createElement("div");
    actions.style.cssText = "display: flex; gap: 5px; flex-wrap: wrap;";

    if (status === "loaded") {
      const reloadBtn = document.createElement("button");
      reloadBtn.className = "el-button el-button--small";
      reloadBtn.innerHTML = '<i class="ri-refresh-line"></i> Reload';
      reloadBtn.onclick = async () => {
        const result = await plugins.reload(url);
        this.showNotification(
          result.success ? `Reloaded: ${name}` : `Failed: ${result.message}`,
          result.success ? "success" : "error"
        );
        this.refreshPluginList();
      };

      const unloadBtn = document.createElement("button");
      unloadBtn.className = "el-button el-button--small el-button--warning";
      unloadBtn.innerHTML = '<i class="ri-close-line"></i> Unload';
      unloadBtn.onclick = () => {
        const result = plugins.unloadPlugin(url);
        this.showNotification(
          result.message,
          result.success ? "info" : "warning"
        );
        this.refreshPluginList();
      };

      actions.appendChild(reloadBtn);
      actions.appendChild(unloadBtn);
    } else {
      const retryBtn = document.createElement("button");
      retryBtn.className = "el-button el-button--small el-button--danger";
      retryBtn.innerHTML = '<i class="ri-restart-line"></i> Retry';
      retryBtn.onclick = async () => {
        const result = await plugins.loadPlugin(url);
        this.showNotification(
          result.success ? `Loaded: ${name}` : `Failed: ${result.message}`,
          result.success ? "success" : "error"
        );
        this.refreshPluginList();
      };

      actions.appendChild(retryBtn);
    }

    card.appendChild(nameEl);
    card.appendChild(urlEl);
    card.appendChild(actions);

    return card;
  }

  showNotification(message, type = "info") {
    // Use VRCX notification if available
    if (window.$app && window.$app.$message) {
      window.$app.$message[type](message);
    }
  }

  cleanup() {
    window.customjs?.navMenu?.removeItem("plugins");
  }
}

// Auto-initialize the module
(function () {
  window.customjs = window.customjs || {};
  window.customjs.pluginManagerUI = new PluginManagerUI();
  window.customjs.script = window.customjs.script || {};
  window.customjs.script.pluginManagerUI = PluginManagerUI.SCRIPT;

  console.log(
    `✓ Loaded ${PluginManagerUI.SCRIPT.name} v${PluginManagerUI.SCRIPT.version} by ${PluginManagerUI.SCRIPT.author}`
  );
})();
