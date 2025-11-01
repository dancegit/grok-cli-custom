import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { SettingsManager } from "./settings-manager.js";

describe("SettingsManager", () => {
  let manager: SettingsManager;
  let tempDir: string;
  let originalCwd: string;

  beforeEach(() => {
    manager = SettingsManager.getInstance();
    tempDir = path.join(os.tmpdir(), `grok-settings-test-${Date.now()}`);
    fs.mkdirSync(tempDir, { recursive: true });
    originalCwd = process.cwd();
    process.chdir(tempDir);

    // Mock the singleton to reset for each test
    (SettingsManager as any).instance = null;
    manager = SettingsManager.getInstance();
  });

  afterEach(() => {
    process.chdir(originalCwd);
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      // ignore
    }
    // Clean up user settings if created
    const userSettingsPath = path.join(os.homedir(), ".grok", "user-settings.json");
    try {
      if (fs.existsSync(userSettingsPath)) {
        fs.unlinkSync(userSettingsPath);
      }
    } catch (e) {
      // ignore
    }
  });

  describe("Project Settings Precedence", () => {
    it("should prioritize project model over user defaultModel", () => {
      // Set up user settings with a default model
      const userSettings = {
        apiKey: "test-key",
        defaultModel: "user-model",
        models: ["user-model", "project-model"]
      };
      manager.saveUserSettings(userSettings);

      // Set up project settings with a different model
      const projectSettings = {
        model: "project-model"
      };
      manager.saveProjectSettings(projectSettings);

      // The current model should be the project model
      const currentModel = manager.getCurrentModel();
      expect(currentModel).toBe("project-model");
    });

    it("should fall back to user defaultModel when no project model is set", () => {
      // Set up user settings with a default model
      const userSettings = {
        apiKey: "test-key",
        defaultModel: "user-model",
        models: ["user-model"]
      };
      manager.saveUserSettings(userSettings);

      // Project settings without model
      const projectSettings = {};
      manager.saveProjectSettings(projectSettings);

      // Should fall back to user default
      const currentModel = manager.getCurrentModel();
      expect(currentModel).toBe("user-model");
    });

    it("should fall back to system default when neither project nor user model is set", () => {
      // Minimal user settings
      const userSettings = {
        apiKey: "test-key"
      };
      manager.saveUserSettings(userSettings);

      // Project settings without model
      const projectSettings = {};
      manager.saveProjectSettings(projectSettings);

      // Should fall back to system default
      const currentModel = manager.getCurrentModel();
      expect(currentModel).toBe("grok-code-fast-1");
    });

    it("should load project baseURL over user baseURL", () => {
      // Set up user settings with baseURL
      const userSettings = {
        apiKey: "test-key",
        baseURL: "https://user.example.com"
      };
      manager.saveUserSettings(userSettings);

      // Set up project settings with different baseURL
      const projectSettings = {
        baseURL: "https://project.example.com"
      };
      manager.saveProjectSettings(projectSettings);

      // Should use project baseURL
      const baseURL = manager.getBaseURL();
      expect(baseURL).toBe("https://project.example.com");
    });

    it("should fall back to user baseURL when no project baseURL", () => {
      // Set up user settings with baseURL
      const userSettings = {
        apiKey: "test-key",
        baseURL: "https://user.example.com"
      };
      manager.saveUserSettings(userSettings);

      // Project settings without baseURL
      const projectSettings = {};
      manager.saveProjectSettings(projectSettings);

      // Should use user baseURL
      const baseURL = manager.getBaseURL();
      expect(baseURL).toBe("https://user.example.com");
    });
  });

  describe("API Key Priority", () => {
    it("should prioritize environment variable over settings", () => {
      // Mock environment variable
      const originalEnv = process.env.GROK_API_KEY;
      process.env.GROK_API_KEY = "env-key";

      // Set user settings with different key
      const userSettings = {
        apiKey: "settings-key"
      };
      manager.saveUserSettings(userSettings);

      const apiKey = manager.getApiKey();
      expect(apiKey).toBe("env-key");

      // Restore
      process.env.GROK_API_KEY = originalEnv;
    });

    it("should fall back to user settings when no env var", () => {
      // Clear env var
      const originalEnv = process.env.GROK_API_KEY;
      delete process.env.GROK_API_KEY;

      // Set user settings
      const userSettings = {
        apiKey: "settings-key"
      };
      manager.saveUserSettings(userSettings);

      const apiKey = manager.getApiKey();
      expect(apiKey).toBe("settings-key");

      // Restore
      process.env.GROK_API_KEY = originalEnv;
    });
  });
});