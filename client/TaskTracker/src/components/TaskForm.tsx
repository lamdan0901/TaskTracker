import { memo, useState } from "react";
import type { CategoryItem, Priority } from "../types";

type TaskFormProps = {
  categories: CategoryItem[];
  saving: boolean;
  onSubmit: (title: string, categoryId: number | null, priority: Priority) => boolean;
};

function TaskForm({ categories, saving, onSubmit }: TaskFormProps) {
  const [title, setTitle] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [priority, setPriority] = useState<Priority>("Medium");

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (onSubmit(title.trim(), categoryId, priority)) {
      setTitle("");
      setCategoryId(null);
      setPriority("Medium");
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
          id="task-priority-select"
          className="task-form-priority-select"
          value={priority}
          onChange={(e) => setPriority(e.target.value as Priority)}
          aria-label="Select priority"
        >
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
          <option value="Urgent">Urgent</option>
        </select>

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