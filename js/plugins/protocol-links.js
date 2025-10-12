class ProtocolLinksPlugin extends Plugin {
  constructor() {
    super({
      name: "VRCX Protocol Links",
      description:
        "Adds context menu items to copy VRCX protocol links for users, avatars, worlds, groups, and instances",
      author: "Bluscream",
      version: "2.1.3",
      build: Math.floor(Date.now() / 1000).toString(),
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/context-menu-api.js",
      ],
    });
  }

  async load() {
    this.logger.log("Protocol Links plugin ready");
    this.loaded = true;
  }

  async start() {
    // Setup utils shortcut
    this.utils = window.customjs.utils;

    // Wait for dependencies
    this.contextMenuApi = await window.customjs.pluginManager.waitForPlugin(
      "context-menu-api"
    );

    if (!this.contextMenuApi) {
      this.logger.error("Context Menu API plugin not found after waiting");
      return;
    }

    // Setup context menu items
    this.setupContextMenuItems();

    this.enabled = true;
    this.started = true;
    this.logger.log("Protocol Links plugin started, menu items added");
  }

  async onLogin(user) {
    // No login-specific logic needed for protocol links plugin
  }

  async stop() {
    this.logger.log("Stopping Protocol Links plugin");

    // Remove all context menu items
    this.removeContextMenuItems();

    await super.stop();
  }

  setupContextMenuItems() {
    if (!this.contextMenuApi) {
      this.logger.error("Context Menu API plugin not available");
      return;
    }

    // User dialog items
    this.contextMenuApi.addUserItem("copy-user-link", {
      text: "Copy User Link",
      icon: "el-icon-link",
      onClick: (userData) => this.copyUserLink(userData),
    });

    this.contextMenuApi.addUserItem("copy-user-import", {
      text: "Copy User Import Link",
      icon: "el-icon-download",
      onClick: (userData) => this.copyUserImportLink(userData),
    });

    // Avatar dialog items
    this.contextMenuApi.addAvatarItem("copy-avatar-link", {
      text: "Copy Avatar Link",
      icon: "el-icon-link",
      onClick: (avatarData) => this.copyAvatarLink(avatarData),
    });

    this.contextMenuApi.addAvatarItem("copy-avatar-import", {
      text: "Copy Avatar Import Link",
      icon: "el-icon-download",
      onClick: (avatarData) => this.copyAvatarImportLink(avatarData),
    });

    // World dialog items
    this.contextMenuApi.addWorldItem("copy-world-link", {
      text: "Copy World Link",
      icon: "el-icon-link",
      onClick: (worldData) => this.copyWorldLink(worldData),
    });

    this.contextMenuApi.addWorldItem("copy-world-import", {
      text: "Copy World Import Link",
      icon: "el-icon-download",
      onClick: (worldData) => this.copyWorldImportLink(worldData),
    });

    // Group dialog items
    this.contextMenuApi.addGroupItem("copy-group-link", {
      text: "Copy Group Link",
      icon: "el-icon-link",
      onClick: (groupData) => this.copyGroupLink(groupData),
    });

    this.logger.log("All context menu items added");
  }

  removeContextMenuItems() {
    if (!this.contextMenuApi) return;

    // Remove user items
    this.contextMenuApi.removeUserItem("copy-user-link");
    this.contextMenuApi.removeUserItem("copy-user-import");

    // Remove avatar items
    this.contextMenuApi.removeAvatarItem("copy-avatar-link");
    this.contextMenuApi.removeAvatarItem("copy-avatar-import");

    // Remove world items
    this.contextMenuApi.removeWorldItem("copy-world-link");
    this.contextMenuApi.removeWorldItem("copy-world-import");

    // Remove group items
    this.contextMenuApi.removeGroupItem("copy-group-link");

    this.logger.log("All context menu items removed");
  }

  copyUserLink(userData) {
    if (!userData || !userData.id) {
      this.logger.showError("No user data available");
      return;
    }
    this.utils.copyToClipboard(`vrcx://user/${userData.id}`, "User link");
  }

  copyUserImportLink(userData) {
    if (!userData || !userData.id) {
      this.logger.showError("No user data available");
      return;
    }
    this.utils.copyToClipboard(
      `vrcx://import/friend/${userData.id}`,
      "User import link"
    );
  }

  copyAvatarLink(avatarData) {
    if (!avatarData || !avatarData.id) {
      this.logger.showError("No avatar data available");
      return;
    }
    this.utils.copyToClipboard(`vrcx://avatar/${avatarData.id}`, "Avatar link");
  }

  copyAvatarImportLink(avatarData) {
    if (!avatarData || !avatarData.id) {
      this.logger.showError("No avatar data available");
      return;
    }
    this.utils.copyToClipboard(
      `vrcx://import/avatar/${avatarData.id}`,
      "Avatar import link"
    );
  }

  copyWorldLink(worldData) {
    if (!worldData || !worldData.id) {
      this.logger.showError("No world data available");
      return;
    }
    this.utils.copyToClipboard(`vrcx://world/${worldData.id}`, "World link");
  }

  copyWorldImportLink(worldData) {
    if (!worldData || !worldData.id) {
      this.logger.showError("No world data available");
      return;
    }
    this.utils.copyToClipboard(
      `vrcx://import/world/${worldData.id}`,
      "World import link"
    );
  }

  copyGroupLink(groupData) {
    if (!groupData || !groupData.id) {
      this.logger.showError("No group data available");
      return;
    }
    this.utils.copyToClipboard(`vrcx://group/${groupData.id}`, "Group link");
  }

  /**
   * Add a custom avatar database provider link
   * @param {string} url - URL of the avatar database provider
   */
  addAvatarDatabaseProvider(url) {
    this.utils.copyToClipboard(
      `vrcx://addavatardb/${url}`,
      "Avatar database provider link"
    );
  }

  /**
   * Create multi-item import links
   * @param {string} type - Import type (avatar, world, friend)
   * @param {string[]} ids - Array of IDs to import
   */
  createMultiImportLink(type, ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      this.logger.showError("No IDs provided for import");
      return;
    }

    const validTypes = ["avatar", "world", "friend"];
    if (!validTypes.includes(type)) {
      this.logger.showError(
        `Invalid import type. Must be one of: ${validTypes.join(", ")}`
      );
      return;
    }

    const link = `vrcx://import/${type}/${ids.join(",")}`;
    this.utils.copyToClipboard(
      link,
      `${type} import link (${ids.length} items)`
    );
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = ProtocolLinksPlugin;
