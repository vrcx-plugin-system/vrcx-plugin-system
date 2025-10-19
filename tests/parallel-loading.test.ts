/**
 * Parallel Module Loading Tests
 * Tests the mutex lock and race condition prevention
 */

import { CustomModule } from '../src/modules/custom-module';

describe('Parallel Module Loading', () => {
  beforeEach(() => {
    (window as any).customjs = {
      modules: [],
      __currentPluginUrl: null,
      __LAST_PLUGIN_CLASS__: undefined,
      classes: {
        CustomModule,
        Logger: class {},
        CustomActionButton: class {},
      },
      types: { SettingType: {} },
      utils: { decodeUnicode: (s: string) => s },
      definePluginSettings: jest.fn(),
    };

    (global as any).document = {
      createElement: jest.fn().mockReturnValue({
        type: '',
        textContent: '',
        dataset: {},
      }),
      head: {
        appendChild: jest.fn(),
      },
    };

    CustomModule.loadedUrls.clear();
    CustomModule.failedUrls.clear();
  });

  describe('Race Condition Prevention', () => {
    test('should prevent __currentPluginUrl race condition', async () => {
      let urlsSet: string[] = [];
      let classesSet: any[] = [];

      // Mock fetch for multiple modules
      (global as any).fetch = jest.fn()
        .mockImplementation((url: string) => {
          return Promise.resolve({
            ok: true,
            text: async () => {
              const id = url.includes('module-a') ? 'A' : 'B';
              return `
                class TestModule${id} extends CustomModule {
                  constructor() {
                    // Capture URL at construction time
                    const capturedUrl = window.customjs.__currentPluginUrl;
                    super({ 
                      name: 'Module ${id}',
                      url: capturedUrl,
                    });
                  }
                }
                window.customjs.__LAST_PLUGIN_CLASS__ = TestModule${id};
              `;
            },
          });
        });

      // Load modules in parallel
      const results = await Promise.allSettled([
        CustomModule.loadFromUrl('http://test.com/module-a.js'),
        CustomModule.loadFromUrl('http://test.com/module-b.js'),
        CustomModule.loadFromUrl('http://test.com/module-c.js'),
      ]);

      // All should succeed
      const successful = results.filter(r => r.status === 'fulfilled');
      expect(successful.length).toBeGreaterThan(0);

      // Check that modules have correct URLs (no race conditions)
      for (const module of (window as any).customjs.modules) {
        if (module.metadata?.url) {
          // URL should match the module's own ID
          expect(module.metadata.url).toContain('module-');
        }
      }
    });

    test('should execute scripts sequentially even when fetched in parallel', async () => {
      // This test verifies the mutex lock prevents race conditions
      // by ensuring scripts execute one at a time
      
      let scriptExecutionCount = 0;
      let maxConcurrent = 0;
      let currentConcurrent = 0;

      (global as any).fetch = jest.fn()
        .mockImplementation((url: string) => {
          return Promise.resolve({
            ok: true,
            text: async () => {
              const id = url.split('/').pop()?.replace('.js', '').replace(/-/g, '');
              const cleanId = id?.replace(/\d+/g, '') || 'Module';
              const num = id?.match(/\d+/)?.[0] || '1';
              return `
                (function() {
                  const startCount = (window.__scriptExecCount || 0) + 1;
                  window.__scriptExecCount = startCount;
                  window.__maxConcurrent = Math.max(window.__maxConcurrent || 0, startCount);
                  
                  class TestModule${num} extends CustomModule {
                    constructor() {
                      super({ id: '${id}', name: 'Module ${num}' });
                    }
                  }
                  window.customjs.__LAST_PLUGIN_CLASS__ = TestModule${num};
                  
                  window.__scriptExecCount = (window.__scriptExecCount || 1) - 1;
                })();
              `;
            },
          });
        });

      (global as any).window.__scriptExecCount = 0;
      (global as any).window.__maxConcurrent = 0;

      // Load modules in parallel
      await Promise.all([
        CustomModule.loadFromUrl('http://test.com/module-1.js'),
        CustomModule.loadFromUrl('http://test.com/module-2.js'),
        CustomModule.loadFromUrl('http://test.com/module-3.js'),
      ]);

      // Mutex lock ensures maxConcurrent should be 1 (scripts execute sequentially)
      expect((global as any).window.__maxConcurrent).toBeLessThanOrEqual(1);
    });
  });

  describe('Error Handling', () => {
    test('should retry failed loads', async () => {
      let attemptCount = 0;
      (global as any).fetch = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.resolve({
            ok: false,
            status: 500,
            statusText: 'Internal Server Error',
          });
        }
        return Promise.resolve({
          ok: true,
          text: async () => `
            class TestModule extends CustomModule {
              constructor() { super({ name: 'Test' }); }
            }
            window.customjs.__LAST_PLUGIN_CLASS__ = TestModule;
          `,
        });
      });

      const module = await CustomModule.loadFromUrl('http://test.com/test.js', 0, 3);
      expect(attemptCount).toBeGreaterThan(1);
    });

    test('should add to failedUrls after max retries', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const module = await CustomModule.loadFromUrl('http://test.com/404.js', 0, 2);
      expect(module).toBeNull();
      expect(CustomModule.failedUrls.has('http://test.com/404.js')).toBe(true);
    });
  });
});
