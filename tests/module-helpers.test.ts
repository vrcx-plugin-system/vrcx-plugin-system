/**
 * Module Helper Functions Tests
 */

import { 
  getModule, 
  waitForModule,
  getAllLoadedModules,
} from '../src/modules/module-helpers';
import { CustomModule } from '../src/modules/custom-module';

describe('Module Helper Functions', () => {
  beforeEach(() => {
    (window as any).customjs = {
      modules: [],
    };
  });

  describe('getModule()', () => {
    test('should find module by ID', () => {
      const testModule = new CustomModule({
        id: 'test-module',
        name: 'Test Module',
      } as any);
      
      (window as any).customjs.modules.push(testModule);

      const found = getModule('test-module');
      expect(found).toBe(testModule);
    });

    test('should find module by URL', () => {
      const testModule = new CustomModule({
        id: 'test-module',
        name: 'Test Module',
        url: 'http://test.com/test.js',
      } as any);
      
      (window as any).customjs.modules.push(testModule);

      const found = getModule('http://test.com/test.js');
      expect(found).toBe(testModule);
    });

    test('should return undefined for non-existent module', () => {
      const found = getModule('non-existent');
      expect(found).toBeUndefined();
    });
  });

  describe('waitForModule()', () => {
    test('should resolve when module is loaded', async () => {
      const testModule = new CustomModule({
        id: 'test-module',
        name: 'Test Module',
      } as any);
      
      testModule.loaded = true;
      (window as any).customjs.modules.push(testModule);

      const result = await waitForModule('test-module', 1000);
      expect(result).toBe(testModule);
    });

    test('should timeout if module not loaded', async () => {
      await expect(waitForModule('non-existent', 100)).rejects.toThrow('Timeout waiting for module');
    });

    test('should wait until module is loaded', async () => {
      const testModule = new CustomModule({
        id: 'test-module',
        name: 'Test Module',
      } as any);
      
      (window as any).customjs.modules.push(testModule);

      // Simulate delayed loading
      setTimeout(() => {
        testModule.loaded = true;
      }, 50);

      const result = await waitForModule('test-module', 1000);
      expect(result).toBe(testModule);
      expect(result.loaded).toBe(true);
    });
  });

  describe('getAllLoadedModules()', () => {
    test('should return all modules', () => {
      const module1 = new CustomModule({ id: 'module-1', name: 'Module 1' } as any);
      const module2 = new CustomModule({ id: 'module-2', name: 'Module 2' } as any);
      
      (window as any).customjs.modules.push(module1, module2);

      const all = getAllLoadedModules();
      expect(all.length).toBe(2);
      expect(all).toContain(module1);
      expect(all).toContain(module2);
    });

    test('should return empty array when no modules', () => {
      const all = getAllLoadedModules();
      expect(all).toEqual([]);
    });
  });
});
