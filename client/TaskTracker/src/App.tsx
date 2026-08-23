import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PAGE_SIZE,
  createCategory,
  createTask,
  defaultQuery,
  deleteCategory,
  deleteTask,
  fetchCategories,
  fetchTasks,
  toErrorMessage,
  toggleAllTasks,
  updateTask,
} from "./api";
import CategoryManager from "./components/CategoryManager";
import Hero from "./components/Hero";
import Pagination from "./components/Pagination";
import TaskForm from "./components/TaskForm";
import TaskTable from "./components/TaskTable";
import TaskToolbar from "./components/TaskToolbar";
import { useTheme } from "./hooks/useTheme";
import type { CategoryItem, DoneFilter, QueryState, SortKey, TaskItem } from "./types";
import "./App.css";

function App() {
  const { theme, toggleTheme } = useTheme();
  const [query, setQuery] = useState<QueryState>(defaultQuery);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const completedCount = useMemo(
    () => tasks.filter((task) => task.isDone).length,
    [tasks],
  );
  const remainingCount = tasks.length - completedCount;
  const hasActiveFilters =
    query.search !== "" || query.isDone !== "" || query.categoryId !== null;
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

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

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

  const handleCategoryFilterChange = useCallback((categoryId: number | null) => {
    setQuery((current) => ({ ...current, categoryId, pageIndex: 0 }));
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
    (title: string, categoryId: number | null): boolean => {
      if (!title) {
        setError("Enter a task title before saving.");
        return false;
      }

      setSaving(true);
      setError(null);

      void createTask(title, categoryId)
        .then(() => {
          setQuery(defaultQuery());
          void loadCategories();
        })
        .catch((createError) => {
          setError(toErrorMessage(createError, "Failed to create task"));
        })
        .finally(() => {
          setSaving(false);
        });

      return true;
    },
    [loadCategories],
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

  const handleSaveTask = useCallback(
    async (
      task: TaskItem,
      updates: { title: string; categoryId: number | null },
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
          categoryId: updates.categoryId,
        });
        await Promise.all([loadTasks(), loadCategories()]);
        return true;
      } catch (saveError) {
        setError(toErrorMessage(saveError, "Failed to update task"));
        return false;
      } finally {
        setBusyTaskId(null);
      }
    },
    [loadTasks, loadCategories],
  );

  const handleDelete = useCallback(
    async (taskId: number) => {
      setBusyTaskId(taskId);
      setError(null);

      try {
        await deleteTask(taskId);
        await Promise.all([loadTasks(), loadCategories()]);
      } catch (deleteError) {
        setError(toErrorMessage(deleteError, "Failed to delete task"));
      } finally {
        setBusyTaskId(null);
      }
    },
    [loadTasks, loadCategories],
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
          onSearch={handleSearch}
          onClearSearch={handleClearSearch}
          onFilterChange={handleFilterChange}
          onCategoryFilterChange={handleCategoryFilterChange}
          onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
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
            categories={categories}
            query={query}
            busyTaskId={busyTaskId}
            saving={saving}
            allSelected={allSelected}
            onToggleAll={handleToggleAll}
            onSort={handleSort}
            onToggle={handleToggle}
            onDelete={handleDelete}
            onSaveTask={handleSaveTask}
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

      <CategoryManager
        isOpen={isCategoryManagerOpen}
        categories={categories}
        loading={loadingCategories}
        onClose={() => setIsCategoryManagerOpen(false)}
        onCreateCategory={handleCreateCategory}
        onDeleteCategory={handleDeleteCategory}
      />
    </main>
  );
}

export default App;
