import { describe, it, expect, beforeEach, spyOn, afterEach } from "bun:test";
import { MorphEditorTool } from "./morph-editor.js";

let fetchSpy: any;

beforeEach(() => {
  fetchSpy = spyOn(global, 'fetch').mockResolvedValue({
    ok: false,
    status: 500,
    text: () => Promise.resolve('Server error')
  } as Response);
});

afterEach(() => fetchSpy?.mockRestore());

describe("MorphEditorTool", () => {
  let tool: MorphEditorTool;

  beforeEach(() => {
    tool = new MorphEditorTool();
  });

  describe("editFile", () => {
    it("should successfully edit file with valid response", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          success: true,
          result: "File edited successfully"
        })
      } as Response);

      const result = await tool.editFile("test.txt", "Add function", "function test() {}");

      expect(result.success).toBe(true);
      expect(result.output).toBe("File edited successfully");
      expect(fetchSpy).toHaveBeenCalledWith("https://morph.fastapply.com/edit", {
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
      fetchSpy.mockResolvedValue({
        ok: false,
        status: 400,
        statusText: "Bad Request",
        text: () => Promise.resolve("Invalid request")
      } as Response);

      const result = await tool.editFile("test.txt", "Edit", "code");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Morph API error: 400 Bad Request");
    });

    it("should handle network error", async () => {
      fetchSpy.mockRejectedValue(new Error("Network error"));

      const result = await tool.editFile("test.txt", "Edit", "code");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should handle malformed response", async () => {
      fetchSpy.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ invalid: "response" })
      } as Response);

      const result = await tool.editFile("test.txt", "Edit", "code");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid response from Morph API");
    });
  });
});