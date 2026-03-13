<script setup lang="ts">
import { AppstoreOutlined } from '@ant-design/icons-vue'
import UserInfo from '@/components/user/UserInfo.vue'
import { getCodeGenTypeLabel } from '@/constants/codeGenType'

interface Props {
  app: API.AppVO
  /** 卡片底部展示的用户（我的应用传当前登录用户，精选传 app.user） */
  user?: { userAvatar?: string; userName?: string; userAccount?: string } | null
  /** 无用户时兜底文字 */
  fallbackName?: string
}

withDefaults(defineProps<Props>(), { fallbackName: '未知用户' })

const emit = defineEmits<{
  click: [app: API.AppVO]
}>()

/** 根据 codeGenType 返回主色，与常量保持一致 */
const typeColorMap: Record<string, string> = {
  html: '#3b82f6',
  multi_file: '#06b6d4',
  vue_project: '#22c55e',
}

const getTypeColor = (type?: string) => (type ? (typeColorMap[type] ?? '#94a3b8') : '#94a3b8')
</script>

<template>
  <div class="app-card" @click="emit('click', app)">
    <!-- 封面 -->
    <div class="card-cover">
      <img v-if="app.cover" :src="app.cover" :alt="app.appName" class="cover-img" />
      <div v-else class="cover-placeholder">
        <AppstoreOutlined class="placeholder-icon" />
      </div>
    </div>

    <!-- 底部信息 -->
    <div class="card-body">
      <UserInfo :user="user" :size="36" :fallback="fallbackName" class="card-user" />
      <div class="card-info">
        <div class="card-title">{{ app.appName || '未命名应用' }}</div>
        <div class="card-meta">
          <span class="meta-user">{{ user?.userName || user?.userAccount || fallbackName }}</span>
          <template v-if="app.codeGenType">
            <span class="meta-dot">·</span>
            <span
              class="meta-type"
              :style="{ color: getTypeColor(app.codeGenType) }"
            >
              <span class="type-dot" :style="{ background: getTypeColor(app.codeGenType) }" />
              {{ getCodeGenTypeLabel(app.codeGenType) }}
            </span>
          </template>
        </div>
      </div>
    </div>

    <!-- 操作按钮（悬停显示，通过插槽注入） -->
    <div v-if="$slots.actions" class="card-actions" @click.stop>
      <slot name="actions" />
    </div>
  </div>
</template>

<style scoped>
.app-card {
  background: #ffffff;
  border-radius: 16px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.07);
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.app-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.13);
}

.card-cover {
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  background: #f8fafc;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.app-card:hover .cover-img {
  transform: scale(1.03);
}

.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f4ff 0%, #f9f0ff 100%);
}

.placeholder-icon {
  font-size: 40px;
  color: #c4b5fd;
}

.card-body {
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
}

/* UserInfo 内的头像作为 card-user，隐藏其文字（card-info 单独展示） */
.card-user :deep(.ui-name) {
  display: none;
}

.card-info {
  flex: 1;
  min-width: 0;
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #1e293b;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.5;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 3px;
  font-size: 11px;
  color: #94a3b8;
  white-space: nowrap;
  overflow: hidden;
}

.meta-user {
  overflow: hidden;
  text-overflow: ellipsis;
  flex-shrink: 1;
  min-width: 0;
}

.meta-dot {
  flex-shrink: 0;
  opacity: 0.5;
}

.meta-type {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  font-weight: 500;
  flex-shrink: 0;
  white-space: nowrap;
}

.type-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}

.card-actions {
  position: absolute;
  top: 8px;
  right: 8px;
  display: none;
  gap: 4px;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(4px);
  border-radius: 8px;
  padding: 2px 4px;
}

.app-card:hover .card-actions {
  display: flex;
}
</style>
