<script setup lang="ts">
import {computed, nextTick, onMounted, onUnmounted, reactive, ref} from 'vue'
import {useRoute, useRouter} from 'vue-router'
import {message} from 'ant-design-vue'
import {
  CloseCircleOutlined,
  DeploymentUnitOutlined,
  DownloadOutlined,
  EditOutlined,
  HistoryOutlined,
  InfoCircleOutlined,
  ReloadOutlined,
  RobotOutlined,
  SendOutlined,
  UserOutlined
} from '@ant-design/icons-vue'
import {deployApp, downloadAppCode, getAppVoById} from '@/api/appController'
import {getCodeGenTypeColor, getCodeGenTypeLabel} from '@/constants/codeGenType'
import type {SelectedElementInfo} from '@/utils/iframeEditor'
import {buildElementPrompt, clearEditorSelection, injectEditor} from '@/utils/iframeEditor'
import {listAppChatHistory} from '@/api/chatHistoryController'
import {useUserStore} from '@/stores/user'
import {renderMarkdown} from '@/utils/markdown'
import {getDeployUrl, getPreviewUrl} from '@/utils/env'
import 'highlight.js/styles/github.css'
import AppDetailDrawer from '@/components/app/AppDetailDrawer.vue'

interface ChatMessage {
  role: 'user' | 'ai'
  content: string
  done: boolean
  error?: boolean
}

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const appId = route.params.appId as string
const isNew = route.query.new === '1'

// ---- 应用信息 ----
const appInfo = ref<API.AppVO | null>(null)

const fetchApp = async () => {
  try {
    const res = await getAppVoById({ id: appId as unknown as number })
    if (res.data?.code === 0 && res.data.data) {
      appInfo.value = res.data.data
    } else {
      message.error('应用不存在')
      router.replace('/')
    }
  } catch {
    message.error('获取应用信息失败')
  }
}

// ---- 对话消息 ----
const messages = ref<ChatMessage[]>([])
const messagesEl = ref<HTMLElement | null>(null)
const isGenerating = ref(false)
let currentES: EventSource | null = null

// ---- 历史消息游标分页 ----
const historyLoading = ref(false)
const hasMoreHistory = ref(false)
const oldestHistoryTime = ref<string | undefined>(undefined)

/** 将后端 ChatHistory 映射为前端 ChatMessage */
const mapHistoryRecord = (r: API.ChatHistory): ChatMessage => ({
  role: r.messageType?.toLowerCase().includes('user') ? 'user' : 'ai',
  content: r.message ?? '',
  done: true,
})

const loadHistory = async (loadMore = false) => {
  historyLoading.value = true
  try {
    const res = await listAppChatHistory({
      appId: appId as unknown as number,
      pageSize: 10,
      lastCreateTime: loadMore ? oldestHistoryTime.value : undefined,
    })
    if (res.data?.code === 0 && res.data.data) {
      const records = res.data.data.records ?? []
      hasMoreHistory.value = records.length >= 10
      if (records.length > 0) {
        // 按创建时间升序排列后展示
        const sorted = [...records].sort(
          (a, b) => new Date(a.createTime!).getTime() - new Date(b.createTime!).getTime(),
        )
        // 游标：最旧一条的时间，用于下次"加载更多"
        oldestHistoryTime.value = sorted[0].createTime
        const mapped = sorted.map(mapHistoryRecord)
        messages.value = loadMore ? [...mapped, ...messages.value] : mapped
      }
    }
  } catch {
    message.error('加载历史消息失败')
  } finally {
    historyLoading.value = false
  }
}

const scrollToBottom = async () => {
  await nextTick()
  if (messagesEl.value) {
    messagesEl.value.scrollTop = messagesEl.value.scrollHeight
  }
}

