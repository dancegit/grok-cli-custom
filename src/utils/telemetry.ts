import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getSettingsManager, TelemetrySettings } from './settings-manager';

const SETTINGS_PATH = path.join(process.cwd(), '.grok', 'settings.json');

export interface TelemetryConfig extends TelemetrySettings {
  enabled: boolean;
  exporter: string;
  endpoint: string;
  service_name: string;
  service_version: string;
  trace_sample_ratio: number;
}

class TelemetryManager {
  private provider: NodeTracerProvider | null = null;
  private sessionSpan: any = null;
  private settings: TelemetryConfig;

  constructor() {
    this.settings = this.loadSettings();
  }

  private loadSettings(): TelemetryConfig {
    try {
      const manager = getSettingsManager();
      const telemetry = manager.getProjectSetting('telemetry') || {};
      return {
        enabled: telemetry.enabled ?? false,
        exporter: telemetry.exporter || 'otlp',
        endpoint: telemetry.endpoint || 'http://localhost:4317',
        service_name: telemetry.service_name || 'grok-agent',
        service_version: telemetry.service_version || '1.0.0',
        trace_sample_ratio: telemetry.trace_sample_ratio ?? 1.0,
      };
    } catch (err) {
      return {
        enabled: false,
        exporter: 'otlp',
        endpoint: 'http://localhost:4317',
        service_name: 'grok-agent',
        service_version: '1.0.0',
        trace_sample_ratio: 1.0,
      };
    }
  }

  private saveSettings(): void {
    try {
      const manager = getSettingsManager();
      manager.updateProjectSetting('telemetry', {
        enabled: this.settings.enabled,
        exporter: this.settings.exporter,
        endpoint: this.settings.endpoint,
        service_name: this.settings.service_name,
        service_version: this.settings.service_version,
        trace_sample_ratio: this.settings.trace_sample_ratio,
      });
    } catch (error) {
      console.warn('Failed to save telemetry settings:', error);
    }
  }

  init(): void {
    if (!this.settings.enabled || this.provider) return;

    const exporter = new OTLPTraceExporter({
      url: this.settings.endpoint + '/v1/traces',
    });

    const resource = new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: this.settings.service_name,
      [SemanticResourceAttributes.SERVICE_VERSION]: this.settings.service_version,
    });

    this.provider = new NodeTracerProvider({
      resource,
      sampler: { shouldSample: () => Math.random() < this.settings.trace_sample_ratio }
    });

    this.provider.addSpanProcessor(new SimpleSpanProcessor(exporter));
    this.provider.register();

    console.log('OpenTelemetry initialized');
  }

  startSession(sessionId?: string): string {
    if (!this.settings.enabled) return sessionId || uuidv4();

    const sid = sessionId || uuidv4();
    const tracer = this.provider!.getTracer('grok-agent');

    this.sessionSpan = tracer.startSpan('session', {
      attributes: {
        'session.id': sid,
        'session.start_time': new Date().toISOString()
      }
    });

    return sid;
  }

  trackAgentOutput({
    sessionId,
    output,
    model,
    tokens_used,
    duration_ms
  }: {
    sessionId: string;
    output: string;
    model: string;
    tokens_used: number;
    duration_ms: number;
  }): void {
    if (!this.sessionSpan || !this.settings.enabled) return;

    const tracer = this.provider!.getTracer('grok-agent');
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

  endSession(): void {
    if (this.sessionSpan) {
      this.sessionSpan.setAttribute('session.end_time', new Date().toISOString());
      this.sessionSpan.end();
      this.sessionSpan = null;
    }
  }

  updateSettings(newSettings: Partial<TelemetryConfig>): void {
    this.settings = { ...this.settings, ...newSettings };
    this.saveSettings();
    if (this.settings.enabled && !this.provider) {
      this.init();
    } else if (!this.settings.enabled && this.provider) {
      this.shutdown();
    }
  }

  getSettings(): TelemetryConfig {
    return { ...this.settings };
  }

  shutdown(): void {
    if (this.provider) {
      this.provider.shutdown().catch(console.error);
      this.provider = null;
    }
  }
}

// Global instance
export const telemetryManager = new TelemetryManager();