import { describe, it, expect, mock, beforeEach } from "bun:test";

// Mock fs-extra before any import
const pathExistsMock = mock();
const statMock = mock();
const readFileMock = mock();
const readdirMock = mock();
const ensureDirMock = mock();
const writeFileMock = mock();

mock.module("fs-extra", () => ({
  pathExists: pathExistsMock,
  stat: statMock,
  readFile: readFileMock,
  readdir: readdirMock,
  ensureDir: ensureDirMock,
  writeFile: writeFileMock,
}));

describe("TextEditorTool", () => {
  let tool: any;

  beforeEach(async () => {
    const module = await import("./text-editor.js");
    tool = new module.TextEditorTool();
  });

  describe("view", () => {
    it("should view file contents", async () => {
      const mockContent = "line1\nline2\nline3";
      pathExistsMock.mockResolvedValue(true);
      statMock.mockResolvedValue({ isDirectory: () => false } as any);
      readFileMock.mockResolvedValue(mockContent);

      const result = await tool.view("test.txt");

      expect(result.success).toBe(true);
      expect(result.output).toContain("Contents of test.txt");
      expect(result.output).toContain("1: line1");
      expect(result.output).toContain("2: line2");
      expect(result.output).toContain("3: line3");
      expect(readFileMock).toHaveBeenCalledWith("test.txt", "utf8");
    });

    it("should view directory contents", async () => {
      const mockFiles = ["file1.txt", "file2.txt"];
      pathExistsMock.mockResolvedValue(true);
      statMock.mockResolvedValue({ isDirectory: () => true } as any);
      readdirMock.mockResolvedValue(mockFiles as any);

      const result = await tool.view("testdir");

      expect(result.success).toBe(true);
      expect(result.output).toContain("Directory contents of testdir");
      expect(result.output).toContain("file1.txt");
      expect(result.output).toContain("file2.txt");
      expect(readdirMock).toHaveBeenCalledWith("testdir");
    });

    it("should handle file not found", async () => {
      pathExistsMock.mockResolvedValue(false);

      const result = await tool.view("nonexistent.txt");

      expect(result.success).toBe(false);
      expect(result.error).toContain("File or directory not found");
    });

    it("should view partial file with range", async () => {
      const mockContent = "line1\nline2\nline3\nline4";
      pathExistsMock.mockResolvedValue(true);
      statMock.mockResolvedValue({ isDirectory: () => false } as any);
      readFileMock.mockResolvedValue(mockContent);

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
      pathExistsMock.mockResolvedValue(false);
      ensureDirMock.mockResolvedValue();
      writeFileMock.mockResolvedValue();

      const result = await tool.create("newfile.txt", "content");

      expect(result.success).toBe(true);
      expect(result.output).toContain("Created newfile.txt");
      expect(ensureDirMock).toHaveBeenCalled();
      expect(writeFileMock).toHaveBeenCalledWith("newfile.txt", "content", "utf-8");
    });

    it("should handle creation error", async () => {
      pathExistsMock.mockResolvedValue(false);
      ensureDirMock.mockRejectedValue(new Error("Permission denied"));

      const result = await tool.create("newfile.txt", "content");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Error creating newfile.txt");
    });
  });

  describe("strReplace", () => {
    it("should replace text in file", async () => {
      const originalContent = "old text";
      const newContent = "new text";
      pathExistsMock.mockResolvedValue(true);
      readFileMock.mockResolvedValue(originalContent);

      const result = await tool.strReplace("test.txt", "old", "new");

      expect(result.success).toBe(true);
      expect(writeFileMock).toHaveBeenCalledWith("test.txt", newContent, "utf-8");
    });

    it("should handle string not found", async () => {
      pathExistsMock.mockResolvedValue(true);
      readFileMock.mockResolvedValue("content without target");

      const result = await tool.strReplace("test.txt", "notfound", "replacement");

      expect(result.success).toBe(false);
      expect(result.error).toContain("String not found in file");
      expect(writeFileMock).not.toHaveBeenCalled();
    });

    it("should replace all occurrences when replaceAll is true", async () => {
      const originalContent = "old old old";
      const expectedContent = "new new new";
      pathExistsMock.mockResolvedValue(true);
      readFileMock.mockResolvedValue(originalContent);

      const result = await tool.strReplace("test.txt", "old", "new", true);

      expect(result.success).toBe(true);
      expect(writeFileMock).toHaveBeenCalledWith("test.txt", expectedContent, "utf-8");
    });
  });

  describe("replaceLines", () => {
    it("should replace lines in file", async () => {
      const originalContent = "line1\nline2\nline3\nline4";
      const expectedContent = "line1\nnewcontent\nline4";
      pathExistsMock.mockResolvedValue(true);
      readFileMock.mockResolvedValue(originalContent);

      const result = await tool.replaceLines("test.txt", 2, 3, "newcontent");

      expect(result.success).toBe(true);
      expect(writeFileMock).toHaveBeenCalledWith("test.txt", expectedContent, "utf-8");
    });

    it("should handle invalid line range", async () => {
      pathExistsMock.mockResolvedValue(true);
      readFileMock.mockResolvedValue("line1\nline2");

      const result = await tool.replaceLines("test.txt", 1, 10, "content");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Invalid end line");
      expect(writeFileMock).not.toHaveBeenCalled();
    });
  });

  describe("insert", () => {
    it("should insert content at line", async () => {
      const originalContent = "line1\nline3";
      const expectedContent = "line1\ninserted\nline3";
      pathExistsMock.mockResolvedValue(true);
      readFileMock.mockResolvedValue(originalContent);

      const result = await tool.insert("test.txt", 2, "inserted");

      expect(result.success).toBe(true);
      expect(writeFileMock).toHaveBeenCalledWith("test.txt", expectedContent, "utf-8");
    });
  });

  describe("undoEdit", () => {
    it("should undo last edit", async () => {
      // First create a file
      pathExistsMock.mockResolvedValue(true);
      readFileMock.mockResolvedValue("old");
      await tool.strReplace("test.txt", "old", "new");

      // Then undo
      readFileMock.mockResolvedValue("new");

      const result = await tool.undoEdit();

      expect(result.success).toBe(true);
      expect(result.output).toContain("Successfully undid str_replace operation");
      expect(writeFileMock).toHaveBeenCalledWith("test.txt", "old", "utf-8");
    });

    it("should handle no edits to undo", async () => {
      const result = await tool.undoEdit();

      expect(result.success).toBe(false);
      expect(result.error).toContain("No edits to undo");
    });
  });
});