const sendMessage = (text: string) => {
  if (isGenerating.value) return
  if (!text.trim()) return

  isGenerating.value = true
  iframeVisible.value = false

  messages.value.push({ role: 'user', content: text, done: true })

  const aiMsg = reactive<ChatMessage>({ role: 'ai', content: '', done: false })
  messages.value.push(aiMsg)
  scrollToBottom()

  const url = `/api/app/chat/gen/code?appId=${appId}&message=${encodeURIComponent(text)}`
  const es = new EventSource(url, { withCredentials: true })
  currentES = es

  es.onmessage = (event: MessageEvent) => {
    try {
      const parsed = JSON.parse(event.data)
      aiMsg.content += parsed.d ?? event.data
    } catch {
      // 非 JSON 格式直接追加原始内容
      aiMsg.content += event.data
    }
    scrollToBottom()
  }

  // 处理后端自定义业务错误事件（限流、鉴权失败等）
  es.addEventListener('business-error', (event: MessageEvent) => {
    es.close()
    currentES = null
    aiMsg.done = true
    aiMsg.error = true
    isGenerating.value = false
    try {
      const errorData = JSON.parse(event.data)
      const errorMsg = errorData.message || '生成过程中出现错误'
      aiMsg.content = `❌ ${errorMsg}`
      message.error(errorMsg)
    } catch {
      aiMsg.content = '❌ 生成过程中出现错误，请重试'
      message.error('生成过程中出现错误，请重试')
    }
    scrollToBottom()
  })

  es.onerror = () => {
    // 无论是服务端主动关闭（readyState 为 CONNECTING，EventSource 尝试重连）
    // 还是真正断连（readyState 为 CLOSED），都立即关闭并结束本次生成
    es.close()
    currentES = null
    aiMsg.done = true
    isGenerating.value = false

    // 有内容 = 正常生成结束，展示 iframe；无内容 = 请求阶段就失败了
    if (aiMsg.content.length > 0) {
      iframeVisible.value = true
    } else {
      aiMsg.error = true
      message.error('生成过程中出现错误，请重试')
    }
    scrollToBottom()
  }
}

// ---- 用户输入 ----
const inputText = ref('')

const handleSend = () => {
  const text = inputText.value.trim()
  if (!text) return
  inputText.value = ''
  // 如果选中了元素，将元素信息拼接到提示词前
  const finalText = selectedElement.value
    ? `${buildElementPrompt(selectedElement.value)}\n${text}`
    : text
  // 发送后退出编辑模式
  exitEditMode()
  sendMessage(finalText)
}

// ---- iframe 预览 ----
const iframeVisible = ref(!isNew)
const iframeKey = ref(0)

const iframeUrl = computed(() => {
  if (!appInfo.value?.codeGenType) return ''
  return getPreviewUrl(appInfo.value.codeGenType, appId as string)
})

const refreshIframe = () => {
  iframeKey.value++
}

// ---- 部署 ----
const deploying = ref(false)
const deployedUrl = ref('')

const handleDeploy = async () => {
  deploying.value = true
  try {
    const res = await deployApp({ appId: appId as unknown as number })
    if (res.data?.code === 0 && res.data.data) {
      deployedUrl.value = getDeployUrl(res.data.data)
      message.success('部署成功！')
    } else {
      message.error(res.data?.message || '部署失败')
    }
  } catch {
    message.error('网络异常')
  } finally {
    deploying.value = false
  }
}

// ---- 下载代码 ----
const downloading = ref(false)

const handleDownload = async () => {
  downloading.value = true
  try {
    const res = await downloadAppCode(
      { appId: appId as unknown as number },
      { responseType: 'blob' },
    )
    const blob = new Blob([res.data], { type: 'application/zip' })
    // 从 Content-Disposition 提取文件名，兜底使用 appId
    const disposition: string = res.headers?.['content-disposition'] ?? ''
    const match = disposition.match(/filename="?([^";\n]+)"?/)
    const filename = match ? decodeURIComponent(match[1]) : `app_${appId}.zip`
    // 触发浏览器下载
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch {
    message.error('下载失败，请稍后重试')
  } finally {
    downloading.value = false
  }
}

