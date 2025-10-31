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

// Mock API key for tests - use a dummy key that won't hit real API
const DUMMY_API_KEY = 'dummy-grok-api-key-for-testing';
process.env.GROK_API_KEY = DUMMY_API_KEY;

// Test binary path
const GROK_BINARY = path.join(process.cwd(), 'dist', 'index.js');

// Ensure build directory exists
beforeAll(async () => {
  await buildProject();
  if (!fs.existsSync(path.dirname(GROK_BINARY))) {
    throw new Error('Build failed: dist/index.js not found');
  }
});

// Clean up after tests
afterAll(() => {
  // Reset env
  delete process.env.GROK_API_KEY;
});

// Helper to run grok CLI and capture output
async function runGrokCli(args: string[], input?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const proc = execa('node', [GROK_BINARY, ...args], {
    all: true,
    stdin: input ? 'pipe' : 'inherit',
    timeout: 10000, // 10s timeout for tests
  });

  if (input) {
    proc.stdin?.write(input);
    proc.stdin?.end();
  }

  const { all, exitCode } = await proc;
  const output = all || '';
  const stdout = output;
  const stderr = ''; // For simplicity, since all captures everything; in real use split if needed

  return { stdout, stderr, exitCode };
};

// Test basic -p mode with text output
test('Basic -p mode outputs text response', async () => {
  const { stdout, exitCode } = await runGrokCli(['-p', 'Hello, Grok!']);
  expect(exitCode).toBe(0);
  expect(stdout.trim()).toContain('Hello'); // Should respond with something containing the prompt or AI response
  expect(stdout.trim().length).toBeGreaterThan(10); // Non-empty response
});

// Test --model flag with -p
test('-p with --model uses specified Grok model', async () => {
  const { stderr, exitCode } = await runGrokCli(['-p', 'Test model', '--model', 'grok-code-fast-1']);
  expect(exitCode).toBe(0);
  expect(stderr).toContain('Using model: grok-code-fast-1'); // Verbose would show, but since no --verbose, assume it works without error
});

// Test --output-format json with -p
test('-p with --output-format json outputs JSON', async () => {
  const { stdout, exitCode } = await runGrokCli(['-p', 'JSON test', '--output-format', 'json']);
  expect(exitCode).toBe(0);
  expect(stdout.trim()).toMatch(/^{/); // Starts with JSON object
  expect(JSON.parse(stdout.trim())).toHaveProperty('messages'); // Has expected structure
});

// Test --output-format stream-json with -p (direct client, no agent)
test('-p with --output-format stream-json streams JSON lines', async () => {
  const { stdout, exitCode } = await runGrokCli(['-p', 'Stream test', '--output-format', 'stream-json']);
  expect(exitCode).toBe(0);
  const lines = stdout.trim().split('\n').filter(l => l.trim());
  expect(lines.length).toBeGreaterThan(0);
  expect(lines[0]).toMatch(/^{/); // First line is JSON
  // Additional lines should be JSON chunks
  lines.forEach(line => {
    if (line.trim()) {
      expect(() => JSON.parse(line)).not.toThrow();
    }
  });
});

// Test --verbose with -p logs to stderr
test('-p with --verbose logs model and prompt to stderr', async () => {
  const { stderr, exitCode } = await runGrokCli(['-p', 'Verbose test', '--verbose']);
  expect(exitCode).toBe(0);
  expect(stderr).toContain('Using model:');
  expect(stderr).toContain('Query:');
  expect(stderr).toContain('Processing prompt with model:');
});

// Test invalid model exits with error
test('-p with invalid --model exits with error', async () => {
  const { stderr, exitCode } = await runGrokCli(['-p', 'Test', '--model', 'invalid-model']);
  expect(exitCode).toBe(1);
  expect(stderr).toContain('Invalid model: invalid-model');
});

// Test stdin with -p combines with prompt
test('-p with stdin input combines with prompt', async () => {
  const input = 'This is stdin content\n';
  const { stdout, exitCode } = await runGrokCli(['-p', 'Combine with stdin'], input);
  expect(exitCode).toBe(0);
  expect(stdout).toContain('stdin content'); // Response should reference combined input
});

// Test --append-system-prompt with -p
test('-p with --append-system-prompt adds to system message', async () => {
  const { stderr, exitCode } = await runGrokCli(['-p', 'Test system prompt', '--append-system-prompt', 'You are helpful.']);
  expect(exitCode).toBe(0);
  if (stderr) {
    expect(stderr).toContain('Appended system prompt: You are helpful.');
  }
  // Response should reflect system prompt influence, but hard to test exactly
});

// Test --max-turns limits agent turns (agent mode)
test('-p with --max-turns limits turns (verbose for logging)', async () => {
  const { stderr, exitCode } = await runGrokCli(['-p', 'Complex task that might use tools', '--max-turns', '1', '--verbose']);
  expect(exitCode).toBe(0);
  expect(stderr).toContain('Max turns limited to 1');
});

// Test --dangerously-skip-permissions skips confirmations
test('-p with --dangerously-skip-permissions skips perms', async () => {
  // Test a prompt that would normally trigger confirmation, but since dummy key, assume it works without perm errors
  const { exitCode } = await runGrokCli(['-p', 'Edit a file', '--dangerously-skip-permissions']);
  expect(exitCode).toBe(0); // Should not error on perms
});

// Test positional args as prompt without -p
test('Positional args treated as -p prompt', async () => {
  const { stdout, exitCode } = await runGrokCli(['Hello world']);
  expect(exitCode).toBe(0);
  expect(stdout.trim().length).toBeGreaterThan(0); // Treats as prompt
});

// Test invalid --output-format exits or warns
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
  expect(stdout.trim().length).toBeGreaterThan(0);
});

// Test interactive mode without -p (no flags that trigger headless)
test('Interactive mode without -p launches UI', async () => {
  // Hard to test UI launch in unit test, but check no error and no immediate exit
  const { exitCode } = await runGrokCli([], ''); // Empty args for interactive
  // Interactive would hang waiting for input, but with timeout it should not error immediately
  expect(exitCode).toBe(1); // Timeout expected, but no crash
  // Note: Full UI test would require mocking ink/render
});
