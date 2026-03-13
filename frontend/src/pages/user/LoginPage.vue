<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { message } from 'ant-design-vue'
import { CodeOutlined, ThunderboltOutlined, DeploymentUnitOutlined } from '@ant-design/icons-vue'
import { userLogin } from '@/api/userController'
import { useUserStore } from '@/stores/user'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const loading = ref(false)

const form = reactive<API.UserLoginRequest>({
  userAccount: '',
  userPassword: '',
})

const handleLogin = async () => {
  loading.value = true
  try {
    const res = await userLogin(form)
    if (res.data?.code === 0 && res.data.data) {
      userStore.setLoginUser(res.data.data)
      message.success('登录成功')
      const redirect = route.query.redirect
        ? decodeURIComponent(route.query.redirect as string)
        : '/'
      router.replace(redirect)
    } else {
      message.error(res.data?.message || '登录失败，请检查账号或密码')
    }
  } catch {
    message.error('网络异常，请稍后重试')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="auth-page">
    <!-- 左侧品牌区 -->
    <div class="brand-panel">
      <div class="brand-content">
        <div class="brand-logo">
          <img src="/ZeoCode.png" alt="logo" class="logo-img" />
          <span class="logo-text">ZeoCode</span>
        </div>
        <h2 class="brand-headline">一句话，创建你的网站</h2>
        <p class="brand-desc">与 AI 对话，几秒内生成完整可运行的 Web 应用</p>

        <ul class="feature-list">
          <li>
            <span class="feature-icon"><ThunderboltOutlined /></span>
            <span>AI 驱动，秒级生成完整网页</span>
          </li>
          <li>
            <span class="feature-icon"><CodeOutlined /></span>
            <span>支持原生 HTML、多文件、Vue 工程多种模式</span>
          </li>
          <li>
            <span class="feature-icon"><DeploymentUnitOutlined /></span>
            <span>一键部署，即刻分享你的创作</span>
          </li>
        </ul>
      </div>

      <!-- 装饰光斑 -->
      <div class="glow glow-1" />
      <div class="glow glow-2" />
    </div>

    <!-- 右侧表单区 -->
    <div class="form-panel">
      <div class="form-card">
        <div class="form-header">
          <h1 class="form-title">欢迎回来</h1>
          <p class="form-subtitle">登录以继续你的创作</p>
        </div>

        <a-form :model="form" layout="vertical" class="login-form" @finish="handleLogin">
          <a-form-item
            label="账号"
            name="userAccount"
            :rules="[{ required: true, message: '请输入账号' }]"
          >
            <a-input
              v-model:value="form.userAccount"
              placeholder="请输入账号"
              size="large"
              allow-clear
            />
          </a-form-item>

          <a-form-item
            label="密码"
            name="userPassword"
            :rules="[{ required: true, message: '请输入密码' }]"
          >
            <a-input-password
              v-model:value="form.userPassword"
              placeholder="请输入密码"
              size="large"
            />
          </a-form-item>

          <a-form-item style="margin-top: 12px">
            <a-button
              type="primary"
              html-type="submit"
              size="large"
              block
              :loading="loading"
              class="submit-btn"
            >
              登录
            </a-button>
          </a-form-item>
        </a-form>

        <div class="form-footer">
          还没有账号？
          <a class="link" @click="router.push('/user/register')">立即注册</a>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  min-height: 100vh;
  display: flex;
}

/* ---- 左侧品牌区 ---- */
.brand-panel {
  flex: 1;
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #a855f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 56px;
}

@media (max-width: 768px) {
  .brand-panel {
    display: none;
  }
}

.brand-content {
  position: relative;
  z-index: 1;
  color: #fff;
  max-width: 420px;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 40px;
}

.logo-img {
  width: 44px;
  height: 44px;
  border-radius: 10px;
  object-fit: contain;
}

.logo-text {
  font-size: 24px;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #fff;
}

.brand-headline {
  font-size: 36px;
  font-weight: 800;
  line-height: 1.25;
  color: #fff;
  margin-bottom: 16px;
  letter-spacing: -0.5px;
}

.brand-desc {
  font-size: 16px;
  color: rgba(255, 255, 255, 0.75);
  line-height: 1.7;
  margin-bottom: 40px;
}

.feature-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.feature-list li {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 15px;
  color: rgba(255, 255, 255, 0.9);
}

.feature-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.15);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  flex-shrink: 0;
  backdrop-filter: blur(4px);
}

/* 装饰光斑 */
.glow {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.35;
  pointer-events: none;
}

.glow-1 {
  width: 400px;
  height: 400px;
  background: #818cf8;
  top: -100px;
  right: -100px;
}

.glow-2 {
  width: 300px;
  height: 300px;
  background: #e879f9;
  bottom: -80px;
  left: -60px;
}

/* ---- 右侧表单区 ---- */
.form-panel {
  width: 480px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 40px 32px;
}

@media (max-width: 768px) {
  .form-panel {
    width: 100%;
  }
}

.form-card {
  width: 100%;
  max-width: 360px;
}

.form-header {
  margin-bottom: 32px;
}

.form-title {
  font-size: 26px;
  font-weight: 800;
  color: #0f172a;
  margin-bottom: 6px;
  letter-spacing: -0.3px;
}

.form-subtitle {
  font-size: 14px;
  color: #94a3b8;
  margin: 0;
}

.login-form :deep(.ant-form-item-label > label) {
  font-weight: 600;
  color: #374151;
  font-size: 13px;
}

.login-form :deep(.ant-input-lg),
.login-form :deep(.ant-input-password.ant-input-affix-wrapper-lg) {
  border-radius: 10px;
  border-color: #e2e8f0;
  background: #fff;
}

.login-form :deep(.ant-input-lg:focus),
.login-form :deep(.ant-input-affix-wrapper-focused) {
  border-color: #7c3aed;
  box-shadow: 0 0 0 2px rgba(124, 58, 237, 0.12);
}

.submit-btn {
  border-radius: 10px;
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #6d28d9, #7c3aed);
  border: none;
  box-shadow: 0 4px 14px rgba(124, 58, 237, 0.35);
  transition: opacity 0.2s, box-shadow 0.2s;
}

.submit-btn:hover {
  opacity: 0.9;
  box-shadow: 0 6px 20px rgba(124, 58, 237, 0.45);
}

.form-footer {
  text-align: center;
  margin-top: 20px;
  font-size: 14px;
  color: #64748b;
}

.link {
  color: #7c3aed;
  font-weight: 600;
  cursor: pointer;
  margin-left: 4px;
  transition: color 0.2s;
}

.link:hover {
  color: #6d28d9;
}
</style>
