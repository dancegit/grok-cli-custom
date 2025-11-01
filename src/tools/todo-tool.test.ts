import { TodoTool } from "./todo-tool.js";
import { jest } from "@jest/globals";

describe("TodoTool", () => {
  let tool: TodoTool;

  beforeEach(() => {
    tool = new TodoTool();
    jest.clearAllMocks();
  });

  describe("createTodoList", () => {
    it("should create a todo list", async () => {
      const todos = [
        { id: "1", content: "Task 1", status: "pending" as const, priority: "high" as const },
        { id: "2", content: "Task 2", status: "in_progress" as const, priority: "medium" as const }
      ];

      const result = await tool.createTodoList(todos);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Created todo list with 2 items");
      expect(result.output).toContain("Task 1");
      expect(result.output).toContain("Task 2");
    });

    it("should handle empty todo list", async () => {
      const result = await tool.createTodoList([]);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Created todo list with 0 items");
    });

    it("should format todos with correct status indicators", async () => {
      const todos = [
        { id: "1", content: "Pending task", status: "pending" as const, priority: "high" as const },
        { id: "2", content: "In progress task", status: "in_progress" as const, priority: "medium" as const },
        { id: "3", content: "Completed task", status: "completed" as const, priority: "low" as const }
      ];

      const result = await tool.createTodoList(todos);

      expect(result.success).toBe(true);
      expect(result.output).toContain("○ Pending task");
      expect(result.output).toContain("◐ In progress task");
      expect(result.output).toContain("● Completed task");
    });
  });

  describe("updateTodoList", () => {
    beforeEach(async () => {
      // Create initial todos
      const todos = [
        { id: "1", content: "Task 1", status: "pending" as const, priority: "high" as const },
        { id: "2", content: "Task 2", status: "pending" as const, priority: "medium" as const }
      ];
      await tool.createTodoList(todos);
    });

    it("should update todo status", async () => {
      const updates = [
        { id: "1", status: "completed" as const }
      ];

      const result = await tool.updateTodoList(updates);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Updated 1 todo item");
      expect(result.output).toContain("● Task 1");
    });

    it("should update todo content", async () => {
      const updates = [
        { id: "2", content: "Updated Task 2" }
      ];

      const result = await tool.updateTodoList(updates);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Updated Task 2");
    });

    it("should update todo priority", async () => {
      const updates = [
        { id: "1", priority: "low" as const }
      ];

      const result = await tool.updateTodoList(updates);

      expect(result.success).toBe(true);
      expect(result.output).toContain("🟢 Task 1"); // Low priority
    });

    it("should handle multiple updates", async () => {
      const updates = [
        { id: "1", status: "completed" as const, content: "Completed Task 1" },
        { id: "2", status: "in_progress" as const, priority: "high" as const }
      ];

      const result = await tool.updateTodoList(updates);

      expect(result.success).toBe(true);
      expect(result.output).toContain("Updated 2 todo items");
      expect(result.output).toContain("● Completed Task 1");
      expect(result.output).toContain("🔴 In progress Task 2"); // High priority
    });

    it("should handle non-existent todo id", async () => {
      const updates = [
        { id: "nonexistent", status: "completed" as const }
      ];

      const result = await tool.updateTodoList(updates);

      expect(result.success).toBe(false);
      expect(result.error).toContain("Todo item with id 'nonexistent' not found");
    });

    it("should handle empty updates", async () => {
      const result = await tool.updateTodoList([]);

      expect(result.success).toBe(true);
      expect(result.output).toContain("No updates provided");
    });
  });

  describe("Priority indicators", () => {
    it("should display correct priority indicators", async () => {
      const todos = [
        { id: "1", content: "High priority", status: "pending" as const, priority: "high" as const },
        { id: "2", content: "Medium priority", status: "pending" as const, priority: "medium" as const },
        { id: "3", content: "Low priority", status: "pending" as const, priority: "low" as const }
      ];

      const result = await tool.createTodoList(todos);

      expect(result.success).toBe(true);
      expect(result.output).toContain("🔴 High priority");
      expect(result.output).toContain("🟡 Medium priority");
      expect(result.output).toContain("🟢 Low priority");
    });
  });

  describe("Status indicators", () => {
    it("should display correct status indicators", async () => {
      const todos = [
        { id: "1", content: "Pending", status: "pending" as const, priority: "high" as const },
        { id: "2", content: "In Progress", status: "in_progress" as const, priority: "high" as const },
        { id: "3", content: "Completed", status: "completed" as const, priority: "high" as const }
      ];

      const result = await tool.createTodoList(todos);

      expect(result.success).toBe(true);
      expect(result.output).toContain("○ Pending");
      expect(result.output).toContain("◐ In Progress");
      expect(result.output).toContain("● Completed");
    });
  });
});