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

    // VRCX Noty notifications
    if (opts.vrcx!.noty && (window as any).$app?.playNoty) {
      try {
        (window as any).$app.playNoty({
          message: formattedMsg,
          type: level === "warn" ? "warning" : level,
        });
      } catch (error) {
        console.error("Error sending VRCX noty:", error);
      }
    }

    // VRCX UI notifications
    if (opts.vrcx!.notify && (window as any).$app?.$notify) {
      try {
        const notifyMethod = (window as any).$app.$notify[level];
        if (typeof notifyMethod === "function") {
          notifyMethod({
            title: this.context,
            message: msg,
            type: level,
          });
        } else {
          (window as any).$app.$notify.info({
            title: this.context,
            message: msg,
            type: "info",
          });
        }
      } catch (error) {
        console.error("Error sending VRCX notify:", error);
      }
    }

    // VRCX message toasts
    if (opts.vrcx!.message && (window as any).$app?.$message) {
      try {
        const messageMethod = (window as any).$app.$message[level];
        if (typeof messageMethod === "function") {
          messageMethod(msg);
        } else {
          (window as any).$app.$message.info(msg);
        }
      } catch (error) {
        console.error("Error sending VRCX message:", error);
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
    this.log(msg, { console: false, vrcx: { noty: true } }, "info", false);
  }

  showSuccess(msg: string): void {
    this.log(msg, { console: false, vrcx: { noty: true } }, "info", false);
  }

  showWarn(msg: string): void {
    this.log(msg, { console: false, vrcx: { noty: true } }, "warn", false);
  }

  showError(msg: string): void {
    this.log(msg, { console: false, vrcx: { noty: true } }, "error", false);
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
