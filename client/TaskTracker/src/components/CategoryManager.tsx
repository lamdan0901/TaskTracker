import { memo, useEffect, useRef, useState } from "react";
import type { CategoryItem } from "../types";

type CategoryManagerProps = {
  isOpen: boolean;
  categories: CategoryItem[];
  loading: boolean;
  onClose: () => void;
  onCreateCategory: (name: string) => Promise<boolean>;
  onDeleteCategory: (id: number) => Promise<boolean>;
};

function CategoryManager({
  isOpen,
  categories,
  loading,
  onClose,
  onCreateCategory,
  onDeleteCategory,
}: CategoryManagerProps) {
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setName("");
      // Small timeout to ensure DOM is rendered before focusing
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
      setError("Category name is required.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const success = await onCreateCategory(trimmed);
      if (success) {
        setName("");
        inputRef.current?.focus();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create category");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number, catName: string) {
    if (
      !window.confirm(
        `Are you sure you want to delete category "${catName}"? Tasks in this category will become uncategorized.`,
      )
    ) {
      return;
    }

    setDeletingId(id);
    setError(null);
    try {
      await onDeleteCategory(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete category");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div
      className="modal-overlay"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="category-manager-title"
    >
      <div className="modal-content">
        <div className="modal-header">
          <div>
            <h3 id="category-manager-title">Manage Categories</h3>
            <p className="modal-subtitle">
              Organize your tasks by creating or deleting categories.
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
              placeholder="e.g. Work, Personal, Urgent"
              maxLength={50}
              disabled={submitting}
              autoComplete="off"
            />
            <button
              type="submit"
              className="category-add-button"
              disabled={submitting || !name.trim()}
            >
              {submitting ? "Adding..." : "Add Category"}
            </button>
          </div>
        </form>

        <div className="category-list-section">
          <h4>Existing Categories ({categories.length})</h4>
          {loading ? (
            <div className="category-empty">Loading categories...</div>
          ) : categories.length === 0 ? (
            <div className="category-empty">
              No categories yet. Create your first one above!
            </div>
          ) : (
            <ul className="category-list">
              {categories.map((cat) => (
                <li key={cat.id} className="category-item">
                  <div className="category-info">
                    <span className="category-pill-preview">{cat.name}</span>
                    <span className="category-task-count">
                      {cat.taskCount} {cat.taskCount === 1 ? "task" : "tasks"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="danger-button category-delete-button"
                    onClick={() => void handleDelete(cat.id, cat.name)}
                    disabled={deletingId === cat.id}
                  >
                    {deletingId === cat.id ? "Deleting..." : "Delete"}
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

export default memo(CategoryManager);
