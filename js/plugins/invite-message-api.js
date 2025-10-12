/**
 * Invite Message API Plugin
 *
 * This plugin provides an API for managing and rotating custom invite messages with cooldown tracking.
 *
 * Usage Examples:
 *
 * // Get the plugin instance
 * const inviteApi = window.customjs.pluginManager.getPlugin("invite-message-api");
 *
 * // Request an invite message (will find a message with 0 cooldown and update it)
 * const result = await inviteApi.requestInviteMessage("Join me at the cool world!");
 * if (result) {
 *   console.log("Message ready:", result.message);
 *   if (result.alreadyExists) {
 *     console.log("Message already existed in slot", result.message.slot);
 *   }
 * } else {
 *   console.log("Failed: message too long, on cooldown, or not configured");
 * }
 *
 * // Request an invite response message
 * const response = await inviteApi.requestInviteResponseMessage("Thanks for the invite!");
 *
 * // Request an invite request message
 * const request = await inviteApi.requestInviteRequestMessage("Can I join your world?");
 *
 * // Request an invite request response message
 * const requestResponse = await inviteApi.requestInviteRequestResponseMessage("Sure, come join!");
 *
 * // Get all messages with cooldown info
 * const messages = inviteApi.getMessagesWithCooldown('message');
 * messages.forEach(msg => {
 *   console.log(`Slot ${msg.slot}: "${msg.message}" - ${msg.cooldownMinutes} min cooldown`);
 * });
 *
 * // Get statistics
 * const stats = inviteApi.getStats();
 * console.log("Ready messages:", stats.message.ready);
 * console.log("On cooldown:", stats.message.onCooldown);
 *
 * // Force edit even if on cooldown (optional parameter)
 * const forced = await inviteApi.requestInviteMessage("New text", true);
 */

class InviteMessageApiPlugin extends Plugin {
  constructor() {
    super({
      name: "Invite Message API",
      description:
        "API for managing and rotating custom invite messages with cooldown tracking",
      author: "Bluscream",
      version: "{VERSION}",
      build: "{BUILD}",
      dependencies: [],
    });

    // Cache for message stores
    this.inviteStore = null;

    // Cooldown in milliseconds (1 hour)
    this.COOLDOWN_MS = 60 * 60 * 1000;

    // VRChat message character limit
    this.MAX_MESSAGE_LENGTH = 64;
  }

  async load() {
    this.logger.log("Invite Message API ready");
    this.loaded = true;
  }

  async start() {
    // Get invite store reference
    this.inviteStore = window.$pinia?.invite;

    if (!this.inviteStore) {
      this.logger.error("Invite store not found in $pinia");
      return;
    }

    this.enabled = true;
    this.started = true;
    this.logger.log("Invite Message API started");
  }

  async onLogin(user) {
    // No automatic refresh on login - only refresh when actually needed
  }

  async stop() {
    this.logger.log("Stopping Invite Message API");
    this.inviteStore = null;
    await super.stop();
  }

  /**
   * Ensure data is loaded for a specific message type
   * @param {'message' | 'response' | 'request' | 'requestResponse'} messageType
   */
  async ensureDataLoadedForType(messageType) {
    if (!this.inviteStore) return;

    try {
      let needsRefresh = false;

      switch (messageType) {
        case "message":
          needsRefresh = !this.inviteStore.inviteMessageTable?.data?.length;
          break;
        case "response":
          needsRefresh =
            !this.inviteStore.inviteResponseMessageTable?.data?.length;
          break;
        case "request":
          needsRefresh =
            !this.inviteStore.inviteRequestMessageTable?.data?.length;
          break;
        case "requestResponse":
          needsRefresh =
            !this.inviteStore.inviteRequestResponseMessageTable?.data?.length;
          break;
      }

      if (needsRefresh) {
        await this.refreshMessages(messageType);
      }
    } catch (error) {
      this.logger.error(`Failed to load ${messageType} data:`, error);
    }
  }

