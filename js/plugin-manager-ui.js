// ============================================================================
// PLUGIN MANAGER UI
// ============================================================================

class PluginManagerUI {
  static SCRIPT = {
    name: "Plugin Manager UI",
    description: "Visual UI for managing VRCX custom plugins",
    author: "Bluscream",
    version: "1.2.0",
    build: "{BUILD}",
    dependencies: [
      "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/utils.js",
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
      if (window.$pinia?.ui?.$subscribe) {
        window.$pinia.ui.$subscribe(() => {
          const activeIndex = window.$pinia.ui.menuActiveIndex;
          if (activeIndex === "plugins") {
            this.refreshPluginList();
          }
        });
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
      before: "settings",
    });
  }

  createPanelContent() {
    const container = document.createElement("div");
    container.style.cssText = `
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    `;

    this.contentContainer = container;
    this.renderContent(container);
    return container;
  }

  renderContent(container) {
    // Header
    const header = this.createHeader();
    container.appendChild(header);

    // Load Plugin Section
    const loadSection = this.createLoadPluginSection();
    container.appendChild(loadSection);

    // Plugin List Container
    const pluginList = document.createElement("div");
    pluginList.id = "plugin-list-container";
    container.appendChild(pluginList);

    this.refreshPluginList();
  }

  createHeader() {
    const header = document.createElement("div");
    header.style.cssText = "margin-bottom: 30px;";

    const info = window.plugins?.getPlugins() || {
      loaded: [],
      failed: [],
      modules: [],
    };

    header.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <div>
          <h2 style="margin: 0; font-size: 28px; font-weight: 600;">
            <i class="ri-plug-line" style="margin-right: 10px;"></i>Plugin Manager
          </h2>
          <p style="color: var(--color-text-secondary); margin: 5px 0 0 0;">
            Manage and monitor your VRCX custom plugins
          </p>
        </div>
        <button class="el-button el-button--primary" id="reload-all-btn">
          <i class="ri-refresh-line" style="margin-right: 5px;"></i>Reload All
        </button>
      </div>
      
      <div style="
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 15px;
        margin-top: 20px;
      ">
        <div style="
          background: linear-gradient(135deg, var(--el-color-success-light-9) 0%, var(--el-color-success-light-8) 100%);
          border-left: 4px solid var(--el-color-success);
          padding: 15px;
          border-radius: 8px;
        ">
          <div style="font-size: 32px; font-weight: bold; color: var(--el-color-success);">
            ${info.loaded.length}
          </div>
          <div style="font-size: 13px; color: var(--color-text-secondary); margin-top: 5px;">
            Loaded Plugins
          </div>
        </div>
        
        <div style="
          background: linear-gradient(135deg, var(--el-color-info-light-9) 0%, var(--el-color-info-light-8) 100%);
          border-left: 4px solid var(--el-color-info);
          padding: 15px;
          border-radius: 8px;
        ">
          <div style="font-size: 32px; font-weight: bold; color: var(--el-color-info);">
            ${info.modules.length}
          </div>
          <div style="font-size: 13px; color: var(--color-text-secondary); margin-top: 5px;">
            Active Modules
          </div>
        </div>
        
        ${
          info.failed.length > 0
            ? `
        <div style="
          background: linear-gradient(135deg, var(--el-color-danger-light-9) 0%, var(--el-color-danger-light-8) 100%);
          border-left: 4px solid var(--el-color-danger);
          padding: 15px;
          border-radius: 8px;
        ">
          <div style="font-size: 32px; font-weight: bold; color: var(--el-color-danger);">
            ${info.failed.length}
          </div>
          <div style="font-size: 13px; color: var(--color-text-secondary); margin-top: 5px;">
            Failed Plugins
          </div>
        </div>
        `
            : ""
        }
      </div>
    `;

    // Add reload all button handler
    setTimeout(() => {
      const reloadBtn = header.querySelector("#reload-all-btn");
      if (reloadBtn) {
        reloadBtn.onclick = async () => {
          reloadBtn.disabled = true;
          reloadBtn.innerHTML =
            '<i class="ri-loader-4-line el-icon-loading" style="margin-right: 5px;"></i>Reloading...';
          const result = await plugins.reloadAll();
          Utils.showSuccess(
            `Reloaded: ${result.success.length}, Failed: ${result.failed.length}`
          );
          this.refreshPluginList();
        };
      }
    }, 0);

    return header;
  }

  createLoadPluginSection() {
    const section = document.createElement("div");
    section.style.cssText = `
      background: var(--color-background-mute);
      border: 1px solid var(--color-border);
      border-radius: 8px;
      padding: 20px;
      margin-bottom: 30px;
    `;

    section.innerHTML = `
      <h3 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">
        <i class="ri-add-circle-line" style="margin-right: 5px;"></i>Load Plugin from URL
      </h3>
      <div style="display: flex; gap: 10px;">
        <input
          id="plugin-url-input"
          type="text"
          placeholder="https://example.com/my-plugin.js"
          style="
            flex: 1;
            padding: 8px 12px;
            background: var(--color-background);
            border: 1px solid var(--color-border);
            border-radius: 4px;
            color: var(--color-text);
            font-family: monospace;
            font-size: 13px;
          "
        />
        <button class="el-button el-button--success" id="load-plugin-btn">
          <i class="ri-download-line" style="margin-right: 5px;"></i>Load Plugin
        </button>
      </div>
    `;

    setTimeout(() => {
      const input = section.querySelector("#plugin-url-input");
      const loadBtn = section.querySelector("#load-plugin-btn");

      if (input && loadBtn) {
        loadBtn.onclick = async () => {
          const url = input.value.trim();
          if (!url) {
            Utils.showError("Please enter a plugin URL");
            return;
          }

          loadBtn.disabled = true;
          loadBtn.innerHTML =
            '<i class="ri-loader-4-line el-icon-loading" style="margin-right: 5px;"></i>Loading...';

          const result = await plugins.loadPlugin(url);
          Utils.showSuccess(
            result.success ? `Loaded: ${url}` : `Failed: ${result.message}`
          );

          if (result.success) {
            input.value = "";
          }

          loadBtn.disabled = false;
          loadBtn.innerHTML =
            '<i class="ri-download-line" style="margin-right: 5px;"></i>Load Plugin';
          this.refreshPluginList();
        };

        // Allow Enter key to submit
        input.addEventListener("keypress", (e) => {
          if (e.key === "Enter") {
            loadBtn.click();
          }
        });
      }
    }, 0);

    return section;
  }

  refreshPluginList() {
    if (!this.contentContainer) return;

    const container = this.contentContainer.querySelector(
      "#plugin-list-container"
    );
    if (!container) return;

    if (!window.plugins?.list) {
      container.innerHTML =
        '<p style="color: var(--color-text-secondary); text-align: center; padding: 40px;">Plugin API not ready yet. Please wait...</p>';
      return;
    }

    const info = plugins.list();
    container.innerHTML = "";

    // Loaded plugins section
    if (info.loaded.length > 0) {
      const loadedSection = document.createElement("div");
      loadedSection.innerHTML = `
        <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
          <i class="ri-checkbox-circle-line" style="color: var(--el-color-success);"></i>
          Loaded Plugins
          <span style="
            background: var(--el-color-success-light-9);
            color: var(--el-color-success);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: normal;
          ">${info.loaded.length}</span>
        </h3>
      `;

      info.loaded.forEach((url) => {
        const card = this.createEnhancedPluginCard(url, "loaded");
        loadedSection.appendChild(card);
      });

      container.appendChild(loadedSection);
    }

    // Failed plugins section
    if (info.failed.length > 0) {
      const failedSection = document.createElement("div");
      failedSection.style.marginTop = "30px";
      failedSection.innerHTML = `
        <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
          <i class="ri-error-warning-line" style="color: var(--el-color-danger);"></i>
          Failed Plugins
          <span style="
            background: var(--el-color-danger-light-9);
            color: var(--el-color-danger);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: normal;
          ">${info.failed.length}</span>
        </h3>
      `;

      info.failed.forEach((url) => {
        const card = this.createEnhancedPluginCard(url, "failed");
        failedSection.appendChild(card);
      });

      container.appendChild(failedSection);
    }

    // Active modules section
    if (info.modules.length > 0) {
      const modulesSection = document.createElement("div");
      modulesSection.style.marginTop = "30px";
      modulesSection.innerHTML = `
        <h3 style="margin: 0 0 15px 0; font-size: 18px; font-weight: 600; display: flex; align-items: center; gap: 10px;">
          <i class="ri-code-box-line" style="color: var(--el-color-info);"></i>
          Active Module Instances
          <span style="
            background: var(--el-color-info-light-9);
            color: var(--el-color-info);
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: normal;
          ">${info.modules.length}</span>
        </h3>
      `;

      const modulesList = document.createElement("div");
      modulesList.style.cssText = `
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
        gap: 10px;
      `;

      info.modules.forEach((moduleName) => {
        const moduleInstance = window.customjs?.[moduleName];
        const hasScript =
          window.customjs?.script?.[moduleName] ||
          moduleInstance?.constructor?.SCRIPT;
        const moduleTag = document.createElement("div");
        moduleTag.style.cssText = `
          background: var(--el-color-info-light-9);
          border: 1px solid var(--el-color-info-light-7);
          padding: 12px;
          border-radius: 6px;
          font-size: 13px;
          text-align: center;
          font-weight: 500;
          transition: all 0.2s;
          cursor: ${hasScript ? "pointer" : "default"};
        `;

        const icon = hasScript ? "ri-code-s-slash-line" : "ri-file-code-line";
        moduleTag.innerHTML = `
          <i class="${icon}" style="margin-right: 5px;"></i>${moduleName}
        `;

        if (hasScript) {
          moduleTag.title = "Click to view details";
          moduleTag.onmouseenter = () => {
            moduleTag.style.background = "var(--el-color-info-light-8)";
            moduleTag.style.transform = "translateY(-2px)";
          };
          moduleTag.onmouseleave = () => {
            moduleTag.style.background = "var(--el-color-info-light-9)";
            moduleTag.style.transform = "translateY(0)";
          };
          moduleTag.onclick = () => {
            const script =
              window.customjs.script[moduleName] ||
              moduleInstance.constructor.SCRIPT;
            console.group(`📦 ${moduleName} Module Info`);
            console.log("Name:", script.name);
            console.log("Version:", script.version);
            console.log("Build:", script.build);
            console.log("Author:", script.author);
            console.log("Description:", script.description);
            console.log("Dependencies:", script.dependencies);
            console.log("Instance:", moduleInstance);
            console.groupEnd();
            Utils.showInfo(`Check console for ${moduleName} details`);
          };
        }

        modulesList.appendChild(moduleTag);
      });

      modulesSection.appendChild(modulesList);
      container.appendChild(modulesSection);
    }
  }

  createEnhancedPluginCard(url, status) {
    const pluginName = url.split("/").pop().replace(".js", "");
    const moduleInstance = window.customjs?.[pluginName];
    const scriptInfo =
      window.customjs?.script?.[pluginName] ||
      moduleInstance?.constructor?.SCRIPT;

    const card = document.createElement("div");
    card.style.cssText = `
      background: var(--color-background-mute);
      border: 1px solid ${
        status === "loaded"
          ? "var(--el-color-success-light-7)"
          : "var(--el-color-danger-light-7)"
      };
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
      transition: all 0.2s;
    `;

    card.onmouseenter = () => {
      card.style.borderColor =
        status === "loaded"
          ? "var(--el-color-success)"
          : "var(--el-color-danger)";
      card.style.transform = "translateX(4px)";
    };
    card.onmouseleave = () => {
      card.style.borderColor =
        status === "loaded"
          ? "var(--el-color-success-light-7)"
          : "var(--el-color-danger-light-7)";
      card.style.transform = "translateX(0)";
    };

    // Header with name and status badge
    const cardHeader = document.createElement("div");
    cardHeader.style.cssText = `
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    `;

    const nameSection = document.createElement("div");
    nameSection.style.flex = "1";

    const nameEl = document.createElement("div");
    nameEl.style.cssText =
      "font-size: 18px; font-weight: 600; margin-bottom: 4px;";
    nameEl.innerHTML = `<i class="ri-puzzle-line" style="margin-right: 5px;"></i>${
      scriptInfo?.name || pluginName
    }`;

    const badge = document.createElement("span");
    badge.style.cssText = `
      display: inline-block;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 11px;
      font-weight: 500;
      background: ${
        status === "loaded"
          ? "var(--el-color-success-light-9)"
          : "var(--el-color-danger-light-9)"
      };
      color: ${
        status === "loaded"
          ? "var(--el-color-success)"
          : "var(--el-color-danger)"
      };
    `;
    badge.textContent = status.toUpperCase();

    nameSection.appendChild(nameEl);
    cardHeader.appendChild(nameSection);
    cardHeader.appendChild(badge);
    card.appendChild(cardHeader);

    // Plugin info
    if (scriptInfo) {
      const infoSection = document.createElement("div");
      infoSection.style.cssText = `
        background: var(--color-background);
        padding: 12px;
        border-radius: 6px;
        margin-bottom: 12px;
        font-size: 13px;
      `;

      infoSection.innerHTML = `
        <div style="margin-bottom: 8px;">
          <i class="ri-information-line" style="margin-right: 5px; color: var(--el-color-info);"></i>
          <span style="color: var(--color-text-secondary);">${
            scriptInfo.description || "No description"
          }</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; font-size: 12px;">
          <div>
            <span style="color: var(--color-text-secondary);">Version:</span>
            <strong style="margin-left: 5px;">${
              scriptInfo.version || "N/A"
            }</strong>
          </div>
          <div>
            <span style="color: var(--color-text-secondary);">Build:</span>
            <strong style="margin-left: 5px;">${
              scriptInfo.build || "N/A"
            }</strong>
          </div>
          <div>
            <span style="color: var(--color-text-secondary);">Author:</span>
            <strong style="margin-left: 5px;">${
              scriptInfo.author || "N/A"
            }</strong>
          </div>
        </div>
        ${
          scriptInfo.dependencies && scriptInfo.dependencies.length > 0
            ? `
        <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--color-border);">
          <div style="color: var(--color-text-secondary); margin-bottom: 4px;">
            <i class="ri-links-line" style="margin-right: 5px;"></i>Dependencies: ${scriptInfo.dependencies.length}
          </div>
        </div>
        `
            : ""
        }
      `;

      card.appendChild(infoSection);
    }

    // URL
    const urlEl = document.createElement("div");
    urlEl.style.cssText = `
      font-size: 11px;
      color: var(--color-text-secondary);
      margin-bottom: 12px;
      word-break: break-all;
      font-family: monospace;
      padding: 8px;
      background: var(--color-background);
      border-radius: 4px;
      cursor: pointer;
    `;
    urlEl.textContent = url;
    urlEl.title = "Click to copy URL";
    urlEl.onclick = () => {
      Utils.copyToClipboard(url, "Plugin URL");
      Utils.showSuccess("URL copied to clipboard");
    };
    card.appendChild(urlEl);

    // Actions
    const actions = document.createElement("div");
    actions.style.cssText = "display: flex; gap: 8px; flex-wrap: wrap;";

    if (status === "loaded") {
      // Reload button
      const reloadBtn = this.createActionButton(
        "Reload",
        "ri-refresh-line",
        "default",
        async (btn) => {
          btn.disabled = true;
          btn.innerHTML =
            '<i class="ri-loader-4-line el-icon-loading"></i> Reloading...';
          const result = await plugins.reload(url);
          Utils.showSuccess(
            result.success
              ? `Reloaded: ${pluginName}`
              : `Failed: ${result.message}`
          );
          this.refreshPluginList();
        }
      );

      // Start button
      const startBtn = this.createActionButton(
        "Start",
        "ri-play-line",
        "success",
        (btn) => {
          const result = plugins.startPlugin(pluginName);
          Utils.showSuccess(
            result.success ? `Started: ${pluginName}` : result.message
          );
        }
      );

      // Stop button
      const stopBtn = this.createActionButton(
        "Stop",
        "ri-stop-line",
        "warning",
        (btn) => {
          const result = plugins.stopPlugin(pluginName);
          Utils.showInfo(
            result.success ? `Stopped: ${pluginName}` : result.message
          );
        }
      );

      // Unload button
      const unloadBtn = this.createActionButton(
        "Unload",
        "ri-close-circle-line",
        "danger",
        (btn) => {
          const result = plugins.unloadPlugin(url);
          Utils.showInfo(result.message);
          this.refreshPluginList();
        }
      );

      actions.appendChild(reloadBtn);
      actions.appendChild(startBtn);
      actions.appendChild(stopBtn);
      actions.appendChild(unloadBtn);
    } else {
      // Retry button for failed plugins
      const retryBtn = this.createActionButton(
        "Retry Load",
        "ri-restart-line",
        "danger",
        async (btn) => {
          btn.disabled = true;
          btn.innerHTML =
            '<i class="ri-loader-4-line el-icon-loading"></i> Loading...';
          const result = await plugins.loadPlugin(url);
          Utils.showSuccess(
            result.success
              ? `Loaded: ${pluginName}`
              : `Failed: ${result.message}`
          );
          this.refreshPluginList();
        }
      );

      actions.appendChild(retryBtn);
    }

    card.appendChild(actions);
    return card;
  }

  createActionButton(label, icon, type = "default", onClick) {
    const btn = document.createElement("button");
    btn.className = `el-button el-button--${type} el-button--small`;
    btn.innerHTML = `<i class="${icon}" style="margin-right: 4px;"></i>${label}`;
    btn.onclick = () => onClick(btn);
    return btn;
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
