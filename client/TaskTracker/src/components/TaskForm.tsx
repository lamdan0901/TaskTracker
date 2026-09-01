import { memo, useEffect, useRef, useState } from "react";
import type { CategoryItem, Priority, TagItem } from "../types";

type TaskFormProps = {
  categories: CategoryItem[];
  tags: TagItem[];
  saving: boolean;
  onSubmit: (
    title: string,
    categoryId: number | null,
    priority: Priority,
    dueDate: string | null,
    tagIds: number[],
  ) => boolean;
  onOpenTagManager?: () => void;
  onOpenCategoryManager?: () => void;
};

function TaskForm({
  categories,
  tags,
  saving,
  onSubmit,
  onOpenTagManager,
}: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [priority, setPriority] = useState<Priority>("Medium");
  const [dueDate, setDueDate] = useState("");
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);

  const tagDropdownRef = useRef<HTMLDivElement>(null);

  // Close tag dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        tagDropdownRef.current &&
        !tagDropdownRef.current.contains(event.target as Node)
      ) {
        setIsTagDropdownOpen(false);
      }
    }

    if (isTagDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isTagDropdownOpen]);

  // Close tag dropdown on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isTagDropdownOpen) {
        setIsTagDropdownOpen(false);
      }
    }

    if (isTagDropdownOpen) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [isTagDropdownOpen]);

  function toggleTag(tagId: number) {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  }

  function handleRemoveTag(tagId: number, e: React.MouseEvent) {
    e.stopPropagation();
    setSelectedTagIds((current) => current.filter((id) => id !== tagId));
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (onSubmit(title.trim(), categoryId, priority, dueDate || null, selectedTagIds)) {
      setTitle("");
      setCategoryId(null);
      setPriority("Medium");
      setDueDate("");
      setSelectedTagIds([]);
      setIsTagDropdownOpen(false);
    }
  }

  const selectedTags = tags.filter((t) => selectedTagIds.includes(t.id));

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      {/* Top Line: Task name input + Add task button on one line */}
      <div className="task-form-main-row">
        <input
          id="task-title"
          className="task-form-title-input"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Write the next thing to do..."
          autoComplete="off"
          disabled={saving}
          required
        />

        <button
          type="submit"
          className="task-form-submit-btn"
          disabled={saving || !title.trim()}
        >
          {saving ? "Saving..." : "+ Add task"}
        </button>
      </div>

      {/* Bottom Line: Remaining options styled consistently with the filter section */}
      <div className="task-form-options-row">
        {/* Priority */}
        <label className="toolbar-field task-form-field">
          <span>Priority</span>
          <select
            id="task-priority-select"
            className="task-form-select"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
            aria-label="Select priority"
            disabled={saving}
          >
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
            <option value="Urgent">Urgent</option>
          </select>
        </label>

        {/* Due Date */}
        <label className="toolbar-field task-form-field">
          <span>Due Date</span>
          <div className="task-form-date-wrapper">
            <input
              id="task-due-date-input"
              type="date"
              className="task-form-date-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              title="Due date (optional)"
              aria-label="Due date (optional)"
              disabled={saving}
            />
            {dueDate ? (
              <button
                type="button"
                className="task-form-clear-btn"
                onClick={() => setDueDate("")}
                title="Clear due date"
                aria-label="Clear due date"
              >
                &times;
              </button>
            ) : null}
          </div>
        </label>

        {/* Category */}
        <label className="toolbar-field task-form-field">
          <span>Category</span>
          <select
            id="task-category-select"
            className="task-form-select"
            value={categoryId ?? ""}
            onChange={(e) => {
              const val = e.target.value;
              setCategoryId(val === "" ? null : Number(val));
            }}
            aria-label="Select category (optional)"
            disabled={saving}
          >
            <option value="">(No category)</option>
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        {/* Tags */}
        <div className="toolbar-field task-form-field task-form-tags-wrapper" ref={tagDropdownRef}>
          <span>Tags</span>
          <button
            type="button"
            id="task-tags-trigger-btn"
            className={`task-form-tags-trigger ${selectedTagIds.length > 0 ? "has-tags" : ""}`}
            onClick={() => setIsTagDropdownOpen((prev) => !prev)}
            aria-haspopup="listbox"
            aria-expanded={isTagDropdownOpen}
            disabled={saving}
          >
            <span className="task-form-tags-icon">🏷️</span>
            <span>
              {selectedTagIds.length === 0
                ? "All / No Tags"
                : `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? "s" : ""}`}
            </span>
            {selectedTagIds.length > 0 && (
              <span className="tag-counter-badge">{selectedTagIds.length}</span>
            )}
            <span className="task-form-tags-arrow">▾</span>
          </button>

          {/* Tags Dropdown Popover */}
          {isTagDropdownOpen && (
            <div className="task-form-tags-popover" role="listbox" aria-label="Select tags">
              <div className="task-form-tags-popover-header">
                <span>Select Tags</span>
                {selectedTagIds.length > 0 && (
                  <button
                    type="button"
                    className="link-button task-form-clear-tags-btn"
                    onClick={() => setSelectedTagIds([])}
                  >
                    Clear
                  </button>
                )}
              </div>

              {tags.length === 0 ? (
                <div className="task-form-tags-empty">
                  <span>No tags created yet.</span>
                  {onOpenTagManager && (
                    <button
                      type="button"
                      className="link-button"
                      onClick={() => {
                        setIsTagDropdownOpen(false);
                        onOpenTagManager();
                      }}
                    >
                      + Create Tag
                    </button>
                  )}
                </div>
              ) : (
                <div className="task-form-tags-list">
                  {tags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        className={`task-form-tag-item ${isSelected ? "selected" : ""}`}
                        onClick={() => toggleTag(tag.id)}
                        role="option"
                        aria-selected={isSelected}
                      >
                        <span className="task-form-tag-check">
                          {isSelected ? "✓" : "+"}
                        </span>
                        <span className="task-form-tag-name">#{tag.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Selected Tags Chips inline preview */}
        {selectedTags.length > 0 && (
          <div className="task-form-selected-chips-container">
            <span>Selected:</span>
            <div className="task-form-selected-chips">
              {selectedTags.map((tag) => (
                <span key={tag.id} className="task-form-selected-chip">
                  #{tag.name}
                  <button
                    type="button"
                    onClick={(e) => handleRemoveTag(tag.id, e)}
                    aria-label={`Remove tag ${tag.name}`}
                  >
                    &times;
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </form>
  );
}

export default memo(TaskForm);