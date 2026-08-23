import type { CategoryItem, PagedResult, QueryState, TagItem, TaskItem } from "./types";

export const PAGE_SIZE = 5;

const apiBaseUrl = import.meta.env.VITE_API_URL?.trim() ?? "";

export function defaultQuery(): QueryState {
  return {
    search: "",
    isDone: "",
    categoryId: null,
    tagId: null,
    sortBy: null,
    sortDir: "desc",
    pageIndex: 0,
  };
}

function buildApiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

async function handleApiError(response: Response, defaultMessage: string): Promise<never> {
  try {
    const data = await response.json();
    if (data && typeof data === "object") {
      if (typeof data.detail === "string" && data.detail) {
        throw new Error(data.detail);
      }
      if (typeof data.title === "string" && data.title) {
        throw new Error(data.title);
      }
      if (data.errors && typeof data.errors === "object") {
        const firstError = Object.values(data.errors).flat()[0];
        if (firstError) {
          throw new Error(String(firstError));
        }
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message && !err.message.startsWith("Failed to parse")) {
      throw err;
    }
  }
  throw new Error(`${defaultMessage} (${response.status})`);
}

export async function fetchTasks(query: QueryState): Promise<PagedResult> {
  const params = new URLSearchParams();
  if (query.search) params.set("search", query.search);
  if (query.isDone !== "") params.set("isDone", query.isDone);
  if (query.categoryId !== null) params.set("categoryId", String(query.categoryId));
  if (query.tagId !== null) params.set("tagId", String(query.tagId));
  if (query.sortBy !== null) {
    params.set("sortBy", query.sortBy);
    params.set("sortDir", query.sortDir);
  }
  params.set("pageIndex", String(query.pageIndex));
  params.set("pageSize", String(PAGE_SIZE));

  const response = await fetch(buildApiUrl(`/api/tasks?${params.toString()}`));
  if (!response.ok) {
    await handleApiError(response, "Failed to load tasks");
  }

  const data = (await response.json()) as PagedResult;
  if (!Array.isArray(data.items)) {
    throw new Error("Unexpected response shape from API");
  }
  return data;
}

export async function fetchTask(taskId: number): Promise<TaskItem> {
  const response = await fetch(buildApiUrl(`/api/tasks/${taskId}`));
  if (!response.ok) {
    await handleApiError(response, "Failed to load task details");
  }
  return (await response.json()) as TaskItem;
}

export async function createTask(
  title: string,
  categoryId?: number | null,
  tagIds?: number[],
): Promise<void> {
  const response = await fetch(buildApiUrl("/api/tasks"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      title,
      categoryId: categoryId ?? null,
      tagIds: tagIds ?? null,
    }),
  });
  if (!response.ok) {
    await handleApiError(response, "Failed to create task");
  }
}

export async function updateTask(
  taskId: number,
  body: {
    title?: string;
    isDone?: boolean;
    categoryId?: number | null;
    tagIds?: number[];
  },
): Promise<void> {
  const response = await fetch(buildApiUrl(`/api/tasks/${taskId}`), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    await handleApiError(response, "Failed to update task");
  }
}

export async function toggleAllTasks(nextIsDone: boolean): Promise<void> {
  const response = await fetch(buildApiUrl("/api/tasks/mark-all"), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ isDone: nextIsDone }),
  });
  if (!response.ok) {
    await handleApiError(response, "Failed to update tasks");
  }
}

export async function deleteTask(taskId: number): Promise<void> {
  const response = await fetch(buildApiUrl(`/api/tasks/${taskId}`), {
    method: "DELETE",
  });
  if (!response.ok) {
    await handleApiError(response, "Failed to delete task");
  }
}

export async function fetchCategories(): Promise<CategoryItem[]> {
  const response = await fetch(buildApiUrl("/api/categories"));
  if (!response.ok) {
    await handleApiError(response, "Failed to load categories");
  }

  const data = (await response.json()) as CategoryItem[];
  if (!Array.isArray(data)) {
    throw new Error("Unexpected categories response shape from API");
  }
  return data;
}

export async function createCategory(name: string): Promise<CategoryItem> {
  const response = await fetch(buildApiUrl("/api/categories"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    await handleApiError(response, "Failed to create category");
  }
  return (await response.json()) as CategoryItem;
}

export async function deleteCategory(categoryId: number): Promise<void> {
  const response = await fetch(buildApiUrl(`/api/categories/${categoryId}`), {
    method: "DELETE",
  });
  if (!response.ok) {
    await handleApiError(response, "Failed to delete category");
  }
}

export async function fetchTags(): Promise<TagItem[]> {
  const response = await fetch(buildApiUrl("/api/tags"));
  if (!response.ok) {
    await handleApiError(response, "Failed to load tags");
  }

  const data = (await response.json()) as TagItem[];
  if (!Array.isArray(data)) {
    throw new Error("Unexpected tags response shape from API");
  }
  return data;
}

export async function createTag(name: string): Promise<TagItem> {
  const response = await fetch(buildApiUrl("/api/tags"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name }),
  });
  if (!response.ok) {
    await handleApiError(response, "Failed to create tag");
  }
  return (await response.json()) as TagItem;
}

export async function deleteTag(tagId: number): Promise<void> {
  const response = await fetch(buildApiUrl(`/api/tags/${tagId}`), {
    method: "DELETE",
  });
  if (!response.ok) {
    await handleApiError(response, "Failed to delete tag");
  }
}

export function toErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}