onMounted(async () => {
  await fetchApp()
  if (isNew) {
    // 新建应用：自动发送初始提示词，不加载历史
    if (appInfo.value?.initPrompt) {
      sendMessage(appInfo.value.initPrompt)
    }
  } else if (canChat.value) {
    // 已有应用且有权限：加载最近历史消息
    await loadHistory(false)
    await scrollToBottom()
  }
})

onUnmounted(() => {
  currentES?.close()
})

// ---- 可视化编辑模式 ----
const iframeEl = ref<HTMLIFrameElement | null>(null)
const isEditMode = ref(false)
const selectedElement = ref<SelectedElementInfo | null>(null)
let editorCleanup: (() => void) | null = null

const enterEditMode = () => {
  if (!iframeEl.value) return
  editorCleanup = injectEditor(iframeEl.value, (info) => {
    selectedElement.value = info
  })
}

const exitEditMode = () => {
  editorCleanup?.()
  editorCleanup = null
  if (iframeEl.value) clearEditorSelection(iframeEl.value)
  selectedElement.value = null
  isEditMode.value = false
}

const toggleEditMode = () => {
  if (isEditMode.value) {
    exitEditMode()
  } else {
    isEditMode.value = true
    enterEditMode()
  }
}

/** iframe 加载完成后，若处于编辑模式则重新注入 */
const onIframeLoad = () => {
  editorCleanup?.()
  editorCleanup = null
  if (isEditMode.value && iframeEl.value) {
    enterEditMode()
  }
}

// ---- 权限 ----
/** 是否可以发送消息（本人或管理员） */
const canChat = computed(() => {
  if (!userStore.loginUser || !appInfo.value) return false
  return (
    userStore.loginUser.userRole === 'admin' ||
    String(userStore.loginUser.id) === String(appInfo.value.userId)
  )
})

// ---- 应用详情抽屉 ----
const detailVisible = ref(false)
</script>

