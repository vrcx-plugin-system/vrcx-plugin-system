// ============================================================================
// CUSTOM CONTEXT MENU MANAGEMENT
// ============================================================================

// Single class for managing all custom context menu items
class CustomContextMenu {
  static SCRIPT = {
    name: "Context Menu Module",
    description: "Custom context menu management for VRCX dialogs",
    author: "Bluscream",
     version: "1.4.0",
     build: "1760220194",
    dependencies: [],
  };
  constructor() {
    this.menuTypes = ["user", "world", "avatar", "group", "instance"];
    this.items = new Map(); // Map of menuType -> Map of itemId -> item
    this.observer = null;
    this.menuContainers = new Map(); // Map of menuId -> { menuType, container }
    this.processedMenus = new Set();
    this.debounceTimers = new Map(); // Map of menuId -> timer
    this.init();
  }

  init() {
    // Initialize items map for each menu type
    this.menuTypes.forEach((menuType) => {
      this.items.set(menuType, new Map());
    });

    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        // Handle attribute changes (style, aria-hidden, etc.)
        if (mutation.type === 'attributes' && mutation.target) {
          const node = mutation.target;
          
          // Check if this is an el-popper dropdown becoming visible
          if (node.classList && node.classList.contains('el-dropdown__popper')) {
            const isVisible = node.style.display !== 'none' && node.getAttribute('aria-hidden') !== 'true';
            
            if (isVisible) {
              // Find the dropdown menu inside this popper
              const menuContainer = node.querySelector('.el-dropdown-menu');
              if (menuContainer && menuContainer.id) {
                const menuId = menuContainer.id;
                
                // Skip if already processed
                if (this.processedMenus.has(menuId)) {
                  return;
                }
                
                // Detect and process the menu
                const menuType = this.detectMenuType(menuContainer);
                if (menuType && this.items.get(menuType).size > 0) {
                  window.Logger?.log(
                    `Menu became visible: ${JSON.stringify({
                      menuId,
                      menuType,
                      hasItems: this.items.get(menuType).size,
                    })}`,
                    { console: true },
                    "info"
                  );
                  this.debouncedMenuDetection(menuId, menuType, menuContainer);
                }
              }
            }
          }
        }
        
        // Handle added nodes
        if (mutation.addedNodes.length) {
          mutation.addedNodes.forEach((node) => {
            // Check for dropdown menu items or dropdown menu containers
            if (
              node.classList &&
              (node.classList.contains("el-dropdown-menu__item") ||
                node.classList.contains("el-dropdown-item") ||
                node.classList.contains("el-dropdown-menu"))
            ) {
              let menuContainer = null;
              let menuId = null;

              if (node.classList.contains("el-dropdown-menu")) {
                // This is the dropdown menu container itself
                menuContainer = node;
                menuId = node.id;
              } else {
                // This is a dropdown item, find the parent menu container
                menuContainer = node.parentElement;
                menuId = node.parentElement?.id;
              }

              if (!menuContainer || !menuId) return;

              // Skip if this menu has already been processed
              if (this.processedMenus.has(menuId)) {
                return;
              }

              // Determine menu type and process if we have items for it
              const menuType = this.detectMenuType(menuContainer);
              const dialogElement = menuContainer?.closest(".x-dialog");
              window.Logger?.log(
                `Menu Detection: ${JSON.stringify({
                  menuId: menuId,
                  menuType: menuType,
                  hasItems: menuType ? this.items.get(menuType).size : 0,
                  nodeClasses: node.classList.toString(),
                  menuContainerClasses: menuContainer?.classList?.toString(),
                  hasDialogElement: !!dialogElement,
                  dialogClasses: dialogElement?.classList?.toString(),
                })}`,
                { console: true },
                "info"
              );
              if (menuType && this.items.get(menuType).size > 0) {
                this.debouncedMenuDetection(menuId, menuType, menuContainer);
              }
            }
          });
        }

        // Handle removed nodes - clean up the registry
        if (mutation.removedNodes.length) {
          mutation.removedNodes.forEach((node) => {
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
                // Only clean up if the entire menu container is being removed
                // Check if the parent element still exists in the DOM
                if (!document.contains(node.parentElement)) {
                  // Clear any pending debounce timer
                  if (this.debounceTimers.has(menuId)) {
                    clearTimeout(this.debounceTimers.get(menuId));
                    this.debounceTimers.delete(menuId);
                  }
                  this.processedMenus.delete(menuId);
                  this.menuContainers.delete(menuId);
                  window.Logger?.log(
                    `Cleaned up processed menu: ${menuId}`,
                    { console: true },
                    "info"
                  );
                }
              }
            }
          });
        }
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true, // Watch for attribute changes (style, class, etc.)
      attributeFilter: ['style', 'aria-hidden', 'class'], // Only watch relevant attributes
    });
  }

  debouncedMenuDetection(menuId, menuType, menuElement) {
    // Clear any existing timer for this menu
    if (this.debounceTimers.has(menuId)) {
      clearTimeout(this.debounceTimers.get(menuId));
    }

    // Set a new timer to process the menu after a short delay
    const timer = setTimeout(() => {
      // Double-check that the menu still exists and hasn't been processed
      if (!this.processedMenus.has(menuId) && document.contains(menuElement)) {
        const dialogElement = menuElement?.closest(".x-dialog");
        window.Logger?.log(
          `Menu type ${menuType} detected for menu: ${JSON.stringify({
            menuType: menuType,
            hasMenuElement: !!menuElement,
            hasDialogElement: !!dialogElement,
            dialogClasses: dialogElement?.classList?.toString(),
            menuId: menuId,
          })}`,
          { console: true },
          "info"
        );
        // Mark this menu as processed
        this.processedMenus.add(menuId);
        this.onMenuDetected(menuType, menuElement);
      }
      this.debounceTimers.delete(menuId);
    }, 100); // 100ms debounce

    this.debounceTimers.set(menuId, timer);
  }

  detectMenuType(menuContainer) {
    if (!menuContainer) {
      return null;
    }

    const menuId = menuContainer.id;

    // RELIABLE METHOD: Find the button that controls this menu, then walk up to find the dialog
    if (menuId) {
      // Search for the button with aria-controls pointing to this menu
      const button = document.querySelector(
        `button[aria-controls="${menuId}"]`
      );

      if (button) {
        // Find ALL dialogs that contain this button
        const allDialogs = document.querySelectorAll(
          ".x-user-dialog, .x-avatar-dialog, .x-world-dialog, .x-group-dialog"
        );
        const containingDialogs = [];

        for (const dialog of allDialogs) {
          if (dialog.contains(button)) {
            // The z-index is on the .el-overlay parent element
            const overlay = dialog.closest(".el-overlay");
            const zIndex = overlay
              ? parseInt(window.getComputedStyle(overlay).zIndex) || 0
              : 0;
            containingDialogs.push({ dialog, zIndex });
          }
        }

        // Sort by z-index descending (topmost first)
        containingDialogs.sort((a, b) => b.zIndex - a.zIndex);

        if (containingDialogs.length > 0) {
          const topDialog = containingDialogs[0].dialog;

          // Extract dialog type from class
          let dialogType = null;
          if (topDialog.classList.contains("x-user-dialog"))
            dialogType = "user";
          else if (topDialog.classList.contains("x-avatar-dialog"))
            dialogType = "avatar";
          else if (topDialog.classList.contains("x-world-dialog"))
            dialogType = "world";
          else if (topDialog.classList.contains("x-group-dialog"))
            dialogType = "group";

          if (dialogType) {
            console.log(
              `[Context Menu] ${dialogType} dialog (z-index: ${containingDialogs[0].zIndex}) for menu ${menuId}`
            );
            return dialogType;
          }
        }

        console.warn(
          `[Context Menu] Button found but no containing dialog for menu ${menuId}`
        );
      } else {
        console.warn(
          `[Context Menu] No button found with aria-controls="${menuId}"`
        );
      }
    }

    return null;
  }

  onMenuDetected(menuType, menuContainer) {
    this.menuContainers.set(menuContainer.id, {
      menuType,
      container: menuContainer,
    });
    this.renderItems(menuType, menuContainer);
    window.Logger?.log(
      `${menuType} context menu detected, items initialized: ${JSON.stringify({
        menuType: menuType,
        hasMenuContainer: !!menuContainer,
        menuId: menuContainer?.id,
        itemCount: this.items.get(menuType).size,
      })}`,
      { console: true },
      "info"
    );
  }

  renderItems(menuType, menuContainer) {
    if (!menuContainer) return;

    const typeItems = this.items.get(menuType);
    typeItems.forEach((item) => {
      if (!item.enabled) return;

      // Check if this specific item already exists to avoid duplicates
      const existingItem = menuContainer.querySelector(
        `[data-custom-${menuType}-item="${item.id}"]`
      );
      if (existingItem) {
        return; // Skip if already exists
      }

      // Create Element UI dropdown item structure that matches Vue components
      const menuItem = document.createElement("div");
      menuItem.className = "el-dropdown-menu__item";
      menuItem.tabIndex = "-1";
      menuItem.setAttribute(`data-custom-${menuType}-item`, item.id);
      menuItem.style.cssText =
        "line-height: normal; padding: 0 20px; margin: 0; list-style: none; cursor: pointer; transition: background-color 0.3s;";

      if (item.divider) {
        menuItem.classList.add("el-dropdown-menu__item--divided");
      }

      // Create icon element
      const icon = document.createElement("i");
      icon.className = item.icon;
      icon.style.cssText = "margin-right: 5px;";
      menuItem.appendChild(icon);

      // Add text content
      const textNode = document.createTextNode(item.text);
      menuItem.appendChild(textNode);

      // Add hover effects
      menuItem.addEventListener("mouseenter", () => {
        menuItem.style.backgroundColor = "#f5f7fa";
      });
      menuItem.addEventListener("mouseleave", () => {
        menuItem.style.backgroundColor = "";
      });

      menuItem.onclick = (event) => {
        event.preventDefault();
        event.stopPropagation();
        this.handleItemClick(menuType, item, event);
      };

      // Insert before the arrow element if it exists, otherwise append to end
      const arrowElement = menuContainer.querySelector(".popper__arrow");
      if (arrowElement) {
        menuContainer.insertBefore(menuItem, arrowElement);
      } else {
        menuContainer.appendChild(menuItem);
      }
    });
  }

  handleItemClick(menuType, item, event) {
    let contextData = null;

    switch (menuType) {
      case "user":
        contextData = this.getUserDialogData();
        break;
      case "world":
        contextData = this.getWorldDialogData();
        break;
      case "avatar":
        contextData = this.getAvatarDialogData();
        break;
      case "group":
        contextData = this.getGroupDialogData();
        break;
      case "instance":
        contextData = this.getCurrentInstanceData();
        break;
    }

    item.onClick(contextData, event);
  }

  // User menu methods
  addUserItem(id, config) {
    return this.addItem("user", id, config);
  }

  removeUserItem(id) {
    return this.removeItem("user", id);
  }

  updateUserItem(id, updates) {
    return this.updateItem("user", id, updates);
  }

  // World menu methods
  addWorldItem(id, config) {
    return this.addItem("world", id, config);
  }

  removeWorldItem(id) {
    return this.removeItem("world", id);
  }

  updateWorldItem(id, updates) {
    return this.updateItem("world", id, updates);
  }

  // Avatar menu methods
  addAvatarItem(id, config) {
    return this.addItem("avatar", id, config);
  }

  removeAvatarItem(id) {
    return this.removeItem("avatar", id);
  }

  updateAvatarItem(id, updates) {
    return this.updateItem("avatar", id, updates);
  }

  // Group menu methods
  addGroupItem(id, config) {
    return this.addItem("group", id, config);
  }

  removeGroupItem(id) {
    return this.removeItem("group", id);
  }

  updateGroupItem(id, updates) {
    return this.updateItem("group", id, updates);
  }

  // Instance menu methods
  addInstanceItem(id, config) {
    return this.addItem("instance", id, config);
  }

  removeInstanceItem(id) {
    return this.removeItem("instance", id);
  }

  updateInstanceItem(id, updates) {
    return this.updateItem("instance", id, updates);
  }

  // Generic item management
  addItem(menuType, id, config) {
    const typeItems = this.items.get(menuType);
    if (!typeItems) {
      window.Logger?.log(
        `Invalid menu type: ${menuType}`,
        { console: true },
        "error"
      );
      return null;
    }

    const item = {
      id,
      text: config.text || "Item",
      icon: config.icon || "el-icon-more",
      className: config.className || "el-dropdown-menu__item",
      onClick: config.onClick || (() => {}),
      divider: config.divider !== false,
      enabled: config.enabled !== false,
      ...config,
    };

    typeItems.set(id, item);

    // Re-render all menus of this type
    this.menuContainers.forEach(({ menuType: containerType, container }) => {
      if (containerType === menuType) {
        this.renderItems(menuType, container);
      }
    });

    return { menuType, id, item };
  }

  removeItem(menuType, id) {
    const typeItems = this.items.get(menuType);
    if (!typeItems) {
      window.Logger?.log(
        `Invalid menu type: ${menuType}`,
        { console: true },
        "error"
      );
      return false;
    }

    const removed = typeItems.delete(id);

    // Re-render all menus of this type
    this.menuContainers.forEach(({ menuType: containerType, container }) => {
      if (containerType === menuType) {
        this.renderItems(menuType, container);
      }
    });

    return removed;
  }

  updateItem(menuType, id, updates) {
    const typeItems = this.items.get(menuType);
    if (!typeItems) {
      window.Logger?.log(
        `Invalid menu type: ${menuType}`,
        { console: true },
        "error"
      );
      return false;
    }

    const item = typeItems.get(id);
    if (item) {
      Object.assign(item, updates);

      // Re-render all menus of this type
      this.menuContainers.forEach(({ menuType: containerType, container }) => {
        if (containerType === menuType) {
          this.renderItems(menuType, container);
        }
      });
      return true;
    }
    return false;
  }

  // Data access methods - Updated for new Pinia store structure
  getUserDialogData() {
    // Try new Pinia store structure first
    if (window.$pinia?.user?.userDialog) {
      return window.$pinia.user.userDialog.ref;
    }
    // Fallback to old structure
    if (window.$app?.store?.user?.userDialog) {
      return window.$app.store.user.userDialog.ref;
    }
    if (window.$app?.userDialog) {
      return window.$app.userDialog.ref;
    }
    return null;
  }

  getWorldDialogData() {
    // Try new Pinia store structure first
    if (window.$pinia?.world?.worldDialog) {
      return window.$pinia.world.worldDialog.ref;
    }
    // Fallback to old structure
    if (window.$app?.store?.world?.worldDialog) {
      return window.$app.store.world.worldDialog.ref;
    }
    if (window.$app?.worldDialog) {
      return window.$app.worldDialog.ref;
    }
    return null;
  }

  getAvatarDialogData() {
    // Try new Pinia store structure first
    if (window.$pinia?.avatar?.avatarDialog) {
      return window.$pinia.avatar.avatarDialog.ref;
    }
    // Fallback to old structure
    if (window.$app?.store?.avatar?.avatarDialog) {
      return window.$app.store.avatar.avatarDialog.ref;
    }
    if (window.$app?.avatarDialog) {
      return window.$app.avatarDialog.ref;
    }
    return null;
  }

  getGroupDialogData() {
    // Try new Pinia store structure first
    if (window.$pinia?.group?.groupDialog) {
      return window.$pinia.group.groupDialog.ref;
    }
    // Fallback to old structure
    if (window.$app?.store?.group?.groupDialog) {
      return window.$app.store.group.groupDialog.ref;
    }
    if (window.$app?.groupDialog) {
      return window.$app.groupDialog.ref;
    }
    return null;
  }

  getCurrentInstanceData() {
    let lastLocation = null;
    let currentInstanceWorld = null;

    // Try new Pinia store structure first
    if (window.$pinia?.location) {
      lastLocation = window.$pinia.location.lastLocation;
      currentInstanceWorld = window.$pinia.location.currentInstanceWorld;
    }

    // Fallback to old structure
    if (!lastLocation && window.$app?.store?.location) {
      lastLocation = window.$app.store.location.lastLocation;
      currentInstanceWorld = window.$app.store.location.currentInstanceWorld;
    }

    if (!lastLocation && window.$app?.lastLocation) {
      lastLocation = window.$app.lastLocation;
    }
    if (!currentInstanceWorld && window.$app?.currentInstanceWorld) {
      currentInstanceWorld = window.$app.currentInstanceWorld;
    }

    return {
      instanceId: lastLocation?.location,
      worldId: lastLocation?.worldId,
      worldName: lastLocation?.name,
      userCount: currentInstanceWorld?.instance?.userCount,
      n_users: currentInstanceWorld?.instance?.n_users,
    };
  }

  // Utility methods
  clear(menuType = null) {
    if (menuType) {
      this.items.get(menuType)?.clear();
      this.menuContainers.forEach(({ menuType: containerType, container }) => {
        if (containerType === menuType) {
          this.renderItems(menuType, container);
        }
      });
    } else {
      this.items.forEach((typeItems) => typeItems.clear());
      this.menuContainers.forEach(({ menuType: containerType, container }) => {
        this.renderItems(containerType, container);
      });
    }
  }

  getItemIds(menuType) {
    return Array.from(this.items.get(menuType)?.keys() || []);
  }

  hasItem(menuType, id) {
    return this.items.get(menuType)?.has(id) || false;
  }

  // Cleanup method to clear all timers and registries
  destroy() {
    // Clear all debounce timers
    this.debounceTimers.forEach((timer) => clearTimeout(timer));
    this.debounceTimers.clear();

    // Clear all registries
    this.processedMenus.clear();
    this.menuContainers.clear();

    // Disconnect observer
    if (this.observer) {
      this.observer.disconnect();
    }
  }
}

// Auto-initialize the module
(function () {
  // Register this module in the global namespace
  window.customjs = window.customjs || {};
  window.customjs.contextMenu = new CustomContextMenu();
  window.customjs.script = window.customjs.script || {};
  window.customjs.script.contextMenu = CustomContextMenu.SCRIPT;

  // Also make CustomContextMenu available globally for backward compatibility
  window.CustomContextMenu = CustomContextMenu;

  console.log(
    `✓ Loaded ${CustomContextMenu.SCRIPT.name} v${CustomContextMenu.SCRIPT.version} by ${CustomContextMenu.SCRIPT.author}`
  );

  // Notify other modules that context menu is ready
  window.dispatchEvent(
    new CustomEvent("contextMenuReady", {
      detail: { contextMenu: window.customjs.contextMenu },
    })
  );
})();
