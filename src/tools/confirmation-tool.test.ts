import { ConfirmationTool } from "./confirmation-tool.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";

describe("ConfirmationTool", () => {
  let tool: ConfirmationTool;

  beforeEach(() => {
    tool = new ConfirmationTool();
  });

  describe("confirm", () => {
    it("should return true when session flag is set for all operations", async () => {
      (tool as any).sessionFlags = { allOperations: true, fileOperations: false };

      const result = await tool.confirm({
        operation: "test",
        filename: "test.txt",
        description: "content"
      });

      expect(result).toBe(true);
    });

    it("should return true when session flag is set for file operations", async () => {
      (tool as any).sessionFlags = { allOperations: false, fileOperations: true };

      const result = await tool.confirm({
        operation: "test",
        filename: "test.txt",
        description: "content"
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
        description: "content"
      });

      expect(result).toBe(false);
      expect(mockConfirm).toHaveBeenCalledWith({
        operation: "test",
        filename: "test.txt",
        description: "content",
        showVSCodeOpen: undefined,
        autoAccept: undefined
      }, "file");
    });

    it("should pass correct parameters to confirmation service", async () => {
      const mockConfirm = mock(() => Promise.resolve({ confirmed: true }));
      (tool as any).confirmationService = { requestConfirmation: mockConfirm };

      const params = {
        operation: "edit",
        filename: "script.js",
        description: "diff content"
      };

      await tool.confirm(params, "bash");

      expect(mockConfirm).toHaveBeenCalledWith({
        operation: "edit",
        filename: "script.js",
        description: "diff content",
        showVSCodeOpen: undefined,
        autoAccept: undefined
      }, "bash");
    });
  });
});