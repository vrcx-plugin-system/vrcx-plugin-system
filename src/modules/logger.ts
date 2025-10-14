import { LogOptions } from '../types';

/**
 * Logger class for VRCX Plugin System
 * Provides centralized logging to console, VRCX UI, VR overlays, and webhooks
 */
export class Logger {
  private context: string;
  private defaultOptions: LogOptions;

  /**
   * Create a new Logger instance
   * @param context - Plugin name or context (e.g., "My Plugin")
   * @param options - Default logging options
   */
  constructor(context: string = "CJS", options: LogOptions = {}) {
    this.context = context;
    this.defaultOptions = {
      console: true,
      vrcx: {
        notify: false,
        noty: false,
        message: false,
      },
      event: {
        noty: false,
        external: false,
      },
      desktop: false,
      xsoverlay: false,
      ovrtoolkit: false,
      webhook: false,
      ...options,
    };
  }

  /**
   * Format message with context and optional timestamp
   */
  private formatMessage(msg: string, includeTimestamp: boolean = false): {message: string; styles: string[]} {
    const parts: string[] = [`[CJS|${this.context}]`];

    if (includeTimestamp) {
      const timestamp = new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      parts.unshift(`[${timestamp}]`);
    }

    parts.push(msg);

    const logColor = window.customjs?.logColors?.Plugin || '#888888';
    return {
      message: `%c${parts.join(" ")}`,
      styles: [`color: ${logColor}`],
    };
  }

