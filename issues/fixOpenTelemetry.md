

task/feature: add open telemetry and json/jsonl output support that would act like the claude client options and that could be used in 
/home/clauderun/tac/adws/adw_modules/agent.py
as to store the agents output in json/jsonl files

 , adapt to the codebase and take this as an example/inspiration:





Here's a complete implementation to **add OpenTelemetry support** in a Grok agent, with settings saved to `.grok/settings.json`, tracking **sessions** and **agent output**.

---

## 1. Update `.grok/settings.json`

```json
{
  "telemetry": {
    "enabled": true,
    "exporter": "otlp",
    "endpoint": "http://localhost:4317",
    "service_name": "grok-agent",
    "service_version": "1.0.0",
    "trace_sample_ratio": 1.0
  }
}
```

> This file will be created/updated automatically on first use.

---

## 2. Install OpenTelemetry Dependencies

```bash
npm install @opentelemetry/api @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions
```

---

## 3. `telemetry.js` – OpenTelemetry Setup

```js
// telemetry.js
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import fs from 'fs';
import path from 'path';

const SETTINGS_PATH = path.join(process.cwd(), '.grok', 'settings.json');

class TelemetryManager {
  constructor() {
    this.provider = null;
    this.sessionSpan = null;
    this.settings = this.loadSettings();
  }

  loadSettings() {
    try {
      const data = fs.readFileSync(SETTINGS_PATH, 'utf8');
      const config = JSON.parse(data);
      return config.telemetry || {};
    } catch (err) {
      return { enabled: false };
    }
  }

  saveSettings() {
    const dir = path.dirname(SETTINGS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    const fullSettings = {
      telemetry: this.settings
    };

    fs.writeFileSync(SETTINGS_PATH, JSON.stringify(fullSettings, null, 2));
  }

  init() {
    if (!this.settings.enabled || this.provider) return;

    const exporter = new OTLPTraceExporter({
      url: this.settings.endpoint || 'http://localhost:4317/v1/traces',
    });

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.settings.service_name || 'grok-agent',
      [SemanticResourceAttributes.SERVICE_VERSION]: this.settings.service_version || '1.0.0',
    });

    this.provider = new NodeTracerProvider({
      resource,
      sampler: { shouldSample: () => Math.random() < (this.settings.trace_sample_ratio || 1.0) }
    });

    this.provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    this.provider.register();

    console.log('OpenTelemetry initialized');
  }

  startSession(sessionId) {
    if (!this.settings.enabled) return null;

    const { traceparent } = require('tracecontext');
    const tracer = this.provider.getTracer('grok-agent');

    this.sessionSpan = tracer.startSpan('session', {
      attributes: {
        'session.id': sessionId,
        'session.start_time': new Date().toISOString()
      }
    });

    return this.sessionSpan;
  }

  trackAgentOutput({ sessionId, output, model, tokens_used, duration_ms }) {
    if (!this.sessionSpan || !this.settings.enabled) return;

    const tracer = this.provider.getTracer('grok-agent');
    tracer.startActiveSpan('agent.output', (span) => {
      span.setAttributes({
        'session.id': sessionId,
        'agent.model': model,
        'agent.output.length': output.length,
        'agent.tokens_used': tokens_used,
        'agent.duration_ms': duration_ms,
      });
      span.end();
    });
  }

  endSession() {
    if (this.sessionSpan) {
      this.sessionSpan.setAttribute('session.end_time', new Date().toISOString());
      this.sessionSpan.end();
      this.sessionSpan = null;
    }
  }

  shutdown() {
    if (this.provider) {
      this.provider.shutdown().catch(console.error);
    }
  }
}

// Global instance
export const telemetry = new TelemetryManager();
```

---

## 4. Use in Agent (`agent.js`)

```js
// agent.js
import { telemetry } from './telemetry.js';
import { v4 as uuidv4 } from 'uuid';

export class GrokAgent {
  constructor() {
    telemetry.init(); // Auto-init from settings
    this.sessionId = null;
  }

  async run(prompt) {
    this.sessionId = uuidv4();
    telemetry.startSession(this.sessionId);

    const start = Date.now();

    // Simulate model call
    const output = await this.callModel(prompt);
    const duration = Date.now() - start;

    // Track output
    telemetry.trackAgentOutput({
      sessionId: this.sessionId,
      output,
      model: 'grok-beta',
      tokens_used: this.estimateTokens(output),
      duration_ms: duration
    });

    telemetry.endSession();
    return output;
  }

  async callModel(prompt) {
    // Mock LLM call
    await new Promise(r => setTimeout(r, 200));
    return `Response to: ${prompt}`;
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
}
```

---

## 5. CLI Command to Toggle Telemetry

```js
// cli.js
import { telemetry } from './telemetry.js';

if (process.argv[2] === 'telemetry' && process.argv[3] === 'enable') {
  telemetry.settings.enabled = true;
  telemetry.saveSettings();
  telemetry.init();
  console.log('Telemetry enabled');
}

if (process.argv[2] === 'telemetry' && process.argv[3] === 'disable') {
  telemetry.settings.enabled = false;
  telemetry.saveSettings();
  telemetry.shutdown();
  console.log('Telemetry disabled');
}
```

Run:
```bash
node cli.js telemetry enable
node cli.js telemetry disable
```

---

## What’s Tracked?

| Event | Span Name | Attributes |
|------|-----------|------------|
| Session start | `session` | `session.id`, `session.start_time` |
| Agent output | `agent.output` | `model`, `output.length`, `tokens_used`, `duration_ms` |
| Session end | — | `session.end_time` |

---

## Test with Collector (Optional)

Run Jaeger or OpenTelemetry Collector:

```yaml
# docker-compose.yml
services:
  otel-collector:
    image: otel/opentelemetry-collector
    command: ["--config=/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"  # OTLP gRPC
      - "4318:4318"  # OTLP HTTP
```

```yaml
# otel-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
      http:

exporters:
  logging:
    loglevel: debug

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [logging]
```

---

**Done!** Your Grok agent now supports **OpenTelemetry**, persists config in `.grok/settings.json`, and tracks **sessions + agent output**.

Let me know if you want **metrics** or **logs** support too.
