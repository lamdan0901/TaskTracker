import { memo } from "react";
import type { CategoryItem, QueryState, SortKey, TaskItem } from "../types";
import TaskRow from "./TaskRow";

type TaskTableProps = {
  tasks: TaskItem[];
  categories: CategoryItem[];
  query: QueryState;
  busyTaskId: number | null;
  saving: boolean;
  allSelected: boolean;
  onToggleAll: (nextIsDone: boolean) => void;
  onSort: (column: Exclude<SortKey, "isDone">) => void;
  onToggle: (task: TaskItem) => void;
  onDelete: (taskId: number) => void;
  onSaveTask: (
    task: TaskItem,
    updates: { title: string; categoryId: number | null },
  ) => Promise<boolean>;
};

function SortHeaderButton({
  label,
  column,
  query,
  onSort,
}: {
  label: string;
  column: Exclude<SortKey, "isDone">;
  query: QueryState;
  onSort: (column: Exclude<SortKey, "isDone">) => void;
}) {
  return (
    <button
      type="button"
      className="sort-header"
      onClick={() => onSort(column)}
    >
      {label}
      {query.sortBy === column
        ? query.sortDir === "asc"
          ? " ▲"
          : " ▼"
        : null}
    </button>
  );
}

function ariaSort(query: QueryState, column: SortKey): "ascending" | "descending" | undefined {
  if (query.sortBy !== column) return undefined;
  return query.sortDir === "asc" ? "ascending" : "descending";
}

function TaskTable({
  tasks,
  categories,
  query,
  busyTaskId,
  saving,
  allSelected,
  onToggleAll,
  onSort,
  onToggle,
  onDelete,
  onSaveTask,
}: TaskTableProps) {
  return (
    <table className="task-table">
      <thead>
        <tr>
          <th className="col-done">
            <input
              type="checkbox"
              checked={allSelected}
              ref={(checkbox) => {
                if (checkbox) {
                  checkbox.indeterminate =
                    tasks.some((task) => task.isDone) &&
                    tasks.some((task) => !task.isDone);
                }
              }}
              onChange={(event) => void onToggleAll(event.target.checked)}
              disabled={saving}
              aria-label="Select or toggle all tasks on this page"
            />
          </th>
          <th className="col-title" aria-sort={ariaSort(query, "title")}>
            <SortHeaderButton
              label="Title"
              column="title"
              query={query}
              onSort={onSort}
            />
          </th>
          <th className="col-category">Category</th>
          <th className="col-created" aria-sort={ariaSort(query, "createdAt")}>
            <SortHeaderButton
              label="Created"
              column="createdAt"
              query={query}
              onSort={onSort}
            />
          </th>
          <th className="col-actions"></th>
        </tr>
      </thead>
      <tbody>
        {tasks.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            categories={categories}
            busy={busyTaskId === task.id}
            onToggle={onToggle}
            onDelete={onDelete}
            onSaveTask={onSaveTask}
          />
        ))}
      </tbody>
    </table>
  );
}

export default memo(TaskTable);