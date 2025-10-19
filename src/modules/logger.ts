import { LogOptions, ModuleMetadata } from '../types';

export const loggerMetadata: ModuleMetadata = {
  id: "logger",
  name: "Logger System",
  description: "Logging system with VRCX integration and notification support",
  authors: [
    {
      name: "Bluscream",
      description: "Core Maintainer",
    }
  ],
  build: "1760765304",
  tags: ["Core", "Logging"],
};

/**
 * Logger class for VRCX Plugin System
 * Simplified and focused on essential notification methods
 */
export class Logger {
  private context: string;
  private logColor: string;

  constructor(context: string = "CJS") {
    this.context = context;
    this.logColor = (window as any).customjs?.logColors?.Plugin || '#888888';
  }

  /**
   * Format message - handles objects and formatting
   */
  private formatMessage(msg: any, ...args: any[]): string {
    let formatted: string;
    
    if (typeof msg === 'object') {
      formatted = JSON.stringify(msg, null, 2);
    } else if (typeof msg === 'string' && args.length > 0) {
      // Simple string formatting
      formatted = msg;
      args.forEach((arg, i) => {
        formatted = formatted.replace(`{${i}}`, String(arg));
      });
    } else {
      formatted = String(msg);
    }
    
    return formatted;
  }

  /**
   * Console-only logging methods
   */
  log(msg: any, ...args: any[]): void {
    const formatted = this.formatMessage(msg, ...args);
    console.log(`%c[CJS|${this.context}] ${formatted}`, `color: ${this.logColor}`);
  }

  logInfo(msg: any, ...args: any[]): void {
    const formatted = this.formatMessage(msg, ...args);
    console.info(`%c[CJS|${this.context}] ${formatted}`, `color: ${this.logColor}`);
  }

  logWarn(msg: any, ...args: any[]): void {
    const formatted = this.formatMessage(msg, ...args);
    console.warn(`%c[CJS|${this.context}] ${formatted}`, `color: ${this.logColor}`);
  }

  logWarning(msg: any, ...args: any[]): void {
    this.logWarn(msg, ...args);
  }

  logError(msg: any, ...args: any[]): void {
    const formatted = this.formatMessage(msg, ...args);
    console.error(`%c[CJS|${this.context}] ${formatted}`, `color: ${this.logColor}`);
  }

  // Aliases for console logging
  info(msg: any, ...args: any[]): void {
    this.logInfo(msg, ...args);
  }

  warn(msg: any, ...args: any[]): void {
    this.logWarn(msg, ...args);
  }

  warning(msg: any, ...args: any[]): void {
    this.logWarn(msg, ...args);
  }

  error(msg: any, ...args: any[]): void {
    this.logError(msg, ...args);
  }

  /**
   * Show methods - UI toast messages (brief, top-center)
   * Priority: $message.* → $notify.* → console fallback
   * @param msg - Message to display (string or object)
   * @param type - Message type (success, warning, error, info)
   * @param args - Additional formatting arguments
   */
  private showMessage(msg: any, type: 'success' | 'warning' | 'error' | 'info', ...args: any[]): void {
    const formatted = this.formatMessage(msg, ...args);
    
    try {
      // Try $message first (Element Plus Message - toast)
      const $message = (window as any).$app?.config?.globalProperties?.$message;
      if ($message && typeof $message[type] === 'function') {
        $message[type](formatted);
        return;
      }
      
      // Try $notify second (Element Plus Notification - more prominent)
      const $notify = (window as any).$app?.config?.globalProperties?.$notify;
      if ($notify && typeof $notify[type] === 'function') {
        $notify[type]({
            title: this.context,
          message: formatted,
        });
        return;
      }
      
      // Fallback to console
      const level = type === 'warning' ? 'warn' : (type === 'error' ? 'error' : 'info');
      this[`log${level.charAt(0).toUpperCase() + level.slice(1)}` as keyof Logger](formatted);
      } catch (error) {
      this.logError('Failed to show message:', error);
    }
  }

  /**
   * Show info toast message (blue, brief notification)
   * @param msg - Message to display (string or object)
   * @param args - Additional formatting arguments
   */
  showInfo(msg: any, ...args: any[]): void {
    this.showMessage(msg, 'info', ...args);
  }

  /**
   * Show success toast message (green, brief notification)
   * @param msg - Message to display (string or object)
   * @param args - Additional formatting arguments
   */
  showSuccess(msg: any, ...args: any[]): void {
    this.showMessage(msg, 'success', ...args);
  }

  /**
   * Show warning toast message (orange, brief notification)
   * @param msg - Message to display (string or object)
   * @param args - Additional formatting arguments
   */
  showWarning(msg: any, ...args: any[]): void {
    this.showMessage(msg, 'warning', ...args);
  }

  /**
   * Show error toast message (red, brief notification)
   * @param msg - Message to display (string or object)
   * @param args - Additional formatting arguments
   */
  showError(msg: any, ...args: any[]): void {
    this.showMessage(msg, 'error', ...args);
  }

