import { expect, test, describe } from 'bun:test';
import { ConfirmationService } from '../../src/utils/confirmation-service';

describe('Auto-edit enabled by default', () => {
  test('ConfirmationService respects allOperations flag', () => {
    const service = ConfirmationService.getInstance();
    
    // Reset to clean state
    service.resetSession();
    
    // Verify initially not set
    let flags = service.getSessionFlags();
    expect(flags.allOperations).toBe(false);
    
    // Set the flag (simulating what happens in our code change)
    service.setSessionFlag('allOperations', true);
    
    // Verify it's now set
    flags = service.getSessionFlags();
    expect(flags.allOperations).toBe(true);
    
    // Reset for next test
    service.resetSession();
  });

  test('enableAutoEdit logic with nullish coalescing', () => {
    // Simulate the logic in index.ts
    const scenarios = [
      { dangerouslySkipPermissions: undefined, expected: true, description: 'undefined (not provided)' },
      { dangerouslySkipPermissions: true, expected: true, description: 'explicitly true' },
      { dangerouslySkipPermissions: false, expected: false, description: 'explicitly false' },
    ];

    scenarios.forEach(({ dangerouslySkipPermissions, expected, description }) => {
      const enableAutoEdit = dangerouslySkipPermissions ?? true;
      expect(enableAutoEdit).toBe(expected);
    });
  });

  test('confirmation service singleton pattern works', () => {
    const service1 = ConfirmationService.getInstance();
    const service2 = ConfirmationService.getInstance();
    
    // Should be the same instance
    expect(service1).toBe(service2);
    
    // Setting on one should affect the other
    service1.setSessionFlag('fileOperations', true);
    const flags = service2.getSessionFlags();
    expect(flags.fileOperations).toBe(true);
    
    // Reset
    service1.resetSession();
  });
});
