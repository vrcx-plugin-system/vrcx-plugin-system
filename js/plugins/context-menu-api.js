// ============================================================================
// CONTEXT MENU API PLUGIN
// Version: 2.0.0
// Build: 1728668400
// ============================================================================

/**
 * Context Menu API Plugin
 * Provides API for adding custom menu items to VRCX dialog context menus
 * Supports: user, avatar, world, group, and instance dialogs
 */
class ContextMenuApiPlugin extends Plugin {
  constructor() {
    super({
      name: "Context Menu API",
      description: "Custom context menu management for VRCX dialogs",
      author: "Bluscream",
      version: "2.0.0",
      build: "1728668400",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/Plugin.js",
      ],
    });

    // Supported menu types
    this.menuTypes = ["user", "world", "avatar", "group", "instance"];

    // Map of menuType -> Map of itemId -> item
    this.items = new Map();

    // Map of menuId -> { menuType, container }
    this.menuContainers = new Map();

    // Set of processed menu IDs
    this.processedMenus = new Set();

    // Map of menuId -> debounce timer ID
    this.debounceTimers = new Map();
  }

  async load() {
    // Initialize items map for each menu type
    this.menuTypes.forEach((menuType) => {
      this.items.set(menuType, new Map());
    });

    this.log("Context Menu API ready");
    this.loaded = true;
  }

  async start() {
    // Setup mutation observer to watch for context menus
    const observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    // Register observer for automatic cleanup
    this.registerObserver(observer);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "aria-hidden", "class"],
    });

    this.enabled = true;
    this.started = true;

    this.log("Context Menu API started, watching for dialogs");

    // Dispatch ready event for other plugins
    window.dispatchEvent(
      new CustomEvent("contextMenuReady", {
        detail: { contextMenu: this },
      })
    );
  }

  async onLogin(user) {
    // No login-specific logic needed for context menu API
  }

  async stop() {
    this.log("Stopping Context Menu API");

    // Clear all debounce timers
    this.debounceTimers.forEach((timerId) => clearTimeout(timerId));
    this.debounceTimers.clear();

    // Clear all items
    this.items.forEach((map) => map.clear());
    this.processedMenus.clear();
    this.menuContainers.clear();

    // Parent cleanup (will disconnect observer automatically)
    await super.stop();
  }

  // ============================================================================
  // MUTATION HANDLING
  // ============================================================================

  handleMutations(mutations) {
    mutations.forEach((mutation) => {
      // Handle attribute changes (style, aria-hidden, etc.)
      if (mutation.type === "attributes" && mutation.target) {
        this.handleAttributeChange(mutation.target);
      }

      // Handle added nodes
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => this.handleAddedNode(node));
      }

      // Handle removed nodes
      if (mutation.removedNodes.length) {
        mutation.removedNodes.forEach((node) => this.handleRemovedNode(node));
      }
    });
  }

  handleAttributeChange(node) {
    // Check if this is an el-popper dropdown becoming visible
    if (node.classList && node.classList.contains("el-dropdown__popper")) {
      const isVisible =
        node.style.display !== "none" &&
        node.getAttribute("aria-hidden") !== "true";

      if (isVisible) {
        const menuContainer = node.querySelector(".el-dropdown-menu");
        if (menuContainer) {
          const menuId = menuContainer.id || `menu-${Date.now()}`;

          if (!this.processedMenus.has(menuId)) {
            const menuType = this.detectMenuType(menuContainer);
            if (menuType && this.items.get(menuType).size > 0) {
              this.debouncedMenuDetection(menuId, menuType, menuContainer);
            }
          }
        }
      }
    }
  }

  handleAddedNode(node) {
    if (
      node.classList &&
      (node.classList.contains("el-dropdown-menu__item") ||
        node.classList.contains("el-dropdown-item") ||
        node.classList.contains("el-dropdown-menu"))
    ) {
      let menuContainer = null;
      let menuId = null;

      if (node.classList.contains("el-dropdown-menu")) {
        menuContainer = node;
        menuId = node.id || `menu-${Date.now()}`;
      } else {
        menuContainer = node.parentElement;
        menuId = node.parentElement?.id || `menu-${Date.now()}`;
      }

      if (!menuContainer) return;
      if (this.processedMenus.has(menuId)) return;

      const menuType = this.detectMenuType(menuContainer);
      if (menuType && this.items.get(menuType).size > 0) {
        this.debouncedMenuDetection(menuId, menuType, menuContainer);
      }
    }
  }

  handleRemovedNode(node) {
    if (
      node.classList &&
      (node.classList.contains("el-dropdown-menu__item") ||
        node.classList.contains("el-dropdown-item") ||
        node.classList.contains("el-dropdown-menu"))
    ) {
      let menuId = null;
      if (node.classList.contains("el-dropdown-menu")) {
        menuId = node.id;
      } else {
        menuId = node.parentElement?.id;
      }

      if (this.processedMenus.has(menuId)) {
        if (!document.contains(node.parentElement)) {
          if (this.debounceTimers.has(menuId)) {
            clearTimeout(this.debounceTimers.get(menuId));
            this.debounceTimers.delete(menuId);
          }
          this.processedMenus.delete(menuId);
          this.menuContainers.delete(menuId);
        }
      }
    }
  }

  // ============================================================================
  // MENU DETECTION & PROCESSING
  // ============================================================================

  debouncedMenuDetection(menuId, menuType, menuElement) {
    // Clear any existing timer for this menu
    if (this.debounceTimers.has(menuId)) {
      clearTimeout(this.debounceTimers.get(menuId));
    }

    // Set new timer with 100ms debounce to give dropdown time to become visible
    const timerId = setTimeout(() => {
      // Double-check visibility before processing
      const dropdown = menuElement.closest(".el-dropdown__popper");
      if (dropdown) {
        const isStillVisible =
          dropdown.style.display !== "none" &&
          dropdown.getAttribute("aria-hidden") !== "true";

        if (isStillVisible) {
          this.processMenu(menuId, menuType, menuElement);
        }
      } else {
        this.processMenu(menuId, menuType, menuElement);
      }
      this.debounceTimers.delete(menuId);
    }, 100);

    this.debounceTimers.set(menuId, timerId);
  }

  detectMenuType(menuContainer) {
    // Find all visible dropdowns sorted by z-index
    const dropdowns = Array.from(
      document.querySelectorAll(".el-dropdown__popper")
    )
      .filter(
        (el) =>
          el.style.display !== "none" &&
          el.getAttribute("aria-hidden") !== "true"
      )
      .sort((a, b) => {
        const zA = parseInt(window.getComputedStyle(a).zIndex) || 0;
        const zB = parseInt(window.getComputedStyle(b).zIndex) || 0;
        return zB - zA;
      });

    // Get highest z-index dropdown
    const highestDropdown = dropdowns[0];
    if (!highestDropdown) return null;

    // Check if our menu is in this dropdown
    if (!highestDropdown.contains(menuContainer)) return null;

    // Try to find trigger button
    let triggerButton = null;

    // Method 1: Try via aria-controls if dropdown has an ID
    const ariaId = highestDropdown.id;
    if (ariaId) {
      triggerButton = document.querySelector(`[aria-controls="${ariaId}"]`);
    }

    // Method 2: If no ID or no button found, search for dialog buttons
    if (!triggerButton) {
      // Find all visible dialogs
      const dialogs = [
        ...document.querySelectorAll(".x-user-dialog"),
        ...document.querySelectorAll(".x-avatar-dialog"),
        ...document.querySelectorAll(".x-world-dialog"),
        ...document.querySelectorAll(".x-group-dialog"),
      ].filter((d) => window.getComputedStyle(d).display !== "none");

      // Find dropdown trigger buttons in visible dialogs
      for (const dialog of dialogs) {
        const buttons = dialog.querySelectorAll(
          "button[aria-controls], button.el-dropdown__caret-button"
        );
        for (const btn of buttons) {
          // Check if this button's dropdown is the one we're looking at
          const rect = btn.getBoundingClientRect();
          const dropdownRect = highestDropdown.getBoundingClientRect();
          // Check if dropdown is near the button (simple proximity check)
          if (
            Math.abs(rect.bottom - dropdownRect.top) < 100 &&
            Math.abs(rect.left - dropdownRect.left) < 200
          ) {
            triggerButton = btn;
            break;
          }
        }
        if (triggerButton) break;
      }
    }

    if (!triggerButton) return null;

    // Detect dialog type from trigger button's parent dialog
    const userDialog = triggerButton.closest(".x-user-dialog");
    const avatarDialog = triggerButton.closest(".x-avatar-dialog");
    const worldDialog = triggerButton.closest(".x-world-dialog");
    const groupDialog = triggerButton.closest(".x-group-dialog");

    if (userDialog) return "user";
    if (avatarDialog) return "avatar";
    if (worldDialog) return "world";
    if (groupDialog) return "group";

    return null;
  }

  processMenu(menuId, menuType, menuContainer) {
    this.processedMenus.add(menuId);
    this.menuContainers.set(menuId, { menuType, container: menuContainer });

    const items = this.items.get(menuType);
    if (!items || items.size === 0) return;

    items.forEach((item, itemId) => {
      this.addMenuItemToContainer(menuContainer, menuType, itemId, item);
    });
  }

  addMenuItemToContainer(container, menuType, itemId, item) {
    // Check if already added
    if (container.querySelector(`[data-custom-item-id="${itemId}"]`)) {
      return;
    }

    // Create Element Plus dropdown item
    const menuItem = document.createElement("li");
    menuItem.className = "el-dropdown-menu__item";
    menuItem.setAttribute("data-custom-item-id", itemId);
    menuItem.tabIndex = -1;

    // Add icon if provided
    if (item.icon) {
      const icon = document.createElement("i");
      icon.className = item.icon;
      icon.style.marginRight = "8px";
      menuItem.appendChild(icon);
    }

    // Add text
    const textNode = document.createTextNode(item.text);
    menuItem.appendChild(textNode);

    // Register click handler with automatic cleanup
    const clickHandler = () => {
      this.handleItemClick(menuType, itemId, item);
    };
    this.registerListener(menuItem, "click", clickHandler);

    // Add to menu
    container.appendChild(menuItem);
  }

  handleItemClick(menuType, itemId, item) {
    // Get dialog data based on menu type
    const dialogData = this.getDialogData(menuType);

    if (item.onClick && typeof item.onClick === "function") {
      try {
        item.onClick(dialogData);
      } catch (error) {
        this.error(`Error in ${menuType} menu item ${itemId}:`, error);
      }
    }
  }

  getDialogData(menuType) {
    const dialogMap = {
      user: ".x-user-dialog",
      avatar: ".x-avatar-dialog",
      world: ".x-world-dialog",
      group: ".x-group-dialog",
    };

    const dialogSelector = dialogMap[menuType];
    if (!dialogSelector) return null;

    // Find visible dialog
    const dialogs = document.querySelectorAll(dialogSelector);
    const visibleDialog = Array.from(dialogs).find(
      (d) => window.getComputedStyle(d).display !== "none"
    );

    if (!visibleDialog) return null;

    // Try to get data from Vue component
    try {
      const vueComponent = visibleDialog.__vueParentComponent;
      if (vueComponent?.props) {
        return vueComponent.props[menuType + "Ref"] || vueComponent.props.ref;
      }
    } catch (error) {
      this.warn("Could not extract dialog data:", error);
    }

    return null;
  }

  // ============================================================================
  // PUBLIC API
  // ============================================================================

  addUserItem(itemId, item) {
    return this.addItem("user", itemId, item);
  }

  addAvatarItem(itemId, item) {
    return this.addItem("avatar", itemId, item);
  }

  addWorldItem(itemId, item) {
    return this.addItem("world", itemId, item);
  }

  addGroupItem(itemId, item) {
    return this.addItem("group", itemId, item);
  }

  addInstanceItem(itemId, item) {
    return this.addItem("instance", itemId, item);
  }

  addItem(menuType, itemId, item) {
    if (!this.menuTypes.includes(menuType)) {
      this.error(`Invalid menu type: ${menuType}`);
      return false;
    }

    if (!item || !item.text) {
      this.error("Menu item must have a 'text' property");
      return false;
    }

    const items = this.items.get(menuType);
    items.set(itemId, item);

    this.log(`Added ${menuType} menu item: ${itemId}`);
    return true;
  }

  removeUserItem(itemId) {
    return this.removeItem("user", itemId);
  }

  removeAvatarItem(itemId) {
    return this.removeItem("avatar", itemId);
  }

  removeWorldItem(itemId) {
    return this.removeItem("world", itemId);
  }

  removeGroupItem(itemId) {
    return this.removeItem("group", itemId);
  }

  removeInstanceItem(itemId) {
    return this.removeItem("instance", itemId);
  }

  removeItem(menuType, itemId) {
    const items = this.items.get(menuType);
    if (items) {
      const removed = items.delete(itemId);
      if (removed) {
        this.log(`Removed ${menuType} menu item: ${itemId}`);

        // Remove from any currently open menus
        this.removeItemFromOpenMenus(itemId);
      }
      return removed;
    }
    return false;
  }

  removeItemFromOpenMenus(itemId) {
    this.menuContainers.forEach(({ container }) => {
      const element = container.querySelector(
        `[data-custom-item-id="${itemId}"]`
      );
      if (element) {
        element.remove();
      }
    });
  }

  updateUserItem(itemId, updates) {
    return this.updateItem("user", itemId, updates);
  }

  updateAvatarItem(itemId, updates) {
    return this.updateItem("avatar", itemId, updates);
  }

  updateWorldItem(itemId, updates) {
    return this.updateItem("world", itemId, updates);
  }

  updateGroupItem(itemId, updates) {
    return this.updateItem("group", itemId, updates);
  }

  updateItem(menuType, itemId, updates) {
    const items = this.items.get(menuType);
    const item = items?.get(itemId);

    if (!item) {
      this.warn(`Cannot update ${menuType} item ${itemId}: not found`);
      return false;
    }

    Object.assign(item, updates);
    this.log(`Updated ${menuType} menu item: ${itemId}`);

    // Update in open menus
    this.updateItemInOpenMenus(menuType, itemId, item);
    return true;
  }

  updateItemInOpenMenus(menuType, itemId, item) {
    this.menuContainers.forEach(({ menuType: type, container }) => {
      if (type === menuType) {
        const element = container.querySelector(
          `[data-custom-item-id="${itemId}"]`
        );
        if (element) {
          // Update text
          const textNode = Array.from(element.childNodes).find(
            (node) => node.nodeType === Node.TEXT_NODE
          );
          if (textNode) {
            textNode.textContent = item.text;
          }

          // Update icon
          const existingIcon = element.querySelector("i");
          if (item.icon) {
            if (existingIcon) {
              existingIcon.className = item.icon;
            } else {
              const icon = document.createElement("i");
              icon.className = item.icon;
              icon.style.marginRight = "8px";
              element.insertBefore(icon, element.firstChild);
            }
          } else if (existingIcon) {
            existingIcon.remove();
          }
        }
      }
    });
  }

  clearUserItems() {
    return this.clearItems("user");
  }

  clearAvatarItems() {
    return this.clearItems("avatar");
  }

  clearWorldItems() {
    return this.clearItems("world");
  }

  clearGroupItems() {
    return this.clearItems("group");
  }

  clearItems(menuType) {
    const items = this.items.get(menuType);
    if (items) {
      items.clear();
      this.log(`Cleared all ${menuType} menu items`);
      return true;
    }
    return false;
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = ContextMenuApiPlugin;
