/**
 * Utility Functions Tests
 */

import { utils } from '../src/modules/utils';

describe('Utility Functions', () => {
  describe('decodeUnicode()', () => {
    test('should decode \\u{XXXX} format', () => {
      const input = '\\u{1F4DD} Test';
      const output = utils.decodeUnicode(input);
      expect(output).toBe('📝 Test');
    });

    test('should decode \\uXXXX format', () => {
      const input = '\\uFE0F Test';
      const output = utils.decodeUnicode(input);
      expect(output).toBe('️ Test');
    });

    test('should handle multiple unicode sequences', () => {
      const input = '\\u{1F4DD}\\uFE0F Test \\u{1F4E8}';
      const output = utils.decodeUnicode(input);
      expect(output).toContain('📝');
      expect(output).toContain('📨');
    });

    test('should return original on empty input', () => {
      expect(utils.decodeUnicode('')).toBe('');
      expect(utils.decodeUnicode(null as any)).toBe(null);
    });
  });

  describe('timeToText()', () => {
    test('should format seconds', () => {
      expect(utils.timeToText(5000)).toBe('5s');
    });

    test('should format minutes', () => {
      expect(utils.timeToText(120000)).toBe('2m 0s');
    });

    test('should format hours', () => {
      expect(utils.timeToText(3600000)).toBe('1h 0m');
    });

    test('should format days', () => {
      expect(utils.timeToText(86400000)).toBe('1d 0h');
    });

    test('should handle zero', () => {
      expect(utils.timeToText(0)).toBe('0s');
    });
  });

  describe('parseTimespan()', () => {
    test('should parse direct milliseconds', () => {
      expect(utils.parseTimespan(5000)).toBe(5000);
      expect(utils.parseTimespan('5000')).toBe(5000);
    });

    test('should parse "1h 20m" format', () => {
      expect(utils.parseTimespan('1h 20m')).toBe(4800000);
    });

    test('should parse "00:50.100" format', () => {
      expect(utils.parseTimespan('00:50.100')).toBe(50100);
    });

    test('should handle days', () => {
      expect(utils.parseTimespan('1d')).toBe(86400000);
    });

    test('should return 0 for invalid input', () => {
      expect(utils.parseTimespan('invalid')).toBe(0);
      expect(utils.parseTimespan('')).toBe(0);
    });
  });

  describe('copyToClipboard()', () => {
    test('should handle clipboard operations', async () => {
      // Skip clipboard tests in test environment
      // Real clipboard tests would require jsdom environment with full APIs
      expect(utils.copyToClipboard).toBeDefined();
      expect(typeof utils.copyToClipboard).toBe('function');
    });
  });

  describe('isEmpty()', () => {
    test('should detect empty values', () => {
      expect(utils.isEmpty(null)).toBe(true);
      expect(utils.isEmpty(undefined)).toBe(true);
      expect(utils.isEmpty('')).toBe(true);
    });

    test('should detect non-empty values', () => {
      expect(utils.isEmpty('test')).toBe(false);
      expect(utils.isEmpty(0)).toBe(false);
      expect(utils.isEmpty(false)).toBe(false);
    });
  });
});
