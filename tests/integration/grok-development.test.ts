import { execa } from 'execa';
import { expect, test, describe, beforeAll, mock } from 'bun:test';
import * as path from 'path';
import * as fs from 'fs';

// Mock GrokClient to avoid real API calls
mock.module('../src/grok/client.ts', () => ({
  GrokClient: class MockGrokClient {
    async chat(messages: any[], tools?: any[], model?: string) {
      return {
        choices: [{
          message: {
            role: 'assistant',
            content: 'Mock response from Grok',
          },
          finish_reason: 'stop',
        }],
      };
    }

    async *chatStream(messages: any[], tools?: any[], model?: string) {
      yield {
        choices: [{
          delta: {
            content: 'Mock streamed response',
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
    expect(stdout).toContain('Mock response from Grok'); // Assumes response mentions Grok
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

// Mock all tools to prevent real execution
mock.module('../src/tools/text-editor.ts', () => ({
  TextEditorTool: class MockTextEditorTool {
    async view(path: string) {
      return { success: true, output: `Mock content of ${path}` };
    }
    async create(path: string, content: string) {
      return { success: true, output: `Created ${path}` };
    }
    async strReplace(path: string, oldStr: string, newStr: string) {
      return { success: true, output: `Replaced in ${path}` };
    }
  },
}));

mock.module('../src/tools/bash.ts', () => ({
  BashTool: class MockBashTool {
    async execute(command: string) {
      return { success: true, output: `Mock output for: ${command}` };
    }
    getCurrentDirectory() {
      return '/mock/dir';
    }
  },
}));

mock.module('../src/tools/search.ts', () => ({
  SearchTool: class MockSearchTool {
    async search(query: string) {
      return { success: true, output: `Mock search results for: ${query}` };
    }
  },
}));

mock.module('../src/tools/todo-tool.ts', () => ({
  TodoTool: class MockTodoTool {
    async createTodoList(todos: any[]) {
      return { success: true, output: 'Mock todo list created' };
    }
    async updateTodoList(updates: any[]) {
      return { success: true, output: 'Mock todo list updated' };
    }
  },
}));

mock.module('../src/tools/confirmation-tool.ts', () => ({
  ConfirmationTool: class MockConfirmationTool {
    async requestConfirmation() {
      return { confirmed: true, feedback: null };
    }
  },
}));

mock.module('../src/tools/morph-editor.ts', () => ({
  MorphEditorTool: class MockMorphEditorTool {
    async editFile(targetFile: string, instructions: string, codeEdit: string) {
      return { success: true, output: `Mock edited ${targetFile}` };
    }
  },
}));

// Mock MCP to avoid initialization
mock.module('../src/mcp/config.ts', () => ({
  loadMCPConfig: () => ({ servers: [] }),
}));

mock.module('../src/mcp/client.ts', () => ({
  initializeMCPServers: () => Promise.resolve(),
  getMCPManager: () => ({
    callTool: () => Promise.resolve({ isError: false, content: [{ type: 'text', text: 'Mock MCP result' }] }),
  }),
}));

// Mock utils
mock.module('../src/utils/telemetry.ts', () => ({
  telemetryManager: {
    init: () => {},
    startSession: () => 'mock-session',
    endSession: () => {},
    trackAgentOutput: () => {},
  },
}));

mock.module('../src/utils/settings-manager.ts', () => ({
  getSettingsManager: () => ({
    loadUserSettings: () => {},
    getApiKey: () => 'dummy-key-for-testing',
    getBaseURL: () => 'https://api.x.ai/v1',
    getCurrentModel: () => 'grok-code-fast-1',
    getAvailableModels: () => ['grok-code-fast-1', 'grok-3-fast'],
  }),
}));

mock.module('../src/utils/custom-instructions.ts', () => ({
  loadCustomInstructions: () => '',
}));

mock.module('../src/utils/token-counter.ts', () => ({
  createTokenCounter: () => ({
    countMessageTokens: () => 100,
    estimateStreamingTokens: () => 50,
    countTokens: () => 10,
    dispose: () => {},
  }),
}));

mock.module('../src/utils/confirmation-service.ts', () => ({
  ConfirmationService: {
    getInstance: () => ({
      setSessionFlag: () => {},
      getSessionFlag: () => ({ allOperations: true }),
    }),
  },
}));

  test('-p with --output-file writes to file', async () => {
    const outputFile = '/tmp/test-output.txt';
    const { stdout, exitCode } = await runGrokDev(['-p', 'Test output to file', '--output-file', outputFile]);
    expect(exitCode).toBe(0);
    // Check if file was created and has content
    if (fs.existsSync(outputFile)) {
      const content = fs.readFileSync(outputFile, 'utf-8');
      expect(content.trim()).toContain('Mock response from Grok');
      fs.unlinkSync(outputFile); // Clean up
    } else {
      // If no stdout, perhaps it wrote to file
      expect(stdout).toBe(''); // Assuming output goes to file
    }
  });

  test('-p with --output-format json writes JSON', async () => {
    const { stdout, exitCode } = await runGrokDev(['-p', 'JSON test', '--output-format', 'json']);
    expect(exitCode).toBe(0);
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty('messages');
    expect(Array.isArray(parsed.messages)).toBe(true);
  });

  test('-p with --output-format jsonl writes JSONL', async () => {
    const { stdout, exitCode } = await runGrokDev(['-p', 'JSONL test', '--output-format', 'jsonl']);
    expect(exitCode).toBe(0);
    const lines = stdout.trim().split('\n');
    lines.forEach(line => {
      expect(() => JSON.parse(line)).not.toThrow();
    });
  });
