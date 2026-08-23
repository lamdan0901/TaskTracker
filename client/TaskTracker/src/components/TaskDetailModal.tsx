import { memo, useCallback, useEffect, useState } from "react";
import { fetchTask, toErrorMessage } from "../api";
import type { CategoryItem, TagItem, TaskItem } from "../types";

type TaskDetailModalProps = {
  taskId: number | null;
  categories: CategoryItem[];
  tags: TagItem[];
  isOpen: boolean;
  onClose: () => void;
  onSaveTask: (
    task: TaskItem,
    updates: {
      title: string;
      isDone: boolean;
      categoryId: number | null;
      tagIds: number[];
    },
  ) => Promise<boolean>;
  onDeleteTask: (taskId: number) => Promise<void>;
  onOpenTagManager: () => void;
  onOpenCategoryManager: () => void;
};

function TaskDetailModal({
  taskId,
  categories,
  tags,
  isOpen,
  onClose,
  onSaveTask,
  onDeleteTask,
  onOpenTagManager,
  onOpenCategoryManager,
}: TaskDetailModalProps) {
  const [task, setTask] = useState<TaskItem | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [title, setTitle] = useState("");
  const [isDone, setIsDone] = useState(false);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  const loadTaskDetail = useCallback(async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchTask(id);
      setTask(data);
      setTitle(data.title);
      setIsDone(data.isDone);
      setCategoryId(data.categoryId);
      setSelectedTagIds(data.tags ? data.tags.map((t) => t.id) : []);
    } catch (err) {
      setError(toErrorMessage(err, "Failed to load task details"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen && taskId !== null) {
      void loadTaskDetail(taskId);
    } else {
      setTask(null);
      setError(null);
    }
  }, [isOpen, taskId, loadTaskDetail]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen && !saving && !deleting) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, saving, deleting, onClose]);

  if (!isOpen || taskId === null) return null;

  function toggleTag(tagId: number) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  }

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (!task) return;

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError("Task title cannot be blank.");
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const success = await onSaveTask(task, {
        title: trimmedTitle,
        isDone,
        categoryId,
        tagIds: selectedTagIds,
      });
      if (success) {
        onClose();
      }
    } catch (err) {
      setError(toErrorMessage(err, "Failed to update task"));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!task) return;
    if (
      !window.confirm(`Are you sure you want to delete task "${task.title}"?`)
    ) {
      return;
    }

    setDeleting(true);
    setError(null);

    try {
      await onDeleteTask(task.id);
      onClose();
    } catch (err) {
      setError(toErrorMessage(err, "Failed to delete task"));
    } finally {
      setDeleting(false);
    }
  }

  const createdAt = task ? new Date(task.createdAt) : null;

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving && !deleting) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-detail-title"
    >
      <div className="modal-content task-detail-modal">
        <div className="modal-header">
          <div className="task-detail-header-info">
            <div className="task-detail-badges">
              <span className="task-id-badge">Task #{taskId}</span>
              {task ? (
                <span
                  className={
                    isDone
                      ? "status-badge status-badge-done"
                      : "status-badge status-badge-open"
                  }
                >
                  {isDone ? "✓ Completed" : "○ In Progress"}
                </span>
              ) : null}
            </div>
            <h3 id="task-detail-title">Task Details &amp; Edit</h3>
          </div>
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            disabled={saving || deleting}
            aria-label="Close task details dialog"
          >
            &times;
          </button>
        </div>

        {error ? (
          <div className="alert" role="alert">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="detail-loading-state">
            Loading task details...
          </div>
        ) : task ? (
          <form className="task-detail-form" onSubmit={handleSave}>
            {/* Title Section */}
            <div className="form-group">
              <label htmlFor="task-detail-title-input" className="form-label">
                Title <span className="required-indicator">*</span>
              </label>
              <input
                id="task-detail-title-input"
                type="text"
                className="task-detail-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={200}
                placeholder="Task title"
                disabled={saving || deleting}
                required
                autoFocus
              />
            </div>

            {/* Status Section */}
            <div className="form-group">
              <span className="form-label">Status</span>
              <label className="checkbox-toggle-label">
                <input
                  type="checkbox"
                  checked={isDone}
                  onChange={(e) => setIsDone(e.target.checked)}
                  disabled={saving || deleting}
                />
                <span className="checkbox-toggle-text">
                  {isDone
                    ? "Marked as Done (Completed)"
                    : "Mark as Incomplete (Open)"}
                </span>
              </label>
            </div>

            {/* Category Section */}
            <div className="form-group">
              <div className="form-label-row">
                <label htmlFor="task-detail-category-select" className="form-label">
                  Category
                </label>
                <button
                  type="button"
                  className="link-button form-helper-btn"
                  onClick={onOpenCategoryManager}
                >
                  + Manage Categories
                </button>
              </div>
              <select
                id="task-detail-category-select"
                className="task-detail-select"
                value={categoryId ?? ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setCategoryId(val === "" ? null : Number(val));
                }}
                disabled={saving || deleting}
              >
                <option value="">(None / Uncategorized)</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Tags Section */}
            <div className="form-group">
              <div className="form-label-row">
                <span className="form-label">Tags</span>
                <button
                  type="button"
                  className="link-button form-helper-btn"
                  onClick={onOpenTagManager}
                >
                  + Manage Tags
                </button>
              </div>
              <p className="form-hint">
                Select tags to associate with this task:
              </p>

              {tags.length === 0 ? (
                <div className="tags-empty-box">
                  <span>No tags created yet.</span>
                  <button
                    type="button"
                    className="link-button"
                    onClick={onOpenTagManager}
                  >
                    Create a tag
                  </button>
                </div>
              ) : (
                <div className="tag-chips-container">
                  {tags.map((t) => {
                    const isSelected = selectedTagIds.includes(t.id);
                    return (
                      <button
                        key={t.id}
                        type="button"
                        className={`tag-chip ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleTag(t.id)}
                        disabled={saving || deleting}
                        aria-pressed={isSelected}
                      >
                        <span className="tag-chip-icon">
                          {isSelected ? "✓" : "+"}
                        </span>
                        <span className="tag-chip-text">#{t.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Metadata Info */}
            {createdAt ? (
              <div className="task-detail-meta">
                <span className="meta-label">Created on:</span>
                <span className="meta-value">
                  {createdAt.toLocaleDateString()} at{" "}
                  {createdAt.toLocaleTimeString()}
                </span>
              </div>
            ) : null}

            {/* Footer Buttons */}
            <div className="task-detail-footer">
              <button
                type="button"
                className="danger-button"
                onClick={() => void handleDelete()}
                disabled={saving || deleting}
              >
                {deleting ? "Deleting..." : "Delete Task"}
              </button>

              <div className="task-detail-actions-right">
                <button
                  type="button"
                  className="edit-button edit-button-secondary"
                  onClick={onClose}
                  disabled={saving || deleting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="edit-button edit-button-primary"
                  disabled={saving || deleting || !title.trim()}
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="empty-state">Task not found.</div>
        )}
      </div>
    </div>
  );
}

export default memo(TaskDetailModal);
