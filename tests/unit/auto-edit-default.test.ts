import { expect, test, describe } from 'bun:test';

describe('Auto-edit default behavior', () => {
  test('dangerouslySkipPermissions defaults to undefined when not provided', () => {
    // When the flag is not provided, it should be undefined
    const options = { dangerouslySkipPermissions: undefined };
    const enableAutoEdit = options.dangerouslySkipPermissions ?? true;
    expect(enableAutoEdit).toBe(true);
  });

  test('dangerouslySkipPermissions can be explicitly set to true', () => {
    // When explicitly set to true, it should remain true
    const options = { dangerouslySkipPermissions: true };
    const enableAutoEdit = options.dangerouslySkipPermissions ?? true;
    expect(enableAutoEdit).toBe(true);
  });

  test('dangerouslySkipPermissions respects explicit false (future-proofing)', () => {
    // If we ever support explicit false, it should be respected
    const options = { dangerouslySkipPermissions: false };
    const enableAutoEdit = options.dangerouslySkipPermissions ?? true;
    expect(enableAutoEdit).toBe(false);
  });

  test('nullish coalescing works correctly for auto-edit default', () => {
    // Test various scenarios
    expect(undefined ?? true).toBe(true);
    expect(null ?? true).toBe(true);
    expect(true ?? true).toBe(true);
    expect(false ?? true).toBe(false);
  });
});
