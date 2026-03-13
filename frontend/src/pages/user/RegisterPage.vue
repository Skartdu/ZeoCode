<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import type { Rule } from 'ant-design-vue/es/form'
import { CodeOutlined, ThunderboltOutlined, DeploymentUnitOutlined } from '@ant-design/icons-vue'
import { userRegister } from '@/api/userController'

const router = useRouter()
const loading = ref(false)

const form = reactive<API.UserRegisterRequest>({
  userAccount: '',
  userPassword: '',
  checkPassword: '',
})

const validateCheckPassword = async (_rule: Rule, value: string) => {
  if (!value) return Promise.reject('请再次输入密码')
  if (value !== form.userPassword) return Promise.reject('两次输入的密码不一致')
  return Promise.resolve()
}

const rules: Record<string, Rule[]> = {
  userAccount: [
    { required: true, message: '请输入账号' },
    { min: 4, message: '账号长度不能少于 4 位' },
  ],
  userPassword: [
    { required: true, message: '请输入密码' },
    { min: 8, message: '密码长度不能少于 8 位' },
  ],
  checkPassword: [{ required: true, validator: validateCheckPassword }],
}

const handleRegister = async () => {
  loading.value = true
  try {
    const res = await userRegister(form)
    if (res.data?.code === 0) {
      message.success('注册成功，请登录')
      router.push('/user/login')
    } else {
      message.error(res.data?.message || '注册失败，请稍后重试')
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
        <h2 class="brand-headline">开始你的第一个 AI 应用</h2>
        <p class="brand-desc">注册账号，与 AI 对话，几秒钟创建属于你的网站</p>

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

      <div class="glow glow-1" />
      <div class="glow glow-2" />
    </div>

    <!-- 右侧表单区 -->
    <div class="form-panel">
      <div class="form-card">
        <div class="form-header">
          <h1 class="form-title">创建账号</h1>
          <p class="form-subtitle">免费注册，立即开始创作</p>
        </div>

        <a-form :model="form" :rules="rules" layout="vertical" class="register-form" @finish="handleRegister">
          <a-form-item label="账号" name="userAccount">
            <a-input
              v-model:value="form.userAccount"
              placeholder="请输入账号（至少 4 位）"
              size="large"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="密码" name="userPassword">
            <a-input-password
              v-model:value="form.userPassword"
              placeholder="请输入密码（至少 8 位）"
              size="large"
            />
          </a-form-item>

          <a-form-item label="确认密码" name="checkPassword">
            <a-input-password
              v-model:value="form.checkPassword"
              placeholder="请再次输入密码"
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
              注册
            </a-button>
          </a-form-item>
        </a-form>

        <div class="form-footer">
          已有账号？
          <a class="link" @click="router.push('/user/login')">立即登录</a>
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

.register-form :deep(.ant-form-item-label > label) {
  font-weight: 600;
  color: #374151;
  font-size: 13px;
}

.register-form :deep(.ant-input-lg),
.register-form :deep(.ant-input-password.ant-input-affix-wrapper-lg) {
  border-radius: 10px;
  border-color: #e2e8f0;
  background: #fff;
}

.register-form :deep(.ant-input-lg:focus),
.register-form :deep(.ant-input-affix-wrapper-focused) {
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
