import { TextEditorTool } from "./text-editor.js";
import { describe, it, expect, mock, beforeEach } from "bun:test";
import fs from "fs-extra";
import * as path from "path";

// Mock fs-extra and path
mock.module("fs-extra", () => ({
  pathExists: mock(),
  stat: mock(),
  readFile: mock(),
  readdir: mock(),
  ensureDir: mock(),
  writeFile: mock(),
}));
mock.module("path", () => ({
  dirname: mock(),
}));

const mockedFs = fs as any;
const mockedPath = path as any;

describe("TextEditorTool", () => {
  let tool: TextEditorTool;

  beforeEach(() => {
    tool = new TextEditorTool();
    
  });

  describe("view", () => {
    it("should view file contents", async () => {
      const mockContent = "line1\nline2\nline3";
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(true);
      mockedFs.stat.mockImplementation(() => Promise.resolve({ isDirectory: () => false } as any);
      mockedFs.readFile.mockImplementation(() => Promise.resolve(mockContent);

      const result = await tool.view("test.txt");

      expect(result.success).toBe(true);
      expect(result.output).toContain("Contents of test.txt");
      expect(result.output).toContain("1: line1");
      expect(result.output).toContain("2: line2");
      expect(result.output).toContain("3: line3");
    });

    it("should view directory contents", async () => {
      const mockFiles = ["file1.txt", "file2.txt"];
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(true);
      mockedFs.stat.mockImplementation(() => Promise.resolve({ isDirectory: () => true } as any);
      mockedFs.readdir.mockImplementation(() => Promise.resolve(mockFiles as any);

      const result = await tool.view("testdir");

      expect(result.success).toBe(true);
      expect(result.output).toContain("Directory contents of testdir");
      expect(result.output).toContain("file1.txt");
      expect(result.output).toContain("file2.txt");
    });

    it("should handle file not found", async () => {
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(false);

      const result = await tool.view("nonexistent.txt");

      expect(result.success).toBe(false);
      expect(result.error).toContain("File or directory not found");
    });

    it("should view partial file with range", async () => {
      const mockContent = "line1\nline2\nline3\nline4";
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(true);
      mockedFs.stat.mockImplementation(() => Promise.resolve({ isDirectory: () => false } as any);
      mockedFs.readFile.mockImplementation(() => Promise.resolve(mockContent);

      const result = await tool.view("test.txt", [2, 3]);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Lines 2-3 of test.txt");
      expect(result.output).toContain("2: line2");
      expect(result.output).toContain("3: line3");
      expect(result.output).not.toContain("line1");
      expect(result.output).not.toContain("line4");
    });
  });

  describe("create", () => {
    it("should create a new file", async () => {
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(false);
      mockedFs.ensureDir.mockImplementation(() => Promise.resolve();
      mockedFs.writeFile.mockImplementation(() => Promise.resolve();

      const result = await tool.create("newfile.txt", "content");

      expect(result.success).toBe(true);
      expect(result.output).toContain("Created newfile.txt");
      expect(mockedFs.ensureDir).toHaveBeenCalled();
      expect(mockedFs.writeFile).toHaveBeenCalledWith("newfile.txt", "content", "utf-8");
    });

    it("should handle creation error", async () => {
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(false);
      mockedFs.ensureDir.mockImplementation(() => Promise.reject(new Error("Permission denied"));

      const result = await tool.create("newfile.txt", "content");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Error creating newfile.txt");
    });
  });

  describe("strReplace", () => {
    it("should replace text in file", async () => {
      const originalContent = "old text";
      const newContent = "new text";
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(true);
      mockedFs.readFile.mockImplementation(() => Promise.resolve(originalContent);

      const result = await tool.strReplace("test.txt", "old", "new");

      expect(result.success).toBe(true);
      expect(mockedFs.writeFile).toHaveBeenCalledWith("test.txt", newContent, "utf-8");
    });

    it("should handle string not found", async () => {
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(true);
      mockedFs.readFile.mockImplementation(() => Promise.resolve("content without target");

      const result = await tool.strReplace("test.txt", "notfound", "replacement");

      expect(result.success).toBe(false);
      expect(result.error).toContain("String not found in file");
    });

    it("should replace all occurrences when replaceAll is true", async () => {
      const originalContent = "old old old";
      const expectedContent = "new new new";
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(true);
      mockedFs.readFile.mockImplementation(() => Promise.resolve(originalContent);

      const result = await tool.strReplace("test.txt", "old", "new", true);

      expect(result.success).toBe(true);
      expect(mockedFs.writeFile).toHaveBeenCalledWith("test.txt", expectedContent, "utf-8");
    });
  });

  describe("replaceLines", () => {
    it("should replace lines in file", async () => {
      const originalContent = "line1\nline2\nline3\nline4";
      const expectedContent = "line1\nnewcontent\nline4";
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(true);
      mockedFs.readFile.mockImplementation(() => Promise.resolve(originalContent);

      const result = await tool.replaceLines("test.txt", 2, 3, "newcontent");

      expect(result.success).toBe(true);
      expect(mockedFs.writeFile).toHaveBeenCalledWith("test.txt", expectedContent, "utf-8");
    });

    it("should handle invalid line range", async () => {
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(true);
      mockedFs.readFile.mockImplementation(() => Promise.resolve("line1\nline2");

      const result = await tool.replaceLines("test.txt", 1, 10, "content");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid end line");
    });
  });

  describe("insert", () => {
    it("should insert content at line", async () => {
      const originalContent = "line1\nline3";
      const expectedContent = "line1\ninserted\nline3";
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(true);
      mockedFs.readFile.mockImplementation(() => Promise.resolve(originalContent);

      const result = await tool.insert("test.txt", 2, "inserted");

      expect(result.success).toBe(true);
      expect(mockedFs.writeFile).toHaveBeenCalledWith("test.txt", expectedContent, "utf-8");
    });
  });

  describe("undoEdit", () => {
    it("should undo last edit", async () => {
      // First create a file
      mockedFs.pathExists.mockImplementation(() => Promise.resolve(true);
      mockedFs.readFile.mockImplementation(() => Promise.resolve("old");
      await tool.strReplace("test.txt", "old", "new");

      // Then undo
      mockedFs.readFile.mockImplementation(() => Promise.resolve("new");

      const result = await tool.undoEdit();

      expect(result.success).toBe(true);
      expect(result.output).toContain("Successfully undid str_replace operation");
      expect(mockedFs.writeFile).toHaveBeenCalledWith("test.txt", "old", "utf-8");
    });

    it("should handle no edits to undo", async () => {
      const result = await tool.undoEdit();

      expect(result.success).toBe(false);
      expect(result.error).toContain("No edits to undo");
    });
  });
});