import { memo, useState } from "react";
import type { CategoryItem } from "../types";

type TaskFormProps = {
  categories: CategoryItem[];
  saving: boolean;
  onSubmit: (title: string, categoryId: number | null) => boolean;
};

function TaskForm({ categories, saving, onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (onSubmit(title.trim(), categoryId)) {
      setTitle("");
      setCategoryId(null);
    }
  }

  return (
    <form className="task-form" onSubmit={handleSubmit}>
      <div className="task-form-row">
        <input
          id="task-title"
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Write the next thing to do..."
          autoComplete="off"
        />

        <select
          id="task-category-select"
          className="task-form-category-select"
          value={categoryId ?? ""}
          onChange={(e) => {
            const val = e.target.value;
            setCategoryId(val === "" ? null : Number(val));
          }}
          aria-label="Select category (optional)"
        >
          <option value="">No category</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Add task"}
        </button>
      </div>
    </form>
  );
}

export default memo(TaskForm);