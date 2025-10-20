/**
 * Utility functions for VRCX Plugin System
 */

import { ModuleMetadata, ModuleAuthor } from '../types';

export const utilsMetadata: ModuleMetadata = {
  id: "utils",
  name: "Utility Functions",
  description: "Core utility functions for VRCX Plugin System",
  authors: [
    {
      name: "Bluscream",
      description: "Core Maintainer",
    }
  ],
  tags: ["Core", "Utility"],
};

export const utils = {
  metadata: utilsMetadata,
  /**
   * Check if a value is empty (null, undefined, or empty string)
   */
  isEmpty(v: any): boolean {
    return v === null || v === undefined || v === "";
  },

  /**
   * Decode Unicode escape sequences in a string (e.g., \u{1F504} → 🔄, \uFE0F → ️)
   */
  decodeUnicode(str: string): string {
    if (!str) return str;
    try {
      // Handle both \u{XXXX} and \uXXXX formats in one pass
      return str.replace(/\\u\{?([0-9A-Fa-f]+)\}?/g, (match, code) => {
        try {
          const codePoint = parseInt(code, 16);
          if (isNaN(codePoint)) return match;
          return String.fromCodePoint(codePoint);
        } catch {
          return match; // Keep original if conversion fails
        }
      });
    } catch (err) {
      console.error("decodeUnicode failed:", err);
      return str;
    }
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
   * Parse timespan string to milliseconds
   * Supports formats: "1h 20m", "00:50.100", "5000" (direct ms)
   */
  parseTimespan(input: string | number): number {
    if (typeof input === 'number') return input;
    if (!input) return 0;

    input = input.trim();

    // Direct milliseconds (just a number)
    if (/^\d+$/.test(input)) {
      return parseInt(input, 10);
    }

    // Format: "00:50.100" (MM:SS.mmm)
    const timeMatch = input.match(/^(\d+):(\d+)(?:\.(\d+))?$/);
    if (timeMatch) {
      const minutes = parseInt(timeMatch[1], 10);
      const seconds = parseInt(timeMatch[2], 10);
      const milliseconds = timeMatch[3] ? parseInt(timeMatch[3].padEnd(3, '0'), 10) : 0;
      return (minutes * 60 * 1000) + (seconds * 1000) + milliseconds;
    }

    // Format: "1h 20m 30s" or variations
    let total = 0;
    const parts = input.match(/(\d+)\s*([dhms])/gi);
    if (parts) {
      parts.forEach(part => {
        const match = part.match(/(\d+)\s*([dhms])/i);
        if (match) {
          const value = parseInt(match[1], 10);
          const unit = match[2].toLowerCase();
          switch (unit) {
            case 'd': total += value * 24 * 60 * 60 * 1000; break;
            case 'h': total += value * 60 * 60 * 1000; break;
            case 'm': total += value * 60 * 1000; break;
            case 's': total += value * 1000; break;
          }
        }
      });
      return total;
    }

    return 0;
  },

  /**
   * Format milliseconds to timespan display (e.g., "1h 20m")
   */
  formatTimespan(ms: number): string {
    return utils.timeToText(ms);
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

  /**
   * Downloads a file from URL using multiple fallback methods
   * Tries: Fetch API + Blob, Hidden Anchor, iFrame, window.location
   */
  async downloadFile(url: string, filename: string, mimeType?: string): Promise<{success: boolean; method?: string; error?: string}> {
    // Method 1: Fetch API + Blob (most reliable for cross-origin)
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.style.display = 'none';
      anchor.href = blobUrl;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(blobUrl);
      }, 100);
      
      return { success: true, method: 'fetch-blob' };
    } catch (fetchError) {
      console.warn('Fetch + Blob download failed:', fetchError);
    }

    // Method 2: Direct anchor tag with download attribute
    try {
      const anchor = document.createElement('a');
      anchor.style.display = 'none';
      anchor.href = url;
      anchor.download = filename;
      anchor.target = '_blank';
      document.body.appendChild(anchor);
      anchor.click();
      
      setTimeout(() => {
        document.body.removeChild(anchor);
      }, 100);
      
      return { success: true, method: 'anchor-download' };
    } catch (anchorError) {
      console.warn('Anchor download failed:', anchorError);
    }

    // Method 3: Hidden iframe
    try {
      const iframeId = 'download-iframe-' + Date.now();
      let iframe = document.getElementById(iframeId) as HTMLIFrameElement;
      
      if (!iframe) {
        iframe = document.createElement('iframe');
        iframe.id = iframeId;
        iframe.style.display = 'none';
        document.body.appendChild(iframe);
      }
      
      iframe.src = url;
      
      // Cleanup after delay
      setTimeout(() => {
        if (iframe.parentNode) {
          iframe.parentNode.removeChild(iframe);
        }
      }, 5000);
      
      return { success: true, method: 'iframe' };
    } catch (iframeError) {
      console.warn('iFrame download failed:', iframeError);
    }

    // Method 4: window.location assignment (last resort)
    try {
      window.location.href = url;
      return { success: true, method: 'window-location' };
    } catch (locationError) {
      return { 
        success: false, 
        error: `All download methods failed. Last error: ${locationError}` 
      };
    }
  },

  /**
   * Downloads text/data content as a file
   * Used for generated content (JSON, CSV, text, etc)
   */
  downloadDataAsFile(content: string, filename: string, mimeType: string = 'text/plain'): {success: boolean; method?: string; error?: string} {
    try {
      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.style.display = 'none';
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      
      // Cleanup
      setTimeout(() => {
        document.body.removeChild(anchor);
        window.URL.revokeObjectURL(url);
      }, 100);
      
      return { success: true, method: 'blob-data' };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMsg };
    }
  },

  /**
   * Parse GitHub/GitLab repository URL and extract components
   * Supports various URL formats and extracts owner, repo, branch, filepath
   * 
   * @param url - GitHub/GitLab URL (raw, blob, tree, release, etc.)
   * @returns Repository info object or null if parsing fails
   * 
   * @example
   * parseRepositoryUrl('https://github.com/owner/repo/raw/refs/heads/main/src/index.ts')
   * // { platform: 'github', owner: 'owner', repo: 'repo', branch: 'main', filepath: 'src/index.ts', ... }
   */
  parseRepositoryUrl(url: string): {
    platform: 'github' | 'gitlab' | 'unknown';
    owner: string;
    repo: string;
    branch?: string;
    filepath?: string;
    isRaw?: boolean;
    isRelease?: boolean;
    tag?: string;
    rawUrl?: string;
    apiUrl?: string;
    repoUrl?: string;
    releaseUrl?: string;
  } | null {
    if (!url) return null;

    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.toLowerCase();
      const pathParts = urlObj.pathname.split('/').filter(p => p);

      // Determine platform
      let platform: 'github' | 'gitlab' | 'unknown' = 'unknown';
      if (hostname.includes('github')) {
        platform = 'github';
      } else if (hostname.includes('gitlab')) {
        platform = 'gitlab';
      } else {
        console.error('Unknown repository platform:', hostname);
        return null;
      }

      // Need at least owner/repo
      if (pathParts.length < 2) return null;

      const owner = pathParts[0];
      const repo = pathParts[1];
      const repoUrl = `https://${hostname}/${owner}/${repo}`;

      const result: any = {
        platform,
        owner,
        repo,
        repoUrl,
      };

      // Parse GitHub URLs
      if (platform === 'github') {
        // Format: /owner/repo/raw/refs/heads/branch/path/to/file
        // Format: /owner/repo/blob/branch/path/to/file
        // Format: /owner/repo/tree/branch/path/to/file
        // Format: /owner/repo/releases/tag/tagname
        // Format: /owner/repo/releases/latest/download/file

        if (pathParts.length > 2) {
          const action = pathParts[2]; // raw, blob, tree, releases, etc.

          if (action === 'raw') {
            result.isRaw = true;
            
            // /raw/refs/heads/branch/filepath or /raw/branch/filepath
            if (pathParts[3] === 'refs' && pathParts[4] === 'heads') {
              result.branch = pathParts[5];
              result.filepath = pathParts.slice(6).join('/');
            } else {
              result.branch = pathParts[3];
              result.filepath = pathParts.slice(4).join('/');
            }
          } else if (action === 'blob' || action === 'tree') {
            result.branch = pathParts[3];
            result.filepath = pathParts.slice(4).join('/');
            
            // Construct raw URL
            if (result.filepath) {
              result.rawUrl = `https://${hostname}/${owner}/${repo}/raw/${result.branch}/${result.filepath}`;
            }
          } else if (action === 'releases') {
            result.isRelease = true;
            
            if (pathParts[3] === 'tag') {
              result.tag = pathParts[4];
            } else if (pathParts[3] === 'latest') {
              result.tag = 'latest';
              if (pathParts[4] === 'download') {
                result.filepath = pathParts.slice(5).join('/');
              }
            }
            
            result.releaseUrl = `${repoUrl}/releases/${result.tag || 'latest'}`;
          }
        }

        // Construct API URL
        result.apiUrl = `https://api.github.com/repos/${owner}/${repo}`;
      }

      // Parse GitLab URLs
      if (platform === 'gitlab') {
        // Format: /owner/repo/-/raw/branch/path/to/file
        // Format: /owner/repo/-/blob/branch/path/to/file
        // Format: /owner/repo/-/releases/tag

        if (pathParts.length > 3 && pathParts[2] === '-') {
          const action = pathParts[3]; // raw, blob, releases, etc.

          if (action === 'raw' || action === 'blob') {
            result.branch = pathParts[4];
            result.filepath = pathParts.slice(5).join('/');
            result.isRaw = action === 'raw';
            
            if (action === 'blob' && result.filepath) {
              result.rawUrl = `https://${hostname}/${owner}/${repo}/-/raw/${result.branch}/${result.filepath}`;
            }
          } else if (action === 'releases') {
            result.isRelease = true;
            result.tag = pathParts[4];
            result.releaseUrl = `${repoUrl}/-/releases/${result.tag}`;
          }
        }

        // GitLab API URL
        result.apiUrl = `https://${hostname}/api/v4/projects/${encodeURIComponent(owner + '/' + repo)}`;
      }

      return result;
    } catch (error) {
      console.error('Failed to parse repository URL:', error);
      return null;
    }
  },
};
