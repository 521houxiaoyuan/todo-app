import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import TodoView from '../views/TodoView.vue';

const routes = [
  { path: '/login', component: LoginView },
  { path: '/register', component: RegisterView },
  { path: '/', component: TodoView, meta: { requiresAuth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const isLoggedIn = !!localStorage.getItem('token');
  if (to.meta.requiresAuth && !isLoggedIn) return next('/login');
  if ((to.path === '/login' || to.path === '/register') && isLoggedIn) return next('/');
  next();
});

export default router;
