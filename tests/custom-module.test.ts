/**
 * CustomModule Tests
 */

import { CustomModule } from '../src/modules/custom-module';

describe('CustomModule', () => {
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
      types: {
        SettingType: {},
      },
      utils: {
        decodeUnicode: (str: string) => str,
      },
      definePluginSettings: jest.fn(),
    };

    CustomModule.loadedUrls.clear();
    CustomModule.failedUrls.clear();
  });

  describe('Parallel Loading Safety', () => {
    test('should handle parallel loadFromUrl calls without race conditions', async () => {
      const mockFetch = jest.fn()
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `
            class TestModuleA extends CustomModule {
              constructor() {
                super({ name: 'Module A' });
              }
            }
            window.customjs.__LAST_PLUGIN_CLASS__ = TestModuleA;
          `,
        })
        .mockResolvedValueOnce({
          ok: true,
          text: async () => `
            class TestModuleB extends CustomModule {
              constructor() {
                super({ name: 'Module B' });
              }
            }
            window.customjs.__LAST_PLUGIN_CLASS__ = TestModuleB;
          `,
        });

      (global as any).fetch = mockFetch;

      // Load modules in parallel
      const [moduleA, moduleB] = await Promise.all([
        CustomModule.loadFromUrl('http://test.com/module-a.js'),
        CustomModule.loadFromUrl('http://test.com/module-b.js'),
      ]);

      // Both should be loaded without overwriting each other
      expect((window as any).customjs.modules.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('Dependency Management', () => {
    test('should store dependencies', () => {
      const module = new CustomModule({
        name: 'Test Module',
        dependencies: ['dep-a', 'dep-b'],
      } as any);

      expect(module.dependencies).toEqual(['dep-a', 'dep-b']);
    });

    test('should handle empty dependencies', () => {
      const module = new CustomModule({
        name: 'Test Module',
      });

      expect(module.dependencies).toEqual([]);
    });
  });

  describe('Action Buttons', () => {
    test('should store action buttons as property', () => {
      const module = new CustomModule({
        name: 'Test Module',
      });

      module.actionButtons = [
        {
          title: 'Test Button',
          color: 'primary',
          callback: jest.fn(),
        } as any,
      ];

      expect(module.actionButtons.length).toBe(1);
      expect(module.actionButtons[0].title).toBe('Test Button');
    });
  });

  describe('Settings Management', () => {
    test('should define settings with SettingType', () => {
      const module = new CustomModule({
        name: 'Test Module',
      });

      const mockDefineSettings = jest.fn().mockReturnValue({ store: {} });
      (window as any).customjs.definePluginSettings = mockDefineSettings;

      const settings = module.defineSettings({
        testSetting: {
          type: 'string',
          default: 'test',
        },
      });

      expect(mockDefineSettings).toHaveBeenCalled();
    });
  });
});

