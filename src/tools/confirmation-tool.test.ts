import { ConfirmationTool } from "./confirmation-tool.js";
import { describe, it, expect, beforeEach, mock } from "bun:test";

// Mock ConfirmationService
const mockConfirmationService = {
  getSessionFlags: mock(() => ({ allOperations: false, fileOperations: false, bashCommands: false })),
  requestConfirmation: mock(() => Promise.resolve({ confirmed: true, feedback: null, dontAskAgain: false }))
};

mock.module("../utils/confirmation-service.js", () => ({
  ConfirmationService: {
    getInstance: () => mockConfirmationService
  }
}));

describe("ConfirmationTool", () => {
  let tool: ConfirmationTool;

  beforeEach(() => {
    tool = new ConfirmationTool();
  });

  describe("confirm", () => {
    it("should return success when session flag is set for all operations", async () => {
      mockConfirmationService.getSessionFlags.mockReturnValue({ allOperations: true, fileOperations: false, bashCommands: false });

      const result = await tool.requestConfirmation({
        operation: "test",
        filename: "test.txt",
        description: "content"
      });

      expect(result.success).toBe(true);
    });

    it("should return success when session flag is set for file operations", async () => {
      mockConfirmationService.getSessionFlags.mockReturnValue({ allOperations: false, fileOperations: true, bashCommands: false });

      const result = await tool.requestConfirmation({
        operation: "test",
        filename: "test.txt",
        description: "content"
      });

      expect(result.success).toBe(true);
    });

    it("should return failure when no session flags are set and user rejects", async () => {
      mockConfirmationService.requestConfirmation.mockResolvedValue({ confirmed: false, feedback: "User rejected" });

      const result = await tool.requestConfirmation({
        operation: "test",
        filename: "test.txt",
        description: "content"
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("User rejected");
      expect(mockConfirmationService.requestConfirmation).toHaveBeenCalledWith({
        operation: "test",
        filename: "test.txt",
        content: "content",
        showVSCodeOpen: false
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

      await tool.requestConfirmation(params);

      expect(mockConfirm).toHaveBeenCalledWith({
        operation: "edit",
        filename: "script.js",
        content: "diff content",
        showVSCodeOpen: false
      }, "file");
    });
  });
});