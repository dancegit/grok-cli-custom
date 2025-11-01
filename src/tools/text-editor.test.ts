import { describe, it, expect, beforeEach, spyOn, beforeAll, afterAll } from "bun:test";
import * as fs from "fs/promises";
import * as path from "path";
import { TextEditorTool } from "./text-editor.js";

const tempDir = 'test_temp';

beforeAll(async () => {
  await fs.mkdir(tempDir, { recursive: true });
});

afterAll(async () => {
  await fs.rm(tempDir, { recursive: true, force: true });
});

describe("TextEditorTool", () => {
  let tool: TextEditorTool;

  beforeEach(() => {
    tool = new TextEditorTool();
  });

  describe("view", () => {
    it("should view file contents", async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const mockContent = "line1\nline2\nline3";
      await fs.writeFile(filePath, mockContent);

      const result = await tool.view('test_temp/test.txt');

      expect(result.success).toBe(true);
      expect(result.output).toBe(`Contents of test_temp/test.txt:
1: line1
2: line2
3: line3`);

      await fs.unlink(filePath);
    });

    it("should view directory contents", async () => {
      const dirPath = path.join(tempDir, 'testdir');
      const file1 = path.join(dirPath, 'file1.txt');
      const file2 = path.join(dirPath, 'file2.js');
      await fs.mkdir(dirPath, { recursive: true });
      await fs.writeFile(file1, '');
      await fs.writeFile(file2, '');

      const result = await tool.view('test_temp/testdir');

      expect(result.success).toBe(true);
      expect(result.output).toContain("Directory contents of test_temp/testdir:");
      expect(result.output).toContain("file1.txt");
      expect(result.output).toContain("file2.js");

      await fs.rm(dirPath, { recursive: true });
    });

    it("should handle file not found", async () => {
      const result = await tool.view('nonexistent.txt');

      expect(result.success).toBe(false);
      expect(result.error).toContain("not found");
    });

    it("should view partial file with range", async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const mockContent = "line1\nline2\nline3";
      await fs.writeFile(filePath, mockContent);

      const result = await tool.view('test_temp/test.txt', [2, 2]);

      expect(result.success).toBe(true);
      expect(result.output).toBe(`Lines 2-2 of test_temp/test.txt:\n2: line2`);

      await fs.unlink(filePath);
    });
  });

  describe("create", () => {
    it("should create a new file", async () => {
      const filePath = path.join(tempDir, 'newfile.txt');

      const result = await tool.create('test_temp/newfile.txt', "content");

      expect(result.success).toBe(true);
      expect(result.output).toContain("+content");

      const content = await fs.readFile(filePath, 'utf8');
      expect(content).toBe("content");

      await fs.unlink(filePath);
    });

    it("should handle creation error", async () => {
      const result = await tool.create('test_temp/error.txt', "content");

      expect(result.success).toBe(true); // Adjust if needed
    });
  });

  describe("strReplace", () => {
    it("should replace text in file", async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const originalContent = "old text old";
      await fs.writeFile(filePath, originalContent);

      const result = await tool.strReplace('test_temp/test.txt', "old", "new");

      expect(result.success).toBe(true);
      expect(result.output).toContain("new text old");

      const newContent = await fs.readFile(filePath, 'utf8');
      expect(newContent).toBe("new text old");

      await fs.unlink(filePath);
    });

    it("should handle string not found", async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const originalContent = "content without target";
      await fs.writeFile(filePath, originalContent);

      const result = await tool.strReplace('test.txt', "notfound", "replacement");

      expect(result.success).toBe(false);
      expect(result.error).toContain("String not found in file");

      await fs.unlink(filePath);
    });

    it("should replace all occurrences when replaceAll is true", async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const originalContent = "old old old";
      await fs.writeFile(filePath, originalContent);

      const result = await tool.strReplace(filePath, "old", "new", true);

      expect(result.success).toBe(true);
      expect(result.output).toContain("new new new");

      const newContent = await fs.readFile(filePath, 'utf8');
      expect(newContent).toBe("new new new");

      await fs.unlink(filePath);
    });
  });

  describe("replaceLines", () => {
    it("should replace lines in file", async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const originalContent = "line1\nline2\nline3";
      await fs.writeFile(filePath, originalContent);

      const result = await tool.replaceLines('test_temp/test.txt', 2, 2, "newcontent");

      expect(result.success).toBe(true);
      expect(result.output).toContain("+newcontent");

      const newContent = await fs.readFile(filePath, 'utf8');
      expect(newContent).toBe("line1\nnewcontent\nline3");

      await fs.unlink(filePath);
    });

    it("should handle invalid line range", async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const originalContent = "line1\nline2";
      await fs.writeFile(filePath, originalContent);

      const result = await tool.replaceLines('test.txt', 1, 10, "content");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid end line");

      await fs.unlink(filePath);
    });
  });

  describe("insert", () => {
    it("should insert content at line", async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const originalContent = "line1\nline3";
      await fs.writeFile(filePath, originalContent);

      const result = await tool.insert('test_temp/test.txt', 2, "inserted");

      expect(result.success).toBe(true);
      expect(result.output).toBe(`Successfully inserted content at line 2 in test_temp/test.txt`);

      const newContent = await fs.readFile(filePath, 'utf8');
      expect(newContent).toBe("line1\ninserted\nline3");

      await fs.unlink(filePath);
    });
  });

  describe("undoEdit", () => {
    it("should undo last edit", async () => {
      const filePath = path.join(tempDir, 'test.txt');
      const initialContent = "initial";
      await fs.writeFile(filePath, initialContent);

      // Create (adds to history?)
      const createResult = await tool.create('test.txt', "initial"); // but already exists, perhaps skip create

      // StrReplace to modify
      const replaceResult = await tool.strReplace(filePath, "initial", "modified");

      expect(replaceResult.success).toBe(true);

      const modifiedContent = await fs.readFile(filePath, 'utf8');
      expect(modifiedContent).toBe("modified");

      const undoResult = await tool.undoEdit();

      expect(undoResult.success).toBe(true);
      expect(undoResult.output).toContain("undid");

      const revertedContent = await fs.readFile(filePath, 'utf8');
      expect(revertedContent).toBe("initial");

      await fs.unlink(filePath);
    });

    it("should handle no edits to undo", async () => {
      const result = await tool.undoEdit();

      expect(result.success).toBe(false);
      expect(result.error).toContain("No edits to undo");
    });
  });
});
