import { Logger } from '../modules/logger';

export class NavigationAPI {
  customItems: Map<string, any>;
  contentContainers: Map<string, HTMLElement>;
  navMenu: HTMLElement | null;
  contentParent: HTMLElement | null;
  currentActiveIndex: string | null;
  logger: Logger;
  observers: MutationObserver[];

  constructor() {
    this.logger = new Logger("api:navigation");
    this.customItems = new Map();
    this.contentContainers = new Map();
    this.navMenu = null;
    this.contentParent = null;
    this.currentActiveIndex = null;
    this.observers = [];
  }

  async init() {
    this.logger.log("Initializing Navigation API");
    await this.waitForNavMenu();
    await this.setupContentArea();
    this.setupObserver();
    this.renderAllItems();
    this.watchMenuChanges();
    this.logger.log("Navigation API started");
  }

  async waitForNavMenu() {
    return new Promise<void>((resolve) => {
      let attempts = 0;
      const maxAttempts = 50;

      const checkNav = () => {
        // Shadcn UI sidebar list
        this.navMenu = document.querySelector('[data-slot="sidebar"] ul') || document.querySelector('[data-sidebar="menu"]');

        if (this.navMenu) {
          const navItems = this.navMenu.querySelectorAll('li');
          if (navItems.length > 0) {
            this.logger.log("Navigation menu found with items");
            resolve();
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkNav, 100);
          } else {
            this.logger.log("Navigation menu found (no items yet, proceeding anyway)");
            resolve();
          }
        } else {
          setTimeout(checkNav, 500);
        }
      };

      setTimeout(checkNav, 1000);
    });
  }

  async setupContentArea() {
    return new Promise<void>((resolve) => {
      const findContentArea = () => {
        // Shadcn main content area
        this.contentParent = document.querySelector('main') || 
                             document.querySelector('[data-slot="sidebar-inset"]') || 
                             document.querySelector('[data-sidebar="inset"]') as HTMLElement;

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
    const observer = new MutationObserver(() => {
      if (this.navMenu && !document.contains(this.navMenu)) {
        this.navMenu = null;
        this.waitForNavMenu().then(() => this.renderAllItems());
      }
    });

    observer.observe(document.body, { childList: true, subtree: true });
    this.observers.push(observer);
  }

  watchMenuChanges() {
    const checkPinia = () => {
      if (window.$pinia && window.$pinia.ui) {
        window.$pinia.ui.$subscribe((mutation: any, state: any) => {
          if (state.menuActiveIndex) {
            this.updateContentVisibility(state.menuActiveIndex);
          }
        });

        if (window.$pinia.ui.menuActiveIndex) {
          this.updateContentVisibility(window.$pinia.ui.menuActiveIndex);
        }
      } else {
        setTimeout(checkPinia, 500);
      }
    };
    checkPinia();
  }

  updateContentVisibility(activeIndex: string) {
    const previousIndex = this.currentActiveIndex;
    this.currentActiveIndex = activeIndex;
    const isCustomTab = this.customItems.has(activeIndex);

    if (isCustomTab && this.contentParent) {
      // Hide native VRCX content inside main
      Array.from(this.contentParent.children).forEach((child) => {
        const el = child as HTMLElement;
        if (!el.id?.startsWith("custom-nav-content-")) {
          el.style.display = "none";
        }
      });
    }

    this.contentContainers.forEach((container, itemId) => {
      const isActive = activeIndex === itemId;
      const wasActive = previousIndex === itemId;

      container.style.display = isActive ? "block" : "none";

      if (isActive && !wasActive) {
        const item = this.customItems.get(itemId);
        if (item?.onShow) {
          try { item.onShow(); } catch (e) { this.logger.error(`Error in onShow:`, e); }
        }
      } else if (!isActive && wasActive) {
        const item = this.customItems.get(itemId);
        if (item?.onHide) {
          try { item.onHide(); } catch (e) { this.logger.error(`Error in onHide:`, e); }
        }
      }
    });

    this.customItems.forEach((item, itemId) => {
      const menuItem = this.navMenu?.querySelector(`[data-custom-nav-item="${itemId}"]`);
      if (menuItem) {
        const btn = menuItem.querySelector('button');
        if (btn) btn.setAttribute("data-active", activeIndex === itemId ? "true" : "false");
      }
    });
  }

  addItem(id: string, config: any) {
    const item = {
      id,
      label: config.label || id,
      icon: config.icon || "ri-plugin-line",
      onClick: config.onClick || null,
      content: config.content || null,
      onShow: config.onShow || null,
      onHide: config.onHide || null,
      position: config.position !== undefined ? config.position : null,
      before: config.before || null,
      after: config.after || null,
      enabled: config.enabled !== false,
    };

    this.customItems.set(id, item);
    
    if (this.navMenu) this.renderItem(item);

    if (item.content && this.contentParent) {
      this.createContentContainer(id, item.content);
    } else if (item.content && !this.contentParent) {
      setTimeout(() => {
        if (this.contentParent) this.createContentContainer(id, item.content);
      }, 2000);
    }

    return item;
  }

  createContentContainer(id: string, content: any) {
    if (!this.contentParent) return;

    const container = document.createElement("div");
    container.id = `custom-nav-content-${id}`;
    container.className = "flex-1 overflow-y-auto"; // modern classes
    container.style.cssText = `display: none; padding: 20px; height: 100%;`;

    if (typeof content === "function") {
      const result = content();
      if (result instanceof HTMLElement) container.appendChild(result);
      else if (typeof result === "string") container.innerHTML = result;
    } else if (content instanceof HTMLElement) {
      container.appendChild(content);
    } else if (typeof content === "string") {
      container.innerHTML = content;
    }

    this.contentParent.appendChild(container);
    this.contentContainers.set(id, container);
  }

  removeItem(id: string) {
    this.customItems.delete(id);
    const element = this.navMenu?.querySelector(`[data-custom-nav-item="${id}"]`);
    if (element) element.remove();

    const container = this.contentContainers.get(id);
    if (container) {
      container.remove();
      this.contentContainers.delete(id);
    }
    return true;
  }

  renderItem(item: any) {
    if (!this.navMenu || !item.enabled) return;
    if (this.navMenu.querySelector(`[data-custom-nav-item="${item.id}"]`)) return;

    const menuItem = document.createElement("li");
    menuItem.setAttribute("data-slot", "sidebar-menu-item");
    menuItem.className = "group/menu-item relative";
    menuItem.setAttribute("data-custom-nav-item", item.id);
    menuItem.setAttribute("role", "menuitem");

    const button = document.createElement("button");
    button.setAttribute("data-slot", "sidebar-menu-button");
    button.setAttribute("data-active", "false");
    // Shadcn sidebar button classes
    button.className = "flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground h-8 text-sm group-data-[collapsible=icon]:!p-0";
    button.setAttribute("title", item.label);

    const icon = document.createElement("i");
    icon.className = item.icon + " inline-flex size-6 items-center justify-center text-lg relative";

    const label = document.createElement("span");
    label.className = "truncate";
    label.textContent = item.label;

    button.appendChild(icon);
    button.appendChild(label);
    menuItem.appendChild(button);

    button.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      if (item.content) {
        if (window.$pinia?.ui) {
          window.$pinia.ui.menuActiveIndex = item.id;
        } else {
          this.updateContentVisibility(item.id);
        }
      } else {
        button.setAttribute("data-active", "true");
        setTimeout(() => button.setAttribute("data-active", "false"), 200);
      }

      if (item.onClick) item.onClick();
    });

    this.navMenu.appendChild(menuItem);
  }

  renderAllItems() {
    this.customItems.forEach((item) => {
      this.renderItem(item);
      if (item.content && this.contentParent && !this.contentContainers.has(item.id)) {
        this.createContentContainer(item.id, item.content);
      }
    });
  }
}
