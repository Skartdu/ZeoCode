<script setup lang="ts">
import {RouterLink, useRouter} from 'vue-router'
import {computed, h} from 'vue'
import {message} from 'ant-design-vue'
import {LogoutOutlined, SettingOutlined, UserOutlined} from '@ant-design/icons-vue'
import {useUserStore} from '@/stores/user'
import {userLogout} from '@/api/userController'

const router = useRouter()
const userStore = useUserStore()

const isAdmin = computed(() => userStore.loginUser?.userRole === 'admin')

const menuItems = computed(() => {
  const items = [{ key: '/', label: '首页' }]
  if (isAdmin.value) {
    items.push({ key: '/admin/user', label: '用户管理' })
    items.push({ key: '/admin/app', label: '应用管理' })
    items.push({ key: '/admin/chat', label: '对话管理' })
  }
  return items
})

const selectedKeys = computed(() => [router.currentRoute.value.path])

const handleMenuClick = ({ key }: { key: string }) => {
  router.push(key)
}

const handleLogout = async () => {
  try {
    await userLogout()
  } finally {
    userStore.clearLoginUser()
    message.success('已退出登录')
    router.push('/user/login')
  }
}
</script>

<template>
  <a-layout-header class="global-header">
    <!-- 左侧：logo + 标题 + 菜单 -->
    <div class="header-left">
      <RouterLink to="/" class="logo-area">
        <img src="/ZeoCode.png" alt="logo" class="logo-img" />
        <span class="site-title">ZeoCode</span>
      </RouterLink>

      <a-menu
        mode="horizontal"
        :selected-keys="selectedKeys"
        class="nav-menu"
        @click="handleMenuClick"
      >
        <a-menu-item v-for="item in menuItems" :key="item.key">
          {{ item.label }}
        </a-menu-item>
      </a-menu>
    </div>

    <!-- 右侧：用户信息 / 登录按钮 -->
    <div class="header-right">
      <!-- 已登录 -->
      <template v-if="userStore.loginUser">
        <a-dropdown placement="bottomRight">
          <div class="user-info">
            <a-avatar
              :src="userStore.loginUser.userAvatar ?? undefined"
              :icon="!userStore.loginUser.userAvatar ? h(UserOutlined) : undefined"
              :size="32"
            />
            <span class="username">
              {{ userStore.loginUser.userName || userStore.loginUser.userAccount }}
            </span>
          </div>
          <template #overlay>
            <a-menu>
              <a-menu-item key="profile" @click="router.push('/user/profile')">
                <span class="dropdown-item">
                  <SettingOutlined class="dropdown-icon" />个人中心
                </span>
              </a-menu-item>
              <a-menu-divider />
              <a-menu-item key="logout" @click="handleLogout">
                <span class="dropdown-item dropdown-item--danger">
                  <LogoutOutlined class="dropdown-icon" />退出登录
                </span>
              </a-menu-item>
            </a-menu>
          </template>
        </a-dropdown>
      </template>

      <!-- 未登录 -->
      <template v-else>
        <a-button type="primary" @click="router.push('/user/login')">登录</a-button>
      </template>
    </div>
  </a-layout-header>
</template>

<style scoped>
.global-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: #ffffff;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
  overflow: hidden;
}

.logo-area {
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
  flex-shrink: 0;
}

.logo-img {
  height: 36px;
  width: 36px;
  object-fit: contain;
}

.site-title {
  font-size: 18px;
  font-weight: 700;
  color: #1d2939;
  white-space: nowrap;
}

.nav-menu {
  border-bottom: none !important;
  line-height: 64px;
  flex: 1;
}

.header-right {
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 8px;
  transition: background 0.2s;
}

.user-info:hover {
  background: #f5f5f5;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 110px;
}

.dropdown-item--danger {
  color: #ff4d4f;
}

.dropdown-icon {
  font-size: 14px;
}

.username {
  font-size: 14px;
  color: #1d2939;
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
