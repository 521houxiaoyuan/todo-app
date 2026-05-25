<template>
  <div class="auth-form">
    <h2>登录</h2>
    <p v-if="error" class="error">{{ error }}</p>
    <input v-model="username" placeholder="用户名" />
    <input v-model="password" type="password" placeholder="密码" />
    <button :disabled="loading" @click="handleLogin">
      {{ loading ? '登录中...' : '登录' }}
    </button>
    <p>没有账号？<router-link to="/register">注册</router-link></p>
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

async function handleLogin() {
  error.value = '';
  if (!username.value.trim() || !password.value) {
    error.value = '请输入用户名和密码';
    return;
  }
  loading.value = true;
  try {
    const res = await authApi.login({ username: username.value, password: password.value });
    localStorage.setItem('token', res.data.data.token);
    router.push('/');
  } catch (e) {
    error.value = e.response?.data?.error || '登录失败';
  } finally {
    loading.value = false;
  }
}
</script>
