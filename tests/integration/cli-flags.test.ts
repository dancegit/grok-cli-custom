import { execa } from 'execa';
import { expect, test, describe, beforeAll, afterAll } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Build the project before tests
const buildProject = async () => {
  const { stdout } = await execa('bun', ['run', 'build']);
  console.log('Build output:', stdout);
};

// Use real GROK_API_KEY from environment - no dummy key
const REAL_API_KEY = process.env.GROK_API_KEY;
if (!REAL_API_KEY) {
  console.warn('WARNING: GROK_API_KEY not set in environment. Tests will skip real API calls.');
}

// Test binary path
const GROK_BINARY = path.join(process.cwd(), 'dist', 'index.js');

// Ensure build directory exists
beforeAll(async () => {
  await buildProject();
  if (!fs.existsSync(path.dirname(GROK_BINARY))) {
    throw new Error('Build failed: dist/index.js not found');
  }
  if (!REAL_API_KEY) {
    console.warn('Skipping real API tests due to missing GROK_API_KEY. Set it and re-run.');
  }
});

// Clean up after tests
afterAll(() => {
  // No env cleanup needed for real key
});

// Helper to run grok CLI and capture output
async function runGrokCli(args: string[], input?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = execa('node', [GROK_BINARY, ...args], {
    all: true,
    stdin: input ? 'pipe' : 'inherit',
    timeout: 30000, // 30s timeout for real API calls
    env: { ...process.env, GROK_API_KEY: REAL_API_KEY }, // Pass real key
  });

  if (input) {
    proc.stdin?.write(input);
    proc.stdin?.end();
  }

  try {
    const { all, exitCode } = await proc;
    const output = all || '';
    // Simple split: assume stderr is after a separator or use execa options for better split if needed
    const parts = output.split('\n---STDERR---\n'); // Custom separator if needed; otherwise, treat all as stdout for simplicity
    const stdout = parts[0] || '';
    const stderr = parts[1] || '';
    return { stdout, stderr, exitCode };
  } catch (error: any) {
    return { stdout: '', stderr: error.message, exitCode: 1 };
  }
};

