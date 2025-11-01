import { execa } from 'execa';
import { expect, test, describe, beforeAll } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs';

// Build the project before tests
beforeAll(async () => {
  try {
    await execa('bun', ['run', 'build']);
  } catch (error) {
    console.warn('Build failed, tests may not run properly');
  }
});

// Test binary path
const GROK_BINARY = path.join(process.cwd(), 'dist', 'grok.js');

// Helper to run grok CLI and capture output
async function runGrokCli(args: string[], input?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const proc = execa('bun', [GROK_BINARY, ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: input ? 'pipe' : 'inherit',
      timeout: 10000, // 10s timeout
    });

    if (input) {
      proc.stdin?.write(input);
      proc.stdin?.end();
    }

    const { stdout, stderr, exitCode } = await proc;
    return {
      stdout: stdout ? stdout.toString() : '',
      stderr: stderr ? stderr.toString() : '',
      exitCode
    };
  } catch (error: any) {
    return { stdout: '', stderr: error.message || 'Unknown error', exitCode: 1 };
  }
}

describe('CLI Commands - No API Key Required', () => {
  test('shows help with --help', async () => {
    const { stdout, exitCode } = await runGrokCli(['--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('grok [options] [message...]');
    expect(stdout).toContain('--api-key');
    expect(stdout).toContain('--model');
    expect(stdout).toContain('--prompt');
  });

  test('shows version with --version', async () => {
    const { stdout, exitCode } = await runGrokCli(['--version']);
    expect(exitCode).toBe(0);
    // Version should be from package.json
    expect(stdout.trim()).toMatch(/\d+\.\d+\.\d+/);
  });

  test('errors without API key in interactive mode', async () => {
    const { stderr, exitCode } = await runGrokCli([]);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('API key required');
  });

  test('errors without API key in prompt mode', async () => {
    const { stderr, exitCode } = await runGrokCli(['-p', 'test']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('API key required');
  });

  test('accepts API key via --api-key flag', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy-key', '--help']);
    expect(exitCode).toBe(0);
    // Should show help without API key error
  });

  test('validates model names', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '-m', 'invalid-model', '-p', 'test']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Invalid model');
  });

  test('accepts valid model names', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '-m', 'grok-code-fast-1', '--help']);
    expect(exitCode).toBe(0);
  });

  test('parses --directory flag', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '-d', '/tmp', '--help']);
    expect(exitCode).toBe(0);
  });

  test('parses --base-url flag', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '-u', 'https://test.com', '--help']);
    expect(exitCode).toBe(0);
  });

  test('parses --append-system-prompt flag', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '-s', 'Test prompt', '--help']);
    expect(exitCode).toBe(0);
  });

  test('parses --max-tool-rounds flag', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '--max-tool-rounds', '100', '--help']);
    expect(exitCode).toBe(0);
  });

  test('parses --max-turns flag', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '--max-turns', '50', '--help']);
    expect(exitCode).toBe(0);
  });

  test('parses --output-format flag', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '--output-format', 'json', '--help']);
    expect(exitCode).toBe(0);
  });

  test('parses --output-file flag', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '--output-file', 'test.txt', '--help']);
    expect(exitCode).toBe(0);
  });

  test('parses --verbose flag', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '--verbose', '--help']);
    expect(exitCode).toBe(0);
  });

  test('parses --dangerously-skip-permissions flag', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '--dangerously-skip-permissions', '--help']);
    expect(exitCode).toBe(0);
  });

  test('errors on invalid --output-format', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '--output-format', 'invalid', '-p', 'test']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('Invalid output-format');
  });

  test('accepts valid output formats', async () => {
    const formats = ['text', 'json', 'jsonl', 'stream-json'];
    for (const format of formats) {
      const { exitCode } = await runGrokCli(['-k', 'dummy', '--output-format', format, '--help']);
      expect(exitCode).toBe(0);
    }
  });

  test('shows error for -p without prompt', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', '-p']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('No prompt provided for print mode');
  });

  test('accepts positional arguments', async () => {
    const { stderr, exitCode } = await runGrokCli(['-k', 'dummy', 'test', 'message', '--help']);
    expect(exitCode).toBe(0);
  });
});

describe('Git Subcommand', () => {
  test('git subcommand exists', async () => {
    const { stdout, exitCode } = await runGrokCli(['git', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('commit-and-push');
  });

  test('git commit-and-push has required options', async () => {
    const { stdout, exitCode } = await runGrokCli(['git', 'commit-and-push', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('--directory');
    expect(stdout).toContain('--api-key');
    expect(stdout).toContain('--model');
    expect(stdout).toContain('--max-tool-rounds');
  });

  test('git commit-and-push errors without API key', async () => {
    const { stderr, exitCode } = await runGrokCli(['git', 'commit-and-push']);
    expect(exitCode).toBe(1);
    expect(stderr).toContain('API key required');
  });
});

describe('Telemetry Subcommand', () => {
  test('telemetry subcommand exists', async () => {
    const { stdout, exitCode } = await runGrokCli(['telemetry', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('enable');
    expect(stdout).toContain('disable');
  });

  test('telemetry enable works', async () => {
    const { stdout, exitCode } = await runGrokCli(['telemetry', 'enable']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Telemetry enabled');
  });

  test('telemetry disable works', async () => {
    const { stdout, exitCode } = await runGrokCli(['telemetry', 'disable']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('Telemetry disabled');
  });
});

describe('MCP Subcommand', () => {
  test('mcp subcommand exists', async () => {
    const { stdout, exitCode } = await runGrokCli(['mcp', '--help']);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('add');
    expect(stdout).toContain('list');
    expect(stdout).toContain('test');
    expect(stdout).toContain('remove');
  });

  test('mcp list works', async () => {
    const { exitCode } = await runGrokCli(['mcp', 'list']);
    expect(exitCode).toBe(0);
  });
});