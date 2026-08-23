import { memo } from "react";
import type { TaskItem } from "../types";

type TaskRowProps = {
  task: TaskItem;
  busy: boolean;
  onToggle: (task: TaskItem) => void;
  onDelete: (taskId: number) => void;
  onSelect: (taskId: number) => void;
};

function TaskRow({
  task,
  busy,
  onToggle,
  onDelete,
  onSelect,
}: TaskRowProps) {
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
        <div className="task-title-wrap">
          <button
            type="button"
            className="task-title-button"
            onClick={() => onSelect(task.id)}
            title="Click to view and edit details"
          >
            <strong className="task-title-text">{task.title}</strong>
          </button>
          {task.subtasks && task.subtasks.length > 0 ? (
            <span
              className="task-subtasks-pill"
              title={`${task.subtasks.filter((s) => s.isDone).length} of ${task.subtasks.length} subtasks completed`}
            >
              ☑ {task.subtasks.filter((s) => s.isDone).length}/{task.subtasks.length}
            </span>
          ) : null}
        </div>
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

      <td className="col-tags">
        {task.tags && task.tags.length > 0 ? (
          <div className="task-tags-list">
            {task.tags.map((tag) => (
              <span key={tag.id} className="task-tag-pill" title={`Tag: #${tag.name}`}>
                #{tag.name}
              </span>
            ))}
          </div>
        ) : (
          <span className="task-no-tags">—</span>
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
            onClick={() => onSelect(task.id)}
            disabled={busy}
          >
            Details
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