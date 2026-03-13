<script setup lang="ts">
import { computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import dayjs from 'dayjs'
import { deleteApp } from '@/api/appController'
import { useUserStore } from '@/stores/user'
import UserInfo from '@/components/user/UserInfo.vue'
import { getCodeGenTypeLabel, getCodeGenTypeColor } from '@/constants/codeGenType'

interface Props {
  open: boolean
  app: API.AppVO | null
  appId: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  /** 删除成功后由父组件决定跳转/刷新 */
  deleted: []
}>()

const router = useRouter()
const userStore = useUserStore()

const canManage = computed(() => {
  if (!userStore.loginUser || !props.app) return false
  return (
    userStore.loginUser.userRole === 'admin' ||
    String(userStore.loginUser.id) === String(props.app.userId)
  )
})

const handleEdit = () => {
  emit('update:open', false)
  router.push(`/app/edit/${props.appId}`)
}

const handleDelete = async () => {
  try {
    const res = await deleteApp({ id: props.app?.id })
    if (res.data?.code === 0) {
      message.success('删除成功')
      emit('update:open', false)
      emit('deleted')
    } else {
      message.error(res.data?.message || '删除失败')
    }
  } catch {
    message.error('网络异常')
  }
}
</script>

<template>
  <a-drawer
    :open="open"
    title="应用详情"
    placement="right"
    :width="340"
    :body-style="{ padding: '24px 20px' }"
    @update:open="emit('update:open', $event)"
  >
    <template v-if="app">
      <!-- 基础信息 -->
      <div class="detail-section">
        <div class="detail-row">
          <span class="detail-label">生成类型</span>
          <a-tag :color="getCodeGenTypeColor(app.codeGenType)" style="margin: 0">
            {{ getCodeGenTypeLabel(app.codeGenType) }}
          </a-tag>
        </div>
        <div class="detail-row">
          <span class="detail-label">创建者</span>
          <UserInfo :user="app.user" :size="28" fallback="未知用户" />
        </div>
        <div class="detail-row">
          <span class="detail-label">创建时间</span>
          <span class="detail-value">
            {{ app.createTime ? dayjs(app.createTime).format('YYYY-MM-DD HH:mm') : '-' }}
          </span>
        </div>
      </div>

      <!-- 操作栏（本人或管理员可见） -->
      <template v-if="canManage">
        <a-divider />
        <div class="detail-actions">
          <a-button block :icon="h(EditOutlined)" @click="handleEdit">
            修改应用信息
          </a-button>
          <a-popconfirm
            title="确定要删除该应用吗？"
            ok-text="删除"
            ok-type="danger"
            cancel-text="取消"
            @confirm="handleDelete"
          >
            <a-button block danger :icon="h(DeleteOutlined)" style="margin-top: 10px">
              删除应用
            </a-button>
          </a-popconfirm>
        </div>
      </template>
    </template>
    <a-skeleton v-else active />
  </a-drawer>
</template>

<style scoped>
.detail-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.detail-label {
  font-size: 13px;
  color: #94a3b8;
  flex-shrink: 0;
}

.detail-value {
  font-size: 13px;
  color: #1e293b;
  text-align: right;
}

.detail-actions {
  display: flex;
  flex-direction: column;
}
</style>
