/**
 * Utility functions for VRCX Plugin System
 */

export const utils = {
  /**
   * Check if a value is empty (null, undefined, or empty string)
   */
  isEmpty(v: any): boolean {
    return v === null || v === undefined || v === "";
  },

  /**
   * Convert milliseconds to human-readable text
   */
  timeToText(ms: number): string {
    if (!ms || ms < 0) return "0s";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  },

  /**
   * Get formatted timestamp
   */
  getTimestamp(now: Date | null = null): string {
    now = now ?? new Date();
    return now.toLocaleString("en-US", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  },

  /**
   * Format date and time
   */
  formatDateTime(now: Date | null = null): string {
    now = now ?? new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hours = String(now.getHours()).padStart(2, "0");
    const minutes = String(now.getMinutes()).padStart(2, "0");
    const seconds = String(now.getSeconds()).padStart(2, "0");
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} GMT+1`;
  },

  /**
   * Copy text to clipboard
   */
  async copyToClipboard(text: string, description: string = "Text"): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(text);
      console.log(`[CJS|Utils] ${description} copied to clipboard`);
      return true;
    } catch (error) {
      try {
        const textArea = document.createElement("textarea");
        textArea.value = text;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        textArea.style.top = "-999999px";
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand("copy");
        textArea.remove();
        if (successful) {
          console.log(`[CJS|Utils] ${description} copied to clipboard (fallback)`);
          return true;
        } else {
          throw new Error("execCommand('copy') returned false");
        }
      } catch (fallbackError) {
        console.error(`[CJS|Utils] Failed to copy to clipboard: ${(error as Error).message}`);
        return false;
      }
    }
  },

  /**
   * Save VRChat user bio
   */
  saveBio(bio?: string, bioLinks?: any): Promise<any> {
    const currentUser = (window as any).$pinia?.user?.currentUser;
    return (window as any).request.userRequest.saveCurrentUser({
      bio: bio ?? currentUser?.bio,
      bioLinks: bioLinks ?? currentUser?.bioLinks,
    });
  },

  /**
   * Get location object from various formats
   */
  async getLocationObject(loc: any): Promise<any> {
    if (typeof loc === "string") {
      if (loc.endsWith(")")) {
        loc = (window as any).$app.parseLocation(loc);
      } else if (loc.startsWith("wrld")) {
        loc = { worldId: loc, world: { id: loc } };
      } else {
        loc = { instanceId: loc, instance: { id: loc } };
      }
    } else if (!loc || loc === "traveling:traveling") {
      return;
    }

    if (!loc && (window as any).$app.lastLocation) {
      return utils.getLocationObject((window as any).$app.lastLocation);
    }
    if (!loc && (window as any).$app.lastLocationDestination) {
      return utils.getLocationObject((window as any).$app.lastLocationDestination);
    }

    if (loc && (window as any).$app?.getWorldName) {
      loc.worldName = await (window as any).$app.getWorldName(loc);
    }

    return loc;
  },

  /**
   * Convert hex color to rgba
   */
  hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  },

  /**
   * Darken a hex color by percentage
   */
  darkenColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = ((num >> 8) & 0x00ff) - amt;
    const B = (num & 0x0000ff) - amt;
    return (
      "#" +
      (
        0x1000000 +
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
        (B < 255 ? (B < 1 ? 0 : B) : 255)
      )
        .toString(16)
        .slice(1)
    );
  },
};
