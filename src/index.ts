#!/usr/bin/env node
// Force Bun to bundle yoga.wasm
//
import "yoga-wasm-web/dist/yoga.wasm";
import React from "react";
import { render } from "ink";
import { program } from "commander";
import * as dotenv from "dotenv";
import { GrokAgent } from "./agent/grok-agent.js";
import ChatInterface from "./ui/components/chat-interface.js";
import { getSettingsManager } from "./utils/settings-manager";
import { ConfirmationService } from "./utils/confirmation-service.js";
import { preprocessPrompt } from "./utils/slash-commands.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import * as fs from "fs";
import { GrokClient } from "./grok/client.js";
import { createMCPCommand } from "./commands/mcp.js";

import { telemetryManager } from "./utils/telemetry.js";

const packageJson = require('../package.json');

// Load environment variables
dotenv.config();

// Disable default SIGINT handling to let Ink handle Ctrl+C
process.on("SIGTERM", () => {
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    try {
      process.stdin.setRawMode(false);
    } catch (e) {
      // Ignore
    }
  }
  console.log("\nGracefully shutting down...");
  process.exit(0);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Ensure user settings are initialized
function ensureUserSettingsDirectory(): void {
  try {
    const manager = getSettingsManager();
    manager.loadUserSettings();
  } catch (error) {
    // Ignore
  }
}

// Load API key from user settings if not in environment
function loadApiKey(): string | undefined {
  const manager = getSettingsManager();
  return manager.getApiKey();
}

// Load base URL from user settings
function loadBaseURL(): string {
  const manager = getSettingsManager();
  return manager.getBaseURL();
}

// Save command line settings
async function saveCommandLineSettings(
  apiKey?: string,
  baseURL?: string
): Promise<void> {
  try {
    const manager = getSettingsManager();
    if (apiKey) {
      manager.updateUserSetting("apiKey", apiKey);
      console.log("API key saved to ~/.grok/user-settings.json");
    }
    if (baseURL) {
      manager.updateUserSetting("baseURL", baseURL);
      console.log("Base URL saved to ~/.grok/user-settings.json");
    }
  } catch (error) {
    console.warn("Could not save settings to file:", error instanceof Error ? error.message : "Unknown error");
  }
}

// Load model
function loadModel(modelFromArg?: string): string | undefined {
  let model = process.env.GROK_MODEL || modelFromArg;

  if (!model) {
    try {
      const manager = getSettingsManager();
      model = manager.getCurrentModel();
    } catch (error) {
      // Ignore
    }
  }

  if (model) {
    const manager = getSettingsManager();
    const validModels = manager.getAvailableModels();
    if (
      !validModels.includes(model) &&
      !model.startsWith('grok-') &&
      model !== 'grok-code-fast-1' &&
      model !== 'grok-4-fast-reasoning'
    ) {
      throw new Error(`Invalid model: ${model}. Valid models: ${validModels.join(', ')}.`);
    }
  }

  return model;
}

// Read stdin
function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (process.stdin.isTTY) {
      resolve('');
      return;
    }

    let data = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', (chunk) => {
      data += chunk;
    });
    process.stdin.on('end', () => {
      resolve(data.trim());
    });
    process.stdin.on('error', reject);
  });
}

