/**
 * mind_tasks — the action-plan items inside a MIND Life project.
 *
 * A MIND Life item is a *project*. A Task is a discrete unit of work that
 * hangs off it — what the UI shows as the project's Action Plan. Use
 * `mind_life` to create the project, then `mind_tasks` to populate and
 * assign its action-plan items. Tasks can also attach to a CRM contact, an
 * agent, or stand alone.
 */

import { Type, type Static } from "@sinclair/typebox";
import type { ToolDeps } from "./index.js";
import type { Task, TaskParentType } from "../mind-client.js";

const TasksParameters = Type.Object({
  action: Type.Union(
    [
      Type.Literal("create"),
      Type.Literal("list"),
      Type.Literal("get"),
      Type.Literal("update"),
      Type.Literal("complete"),
      Type.Literal("reopen"),
      Type.Literal("assign"),
      Type.Literal("delete"),
      Type.Literal("reports"),
    ],
    { description: "What to do" },
  ),
  task_id: Type.Optional(
    Type.String({ description: "Task ID — required for get/update/complete/reopen/assign/delete" }),
  ),
  title: Type.Optional(Type.String({ description: "Task title (required for create)" })),
  description: Type.Optional(Type.String()),
  status: Type.Optional(
    Type.Union(
      [
        Type.Literal("open"),
        Type.Literal("in_progress"),
        Type.Literal("blocked"),
        Type.Literal("done"),
      ],
      { description: "Filter for list, or new status for update" },
    ),
  ),
  priority: Type.Optional(
    Type.Union(
      [
        Type.Literal("none"),
        Type.Literal("low"),
        Type.Literal("medium"),
        Type.Literal("high"),
        Type.Literal("urgent"),
      ],
      { description: "Task priority" },
    ),
  ),
  due_date: Type.Optional(Type.String({ description: "Due date, ISO YYYY-MM-DD" })),
  estimated_minutes: Type.Optional(
    Type.Number({ description: "Estimated effort in minutes" }),
  ),
  parent_type: Type.Optional(
    Type.Union(
      [
        Type.Literal("life_item"),
        Type.Literal("contact"),
        Type.Literal("agent"),
        Type.Literal("none"),
      ],
      {
        description:
          "What the task attaches to. Defaults to 'life_item' when parent_id is given — i.e. an action-plan item on a project.",
      },
    ),
  ),
  parent_id: Type.Optional(
    Type.String({
      description:
        "ID of the parent — the Life item (project), CRM contact, or agent this task belongs to.",
    }),
  ),
  parent_label: Type.Optional(
    Type.String({ description: "Human-readable name of the parent (optional, for display)" }),
  ),
  assignee_type: Type.Optional(
    Type.Union(
      [
        Type.Literal("user"),
        Type.Literal("agent"),
        Type.Literal("external"),
        Type.Literal("unassigned"),
      ],
      { description: "Who the task is assigned to" },
    ),
  ),
  assignee_id: Type.Optional(
    Type.String({ description: "Username, agent slug, or email of the assignee" }),
  ),
  assignee_label: Type.Optional(
    Type.String({ description: "Display name of the assignee (optional)" }),
  ),
  dispatch_agent: Type.Optional(
    Type.Boolean({ description: "When assigning to an agent, also fire it now" }),
  ),
  note: Type.Optional(
    Type.String({ description: "Completion note (for complete)" }),
  ),
  tag: Type.Optional(Type.String({ description: "Filter list by a single tag" })),
  overdue: Type.Optional(Type.Boolean({ description: "List only overdue tasks" })),
  limit: Type.Optional(
    Type.Number({ description: "Max results for list. Default: 50" }),
  ),
});

type TasksParams = Static<typeof TasksParameters>;

function fmt(t: Task): string {
  const parts = [`• [${t.status}] ${t.title}`];
  if (t.priority && t.priority !== "none") parts.push(`(${t.priority})`);
  if (t.due_date) parts.push(`due ${t.due_date}`);
  if (t.is_overdue) parts.push("OVERDUE");
  if (t.assignee_label) parts.push(`→ ${t.assignee_label}`);
  if (t.parent_label) parts.push(`on ${t.parent_label}`);
  return `${parts.join(" ")} — id: ${t.task_id}`;
}

