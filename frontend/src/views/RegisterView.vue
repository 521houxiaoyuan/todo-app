<template>
  <div class="auth-form">
    <h2>注册</h2>
    <p v-if="error" class="error">{{ error }}</p>
    <input v-model="username" placeholder="用户名（3-50字符）" />
    <input v-model="password" type="password" placeholder="密码（6-100字符）" />
    <button :disabled="loading" @click="handleRegister">
      {{ loading ? '注册中...' : '注册' }}
    </button>
    <p>已有账号？<router-link to="/login">登录</router-link></p>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { authApi } from '../api/index.js';

const router = useRouter();
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function handleRegister() {
  error.value = '';
  if (!username.value.trim() || username.value.trim().length < 3) {
    error.value = '用户名至少3个字符';
    return;
  }
  if (!password.value || password.value.length < 6) {
    error.value = '密码至少6个字符';
    return;
  }
  loading.value = true;
  try {
    await authApi.register({ username: username.value, password: password.value });
    router.push('/login');
  } catch (e) {
    error.value = e.response?.data?.error || '注册失败';
  } finally {
    loading.value = false;
  }
}
</script>
