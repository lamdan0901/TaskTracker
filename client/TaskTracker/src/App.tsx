import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PAGE_SIZE,
  createCategory,
  createTag,
  createTask,
  defaultQuery,
  deleteCategory,
  deleteTag,
  deleteTask,
  fetchCategories,
  fetchTags,
  fetchTasks,
  toErrorMessage,
  toggleAllTasks,
  updateTask,
} from "./api";
import CategoryManager from "./components/CategoryManager";
import Hero from "./components/Hero";
import Pagination from "./components/Pagination";
import TagManager from "./components/TagManager";
import TaskDetailModal from "./components/TaskDetailModal";
import TaskForm from "./components/TaskForm";
import TaskTable from "./components/TaskTable";
import TaskToolbar from "./components/TaskToolbar";
import { useTheme } from "./hooks/useTheme";
import type { CategoryItem, DoneFilter, Priority, QueryState, SortKey, TagItem, TaskItem } from "./types";
import "./App.css";

function App() {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState<QueryState>(defaultQuery);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const completedCount = useMemo(
    () => tasks.filter((task) => task.isDone).length,
    [tasks],
  );
  const remainingCount = tasks.length - completedCount;
  const hasActiveFilters =
    query.search !== "" ||
    query.isDone !== "" ||
    query.priority !== "" ||
    query.dueDate !== "" ||
    query.isOverdue !== "" ||
    query.categoryId !== null ||
    query.tagId !== null;
  const allSelected =
    tasks.length > 0 &&
    completedCount === tasks.length &&
    totalCount === tasks.length;
  const rangeStart = totalCount === 0 ? 0 : query.pageIndex * PAGE_SIZE + 1;
  const rangeEnd = Math.min(totalCount, (query.pageIndex + 1) * PAGE_SIZE);

  const loadTasks = useCallback(async (): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const data = await fetchTasks(query);
      setTasks(data.items);
      setTotalCount(data.totalCount);
      return true;
    } catch (loadError) {
      setError(toErrorMessage(loadError, "Failed to load tasks"));
      return false;
    } finally {
      setLoading(false);
    }
  }, [query]);

  const loadCategories = useCallback(async (): Promise<boolean> => {
    setLoadingCategories(true);
    try {
      const data = await fetchCategories();
      setCategories(data);
      return true;
    } catch (loadError) {
      setError(toErrorMessage(loadError, "Failed to load categories"));
      return false;
    } finally {
      setLoadingCategories(false);
    }
  }, []);

  const loadTags = useCallback(async (): Promise<boolean> => {
    setLoadingTags(true);
    try {
      const data = await fetchTags();
      setTags(data);
      return true;
    } catch (loadError) {
      setError(toErrorMessage(loadError, "Failed to load tags"));
      return false;
    } finally {
      setLoadingTags(false);
    }
  }, []);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadTags();
  }, [loadTags]);

  useEffect(() => {
    if (totalCount > 0 && query.pageIndex >= totalPages) {
      setQuery((current) => ({
        ...current,
        pageIndex: Math.max(0, totalPages - 1),
      }));
    }
  }, [totalCount, query.pageIndex, totalPages]);

  const handleSearch = useCallback((search: string) => {
    setQuery((current) => ({ ...current, search, pageIndex: 0 }));
  }, []);

  const handleClearSearch = useCallback(() => {
    setQuery((current) => ({ ...current, search: "", pageIndex: 0 }));
  }, []);

  const handleFilterChange = useCallback((isDone: DoneFilter) => {
    setQuery((current) => ({ ...current, isDone, pageIndex: 0 }));
  }, []);

  const handlePriorityFilterChange = useCallback((priority: Priority | "") => {
    setQuery((current) => ({ ...current, priority, pageIndex: 0 }));
  }, []);

  const handleOverdueFilterChange = useCallback((isOverdue: "" | "true" | "false") => {
    setQuery((current) => ({ ...current, isOverdue, pageIndex: 0 }));
  }, []);

  const handleCategoryFilterChange = useCallback((categoryId: number | null) => {
    setQuery((current) => ({ ...current, categoryId, pageIndex: 0 }));
  }, []);

  const handleTagFilterChange = useCallback((tagId: number | null) => {
    setQuery((current) => ({ ...current, tagId, pageIndex: 0 }));
  }, []);

  const handlePageChange = useCallback((pageIndex: number) => {
    setQuery((current) => ({ ...current, pageIndex }));
  }, []);

  const handleSort = useCallback((column: Exclude<SortKey, "isDone">) => {
    setQuery((current) => {
      if (current.sortBy !== column) {
        return { ...current, sortBy: column, sortDir: "asc", pageIndex: 0 };
      }

      if (current.sortDir === "asc") {
        return { ...current, sortDir: "desc", pageIndex: 0 };
      }

      return { ...current, sortBy: null, sortDir: "desc", pageIndex: 0 };
    });
  }, []);

  const handleCreateTask = useCallback(
    (
      title: string,
      categoryId: number | null,
      priority: Priority,
      dueDate: string | null,
    ): boolean => {
      if (!title) {
        setError("Enter a task title before saving.");
        return false;
      }

      setSaving(true);
      setError(null);

      void createTask(title, categoryId, undefined, priority, dueDate)
        .then(() => {
          setQuery(defaultQuery());
          void Promise.all([loadCategories(), loadTags()]);
        })
        .catch((createError) => {
          setError(toErrorMessage(createError, "Failed to create task"));
        })
        .finally(() => {
          setSaving(false);
        });

      return true;
    },
    [loadCategories, loadTags],
  );

  const handleToggle = useCallback(
    async (task: TaskItem) => {
      setBusyTaskId(task.id);
      setError(null);

      try {
        await updateTask(task.id, { isDone: !task.isDone });
        await loadTasks();
      } catch (toggleError) {
        setError(toErrorMessage(toggleError, "Failed to update task"));
      } finally {
        setBusyTaskId(null);
      }
    },
    [loadTasks],
  );

  const handleToggleAll = useCallback(
    async (nextIsDone: boolean) => {
      setSaving(true);
      setError(null);

      try {
        await toggleAllTasks(nextIsDone);
        await loadTasks();
      } catch (toggleError) {
        setError(toErrorMessage(toggleError, "Failed to update tasks"));
      } finally {
        setSaving(false);
      }
    },
    [loadTasks],
  );

  const handleSaveTaskDetail = useCallback(
    async (
      task: TaskItem,
      updates: {
        title: string;
        isDone: boolean;
        priority: Priority;
        dueDate: string | null;
        categoryId: number | null;
        tagIds: number[];
      },
    ): Promise<boolean> => {
      if (!updates.title) {
        setError("Title cannot be empty.");
        return false;
      }

      setBusyTaskId(task.id);
      setError(null);

      try {
        await updateTask(task.id, {
          title: updates.title,
          isDone: updates.isDone,
          priority: updates.priority,
          dueDate: updates.dueDate,
          categoryId: updates.categoryId,
          tagIds: updates.tagIds,
        });
        await Promise.all([loadTasks(), loadCategories(), loadTags()]);
        return true;
      } catch (saveError) {
        setError(toErrorMessage(saveError, "Failed to update task"));
        return false;
      } finally {
        setBusyTaskId(null);
      }
    },
    [loadTasks, loadCategories, loadTags],
  );

  const handleDelete = useCallback(
    async (taskId: number) => {
      setBusyTaskId(taskId);
      setError(null);

      try {
        await deleteTask(taskId);
        if (selectedTaskId === taskId) {
          setSelectedTaskId(null);
        }
        await Promise.all([loadTasks(), loadCategories(), loadTags()]);
      } catch (deleteError) {
        setError(toErrorMessage(deleteError, "Failed to delete task"));
      } finally {
        setBusyTaskId(null);
      }
    },
    [selectedTaskId, loadTasks, loadCategories, loadTags],
  );

  const handleCreateCategory = useCallback(
    async (categoryName: string): Promise<boolean> => {
      await createCategory(categoryName);
      await loadCategories();
      return true;
    },
    [loadCategories],
  );

  const handleDeleteCategory = useCallback(
    async (categoryId: number): Promise<boolean> => {
      await deleteCategory(categoryId);
      if (query.categoryId === categoryId) {
        setQuery((curr) => ({ ...curr, categoryId: null, pageIndex: 0 }));
      }
      await Promise.all([loadCategories(), loadTasks()]);
      return true;
    },
    [query.categoryId, loadCategories, loadTasks],
  );

  const handleCreateTag = useCallback(
    async (tagName: string): Promise<boolean> => {
      await createTag(tagName);
      await loadTags();
      return true;
    },
    [loadTags],
  );

  const handleDeleteTag = useCallback(
    async (tagId: number): Promise<boolean> => {
      await deleteTag(tagId);
      if (query.tagId === tagId) {
        setQuery((curr) => ({ ...curr, tagId: null, pageIndex: 0 }));
      }
      await Promise.all([loadTags(), loadTasks()]);
      return true;
    },
    [query.tagId, loadTags, loadTasks],
  );

  return (
    <main className="app-shell">
      <Hero
        totalCount={totalCount}
        completedCount={completedCount}
        remainingCount={remainingCount}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <section className="workspace">
        <TaskForm
          categories={categories}
          saving={saving}
          onSubmit={handleCreateTask}
        />

        <TaskToolbar
          query={query}
          categories={categories}
          tags={tags}
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          onFilterChange={handleFilterChange}
          onPriorityFilterChange={handlePriorityFilterChange}
          onOverdueFilterChange={handleOverdueFilterChange}
          onCategoryFilterChange={handleCategoryFilterChange}
          onTagFilterChange={handleTagFilterChange}
          onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
          onOpenTagManager={() => setIsTagManagerOpen(true)}
        />

        {error ? (
          <div className="alert" role="alert">
            {error}
          </div>
        ) : null}

        <div className="task-list-header">
          <h2>Tasks</h2>
          <button
            type="button"
            className="link-button"
            onClick={() => {
              void loadTasks();
              void loadCategories();
              void loadTags();
            }}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="empty-state">Loading tasks from the API...</div>
        ) : tasks.length === 0 ? (
          <div className="empty-state">
            {hasActiveFilters
              ? "No tasks match your filters."
              : "No tasks yet. Add one above to get started."}
          </div>
        ) : (
          <TaskTable
            tasks={tasks}
            query={query}
            busyTaskId={busyTaskId}
            saving={saving}
            allSelected={allSelected}
            onToggleAll={handleToggleAll}
            onSort={handleSort}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onSelectTask={(id) => setSelectedTaskId(id)}
          />
        )}

        <Pagination
          pageIndex={query.pageIndex}
          totalPages={totalPages}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          totalCount={totalCount}
          onPageChange={handlePageChange}
        />
      </section>

      <TaskDetailModal
        taskId={selectedTaskId}
        categories={categories}
        tags={tags}
        isOpen={selectedTaskId !== null}
        onClose={() => setSelectedTaskId(null)}
        onSaveTask={handleSaveTaskDetail}
        onDeleteTask={handleDelete}
        onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
        onOpenTagManager={() => setIsTagManagerOpen(true)}
      />

      <CategoryManager
        isOpen={isCategoryManagerOpen}
        categories={categories}
        loading={loadingCategories}
        onClose={() => setIsCategoryManagerOpen(false)}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
      />

      <TagManager
        isOpen={isTagManagerOpen}
        tags={tags}
        loading={loadingTags}
        onClose={() => setIsTagManagerOpen(false)}
        onCreateTag={handleCreateTag}
        onDeleteTag={handleDeleteTag}
      />
    </main>
  );
}

export default App;

