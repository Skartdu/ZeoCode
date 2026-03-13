<script setup lang="ts">
import { UserOutlined } from '@ant-design/icons-vue'

interface Props {
  /** 用户信息对象 */
  user?: { userAvatar?: string; userName?: string; userAccount?: string } | null
  /** 头像尺寸，默认 32 */
  size?: number
  /** 无用户时的兜底文字 */
  fallback?: string
  /** 是否显示昵称，默认 true */
  showName?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 32,
  fallback: '未知用户',
  showName: true,
})

const displayName = () =>
  props.user?.userName || props.user?.userAccount || props.fallback
</script>

<template>
  <div class="user-info">
    <a-avatar :src="user?.userAvatar ?? undefined" :size="size" class="ui-avatar">
      <template v-if="!user?.userAvatar" #icon>
        <UserOutlined />
      </template>
    </a-avatar>
    <span v-if="showName" class="ui-name">{{ displayName() }}</span>
  </div>
</template>

<style scoped>
.user-info {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ui-avatar {
  flex-shrink: 0;
  background: #ede9fe;
  color: #7c3aed;
}

.ui-name {
  font-size: 13px;
  color: #1e293b;
  font-weight: 500;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
