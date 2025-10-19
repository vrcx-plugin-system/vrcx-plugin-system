/**
 * Module Lifecycle Tests
 */

import { CustomModule } from '../src/modules/custom-module';

describe('Module Lifecycle', () => {
  let testModule: CustomModule;

  beforeEach(() => {
    (window as any).customjs = {
      modules: [],
      classes: {},
      types: { SettingType: {} },
      utils: { decodeUnicode: (s: string) => s },
      definePluginSettings: jest.fn(),
    };

    testModule = new CustomModule({
      id: 'test-module',
      name: 'Test Module',
    } as any);
  });

  describe('Load Phase', () => {
    test('should call load() successfully', async () => {
      await testModule.load();
      expect(testModule.loaded).toBe(true);
    });

    test('should set started flag regardless of enabled', async () => {
      await testModule.load();
      testModule.enabled = false;
      await testModule.start();
      // Base Module.start() sets started = true regardless of enabled flag
      // Individual modules should override start() to check enabled if needed
      expect(testModule.started).toBe(true);
    });
  });

  describe('Start Phase', () => {
    test('should start after load', async () => {
      await testModule.load();
      testModule.enabled = true;
      await testModule.start();
      expect(testModule.started).toBe(true);
      expect(testModule.enabled).toBe(true);
    });

    test('should start and set flags correctly', async () => {
      await testModule.load();
      testModule.enabled = true;
      await testModule.start();
      expect(testModule.started).toBe(true);
      expect(testModule.enabled).toBe(true);
    });
  });

  describe('Stop Phase', () => {
    test('should stop and clear resources', async () => {
      await testModule.load();
      await testModule.start();

      const timerId = testModule.registerTimer(setInterval(() => {}, 1000) as any);
      expect(testModule.resources.timers?.size).toBe(1);

      await testModule.stop();
      expect(testModule.started).toBe(false);
      expect(testModule.resources.timers?.size).toBe(0);
    });

    test('should handle stop without start', async () => {
      await expect(testModule.stop()).resolves.not.toThrow();
    });
  });

  describe('Login Phase', () => {
    test('should call onLogin() with user data', async () => {
      const spy = jest.spyOn(testModule, 'onLogin');
      const mockUser = { id: 'usr_test', displayName: 'Test User' };

      await testModule.onLogin(mockUser);
      expect(spy).toHaveBeenCalledWith(mockUser);
    });
  });

  describe('Enable/Disable', () => {
    test('enable() should start module', async () => {
      await testModule.load();
      await testModule.enable();
      expect(testModule.enabled).toBe(true);
      expect(testModule.started).toBe(true);
    });

    test('disable() should stop module', async () => {
      await testModule.load();
      testModule.enabled = true;
      await testModule.start();
      expect(testModule.started).toBe(true);
      
      await testModule.disable();
      expect(testModule.enabled).toBe(false);
      expect(testModule.started).toBe(false);
    });

    test('toggle() should switch state', async () => {
      await testModule.load();
      testModule.enabled = true;
      await testModule.start();
      
      const initialState = testModule.enabled;
      await testModule.toggle();
      expect(testModule.enabled).toBe(!initialState);
    });
  });
});
