import { execa } from 'execa';
import { expect, test, describe, beforeAll } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs';

// Assume grok-development is node src/index.ts for dev mode
const GROK_DEV_BINARY = 'bun';
const DEV_ARGS = ['src/index.ts'];

// Build or assume src is runnable
beforeAll(() => {
  // No build needed for src
});

// Helper
async function runGrokDev(args: string[], input?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  const fullArgs = [...DEV_ARGS, ...args];
  const proc = execa(GROK_DEV_BINARY, fullArgs, {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: input ? 'pipe' : 'inherit',
    env: process.env,
  });

  if (input) {
    proc.stdin?.write(input);
    proc.stdin?.end();
  }

  try {
    const { stdout, stderr, exitCode } = await proc;
    return { 
      stdout: stdout ? stdout.toString().trim() : '', 
      stderr: stderr ? stderr.toString().trim() : '', 
      exitCode 
    };
  } catch (error: any) {
    return { stdout: '', stderr: error.message || 'Unknown error', exitCode: 1 };
  }
}

// Tests for -p in dev mode
describe('grok-development -p mode', () => {
  test('Basic -p outputs response', async () => {
    const { stdout, exitCode } = await runGrokDev(['-p', 'Hello from dev!']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Grok'); // Assumes response mentions Grok
  });

  test('-p with --verbose logs to stderr', async () => {
    const { stderr, exitCode } = await runGrokDev(['-p', 'Verbose dev', '--verbose']);
    expect(exitCode).toBe(0);
    expect(stderr).toContain('Processing');
  });

  test('-p with --model uses model', async () => {
    const { stderr, exitCode } = await runGrokDev(['-p', 'Model test', '--model', 'grok-code-fast-1']);
    expect(exitCode).toBe(0);
    expect(stderr).not.toContain('Invalid model');
  });

  // Add more as needed
});
