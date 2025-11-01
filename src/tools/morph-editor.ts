import * as fs from "@bearz/fs";
import * as path from "path";
import axios from "axios";
import { ToolResult } from "../types/index.js";
import { ConfirmationService } from "../utils/confirmation-service.js";

export class MorphEditorTool {
  private confirmationService = ConfirmationService.getInstance();
  private morphApiKey: string;
  private morphBaseUrl: string = "https://api.morphllm.com/v1";

  constructor(apiKey?: string) {
    this.morphApiKey = apiKey || process.env.MORPH_API_KEY || "";
    if (!this.morphApiKey) {
      console.warn("MORPH_API_KEY not found. Morph editor functionality will be limited.");
    }
  }

  /**
   * Use this tool to make an edit to an existing file.
   * 
   * This will be read by a less intelligent model, which will quickly apply the edit. You should make it clear what the edit is, while also minimizing the unchanged code you write.
   * When writing the edit, you should specify each edit in sequence, with the special comment // ... existing code ... to represent unchanged code in between edited lines.
   * 
   * For example:
   * 
   * // ... existing code ...
   * FIRST_EDIT
   * // ... existing code ...
   * SECOND_EDIT
   * // ... existing code ...
   * THIRD_EDIT
   * // ... existing code ...
   * 
   * You should still bias towards repeating as few lines of the original file as possible to convey the change.
   * But, each edit should contain sufficient context of unchanged lines around the code you're editing to resolve ambiguity.
   * DO NOT omit spans of pre-existing code (or comments) without using the // ... existing code ... comment to indicate its absence. If you omit the existing code comment, the model may inadvertently delete these lines.
   * If you plan on deleting a section, you must provide context before and after to delete it. If the initial code is ```code \n Block 1 \n Block 2 \n Block 3 \n code```, and you want to remove Block 2, you would output ```// ... existing code ... \n Block 1 \n  Block 3 \n // ... existing code ...```.
   * Make sure it is clear what the edit should be, and where it should be applied.
   * Make edits to a file in a single edit_file call instead of multiple edit_file calls to the same file. The apply model can handle many distinct edits at once.
   */
  async editFile(
    targetFile: string,
    instructions: string,
    codeEdit: string
  ): Promise<ToolResult> {
      return {
        success: false,
        error: `File or directory not found: ${filePath}`,
      };
    }
        const stats = await fs.stat(resolvedPath);

        if (stats.isDirectory()) {
          const files: string[] = [];
        for await (const entry of fs.readDir(resolvedPath)) {
          files.push(entry.name);
        }
          return {
            success: true,
            output: `Directory contents of ${filePath}:\n${files.join("\n")}`,
          };
        }

              } else {
        const content = await fs.readTextFile(resolvedPath);
        const lines = content.split("\n");

        if (viewRange) {
          const [start, end] = viewRange;
          const selectedLines = lines.slice(start - 1, end);
          const numberedLines = selectedLines
            .map((line, idx) => `${start + idx}: ${line}`)
            .join("\n");

          return {
            success: true,
            output: `Lines ${start}-${end} of ${filePath}:\n${numberedLines}`,
          };
        }

        const totalLines = lines.length;
        const displayLines = totalLines > 10 ? lines.slice(0, 10) : lines;
        const numberedLines = displayLines
          .map((line, idx) => `${idx + 1}: ${line}`)
          .join("\n");
        const additionalLinesMessage =
          totalLines > 10 ? `\n... +${totalLines - 10} lines` : "";

        return {
          success: true,
          output: `Contents of ${filePath}:\n${numberedLines}${additionalLinesMessage}`,
        };
      } else {
        return {
          success: false,
          error: `File or directory not found: ${filePath}`,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: `Error viewing ${filePath}: ${(error as Error).message}`,
      };
    }
  }

  setApiKey(apiKey) {
    this.morphApiKey = apiKey;
  }

  getApiKey() {
    return this.morphApiKey;
  }
  async view(
    filePath: string,
    viewRange?: [number, number]
  ): Promise<ToolResult> {
    try {
      const resolvedPath = path.resolve(filePath);
      const stats = await fs.stat(resolvedPath);
      if (stats.isDirectory()) {
        const files: string[] = [];
        for await (const entry of fs.readDir(resolvedPath)) {
          files.push(entry.name);
        }
        return {
          success: true,
          output: `Directory contents of ${filePath}:\n${files.join("\n")}`,
        };
      } else {
        const content = await fs.readTextFile(resolvedPath);
        const lines = content.split("\n");
        if (viewRange) {
          const [start, end] = viewRange;
          const selectedLines = lines.slice(start - 1, end);
          const numberedLines = selectedLines
            .map((line, idx) => `${start + idx}: ${line}`)
            .join("\n");
          return {
            success: true,
            output: `Lines ${start}-${end} of ${filePath}:\n${numberedLines}`,
          };
        }
        const totalLines = lines.length;
        const displayLines = totalLines > 10 ? lines.slice(0, 10) : lines;
        const numberedLines = displayLines
          .map((line, idx) => `${idx + 1}: ${line}`)
          .join("\n");
        const additionalLinesMessage =
          totalLines > 10 ? `\n... +${totalLines - 10} lines` : "";
        return {
          success: true,
          output: `Contents of ${filePath}:\n${numberedLines}${additionalLinesMessage}`,
        };
      }
    } catch (error: any) {
      return {
        success: false,
        error: `Error viewing ${filePath}: ${(error as Error).message}`,
      };
    }
  }
  setApiKey(apiKey) {
    this.morphApiKey = apiKey;
  }

  getApiKey() {
    return this.morphApiKey;
  }
}