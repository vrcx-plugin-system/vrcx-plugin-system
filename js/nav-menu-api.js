// ============================================================================
// NAVIGATION MENU API
// ============================================================================

class NavMenuAPI {
  static SCRIPT = {
    name: "Navigation Menu API",
    description: "API for adding custom navigation menu items to VRCX",
    author: "Bluscream",
    version: "1.0.0",
    build: "1760222453",
    dependencies: [],
  };

  constructor() {
    this.customItems = new Map(); // Map of itemId -> item config
    this.observer = null;
    this.navMenu = null;
    this.on_startup();
  }

  on_startup() {
    // Wait for nav menu to be available
    this.waitForNavMenu();
  }

  waitForNavMenu() {
    const checkNav = () => {
      this.navMenu = document.querySelector(".el-menu");

      if (this.navMenu) {
        console.log("[NavMenu] Navigation menu found, ready to add items");
        this.setupObserver();
        this.renderAllItems();
      } else {
        setTimeout(checkNav, 500);
      }
    };

    setTimeout(checkNav, 1000);
  }

  setupObserver() {
    // Watch for nav menu changes to re-render custom items if needed
    this.observer = new MutationObserver(() => {
      if (this.navMenu && !document.contains(this.navMenu)) {
        // Nav menu was removed, wait for it to come back
        this.navMenu = null;
        this.waitForNavMenu();
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  /**
   * Add a custom navigation menu item
   * @param {string} id - Unique identifier for the item
   * @param {object} config - Item configuration
   * @param {string} config.label - Display label (or i18n key)
   * @param {string} config.icon - Remix icon class (e.g., 'ri-plugin-line')
   * @param {function} config.onClick - Click handler
   * @param {string} config.before - Insert before this item index (optional)
   * @param {string} config.after - Insert after this item index (optional)
   * @param {boolean} config.enabled - Whether the item is enabled (default: true)
   */
  addItem(id, config) {
    const item = {
      id,
      label: config.label || id,
      icon: config.icon || "ri-plugin-line",
      onClick: config.onClick || (() => console.log(`Nav item clicked: ${id}`)),
      before: config.before || null,
      after: config.after || null,
      enabled: config.enabled !== false,
    };

    this.customItems.set(id, item);
    console.log(`[NavMenu] Added item: ${id}`);

    if (this.navMenu) {
      this.renderItem(item);
    }

    return item;
  }

  /**
   * Remove a custom navigation menu item
   * @param {string} id - Item identifier
   */
  removeItem(id) {
    if (!this.customItems.has(id)) {
      console.warn(`[NavMenu] Item not found: ${id}`);
      return false;
    }

    this.customItems.delete(id);

    // Remove from DOM
    const element = this.navMenu?.querySelector(
      `[data-custom-nav-item="${id}"]`
    );
    if (element) {
      element.remove();
      console.log(`[NavMenu] Removed item: ${id}`);
    }

    return true;
  }

  /**
   * Update an existing navigation menu item
   * @param {string} id - Item identifier
   * @param {object} updates - Properties to update
   */
  updateItem(id, updates) {
    const item = this.customItems.get(id);
    if (!item) {
      console.warn(`[NavMenu] Item not found: ${id}`);
      return false;
    }

    Object.assign(item, updates);

    // Re-render the item
    const element = this.navMenu?.querySelector(
      `[data-custom-nav-item="${id}"]`
    );
    if (element) {
      element.remove();
      this.renderItem(item);
    }

    console.log(`[NavMenu] Updated item: ${id}`);
    return true;
  }

  renderItem(item) {
    if (!this.navMenu || !item.enabled) return;

    // Check if item already exists
    const existing = this.navMenu.querySelector(
      `[data-custom-nav-item="${item.id}"]`
    );
    if (existing) return;

    // Create the menu item element
    const menuItem = document.createElement("li");
    menuItem.className = "el-menu-item";
    menuItem.setAttribute("data-custom-nav-item", item.id);
    menuItem.setAttribute("role", "menuitem");
    menuItem.setAttribute("tabindex", "-1");

    // Create icon
    const icon = document.createElement("i");
    icon.className = item.icon;
    icon.style.fontSize = "19px";
    icon.style.width = "24px";
    icon.style.height = "24px";
    icon.style.display = "inline-flex";
    icon.style.alignItems = "center";
    icon.style.justifyContent = "center";

    // Create tooltip wrapper
    const tooltip = document.createElement("span");
    tooltip.className = "el-tooltip__trigger";
    tooltip.textContent = item.label;
    tooltip.style.display = "none"; // Hidden until hover

    menuItem.appendChild(icon);
    menuItem.appendChild(tooltip);

    // Add click handler
    menuItem.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      item.onClick();
    });

    // Add hover effect to show tooltip
    menuItem.addEventListener("mouseenter", () => {
      menuItem.setAttribute("title", item.label);
    });

    // Determine insertion position
    let referenceNode = null;

    if (item.before) {
      // Insert before a specific item
      const allItems = this.navMenu.querySelectorAll(".el-menu-item");
      for (const existingItem of allItems) {
        const index = existingItem.getAttribute("index");
        if (index === item.before) {
          referenceNode = existingItem;
          break;
        }
      }
    } else if (item.after) {
      // Insert after a specific item
      const allItems = this.navMenu.querySelectorAll(".el-menu-item");
      for (const existingItem of allItems) {
        const index = existingItem.getAttribute("index");
        if (index === item.after) {
          referenceNode = existingItem.nextSibling;
          break;
        }
      }
    }

    // Insert the item
    if (referenceNode) {
      this.navMenu.insertBefore(menuItem, referenceNode);
    } else {
      // Append to end
      this.navMenu.appendChild(menuItem);
    }

    console.log(`[NavMenu] Rendered item: ${item.id}`);
  }

  renderAllItems() {
    this.customItems.forEach((item) => {
      this.renderItem(item);
    });
  }

  /**
   * Check if an item exists
   * @param {string} id - Item identifier
   */
  hasItem(id) {
    return this.customItems.has(id);
  }

  /**
   * Get all custom items
   */
  getAllItems() {
    return Array.from(this.customItems.values());
  }

  /**
   * Clear all custom items
   */
  clearAllItems() {
    const ids = Array.from(this.customItems.keys());
    ids.forEach((id) => this.removeItem(id));
    console.log(`[NavMenu] Cleared all ${ids.length} custom items`);
  }
}

// Auto-initialize the module
(function () {
  window.customjs = window.customjs || {};
  window.customjs.navMenu = new NavMenuAPI();
  window.customjs.script = window.customjs.script || {};
  window.customjs.script.navMenu = NavMenuAPI.SCRIPT;

  console.log(
    `✓ Loaded ${NavMenuAPI.SCRIPT.name} v${NavMenuAPI.SCRIPT.version} by ${NavMenuAPI.SCRIPT.author}`
  );
})();
