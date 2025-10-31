# Grok CLI - Edited

A conversational AI CLI tool powered by Grok with intelligent text editor capabilities and tool usage.

<img width="980" height="435" alt="Screenshot 2025-07-21 at 13 35 41" src="https://github.com/user-attachments/assets/192402e3-30a8-47df-9fc8-a084c5696e78" />

## Features

- **🤖 Conversational AI**: Natural language interface powered by Grok-3
- **📝 Smart File Operations**: AI automatically uses tools to view, create, and edit files
- **⚡ Bash Integration**: Execute shell commands through natural conversation
- **🔧 Automatic Tool Selection**: AI intelligently chooses the right tools for your requests
- **🚀 Morph Fast Apply**: Optional high-speed code editing at 4,500+ tokens/sec with 98% accuracy
- **🔌 MCP Tools**: Extend capabilities with Model Context Protocol servers (Linear, GitHub, etc.)
- **💬 Interactive UI**: Beautiful terminal interface built with Ink
- **🌍 Global Installation**: Install and use anywhere with `bun add -g @vibe-kit/grok-cli`

## Installation

### Prerequisites
- Bun 1.0+ (or Node.js 18+ as fallback)
- Grok API key from X.AI
- (Optional, Recommended) Morph API key for Fast Apply editing

### Global Installation (Recommended)
```bash
bun add -g @vibe-kit/grok-cli
```

Or with npm (fallback):
```bash
npm install -g @vibe-kit/grok-cli
```

### Local Development
```bash
git clone <repository>
cd grok-cli
bun install
bun run build
bun link
```

## Building and Installing

To build this project (grok-cli-custom):

```bash
bun run build
```

To install globally with bun:

```bash
bun link
```

## Setup

