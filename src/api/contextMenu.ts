import { Logger } from '../modules/logger';

export class ContextMenuAPI {
  menuTypes: string[];
  items: Map<string, Map<string, any>>;
  menuContainers: Map<string, any>;
  processedMenus: Set<string>;
  debounceTimers: Map<string, any>;
  logger: Logger;
  observers: MutationObserver[];

  constructor() {
    this.logger = new Logger("api:contextMenu");
    this.menuTypes = ["user", "world", "avatar", "group", "instance"];
    this.items = new Map();
    this.menuContainers = new Map();
    this.processedMenus = new Set();
    this.debounceTimers = new Map();
    this.observers = [];

    this.menuTypes.forEach((menuType) => {
      this.items.set(menuType, new Map());
    });
  }

  async init() {
    const observer = new MutationObserver((mutations) => {
      this.handleMutations(mutations);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["style", "data-state", "class"],
    });

    this.observers.push(observer);
    this.logger.log("Context Menu API started, watching for dropdowns");
  }

  handleMutations(mutations: MutationRecord[]) {
    mutations.forEach((mutation) => {
      if (mutation.type === "attributes" && mutation.target) {
        this.handleAttributeChange(mutation.target as HTMLElement);
      }
      if (mutation.addedNodes.length) {
        mutation.addedNodes.forEach((node) => this.handleAddedNode(node as HTMLElement));
      }
      if (mutation.removedNodes.length) {
        mutation.removedNodes.forEach((node) => this.handleRemovedNode(node as HTMLElement));
      }
    });
  }

  handleAttributeChange(node: HTMLElement) {
    // Radix UI dropdowns
    if (node.hasAttribute('data-radix-popper-content-wrapper') || node.getAttribute('role') === 'menu') {
      const isVisible = node.getAttribute("data-state") === "open" || node.style.display !== "none";
      if (isVisible) {
        const menuContainer = node.getAttribute('role') === 'menu' ? node : node.querySelector('[role="menu"]');
        if (menuContainer) {
          const menuId = menuContainer.id || `menu-${Date.now()}`;
          if (!this.processedMenus.has(menuId)) {
            const menuType = this.detectMenuType(menuContainer as HTMLElement);
            if (menuType && this.items.get(menuType)!.size > 0) {
              this.debouncedMenuDetection(menuId, menuType, menuContainer as HTMLElement);
            }
          }
        }
      }
    }
  }

  handleAddedNode(node: HTMLElement) {
    if (node.getAttribute && (node.getAttribute('role') === 'menuitem' || node.getAttribute('role') === 'menu')) {
      let menuContainer = node.getAttribute('role') === 'menu' ? node : node.closest('[role="menu"]');
      if (!menuContainer) return;

      const menuId = menuContainer.id || `menu-${Date.now()}`;
      if (this.processedMenus.has(menuId)) return;

      const menuType = this.detectMenuType(menuContainer as HTMLElement);
      if (menuType && this.items.get(menuType)!.size > 0) {
        this.debouncedMenuDetection(menuId, menuType, menuContainer as HTMLElement);
      }
    }
  }

