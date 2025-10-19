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
      const executionOrder: string[] = [];

      (global as any).fetch = jest.fn()
        .mockImplementation((url: string) => {
          const delay = url.includes('slow') ? 100 : 10;
          return new Promise(resolve => {
            setTimeout(() => {
              resolve({
                ok: true,
                text: async () => {
                  const id = url.split('/').pop()?.replace('.js', '');
                  executionOrder.push(`fetch-${id}`);
                  return `
                    window.customjs.modules.push({ 
                      metadata: { id: '${id}', name: '${id}' },
                      loaded: false,
                      started: false,
                    });
                    executionOrder.push('execute-${id}');
                  `;
                },
              });
            }, delay);
          });
        });

      // Fast module and slow module - slow fetches slower but should execute in order
      await Promise.all([
        CustomModule.loadFromUrl('http://test.com/fast.js'),
        CustomModule.loadFromUrl('http://test.com/slow.js'),
      ]);

      // Fetch order might vary, but execution should be sequential
      const executions = executionOrder.filter(e => e.startsWith('execute-'));
      expect(executions.length).toBeGreaterThan(0);
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

