// ============================================================================
// PROTOCOL LINKS PLUGIN
// Version: 2.0.0
// Build: 1728668400
// ============================================================================

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
      version: "2.0.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/Plugin.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/utils.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugins/context-menu-api.js",
      ],
    });
  }

  async load() {
    this.log("Protocol Links plugin ready");
    this.loaded = true;
  }

  async start() {
    // Wait for context menu to be available
    if (!window.customjs?.contextMenu) {
      this.warn("Context menu not available, waiting...");
      await this.waitForContextMenu();
    }

    // Setup context menu items
    this.setupContextMenuItems();

    this.enabled = true;
    this.started = true;
    this.log("Protocol Links plugin started, menu items added");
  }

  async onLogin(user) {
    // No login-specific logic needed for protocol links plugin
  }

  async stop() {
    this.log("Stopping Protocol Links plugin");

    // Remove all context menu items
    this.removeContextMenuItems();

    await super.stop();
  }

  // ============================================================================
  // SETUP
  // ============================================================================

  async waitForContextMenu() {
    return new Promise((resolve) => {
      const check = () => {
        if (window.customjs?.contextMenu) {
          resolve();
        } else {
          setTimeout(check, 500);
        }
      };
      check();
    });
  }

  setupContextMenuItems() {
    const contextMenu = window.customjs.contextMenu;

    // User dialog items
    contextMenu.addUserItem("copy-user-link", {
      text: "Copy User Link",
      icon: "el-icon-link",
      onClick: (userData) => this.copyUserLink(userData),
    });

    contextMenu.addUserItem("copy-user-import", {
      text: "Copy User Import Link",
      icon: "el-icon-download",
      onClick: (userData) => this.copyUserImportLink(userData),
    });

    // Avatar dialog items
    contextMenu.addAvatarItem("copy-avatar-link", {
      text: "Copy Avatar Link",
      icon: "el-icon-link",
      onClick: (avatarData) => this.copyAvatarLink(avatarData),
    });

    contextMenu.addAvatarItem("copy-avatar-import", {
      text: "Copy Avatar Import Link",
      icon: "el-icon-download",
      onClick: (avatarData) => this.copyAvatarImportLink(avatarData),
    });

    // World dialog items
    contextMenu.addWorldItem("copy-world-link", {
      text: "Copy World Link",
      icon: "el-icon-link",
      onClick: (worldData) => this.copyWorldLink(worldData),
    });

    contextMenu.addWorldItem("copy-world-import", {
      text: "Copy World Import Link",
      icon: "el-icon-download",
      onClick: (worldData) => this.copyWorldImportLink(worldData),
    });

    // Group dialog items
    contextMenu.addGroupItem("copy-group-link", {
      text: "Copy Group Link",
      icon: "el-icon-link",
      onClick: (groupData) => this.copyGroupLink(groupData),
    });

    this.log("All context menu items added");
  }

  removeContextMenuItems() {
    const contextMenu = window.customjs?.contextMenu;
    if (!contextMenu) return;

    // Remove user items
    contextMenu.removeUserItem("copy-user-link");
    contextMenu.removeUserItem("copy-user-import");

    // Remove avatar items
    contextMenu.removeAvatarItem("copy-avatar-link");
    contextMenu.removeAvatarItem("copy-avatar-import");

    // Remove world items
    contextMenu.removeWorldItem("copy-world-link");
    contextMenu.removeWorldItem("copy-world-import");

    // Remove group items
    contextMenu.removeGroupItem("copy-group-link");

    this.log("All context menu items removed");
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
    const utils = window.customjs?.utils;
    if (!utils) {
      this.error("Utils plugin not available");
      return;
    }

    const success = await utils.copyToClipboard(text, description);
    if (success) {
      utils.showSuccess(`${description} copied to clipboard: ${text}`);
    } else {
      utils.showError(`Failed to copy ${description.toLowerCase()}`);
    }
  }

  showSuccess(message) {
    window.customjs?.utils?.showSuccess(message);
  }

  showError(message) {
    window.customjs?.utils?.showError(message);
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
