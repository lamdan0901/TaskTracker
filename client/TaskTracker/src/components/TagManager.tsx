import { memo, useEffect, useRef, useState } from "react";
import type { TagItem } from "../types";

type TagManagerProps = {
  isOpen: boolean;
  tags: TagItem[];
  loading: boolean;
  onClose: () => void;
  onCreateTag: (name: string) => Promise<boolean>;
  onDeleteTag: (id: number) => Promise<boolean>;
};

function TagManager({
  isOpen,
  tags,
  loading,
  onClose,
  onCreateTag,
  onDeleteTag,
}: TagManagerProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName("");
      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setError("Tag name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const success = await onCreateTag(trimmed);
      if (success) {
        setName("");
        inputRef.current?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tag");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number, tagName: string) {
    if (
      !window.confirm(
        `Are you sure you want to delete tag "${tagName}"? It will be removed from all tasks.`,
      )
    ) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      await onDeleteTag(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete tag");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      className="modal-overlay manager-modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="tag-manager-title"
    >
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h3 id="tag-manager-title">Manage Tags</h3>
            <p className="modal-subtitle">
              Organize your tasks with custom tags across projects.
            </p>
          </div>
          <button
            type="button"
            className="modal-close-button"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        {error ? (
          <div className="alert" role="alert">
            {error}
          </div>
        ) : null}

        <form className="category-create-form" onSubmit={handleCreate}>
          <div className="category-input-group">
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. urgent, backend, bug, v1"
              maxLength={50}
              disabled={submitting}
              autoComplete="off"
            />
            <button
              type="submit"
              className="tag-add-button"
              disabled={submitting || !name.trim()}
            >
              {submitting ? "Adding..." : "Add Tag"}
            </button>
          </div>
        </form>

        <div className="category-list-section">
          <h4>Existing Tags ({tags.length})</h4>
          {loading ? (
            <div className="category-empty">Loading tags...</div>
          ) : tags.length === 0 ? (
            <div className="category-empty">
              No tags yet. Create your first one above!
            </div>
          ) : (
            <ul className="category-list">
              {tags.map((tag) => (
                <li key={tag.id} className="category-item">
                  <div className="category-info">
                    <span className="tag-pill-preview">#{tag.name}</span>
                    <span className="category-task-count">
                      {tag.taskCount} {tag.taskCount === 1 ? "task" : "tasks"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="danger-button category-delete-button"
                    onClick={() => void handleDelete(tag.id, tag.name)}
                    disabled={deletingId === tag.id}
                  >
                    {deletingId === tag.id ? "Deleting..." : "Delete"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="modal-footer">
          <button
            type="button"
            className="edit-button edit-button-secondary"
            onClick={onClose}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default memo(TagManager);
