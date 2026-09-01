export type CategorySummary = {
  id: number;
  name: string;
};

export type TagSummary = {
  id: number;
  name: string;
};

export type CategoryItem = {
  id: number;
  name: string;
  taskCount: number;
  createdAt: string;
};

export type TagItem = {
  id: number;
  name: string;
  taskCount: number;
  createdAt: string;
};

export type SubtaskItem = {
  id: number;
  title: string;
  isDone: boolean;
  createdAt: string;
  taskId?: number;
};

export type Priority = "Low" | "Medium" | "High" | "Urgent";

export type TaskItem = {
  id: number;
  title: string;
  isDone: boolean;
  priority: Priority;
  dueDate: string | null;
  createdAt: string;
  categoryId: number | null;
  category: CategorySummary | null;
  tags: TagSummary[];
  subtasks?: SubtaskItem[];
};

export type PagedResult = {
  items: TaskItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
};

export type SortKey = "createdAt" | "title" | "isDone" | "priority" | "dueDate";
export type SortDir = "asc" | "desc";
export type DoneFilter = "" | "true" | "false";

export type QueryState = {
  search: string;
  isDone: DoneFilter;
  priority: Priority | "";
  dueDate: string;
  isOverdue: "" | "true" | "false";
  categoryId: number | null;
  tagId: number | null;
  sortBy: SortKey | null;
  sortDir: SortDir;
  pageIndex: number;
};

export type AuthUser = {
  id: number;
  email: string;
};

export type AuthResponse = {
  token: string;
};