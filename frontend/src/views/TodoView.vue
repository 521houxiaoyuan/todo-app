<template>
  <div class="todo-view">
    <div class="header">
      <h1>我的待办</h1>
      <button @click="handleLogout">退出</button>
    </div>
    <p v-if="store.error" class="error">{{ store.error }}</p>
    <TodoForm />
    <div class="todo-list">
      <p v-if="store.loading" class="empty">加载中...</p>
      <template v-else>
        <TodoItem v-for="todo in store.todos" :key="todo.id" :todo="todo" />
        <p v-if="store.todos.length === 0" class="empty">暂无待办事项</p>
      </template>
    </div>
  </div>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useTodoStore } from '../stores/todo.js';
import TodoForm from '../components/TodoForm.vue';
import TodoItem from '../components/TodoItem.vue';

const store = useTodoStore();
const router = useRouter();

onMounted(() => store.fetchTodos());

function handleLogout() {
  store.$reset();
  localStorage.removeItem('token');
  router.push('/login');
}
</script>
