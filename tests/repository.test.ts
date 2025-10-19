/**
 * Repository Management Tests
 */

import { ModuleRepository } from '../src/modules/repository';

describe('ModuleRepository', () => {
  let repo: ModuleRepository;

  beforeEach(() => {
    (window as any).customjs = {
      repos: [],
      modules: [],
    };

    (global as any).fetch = jest.fn();
    repo = new ModuleRepository('http://test.com/repo.json');
  });

  describe('Initialization', () => {
    test('should create repository with URL', () => {
      expect(repo.url).toBe('http://test.com/repo.json');
      expect(repo.enabled).toBe(true);
      expect(repo.modules).toEqual([]);
    });
  });

  describe('fetchMetadata()', () => {
    test('should fetch and parse repository metadata', async () => {
      const mockRepoData = {
        name: 'Test Repo',
        description: 'Test Repository',
        authors: [{ name: 'Test Author' }],
        modules: [
          {
            id: 'test-module',
            name: 'Test Module',
            description: 'Test',
            url: 'http://test.com/test.js',
          },
        ],
      };

      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRepoData,
      });

      await repo.fetchMetadata();

      expect(repo.name).toBe('Test Repo');
      expect(repo.description).toBe('Test Repository');
      expect(repo.modules.length).toBe(1);
      expect(repo.modules[0].id).toBe('test-module');
    });

    test('should handle fetch errors', async () => {
      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(repo.fetchMetadata()).rejects.toThrow();
    });
  });

  describe('Module Management', () => {
    test('should track loaded modules', async () => {
      const mockRepoData = {
        modules: [
          { id: 'mod-1', name: 'Module 1', url: 'http://test.com/mod1.js' },
          { id: 'mod-2', name: 'Module 2', url: 'http://test.com/mod2.js' },
        ],
      };

      (global as any).fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: async () => mockRepoData,
      });

      await repo.fetchMetadata();

      expect(repo.modules.length).toBe(2);
      expect(repo.getModule('mod-1')).toBeDefined();
      expect(repo.getModule('mod-2')).toBeDefined();
    });
  });
});