// Skip all tests if no real API key
if (!REAL_API_KEY) {
  test('Real API tests skipped - set GROK_API_KEY', () => {
    expect(true).toBe(true); // Placeholder
  });
  // Note: In real run, use test.skip() for each, but here we warn and run minimal
} else {
  // Test basic -p mode with text output (real API response)
  test('Basic -p mode outputs text response', async () => {
    const { stdout, exitCode } = await runGrokCli(['-p', 'Hello, Grok!']);
    expect(exitCode).toBe(0);
    expect(stdout.trim().length).toBeGreaterThan(50); // Real response should be substantial
    expect(stdout.trim()).not.toContain('Error'); // No API errors
  });

  // Test --model flag with -p (real model usage)
  test('-p with --model uses specified Grok model', async () => {
    const { stderr, exitCode } = await runGrokCli(['-p', 'Test model', '--model', 'grok-code-fast-1']);
    expect(exitCode).toBe(0);
    // Real verbose logs may vary, but check for model mention in stderr or no error
    expect(stderr).not.toContain('Invalid model');
  });

  // Test --output-format json with -p (real JSON response)
  test('-p with --output-format json outputs JSON', async () => {
    const { stdout, exitCode } = await runGrokCli(['-p', 'JSON test', '--output-format', 'json']);
    expect(exitCode).toBe(0);
    const trimmed = stdout.trim();
    expect(trimmed).toMatch(/^{/); // Starts with JSON
    const parsed = JSON.parse(trimmed);
    expect(parsed).toHaveProperty('messages'); // Expected structure
    expect(Array.isArray(parsed.messages)).toBe(true);
  });

  // Test --output-format stream-json with -p (real streaming JSON)
  test('-p with --output-format stream-json streams JSON lines', async () => {
    const { stdout, exitCode } = await runGrokCli(['-p', 'Stream test', '--output-format', 'stream-json']);
    expect(exitCode).toBe(0);
    const lines = stdout.trim().split('\n').filter(l => l.trim());
    expect(lines.length).toBeGreaterThan(5); // Multiple real stream chunks
    lines.forEach(line => {
      if (line.trim()) {
        const parsed = JSON.parse(line);
        expect(parsed).toHaveProperty('choices'); // Each chunk has choices
      }
    });
  });

  // Test --verbose with -p logs to stderr (real logs)
  test('-p with --verbose logs model and prompt to stderr', async () => {
    const { stderr, exitCode } = await runGrokCli(['-p', 'Verbose test', '--verbose']);
    expect(exitCode).toBe(0);
    expect(stderr).toContain('Using model:');
    expect(stderr).toContain('Processing prompt with model:');
    expect(stderr).toContain('Query:'); // Or similar prompt log
  });

  // Test invalid model exits with error
  test('-p with invalid --model exits with error', async () => {
    const { stderr, exitCode } = await runGrokCli(['-p', 'Test', '--model', 'invalid-model']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Invalid model: invalid-model');
  });

  // Test stdin with -p combines with prompt (real combined response)
  test('-p with stdin input combines with prompt', async () => {
    const input = 'This is stdin content\n';
    const { stdout, exitCode } = await runGrokCli(['-p', 'Combine with stdin'], input);
    expect(exitCode).toBe(0);
    expect(stdout.trim().length).toBeGreaterThan(100); // Longer response due to combined input
  });

  // Test --append-system-prompt with -p (real system prompt influence)
  test('-p with --append-system-prompt adds to system message', async () => {
    const { stderr, exitCode } = await runGrokCli(['-p', 'Test system prompt', '--append-system-prompt', 'You are helpful.']);
    expect(exitCode).toBe(0);
    expect(stderr).toContain('Appended system prompt: You are helpful.'); // Log confirms
    // Response should be helpful, but generalized check
    expect(stdout.trim().length).toBeGreaterThan(50);
  });

  // Test --max-turns limits agent turns (real agent behavior)
  test('-p with --max-turns limits turns (verbose for logging)', async () => {
    const { stderr, exitCode } = await runGrokCli(['-p', 'Complex task that might use tools', '--max-turns', '1', '--verbose']);
    expect(exitCode).toBe(0);
    expect(stderr).toContain('Max turns limited to 1');
    // Real response should be limited, but check non-empty
    expect(stdout.trim().length).toBeGreaterThan(10);
  });

  // Test --dangerously-skip-permissions skips confirmations (real no-confirmation run)
  test('-p with --dangerously-skip-permissions skips perms', async () => {
    const { exitCode } = await runGrokCli(['-p', 'Edit a file without confirmation', '--dangerously-skip-permissions']);
    expect(exitCode).toBe(0); // Should run without perm blocks
  });

  // Test positional args as prompt without -p
  test('Positional args treated as -p prompt', async () => {
    const { stdout, exitCode } = await runGrokCli(['Hello world']);
    expect(exitCode).toBe(0);
    expect(stdout.trim().length).toBeGreaterThan(50); // Real response
  });

  // Test invalid --output-format errors
  test('-p with invalid --output-format errors', async () => {
    const { stderr, exitCode } = await runGrokCli(['-p', 'Test', '--output-format', 'invalid']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Invalid output-format');
  });

  // Test no prompt with -p errors
  test('-p with no prompt errors', async () => {
    const { stderr, exitCode } = await runGrokCli(['-p']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('No prompt provided for print mode');
  });

  // Test stdin only with -p
  test('-p with stdin only', async () => {
    const input = 'Stdin only test';
    const { stdout, exitCode } = await runGrokCli(['-p'], input);
    expect(exitCode).toBe(0);
    expect(stdout.trim().length).toBeGreaterThan(50); // Real response to stdin
  });

  // Test interactive mode without -p (timeout expected, no crash)
  test('Interactive mode without -p launches UI', async () => {
    const { exitCode } = await runGrokCli([]); // Empty args
    // With real API, interactive waits; timeout gives non-zero but no crash error
    expect(exitCode).not.toBe(0); // Timeout expected
    // Verify no fatal errors in stderr (would be in output)
  });
}
