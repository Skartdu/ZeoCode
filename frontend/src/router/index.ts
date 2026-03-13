import { createRouter, createWebHistory } from 'vue-router'
import BasicLayout from '@/layouts/BasicLayout.vue'
import HomePage from '@/pages/HomePage.vue'
import LoginPage from '@/pages/user/LoginPage.vue'
import RegisterPage from '@/pages/user/RegisterPage.vue'
import UserManagePage from '@/pages/admin/UserManagePage.vue'
import AppChatPage from '@/pages/app/AppChatPage.vue'
import AppEditPage from '@/pages/app/AppEditPage.vue'
import AppManagePage from '@/pages/admin/AppManagePage.vue'
import ChatManagePage from '@/pages/admin/ChatManagePage.vue'
import { useUserStore } from '@/stores/user'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: BasicLayout,
      children: [
        { path: '', name: 'home', component: HomePage },
        { path: 'app/chat/:appId', name: 'appChat', component: AppChatPage },
        { path: 'app/edit/:appId', name: 'appEdit', component: AppEditPage },
        {
          path: 'admin/user',
          name: 'adminUser',
          component: UserManagePage,
          meta: { requiresAdmin: true },
        },
        {
          path: 'admin/app',
          name: 'adminApp',
          component: AppManagePage,
          meta: { requiresAdmin: true },
        },
        {
          path: 'admin/chat',
          name: 'adminChat',
          component: ChatManagePage,
          meta: { requiresAdmin: true },
        },
      ],
    },
    { path: '/user/login', name: 'login', component: LoginPage },
    { path: '/user/register', name: 'register', component: RegisterPage },
  ],
})

// 全局权限守卫
router.beforeEach(async (to) => {
  const userStore = useUserStore()

  // 首次导航时先等待用户信息加载完，再做权限判断
  if (!userStore.initialized) {
    await userStore.fetchCurrentUser()
  }

  if (to.meta.requiresAdmin) {
    if (!userStore.loginUser) {
      return { name: 'login', query: { redirect: encodeURIComponent(to.fullPath) } }
    }
    if (userStore.loginUser.userRole !== 'admin') {
      return { name: 'home' }
    }
  }
})

export default router
