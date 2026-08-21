/**
 * 待办列表（纯逻辑，可单测）
 * 添加 / 标记完成 / 删除；完成返回是否「刚完成」（用于好感度奖励联动）。
 */
export interface Todo {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  completedAt?: number;
}

export type TodosAction =
  | { type: 'add'; text: string }
  | { type: 'toggle'; id: string }
  | { type: 'remove'; id: string };

let seq = 0;
function uid(): string {
  seq += 1;
  return `todo-${Date.now().toString(36)}-${seq}`;
}

export interface TodosResult {
  todos: Todo[];
  /** 本次是否刚完成一项（用于好感度 +task 奖励） */
  justCompleted: boolean;
}

export function todosReducer(todos: Todo[], action: TodosAction): TodosResult {
  switch (action.type) {
    case 'add': {
      const text = action.text.trim();
      if (!text) return { todos, justCompleted: false };
      return { todos: [...todos, { id: uid(), text, done: false, createdAt: Date.now() }], justCompleted: false };
    }
    case 'toggle': {
      let justCompleted = false;
      const next = todos.map((t) => {
        if (t.id !== action.id) return t;
        const done = !t.done;
        if (done) justCompleted = true;
        return { ...t, done, completedAt: done ? Date.now() : undefined };
      });
      return { todos: next, justCompleted };
    }
    case 'remove':
      return { todos: todos.filter((t) => t.id !== action.id), justCompleted: false };
    default:
      return { todos, justCompleted: false };
  }
}

export function openCount(todos: Todo[]): number {
  return todos.filter((t) => !t.done).length;
}