<template>
  <div class="chat-page">
    <!-- 顶部栏 -->
    <div class="chat-header">
      <div class="app-name">
        <span class="app-name-text">{{ appInfo?.appName || '加载中...' }}</span>
        <a-tag v-if="appInfo?.codeGenType" :color="getCodeGenTypeColor(appInfo.codeGenType)" class="app-type-tag">
          {{ getCodeGenTypeLabel(appInfo.codeGenType) }}
        </a-tag>
      </div>
      <div class="header-actions">
        <a-button
          v-if="deployedUrl"
          type="link"
          :href="deployedUrl"
          target="_blank"
          size="small"
        >
          已部署 →
        </a-button>
        <a-button
          type="primary"
          ghost
          :loading="downloading"
          :icon="h(DownloadOutlined)"
          @click="handleDownload"
        >
          下载代码
        </a-button>
        <a-button
          :icon="h(InfoCircleOutlined)"
          @click="detailVisible = true"
        >
          应用详情
        </a-button>
        <a-button
          type="primary"
          :loading="deploying"
          :icon="h(DeploymentUnitOutlined)"
          @click="handleDeploy"
        >
          部署
        </a-button>
      </div>
    </div>

    <!-- 应用详情抽屉 -->
    <AppDetailDrawer
      v-model:open="detailVisible"
      :app="appInfo"
      :app-id="appId as string"
      @deleted="router.replace('/')"
    />

    <!-- 核心内容区 -->
    <div class="chat-body">
      <!-- 左侧：对话区（仅本人或管理员可见） -->
      <div v-if="canChat" class="chat-left">
        <div ref="messagesEl" class="messages-area">
          <!-- 加载更多历史消息 -->
          <div class="load-more-wrap">
            <a-button
              v-if="hasMoreHistory"
              type="text"
              size="small"
              :loading="historyLoading"
              :icon="h(HistoryOutlined)"
              class="load-more-btn"
              @click="loadHistory(true)"
            >
              加载更多历史记录
            </a-button>
            <a-spin v-else-if="historyLoading" size="small" />
          </div>

          <div
            v-for="(msg, idx) in messages"
            :key="idx"
            :class="['message-row', msg.role === 'user' ? 'user-row' : 'ai-row']"
          >
            <!-- 头像（AI 在左，用户在右；user-row 用 row-reverse，头像放首位即显示在右侧） -->
            <a-avatar v-if="msg.role === 'ai'" :size="32" class="msg-avatar ai-avatar">
              <template #icon><RobotOutlined /></template>
            </a-avatar>
            <a-avatar
              v-else
              :src="userStore.loginUser?.userAvatar ?? undefined"
              :size="32"
              class="msg-avatar user-avatar"
            >
              <template v-if="!userStore.loginUser?.userAvatar" #icon>
                <UserOutlined />
              </template>
            </a-avatar>

            <div :class="['bubble', msg.role === 'user' ? 'user-bubble' : 'ai-bubble', { error: msg.error }]">
              <!-- 用户消息：纯文本 -->
              <template v-if="msg.role === 'user'">
                <span class="user-text">{{ msg.content }}</span>
              </template>
              <!-- AI 消息：Markdown 渲染 -->
              <template v-else-if="!msg.error">
                <div
                  class="markdown-body"
                  v-html="renderMarkdown(msg.content || '')"
                />
                <span v-if="!msg.done" class="cursor-blink">▋</span>
              </template>
              <!-- 错误消息 -->
              <template v-else>
                <span>生成失败，请重试</span>
              </template>
            </div>
          </div>

          <!-- 空状态 -->
          <div v-if="messages.length === 0" class="chat-empty">
            <RobotOutlined class="empty-icon" />
            <p>发送消息，开始生成你的应用</p>
          </div>
        </div>

        <!-- 输入框（仅本人或管理员可见） -->
        <div v-if="canChat" class="input-area">
          <!-- 选中元素提示 -->
          <a-alert
            v-if="selectedElement"
            type="info"
            :show-icon="false"
            closable
            class="element-alert"
            @close="selectedElement = null; clearEditorSelection(iframeEl!)"
          >
            <template #message>
              <span class="element-alert-text">
                <span class="element-tag">{{ selectedElement.tagName }}</span>
                <template v-if="selectedElement.id"> <code>#{{ selectedElement.id }}</code></template>
                <template v-else-if="selectedElement.className"> <code>.{{ selectedElement.className.split(' ')[0] }}</code></template>
                <template v-if="selectedElement.textContent"> · "{{ selectedElement.textContent.slice(0, 40) }}"</template>
              </span>
            </template>
          </a-alert>

          <!-- 工具栏 -->
          <div class="input-toolbar">
            <a-tooltip :title="!iframeVisible ? '网页生成后可使用可视化编辑' : ''">
              <a-button
                size="small"
                :type="isEditMode ? 'primary' : 'text'"
                :icon="isEditMode ? h(CloseCircleOutlined) : h(EditOutlined)"
                :disabled="isGenerating || !iframeVisible"
                :class="['toolbar-edit-btn', { 'toolbar-edit-btn--active': isEditMode }]"
                @click="toggleEditMode"
              >
                {{ isEditMode ? '退出编辑' : '可视化编辑' }}
              </a-button>
            </a-tooltip>
          </div>

          <a-textarea
            v-model:value="inputText"
            :rows="3"
            :placeholder="isEditMode ? '已选中元素，描述你的修改需求...' : '描述你想要的效果，可以一步步优化...'"
            :disabled="isGenerating"
            :bordered="false"
            class="chat-input"
            @keydown.ctrl.enter.prevent="handleSend"
          />
          <div class="input-bar">
            <span v-if="isGenerating" class="generating-tip">生成中...</span>
            <span v-else class="input-tip">Ctrl + Enter 发送</span>
            <a-button
              type="primary"
              shape="circle"
              :icon="h(SendOutlined)"
              :disabled="isGenerating || !inputText.trim()"
              @click="handleSend"
            />
          </div>
        </div>
      </div>

      <!-- 右侧：网页展示 -->
      <div :class="['chat-right', { 'chat-right--full': !canChat }]">
        <div class="preview-header">
          <span class="preview-title">网页预览</span>
          <a-button
            v-if="iframeVisible"
            type="text"
            size="small"
            :icon="h(ReloadOutlined)"
            @click="refreshIframe"
          >
            刷新
          </a-button>
        </div>

        <div class="preview-body">
          <!-- 生成中占位 -->
          <div v-if="isGenerating" class="preview-generating">
            <div class="generating-animation">
              <div class="dot" />
              <div class="dot" />
              <div class="dot" />
            </div>
            <p>AI 正在生成网页代码...</p>
          </div>

          <!-- iframe 预览 -->
          <iframe
            v-else-if="iframeVisible && iframeUrl"
            ref="iframeEl"
            :key="iframeKey"
            :src="iframeUrl"
            class="preview-iframe"
            :class="{ 'preview-iframe--edit': isEditMode }"
            sandbox="allow-scripts allow-same-origin allow-forms"
            title="生成的网页"
            @load="onIframeLoad"
          />

          <!-- 未生成状态 -->
          <div v-else class="preview-empty">
            <DeploymentUnitOutlined class="preview-empty-icon" />
            <p>发送消息后，生成的网页将在这里展示</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { h } from 'vue'
