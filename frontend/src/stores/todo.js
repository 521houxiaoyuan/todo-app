import { defineStore } from 'pinia';
import { todosApi } from '../api/index.js';

export const useTodoStore = defineStore('todo', {
  state: () => ({
    todos: [],
    error: null,
    loading: false,
  }),
  actions: {
    async fetchTodos() {
      this.loading = true;
      try {
        const res = await todosApi.list();
        this.todos = res.data.data;
        this.error = null;
      } catch (e) {
        this.error = e.response?.data?.error || 'Failed to load todos';
      } finally {
        this.loading = false;
      }
    },
    async addTodo(title) {
      try {
        const res = await todosApi.create({ title });
        this.todos.push(res.data.data);
        this.error = null;
      } catch (e) {
        this.error = e.response?.data?.error || 'Failed to add todo';
      }
    },
    async updateTodo(id, payload) {
      try {
        const res = await todosApi.update(id, payload);
        const idx = this.todos.findIndex(t => t.id === id);
        if (idx !== -1) this.todos.splice(idx, 1, res.data.data);
        this.error = null;
      } catch (e) {
        this.error = e.response?.data?.error || 'Failed to update todo';
      }
    },
    async removeTodo(id) {
      try {
        await todosApi.remove(id);
        this.todos = this.todos.filter(t => t.id !== id);
        this.error = null;
      } catch (e) {
        this.error = e.response?.data?.error || 'Failed to delete todo';
      }
    },
  },
});
