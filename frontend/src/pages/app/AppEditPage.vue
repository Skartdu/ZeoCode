<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { getAppVoById, getAppVoByIdByAdmin, updateApp, updateAppByAdmin } from '@/api/appController'
import { useUserStore } from '@/stores/user'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appId = route.params.appId as string
const isAdmin = computed(() => userStore.loginUser?.userRole === 'admin')

const appInfo = ref<API.AppVO | null>(null)
const loading = ref(true)
const saving = ref(false)

// 用户表单（只能改名称）
const userForm = reactive<API.AppUpdateRequest>({
  id: appId as unknown as number,
  appName: '',
})

// 管理员表单（名称 + 封面 + 优先级）
const adminForm = reactive<API.AppAdminUpdateRequest>({
  id: appId as unknown as number,
  appName: '',
  cover: '',
  priority: 0,
})

const fetchApp = async () => {
  loading.value = true
  try {
    const res = isAdmin.value
      ? await getAppVoByIdByAdmin({ id: appId as unknown as number })
      : await getAppVoById({ id: appId as unknown as number })

    if (res.data?.code === 0 && res.data.data) {
      appInfo.value = res.data.data

      // 权限校验：普通用户只能编辑自己的应用
      if (!isAdmin.value && appInfo.value.userId !== userStore.loginUser?.id) {
        message.error('无权限编辑该应用')
        router.replace('/')
        return
      }

      userForm.appName = appInfo.value.appName ?? ''
      adminForm.appName = appInfo.value.appName ?? ''
      adminForm.cover = appInfo.value.cover ?? ''
      adminForm.priority = appInfo.value.priority ?? 0
    } else {
      message.error(res.data?.message || '应用不存在')
      router.replace('/')
    }
  } catch {
    message.error('获取应用信息失败')
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    const res = isAdmin.value
      ? await updateAppByAdmin(adminForm)
      : await updateApp(userForm)

    if (res.data?.code === 0) {
      message.success('保存成功')
      router.back()
    } else {
      message.error(res.data?.message || '保存失败')
    }
  } catch {
    message.error('网络异常')
  } finally {
    saving.value = false
  }
}

onMounted(fetchApp)
</script>

<template>
  <div class="edit-page">
    <div class="edit-card">
      <div class="edit-header">
        <a-button type="text" @click="router.back()">← 返回</a-button>
        <h2 class="edit-title">编辑应用</h2>
      </div>

      <a-spin :spinning="loading">
        <!-- 用户表单 -->
        <a-form
          v-if="!isAdmin"
          :model="userForm"
          layout="vertical"
          @finish="handleSave"
        >
          <a-form-item
            label="应用名称"
            name="appName"
            :rules="[{ required: true, message: '请输入应用名称' }]"
          >
            <a-input
              v-model:value="userForm.appName"
              placeholder="请输入应用名称"
              size="large"
              allow-clear
            />
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" html-type="submit" size="large" :loading="saving">
                保存
              </a-button>
              <a-button size="large" @click="router.back()">取消</a-button>
            </a-space>
          </a-form-item>
        </a-form>

        <!-- 管理员表单 -->
        <a-form
          v-else
          :model="adminForm"
          layout="vertical"
          @finish="handleSave"
        >
          <a-form-item
            label="应用名称"
            name="appName"
            :rules="[{ required: true, message: '请输入应用名称' }]"
          >
            <a-input
              v-model:value="adminForm.appName"
              placeholder="请输入应用名称"
              size="large"
              allow-clear
            />
          </a-form-item>

          <a-form-item label="封面 URL" name="cover">
            <a-input
              v-model:value="adminForm.cover"
              placeholder="请输入封面图片地址"
              size="large"
              allow-clear
            />
            <div v-if="adminForm.cover" class="cover-preview">
              <img :src="adminForm.cover" alt="封面预览" class="preview-img" />
            </div>
          </a-form-item>

          <a-form-item label="优先级" name="priority">
            <a-input-number
              v-model:value="adminForm.priority"
              :min="0"
              :max="999"
              size="large"
              style="width: 200px"
            />
            <div class="field-tip">数值越大越靠前，设为 99 即为精选</div>
          </a-form-item>

          <a-form-item>
            <a-space>
              <a-button type="primary" html-type="submit" size="large" :loading="saving">
                保存
              </a-button>
              <a-button size="large" @click="router.back()">取消</a-button>
            </a-space>
          </a-form-item>
        </a-form>
      </a-spin>
    </div>
  </div>
</template>

<style scoped>
.edit-page {
  max-width: 600px;
  margin: 0 auto;
  padding-top: 8px;
}

.edit-card {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px 36px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}

.edit-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 28px;
}

.edit-title {
  font-size: 20px;
  font-weight: 700;
  color: #1e293b;
  margin: 0;
}

.cover-preview {
  margin-top: 10px;
}

.preview-img {
  max-width: 240px;
  max-height: 135px;
  border-radius: 8px;
  object-fit: cover;
  border: 1px solid #e2e8f0;
}

.field-tip {
  font-size: 12px;
  color: #94a3b8;
  margin-top: 4px;
}
</style>
