import { memo, useRef, useState } from "react";
import type { CategoryItem, TaskItem } from "../types";

type TaskRowProps = {
  task: TaskItem;
  categories: CategoryItem[];
  busy: boolean;
  onToggle: (task: TaskItem) => void;
  onDelete: (taskId: number) => void;
  onSaveTask: (
    task: TaskItem,
    updates: { title: string; categoryId: number | null },
  ) => Promise<boolean>;
};

function TaskRow({
  task,
  categories,
  busy,
  onToggle,
  onDelete,
  onSaveTask,
}: TaskRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editCategoryId, setEditCategoryId] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEditing() {
    setEditTitle(task.title);
    setEditCategoryId(task.categoryId ?? null);
    setIsEditing(true);
    inputRef.current?.focus();
  }

  function cancelEditing() {
    setIsEditing(false);
  }

  async function handleSave() {
    const saved = await onSaveTask(task, {
      title: editTitle.trim(),
      categoryId: editCategoryId,
    });
    if (saved) {
      setIsEditing(false);
    }
  }

  const createdAt = new Date(task.createdAt);

  return (
    <tr className={task.isDone ? "task-row done" : "task-row"}>
      <td className="col-done">
        <input
          type="checkbox"
          checked={task.isDone}
          onChange={() => onToggle(task)}
          disabled={busy}
          aria-label={`Mark "${task.title}" as ${task.isDone ? "incomplete" : "complete"}`}
        />
      </td>

      <td className="col-title">
        {isEditing ? (
          <div className="task-edit-row">
            <input
              ref={inputRef}
              type="text"
              value={editTitle}
              onChange={(event) => setEditTitle(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void handleSave();
                if (event.key === "Escape") cancelEditing();
              }}
              autoComplete="off"
              autoFocus
              placeholder="Task title"
            />
            <div className="task-edit-category-row">
              <select
                value={editCategoryId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setEditCategoryId(val === "" ? null : Number(val));
                }}
                className="task-edit-category-select"
                aria-label="Category for task"
              >
                <option value="">No category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="task-edit-actions">
              <button
                type="button"
                className="edit-button edit-button-primary"
                onClick={() => void handleSave()}
                disabled={busy || !editTitle.trim()}
              >
                Save
              </button>
              <button
                type="button"
                className="edit-button edit-button-secondary"
                onClick={cancelEditing}
                disabled={busy}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="task-title-wrap">
            <strong className="task-title-text">{task.title}</strong>
          </div>
        )}
      </td>

      <td className="col-category">
        {task.category ? (
          <span className="task-category-pill" title={`Category: ${task.category.name}`}>
            {task.category.name}
          </span>
        ) : (
          <span className="task-no-category">—</span>
        )}
      </td>

      <td className="col-created">
        <small>{createdAt.toLocaleDateString()}</small>
        <small>{createdAt.toLocaleTimeString()}</small>
      </td>

      <td className="col-actions">
        <div className="task-actions">
          <button
            type="button"
            className="link-button"
            onClick={startEditing}
            disabled={busy || isEditing}
          >
            Edit
          </button>
          <button
            type="button"
            className="danger-button"
            onClick={() => onDelete(task.id)}
            disabled={busy}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default memo(TaskRow);