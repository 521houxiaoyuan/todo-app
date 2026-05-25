<template>
  <form @submit.prevent="handleSubmit">
    <input v-model="title" placeholder="添加新的待办事项..." />
    <button type="submit" :disabled="!title.trim() || loading">
      {{ loading ? '添加中...' : '添加' }}
    </button>
  </form>
</template>

<script setup>
import { ref } from 'vue';
import { useTodoStore } from '../stores/todo.js';

const store = useTodoStore();
const title = ref('');
const loading = ref(false);

async function handleSubmit() {
  if (!title.value.trim()) return;
  loading.value = true;
  try {
    await store.addTodo(title.value.trim());
    title.value = '';
  } finally {
    loading.value = false;
  }
}
</script>