export default { setup() { return { h } } }
</script>

<style scoped>
.chat-page {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 64px - 53px);
  margin: -24px;
  background: #f8fafc;
  overflow: hidden;
}

/* 顶部栏 */
.chat-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 52px;
  background: #ffffff;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.app-name {
  display: flex;
  align-items: center;
  gap: 8px;
}

.app-name-text {
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
}

.app-type-tag {
  font-size: 11px;
  margin-left: 4px;
  vertical-align: middle;
}


.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 内容区 */
.chat-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* 左侧对话 */
.chat-left {
  width: 420px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid #e8e8e8;
  background: #ffffff;
}

.load-more-wrap {
  display: flex;
  justify-content: center;
  padding: 4px 0 8px;
  min-height: 28px;
}

.load-more-btn {
  color: #94a3b8;
  font-size: 12px;
}

.load-more-btn:hover {
  color: #7c3aed !important;
}

.messages-area {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.message-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.user-row {
  flex-direction: row-reverse;
}

.msg-avatar {
  flex-shrink: 0;
  margin-top: 2px;
}

.ai-avatar {
  background: #7c3aed;
}

.bubble {
  max-width: 80%;
  border-radius: 12px;
  padding: 10px 14px;
  font-size: 13px;
  line-height: 1.6;
  word-break: break-word;
}

.user-bubble {
  background: #7c3aed;
  color: #ffffff;
  border-radius: 12px 12px 4px 12px;
}

.ai-bubble {
  background: #f1f5f9;
  color: #1e293b;
  border-radius: 12px 12px 12px 4px;
}

.ai-bubble.error {
  background: #fff1f0;
  color: #ff4d4f;
}

.user-text {
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.cursor-blink {
  animation: blink 1s step-end infinite;
  color: #7c3aed;
  font-size: 14px;
}

@keyframes blink {
  50% { opacity: 0; }
}

.chat-empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: #94a3b8;
  padding: 60px 0;
}

.empty-icon {
  font-size: 48px;
  color: #c4b5fd;
  margin-bottom: 12px;
}

/* 输入区 */
.input-area {
  border-top: 1px solid #f0f0f0;
  padding: 12px 16px;
  background: #ffffff;
  flex-shrink: 0;
}

.element-alert {
  margin-bottom: 8px;
  border-radius: 6px;
  padding: 6px 10px;
}

.element-alert-text {
  font-size: 12px;
  color: #1e293b;
}

.element-tag {
  display: inline-block;
  background: #ede9fe;
  color: #7c3aed;
  border-radius: 3px;
  padding: 0 5px;
  font-family: monospace;
  font-size: 12px;
  font-weight: 600;
}

.input-toolbar {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 4px 2px;
  border-bottom: 1px solid #f1f5f9;
  margin-bottom: 2px;
}

.toolbar-edit-btn {
  font-size: 12px;
  color: #64748b;
  border-radius: 6px;
  padding: 0 8px;
  height: 26px;
  transition: all 0.2s;
}

.toolbar-edit-btn:not(:disabled):hover {
  color: #7c3aed;
  background: #f3f0ff;
}

.toolbar-edit-btn--active {
  background: linear-gradient(135deg, #6d28d9, #7c3aed) !important;
  border: none !important;
  color: #fff !important;
  box-shadow: 0 2px 8px rgba(124, 58, 237, 0.35);
}

/* 编辑模式下 iframe 鼠标变为十字 */
.preview-iframe--edit {
  cursor: crosshair;
}


.chat-input :deep(textarea) {
  font-size: 13px;
  resize: none;
  background: transparent !important;
}

.input-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
}

.input-tip,
.generating-tip {
  font-size: 12px;
  color: #94a3b8;
}

.generating-tip {
  color: #7c3aed;
}

/* 右侧预览 */
.chat-right {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.chat-right--full {
  width: 100%;
}

.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  height: 40px;
  background: #f8fafc;
  border-bottom: 1px solid #e8e8e8;
  flex-shrink: 0;
}

.preview-title {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
}

.preview-body {
  flex: 1;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #ffffff;
}

.preview-iframe {
  width: 100%;
  height: 100%;
  border: none;
}

.preview-generating,
.preview-empty {
  text-align: center;
  color: #94a3b8;
}

.preview-empty-icon {
  font-size: 56px;
  color: #e2e8f0;
  margin-bottom: 12px;
}

/* 生成动画 */
.generating-animation {
  display: flex;
  justify-content: center;
  gap: 6px;
  margin-bottom: 16px;
}

.dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #7c3aed;
  animation: bounce 1.2s infinite;
}

