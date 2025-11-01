import { BashTool } from "./bash.js";
import { jest } from "@jest/globals";
import { exec } from "child_process";
import { promisify } from "util";

// Mock child_process
jest.mock("child_process");
jest.mock("util");

const mockedExec = exec as jest.MockedFunction<typeof exec>;
const mockedPromisify = promisify as jest.MockedFunction<typeof promisify>;

describe("BashTool", () => {
  let tool: BashTool;

  beforeEach(() => {
    tool = new BashTool();
    jest.clearAllMocks();
  });

  describe("execute", () => {
    it("should execute successful command", async () => {
      const mockResult = { stdout: "output", stderr: "" };
      mockedPromisify.mockReturnValue(jest.fn().mockResolvedValue(mockResult));

      const result = await tool.execute("ls -la");

      expect(result.success).toBe(true);
      expect(result.output).toBe("output");
    });

    it("should handle command with stderr", async () => {
      const mockResult = { stdout: "output", stderr: "warning" };
      mockedPromisify.mockReturnValue(jest.fn().mockResolvedValue(mockResult));

      const result = await tool.execute("command with warning");

      expect(result.success).toBe(true);
      expect(result.output).toBe("output\nwarning");
    });

    it("should handle command error", async () => {
      const mockError = new Error("Command failed");
      (mockError as any).stdout = "";
      (mockError as any).stderr = "error message";
      mockedPromisify.mockReturnValue(jest.fn().mockRejectedValue(mockError));

      const result = await tool.execute("invalid command");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Command failed");
    });

    it("should handle command with exit code", async () => {
      const mockError = new Error("Command failed");
      (mockError as any).code = 1;
      (mockError as any).stdout = "partial output";
      (mockError as any).stderr = "error";
      mockedPromisify.mockReturnValue(jest.fn().mockRejectedValue(mockError));

      const result = await tool.execute("failing command");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Command failed");
    });

    it("should get current directory", () => {
      const cwd = tool.getCurrentDirectory();
      expect(typeof cwd).toBe("string");
      expect(cwd.length).toBeGreaterThan(0);
    });
  });
});