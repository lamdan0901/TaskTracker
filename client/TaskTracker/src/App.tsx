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
  fetchMe,
  fetchTags,
  fetchTasks,
  logout,
  toErrorMessage,
  toggleAllTasks,
  updateTask,
} from "./api";
import { clearSession, getRefreshToken, getToken, getUser, onUnauthorized, setSession } from "./auth";
import CategoryManager from "./components/CategoryManager";
import Hero from "./components/Hero";
import LoginForm from "./components/LoginForm";
import Pagination from "./components/Pagination";
import TagManager from "./components/TagManager";
import TaskDetailModal from "./components/TaskDetailModal";
import TaskForm from "./components/TaskForm";
import TaskTable from "./components/TaskTable";
import TaskToolbar from "./components/TaskToolbar";
import { useTheme } from "./hooks/useTheme";
import type {
  AuthUser,
  CategoryItem,
  DoneFilter,
  Priority,
  QueryState,
  SortKey,
  TagItem,
  TaskItem,
} from "./types";
import "./App.css";

function App() {
  const { theme, toggleTheme } = useTheme();

  // Authentication state
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getUser());
  const [isCheckingAuth, setIsCheckingAuth] = useState<boolean>(() => !!getToken());
  const [sessionMessage, setSessionMessage] = useState<string | null>(null);

  const [query, setQuery] = useState<QueryState>(defaultQuery);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [tags, setTags] = useState<TagItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingTags, setLoadingTags] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Modals state
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  // Listen for 401 unauthorized notifications
  useEffect(() => {
    const unsubscribe = onUnauthorized(() => {
      setCurrentUser(null);
      setSessionMessage("Your session has expired. Please sign in again.");
      setTasks([]);
      setCategories([]);
      setTags([]);
    });
    return unsubscribe;
  }, []);

  // Validate active token on initial app mount
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setIsCheckingAuth(false);
      return;
    }

    void fetchMe()
      .then((userProfile) => {
        setCurrentUser(userProfile);
        setSession(token, getRefreshToken(), userProfile);
      })
      .catch(() => {
        clearSession();
        setCurrentUser(null);
      })
      .finally(() => {
        setIsCheckingAuth(false);
      });
  }, []);

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
    (query.tagIds && query.tagIds.length > 0);
  const allSelected =
    tasks.length > 0 &&
    completedCount === tasks.length &&
    totalCount === tasks.length;
  const rangeStart = totalCount === 0 ? 0 : query.pageIndex * PAGE_SIZE + 1;
  const rangeEnd = Math.min(totalCount, (query.pageIndex + 1) * PAGE_SIZE);

  const loadTasks = useCallback(async (): Promise<boolean> => {
    if (!currentUser) return false;
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
  }, [currentUser, query]);

  const loadCategories = useCallback(async (): Promise<boolean> => {
    if (!currentUser) return false;
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
  }, [currentUser]);

  const loadTags = useCallback(async (): Promise<boolean> => {
    if (!currentUser) return false;
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
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      void loadTasks();
    }
  }, [currentUser, loadTasks]);

  useEffect(() => {
    if (currentUser) {
      void loadCategories();
    }
  }, [currentUser, loadCategories]);

  useEffect(() => {
    if (currentUser) {
      void loadTags();
    }
  }, [currentUser, loadTags]);

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

  const handleTagIdsFilterChange = useCallback((tagIds: number[]) => {
    setQuery((current) => ({
      ...current,
      tagIds,
      pageIndex: 0,
    }));
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
      tagIds: number[],
    ): boolean => {
      if (!title) {
        setError("Enter a task title before saving.");
        return false;
      }

      setSaving(true);
      setError(null);

      void createTask(
        title,
        categoryId,
        tagIds.length > 0 ? tagIds : undefined,
        priority,
        dueDate,
      )
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
      setQuery((curr) => ({
        ...curr,
        tagIds: curr.tagIds ? curr.tagIds.filter((id) => id !== tagId) : [],
        pageIndex: 0,
      }));
      await Promise.all([loadTags(), loadTasks()]);
      return true;
    },
    [loadTags, loadTasks],
  );

  const handleLoginSuccess = useCallback((user: AuthUser) => {
    setCurrentUser(user);
    setSessionMessage(null);
    setError(null);
    setQuery(defaultQuery());
  }, []);

  const handleLogout = useCallback(async () => {
    await logout();
    setCurrentUser(null);
    setTasks([]);
    setCategories([]);
    setTags([]);
    setTotalCount(0);
    setError(null);
    setSessionMessage(null);
  }, []);

  if (isCheckingAuth) {
    return (
      <main className="app-shell">
        <Hero theme={theme} onToggleTheme={toggleTheme} hideStats={true} />
        <section className="workspace auth-loading-workspace">
          <div className="auth-spinner-container">
            <span className="auth-spinner large" aria-hidden="true" />
            <p>Checking authentication session...</p>
          </div>
        </section>
      </main>
    );
  }

  if (!currentUser) {
    return (
      <main className="app-shell">
        <Hero theme={theme} onToggleTheme={toggleTheme} hideStats={true} />

        {sessionMessage && (
          <div className="alert session-alert" role="alert">
            <svg
              className="alert-icon"
              viewBox="0 0 20 20"
              fill="currentColor"
              aria-hidden="true"
              width="18"
              height="18"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                clipRule="evenodd"
              />
            </svg>
            <span>{sessionMessage}</span>
          </div>
        )}

        <LoginForm onSuccess={handleLoginSuccess} />
      </main>
    );
  }

  return (
    <main className="app-shell">
      <Hero
        totalCount={totalCount}
        completedCount={completedCount}
        remainingCount={remainingCount}
        theme={theme}
        onToggleTheme={toggleTheme}
        user={currentUser}
        onLogout={handleLogout}
      />

      <section className="workspace">
        <TaskForm
          categories={categories}
          tags={tags}
          saving={saving}
          onSubmit={handleCreateTask}
          onOpenTagManager={() => setIsTagManagerOpen(true)}
          onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
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
          onTagIdsFilterChange={handleTagIdsFilterChange}
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

