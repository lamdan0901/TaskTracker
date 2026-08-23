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

export type TaskItem = {
  id: number;
  title: string;
  isDone: boolean;
  createdAt: string;
  categoryId: number | null;
  category: CategorySummary | null;
  tags: TagSummary[];
};

export type PagedResult = {
  items: TaskItem[];
  totalCount: number;
  pageIndex: number;
  pageSize: number;
};

export type SortKey = "createdAt" | "title" | "isDone";
export type SortDir = "asc" | "desc";
export type DoneFilter = "" | "true" | "false";

export type QueryState = {
  search: string;
  isDone: DoneFilter;
  categoryId: number | null;
  tagId: number | null;
  sortBy: SortKey | null;
  sortDir: SortDir;
  pageIndex: number;
};