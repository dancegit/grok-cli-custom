#!/usr/bin/env node
import React from "react";
import { render } from "ink";
import { program } from "commander";
import * as dotenv from "dotenv";
import { GrokAgent } from "./agent/grok-agent.js";
import ChatInterface from "./ui/components/chat-interface.js";
import { getSettingsManager } from "./utils/settings-manager.js";
import { ConfirmationService } from "./utils/confirmation-service.js";
import { createMCPCommand } from "./commands/mcp.js";
import type { ChatCompletionMessageParam } from "openai/resources/chat";
import * as fs from "fs";
import { GrokClient } from "./grok/client.js";

// Load environment variables
dotenv.config();

// Disable default SIGINT handling to let Ink handle Ctrl+C
// We'll handle exit through the input system instead

process.on("SIGTERM", () => {
  // Restore terminal to normal mode before exit
  if (process.stdin.isTTY && process.stdin.setRawMode) {
    try {
      process.stdin.setRawMode(false);
    } catch (e) {
      // Ignore errors when setting raw mode
    }
  }
  console.log("\nGracefully shutting down...");
  process.exit(0);
});

// Handle uncaught exceptions to prevent hanging
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
    // This will create default settings if they don't exist
    manager.loadUserSettings();
  } catch (error) {
    // Silently ignore errors during setup
  }
}

// Load API key from user settings if not in environment
function loadApiKey(): string | undefined {
  const manager = getSettingsManager();
  return manager.getApiKey();
}

// Load base URL from user settings if not in environment
function loadBaseURL(): string {
  const manager = getSettingsManager();
  return manager.getBaseURL();
}

