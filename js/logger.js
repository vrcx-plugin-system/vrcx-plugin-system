/**
 * Logger class for VRCX custom plugins
 * Provides standardized logging with various output methods
 * Each plugin should have its own Logger instance
 */
class Logger {
  /**
   * Create a new Logger instance
   * @param {string} context - Plugin name or context (e.g., "My Plugin")
   * @param {object} options - Default logging options
   */
  constructor(context = "CJS", options = {}) {
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
   * @param {string} msg - Message to format
   * @param {boolean} includeTimestamp - Whether to include timestamp
   * @returns {string} Formatted message
   * @private
   */
  _formatMessage(msg, includeTimestamp = false) {
    const parts = [`[CJS|${this.context}]`];

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
    return parts.join(" ");
  }

  /**
   * Main logging method
   * @param {string} msg - Message to log
   * @param {object} options - Logging options (which outputs to use)
   * @param {string} level - Log level (info, warn, error)
   * @param {boolean} includeTimestamp - Whether to include timestamp
   */
  log(msg, options = {}, level = "info", includeTimestamp = false) {
    // Merge with default options, assuming false for missing properties
    const opts = {
      console: options.console ?? this.defaultOptions.console,
      vrcx: {
        notify: options.vrcx?.notify ?? this.defaultOptions.vrcx.notify,
        noty: options.vrcx?.noty ?? this.defaultOptions.vrcx.noty,
        message: options.vrcx?.message ?? this.defaultOptions.vrcx.message,
      },
      event: {
        noty: options.event?.noty ?? this.defaultOptions.event.noty,
        external: options.event?.external ?? this.defaultOptions.event.external,
      },
      desktop: options.desktop ?? this.defaultOptions.desktop,
      xsoverlay: options.xsoverlay ?? this.defaultOptions.xsoverlay,
      ovrtoolkit: options.ovrtoolkit ?? this.defaultOptions.ovrtoolkit,
      webhook: options.webhook ?? this.defaultOptions.webhook,
    };

    const formattedMsg = this._formatMessage(msg, includeTimestamp);
    const timestamp = new Date().toISOString();

    // Console logging
    if (opts.console) {
      // Intentional console output - this IS the logger
      if (typeof console[level] === "function") {
        console[level](formattedMsg); // eslint-disable-line no-console
      } else {
        console.log(formattedMsg); // eslint-disable-line no-console
      }
    }

    // VRCX event logging via IPC
    if (opts.event.noty && window.AppApi?.SendIpc) {
      try {
        window.AppApi.SendIpc("Noty", formattedMsg);
      } catch (error) {
        console.warn("Failed to send Noty event:", error); // eslint-disable-line no-console
      }
    }

    if (opts.event.external && window.$pinia?.user && window.AppApi?.SendIpc) {
      try {
        const userId = window.$pinia.user.currentUser?.id || "";
        window.AppApi.SendIpc("External", `${userId}:${formattedMsg}`);
      } catch (error) {
        console.warn("Failed to send External event:", error); // eslint-disable-line no-console
      }
    }

    // Desktop notifications
    if (opts.desktop && window.AppApi?.DesktopNotification) {
      setTimeout(async () => {
        try {
          await window.AppApi.DesktopNotification(
            `VRCX - ${this.context}`,
            msg
          );
        } catch (error) {
          console.error("Error sending desktop notification:", error); // eslint-disable-line no-console
        }
      }, 0);
    }

    // XSOverlay notifications
    if (opts.xsoverlay && window.AppApi?.XSNotification) {
      setTimeout(async () => {
        try {
          await window.AppApi.XSNotification(
            `VRCX - ${this.context}`,
            msg,
            5000,
            1.0,
            ""
          );
        } catch (error) {
          console.error("Error sending XSOverlay notification:", error); // eslint-disable-line no-console
        }
      }, 0);
    }

    // OVRToolkit notifications
    if (opts.ovrtoolkit && window.AppApi?.OVRTNotification) {
      setTimeout(async () => {
        try {
          await window.AppApi.OVRTNotification(
            true,
            true,
            `VRCX - ${this.context}`,
            msg,
            5000,
            1.0,
            null
          );
        } catch (error) {
          console.error("Error sending OVRToolkit notification:", error); // eslint-disable-line no-console
        }
      }, 0);
    }

    // VRCX Noty notifications (playNoty)
    if (opts.vrcx.noty && window.$app?.playNoty) {
      try {
        window.$app.playNoty({
          message: formattedMsg,
          type: level === "warn" ? "warning" : level,
        });
      } catch (error) {
        console.error("Error sending VRCX noty:", error); // eslint-disable-line no-console
      }
    }

    // VRCX UI notifications
    if (opts.vrcx.notify && window.$app?.$notify) {
      try {
        const notifyMethod = window.$app.$notify[level];
        if (typeof notifyMethod === "function") {
          notifyMethod({
            title: this.context,
            message: msg,
            type: level,
          });
        } else {
          window.$app.$notify.info({
            title: this.context,
            message: msg,
            type: "info",
          });
        }
      } catch (error) {
        console.error("Error sending VRCX notify:", error); // eslint-disable-line no-console
      }
    }

    // VRCX message toasts
    if (opts.vrcx.message && window.$app?.$message) {
      try {
        const messageMethod = window.$app.$message[level];
        if (typeof messageMethod === "function") {
          messageMethod(msg);
        } else {
          window.$app.$message.info(msg);
        }
      } catch (error) {
        console.error("Error sending VRCX message:", error); // eslint-disable-line no-console
      }
    }

    // Webhook notifications
    if (opts.webhook) {
      setTimeout(async () => {
        try {
          const webhookUrl = window.customjs?.config?.webhook;
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
          console.error("Error sending webhook notification:", error); // eslint-disable-line no-console
        }
      }, 0);
    }
  }

  // ============================================================================
  // CONVENIENCE METHODS - Console Only
  // ============================================================================

  /**
   * Log info message to console only
   * @param {string} msg - Message to log
   */
  logInfo(msg) {
    this.log(msg, { console: true }, "info", false);
  }

  /**
   * Log warning message to console only
   * @param {string} msg - Message to log
   */
  logWarn(msg) {
    this.log(msg, { console: true }, "warn", false);
  }

  /**
   * Log error message to console only
   * @param {string} msg - Message to log
   */
  logError(msg) {
    this.log(msg, { console: true }, "error", false);
  }

  /**
   * Log debug message to console only with timestamp
   * @param {string} msg - Message to log
   */
  logDebug(msg) {
    this.log(msg, { console: true }, "log", true);
  }

  // ============================================================================
  // CONVENIENCE METHODS - Noty (VRCX Notifications)
  // ============================================================================

  /**
   * Show info notification in VRCX (using playNoty)
   * Does not log to console by default
   * @param {string} msg - Message to display
   */
  showInfo(msg) {
    this.log(msg, { console: false, vrcx: { noty: true } }, "info", false);
  }

  /**
   * Show success notification in VRCX (using playNoty)
   * Does not log to console by default
   * @param {string} msg - Message to display
   */
  showSuccess(msg) {
    this.log(msg, { console: false, vrcx: { noty: true } }, "success", false);
  }

  /**
   * Show warning notification in VRCX (using playNoty)
   * Does not log to console by default
   * @param {string} msg - Message to display
   */
  showWarn(msg) {
    this.log(msg, { console: false, vrcx: { noty: true } }, "warn", false);
  }

  /**
   * Show error notification in VRCX (using playNoty)
   * Does not log to console by default
   * @param {string} msg - Message to display
   */
  showError(msg) {
    this.log(msg, { console: false, vrcx: { noty: true } }, "error", false);
  }

  // ============================================================================
  // CONVENIENCE METHODS - VR Notifications
  // ============================================================================

  /**
   * Show desktop notification
   * @param {string} msg - Message to display
   */
  async notifyDesktop(msg) {
    if (window.AppApi?.DesktopNotification) {
      try {
        await window.AppApi.DesktopNotification(`VRCX - ${this.context}`, msg);
      } catch (error) {
        this.logError(`Failed to send desktop notification: ${error.message}`);
      }
    } else {
      this.logWarn("Desktop notifications not available");
    }
  }

  /**
   * Show XSOverlay notification
   * @param {string} msg - Message to display
   * @param {number} duration - Duration in milliseconds (default: 5000)
   */
  async notifyXSOverlay(msg, duration = 5000) {
    if (window.AppApi?.XSNotification) {
      try {
        await window.AppApi.XSNotification(
          `VRCX - ${this.context}`,
          msg,
          duration,
          1.0,
          ""
        );
      } catch (error) {
        this.logError(
          `Failed to send XSOverlay notification: ${error.message}`
        );
      }
    } else {
      this.logWarn("XSOverlay notifications not available");
    }
  }

  /**
   * Show OVRToolkit notification
   * @param {string} msg - Message to display
   * @param {number} duration - Duration in milliseconds (default: 5000)
   */
  async notifyOVRToolkit(msg, duration = 5000) {
    if (window.AppApi?.OVRTNotification) {
      try {
        await window.AppApi.OVRTNotification(
          true,
          true,
          `VRCX - ${this.context}`,
          msg,
          duration,
          1.0,
          null
        );
      } catch (error) {
        this.logError(
          `Failed to send OVRToolkit notification: ${error.message}`
        );
      }
    } else {
      this.logWarn("OVRToolkit notifications not available");
    }
  }

  /**
   * Show notification in all available VR overlays
   * @param {string} msg - Message to display
   */
  async notifyVR(msg) {
    await Promise.all([this.notifyXSOverlay(msg), this.notifyOVRToolkit(msg)]);
  }

  // ============================================================================
  // CONVENIENCE METHODS - Combined Logging
  // ============================================================================

  /**
   * Log to console and show VRCX notification
   * @param {string} msg - Message to display
   * @param {string} level - Log level (info, warn, error)
   */
  logAndShow(msg, level = "info") {
    this.log(msg, { console: true, vrcx: { message: true } }, level, false);
  }

  /**
   * Log to console and show all notifications (console, VRCX, VR)
   * @param {string} msg - Message to display
   * @param {string} level - Log level (info, warn, error)
   */
  logAndNotifyAll(msg, level = "info") {
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

// Export Logger class globally under customjs namespace
if (typeof window !== "undefined") {
  window.customjs = window.customjs || {};
  window.customjs.Logger = Logger;
  console.log("[CJS] [Logger] Logger class loaded and ready");
}
