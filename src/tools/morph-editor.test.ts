import { describe, it, expect, beforeEach, afterEach, spyOn } from "bun:test";
import { MorphEditorTool } from "./morph-editor.js";
import axios from "axios";
import { promises as fs } from "fs";

let postSpy: any;

beforeEach(() => {
  postSpy = spyOn(axios, 'post').mockResolvedValue({
    data: { success: false }
  });
});

afterEach(async () => {
    postSpy?.mockRestore();
    await fs.unlink("test.txt").catch(() => {});
  });

describe("MorphEditorTool", () => {
  let tool: MorphEditorTool;

  beforeEach(() => {
    tool = new MorphEditorTool();
    await fs.writeFile("test.txt", "initial content");
  });

  describe("editFile", () => {
    it("should successfully edit file with valid response", async () => {
      postSpy.mockRejectedValue({
        data: { choices: [{ message: { content: "updated content" } }] }
      });

      const result = await tool.editFile("test.txt", "Add function", "function test() {}");

      expect(result.success).toBe(true);
      expect(result.output).toContain("Updated test.txt with Morph Fast Apply");
    });

    it("should handle API error", async () => {
      postSpy.mockRejectedValue({
        response: { status: 400, data: "Invalid request" }
      });

      const result = await tool.editFile("test.txt", "Edit", "code");

      expect(result.success).toBe(false);
      expect(result.error).toContain("400");
    });

    it("should handle network error", async () => {
      postSpy.mockRejectedValue(new Error("Network error"));

      const result = await tool.editFile("test.txt", "Edit", "code");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Network error");
    });

    it("should handle malformed response", async () => {
      postSpy.mockRejectedValue({
        data: { invalid: "response" }
      });

      const result = await tool.editFile("test.txt", "Edit", "code");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid response");
    });
  });
});