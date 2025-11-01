import { expect, test, describe, beforeAll, afterAll } from 'bun:test';
import { SlashCommandProcessor } from '../src/utils/slash-commands.js';
import * as fs from 'fs';
import * as path from 'path';

describe('Slash Commands', () => {
  let processor: SlashCommandProcessor;
  const testDir = path.join(process.cwd(), 'test-claude-dir');

  beforeAll(() => {
    // Create test .claude directory structure
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }

    const commandsDir = path.join(testDir, '.claude', 'commands');
    if (!fs.existsSync(commandsDir)) {
      fs.mkdirSync(commandsDir, { recursive: true });
    }

    const standardDir = path.join(commandsDir, 'standard');
    if (!fs.existsSync(standardDir)) {
      fs.mkdirSync(standardDir, { recursive: true });
    }

    // Create test command files
    fs.writeFileSync(path.join(commandsDir, 'prime.md'), `# Prime

**USAGE NOTE**: Test command for priming context.

$ARGUMENTS

## Overview

Test priming command.

## Step 1: Analyze Codebase Structure

Run \`git ls-files\` to understand the codebase structure.
`);

    fs.writeFileSync(path.join(standardDir, 'plan.md'), `# Planning Phase

Create an implementation plan WITHOUT implementing it.

## Description

This slash command maps to \`adw_plan_iso\` workflow for isolated planning.

## Arguments

$ARGUMENTS

## Instructions

Create a spec file and return the file path.

## Output

**CRITICAL**: Return ONLY the relative file path to the spec file created.

Example:
\`\`\`
specs/issue-123-adw-abc12345-sdlc_planner-brief-description.md
\`\`\`
`);

    fs.writeFileSync(path.join(commandsDir, 'feature.md'), `# Feature Implementation

Implement a new feature.

$ARGUMENT
`);

    processor = new SlashCommandProcessor(testDir);
  });

  test('should detect slash commands', () => {
    expect(processor.isSlashCommand('/prime')).toBe(true);
    expect(processor.isSlashCommand('/standard:plan')).toBe(true);
    expect(processor.isSlashCommand('regular text')).toBe(false);
  });

  test('should process /prime command', () => {
    const result = processor.processSlashCommand('/prime test args');
    expect(result.success).toBe(true);
    expect(result.processedPrompt).toContain('test args');
    expect(result.processedPrompt).toContain('git ls-files');
  });

  test('should process /standard:plan command', () => {
    const result = processor.processSlashCommand('/standard:plan issue-123 abc12345');
    expect(result.success).toBe(true);
    expect(result.processedPrompt).toContain('issue-123 abc12345');
    expect(result.processedPrompt).toContain('specs/issue-123-adw-abc12345');
  });

  test('should process /feature command', () => {
    const result = processor.processSlashCommand('/feature add user auth');
    expect(result.success).toBe(true);
    expect(result.processedPrompt).toContain('add user auth');
  });

  test('should return available commands', () => {
    const commands = processor.getAvailableCommands();
    expect(commands).toContain('prime');
    expect(commands).toContain('standard:plan');
    expect(commands).toContain('feature');
  });

  test('should return command suggestions', () => {
    const suggestions = processor.getCommandSuggestions();
    const primeSuggestion = suggestions.find(s => s.command === '/prime');
    expect(primeSuggestion).toBeDefined();
    expect(primeSuggestion?.description).toContain('Prime');

    const planSuggestion = suggestions.find(s => s.command === '/standard:plan');
    expect(planSuggestion).toBeDefined();
    expect(planSuggestion?.description).toContain('Planning Phase');
  });

  test('should handle missing command', () => {
    const result = processor.processSlashCommand('/nonexistent');
    expect(result.success).toBe(false);
    expect(result.error).toContain('not found');
    expect(result.availableCommands).toBeDefined();
  });

  test('should handle invalid command format', () => {
    const result = processor.processSlashCommand('/');
    expect(result.success).toBe(false);
    expect(result.error).toContain('Invalid slash command format');
  });

  test('should substitute TAC variables', () => {
    const result = processor.processSlashCommand('/feature test');
    expect(result.success).toBe(true);
    // The template has $ARGUMENT which should be replaced with args
    expect(result.processedPrompt).toContain('test');
  });

  // Cleanup
  test('should load real commands from project directory', () => {
    const realProcessor = new SlashCommandProcessor(process.cwd());
    const commands = realProcessor.getAvailableCommands();
    expect(commands).toContain('prime');
    expect(commands).toContain('standard:plan');
    expect(commands).toContain('feature');
  });
  afterAll(() => {
    try {
      fs.rmSync(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });
});