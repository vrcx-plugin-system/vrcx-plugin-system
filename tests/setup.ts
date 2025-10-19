/**
 * Test setup and global mocks
 */

// Mock window.customjs global object
(global as any).window = {
  customjs: {
    modules: [],
    repos: [],
    subscriptions: new Map(),
    hooks: {
      pre: {},
      post: {},
      void: {},
      replace: {},
    },
    functions: {},
    events: {},
    coreModules: new Map(),
    classes: {},
    types: {},
    utils: {},
  },
  $pinia: {
    user: {
      currentUser: null,
      cachedUsers: new Map(),
    },
    moderation: {
      cachedPlayerModerations: new Map(),
    },
    gameLog: {
      gameLogTable: [],
    },
  },
  request: {
    userRequest: {},
    instanceRequest: {},
    notificationRequest: {},
  },
  database: {},
  localStorage: {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
    clear: jest.fn(),
  },
  navigator: {
    clipboard: {
      writeText: jest.fn().mockResolvedValue(undefined),
    },
  },
  document: {
    createElement: jest.fn(),
    head: {
      appendChild: jest.fn(),
    },
    body: {
      appendChild: jest.fn(),
    },
    querySelector: jest.fn(),
    querySelectorAll: jest.fn(() => []),
    readyState: 'complete',
    addEventListener: jest.fn(),
  },
};

// Mock fetch
(global as any).fetch = jest.fn();

// Mock console methods to reduce noise
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