  /**
   * Alias for showWarning
   */
  showWarn(msg: any, ...args: any[]): void {
    this.showWarning(msg, ...args);
  }

  /**
   * Notify methods - UI notifications (persistent, top-right corner)
   * Priority: $notify.* → $message.* → console fallback
   * @param msg - Message to display (string or object)
   * @param type - Notification type (success, warning, error, info)
   * @param args - Additional formatting arguments
   */
  private notify(msg: any, type: 'success' | 'warning' | 'error' | 'info', ...args: any[]): void {
    const formatted = this.formatMessage(msg, ...args);
    
    try {
      // Try $notify first (Element Plus Notification - more prominent)
      const $notify = (window as any).$app?.config?.globalProperties?.$notify;
      if ($notify && typeof $notify[type] === 'function') {
        $notify[type]({
          title: this.context,
          message: formatted,
        });
        return;
      }
      
      // Try $message second (Element Plus Message - toast)
      const $message = (window as any).$app?.config?.globalProperties?.$message;
      if ($message && typeof $message[type] === 'function') {
        $message[type](formatted);
        return;
      }
      
      // Fallback to console
      const level = type === 'warning' ? 'warn' : (type === 'error' ? 'error' : 'info');
      this[`log${level.charAt(0).toUpperCase() + level.slice(1)}` as keyof Logger](formatted);
    } catch (error) {
      this.logError('Failed to notify:', error);
    }
  }

  /**
   * Show persistent info notification (blue, top-right corner)
   * @param msg - Message to display (string or object)
   * @param args - Additional formatting arguments
   */
  notifyInfo(msg: any, ...args: any[]): void {
    this.notify(msg, 'info', ...args);
  }

  /**
   * Show persistent success notification (green, top-right corner)
   * @param msg - Message to display (string or object)
   * @param args - Additional formatting arguments
   */
  notifySuccess(msg: any, ...args: any[]): void {
    this.notify(msg, 'success', ...args);
  }

  /**
   * Show persistent warning notification (orange, top-right corner)
   * @param msg - Message to display (string or object)
   * @param args - Additional formatting arguments
   */
  notifyWarning(msg: any, ...args: any[]): void {
    this.notify(msg, 'warning', ...args);
  }

  /**
   * Show persistent error notification (red, top-right corner)
   * @param msg - Message to display (string or object)
   * @param args - Additional formatting arguments
   */
  notifyError(msg: any, ...args: any[]): void {
    this.notify(msg, 'error', ...args);
  }

  /**
   * Browser alert dialog (blocking)
   * @param msg - Message to display (string or object)
   * @param args - Additional formatting arguments
   */
  alert(msg: any, ...args: any[]): void {
    const formatted = this.formatMessage(msg, ...args);
    alert(formatted);
  }

  /**
   * Add to VRCX Feed
   * @param entry - Feed entry object
   * Example: { 
   *   created_at: new Date().toJSON(),
   *   type: 'GPS' | 'Online' | 'Offline' | 'Status' | 'Avatar' | 'Bio',
   *   userId: 'usr_xxx',
   *   displayName: 'Username',
   *   location?: 'wrld_xxx:12345',         // Required for GPS
   *   worldName?: 'World Name',            // For GPS, Online
   *   time?: number,                       // For GPS
   *   status?: string,                     // For Status
   *   statusDescription?: string,          // For Status
   *   avatarName?: string,                 // For Avatar
   *   bio?: string,                        // For Bio
   *   previousBio?: string,                // For Bio
   *   isFriend?: boolean,
   *   isFavorite?: boolean
   * }
   */
  addFeed(entry: any): void {
    try {
      if ((window as any).$pinia?.feed?.addFeed) {
        (window as any).$pinia.feed.addFeed(entry);
      } else {
        this.logWarn('Feed store not available');
      }
      } catch (error) {
      this.logError('Failed to add feed entry:', error);
    }
  }

  /**
   * Add to VRCX Game Log
   * @param entry - Game log entry object
   * Example: {
   *   created_at: new Date().toJSON(),
   *   type: 'Event' | 'OnPlayerJoined' | 'OnPlayerLeft' | 'VideoPlay' | 'PortalSpawn' | 'External' | ...,
   *   data?: string,              // For type 'Event' or 'External'
   *   message?: string,            // For type 'External'
   *   displayName?: string,
   *   userId?: string,
   *   location?: string,
   *   worldName?: string
   * }
   */
  addGameLog(entry: any): void {
    try {
      if ((window as any).$pinia?.gameLog?.addGameLog) {
        (window as any).$pinia.gameLog.addGameLog(entry);
    } else {
        this.logWarn('GameLog store not available');
      }
    } catch (error) {
      this.logError('Failed to add game log:', error);
    }
  }

