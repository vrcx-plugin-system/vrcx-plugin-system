// ============================================================================
// LOGGER TEST PLUGIN
// Version: 1.0.0
// Build: 1744630000
// ============================================================================
// This is a temporary test plugin to verify the new Logger system works
// Should be removed after testing

class LoggerTestPlugin extends Plugin {
  constructor() {
    super({
      name: "Logger Test",
      description: "Test plugin for verifying Logger functionality",
      author: "Bluscream",
      version: "1.0.0",
      build: "1744630000",
      dependencies: [
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/logger.js",
        "https://github.com/Bluscream/vrcx-custom/raw/refs/heads/main/js/plugin.js",
      ],
    });
  }

  async load() {
    this.logger.log("Logger Test plugin loaded");
    this.loaded = true;
  }

  async start() {
    this.enabled = true;
    this.started = true;

    // Run tests after a short delay to ensure everything is ready
    setTimeout(() => {
      this.runTests();
    }, 2000);
  }

  runTests() {
    this.logger.log("==================== LOGGER TESTS ====================");

    // Test 1: Basic logging methods
    this.logger.log("Test 1: Basic log methods");
    this.logger.logInfo("This is an info message");
    this.logger.logWarn("This is a warning message");
    this.logger.logError("This is an error message");
    this.logger.logDebug("This is a debug message with timestamp");

    // Test 2: Plugin's log/warn/error methods
    this.logger.log("Test 2: Plugin's log/warn/error methods");
    this.logger.log("Plugin log method");
    this.logger.warn("Plugin warn method");
    this.logger.error("Plugin error method");

    // Test 3: Show methods (Noty notifications)
    this.logger.log("Test 3: Show methods (Noty notifications)");
    setTimeout(() => {
      this.logger.showInfo("Test: Info notification");
    }, 500);
    setTimeout(() => {
      this.logger.showSuccess("Test: Success notification");
    }, 1000);
    setTimeout(() => {
      this.logger.showWarn("Test: Warning notification");
    }, 1500);
    setTimeout(() => {
      this.logger.showError("Test: Error notification");
    }, 2000);

    // Test 4: Combined logging
    this.logger.log("Test 4: Combined logging");
    setTimeout(() => {
      this.logger.logAndShow("Test: Log and show message", "info");
    }, 2500);

    // Test 5: Advanced logging with options
    this.logger.log("Test 5: Advanced logging with options");
    setTimeout(() => {
      this.logger.log(
        "Test: Custom logging options",
        { console: true, vrcx: { message: true } },
        "info",
        true
      );
    }, 3000);

    // Test 6: VR notifications (if available)
    this.logger.log(
      "Test 6: VR notifications (will only work if VR overlay apps are running)"
    );
    setTimeout(() => {
      this.logger.notifyDesktop("Test: Desktop notification");
    }, 3500);

    this.logger.log("==================== TESTS COMPLETE ====================");
    this.logger.log("Check console and VRCX notifications for results");
  }

  async onLogin(user) {
    this.logger.log(`User logged in: ${user?.displayName}`);
  }
}

// Export plugin class for PluginLoader
window.__LAST_PLUGIN_CLASS__ = LoggerTestPlugin;