export function createMindTasksTool(deps: ToolDeps) {
  return {
    name: "mind_tasks",
    label: "MIND Tasks",
    description:
      "Manage Tasks — the action-plan items inside a MIND Life project. A MIND Life item is a project; a Task is a unit of work on it. To add an action-plan item to a project, action='create' with parent_id set to the Life item's id (parent_type defaults to 'life_item'). Tasks can also attach to a CRM contact (parent_type='contact'), an agent (parent_type='agent'), or stand alone. Tasks are assignable, completable, and reportable. Actions: create, list, get, update, complete, reopen, assign, delete, reports (completion analytics). MIND Tasks sync to the web and mobile apps.",
    parameters: TasksParameters,
    async execute(_toolCallId: string, params: TasksParams) {
      try {
        switch (params.action) {
          case "create": {
            if (!params.title) {
              return {
                content: [{ type: "text" as const, text: "'title' is required for action='create'" }],
                details: { error: "missing_title" },
              };
            }
            // Default to attaching as a project action-plan item when a
            // parent_id is supplied without an explicit parent_type.
            const parentType: TaskParentType | undefined =
              params.parent_type ?? (params.parent_id ? "life_item" : undefined);
            const task = await deps.client.createTask({
              title: params.title,
              description: params.description,
              status: params.status ?? "open",
              priority: params.priority,
              due_date: params.due_date,
              estimated_minutes: params.estimated_minutes,
              parent_type: parentType,
              parent_id: params.parent_id,
              parent_label: params.parent_label,
              assignee_type: params.assignee_type,
              assignee_id: params.assignee_id,
              assignee_label: params.assignee_label,
              dispatch_agent: params.dispatch_agent,
            });
            return {
              content: [{ type: "text" as const, text: `Created task: ${fmt(task)}` }],
              details: task,
            };
          }

          case "list": {
            const query: Record<string, string | number | boolean> = {};
            if (params.status) query.status = params.status;
            if (params.priority) query.priority = params.priority;
            if (params.parent_type) query.parent_type = params.parent_type;
            if (params.parent_id) query.parent_id = params.parent_id;
            if (params.assignee_type) query.assignee_type = params.assignee_type;
            if (params.assignee_id) query.assignee_id = params.assignee_id;
            if (params.tag) query.tag = params.tag;
            if (params.overdue) query.overdue = true;
            query.page_size = params.limit ?? 50;
            const result = await deps.client.listTasks(query);
            const tasks = result.tasks ?? [];
            if (tasks.length === 0) {
              return {
                content: [{ type: "text" as const, text: "No tasks found." }],
                details: result,
              };
            }
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${result.total} task(s):\n${tasks.map(fmt).join("\n")}`,
                },
              ],
              details: result,
            };
          }

          case "get": {
            if (!params.task_id) {
              return {
                content: [{ type: "text" as const, text: "'task_id' is required for action='get'" }],
                details: { error: "missing_task_id" },
              };
            }
            const task = await deps.client.getTask(params.task_id);
            const extra: string[] = [];
            if (task.description) extra.push(task.description);
            if (task.estimated_minutes) extra.push(`Estimated: ${task.estimated_minutes} min`);
            if (task.agent_run_status) extra.push(`Agent run: ${task.agent_run_status}`);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${fmt(task)}${extra.length ? `\n${extra.join("\n")}` : ""}`,
                },
              ],
              details: task,
            };
          }

          case "update": {
            if (!params.task_id) {
              return {
                content: [{ type: "text" as const, text: "'task_id' is required for action='update'" }],
                details: { error: "missing_task_id" },
              };
            }
            const task = await deps.client.updateTask(params.task_id, {
              title: params.title,
              description: params.description,
              status: params.status,
              priority: params.priority,
              due_date: params.due_date,
              estimated_minutes: params.estimated_minutes,
              parent_type: params.parent_type,
              parent_id: params.parent_id,
              parent_label: params.parent_label,
            });
            return {
              content: [{ type: "text" as const, text: `Updated task: ${fmt(task)}` }],
              details: task,
            };
          }

          case "complete":
          case "reopen": {
            if (!params.task_id) {
              return {
                content: [
                  { type: "text" as const, text: `'task_id' is required for action='${params.action}'` },
                ],
                details: { error: "missing_task_id" },
              };
            }
            const done = params.action === "complete";
            const task = await deps.client.completeTask(params.task_id, done, params.note);
            return {
              content: [
                {
                  type: "text" as const,
                  text: `${done ? "Completed" : "Reopened"} task "${task.title}"`,
                },
              ],
              details: task,
            };
          }

          case "assign": {
            if (!params.task_id) {
              return {
                content: [{ type: "text" as const, text: "'task_id' is required for action='assign'" }],
                details: { error: "missing_task_id" },
              };
            }
            if (!params.assignee_type) {
              return {
                content: [
                  {
                    type: "text" as const,
                    text: "'assignee_type' is required for action='assign' (user, agent, external, or unassigned)",
                  },
                ],
                details: { error: "missing_assignee_type" },
              };
            }
            const task = await deps.client.assignTask(params.task_id, {
              assignee_type: params.assignee_type,
              assignee_id: params.assignee_id,
              assignee_label: params.assignee_label,
              dispatch_agent: params.dispatch_agent,
            });
            return {
              content: [{ type: "text" as const, text: `Assigned task: ${fmt(task)}` }],
              details: task,
            };
          }

          case "delete": {
            if (!params.task_id) {
              return {
                content: [{ type: "text" as const, text: "'task_id' is required for action='delete'" }],
                details: { error: "missing_task_id" },
              };
            }
            await deps.client.deleteTask(params.task_id);
            return {
              content: [{ type: "text" as const, text: `Deleted task ${params.task_id}` }],
              details: { task_id: params.task_id, status: "deleted" },
            };
          }

          case "reports": {
            const report = await deps.client.getTaskReport({
              parent_type: params.parent_type,
              parent_id: params.parent_id,
            });
            const summary =
              `Tasks: ${report.total} total — ${report.open} open, ` +
              `${report.in_progress} in progress, ${report.blocked} blocked, ` +
              `${report.done} done, ${report.overdue} overdue. ` +
              `Completion rate: ${Math.round((report.completion_rate ?? 0) * 100)}%.`;
            return {
              content: [{ type: "text" as const, text: summary }],
              details: report,
            };
          }
        }
      } catch (err) {
        const msg = (err as Error).message;
        return {
          content: [{ type: "text" as const, text: `mind_tasks failed: ${msg}` }],
          details: { error: msg },
        };
      }
    },
  };
}
