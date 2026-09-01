import { memo, useEffect, useRef, useState } from "react";
import type { CategoryItem, DoneFilter, Priority, QueryState, TagItem } from "../types";

type TaskToolbarProps = {
  query: QueryState;
  categories: CategoryItem[];
  tags: TagItem[];
  onSearch: (search: string) => void;
  onClearSearch: () => void;
  onFilterChange: (isDone: DoneFilter) => void;
  onPriorityFilterChange: (priority: Priority | "") => void;
  onOverdueFilterChange: (isOverdue: "" | "true" | "false") => void;
  onCategoryFilterChange: (categoryId: number | null) => void;
  onTagIdsFilterChange: (tagIds: number[]) => void;
  onOpenCategoryManager: () => void;
  onOpenTagManager: () => void;
};

function TaskToolbar({
  query,
  categories,
  tags,
  onSearch,
  onClearSearch,
  onFilterChange,
  onPriorityFilterChange,
  onOverdueFilterChange,
  onCategoryFilterChange,
  onTagIdsFilterChange,
  onOpenCategoryManager,
  onOpenTagManager,
}: TaskToolbarProps) {
  const [searchInput, setSearchInput] = useState("");
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const tagDropdownRef = useRef<HTMLDivElement>(null);

  const selectedTagIds = query.tagIds || [];

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

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(searchInput.trim());
  }

  function toggleTag(tagId: number) {
    const nextTagIds = selectedTagIds.includes(tagId)
      ? selectedTagIds.filter((id) => id !== tagId)
      : [...selectedTagIds, tagId];
    onTagIdsFilterChange(nextTagIds);
  }

  return (
    <div className="task-toolbar" aria-label="Search and filter tasks">
      <form className="toolbar-search" onSubmit={handleSubmit}>
        <input
          type="search"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search tasks..."
          aria-label="Search tasks"
        />
        {searchInput ? (
          <button
            type="button"
            className="link-button"
            onClick={() => {
              setSearchInput("");
              onClearSearch();
            }}
          >
            Clear
          </button>
        ) : null}
      </form>

      <label className="toolbar-field">
        <span>Priority</span>
        <select
          value={query.priority}
          onChange={(event) =>
            onPriorityFilterChange(event.target.value as Priority | "")
          }
          aria-label="Filter tasks by priority"
        >
          <option value="">All Priorities</option>
          <option value="Urgent">Urgent</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </label>

      <label className="toolbar-field">
        <span>Timeline</span>
        <select
          value={query.isOverdue}
          onChange={(event) =>
            onOverdueFilterChange(event.target.value as "" | "true" | "false")
          }
          aria-label="Filter tasks by timeline"
        >
          <option value="">All Deadlines</option>
          <option value="true">⚠️ Overdue Only</option>
          <option value="false">On Track / No Deadline</option>
        </select>
      </label>

      <label className="toolbar-field">
        <span>Category</span>
        <select
          value={query.categoryId ?? ""}
          onChange={(event) => {
            const val = event.target.value;
            onCategoryFilterChange(val === "" ? null : Number(val));
          }}
          aria-label="Filter tasks by category"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name} ({cat.taskCount})
            </option>
          ))}
        </select>
      </label>

      {/* Multi-Tag Filter Picker */}
      <div className="toolbar-field task-form-tags-wrapper" ref={tagDropdownRef}>
        <span>Tags</span>
        <button
          type="button"
          id="toolbar-tags-trigger-btn"
          className={`task-form-tags-trigger ${selectedTagIds.length > 0 ? "has-tags" : ""}`}
          onClick={() => setIsTagDropdownOpen((prev) => !prev)}
          aria-haspopup="listbox"
          aria-expanded={isTagDropdownOpen}
          aria-label="Filter tasks by tags"
        >
          <span className="task-form-tags-icon">🏷️</span>
          <span>
            {selectedTagIds.length === 0
              ? "All Tags"
              : `${selectedTagIds.length} tag${selectedTagIds.length > 1 ? "s" : ""}`}
          </span>
          {selectedTagIds.length > 0 && (
            <span className="tag-counter-badge">{selectedTagIds.length}</span>
          )}
          <span className="task-form-tags-arrow">▾</span>
        </button>

        {/* Tags Popover */}
        {isTagDropdownOpen && (
          <div className="task-form-tags-popover" role="listbox" aria-label="Filter by tags">
            <div className="task-form-tags-popover-header">
              <span>Filter by Tags</span>
              {selectedTagIds.length > 0 && (
                <button
                  type="button"
                  className="link-button task-form-clear-tags-btn"
                  onClick={() => onTagIdsFilterChange([])}
                >
                  Clear All
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
                      <span className="task-form-tag-name">
                        #{tag.name} {tag.taskCount > 0 ? `(${tag.taskCount})` : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      <label className="toolbar-field">
        <span>Status</span>
        <select
          value={query.isDone}
          onChange={(event) =>
            onFilterChange(event.target.value as DoneFilter)
          }
          aria-label="Filter tasks by status"
        >
          <option value="">All Statuses</option>
          <option value="false">Open</option>
          <option value="true">Done</option>
        </select>
      </label>

      <div className="toolbar-actions">
        <button
          type="button"
          className="toolbar-category-btn"
          onClick={onOpenCategoryManager}
          title="Create or delete categories"
        >
          <span>🏷️ Categories</span>
          <span className="category-counter-badge">{categories.length}</span>
        </button>
        <button
          type="button"
          className="toolbar-tag-btn"
          onClick={onOpenTagManager}
          title="Create or delete tags"
        >
          <span>🔖 Tags</span>
          <span className="tag-counter-badge">{tags.length}</span>
        </button>
      </div>
    </div>
  );
}

export default memo(TaskToolbar);