import { ConfirmationTool } from "./confirmation-tool.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";

describe("ConfirmationTool", () => {
  let tool: ConfirmationTool;

  beforeEach(() => {
    tool = new ConfirmationTool();
  });

  describe("confirm", () => {
    it("should return true when session flag is set for all operations", async () => {
      tool.setSessionFlag("allOperations", true);

      const result = await tool.confirm({
        operation: "test",
        filename: "test.txt",
        content: "content"
      });

      expect(result).toBe(true);
    });

    it("should return true when session flag is set for file operations", async () => {
      tool.setSessionFlag("fileOperations", true);

      const result = await tool.confirm({
        operation: "test",
        filename: "test.txt",
        content: "content"
      }, "file");

      expect(result).toBe(true);
    });

    it("should return false when no session flags are set", async () => {
      // Mock the confirmation service to return false
      const mockConfirm = mock(() => Promise.resolve({ confirmed: false, feedback: "User rejected" }));
      (tool as any).confirmationService = { requestConfirmation: mockConfirm };

      const result = await tool.confirm({
        operation: "test",
        filename: "test.txt",
        content: "content"
      });

      expect(result).toBe(false);
      expect(mockConfirm).toHaveBeenCalledWith({
        operation: "test",
        filename: "test.txt",
        content: "content"
      }, "file");
    });

    it("should pass correct parameters to confirmation service", async () => {
      const mockConfirm = mock(() => Promise.resolve({ confirmed: true }));
      (tool as any).confirmationService = { requestConfirmation: mockConfirm };

      const params = {
        operation: "edit",
        filename: "script.js",
        content: "diff content"
      };

      await tool.confirm(params, "bash");

      expect(mockConfirm).toHaveBeenCalledWith(params, "bash");
    });
  });

  describe("setSessionFlag", () => {
    it("should set session flags", () => {
      tool.setSessionFlag("allOperations", true);
      tool.setSessionFlag("fileOperations", false);

      // Check that the flags are set (accessing private property for testing)
      expect((tool as any).sessionFlags.allOperations).toBe(true);
      expect((tool as any).sessionFlags.fileOperations).toBe(false);
    });
  });

  describe("getSessionFlags", () => {
    it("should return current session flags", () => {
      tool.setSessionFlag("allOperations", true);

      const flags = tool.getSessionFlags();

      expect(flags.allOperations).toBe(true);
      expect(flags.fileOperations).toBe(false); // default
    });
  });
});