  /**
   * Add to VRCX Friend Log
   * @param entry - Friend log entry object
   * Example: {
   *   created_at: new Date().toJSON(),
   *   type: 'Friend' | 'Unfriend' | 'DisplayName' | 'TrustLevel' | 'FriendOnline' | 'FriendOffline',
   *   userId: 'usr_xxx',
   *   displayName: 'Username',
   *   friendNumber?: number,
   *   previousDisplayName?: string,    // For type 'DisplayName'
   *   trustLevel?: string,              // For type 'TrustLevel'
   *   previousTrustLevel?: string       // For type 'TrustLevel'
   * }
   */
  addFriendLog(entry: any): void {
    try {
      if ((window as any).$pinia?.friend?.friendLogTable?.data) {
        (window as any).$pinia.friend.friendLogTable.data.push(entry);
        // Also add to database if available
        if ((window as any).database?.addFriendLogHistory) {
          (window as any).database.addFriendLogHistory(entry);
      }
    } else {
        this.logWarn('Friend store not available');
      }
    } catch (error) {
      this.logError('Failed to add friend log:', error);
    }
  }

  /**
   * Add to VRCX Notification Log
   * @param entry - Notification entry object (simplified for plugins)
   * Example: {
   *   id?: string,                      // Auto-generated if not provided
   *   type: 'friendRequest' | 'invite' | 'requestInvite' | 'Plugin' | ...,
   *   created_at: new Date().toJSON(),
   *   message: string,
   *   senderUserId?: string,
   *   senderUsername?: string,
   *   displayName?: string
   * }
   */
  addNotificationLog(entry: any): void {
    try {
      if ((window as any).$pinia?.notification?.notificationTable?.data) {
        // Auto-generate ID if not provided
        if (!entry.id) {
          entry.id = `plugin_${this.context}_${Date.now()}`;
        }
        (window as any).$pinia.notification.notificationTable.data.push(entry);
        // Also add to database if available
        if ((window as any).database?.addNotificationToDatabase) {
          (window as any).database.addNotificationToDatabase(entry);
      }
    } else {
        this.logWarn('Notification store not available');
      }
    } catch (error) {
      this.logError('Failed to add notification log:', error);
    }
  }

  /**
   * Desktop notification (Windows toast notification)
   * Note: May not work in Electron builds
   * @param msg - Message to display (string or object)
   * @param title - Notification title (optional, defaults to "VRCX - {context}")
   * @param args - Additional formatting arguments
   */
  async notifyDesktop(msg: any, title?: string, ...args: any[]): Promise<void> {
    const formatted = this.formatMessage(msg, ...args);
    const notifTitle = title || `VRCX - ${this.context}`;
    
    try {
      if ((window as any).AppApi?.DesktopNotification) {
        await (window as any).AppApi.DesktopNotification(notifTitle, formatted);
      } else {
        this.logWarn('Desktop notifications not available');
      }
      } catch (error) {
      this.logError('Failed to send desktop notification:', error);
    }
  }

  /**
   * VR notifications (XSOverlay + OVRToolkit)
   * Shows notification in VR overlays if user has them configured
   * @param msg - Message to display (string or object)
   * @param title - Notification title (optional, defaults to "VRCX - {context}")
   * @param args - Additional formatting arguments
   */
  async notifyVR(msg: any, title?: string, ...args: any[]): Promise<void> {
    const formatted = this.formatMessage(msg, ...args);
    const notifTitle = title || `VRCX - ${this.context}`;
    
    const promises: Promise<void>[] = [];
    
    // XSOverlay
    if ((window as any).AppApi?.XSNotification) {
      promises.push(
        (window as any).AppApi.XSNotification(notifTitle, formatted, 5000, 1.0, "")
          .catch((err: Error) => this.logError('XSOverlay notification failed:', err))
      );
    }
    
    // OVRToolkit
    if ((window as any).AppApi?.OVRTNotification) {
      promises.push(
        (window as any).AppApi.OVRTNotification(true, true, notifTitle, formatted, 5000, 1.0, null)
          .catch((err: Error) => this.logError('OVRToolkit notification failed:', err))
      );
    }
    
    if (promises.length === 0) {
      this.logWarn('VR notifications not available');
    } else {
      await Promise.all(promises);
    }
  }

  /**
   * Notify everywhere - all available notification methods
   * Sends to: console, UI toast, UI notification, desktop, VR, and notification log
   * @param msg - Message to display (string or object)
   * @param args - Additional formatting arguments
   */
  async notifyAll(msg: any, ...args: any[]): Promise<void> {
    const formatted = this.formatMessage(msg, ...args);
    
    try {
      // Console
      this.logInfo(formatted);
      
      // UI Message
      const $message = (window as any).$app?.config?.globalProperties?.$message;
      if ($message?.info) {
        $message.info(formatted);
      }
      
      // UI Notification
      const $notify = (window as any).$app?.config?.globalProperties?.$notify;
      if ($notify?.info) {
        $notify.info({
          title: this.context,
          message: formatted,
        });
      }
      
      // Desktop
      await this.notifyDesktop(formatted);
      
      // VR
      await this.notifyVR(formatted);
      
      // Add to notification log
      this.addNotificationLog({
        type: 'Plugin',
        created_at: new Date().toJSON(),
        message: formatted,
        displayName: this.context,
      });
    } catch (error) {
      this.logError('Failed to notify all:', error);
    }
  }
}