// Save command line settings to user settings file
async function saveCommandLineSettings(
  apiKey?: string,
  baseURL?: string
): Promise<void> {
  try {
    const manager = getSettingsManager();

    // Update with command line values
    if (apiKey) {
      manager.updateUserSetting("apiKey", apiKey);
      console.log("✅ API key saved to ~/.grok/user-settings.json");
    }
    if (baseURL) {
      manager.updateUserSetting("baseURL", baseURL);
      console.log("✅ Base URL saved to ~/.grok/user-settings.json");
    }
  } catch (error) {
    console.warn(
      "⚠️ Could not save settings to file:",
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}

// Load model from user settings if not in environment
function loadModel(modelFromArg?: string): string | undefined {
  // First check environment variables
  let model = process.env.GROK_MODEL || modelFromArg;

  if (!model) {
    // Use the unified model loading from settings manager
    try {
      const manager = getSettingsManager();
      model = manager.getCurrentModel();
    } catch (error) {
      // Ignore errors, model will remain undefined
    }
  }

  // Validate model if provided
  if (model) {
    const manager = getSettingsManager();
    const validModels = manager.getAvailableModels();
    if (!validModels.includes(model)) {
      console.error(`Invalid model: ${model}. Valid models: ${validModels.join(', ')}`);
      process.exit(1);
    }
  }

  return model;
}

// Read stdin content asynchronously
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

// Handle commit-and-push command in headless mode
async function handleCommitAndPushHeadless(
  apiKey: string,
  baseURL?: string,
  model?: string,
  maxToolRounds?: number
): Promise<void> {
  try {
    const agent = new GrokAgent(apiKey, baseURL, model, maxToolRounds);

    // Configure confirmation service for headless mode (auto-approve all operations)
    const confirmationService = ConfirmationService.getInstance();
    confirmationService.setSessionFlag("allOperations", true);

    console.log("🤖 Processing commit and push...\n");
    console.log("> /commit-and-push\n");

    // First check if there are any changes at all
    const initialStatusResult = await agent.executeBashCommand(
      "git status --porcelain"
    );

    if (!initialStatusResult.success || !initialStatusResult.output?.trim()) {
      console.log("❌ No changes to commit. Working directory is clean.");
      process.exit(1);
    }

    console.log("✅ git status: Changes detected");

    // Add all changes
    const addResult = await agent.executeBashCommand("git add .");

    if (!addResult.success) {
      console.log(
        `❌ git add: ${addResult.error || "Failed to stage changes"}`
      );
      process.exit(1);
    }

    console.log("✅ git add: Changes staged");

    // Get staged changes for commit message generation
    const diffResult = await agent.executeBashCommand("git diff --cached");

    // Generate commit message using AI
    const commitPrompt = `Generate a concise, professional git commit message for these changes:

Git Status:
${initialStatusResult.output}

Git Diff (staged changes):
${diffResult.output || "No staged changes shown"}

Follow conventional commit format (feat:, fix:, docs:, etc.) and keep it under 72 characters.
Respond with ONLY the commit message, no additional text.`;

    console.log("🤖 Generating commit message...");

    const commitMessageEntries = await agent.processUserMessage(commitPrompt);
    let commitMessage = "";

    // Extract the commit message from the AI response
    for (const entry of commitMessageEntries) {
      if (entry.type === "assistant" && entry.content.trim()) {
        commitMessage = entry.content.trim();
        break;
      }
    }

    if (!commitMessage) {
      console.log("❌ Failed to generate commit message");
      process.exit(1);
    }

    // Clean the commit message
    const cleanCommitMessage = commitMessage.replace(/^["']|["']$/g, "");
    console.log(`✅ Generated commit message: "${cleanCommitMessage}"`);

    // Execute the commit
    const commitCommand = `git commit -m "${cleanCommitMessage}"`;
    const commitResult = await agent.executeBashCommand(commitCommand);

    if (commitResult.success) {
      console.log(
        `✅ git commit: ${
          commitResult.output?.split("\n")[0] || "Commit successful"
        }`
      );

      // If commit was successful, push to remote
      // First try regular push, if it fails try with upstream setup
      let pushResult = await agent.executeBashCommand("git push");

      if (
        !pushResult.success &&
        pushResult.error?.includes("no upstream branch")
      ) {
        console.log("🔄 Setting upstream and pushing...");
        pushResult = await agent.executeBashCommand("git push -u origin HEAD");
      }

      if (pushResult.success) {
        console.log(
          `✅ git push: ${
            pushResult.output?.split("\n")[0] || "Push successful"
          }`
        );
      } else {
        console.log(`❌ git push: ${pushResult.error || "Push failed"}`);
        process.exit(1);
      }
    } else {
      console.log(`❌ git commit: ${commitResult.error || "Commit failed"}`);
      process.exit(1);
    }
  } catch (error: any) {
    console.error("❌ Error during commit and push:", error.message);
    process.exit(1);
  }
}

// Headless mode processing function
async function processPromptHeadless(
  prompt: string,
  apiKey: string,
  baseURL?: string,
  model?: string,
  maxToolRounds?: number,
  outputFormat?: string,
  verbose?: boolean,
  useAgent: boolean = true
): Promise<void> {
  try {
    if (verbose) {
      console.error(`🤖 Processing prompt with model: ${model || 'default'}`);
      console.error(`📝 Prompt: ${prompt}`);
    }

    let client: GrokClient;
    let messages: ChatCompletionMessageParam[] = [{ role: "user", content: prompt }];

    if (useAgent) {
      const agent = new GrokAgent(apiKey, baseURL, model, maxToolRounds);

      // Configure confirmation service for headless mode (auto-approve all operations)
      const confirmationService = ConfirmationService.getInstance();
      confirmationService.setSessionFlag("allOperations", true);

      if (verbose) {
        console.error("🔄 Processing user message...");
      }

      // Process the user message with agent (tools enabled)
      const chatEntries = await agent.processUserMessage(prompt);

      if (verbose) {
        console.error(`📊 Generated ${chatEntries.length} chat entries`);
      }

      // Convert chat entries to OpenAI compatible message objects
      messages = [];

      for (const entry of chatEntries) {
        switch (entry.type) {
          case "user":
            messages.push({
              role: "user",
              content: entry.content,
            });
            break;

          case "assistant":
            const assistantMessage: ChatCompletionMessageParam = {
              role: "assistant",
              content: entry.content,
            };

            // Add tool calls if present
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

      client = agent['grokClient']; // Access private client if needed, but for output we use messages
    } else {
      // Direct client call without agent (no tools, for streaming)
      client = new GrokClient(apiKey, model, baseURL);
    }

    // Output based on format
    if (outputFormat === 'stream-json') {
      if (!useAgent) {
        // Stream directly from API
        const stream = await client.chatStream(messages, [], model);
        for await (const chunk of stream) {
          console.log(JSON.stringify(chunk));
        }
      } else {
        // Fallback for agent: output messages as JSON lines (non-streaming)
        console.error('⚠️ Streaming not supported with tools/agent; falling back to JSON lines');
        for (const message of messages) {
          console.log(JSON.stringify(message));
        }
      }
    } else if (outputFormat === 'json') {
      // Full conversation as JSON
      console.log(JSON.stringify({ messages }, null, 2));
    } else {
      // text: output final assistant content
      const lastAssistant = messages.filter(m => m.role === 'assistant').pop();
      const content = lastAssistant?.content || 'No response generated.';
      console.log(content);
    }
  } catch (error: any) {
    // Output error in OpenAI compatible format
    const errorMsg = { role: "assistant", content: `Error: ${error.message}` };
    if (outputFormat === 'stream-json' || outputFormat === 'json') {
      console.log(JSON.stringify(errorMsg));
    } else {
      console.log(errorMsg.content);
    }
    process.exit(1);
  }
}

program
  .name("grok")
  .description(
    "A conversational AI CLI tool powered by Grok with text editor capabilities"
  )
  .version("1.0.1")
  .argument("[message...]", "Initial message to send to Grok")
  .option("-d, --directory <dir>", "set working directory", process.cwd())
  .option("-k, --api-key <key>", "Grok API key (or set GROK_API_KEY env var)")
  .option(
    "-u, --base-url <url>",
    "Grok API base URL (or set GROK_BASE_URL env var)"
  )
  .option(
    "-m, --model <model>",
    "AI model to use (e.g., grok-code-fast-1, grok-4-latest, grok-3-latest, grok-3-fast, grok-3-mini-fast) (or set GROK_MODEL env var)"
  )
  .option(
    "-p, --prompt <prompt>",
    "process a single prompt and exit (headless mode)"
  )
  .option(
    "--max-tool-rounds <rounds>",
    "maximum number of tool execution rounds (default: 400)",
    "400"
  )
  .option(
    "--output-format <format>",
    "output format for headless mode (default: text, supported: text, json, stream-json)",
    "text"
  )
  .option("--verbose", "enable verbose output")
  .option(
    "--dangerously-skip-permissions",
    "skip all permission confirmations (use with caution)"
  )
  .action(async (message, options) => {
    if (options.directory) {
      try {
        process.chdir(options.directory);
      } catch (error: any) {
        console.error(
          `Error changing directory to ${options.directory}:`,
          error.message
        );
        process.exit(1);
      }
    }

    try {
      // Get API key from options, environment, or user settings
      const apiKey = options.apiKey || loadApiKey();
      const baseURL = options.baseUrl || loadBaseURL();
      const model = loadModel(options.model);
      const maxToolRounds = parseInt(options.maxToolRounds) || 400;

      if (!apiKey) {
        console.error(
          "❌ Error: API key required. Set GROK_API_KEY environment variable, use --api-key flag, or save to ~/.grok/user-settings.json"
        );
        process.exit(1);
      }

      // Save API key and base URL to user settings if provided via command line
      if (options.apiKey || options.baseUrl) {
        await saveCommandLineSettings(options.apiKey, options.baseUrl);
      }

      // Configure confirmation service
      const confirmationService = ConfirmationService.getInstance();
      if (options.dangerouslySkipPermissions) {
        confirmationService.setSessionFlag("allOperations", true);
      }

      // Read stdin if applicable (for -p mode)
      const stdinContent = await readStdin();

      let fullPrompt = '';
      let useAgent = true;

      // Headless mode: process prompt and exit
      if (options.prompt) {
        fullPrompt = options.prompt;
        if (stdinContent) {
          fullPrompt = stdinContent + '\n\n' + fullPrompt;
        }
        if (!fullPrompt.trim()) {
          console.error('No prompt provided for headless mode.');
          process.exit(1);
        }
        // For stream-json, disable agent/tools for direct streaming
        if (options.outputFormat === 'stream-json') {
          useAgent = false;
        }
        await processPromptHeadless(
          fullPrompt,
          apiKey,
          baseURL,
          model,
          useAgent ? maxToolRounds : 0, // No tools if not using agent
          options.outputFormat,
          options.verbose,
          useAgent
        );
        return;
      } else if (stdinContent.trim()) {
        // No -p but stdin provided: treat as headless prompt
        fullPrompt = stdinContent;
        useAgent = options.outputFormat !== 'stream-json';
        await processPromptHeadless(
          fullPrompt,
          apiKey,
          baseURL,
          model,
          useAgent ? maxToolRounds : 0,
          options.outputFormat || 'text',
          options.verbose,
          useAgent
        );
        return;
      }

      // Interactive mode: launch UI
      const agent = new GrokAgent(apiKey, baseURL, model, maxToolRounds);
      console.log("🤖 Starting Grok CLI Conversational Assistant...\n");

      ensureUserSettingsDirectory();

      // Support variadic positional arguments for multi-word initial message
      const initialMessage = Array.isArray(message)
        ? message.join(" ")
        : message;

      render(React.createElement(ChatInterface, { agent, initialMessage }));
    } catch (error: any) {
      console.error("❌ Error initializing Grok CLI:", error.message);
      process.exit(1);
    }
  });

// Git subcommand
const gitCommand = program
  .command("git")
  .description("Git operations with AI assistance");

gitCommand
  .command("commit-and-push")
  .description("Generate AI commit message and push to remote")
  .option("-d, --directory <dir>", "set working directory", process.cwd())
  .option("-k, --api-key <key>", "Grok API key (or set GROK_API_KEY env var)")
  .option(
    "-u, --base-url <url>",
    "Grok API base URL (or set GROK_BASE_URL env var)"
  )
  .option(
    "-m, --model <model>",
    "AI model to use (e.g., grok-code-fast-1, grok-4-latest, grok-3-latest, grok-3-fast, grok-3-mini-fast) (or set GROK_MODEL env var)"
  )
  .option(
    "--max-tool-rounds <rounds>",
    "maximum number of tool execution rounds (default: 400)",
    "400"
  )
  .action(async (options) => {
    if (options.directory) {
      try {
        process.chdir(options.directory);
      } catch (error: any) {
        console.error(
          `Error changing directory to ${options.directory}:`,
          error.message
        );
        process.exit(1);
      }
    }

    try {
      // Get API key from options, environment, or user settings
      const apiKey = options.apiKey || loadApiKey();
      const baseURL = options.baseUrl || loadBaseURL();
      const model = loadModel(options.model);
      const maxToolRounds = parseInt(options.maxToolRounds) || 400;

      if (!apiKey) {
        console.error(
          "❌ Error: API key required. Set GROK_API_KEY environment variable, use --api-key flag, or save to ~/.grok/user-settings.json"
        );
        process.exit(1);
      }

      // Save API key and base URL to user settings if provided via command line
      if (options.apiKey || options.baseUrl) {
        await saveCommandLineSettings(options.apiKey, options.baseUrl);
      }

      await handleCommitAndPushHeadless(apiKey, baseURL, model, maxToolRounds);
    } catch (error: any) {
      console.error("❌ Error during git commit-and-push:", error.message);
      process.exit(1);
    }
  });

// MCP command
program.addCommand(createMCPCommand());

program.parse();
