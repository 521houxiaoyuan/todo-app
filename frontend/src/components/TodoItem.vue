<template>
  <div class="todo-item">
    <input type="checkbox" :checked="todo.completed" @change="toggleComplete" />
    <span v-if="!editing" :class="{ done: todo.completed }" @dblclick="startEdit">
      {{ todo.title }}
    </span>
    <input
      v-else
      v-model="editTitle"
      @blur="saveEdit"
      @keyup.enter="saveEdit"
      @keyup.escape="cancelEdit"
      ref="editInput"
    />
    <button @click="handleDelete" class="delete-btn">删除</button>
  </div>
</template>

<script setup>
import { ref, nextTick } from 'vue';
import { useTodoStore } from '../stores/todo.js';

const props = defineProps({
  todo: { type: Object, required: true }
});
const store = useTodoStore();
const editing = ref(false);
const editTitle = ref('');
const editInput = ref(null);

async function toggleComplete() {
  await store.updateTodo(props.todo.id, { completed: !props.todo.completed });
}

async function startEdit() {
  editing.value = true;
  editTitle.value = props.todo.title;
  await nextTick();
  editInput.value?.focus();
}

async function saveEdit() {
  if (!editing.value) return;
  if (!editTitle.value.trim()) return cancelEdit();
  editing.value = false;
  await store.updateTodo(props.todo.id, { title: editTitle.value.trim() });
}

function cancelEdit() {
  editing.value = false;
}

async function handleDelete() {
  await store.removeTodo(props.todo.id);
}
</script>
