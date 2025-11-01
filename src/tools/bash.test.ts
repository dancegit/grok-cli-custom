// Mock child_process and util
const execMock = mock();

mock.module("child_process", () => ({
  exec: execMock
}));

import { describe, it, expect, mock, beforeEach, spyOn } from "bun:test";
import { BashTool, execAsync } from "./bash.js";

// Mock ConfirmationService
const confirmMock = mock(() => Promise.resolve({ confirmed: true, feedback: null }));

mock.module("../utils/confirmation-service.js", () => ({
  ConfirmationService: {
    getInstance: () => ({
      getSessionFlags: () => ({ bashCommands: true, allOperations: false }),
      requestConfirmation: confirmMock
    })
  }
}));


describe("BashTool", () => {
  let tool: BashTool;

  beforeEach(() => {
    tool = new BashTool();
    execMock.mockReset();
  });

  describe("execute", () => {
    it("should execute successful command", async () => {
      const mockResult = { stdout: "output", stderr: "" };
      execMock.mockImplementation((command, options, callback) => callback(null, mockResult));

      const result = await tool.execute("ls -la");

      expect(result.success).toBe(true);
      expect(result.output).toBe("output");
    });

    it("should handle command with stderr", async () => {
      const mockResult = { stdout: "output", stderr: "warning" };
      execMock.mockImplementation((command, options, callback) => callback(null, mockResult));

      const result = await tool.execute("command with warning");

      expect(result.success).toBe(true);
      expect(result.output).toBe("output\nSTDERR: warning");
    });

    it("should handle command error", async () => {
      const mockError = new Error("Command failed");
      (mockError as any).stdout = "";
      (mockError as any).stderr = "error message";
      execMock.mockImplementation((command, options, callback) => callback(mockError));

      const result = await tool.execute("invalid command");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Command failed");
    });

    it("should handle command with exit code", async () => {
      const mockError = new Error("Command failed");
      (mockError as any).code = 1;
      (mockError as any).stdout = "partial output";
      (mockError as any).stderr = "error";
      execMock.mockImplementation((command, options, callback) => callback(mockError));

      const result = await tool.execute("failing command");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Command failed");
    });

    it("should get current directory", () => {
      const cwd = tool.getCurrentDirectory();
      expect(typeof cwd).toBe("string");
      expect(cwd.length).toBeGreaterThan(0);
    });
  });
});

