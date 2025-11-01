# Grok CLI  
**A conversational AI CLI powered by Grok with intelligent file editing, tool usage, and automation.**

<img width="980" height="435" alt="Grok CLI in action" src="https://github.com/user-attachments/assets/192402e3-30a8-47df-9fc8-a084c5696e78" />

---

## Features

| Feature | Description |
|-------|-----------|
| **Conversational AI** | Natural language interface powered by Grok |
| **Smart File Editing** | AI automatically views, creates, and edits files |
| **Bash Integration** | Run shell commands via natural conversation |
| **Automatic Tool Selection** | AI chooses the right tool (`view_file`, `str_replace_editor`, etc.) |
| **Morph Fast Apply** | High-speed editing at **4,500+ tokens/sec** with **98% accuracy** |
| **MCP Tools** | Extend with Model Context Protocol (Linear, GitHub, etc.) |
| **Interactive UI** | Beautiful terminal interface built with **Ink** |
| **Headless Mode** | Scriptable with JSON/JSONL output |
| **Telemetry** | OpenTelemetry tracing for agent monitoring |

---

## Installation

### Prerequisites
- **Bun 1.0+** (recommended) or **Node.js 18+**
- **Grok API key** from [x.ai](https://x.ai)
- *(Optional)* **Morph API key** for fast editing

### Global Install (Recommended)
```bash
bun add -g @vibe-kit/grok-cli
```
> Fallback with npm:
```bash
npm install -g @vibe-kit/grok-cli
```

### Local Development
```bash
git clone <your-repo>
cd grok-cli
bun install
bun run build
bun link
```

---

## Setup

### 1. Set Your Grok API Key (Choose One)

| Method | Command |
|------|--------|
| **Environment Variable** | `export GROK_API_KEY=your_key_here` |
| **`.env` File** | `echo "GROK_API_KEY=your_key" > .env` |
| **CLI Flag** | `grok --api-key your_key_here` |
| **User Settings** | Create `~/.grok/user-settings.json` |

```json
// ~/.grok/user-settings.json
{
  "apiKey": "your_api_key_here",
  "baseURL": "https://api.x.ai/v1",
  "defaultModel": "grok-code-fast-1"
}
```

### 2. (Optional) Enable Morph Fast Apply
```bash
export MORPH_API_KEY=your_morph_key
```

---

## Configuration

### User Settings: `~/.grok/user-settings.json`
Global defaults (API key, models, base URL).

```json
{
  "apiKey": "sk-...",
  "baseURL": "https://api.x.ai/v1",
  "defaultModel": "grok-code-fast-1",
  "models": [
    "grok-code-fast-1",
    "grok-4-latest",
    "grok-3-latest",
    "grok-3-fast"
  ]
}
```

### Project Settings: `.grok/settings.json`
Per-project overrides (model, MCP servers, telemetry).

```json
{
  "model": "grok-3-fast",
  "telemetry": {
    "enabled": true,
    "endpoint": "http://localhost:4317"
  },
  "mcpServers": {
    "linear": {
      "transport": "stdio",
      "command": "npx",
      "args": ["@linear/mcp-server"]
    }
  }
}
```

> **Priority**: CLI > Project > User > Default

---

## Usage

### Interactive Mode
```bash
grok
grok -d /path/to/project
grok "Explain this codebase"
```

### Headless Mode (Scripting & Automation)
```bash
grok -p "show package.json"
grok --prompt "create hello.js" --output-format jsonl --output-file out.jsonl
```

#### Output Formats
| Format | Use Case |
|-------|---------|
| `text` | Default, human-readable |
| `json` | Full conversation |
| `jsonl` | Line-delimited JSON (streaming/file) |
| `stream-json` | Real-time JSON chunks |

#### Examples
```bash
# Save full conversation
grok -p "analyze logs" --output-format json --output-file result.json

# Stream JSONL
grok -p "debug this" --output-format jsonl

# Pipe input
echo "fix this bug" | grok -p

# Custom system prompt
grok -p "write API" -s "Use OpenAPI 3.0 spec"
```

---

## CLI Options

```bash
grok [options] [message...]

Options:
  -d, --directory <dir>           Set working directory
  -k, --api-key <key>             Grok API key
  -u, --base-url <url>            Custom API endpoint
  -m, --model <model>             AI model (e.g. grok-code-fast-1)
  -p, --prompt [prompt]           Headless mode
  -s, --append-system-prompt      Add to system prompt
  --max-tool-rounds <n>           Max tool calls (default: 400)
  --max-turns <n>                 Max agent turns
  --output-format <format>        text | json | jsonl | stream-json
  --output-file <file>            Save output to file
  --verbose                       Enable debug logs
  --dangerously-skip-permissions  Auto-approve all actions
```

---

## Git Commands

### AI-Powered Commit & Push
```bash
grok git commit-and-push
grok git commit-and-push -d /my/app --model grok-code-fast-1
```

**Steps:**
1. `git status` → detect changes
2. `git add .`
3. AI generates **conventional commit**
4. `git commit -m "..."`  
5. `git push` (sets upstream if needed)

---

## Telemetry (OpenTelemetry)

### Enable/Disable
```bash
grok telemetry enable
grok telemetry disable
```

### Configure in `.grok/settings.json`
```json
{
  "telemetry": {
    "enabled": true,
    "exporter": "otlp",
    "endpoint": "http://localhost:4317",
    "service_name": "grok-agent",
    "trace_sample_ratio": 1.0
  }
}
```

**Tracks:**
- Session duration
- Model, tokens, latency
- Tool usage & performance

---

## MCP Tools (Model Context Protocol)

Extend Grok with external tools.

### Add Server
```bash
# stdio
grok mcp add linear --transport stdio --command "npx" --args "@linear/mcp-server"

# HTTP/SSE
grok mcp add github --transport sse --url "https://mcp.github.com/sse"
```

### Manage
```bash
grok mcp list
grok mcp test linear
grok mcp remove linear
```

---

## Custom Instructions

Create `.grok/GROK.md` in your project:

```markdown
# Project Guidelines

- Use TypeScript
- Functional React components
- Tailwind CSS
- Add JSDoc for public APIs
```

Grok **automatically loads and follows** these rules.

---

## Morph Fast Apply (High-Speed Editing)

| Tool | Speed | Use Case |
|------|-------|--------|
| `str_replace_editor` | Standard | Simple edits |
| `edit_file` (Morph) | **4,500+ tokens/sec** | Refactoring, large changes |

Enabled when `MORPH_API_KEY` is set.

---

## Model Selection

```bash
# CLI
grok --model grok-3-fast

# Env
export GROK_MODEL=grok-code-fast-1

# User settings
"defaultModel": "grok-4-latest"
```

**Supports any OpenAI-compatible API**:
- OpenAI
- Groq
- OpenRouter
- Local LLMs

---

## Development

```bash
bun install
bun run dev        # Hot reload
bun run build      # Production build
bun run lint
bun run typecheck
```

---

## Architecture

```
src/
├── agent/          → Core agent logic
├── tools/          → File, bash, search, todo
├── ui/             → Ink components
├── grok/           → Client & tools
├── mcp/            → Protocol servers
└── utils/          → Telemetry, settings, tokens
```

---

## License

[MIT](LICENSE)

---

**Built for developers. Powered by Grok.**  
Made with [Bun](https://bun.sh) and [Ink](https://github.com/vadimdemedes/ink)

---

Let me know if you'd like:
- A **dark mode screenshot**
- **Badges** (npm, bun, license)
- **GitHub Actions** workflow
- **Contributing guide**

Happy coding!