  handleRemovedNode(node: HTMLElement) {
    if (node.getAttribute && (node.getAttribute('role') === 'menuitem' || node.getAttribute('role') === 'menu')) {
      let menuId = node.getAttribute('role') === 'menu' ? node.id : node.closest('[role="menu"]')?.id;
      if (menuId && this.processedMenus.has(menuId)) {
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

  debouncedMenuDetection(menuId: string, menuType: string, menuElement: HTMLElement) {
    if (this.debounceTimers.has(menuId)) clearTimeout(this.debounceTimers.get(menuId));

    const timerId = setTimeout(() => {
      const dropdown = menuElement.closest("[data-radix-popper-content-wrapper]") as HTMLElement || menuElement;
      if (dropdown) {
        const isStillVisible = dropdown.getAttribute("data-state") !== "closed" && dropdown.style.display !== "none";
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

  detectMenuType(menuContainer: HTMLElement) {
    const dialogs = [
      ...Array.from(document.querySelectorAll(".x-user-dialog")),
      ...Array.from(document.querySelectorAll(".x-avatar-dialog")),
      ...Array.from(document.querySelectorAll(".x-world-dialog")),
      ...Array.from(document.querySelectorAll(".x-group-dialog")),
    ];

    for (const dialog of dialogs) {
      if (dialog.contains(menuContainer)) {
        if (dialog.classList.contains("x-user-dialog")) return "user";
        if (dialog.classList.contains("x-avatar-dialog")) return "avatar";
        if (dialog.classList.contains("x-world-dialog")) return "world";
        if (dialog.classList.contains("x-group-dialog")) return "group";
      }
    }
    return null;
  }

  processMenu(menuId: string, menuType: string, menuContainer: HTMLElement) {
    this.processedMenus.add(menuId);
    this.menuContainers.set(menuId, { menuType, container: menuContainer });

    const items = this.items.get(menuType);
    if (!items || items.size === 0) return;

    items.forEach((item, itemId) => {
      this.addMenuItemToContainer(menuContainer, menuType, itemId, item);
    });
  }

  addMenuItemToContainer(container: HTMLElement, menuType: string, itemId: string, item: any) {
    if (container.querySelector(`[data-custom-item-id="${itemId}"]`)) return;

    // Radix/Shadcn DropdownMenuItem structure
    const menuItem = document.createElement("div");
    menuItem.className = "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50";
    menuItem.setAttribute("role", "menuitem");
    menuItem.setAttribute("data-custom-item-id", itemId);
    menuItem.tabIndex = -1;

    if (item.icon) {
      const icon = document.createElement("i");
      icon.className = item.icon + " mr-2 h-4 w-4";
      menuItem.appendChild(icon);
    }

    const textSpan = document.createElement("span");
    textSpan.textContent = item.text;
    menuItem.appendChild(textSpan);

    menuItem.addEventListener("click", () => {
      this.handleItemClick(menuType, itemId, item);
      // Close Radix menu by simulating Escape
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });

    container.appendChild(menuItem);
  }

  handleItemClick(menuType: string, itemId: string, item: any) {
    const dialogData = this.getDialogData(menuType);
    if (item.onClick && typeof item.onClick === "function") {
      try {
        item.onClick(dialogData);
      } catch (error) {
        this.logger.error(`Error in ${menuType} menu item ${itemId}:`, error);
      }
    }
  }

  getDialogData(menuType: string) {
    try {
      if (menuType === "user" && window.$pinia?.user) return window.$pinia.user.userDialog?.ref;
      if (menuType === "avatar" && window.$pinia?.avatar) return window.$pinia.avatar.avatarDialog?.ref;
      if (menuType === "world" && window.$pinia?.world) return window.$pinia.world.worldDialog?.ref;
      if (menuType === "group" && window.$pinia?.group) return window.$pinia.group.groupDialog?.ref;
    } catch (error) {
      this.logger.error(`Error extracting dialog data:`, error);
    }
    return null;
  }

  addUserItem(itemId: string, item: any) { return this.addItem("user", itemId, item); }
  addAvatarItem(itemId: string, item: any) { return this.addItem("avatar", itemId, item); }
  addWorldItem(itemId: string, item: any) { return this.addItem("world", itemId, item); }
  addGroupItem(itemId: string, item: any) { return this.addItem("group", itemId, item); }
  addInstanceItem(itemId: string, item: any) { return this.addItem("instance", itemId, item); }

  addItem(menuType: string, itemId: string, item: any) {
    const items = this.items.get(menuType);
    if (items) {
      items.set(itemId, item);
      return true;
    }
    return false;
  }

  removeItem(menuType: string, itemId: string) {
    const items = this.items.get(menuType);
    if (items && items.delete(itemId)) {
      this.menuContainers.forEach(({ container }) => {
        const element = container.querySelector(`[data-custom-item-id="${itemId}"]`);
        if (element) element.remove();
      });
      return true;
    }
    return false;
  }
}