1. Get your Grok API key from [X.AI](https://x.ai)

2. Set up your API key (choose one method):

**Method 1: Environment Variable**
```bash
export GROK_API_KEY=your_api_key_here
```

**Method 2: .env File**
```bash
cp .env.example .env
# Edit .env and add your API key
```

**Method 3: Command Line Flag**
```bash
grok --api-key your_api_key_here
```

**Method 4: User Settings File**
Create `~/.grok/user-settings.json`:
```json
{
  "apiKey": "your_api_key_here"
}
```

3. (Optional, Recommended) Get your Morph API key from [Morph Dashboard](https://morphllm.com/dashboard/api-keys)

4. Set up your Morph API key for Fast Apply editing (choose one method):

**Method 1: Environment Variable**
```bash
export MORPH_API_KEY=your_morph_api_key_here
```

**Method 2: .env File**
```bash
# Add to your .env file
MORPH_API_KEY=your_morph_api_key_here
```

### Custom Base URL (Optional)

By default, the CLI uses `https://api.x.ai/v1` as the Grok API endpoint. You can configure a custom endpoint if needed (choose one method):

**Method 1: Environment Variable**
```bash
export GROK_BASE_URL=https://your-custom-endpoint.com/v1
```

**Method 2: Command Line Flag**
```bash
grok --api-key your_api_key_here --base-url https://your-custom-endpoint.com/v1
```

**Method 3: User Settings File**
Add to `~/.grok/user-settings.json`:
```json
{
  "apiKey": "your_api_key_here",
  "baseURL": "https://your-custom-endpoint.com/v1"
}
```

## Configuration Files

Grok CLI uses two types of configuration files to manage settings:

### User-Level Settings (`~/.grok/user-settings.json`)

This file stores **global settings** that apply across all projects. These settings rarely change and include:

- **API Key**: Your Grok API key
- **Base URL**: Custom API endpoint (if needed)
- **Default Model**: Your preferred model (e.g., `grok-code-fast-1`)
- **Available Models**: List of models you can use

**Example:**
```json
{
  "apiKey": "your_api_key_here",
  "baseURL": "https://api.x.ai/v1",
  "defaultModel": "grok-code-fast-1",
  "models": [
    "grok-code-fast-1",
    "grok-4-latest",
    "grok-3-latest",
    "grok-3-fast",
    "grok-3-mini-fast"
  ]
}
```

### Project-Level Settings (`.grok/settings.json`)

This file stores **project-specific settings** in your current working directory. It includes:

- **Current Model**: The model currently in use for this project
- **MCP Servers**: Model Context Protocol server configurations

**Example:**
```json
{
  "model": "grok-3-fast",
  "mcpServers": {
    "linear": {
      "name": "linear",
      "transport": "stdio",
      "command": "npx",
      "args": ["@linear/mcp-server"]
    }
  }
}
```

### How It Works

1. **Global Defaults**: User-level settings provide your default preferences
2. **Project Override**: Project-level settings override defaults for specific projects
3. **Directory-Specific**: When you change directories, project settings are loaded automatically
4. **Fallback Logic**: Project model → User default model → System default (`grok-code-fast-1`)

This means you can have different models for different projects while maintaining consistent global settings like your API key.

### Using Other API Providers

**Important**: Grok CLI uses **OpenAI-compatible APIs**. You can use any provider that implements the OpenAI chat completions standard.

**Popular Providers**:
- **X.AI (Grok)**: `https://api.x.ai/v1` (default)
- **OpenAI**: `https://api.openai.com/v1`
- **OpenRouter**: `https://openrouter.ai/api/v1`
- **Groq**: `https://api.groq.com/openai/v1`

**Example with OpenRouter**:
```json
{
  "apiKey": "your_openrouter_key",
  "baseURL": "https://openrouter.ai/api/v1",
  "defaultModel": "anthropic/claude-3.5-sonnet",
  "models": [
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o",
    "meta-llama/llama-3.1-70b-instruct"
  ]
}
```

## Usage

### Interactive Mode

Start the conversational AI assistant:
```bash
grok
```

Or specify a working directory:
```bash
grok -d /path/to/project
```

### Headless Mode

Process a single prompt and exit (useful for scripting and automation):
```bash
# Basic usage
grok --prompt "show me the package.json file"
grok -p "create a new file called example.js with a hello world function"

# With directory specification
grok --prompt "run bun test and show me the results" --directory /path/to/project

# Limit tool usage for faster execution
grok --prompt "complex task" --max-tool-rounds 50

# Append system prompt for custom behavior
grok --prompt "write a Python script" --append-system-prompt "Always use type hints and follow PEP 8"

# Output formats
grok --prompt "analyze this codebase" --output-format json
grok --prompt "stream analysis" --output-format stream-json

# Verbose logging
grok --prompt "debug this issue" --verbose

# Skip permissions for automation
grok --prompt "automated code review" --dangerously-skip-permissions

# Use stdin input
echo "analyze this code for bugs" | grok --prompt
cat myfile.txt | grok -p "summarize this document"

# Limit agent turns
grok --prompt "step-by-step debugging" --max-turns 10

# Combine options
grok --prompt "comprehensive code review" \
  --model grok-code-fast-1 \
  --max-tool-rounds 100 \
  --output-format json \
  --verbose
```

#### Output Formats

- **`text`** (default): Plain text output of the final response
- **`json`**: Full conversation as JSON with messages array
- **`stream-json`**: Real-time streaming JSON output (line-delimited)

#### System Prompts

Use `--append-system-prompt` to customize AI behavior:

```bash
# Code generation with specific style
grok -p "write a React component" -s "Use TypeScript, functional components, and Tailwind CSS"

# Analysis with specific focus
grok -p "review this PR" -s "Focus on security vulnerabilities and performance issues"

# Custom coding standards
grok -p "refactor this code" -s "Follow Airbnb JavaScript style guide"
```

This mode is particularly useful for:
- **CI/CD pipelines**: Automate code analysis and file operations
- **Scripting**: Integrate AI assistance into shell scripts
- **Terminal benchmarks**: Perfect for tools like Terminal Bench that need non-interactive execution
- **Batch processing**: Process multiple prompts programmatically
- **API integration**: Use JSON output for programmatic consumption
- **Streaming applications**: Real-time processing with stream-json format

### Tool Execution Control

By default, Grok CLI allows up to 400 tool execution rounds to handle complex multi-step tasks. You can control this behavior:

```bash
# Limit tool rounds for faster execution on simple tasks
grok --max-tool-rounds 10 --prompt "show me the current directory"

# Increase limit for very complex tasks (use with caution)
grok --max-tool-rounds 1000 --prompt "comprehensive code refactoring"

# Works with all modes
grok --max-tool-rounds 20  # Interactive mode
grok git commit-and-push --max-tool-rounds 30  # Git commands
```

**Use Cases**:
- **Fast responses**: Lower limits (10-50) for simple queries
- **Complex automation**: Higher limits (500+) for comprehensive tasks
- **Resource control**: Prevent runaway executions in automated environments

### Model Selection

You can specify which AI model to use with the `--model` parameter or `GROK_MODEL` environment variable:

**Method 1: Command Line Flag**
```bash
# Use Grok models
grok --model grok-code-fast-1
grok --model grok-4-latest
grok --model grok-3-latest
grok --model grok-3-fast

# Use other models (with appropriate API endpoint)
grok --model gemini-2.5-pro --base-url https://api-endpoint.com/v1
grok --model claude-sonnet-4-20250514 --base-url https://api-endpoint.com/v1
```

**Method 2: Environment Variable**
```bash
export GROK_MODEL=grok-code-fast-1
grok
```

**Method 3: User Settings File**
Add to `~/.grok/user-settings.json`:
```json
{
  "apiKey": "your_api_key_here",
  "defaultModel": "grok-code-fast-1"
}
```

**Model Priority**: `--model` flag > `GROK_MODEL` environment variable > user default model > system default (grok-code-fast-1)

### Command Line Options

```bash
grok [options] [message...]

Arguments:
  message...             Initial message to send to Grok (for interactive mode) or query (for headless mode if no --prompt)

Options:
  -V, --version                        output the version number
  -d, --directory <dir>                set working directory (default: current directory)
  -k, --api-key <key>                  Grok API key (or set GROK_API_KEY env var)
  -u, --base-url <url>                 Grok API base URL (or set GROK_BASE_URL env var)
  -m, --model <model>                  AI model to use (e.g., grok-code-fast-1, grok-4-latest, grok-3-latest) (or set GROK_MODEL env var)
  -p, --prompt [prompt]                process a single prompt and exit (headless/print mode)
  -s, --append-system-prompt <prompt>  append to system prompt (only with --prompt)
  --max-tool-rounds <rounds>           maximum number of tool execution rounds (default: 400)
  --max-turns <turns>                  limit the number of agentic turns in non-interactive mode (default: unlimited)
  --output-format <format>             output format for headless mode (default: text, supported: text, json, stream-json)
  --verbose                            enable verbose output and logging
  --dangerously-skip-permissions       skip all permission confirmations (use with caution)
  -h, --help                           display help for command

Subcommands:
  git                                  Git operations with AI assistance
  mcp                                  Manage MCP (Model Context Protocol) servers
```

## Use Cases

Grok CLI excels in various development and automation scenarios. Here are some common use cases:

### 🚀 Development Workflow Automation

```bash
# Automated code review and fixes
grok -p "review this codebase for security vulnerabilities" --output-format json

# Generate documentation
grok -p "generate comprehensive README.md for this project"

# Refactor legacy code
grok -p "modernize this JavaScript code to use ES6+ features"

# Debug complex issues
grok -p "debug this failing test case" --verbose
```

### 🔧 CI/CD Integration

```bash
# Automated testing and reporting
grok -p "run tests and generate coverage report" --dangerously-skip-permissions

# Code quality checks
grok -p "analyze code quality and suggest improvements" --model grok-code-fast-1

# Deployment preparation
grok -p "prepare deployment scripts for production"
```

### 📊 Data Analysis and Processing

```bash
# Analyze log files
cat app.log | grok -p "analyze these logs for errors and patterns"

# Process CSV data
grok -p "analyze this CSV file and generate insights" --directory /data

# Generate reports
grok -p "create a summary report from these metrics"
```

### 🛠️ System Administration

```bash
# Server monitoring and alerts
grok -p "monitor system resources and alert on anomalies"

# Configuration management
grok -p "optimize these nginx config files"

# Backup automation
grok -p "create automated backup scripts"
```

### 🎯 Specialized Tasks

```bash
# API development
grok -p "design REST API endpoints for user management" -s "Use OpenAPI 3.0 specification"

# Database operations
grok -p "optimize these SQL queries for better performance"

# Infrastructure as Code
grok -p "convert this infrastructure setup to Terraform"
```

### 🤖 AI-Assisted Git Operations

```bash
# Smart commits with AI-generated messages
grok git commit-and-push

# Code review before commit
grok -p "review my staged changes and suggest improvements"
```

### 🔌 Integration with External Tools

```bash
# MCP server integration for specialized tools
grok mcp add github --transport sse --url "https://mcp.github.com/sse"
grok -p "analyze GitHub issues and create summary"

# Custom MCP servers
grok mcp add my-custom-tools --transport stdio --command "python" --args "mcp_server.py"
```

### 📝 Content Creation and Documentation

```bash
# Technical writing
grok -p "write technical documentation for this API"

# Code comments and docstrings
grok -p "add comprehensive docstrings to these functions"

# Tutorial creation
grok -p "create a step-by-step tutorial for this feature"
```

## Git Commands

Grok CLI provides AI-assisted Git operations to streamline your development workflow.

### Commit and Push

Automatically generate commit messages and push changes using AI:

```bash
# Basic usage - commit all changes and push
grok git commit-and-push

# Specify directory
grok git commit-and-push --directory /path/to/project

# Use specific API key and model
grok git commit-and-push --api-key your_key --model grok-code-fast-1

# Limit tool rounds for faster execution
grok git commit-and-push --max-tool-rounds 50
```

**What it does:**
1. Checks for uncommitted changes (`git status --porcelain`)
2. Stages all changes (`git add .`)
3. Analyzes the diff and generates an AI-powered commit message
4. Commits the changes
5. Pushes to the remote repository (handles upstream setup if needed)

**Options for git commit-and-push:**
- `-d, --directory <dir>`: Set working directory
- `-k, --api-key <key>`: Grok API key
- `-u, --base-url <url>`: Grok API base URL
- `-m, --model <model>`: AI model to use
- `--max-tool-rounds <rounds>`: Maximum tool rounds (default: 400)

### Custom Instructions

You can provide custom instructions to tailor Grok's behavior to your project by creating a `.grok/GROK.md` file in your project directory:

```bash
mkdir .grok
```

Create `.grok/GROK.md` with your custom instructions:
```markdown
# Custom Instructions for Grok CLI

Always use TypeScript for any new code files.
When creating React components, use functional components with hooks.
Prefer const assertions and explicit typing over inference where it improves clarity.
Always add JSDoc comments for public functions and interfaces.
Follow the existing code style and patterns in this project.
```

Grok will automatically load and follow these instructions when working in your project directory. The custom instructions are added to Grok's system prompt and take priority over default behavior.

## Morph Fast Apply (Optional)

Grok CLI supports Morph's Fast Apply model for high-speed code editing at **4,500+ tokens/sec with 98% accuracy**. This is an optional feature that provides lightning-fast file editing capabilities.

**Setup**: Configure your Morph API key following the [setup instructions](#setup) above.

### How It Works

When `MORPH_API_KEY` is configured:
- **`edit_file` tool becomes available** alongside the standard `str_replace_editor`
- **Optimized for complex edits**: Use for multi-line changes, refactoring, and large modifications
- **Intelligent editing**: Uses abbreviated edit format with `// ... existing code ...` comments
- **Fallback support**: Standard tools remain available if Morph is unavailable

**When to use each tool:**
- **`edit_file`** (Morph): Complex edits, refactoring, multi-line changes
- **`str_replace_editor`**: Simple text replacements, single-line edits

### Example Usage

With Morph Fast Apply configured, you can request complex code changes:

```bash
grok --prompt "refactor this function to use async/await and add error handling"
grok -p "convert this class to TypeScript and add proper type annotations"
```

The AI will automatically choose between `edit_file` (Morph) for complex changes or `str_replace_editor` for simple replacements.

## MCP Tools

Grok CLI supports MCP (Model Context Protocol) servers, allowing you to extend the AI assistant with additional tools and capabilities.

### Adding MCP Tools

#### Add a custom MCP server:
```bash
# Add an stdio-based MCP server
grok mcp add my-server --transport stdio --command "bun" --args server.js

# Add an HTTP-based MCP server
grok mcp add my-server --transport http --url "http://localhost:3000"

# Add with environment variables
grok mcp add my-server --transport stdio --command "python" --args "-m" "my_mcp_server" --env "API_KEY=your_key"
```

#### Add from JSON configuration:
```bash
grok mcp add-json my-server '{"command": "bun", "args": ["server.js"], "env": {"API_KEY": "your_key"}}'
```

### Linear Integration Example

To add Linear MCP tools for project management:

```bash
# Add Linear MCP server
grok mcp add linear --transport sse --url "https://mcp.linear.app/sse"
```

This enables Linear tools like:
- Create and manage Linear issues
- Search and filter issues
- Update issue status and assignees
- Access team and project information

### MCP Commands Reference

```bash
grok mcp [command]

Commands:
  add <name>           Add an MCP server
  add-json <name>      Add an MCP server from JSON configuration
  remove <name>        Remove an MCP server
  list                 List configured MCP servers
  test <name>          Test connection to an MCP server
```

#### Add Server Options

```bash
grok mcp add <name> [options]

Options:
  -t, --transport <type>     Transport type (stdio, http, sse, streamable_http)
  -c, --command <command>    Command to run the server (for stdio transport)
  -a, --args [args...]       Arguments for the server command
  -u, --url <url>            URL for HTTP/SSE transport
  -h, --headers [headers...] HTTP headers (key=value format)
  -e, --env [env...]         Environment variables (key=value format)
```

#### Managing MCP Servers

```bash
# List all configured servers with status and tools
grok mcp list

# Test server connection and show available tools
grok mcp test server-name

# Remove a server
grok mcp remove server-name
```

### Available Transport Types

- **stdio**: Run MCP server as a subprocess (most common)
- **http**: Connect to HTTP-based MCP server
- **sse**: Connect via Server-Sent Events
- **streamable_http**: Streamable HTTP transport

### Predefined Servers

Some MCP servers are predefined and can be added directly:

```bash
# Add Linear MCP server (project management)
grok mcp add linear

# Add GitHub MCP server (if available)
grok mcp add github
```

### Advanced Configuration

For complex server configurations, use JSON format:

```bash
grok mcp add-json my-server '{
  "transport": {
    "type": "stdio",
    "command": "python",
    "args": ["-m", "my_mcp_server"],
    "env": {
      "API_KEY": "your_key",
      "DEBUG": "true"
    }
  }
}'
```

## Development

```bash
# Install dependencies
bun install

# Development mode
bun run dev

# Build project
bun run build

# Run linter
bun run lint

# Type check
bun run typecheck
```

## Architecture

- **Agent**: Core command processing and execution logic
- **Tools**: Text editor and bash tool implementations
- **UI**: Ink-based terminal interface components
- **Types**: TypeScript definitions for the entire system

## License

MIT
