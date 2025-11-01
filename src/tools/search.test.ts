import { SearchTool } from "./search.js";

import * as fs from "fs";
import { glob } from "glob";
import * as path from "path";

// Mock dependencies
 
jest.mock("glob");
jest.mock("path");

const mockedFs = fs as jest.Mocked<typeof fs>;
const mockedGlob = glob as jest.MockedFunction<typeof glob>;
const mockedPath = path as jest.Mocked<typeof path>;

describe("SearchTool", () => {
  let tool: SearchTool;

  beforeEach(() => {
    tool = new SearchTool();
    jest.clearAllMocks();
  });

  describe("search", () => {
    it("should search for text in files", async () => {
      const mockFiles = ["file1.txt", "file2.txt"];
      const mockContent1 = "content with search term";
      const mockContent2 = "other content";

      mockedGlob.mockResolvedValue(mockFiles);
      mockedFs.readFile
        .mockResolvedValueOnce(mockContent1)
        .mockResolvedValueOnce(mockContent2);
      mockedFs.stat.mockResolvedValue({ size: 100 } as any);

      const result = await tool.search("search term");

      expect(result.success).toBe(true);
      expect(result.output).toContain("Found 1 match");
      expect(result.output).toContain("file1.txt");
      expect(result.output).toContain("content with search term");
    });

    it("should handle files search", async () => {
      const mockFiles = ["test.txt", "script.js", "data.json"];

      mockedGlob.mockResolvedValue(mockFiles);

      const result = await tool.search("*.txt", { searchType: "files" });

      expect(result.success).toBe(true);
      expect(result.output).toContain("test.txt");
      expect(result.output).toContain("script.js");
      expect(result.output).toContain("data.json");
    });

    it("should handle regex search", async () => {
      const mockFiles = ["file1.txt"];
      const mockContent = "test123 and test456";

      mockedGlob.mockResolvedValue(mockFiles);
      mockedFs.readFile.mockResolvedValue(mockContent);
      mockedFs.stat.mockResolvedValue({ size: 100 } as any);

      const result = await tool.search("test\\d+", { regex: true });

      expect(result.success).toBe(true);
      expect(result.output).toContain("Found 2 matches");
    });

    it("should handle case sensitive search", async () => {
      const mockFiles = ["file1.txt"];
      const mockContent = "Test and test";

      mockedGlob.mockResolvedValue(mockFiles);
      mockedFs.readFile.mockResolvedValue(mockContent);
      mockedFs.stat.mockResolvedValue({ size: 100 } as any);

      const result = await tool.search("Test", { caseSensitive: true });

      expect(result.success).toBe(true);
      expect(result.output).toContain("Found 1 match");
    });

    it("should handle whole word search", async () => {
      const mockFiles = ["file1.txt"];
      const mockContent = "test testing tester";

      mockedGlob.mockResolvedValue(mockFiles);
      mockedFs.readFile.mockResolvedValue(mockContent);
      mockedFs.stat.mockResolvedValue({ size: 100 } as any);

      const result = await tool.search("test", { wholeWord: true });

      expect(result.success).toBe(true);
      expect(result.output).toContain("Found 1 match");
    });

    it("should limit results", async () => {
      const mockFiles = Array.from({ length: 100 }, (_, i) => `file${i}.txt`);
      const mockContent = "search term";

      mockedGlob.mockResolvedValue(mockFiles);
      mockedFs.readFile.mockResolvedValue(mockContent);
      mockedFs.stat.mockResolvedValue({ size: 100 } as any);

      const result = await tool.search("search term", { maxResults: 5 });

      expect(result.success).toBe(true);
      expect(result.output).toContain("Found 5 matches (limited)");
    });

    it("should filter by file types", async () => {
      const mockFiles = ["test.js", "test.txt", "test.json"];

      mockedGlob.mockResolvedValue(mockFiles);

      const result = await tool.search("test", {
        searchType: "files",
        fileTypes: ["js", "json"]
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("test.js");
      expect(result.output).toContain("test.json");
      expect(result.output).not.toContain("test.txt");
    });

    it("should handle include pattern", async () => {
      const mockFiles = ["src/test.js", "lib/test.js"];

      mockedGlob.mockResolvedValue(mockFiles);

      const result = await tool.search("test", {
        searchType: "files",
        includePattern: "src/**"
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("src/test.js");
      expect(result.output).not.toContain("lib/test.js");
    });

    it("should handle exclude pattern", async () => {
      const mockFiles = ["src/test.js", "node_modules/test.js"];

      mockedGlob.mockResolvedValue(mockFiles);

      const result = await tool.search("test", {
        searchType: "files",
        excludePattern: "node_modules/**"
      });

      expect(result.success).toBe(true);
      expect(result.output).toContain("src/test.js");
      expect(result.output).not.toContain("node_modules/test.js");
    });

    it("should handle no matches found", async () => {
      mockedGlob.mockResolvedValue([]);

      const result = await tool.search("nonexistent");

      expect(result.success).toBe(true);
      expect(result.output).toContain("No matches found");
    });

    it("should handle search error", async () => {
      mockedGlob.mockRejectedValue(new Error("Search failed"));

      const result = await tool.search("query");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Search failed");
    });

    it("should handle file read error", async () => {
      const mockFiles = ["file1.txt"];

      mockedGlob.mockResolvedValue(mockFiles);
      mockedFs.readFile.mockRejectedValue(new Error("Read failed"));
      mockedFs.stat.mockResolvedValue({ size: 100 } as any);

      const result = await tool.search("query");

      expect(result.success).toBe(true);
      // Should continue with other files or report error
    });
  });
});