.dot:nth-child(2) { animation-delay: 0.2s; }
.dot:nth-child(3) { animation-delay: 0.4s; }

@keyframes bounce {
  0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
  40% { transform: scale(1.2); opacity: 1; }
}

/* ========== Markdown 内容样式 ========== */
.markdown-body {
  font-size: 13px;
  line-height: 1.75;
  color: #1e293b;
  word-break: break-word;
}

.markdown-body :deep(p) {
  margin: 0 0 8px;
}

.markdown-body :deep(p:last-child) {
  margin-bottom: 0;
}

.markdown-body :deep(h1),
.markdown-body :deep(h2),
.markdown-body :deep(h3),
.markdown-body :deep(h4) {
  margin: 12px 0 6px;
  font-weight: 600;
  line-height: 1.4;
}

.markdown-body :deep(h1) { font-size: 18px; }
.markdown-body :deep(h2) { font-size: 16px; }
.markdown-body :deep(h3) { font-size: 14px; }

.markdown-body :deep(ul),
.markdown-body :deep(ol) {
  margin: 4px 0 8px;
  padding-left: 20px;
}

.markdown-body :deep(li) {
  margin-bottom: 2px;
}

.markdown-body :deep(blockquote) {
  margin: 8px 0;
  padding: 6px 12px;
  border-left: 3px solid #cbd5e1;
  background: #f8fafc;
  color: #64748b;
  border-radius: 0 6px 6px 0;
}

.markdown-body :deep(a) {
  color: #7c3aed;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #e2e8f0;
  margin: 12px 0;
}

/* 行内代码 */
.markdown-body :deep(code:not(.hljs)) {
  background: #e2e8f0;
  color: #c026d3;
  padding: 1px 5px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
}

/* 代码块容器 */
.markdown-body :deep(.hljs-pre) {
  margin: 8px 0;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
}

.markdown-body :deep(.hljs-pre code.hljs) {
  display: block;
  padding: 14px 16px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 12px;
  line-height: 1.6;
  overflow-x: auto;
  border-radius: 8px;
}

/* 表格 */
.markdown-body :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 8px 0;
  font-size: 12px;
}

.markdown-body :deep(th),
.markdown-body :deep(td) {
  border: 1px solid #e2e8f0;
  padding: 6px 10px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #f1f5f9;
  font-weight: 600;
}

.markdown-body :deep(tr:nth-child(even)) {
  background: #f8fafc;
}

</style>
