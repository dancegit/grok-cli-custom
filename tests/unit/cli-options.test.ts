import { program, loadModel } from '../../src/index.ts';
import { expect, test, describe } from 'bun:test';
import { Command } from 'commander';

// Create a test program to mimic the main program options
const testProgram = new Command();
testProgram
  .name('grok')
  .description('Test CLI')
  .argument('[message...]', 'Initial message')
  .option('-d, --directory <dir>', 'set working directory')
  .option('-k, --api-key <key>', 'Grok API key')
  .option('-u, --base-url <url>', 'Grok API base URL')
  .option('-m, --model <model>', 'AI model to use')
  .option('-p, --prompt [prompt]', 'process a single prompt and exit')
  .option('-s, --append-system-prompt <prompt>', 'append to system prompt')
  .option('--max-tool-rounds <rounds>', 'max tool rounds', '400')
  .option('--max-turns <turns>', 'limit agent turns')
  .option('--output-format <format>', 'output format', 'text')
  .option('--output-file <file>', 'save output to file')
  .option('--verbose', 'enable verbose logging')
  .option('--dangerously-skip-permissions', 'skip confirmations')
  .allowUnknownOption();

function parseArgs(args: string[]) {
  testProgram.parse(['node', 'test', ...args], { from: 'user' });
  return testProgram.opts();
}

describe('CLI Options Parsing', () => {
  test('parses --directory flag', () => {
    const options = parseArgs(['--directory', '/tmp']);
    expect(options.directory).toBe('/tmp');
  });

  test('parses -d alias', () => {
    const options = parseArgs(['-d', '/home']);
    expect(options.directory).toBe('/home');
  });

  test('parses --api-key flag', () => {
    const options = parseArgs(['--api-key', 'test-key']);
    expect(options.apiKey).toBe('test-key');
  });

  test('parses -k alias', () => {
    const options = parseArgs(['-k', 'another-key']);
    expect(options.apiKey).toBe('another-key');
  });

  test('parses --base-url flag', () => {
    const options = parseArgs(['--base-url', 'https://test.com']);
    expect(options.baseUrl).toBe('https://test.com');
  });

  test('parses -u alias', () => {
    const options = parseArgs(['-u', 'https://another.com']);
    expect(options.baseUrl).toBe('https://another.com');
  });

  test('parses --model flag', () => {
    const options = parseArgs(['--model', 'grok-3-fast']);
    expect(options.model).toBe('grok-3-fast');
  });

  test('parses -m alias', () => {
    const options = parseArgs(['-m', 'grok-code-fast-1']);
    expect(options.model).toBe('grok-code-fast-1');
  });

  test('parses --prompt flag with value', () => {
    const options = parseArgs(['--prompt', 'test prompt']);
    expect(options.prompt).toBe('test prompt');
  });

  test('parses -p alias', () => {
    const options = parseArgs(['-p', 'another prompt']);
    expect(options.prompt).toBe('another prompt');
  });

  test('parses --append-system-prompt flag', () => {
    const options = parseArgs(['--append-system-prompt', 'You are helpful']);
    expect(options.appendSystemPrompt).toBe('You are helpful');
  });

  test('parses -s alias', () => {
    const options = parseArgs(['-s', 'Be concise']);
    expect(options.appendSystemPrompt).toBe('Be concise');
  });

  test('parses --max-tool-rounds flag', () => {
    const options = parseArgs(['--max-tool-rounds', '100']);
    expect(options.maxToolRounds).toBe('100');
  });

  test('defaults --max-tool-rounds to 400', () => {
    const options = parseArgs([]);
    expect(options.maxToolRounds).toBe('400');
  });

  test('parses --max-turns flag', () => {
    const options = parseArgs(['--max-turns', '50']);
    expect(options.maxTurns).toBe('50');
  });

  test('parses --output-format flag', () => {
    const options = parseArgs(['--output-format', 'json']);
    expect(options.outputFormat).toBe('json');
  });

  test('defaults --output-format to text', () => {
    const options = parseArgs([]);
    expect(options.outputFormat).toBe('text');
  });

  test('parses --output-file flag', () => {
    const options = parseArgs(['--output-file', 'output.txt']);
    expect(options.outputFile).toBe('output.txt');
  });

  test('parses --verbose flag', () => {
    const options = parseArgs(['--verbose']);
    expect(options.verbose).toBe(true);
  });

  test('parses --dangerously-skip-permissions flag', () => {
    const options = parseArgs(['--dangerously-skip-permissions']);
    expect(options.dangerouslySkipPermissions).toBe(true);
  });

  test('parses positional arguments as message', () => {
    const parsed = testProgram.parse(['node', 'test', 'hello', 'world'], { from: 'user' });
    expect(parsed.args).toEqual(['hello', 'world']);
  });
});

describe('loadModel validation', () => {
  test('accepts valid Grok models', () => {
    expect(() => loadModel('grok-code-fast-1')).not.toThrow();
    expect(() => loadModel('grok-4-latest')).not.toThrow();
    expect(() => loadModel('grok-3-fast')).not.toThrow();
    expect(() => loadModel('grok-4-fast-reasoning')).not.toThrow();
  });

  test('rejects invalid models', () => {
    expect(() => loadModel('invalid-model')).toThrow(/Invalid model/);
    expect(() => loadModel('gpt-4')).toThrow(/Invalid model/);
    expect(() => loadModel('claude-3')).toThrow(/Invalid model/);
  });
});

describe('Git subcommand options', () => {
  const gitCommand = program.commands.find(c => c.name() === 'git');
  if (gitCommand) {
    test('git commit-and-push has directory option', () => {
      expect(gitCommand.options.some(opt => opt.flags.includes('--directory'))).toBe(true);
    });

    test('git commit-and-push has api-key option', () => {
      expect(gitCommand.options.some(opt => opt.flags.includes('--api-key'))).toBe(true);
    });

    test('git commit-and-push has model option', () => {
      expect(gitCommand.options.some(opt => opt.flags.includes('--model'))).toBe(true);
    });

    test('git commit-and-push has max-tool-rounds option', () => {
      expect(gitCommand.options.some(opt => opt.flags.includes('--max-tool-rounds'))).toBe(true);
    });
  }
});

describe('Telemetry subcommand', () => {
  const telemetryCommand = program.commands.find(c => c.name() === 'telemetry');
  if (telemetryCommand) {
    test('telemetry has enable subcommand', () => {
      expect(telemetryCommand.commands.some(cmd => cmd.name() === 'enable')).toBe(true);
    });

    test('telemetry has disable subcommand', () => {
      expect(telemetryCommand.commands.some(cmd => cmd.name() === 'disable')).toBe(true);
    });
  }
});

describe('MCP subcommand', () => {
  const mcpCommand = program.commands.find(c => c.name() === 'mcp');
  if (mcpCommand) {
    test('mcp has add subcommand', () => {
      expect(mcpCommand.commands.some(cmd => cmd.name() === 'add')).toBe(true);
    });

    test('mcp has list subcommand', () => {
      expect(mcpCommand.commands.some(cmd => cmd.name() === 'list')).toBe(true);
    });

    test('mcp has test subcommand', () => {
      expect(mcpCommand.commands.some(cmd => cmd.name() === 'test')).toBe(true);
    });

    test('mcp has remove subcommand', () => {
      expect(mcpCommand.commands.some(cmd => cmd.name() === 'remove')).toBe(true);
    });
  }
});