  /**
   * Main logging method
   */
  log(msg: string, options: LogOptions = {}, level: 'info' | 'warn' | 'error' | 'log' = 'info', includeTimestamp: boolean = false): void {
    // Merge with default options
    const opts: LogOptions = {
      console: options.console ?? this.defaultOptions.console,
      vrcx: {
        notify: options.vrcx?.notify ?? this.defaultOptions.vrcx!.notify,
        noty: options.vrcx?.noty ?? this.defaultOptions.vrcx!.noty,
        message: options.vrcx?.message ?? this.defaultOptions.vrcx!.message,
      },
      event: {
        noty: options.event?.noty ?? this.defaultOptions.event!.noty,
        external: options.event?.external ?? this.defaultOptions.event!.external,
      },
      desktop: options.desktop ?? this.defaultOptions.desktop,
      xsoverlay: options.xsoverlay ?? this.defaultOptions.xsoverlay,
      ovrtoolkit: options.ovrtoolkit ?? this.defaultOptions.ovrtoolkit,
      webhook: options.webhook ?? this.defaultOptions.webhook,
    };

    const formatted = this.formatMessage(msg, includeTimestamp);
    const formattedMsg = formatted.message;
    const timestamp = new Date().toISOString();

    // Console logging
    if (opts.console) {
      const consoleMethod = (console as any)[level] || console.log;
      consoleMethod(formatted.message, ...formatted.styles);
    }

    // VRCX event logging via IPC
    if (opts.event!.noty && window.AppApi?.SendIpc) {
      try {
        window.AppApi.SendIpc("Noty", formattedMsg);
      } catch (error) {
        console.warn("Failed to send Noty event:", error);
      }
    }

    if (opts.event!.external && window.$pinia?.user && window.AppApi?.SendIpc) {
      try {
        const userId = (window.$pinia.user as any).currentUser?.id || "";
        window.AppApi.SendIpc("External", `${userId}:${formattedMsg}`);
      } catch (error) {
        console.warn("Failed to send External event:", error);
      }
    }

    // Desktop notifications
    if (opts.desktop && window.AppApi?.DesktopNotification) {
      setTimeout(async () => {
        try {
          await window.AppApi!.DesktopNotification(`VRCX - ${this.context}`, msg);
        } catch (error) {
          console.error("Error sending desktop notification:", error);
        }
      }, 0);
    }

    // XSOverlay notifications
    if (opts.xsoverlay && window.AppApi?.XSNotification) {
      setTimeout(async () => {
        try {
          await window.AppApi!.XSNotification(`VRCX - ${this.context}`, msg, 5000, 1.0, "");
        } catch (error) {
          console.error("Error sending XSOverlay notification:", error);
        }
      }, 0);
    }

    // OVRToolkit notifications
    if (opts.ovrtoolkit && window.AppApi?.OVRTNotification) {
      setTimeout(async () => {
        try {
          await window.AppApi!.OVRTNotification(true, true, `VRCX - ${this.context}`, msg, 5000, 1.0, null);
        } catch (error) {
          console.error("Error sending OVRToolkit notification:", error);
        }
      }, 0);
    }

    // VRCX Notifications - try multiple methods
    if (opts.vrcx!.message || opts.vrcx!.noty) {
      try {
        const msgType = level === 'warn' ? 'warning' : (level === 'error' ? 'error' : 'success');
        
        // Try Noty library first (what VRCX uses for login messages)
        if (typeof (window as any).Noty === 'function') {
          new (window as any).Noty({
            type: msgType,
            text: msg,
            timeout: 3000,
          }).show();
        }
        // Try window.ElMessage (if exposed)
        else if (typeof (window as any).ElMessage === 'function') {
          (window as any).ElMessage({
            message: msg,
            type: msgType,
            duration: 3000,
            showClose: true,
          });
        }
        // Try via Vue globalProperties (this is what actually works for Element Plus)
        else if ((window as any).$app?.config?.globalProperties?.$message) {
          const $message = (window as any).$app.config.globalProperties.$message;
          
          // Call the appropriate method (success, warning, error, info)
          if (typeof $message[msgType] === 'function') {
            $message[msgType](msg);
          } else if (typeof $message === 'function') {
            $message({ message: msg, type: msgType });
          }
        }
        // Fallback to old playNoty method
        else if ((window as any).$app?.playNoty) {
          (window as any).$app.playNoty({
            message: formattedMsg,
            type: msgType,
          });
        }
      } catch (error) {
        console.error("Error sending VRCX message:", error);
      }
    }

    // VRCX Element Plus Notification (for more prominent notifications)
    if (opts.vrcx!.notify) {
      try {
        const notifType = level === 'warn' ? 'warning' : (level === 'error' ? 'error' : 'success');
        
        // Try window.ElNotification first (if exposed)
        if (typeof (window as any).ElNotification === 'function') {
          (window as any).ElNotification({
            title: this.context,
            message: msg,
            type: notifType,
            duration: 4500,
          });
        }
        // Try via Vue globalProperties (this is what actually works)
        else if ((window as any).$app?.config?.globalProperties?.$notify) {
          const $notify = (window as any).$app.config.globalProperties.$notify;
          
          // Call the appropriate method
          if (typeof $notify[notifType] === 'function') {
            $notify[notifType]({
              title: this.context,
              message: msg,
            });
          } else if (typeof $notify === 'function') {
            $notify({
              title: this.context,
              message: msg,
              type: notifType,
            });
          }
        }
      } catch (error) {
        console.error("Error sending VRCX notification:", error);
      }
    }

    // Webhook notifications
    if (opts.webhook) {
      setTimeout(async () => {
        try {
          let webhookUrl: string | null = null;
          try {
            webhookUrl = JSON.parse(localStorage.getItem("customjs.logger.webhook") || 'null');
          } catch {}

          if (webhookUrl) {
            const payload = {
              message: formattedMsg,
              level: level,
              timestamp: timestamp,
              source: `VRCX-${this.context}`,
            };

            await fetch(webhookUrl, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify(payload),
            });
          }
        } catch (error) {
          console.error("Error sending webhook notification:", error);
        }
      }, 0);
    }
  }

  // Convenience methods
  logInfo(msg: string): void {
    this.log(msg, { console: true }, "info", false);
  }

  info(msg: string): void {
    this.logInfo(msg);
  }

  logWarn(msg: string): void {
    this.log(msg, { console: true }, "warn", false);
  }

  warn(msg: string): void {
    this.logWarn(msg);
  }

  logError(msg: string): void {
    this.log(msg, { console: true }, "error", false);
  }

  error(msg: string): void {
    this.logError(msg);
  }

  logDebug(msg: string): void {
    this.log(msg, { console: true }, "log", true);
  }

  debug(msg: string): void {
    this.logDebug(msg);
  }

  showInfo(msg: string): void {
    this.log(msg, { console: false, vrcx: { message: true } }, "info", false);
  }

  showSuccess(msg: string): void {
    // Use info level but ElMessage will show as success due to type mapping
    this.log(msg, { console: false, vrcx: { message: true } }, "info", false);
  }

  showWarn(msg: string): void {
    this.log(msg, { console: false, vrcx: { message: true } }, "warn", false);
  }

  showWarning(msg: string): void {
    this.showWarn(msg);
  }

  showError(msg: string): void {
    this.log(msg, { console: false, vrcx: { message: true } }, "error", false);
  }

  // Show a message with custom type
  showMessage(msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info'): void {
    const level = type === 'warning' ? 'warn' : (type === 'success' || type === 'info' ? 'info' : 'error');
    this.log(msg, { console: false, vrcx: { message: true } }, level, false);
  }

  // Show a notification (more prominent than message)
  showNotification(title: string, msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'info'): void {
    const originalContext = this.context;
    this.context = title;
    const level = type === 'warning' ? 'warn' : (type === 'success' || type === 'info' ? 'info' : 'error');
    this.log(msg, { console: false, vrcx: { notify: true } }, level, false);
    this.context = originalContext;
  }

  async notifyDesktop(msg: string): Promise<void> {
    if (window.AppApi?.DesktopNotification) {
      try {
        await window.AppApi.DesktopNotification(`VRCX - ${this.context}`, msg);
      } catch (error) {
        this.logError(`Failed to send desktop notification: ${(error as Error).message}`);
      }
    } else {
      this.logWarn("Desktop notifications not available");
    }
  }

  async notifyXSOverlay(msg: string, duration: number = 5000): Promise<void> {
    if (window.AppApi?.XSNotification) {
      try {
        await window.AppApi.XSNotification(`VRCX - ${this.context}`, msg, duration, 1.0, "");
      } catch (error) {
        this.logError(`Failed to send XSOverlay notification: ${(error as Error).message}`);
      }
    } else {
      this.logWarn("XSOverlay notifications not available");
    }
  }

  async notifyOVRToolkit(msg: string, duration: number = 5000): Promise<void> {
    if (window.AppApi?.OVRTNotification) {
      try {
        await window.AppApi.OVRTNotification(true, true, `VRCX - ${this.context}`, msg, duration, 1.0, null);
      } catch (error) {
        this.logError(`Failed to send OVRToolkit notification: ${(error as Error).message}`);
      }
    } else {
      this.logWarn("OVRToolkit notifications not available");
    }
  }

  async notifyVR(msg: string): Promise<void> {
    await Promise.all([this.notifyXSOverlay(msg), this.notifyOVRToolkit(msg)]);
  }

  // Noty library notifications (what VRCX uses for login messages)
  showNoty(msg: string, type: 'success' | 'info' | 'warning' | 'error' | 'alert' = 'info', timeout: number = 3000): void {
    try {
      if (typeof (window as any).Noty === 'function') {
        new (window as any).Noty({
          type: type,
          text: msg,
          timeout: timeout,
        }).show();
      } else {
        this.logWarn("Noty library not available, falling back to console");
        this.log(msg);
      }
    } catch (error) {
      this.logError(`Failed to show Noty: ${(error as Error).message}`);
    }
  }

  showNotySuccess(msg: string): void {
    this.showNoty(msg, 'success');
  }

  showNotyInfo(msg: string): void {
    this.showNoty(msg, 'info');
  }

  showNotyWarning(msg: string): void {
    this.showNoty(msg, 'warning');
  }

  showNotyError(msg: string): void {
    this.showNoty(msg, 'error');
  }

  showNotyAlert(msg: string): void {
    this.showNoty(msg, 'alert');
  }

  // Pinia notification store methods (VRCX game event notifications)
  // This uses VRCX's notification system which shows in VR overlays, desktop, etc.
  // based on user's notification settings
  playGameNoty(type: string, displayName: string = 'Plugin', additionalData: any = {}): void {
    try {
      if ((window as any).$pinia?.notification?.playNoty) {
        const noty = {
          type: type,
          created_at: new Date().toJSON(),
          displayName: displayName,
          userId: `usr_${this.context}_${Date.now()}`,
          isFriend: false,
          isFavorite: false,
          ...additionalData,
        };
        (window as any).$pinia.notification.playNoty(noty);
      } else {
        this.logWarn("Pinia notification store not available");
      }
    } catch (error) {
      this.logError(`Failed to play game noty: ${(error as Error).message}`);
    }
  }

  /**
   * Show a custom plugin notification using VRCX's playNoty system
   * This will show in VR overlays, desktop notifications, etc. based on user settings
   * @param message - The message to display
   * @param options - Optional configuration
   */
  showPluginNoty(message: string, options: {
    type?: string,
    displayName?: string,
    title?: string,
    skipBusyCheck?: boolean,
    skipTimeCheck?: boolean,
  } = {}): void {
    try {
      const {
        type = 'Event',
        displayName = this.context,
        title = null,
        skipBusyCheck = true,
        skipTimeCheck = true,
      } = options;

      // Use the existing playNoty if we want full VRCX integration
      if ((window as any).$pinia?.notification?.playNoty) {
        const noty: any = {
          type: type,
          created_at: new Date().toJSON(),
          displayName: displayName,
          userId: `usr_plugin_${this.context}_${Date.now()}`,
          isFriend: false,
          isFavorite: false,
        };

        if (title) {
          noty.title = title;
          noty.message = message;
        } else if (type === 'Event') {
          noty.data = message;
        } else {
          noty.message = message;
        }

        // For custom plugin notifications, we might want to bypass some checks
        // so we call playNoty directly without going through queue functions
        (window as any).$pinia.notification.playNoty(noty);
      } else {
        // Fallback to regular showInfo
        this.showInfo(message);
      }
    } catch (error) {
      this.logError(`Failed to show plugin noty: ${(error as Error).message}`);
    }
  }

  // Convenience methods for common game notification types
  showOnlineNoty(displayName: string): void {
    this.playGameNoty('Online', displayName);
  }

  showOfflineNoty(displayName: string): void {
    this.playGameNoty('Offline', displayName);
  }

  showGPSNoty(displayName: string, worldName: string, location: string): void {
    this.playGameNoty('GPS', displayName, { worldName, location, time: 0 });
  }

  showPlayerJoinedNoty(displayName: string): void {
    this.playGameNoty('OnPlayerJoined', displayName);
  }

  showPlayerLeftNoty(displayName: string): void {
    this.playGameNoty('OnPlayerLeft', displayName);
  }

  showEventNoty(message: string, displayName?: string): void {
    this.showPluginNoty(message, { 
      type: 'Event', 
      displayName: displayName || this.context 
    });
  }

  logAndShow(msg: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    this.log(msg, { console: true, vrcx: { message: true } }, level, false);
  }

  logAndNotifyAll(msg: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    this.log(
      msg,
      {
        console: true,
        vrcx: { notify: true, message: true },
        desktop: true,
        xsoverlay: true,
        ovrtoolkit: true,
      },
      level,
      false
    );
  }
}