// Headless commit-and-push
async function handleCommitAndPushHeadless(
  apiKey: string,
  baseURL?: string,
  model?: string,
  maxToolRounds?: number
): Promise<void> {
  try {
    const agent = new GrokAgent(apiKey, baseURL, model, maxToolRounds);
    const confirmationService = ConfirmationService.getInstance();
    confirmationService.setSessionFlag("allOperations", true);

    console.log("Processing commit and push...\n");
    console.log("> /commit-and-push\n");

    const initialStatusResult = await agent.executeBashCommand("git status --porcelain");
    if (!initialStatusResult.success || !initialStatusResult.output?.trim()) {
      console.log("No changes to commit. Working directory is clean.");
      process.exit(1);
    }

    console.log("git status: Changes detected");

    const addResult = await agent.executeBashCommand("git add .");
    if (!addResult.success) {
      console.log(`git add: ${addResult.error || "Failed to stage changes"}`);
      process.exit(1);
    }
    console.log("git add: Changes staged");

    const diffResult = await agent.executeBashCommand("git diff --cached");

    const commitPrompt = `Generate a concise, professional git commit message for these changes:

Git Status:
${initialStatusResult.output}

Git Diff (staged changes):
${diffResult.output || "No staged changes shown"}

Follow conventional commit format (feat:, fix:, docs:, etc.) and keep it under 72 characters.
Respond with ONLY the commit message, no additional text.`;

    console.log("Generating commit message...");
    const commitMessageEntries = await agent.processUserMessage(commitPrompt);
    let commitMessage = "";

    for (const entry of commitMessageEntries) {
      if (entry.type === "assistant" && entry.content.trim()) {
        commitMessage = entry.content.trim();
        break;
      }
    }

    if (!commitMessage) {
      console.log("Failed to generate commit message");
      process.exit(1);
    }

    const cleanCommitMessage = commitMessage.replace(/^["']|["']$/g, "");
    console.log(`Generated commit message: "${cleanCommitMessage}"`);

    const commitCommand = `git commit -m "${cleanCommitMessage}"`;
    const commitResult = await agent.executeBashCommand(commitCommand);

    if (commitResult.success) {
      console.log(`git commit: ${commitResult.output?.split("\n")[0] || "Commit successful"}`);

      let pushResult = await agent.executeBashCommand("git push");
      if (!pushResult.success && pushResult.error?.includes("no upstream branch")) {
        console.log("Setting upstream and pushing...");
        pushResult = await agent.executeBashCommand("git push -u origin HEAD");
      }

      if (pushResult.success) {
        console.log(`git push: ${pushResult.output?.split("\n")[0] || "Push successful"}`);
      } else {
        console.log(`git push: ${pushResult.error || "Push failed"}`);
        process.exit(1);
      }
    } else {
      console.log(`git commit: ${commitResult.error || "Commit failed"}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error("Error during commit and push:", error.message);
    process.exit(1);
  }
}

// Headless prompt processing
async function processPromptHeadless(
  prompt: string,
  apiKey: string,
  baseURL?: string,
  model?: string,
  maxToolRounds?: number,
  outputFormat: string = "text",
  outputFile?: string,
  verbose: boolean = false,
  appendSystemPrompt?: string,
  maxTurns?: number,
  useAgent: boolean = true,
  dangerouslySkipPermissions: boolean = false
): Promise<void> {
  try {
    const validFormats = ["text", "json", "stream-json", "jsonl"];
    if (outputFormat && !validFormats.includes(outputFormat)) {
      throw new Error(`Invalid output-format: ${outputFormat}. Supported: ${validFormats.join(", ")}`);
    }

    if (verbose) {
      console.error(`Processing prompt with model: ${model || "default"}`);
      console.error(`Prompt: ${prompt}`);
    }

    let client: GrokClient;
    let processedPrompt = preprocessPrompt(prompt);
    let messages: ChatCompletionMessageParam[] = [{ role: "user", content: processedPrompt }];

    if (appendSystemPrompt) {
      messages.unshift({ role: "system", content: appendSystemPrompt });
    }

    if (useAgent) {
      const agent = new GrokAgent(apiKey, baseURL, model, maxToolRounds, maxTurns);
      const confirmationService = ConfirmationService.getInstance();
      confirmationService.setSessionFlag("allOperations", dangerouslySkipPermissions);

      if (verbose) console.error("Processing with agent...");

      const chatEntries = await agent.processUserMessage(processedPrompt);
      messages = [];

      for (const entry of chatEntries) {
        switch (entry.type) {
          case "user":
            messages.push({ role: "user", content: entry.content });
            break;
          case "assistant":
            const assistantMessage: ChatCompletionMessageParam = {
              role: "assistant",
              content: entry.content,
            };
            if (entry.toolCalls && entry.toolCalls.length > 0) {
              assistantMessage.tool_calls = entry.toolCalls.map((toolCall) => ({
                id: toolCall.id,
                type: "function",
                function: {
                  name: toolCall.function.name,
                  arguments: toolCall.function.arguments,
                },
              }));
            }
            messages.push(assistantMessage);
            break;
          case "tool_result":
            if (entry.toolCall) {
              messages.push({
                role: "tool",
                tool_call_id: entry.toolCall.id,
                content: entry.content,
              });
            }
            break;
        }
      }

      client = (agent as any)["grokClient"];
    } else {
      client = new GrokClient(apiKey, model, baseURL);
      const directResponse = await client.chat(messages);
      const assistantMsg = directResponse.choices[0]?.message;
      if (assistantMsg) {
        messages.push({
          role: "assistant",
          content: assistantMsg.content || "",
          tool_calls: assistantMsg.tool_calls || undefined,
        });
      }
    }

    // Output handling
    const outputToFileOrStdout = (data: string, append: boolean = false) => {
      if (outputFile) {
        if (append) {
          fs.appendFileSync(outputFile, data);
        } else {
          fs.writeFileSync(outputFile, data);
        }
      } else {
        process.stdout.write(data);
      }
    };

    if (outputFormat === "stream-json" && !useAgent) {
      const stream = await client.chatStream(messages, [], model);
      for await (const chunk of stream) {
        outputToFileOrStdout(JSON.stringify(chunk) + "\n", true);
      }
    } else if (outputFormat === "json") {
      const data = JSON.stringify({ messages }, null, 2) + "\n";
      outputToFileOrStdout(data);
    } else if (outputFormat === "jsonl") {
      for (const message of messages) {
        outputToFileOrStdout(JSON.stringify(message) + "\n", true);
      }
    } else {
      // text
      const lastAssistant = messages.filter(m => m.role === "assistant").pop();
      const content = lastAssistant?.content || "No response generated.";
      const data = content + "\n";
      outputToFileOrStdout(data);
    }
  } catch (error: any) {
    const errorMsg = { role: "assistant", content: `Error: ${error.message}` };
    const errorData = ["stream-json", "json", "jsonl"].includes(outputFormat)
      ? JSON.stringify(errorMsg) + "\n"
      : errorMsg.content;

    if (outputFile) {
      fs.appendFileSync(outputFile, errorData);
    } else {
      console.log(errorData);
    }

    if (verbose) {
      console.error(`Error: ${error.message}`);
    }
    process.exit(1);
  }
}

// === CLI Setup ===
program
  .name("grok")
  .description("A conversational AI CLI tool powered by Grok with text editor capabilities")
  .version(packageJson.version)
  .argument("[message...]", "Initial message to send to Grok")
  .option("-d, --directory <dir>", "set working directory", process.cwd())
  .option("-k, --api-key <key>", "Grok API key")
  .option("-u, --base-url <url>", "Grok API base URL")
  .option("-m, --model <model>", "AI model to use")
  .option("-p, --prompt [prompt]", "process a single prompt and exit")
  .option("-s, --append-system-prompt <prompt>", "append to system prompt")
  .option("--max-tool-rounds <rounds>", "max tool rounds", "400")
  .option("--max-turns <turns>", "limit agent turns")
  .option("--output-format <format>", "output format", "text")
  .option("--output-file <file>", "save output to file")
  .option("--verbose", "enable verbose logging")
  .option("--dangerously-skip-permissions", "skip confirmations")
  .action(async (message, options) => {
    if (options.directory) {
      try {
        process.chdir(options.directory);
      } catch (error: any) {
        console.error(`Error changing directory: ${error.message}`);
        process.exit(1);
      }
    }

    try {
      const apiKey = options.apiKey || loadApiKey();
      const baseURL = options.baseUrl || loadBaseURL();
      const model = loadModel(options.model);
      const maxToolRounds = parseInt(options.maxToolRounds) || 400;
      const maxTurns = options.maxTurns ? parseInt(options.maxTurns) : undefined;

      if (!apiKey) {
        console.error("API key required. Set GROK_API_KEY, use --api-key, or save to ~/.grok/user-settings.json");
        process.exit(1);
      }

      if (options.apiKey || options.baseUrl) {
        await saveCommandLineSettings(options.apiKey, options.baseUrl);
      }

      const confirmationService = ConfirmationService.getInstance();
      if (options.dangerouslySkipPermissions) {
        confirmationService.setSessionFlag("allOperations", true);
      }

      const stdinContent = await readStdin();
      let fullPrompt = '';
      let isPrintMode = false;
      let useAgent = true;

      const hasPositionalMessage = Array.isArray(message) && message.length > 0;
      const rawArgs = process.argv.slice(2);
      const hasPFlag = rawArgs.includes('-p') || rawArgs.includes('--prompt');

      if (hasPFlag && options.prompt === undefined && !stdinContent && !hasPositionalMessage) {
        console.error('No prompt provided for print mode.');
        process.exit(1);
      }

      if (options.prompt !== undefined) {
        fullPrompt = options.prompt;
        if (stdinContent) fullPrompt = stdinContent + '\n\n' + fullPrompt;
        isPrintMode = true;
      } else if (hasPositionalMessage) {
        fullPrompt = message.join(' ');
        if (stdinContent) fullPrompt = stdinContent + '\n\n' + fullPrompt;
        isPrintMode = true;
      } else if (stdinContent) {
        fullPrompt = stdinContent;
        isPrintMode = true;
      }

      if (isPrintMode && fullPrompt.trim()) {
        await processPromptHeadless(
          fullPrompt,
          apiKey,
          baseURL,
          model,
          useAgent ? maxToolRounds : 0,
          options.outputFormat,
          options.outputFile,
          options.verbose,
          options.appendSystemPrompt,
          maxTurns,
          useAgent,
          options.dangerouslySkipPermissions
        );
        return;
      }

      // Interactive mode
      const agent = new GrokAgent(apiKey, baseURL, model, maxToolRounds);
      console.log("Starting Grok CLI Conversational Assistant...\n");
      ensureUserSettingsDirectory();

      const initialMessage = Array.isArray(message) ? message.join(" ") : message;
      render(React.createElement(ChatInterface, { agent, initialMessage }));
    } catch (error: any) {
      console.error("Error initializing Grok CLI:", error.message);
      process.exit(1);
    }
  });

// === Subcommands ===
const gitCommand = program.command("git").description("Git operations with AI assistance");
gitCommand
  .command("commit-and-push")
  .description("Generate AI commit message and push")
  .option("-d, --directory <dir>", "set working directory", process.cwd())
  .option("-k, --api-key <key>", "Grok API key")
  .option("-u, --base-url <url>", "Grok API base URL")
  .option("-m, --model <model>", "AI model")
  .option("--max-tool-rounds <rounds>", "max tool rounds", "400")
  .action(async (options) => {
    if (options.directory) {
      try { process.chdir(options.directory); } catch (e: any) {
        console.error(`Error: ${e.message}`);
        process.exit(1);
      }
    }

    try {
      const apiKey = options.apiKey || loadApiKey();
      const baseURL = options.baseUrl || loadBaseURL();
      const model = loadModel(options.model);
      const maxToolRounds = parseInt(options.maxToolRounds) || 400;

      if (!apiKey) {
        console.error("API key required.");
        process.exit(1);
      }

      if (options.apiKey || options.baseUrl) {
        await saveCommandLineSettings(options.apiKey, options.baseUrl);
      }

      await handleCommitAndPushHeadless(apiKey, baseURL, model, maxToolRounds);
    } catch (error: any) {
      console.error("Error:", error.message);
      process.exit(1);
    }
  });

// Telemetry command
const telemetryCommand = program.command("telemetry").description("Manage OpenTelemetry settings");
telemetryCommand.command("enable").description("Enable telemetry").action(() => {
  telemetryManager.updateSettings({ enabled: true });
  console.log("Telemetry enabled");
});
telemetryCommand.command("disable").description("Disable telemetry").action(() => {
  telemetryManager.updateSettings({ enabled: false });
  console.log("Telemetry disabled");
});

// MCP command
program.addCommand(createMCPCommand());

// Parse
program.parse();

// Export for testing
export { program, loadModel };
