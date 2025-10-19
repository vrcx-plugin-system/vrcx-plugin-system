/**
 * Module Base Class Tests
 */

import { Module } from '../src/modules/module';
import { ModuleMetadata } from '../src/types';

describe('Module Base Class', () => {
  let testModule: Module;

  beforeEach(() => {
    (window as any).customjs = {
      modules: [],
      utils: {
        decodeUnicode: (str: string) => str,
      },
    };

    testModule = new Module({
      id: 'test-module',
      name: 'Test Module',
      description: 'Test Description',
      authors: [{ name: 'Test Author' }],
      tags: ['Test'],
    });
  });

  describe('Initialization', () => {
    test('should create module with correct metadata', () => {
      expect(testModule.metadata.id).toBe('test-module');
      expect(testModule.metadata.name).toBe('Test Module');
      expect(testModule.metadata.description).toBe('Test Description');
    });

    test('should initialize with correct state', () => {
      expect(testModule.loaded).toBe(false);
      expect(testModule.started).toBe(false);
      expect(testModule.enabled).toBe(true);
    });

    test('should have empty resources', () => {
      expect(testModule.resources.timers).toBeInstanceOf(Set);
      expect(testModule.resources.timers?.size).toBe(0);
    });
  });

  describe('Lifecycle', () => {
    test('load() should set loaded flag', async () => {
      await testModule.load();
      expect(testModule.loaded).toBe(true);
    });

    test('start() should set started and enabled flags', async () => {
      await testModule.load();
      await testModule.start();
      expect(testModule.started).toBe(true);
      expect(testModule.enabled).toBe(true);
    });

    test('stop() should clear resources', async () => {
      await testModule.load();
      await testModule.start();
      
      // Register a timer
      const timerId = testModule.registerTimer(setInterval(() => {}, 1000));
      expect(testModule.resources.timers?.size).toBe(1);
      
      await testModule.stop();
      expect(testModule.started).toBe(false);
      expect(testModule.resources.timers?.size).toBe(0);
    });
  });

  describe('Resource Management', () => {
    test('registerTimer() should track timers', () => {
      const timerId = testModule.registerTimer(setTimeout(() => {}, 1000));
      expect(testModule.resources.timers?.size).toBe(1);
    });

    test('registerListener() should track listeners', () => {
      const element = document.createElement('div');
      const callback = jest.fn();
      testModule.registerListener(element, 'click', callback);
      expect(testModule.resources.listeners?.size).toBe(1);
    });

    test('registerObserver() should track observers', () => {
      const element = document.createElement('div');
      const observer = new MutationObserver(() => {});
      testModule.registerObserver(observer, element);
      expect(testModule.resources.observers?.size).toBe(1);
    });
  });

  describe('Display Methods', () => {
    test('getDisplayName() should decode unicode', () => {
      testModule.metadata.name = 'Test \\u{1F4DD}';
      (window as any).customjs.utils.decodeUnicode = (str: string) => str.replace('\\u{1F4DD}', '📝');
      expect(testModule.getDisplayName()).toBe('Test 📝');
    });

    test('getDisplayDescription() should decode unicode', () => {
      testModule.metadata.description = 'Test \\u{1F4DD}';
      (window as any).customjs.utils.decodeUnicode = (str: string) => str.replace('\\u{1F4DD}', '📝');
      expect(testModule.getDisplayDescription()).toBe('Test 📝');
    });
  });
});

