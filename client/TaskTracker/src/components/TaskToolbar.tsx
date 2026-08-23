import { memo, useState } from "react";
import type { CategoryItem, DoneFilter, QueryState } from "../types";

type TaskToolbarProps = {
  query: QueryState;
  categories: CategoryItem[];
  onSearch: (search: string) => void;
  onClearSearch: () => void;
  onFilterChange: (isDone: DoneFilter) => void;
  onCategoryFilterChange: (categoryId: number | null) => void;
  onOpenCategoryManager: () => void;
};

function TaskToolbar({
  query,
  categories,
  onSearch,
  onClearSearch,
  onFilterChange,
  onCategoryFilterChange,
  onOpenCategoryManager,
}: TaskToolbarProps) {
  const [searchInput, setSearchInput] = useState("");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(searchInput.trim());
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
      </div>
    </div>
  );
}

export default memo(TaskToolbar);