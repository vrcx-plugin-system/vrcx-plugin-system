/**
 * Protocol Links Plugin
 * Adds context menu items to copy VRCX protocol links for users, avatars, worlds, and groups
 * Protocol format: vrcx://type/id or vrcx://import/type/id
 */
class ProtocolLinksPlugin extends Plugin {
  constructor() {
    super({
      name: "VRCX Protocol Links",
      description:
        "Adds context menu items to copy VRCX protocol links for users, avatars, worlds, groups, and instances",
      author: "Bluscream",
      version: "2.1.0",
      build: "1744632000",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/context-menu-api.js",
      ],
    });
  }

  async load() {
    this.logger.log("Protocol Links plugin ready");
    this.loaded = true;
  }

  async start() {
    // Wait for dependencies
    this.contextMenuApi = await window.customjs.pluginManager.waitForPlugin(
      "context-menu-api"
    );
    this.utils = await window.customjs.pluginManager.waitForPlugin("utils");

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

  // ============================================================================
  // SETUP
  // ============================================================================

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

  // ============================================================================
  // COPY FUNCTIONS
  // ============================================================================

  copyUserLink(userData) {
    if (!userData || !userData.id) {
      this.showError("No user data available");
      return;
    }

    const link = `vrcx://user/${userData.id}`;
    this.copyToClipboard(link, "User link");
  }

  copyUserImportLink(userData) {
    if (!userData || !userData.id) {
      this.showError("No user data available");
      return;
    }

    const link = `vrcx://import/friend/${userData.id}`;
    this.copyToClipboard(link, "User import link");
  }

  copyAvatarLink(avatarData) {
    if (!avatarData || !avatarData.id) {
      this.showError("No avatar data available");
      return;
    }

    const link = `vrcx://avatar/${avatarData.id}`;
    this.copyToClipboard(link, "Avatar link");
  }

  copyAvatarImportLink(avatarData) {
    if (!avatarData || !avatarData.id) {
      this.showError("No avatar data available");
      return;
    }

    const link = `vrcx://import/avatar/${avatarData.id}`;
    this.copyToClipboard(link, "Avatar import link");
  }

  copyWorldLink(worldData) {
    if (!worldData || !worldData.id) {
      this.showError("No world data available");
      return;
    }

    const link = `vrcx://world/${worldData.id}`;
    this.copyToClipboard(link, "World link");
  }

  copyWorldImportLink(worldData) {
    if (!worldData || !worldData.id) {
      this.showError("No world data available");
      return;
    }

    const link = `vrcx://import/world/${worldData.id}`;
    this.copyToClipboard(link, "World import link");
  }

  copyGroupLink(groupData) {
    if (!groupData || !groupData.id) {
      this.showError("No group data available");
      return;
    }

    const link = `vrcx://group/${groupData.id}`;
    this.copyToClipboard(link, "Group link");
  }

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================

  async copyToClipboard(text, description) {
    if (!this.utils) {
      this.logger.error("Utils plugin not available");
      return;
    }

    const success = await this.utils.copyToClipboard(text, description);
    if (success) {
      this.logger.showSuccess(`${description} copied to clipboard: ${text}`);
    } else {
      this.logger.showError(`Failed to copy ${description.toLowerCase()}`);
    }
  }

  // ============================================================================
  // ADDITIONAL METHODS
  // ============================================================================

  /**
   * Add a custom avatar database provider link
   * @param {string} url - URL of the avatar database provider
   */
  addAvatarDatabaseProvider(url) {
    const link = `vrcx://addavatardb/${url}`;
    this.copyToClipboard(link, "Avatar database provider link");
  }

  /**
   * Create multi-item import links
   * @param {string} type - Import type (avatar, world, friend)
   * @param {string[]} ids - Array of IDs to import
   */
  createMultiImportLink(type, ids) {
    if (!Array.isArray(ids) || ids.length === 0) {
      this.showError("No IDs provided for import");
      return;
    }

    const validTypes = ["avatar", "world", "friend"];
    if (!validTypes.includes(type)) {
      this.showError(
        `Invalid import type. Must be one of: ${validTypes.join(", ")}`
      );
      return;
    }

    const link = `vrcx://import/${type}/${ids.join(",")}`;
    this.copyToClipboard(link, `${type} import link (${ids.length} items)`);
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = ProtocolLinksPlugin;
