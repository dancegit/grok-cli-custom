import { MorphEditorTool } from "./morph-editor.js";
import { jest } from "@jest/globals";

// Mock fetch
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe("MorphEditorTool", () => {
  let tool: MorphEditorTool;

  beforeEach(() => {
    tool = new MorphEditorTool();
    jest.clearAllMocks();
  });

  describe("editFile", () => {
    it("should successfully edit file with valid response", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({
          success: true,
          result: "File edited successfully"
        })
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await tool.editFile("test.txt", "Add function", "function test() {}");

      expect(result.success).toBe(true);
      expect(result.output).toBe("File edited successfully");
      expect(global.fetch).toHaveBeenCalledWith("https://morph.fastapply.com/edit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer undefined" // MORPH_API_KEY not set in test
        },
        body: JSON.stringify({
          target_file: "test.txt",
          instructions: "Add function",
          code_edit: "function test() {}"
        })
      });
    });

    it("should handle API error", async () => {
      const mockResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: jest.fn().mockResolvedValue("Invalid request")
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await tool.editFile("test.txt", "Edit", "code");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Morph API error: 400 Bad Request");
    });

    it("should handle network error", async () => {
      (global.fetch as jest.Mock).mockRejectedValue(new Error("Network error"));

      const result = await tool.editFile("test.txt", "Edit", "code");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should handle malformed response", async () => {
      const mockResponse = {
        ok: true,
        json: jest.fn().mockResolvedValue({ invalid: "response" })
      };
      (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

      const result = await tool.editFile("test.txt", "Edit", "code");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid response from Morph API");
    });
  });
});