  /**
   * Refresh messages for a specific type
   * @param {'message' | 'response' | 'request' | 'requestResponse'} messageType
   */
  async refreshMessages(messageType) {
    if (!this.inviteStore?.refreshInviteMessageTableData) {
      this.logger.error("refreshInviteMessageTableData not available");
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        this.inviteStore.refreshInviteMessageTableData(messageType);
        // Give it a moment to load
        setTimeout(resolve, 500);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Calculate remaining cooldown in minutes for a message
   * @param {object} message - Message object with updatedAt property
   * @returns {number} Remaining cooldown in minutes (0 if ready to use)
   */
  getRemainingCooldownMinutes(message) {
    if (!message || !message.updatedAt) {
      return 0;
    }

    const now = Date.now();
    const lastUsed = Date.parse(message.updatedAt);
    const elapsed = now - lastUsed;
    const remaining = this.COOLDOWN_MS - elapsed;

    if (remaining <= 0) {
      return 0;
    }

    return Math.ceil(remaining / 60000); // Convert to minutes
  }

  /**
   * Get the next available message from a message table
   * @param {Array} messages - Array of message objects
   * @returns {object|null} Next available message or null if none available
   */
  getNextAvailableMessage(messages) {
    if (!messages || !messages.length) {
      return null;
    }

    // Find first message with 0 cooldown
    for (const message of messages) {
      if (this.getRemainingCooldownMinutes(message) === 0) {
        return message;
      }
    }

    // If no message is available, return the one with shortest cooldown
    return messages.reduce((closest, current) => {
      const closestCooldown = this.getRemainingCooldownMinutes(closest);
      const currentCooldown = this.getRemainingCooldownMinutes(current);
      return currentCooldown < closestCooldown ? current : closest;
    });
  }

  /**
   * Find a message that already has the requested text
   * @param {Array} messages - Array of message objects
   * @param {string} text - Text to search for
   * @returns {object|null} Message with matching text or null if not found
   */
  findExistingMessage(messages, text) {
    if (!messages || !messages.length) {
      return null;
    }

    // Find a message with matching text (no cooldown check needed since we're not editing)
    for (const message of messages) {
      if (message.message === text) {
        return message;
      }
    }

    return null;
  }

  /**
   * Request a custom invite message
   * @param {string} newText - New text to set for the message
   * @param {boolean} forceEdit - Force edit even if on cooldown (default: false)
   * @returns {Promise<object|null>} Promise resolving to the message object with cooldown info, or null if failed
   */
  async requestInviteMessage(newText, forceEdit = false) {
    if (!this.inviteStore) {
      this.logger.error("Invite store not available");
      return null;
    }

    // Validate message length
    if (newText.length > this.MAX_MESSAGE_LENGTH) {
      this.logger.error(
        `Message too long: ${newText.length} characters (max ${this.MAX_MESSAGE_LENGTH})`
      );
      return null;
    }

    // Ensure data is loaded for this type only
    await this.ensureDataLoadedForType("message");

    const messages = this.inviteStore.inviteMessageTable?.data;
    if (!messages || !messages.length) {
      this.logger.error(
        "No invite messages available. Please configure them in your VRChat profile settings."
      );
      return null;
    }

    // Check if message already exists with requested text
    const existingMessage = this.findExistingMessage(messages, newText);
    if (existingMessage) {
      this.logger.log(
        `Message slot ${existingMessage.slot} already has the requested text`
      );
      return {
        message: existingMessage,
        cooldown: 0,
        ready: true,
        success: true,
        alreadyExists: true,
      };
    }

    // Get next available message slot
    const message = this.getNextAvailableMessage(messages);
    if (!message) {
      this.logger.error("No invite messages found");
      return null;
    }

    const cooldown = this.getRemainingCooldownMinutes(message);

    if (cooldown > 0 && !forceEdit) {
      this.logger.warn(
        `All message slots are on cooldown. Next available in ${cooldown} minutes`
      );
      return null;
    }

    // Edit the message using the VRChat API
    try {
      // Access the inviteMessagesRequest API from window.$app or through the API
      const inviteMessagesRequest =
        window.customjs?.functions?.inviteMessagesRequest ||
        window.$app?.API?.inviteMessages;

      if (!inviteMessagesRequest) {
        // Try to use the API directly from the source
        const { default: inviteMessagesReq } = await import(
          "/src/api/inviteMessages.js"
        );
        if (inviteMessagesReq) {
          await inviteMessagesReq.editInviteMessage(
            { message: newText },
            "message",
            message.slot
          );
        } else {
          throw new Error("inviteMessagesRequest API not available");
        }
      } else {
        await inviteMessagesRequest.editInviteMessage(
          { message: newText },
          "message",
          message.slot
        );
      }

      // Update the local message object
      message.message = newText;
      message.updatedAt = new Date().toISOString();

      // Refresh the store to get updated data after editing
      await this.refreshMessages("message");

      this.logger.log(
        `Successfully edited invite message slot ${message.slot}: "${newText}"`
      );

      return {
        message,
        cooldown: 0,
        ready: true,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to edit invite message:`, error);
      throw error;
    }
  }

  /**
   * Request a custom invite response message
   * @param {string} newText - New text to set for the message
   * @param {boolean} forceEdit - Force edit even if on cooldown (default: false)
   * @returns {Promise<object|null>} Promise resolving to the message object with cooldown info, or null if failed
   */
  async requestInviteResponseMessage(newText, forceEdit = false) {
    if (!this.inviteStore) {
      this.logger.error("Invite store not available");
      return null;
    }

    // Validate message length
    if (newText.length > this.MAX_MESSAGE_LENGTH) {
      this.logger.error(
        `Message too long: ${newText.length} characters (max ${this.MAX_MESSAGE_LENGTH})`
      );
      return null;
    }

    // Ensure data is loaded for this type only
    await this.ensureDataLoadedForType("response");

    const messages = this.inviteStore.inviteResponseMessageTable?.data;
    if (!messages || !messages.length) {
      this.logger.error(
        "No invite response messages available. Please configure them in your VRChat profile settings."
      );
      return null;
    }

    // Check if message already exists with requested text
    const existingMessage = this.findExistingMessage(messages, newText);
    if (existingMessage) {
      this.logger.log(
        `Response message slot ${existingMessage.slot} already has the requested text`
      );
      return {
        message: existingMessage,
        cooldown: 0,
        ready: true,
        success: true,
        alreadyExists: true,
      };
    }

    // Get next available message slot
    const message = this.getNextAvailableMessage(messages);
    if (!message) {
      this.logger.error("No invite response messages found");
      return null;
    }

    const cooldown = this.getRemainingCooldownMinutes(message);

    if (cooldown > 0 && !forceEdit) {
      this.logger.warn(
        `All response message slots are on cooldown. Next available in ${cooldown} minutes`
      );
      return null;
    }

    // Edit the message using the VRChat API
    try {
      // Access the inviteMessagesRequest API
      const inviteMessagesRequest =
        window.customjs?.functions?.inviteMessagesRequest ||
        window.$app?.API?.inviteMessages;

      if (!inviteMessagesRequest) {
        // Try to use the API directly from the source
        const { default: inviteMessagesReq } = await import(
          "/src/api/inviteMessages.js"
        );
        if (inviteMessagesReq) {
          await inviteMessagesReq.editInviteMessage(
            { message: newText },
            "response",
            message.slot
          );
        } else {
          throw new Error("inviteMessagesRequest API not available");
        }
      } else {
        await inviteMessagesRequest.editInviteMessage(
          { message: newText },
          "response",
          message.slot
        );
      }

      // Update the local message object
      message.message = newText;
      message.updatedAt = new Date().toISOString();

      // Refresh the store to get updated data after editing
      await this.refreshMessages("response");

      this.logger.log(
        `Successfully edited invite response message slot ${message.slot}: "${newText}"`
      );

      return {
        message,
        cooldown: 0,
        ready: true,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to edit invite response message:`, error);
      throw error;
    }
  }

  /**
   * Request a custom invite request message
   * @param {string} newText - New text to set for the message
   * @param {boolean} forceEdit - Force edit even if on cooldown (default: false)
   * @returns {Promise<object|null>} Promise resolving to the message object with cooldown info, or null if failed
   */
  async requestInviteRequestMessage(newText, forceEdit = false) {
    if (!this.inviteStore) {
      this.logger.error("Invite store not available");
      return null;
    }

    // Validate message length
    if (newText.length > this.MAX_MESSAGE_LENGTH) {
      this.logger.error(
        `Message too long: ${newText.length} characters (max ${this.MAX_MESSAGE_LENGTH})`
      );
      return null;
    }

    // Ensure data is loaded for this type only
    await this.ensureDataLoadedForType("request");

    const messages = this.inviteStore.inviteRequestMessageTable?.data;
    if (!messages || !messages.length) {
      this.logger.error(
        "No invite request messages available. Please configure them in your VRChat profile settings."
      );
      return null;
    }

    // Check if message already exists with requested text
    const existingMessage = this.findExistingMessage(messages, newText);
    if (existingMessage) {
      this.logger.log(
        `Request message slot ${existingMessage.slot} already has the requested text`
      );
      return {
        message: existingMessage,
        cooldown: 0,
        ready: true,
        success: true,
        alreadyExists: true,
      };
    }

    // Get next available message slot
    const message = this.getNextAvailableMessage(messages);
    if (!message) {
      this.logger.error("No invite request messages found");
      return null;
    }

    const cooldown = this.getRemainingCooldownMinutes(message);

    if (cooldown > 0 && !forceEdit) {
      this.logger.warn(
        `All request message slots are on cooldown. Next available in ${cooldown} minutes`
      );
      return null;
    }

    // Edit the message using the VRChat API
    try {
      const inviteMessagesRequest =
        window.customjs?.functions?.inviteMessagesRequest ||
        window.$app?.API?.inviteMessages;

      if (!inviteMessagesRequest) {
        const { default: inviteMessagesReq } = await import(
          "/src/api/inviteMessages.js"
        );
        if (inviteMessagesReq) {
          await inviteMessagesReq.editInviteMessage(
            { message: newText },
            "request",
            message.slot
          );
        } else {
          throw new Error("inviteMessagesRequest API not available");
        }
      } else {
        await inviteMessagesRequest.editInviteMessage(
          { message: newText },
          "request",
          message.slot
        );
      }

      // Update the local message object
      message.message = newText;
      message.updatedAt = new Date().toISOString();

      // Refresh the store to get updated data after editing
      await this.refreshMessages("request");

      this.logger.log(
        `Successfully edited invite request message slot ${message.slot}: "${newText}"`
      );

      return {
        message,
        cooldown: 0,
        ready: true,
        success: true,
      };
    } catch (error) {
      this.logger.error(`Failed to edit invite request message:`, error);
      throw error;
    }
  }

  /**
   * Request a custom invite request response message
   * @param {string} newText - New text to set for the message
   * @param {boolean} forceEdit - Force edit even if on cooldown (default: false)
   * @returns {Promise<object|null>} Promise resolving to the message object with cooldown info, or null if failed
   */
  async requestInviteRequestResponseMessage(newText, forceEdit = false) {
    if (!this.inviteStore) {
      this.logger.error("Invite store not available");
      return null;
    }

    // Validate message length
    if (newText.length > this.MAX_MESSAGE_LENGTH) {
      this.logger.error(
        `Message too long: ${newText.length} characters (max ${this.MAX_MESSAGE_LENGTH})`
      );
      return null;
    }

    // Ensure data is loaded for this type only
    await this.ensureDataLoadedForType("requestResponse");

    const messages = this.inviteStore.inviteRequestResponseMessageTable?.data;
    if (!messages || !messages.length) {
      this.logger.error(
        "No invite request response messages available. Please configure them in your VRChat profile settings."
      );
      return null;
    }

    // Check if message already exists with requested text
    const existingMessage = this.findExistingMessage(messages, newText);
    if (existingMessage) {
      this.logger.log(
        `Request response message slot ${existingMessage.slot} already has the requested text`
      );
      return {
        message: existingMessage,
        cooldown: 0,
        ready: true,
        success: true,
        alreadyExists: true,
      };
    }

    // Get next available message slot
    const message = this.getNextAvailableMessage(messages);
    if (!message) {
      this.logger.error("No invite request response messages found");
      return null;
    }

    const cooldown = this.getRemainingCooldownMinutes(message);

    if (cooldown > 0 && !forceEdit) {
      this.logger.warn(
        `All request response message slots are on cooldown. Next available in ${cooldown} minutes`
      );
      return null;
    }

    // Edit the message using the VRChat API
    try {
      const inviteMessagesRequest =
        window.customjs?.functions?.inviteMessagesRequest ||
        window.$app?.API?.inviteMessages;

      if (!inviteMessagesRequest) {
        const { default: inviteMessagesReq } = await import(
          "/src/api/inviteMessages.js"
        );
        if (inviteMessagesReq) {
          await inviteMessagesReq.editInviteMessage(
            { message: newText },
            "requestResponse",
            message.slot
          );
        } else {
          throw new Error("inviteMessagesRequest API not available");
        }
      } else {
        await inviteMessagesRequest.editInviteMessage(
          { message: newText },
          "requestResponse",
          message.slot
        );
      }

      // Update the local message object
      message.message = newText;
      message.updatedAt = new Date().toISOString();

      // Refresh the store to get updated data after editing
      await this.refreshMessages("requestResponse");

      this.logger.log(
        `Successfully edited invite request response message slot ${message.slot}: "${newText}"`
      );

      return {
        message,
        cooldown: 0,
        ready: true,
        success: true,
      };
    } catch (error) {
      this.logger.error(
        `Failed to edit invite request response message:`,
        error
      );
      throw error;
    }
  }

  /**
   * Get all available messages with cooldown info
   * @param {'message' | 'response' | 'request' | 'requestResponse'} messageType
   * @returns {Array<object>} Array of messages with cooldown info
   */
  getMessagesWithCooldown(messageType) {
    if (!this.inviteStore) {
      return [];
    }

    let messages;
    switch (messageType) {
      case "message":
        messages = this.inviteStore.inviteMessageTable?.data || [];
        break;
      case "response":
        messages = this.inviteStore.inviteResponseMessageTable?.data || [];
        break;
      case "request":
        messages = this.inviteStore.inviteRequestMessageTable?.data || [];
        break;
      case "requestResponse":
        messages =
          this.inviteStore.inviteRequestResponseMessageTable?.data || [];
        break;
      default:
        return [];
    }

    return messages.map((msg) => ({
      ...msg,
      cooldownMinutes: this.getRemainingCooldownMinutes(msg),
      ready: this.getRemainingCooldownMinutes(msg) === 0,
    }));
  }

  /**
   * Get statistics about message cooldowns
   * @returns {object} Statistics object
   */
  getStats() {
    const stats = {
      message: {
        total: 0,
        ready: 0,
        onCooldown: 0,
      },
      response: {
        total: 0,
        ready: 0,
        onCooldown: 0,
      },
      request: {
        total: 0,
        ready: 0,
        onCooldown: 0,
      },
      requestResponse: {
        total: 0,
        ready: 0,
        onCooldown: 0,
      },
    };

    ["message", "response", "request", "requestResponse"].forEach((type) => {
      const messages = this.getMessagesWithCooldown(type);
      stats[type].total = messages.length;
      stats[type].ready = messages.filter((m) => m.ready).length;
      stats[type].onCooldown = messages.filter((m) => !m.ready).length;
    });

    return stats;
  }
}

// Export plugin class for PluginLoader
window.customjs.__LAST_PLUGIN_CLASS__ = InviteMessageApiPlugin;
