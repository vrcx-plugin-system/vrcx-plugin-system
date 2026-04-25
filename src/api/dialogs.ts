import { Logger } from '../modules/logger';
import { EventRegistry } from '../modules/events';

export class DialogsAPI {
  customDialogs: Map<string, any>;
  dialogContainers: Map<string, HTMLElement>;
  dialogWrapperElement: HTMLElement | null;
  logger: Logger;
  observers: MutationObserver[];

  constructor() {
    this.logger = new Logger("api:dialogs");
    this.customDialogs = new Map();
    this.dialogContainers = new Map();
    this.dialogWrapperElement = null;
    this.observers = [];
  }

  async init() {
    this.logger.log("Initializing Dialog API");
    await this.setupDialogWrapper();
    this.watchNativeDialogs();
    this.logger.log("Dialog API started");
  }

  async setupDialogWrapper() {
    return new Promise<void>((resolve) => {
      const createWrapper = () => {
        this.dialogWrapperElement = document.createElement("div");
        this.dialogWrapperElement.id = "customjs-dialog-wrapper";
        this.dialogWrapperElement.style.cssText = "position: relative; z-index: 2000;";

        const appContainer = document.querySelector("#app") || document.body;
        appContainer.appendChild(this.dialogWrapperElement);

        this.logger.log("Dialog wrapper created");
        resolve();
      };

      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", createWrapper);
      } else {
        createWrapper();
      }
    });
  }

  watchNativeDialogs() {
    const checkPinia = () => {
      if (window.$pinia && window.$pinia.dialog) {
        // Watch the dialog store for changes
        window.$pinia.dialog.$subscribe((mutation: any, state: any) => {
          // Monitor specific native dialogs opening
          if (state.userDialog?.visible && !mutation.events?.oldValue?.visible) {
            window.customjs.eventRegistry.emit('ShowUserDialog', { userId: state.userDialog.id, dialog: state.userDialog });
          }
          if (state.worldDialog?.visible && !mutation.events?.oldValue?.visible) {
            window.customjs.eventRegistry.emit('ShowWorldDialog', { worldId: state.worldDialog.id, dialog: state.worldDialog });
          }
          if (state.avatarDialog?.visible && !mutation.events?.oldValue?.visible) {
            window.customjs.eventRegistry.emit('ShowAvatarDialog', { avatarId: state.avatarDialog.id, dialog: state.avatarDialog });
          }
          if (state.groupDialog?.visible && !mutation.events?.oldValue?.visible) {
            window.customjs.eventRegistry.emit('ShowGroupDialog', { groupId: state.groupDialog.id, dialog: state.groupDialog });
          }
        });
        this.logger.log("Native dialog watcher initialized");
      } else {
        setTimeout(checkPinia, 500);
      }
    };
    checkPinia();
  }

  registerDialog(dialogId: string, options: any) {
    if (this.customDialogs.has(dialogId)) {
      this.logger.warn(`Dialog ${dialogId} already exists, overwriting`);
    }

    const dialog = {
      id: dialogId,
      visible: false,
      title: options.title || "Custom Dialog",
      width: options.width || "600px",
      content: options.content || "",
      showClose: options.showClose !== false,
      closeOnClickModal: options.closeOnClickModal !== false,
      closeOnPressEscape: options.closeOnPressEscape !== false,
      fullscreen: options.fullscreen || false,
      modal: options.modal !== false,
      beforeClose: options.beforeClose,
      onOpen: options.onOpen,
      onClose: options.onClose,
    };

    this.customDialogs.set(dialogId, dialog);
    this.logger.log(`Registered dialog: ${dialogId}`);

    return {
      show: () => this.showDialog(dialogId),
      hide: () => this.closeDialog(dialogId),
      toggle: () => this.toggleDialog(dialogId),
      setTitle: (title: string) => this.setDialogTitle(dialogId, title),
      setContent: (content: any) => this.setDialogContent(dialogId, content),
      isVisible: () => this.isDialogVisible(dialogId),
      destroy: () => this.destroyDialog(dialogId),
    };
  }

  async showConfirmDialogAsync(title: string, message: string): Promise<boolean> {
    try {
      return confirm(`${title}\n\n${message}`);
    } catch (error) {
      return confirm(`${title}\n\n${message}`);
    }
  }

  showDialog(dialogId: string): boolean {
    const dialog = this.customDialogs.get(dialogId);
    if (!dialog) return false;
    if (dialog.visible) return false;

    dialog.visible = true;
    if (dialog.onOpen) {
      try { dialog.onOpen(); } catch (e) { this.logger.error(`Error in onOpen:`, e); }
    }

    this.renderDialog(dialogId);
    return true;
  }

  closeDialog(dialogId: string): boolean {
    const dialog = this.customDialogs.get(dialogId);
    if (!dialog || !dialog.visible) return false;

    if (dialog.beforeClose) {
      try {
        if (dialog.beforeClose() === false) return false;
      } catch (e) { this.logger.error(`Error in beforeClose:`, e); }
    }

    dialog.visible = false;
    const container = this.dialogContainers.get(dialogId);
    if (container) container.style.display = "none";

    if (dialog.onClose) {
      try { dialog.onClose(); } catch (e) { this.logger.error(`Error in onClose:`, e); }
    }

    return true;
  }

  toggleDialog(dialogId: string) {
    if (this.isDialogVisible(dialogId)) this.closeDialog(dialogId);
    else this.showDialog(dialogId);
  }

  setDialogTitle(dialogId: string, title: string) {
    const dialog = this.customDialogs.get(dialogId);
    if (!dialog) return;
    dialog.title = title;

    if (dialog.visible) {
      const container = this.dialogContainers.get(dialogId);
      if (container) {
        const titleElement = container.querySelector(".dialog-title") as HTMLElement;
        if (titleElement) titleElement.textContent = title;
      }
    }
  }

  setDialogContent(dialogId: string, content: string | HTMLElement) {
    const dialog = this.customDialogs.get(dialogId);
    if (!dialog) return;
    dialog.content = content;

    if (dialog.visible) {
      const container = this.dialogContainers.get(dialogId);
      if (container) {
        const bodyElement = container.querySelector(".dialog-body") as HTMLElement;
        if (bodyElement) {
          if (typeof content === "string") bodyElement.innerHTML = content;
          else if (content instanceof HTMLElement) {
            bodyElement.innerHTML = "";
            bodyElement.appendChild(content);
          }
        }
      }
    }
  }

  isDialogVisible(dialogId: string): boolean {
    const dialog = this.customDialogs.get(dialogId);
    return dialog ? dialog.visible : false;
  }

  destroyDialog(dialogId: string) {
    this.closeDialog(dialogId);
    const container = this.dialogContainers.get(dialogId);
    if (container && container.parentNode) container.parentNode.removeChild(container);
    this.dialogContainers.delete(dialogId);
    this.customDialogs.delete(dialogId);
  }

  renderDialog(dialogId: string) {
    const dialog = this.customDialogs.get(dialogId);
    if (!dialog || !this.dialogWrapperElement) return;

    let container = this.dialogContainers.get(dialogId);
    if (!container) {
      container = document.createElement("div");
      container.className = "customjs-dialog-container relative z-50";
      container.setAttribute("data-dialog-id", dialogId);
      this.dialogWrapperElement.appendChild(container);
      this.dialogContainers.set(dialogId, container);
    }

    container.innerHTML = "";
    container.style.display = dialog.visible ? "block" : "none";

    // Shadcn style overlay
    const overlay = document.createElement("div");
    overlay.className = "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0";
    
    if (dialog.closeOnClickModal) {
      overlay.addEventListener("click", () => this.closeDialog(dialogId));
    }
    container.appendChild(overlay);

    const dialogWrapper = document.createElement("div");
    dialogWrapper.className = "fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg";
    dialogWrapper.style.width = dialog.width;

    const header = document.createElement("div");
    header.className = "flex flex-col space-y-1.5 text-center sm:text-left";
    
    const titleElement = document.createElement("h2");
    titleElement.className = "dialog-title text-lg font-semibold leading-none tracking-tight";
    titleElement.textContent = dialog.title;
    header.appendChild(titleElement);

    if (dialog.showClose) {
      const closeBtn = document.createElement("button");
      closeBtn.className = "absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground";
      closeBtn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';
      closeBtn.addEventListener("click", () => this.closeDialog(dialogId));
      header.appendChild(closeBtn);
    }

    dialogWrapper.appendChild(header);

    const body = document.createElement("div");
    body.className = "dialog-body";
    if (typeof dialog.content === "string") body.innerHTML = dialog.content;
    else if (dialog.content instanceof HTMLElement) body.appendChild(dialog.content);
    dialogWrapper.appendChild(body);

    if (dialog.closeOnPressEscape) {
      const escHandler = (e: KeyboardEvent) => {
        if (e.key === "Escape" && dialog.visible) this.closeDialog(dialogId);
      };
      document.addEventListener("keydown", escHandler);
    }

    container.appendChild(dialogWrapper);
  }
}
