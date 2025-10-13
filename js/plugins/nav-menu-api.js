class NavMenuApiPlugin extends Plugin {
  constructor() {
    super({
      name: "Navigation Menu API",
      description: "API for adding custom navigation menu items to VRCX",
      author: "Bluscream",
      version: "1.0.0",
      build: "1760363253",
      dependencies: [],
    });

    // Map of itemId -> item config
    this.customItems = new Map();

    // Map of itemId -> content element
    this.contentContainers = new Map();

    // Navigation menu element
    this.navMenu = null;

    // Content parent element
    this.contentParent = null;
  }

  async load() {
    this.logger.log("Navigation Menu API ready");
    this.loaded = true;
  }

  async start() {
    // Wait for nav menu to be available
    await this.waitForNavMenu();

    // Setup content area
    await this.setupContentArea();

    // Setup mutation observer
    this.setupObserver();

    // Render any items that were added before start
    this.renderAllItems();

    this.enabled = true;
    this.started = true;
    this.logger.log("Navigation Menu API started");
  }

  async onLogin(currentUser) {
    this.logger.log(
      `Setting up menu watcher for user: ${currentUser?.displayName}`
    );

    // Setup Pinia watcher
    this.watchMenuChanges();
  }

  async stop() {
    this.logger.log("Stopping Navigation Menu API");

    // Remove all items
    this.clearAllItems();

    // Parent cleanup (will disconnect observer automatically)
    await super.stop();
  }

  async waitForNavMenu() {
    return new Promise((resolve) => {
      const checkNav = () => {
        this.navMenu = document.querySelector(".el-menu");

        if (this.navMenu) {
          this.logger.log("Navigation menu found");
          resolve();
        } else {
          setTimeout(checkNav, 500);
        }
      };

      setTimeout(checkNav, 1000);
    });
  }

  async setupContentArea() {
    return new Promise((resolve) => {
      const findContentArea = () => {
        this.contentParent = document.querySelector(".el-splitter");

        if (this.contentParent) {
          this.logger.log("Content area found, ready to add tab content");
          resolve();
        } else {
          setTimeout(findContentArea, 500);
        }
      };

      setTimeout(findContentArea, 1000);
    });
  }

  setupObserver() {
    // Watch for nav menu changes to re-render custom items if needed
    const observer = new MutationObserver(() => {
      if (this.navMenu && !document.contains(this.navMenu)) {
        // Nav menu was removed, wait for it to come back
        this.navMenu = null;
        this.waitForNavMenu().then(() => this.renderAllItems());
      }
    });

    // Register observer for automatic cleanup
    this.registerObserver(observer);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    this.logger.log("Mutation observer setup complete");
  }

  watchMenuChanges() {
    // Subscribe to UI store changes
    this.subscribe("UI", ({ menuActiveIndex }) => {
      this.updateContentVisibility(menuActiveIndex);
    });

    // Call immediately with current value if available
    if (window.$pinia?.ui?.menuActiveIndex) {
      this.updateContentVisibility(window.$pinia.ui.menuActiveIndex);
    }

    this.logger.log("Menu watcher setup complete");
  }

  updateContentVisibility(activeIndex) {
    // Show/hide custom content containers based on active menu
    this.contentContainers.forEach((container, itemId) => {
      container.style.display = activeIndex === itemId ? "block" : "none";
    });

    // Update active state on menu items
    this.customItems.forEach((item, itemId) => {
      const menuItem = this.navMenu?.querySelector(
        `[data-custom-nav-item="${itemId}"]`
      );
      if (menuItem) {
        if (activeIndex === itemId) {
          menuItem.classList.add("is-active");
        } else {
          menuItem.classList.remove("is-active");
        }
      }
    });
  }

  /**
   * Add a custom navigation menu item with optional content container
   * @param {string} id - Unique identifier for the item
   * @param {object} config - Item configuration
   * @param {string} config.label - Display label (or i18n key)
   * @param {string} config.icon - Remix icon class (e.g., 'ri-plugin-line')
   * @param {function} config.onClick - Click handler (optional if using content)
   * @param {HTMLElement|function|string} config.content - Content element, function, or HTML string
   * @param {string} config.before - Insert before this item index (optional)
   * @param {string} config.after - Insert after this item index (optional)
   * @param {boolean} config.enabled - Whether the item is enabled (default: true)
   */
  addItem(id, config) {
    const item = {
      id,
      label: config.label || id,
      icon: config.icon || "ri-plugin-line",
      onClick: config.onClick || null,
      content: config.content || null,
      before: config.before || null,
      after: config.after || null,
      enabled: config.enabled !== false,
    };

    this.customItems.set(id, item);
    this.logger.log(`Added item: ${id}`);

    if (this.navMenu) {
      this.renderItem(item);
    }

    // Create content container if content is provided
    if (item.content && this.contentParent) {
      this.createContentContainer(id, item.content);
    } else if (item.content && !this.contentParent) {
      // Content parent not ready yet, retry later
      setTimeout(() => {
        if (this.contentParent) {
          this.createContentContainer(id, item.content);
        }
      }, 2000);
    }

    return item;
  }

  /**
   * Create a content container for a nav item
   * @param {string} id - Item identifier
   * @param {HTMLElement|function|string} content - Content element, generator function, or HTML string
   */
  createContentContainer(id, content) {
    if (!this.contentParent) {
      this.logger.warn(`Content parent not ready for ${id}`);
      return;
    }

    // Create container div
    const container = document.createElement("div");
    container.id = `custom-nav-content-${id}`;
    container.className = "x-container";
    container.style.cssText = `
      display: none;
      padding: 20px;
      height: 100%;
      overflow-y: auto;
    `;

    // Set content
    if (typeof content === "function") {
      const result = content();
      if (result instanceof HTMLElement) {
        container.appendChild(result);
      } else if (typeof result === "string") {
        container.innerHTML = result;
      }
    } else if (content instanceof HTMLElement) {
      container.appendChild(content);
    } else if (typeof content === "string") {
      container.innerHTML = content;
    }

    // Find the first el-splitter-panel and append to it
    const panel = this.contentParent.querySelector(".el-splitter-panel");
    if (panel) {
      panel.appendChild(container);
      this.contentContainers.set(id, container);
      this.logger.log(`Created content container for: ${id}`);
    }
  }

  /**
   * Remove a custom navigation menu item
   * @param {string} id - Item identifier
   */
  removeItem(id) {
    if (!this.customItems.has(id)) {
      this.logger.warn(`Item not found: ${id}`);
      return false;
    }

    this.customItems.delete(id);

    // Remove from DOM
    const element = this.navMenu?.querySelector(
      `[data-custom-nav-item="${id}"]`
    );
    if (element) {
      element.remove();
    }

    // Remove content container
    const container = this.contentContainers.get(id);
    if (container) {
      container.remove();
      this.contentContainers.delete(id);
    }

    this.logger.log(`Removed item: ${id}`);
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
      this.logger.warn(`Item not found: ${id}`);
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

    this.logger.log(`Updated item: ${id}`);
    return true;
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
    this.logger.log(`Cleared all ${ids.length} custom items`);
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

    // Add click handler with automatic cleanup
    const clickHandler = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Remove active class from all custom menu items
      this.customItems.forEach((_, itemId) => {
        const el = this.navMenu?.querySelector(
          `[data-custom-nav-item="${itemId}"]`
        );
        if (el) {
          el.classList.remove("is-active");
        }
      });

      // Add active class to clicked item immediately
      menuItem.classList.add("is-active");

      // If item has content, use VRCX's selectMenu to switch tabs
      if (item.content && window.$pinia?.ui?.selectMenu) {
        window.$pinia.ui.selectMenu(item.id);
      }

      // Call custom onClick if provided
      if (item.onClick) {
        item.onClick();
      }
    };

    this.registerListener(menuItem, "click", clickHandler);

    // Add hover effect to show tooltip
    const hoverHandler = () => {
      menuItem.setAttribute("title", item.label);
    };

    this.registerListener(menuItem, "mouseenter", hoverHandler);

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

    this.logger.log(`Rendered item: ${item.id}`);
  }

  renderAllItems() {
    this.customItems.forEach((item) => {
      this.renderItem(item);
    });
  }
}

// Export plugin class for PluginLoader
window.customjs.__LAST_PLUGIN_CLASS__ = NavMenuApiPlugin;
