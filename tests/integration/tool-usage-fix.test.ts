import { execa } from 'execa';
import { expect, test, describe, beforeAll, afterAll, mock } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';

// Mock GrokClient to avoid real API calls
mock.module('../src/grok/client.ts', () => ({
  GrokClient: class MockGrokClient {
    async chat(messages: any[], tools?: any[], model?: string) {
      // Mock tool calls for testing
      const mockResponse = {
        choices: [{
          message: {
            role: 'assistant',
            content: 'Mock response with tool usage',
            tool_calls: [
              {
                id: 'mock-tool-call-1',
                type: 'function',
                function: {
                  name: 'view_file',
                  arguments: '{"filePath":"package.json"}',
                },
              },
            ],
          },
          finish_reason: 'tool_calls',
        }],
      };
      return mockResponse;
    }

    async *chatStream(messages: any[], tools?: any[], model?: string) {
      yield {
        choices: [{
          delta: {
            tool_calls: [
              {
                id: 'mock-tool-call-1',
                function: {
                  name: 'search',
                  arguments: '{"query":"test"}',
                },
              },
            ],
          },
        }],
      };
    }

    setModel(model: string) {}
    getCurrentModel() { return 'mock-model'; }
    async search(query: string) {
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: `Mock search result for: ${query}`,
          },
          finish_reason: 'stop',
        }],
      };
    }
  },
}));

// Test API key - use dummy or env
const TEST_API_KEY = process.env.GROK_API_KEY || 'dummy-key-for-testing';

// Helper to run grok CLI
async function runGrokCli(args: string[], input?: string): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const proc = execa('bun', ['src/index.ts', ...args], {
      stdout: 'pipe',
      stderr: 'pipe',
      stdin: input ? 'pipe' : 'inherit',
      env: { ...process.env, GROK_API_KEY: TEST_API_KEY },
      timeout: 30000, // 30s timeout for tool usage
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

// Skip tests if no real API key
const hasApiKey = TEST_API_KEY && TEST_API_KEY !== 'dummy-key-for-testing';

const describeToolTests = hasApiKey ? describe : describe.skip;
describeToolTests('Tool Usage Fixes - Headless Mode', () => {
  describe('JSON Output Format', () => {
    test('uses tools in headless mode with --output-format json', async () => {
      // Prompt that should trigger tool usage (view_file)
      const prompt = 'Please read the contents of package.json file';
      const { stdout, exitCode } = await runGrokCli(['-p', prompt, '--output-format', 'json']);

      expect(exitCode).toBe(0);

      // Parse JSON output
      const output = JSON.parse(stdout);
      expect(output.messages).toBeDefined();

      // Check if any message has tool_calls
      const hasToolCalls = output.messages.some((msg: any) => msg.tool_calls && msg.tool_calls.length > 0);
      expect(hasToolCalls).toBe(true);
    });

    test('includes tool results in JSON output', async () => {
      const prompt = 'Run "echo hello world" command';
      const { stdout, exitCode } = await runGrokCli(['-p', prompt, '--output-format', 'json']);

      expect(exitCode).toBe(0);

      const output = JSON.parse(stdout);
      const toolResults = output.messages.filter((msg: any) => msg.role === 'tool');
      expect(toolResults.length).toBeGreaterThan(0);
    });
  });

  describe('Stream-JSON Output Format', () => {
    test('uses tools in headless mode with --output-format stream-json', async () => {
      const prompt = 'List files in the current directory';
      const { stdout, exitCode } = await runGrokCli(['-p', prompt, '--output-format', 'stream-json']);

      expect(exitCode).toBe(0);

      // Parse stream-json (each line is JSON)
      const lines = stdout.trim().split('\n');
      const chunks = lines.map(line => JSON.parse(line));

      // Check for tool calls in chunks
      const hasToolCalls = chunks.some((chunk: any) => chunk.choices?.[0]?.delta?.tool_calls);
      expect(hasToolCalls).toBe(true);
    });
  });

  describe('Complex Tasks - Multiple Turns', () => {
    test('handles complex multi-turn tasks without artificial limits', async () => {
      // A complex prompt that might require multiple interactions
      const prompt = `Create a simple Node.js script that:
1. Reads a file called test.txt
2. Counts the number of lines
3. Writes the count to output.txt
4. Lists the directory to confirm files exist`;

      const { stdout, exitCode } = await runGrokCli(['-p', prompt, '--output-format', 'json', '--max-tool-rounds', '10']);

      expect(exitCode).toBe(0);

      const output = JSON.parse(stdout);
      // Should have multiple tool calls
      const assistantMessages = output.messages.filter((msg: any) => msg.role === 'assistant');
      const totalToolCalls = assistantMessages.reduce((count: number, msg: any) =>
        count + (msg.tool_calls ? msg.tool_calls.length : 0), 0);

      expect(totalToolCalls).toBeGreaterThan(2); // At least a few tool calls for the task
    });
  });

  describe('Tool Availability Verification', () => {
    test('verifies search tool is available in headless mode', async () => {
      const prompt = 'Search for the word "function" in .ts files';
      const { stdout, exitCode } = await runGrokCli(['-p', prompt, '--output-format', 'json']);

      expect(exitCode).toBe(0);

      const output = JSON.parse(stdout);
      const hasSearchToolCall = output.messages.some((msg: any) =>
        msg.tool_calls?.some((tool: any) => tool.function.name === 'search')
      );
      expect(hasSearchToolCall).toBe(true);
    });

    test('verifies file editing tools are available', async () => {
      const prompt = 'Create a new file called temp-test.txt with content "test"';
      const { stdout, exitCode } = await runGrokCli(['-p', prompt, '--output-format', 'json']);

      expect(exitCode).toBe(0);

      const output = JSON.parse(stdout);
      const hasFileToolCall = output.messages.some((msg: any) =>
        msg.tool_calls?.some((tool: any) => tool.function.name === 'create_file')
      );
      expect(hasFileToolCall).toBe(true);

      // Cleanup
      try {
        fs.unlinkSync('temp-test.txt');
      } catch (e) {
        // Ignore
      }
    });
  });
});
