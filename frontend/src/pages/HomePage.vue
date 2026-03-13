<script setup lang="ts">
import { ref, reactive, onMounted, computed, h } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { SendOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { addApp, listMyAppVoByPage, listGoodAppVoByPage, deleteApp } from '@/api/appController'
import { useUserStore } from '@/stores/user'
import AppCard from '@/components/app/AppCard.vue'

const router = useRouter()
const userStore = useUserStore()
const isLoggedIn = computed(() => !!userStore.loginUser)

// ---- 创建应用 ----
const promptText = ref('')
const creating = ref(false)
const quickTags = ['个人博客网站', '企业官网', '产品落地页', '在线简历', '问卷调查表单']

const handleCreate = async () => {
  if (!promptText.value.trim()) {
    message.warning('请输入应用描述')
    return
  }
  if (!isLoggedIn.value) {
    message.warning('请先登录')
    router.push('/user/login')
    return
  }
  creating.value = true
  try {
    const res = await addApp({ initPrompt: promptText.value.trim() })
    if (res.data?.code === 0 && res.data.data) {
      router.push(`/app/chat/${res.data.data}?new=1`)
    } else {
      message.error(res.data?.message || '创建失败')
    }
  } catch {
    message.error('网络异常，请稍后重试')
  } finally {
    creating.value = false
  }
}

// ---- 我的应用 ----
const myApps = ref<API.AppVO[]>([])
const myAppsTotal = ref(0)
const myAppsLoading = ref(false)
const myAppsQuery = reactive<API.AppQueryRequest>({ pageNum: 1, pageSize: 20, sortField: 'createTime', sortOrder: 'descend' })

const fetchMyApps = async () => {
  if (!isLoggedIn.value) return
  myAppsLoading.value = true
  try {
    const res = await listMyAppVoByPage(myAppsQuery)
    if (res.data?.code === 0 && res.data.data) {
      myApps.value = res.data.data.records ?? []
      myAppsTotal.value = res.data.data.totalRow ?? 0
    }
  } finally {
    myAppsLoading.value = false
  }
}

const handleDeleteMyApp = async (app: API.AppVO) => {
  try {
    const res = await deleteApp({ id: app.id })
    if (res.data?.code === 0) {
      message.success('删除成功')
      fetchMyApps()
    } else {
      message.error(res.data?.message || '删除失败')
    }
  } catch {
    message.error('网络异常')
  }
}

// ---- 精选应用 ----
const goodApps = ref<API.AppVO[]>([])
const goodAppsTotal = ref(0)
const goodAppsLoading = ref(false)
const goodAppsQuery = reactive<API.AppQueryRequest>({ pageNum: 1, pageSize: 20, sortField: 'createTime', sortOrder: 'descend' })

const fetchGoodApps = async () => {
  goodAppsLoading.value = true
  try {
    const res = await listGoodAppVoByPage(goodAppsQuery)
    if (res.data?.code === 0 && res.data.data) {
      goodApps.value = res.data.data.records ?? []
      goodAppsTotal.value = res.data.data.totalRow ?? 0
    }
  } finally {
    goodAppsLoading.value = false
  }
}

onMounted(() => {
  fetchMyApps()
  fetchGoodApps()
})
</script>

<template>
  <div class="home-page">
    <!-- Hero 区域 -->
    <section class="hero">
      <h1 class="hero-title">一句话，创建你的网站</h1>
      <p class="hero-subtitle">与 AI 对话，几秒内生成完整可运行的 Web 应用</p>

      <div class="input-card">
        <a-textarea
          v-model:value="promptText"
          :rows="3"
          placeholder="帮我创建个人博客网站......"
          class="prompt-input"
          :bordered="false"
          @keydown.ctrl.enter="handleCreate"
        />
        <div class="input-footer">
          <div class="quick-tags">
            <a-tag
              v-for="tag in quickTags"
              :key="tag"
              class="quick-tag"
              @click="promptText = tag"
            >
              {{ tag }}
            </a-tag>
          </div>
          <a-button
            type="primary"
            shape="circle"
            :icon="h(SendOutlined)"
            :loading="creating"
            size="large"
            class="send-btn"
            @click="handleCreate"
          />
        </div>
      </div>
    </section>

    <!-- 我的应用 -->
    <section v-if="isLoggedIn" class="app-section">
      <div class="section-header">
        <h2 class="section-title">我的作品</h2>
        <a-input-search
          v-model:value="myAppsQuery.appName"
          placeholder="搜索应用名称"
          style="width: 220px"
          allow-clear
          @search="fetchMyApps"
        />
      </div>

      <a-spin :spinning="myAppsLoading">
        <div v-if="myApps.length === 0 && !myAppsLoading" class="empty-state">
          <a-empty description="还没有作品，快去创建吧！" />
        </div>
        <div v-else class="app-grid">
          <AppCard
            v-for="app in myApps"
            :key="app.id"
            :app="app"
            :user="userStore.loginUser"
            @click="router.push(`/app/chat/${app.id}`)"
          >
            <template #actions>
              <a-button
                type="text"
                size="small"
                :icon="h(EditOutlined)"
                @click="router.push(`/app/edit/${app.id}`)"
              />
              <a-popconfirm
                title="确定删除该应用吗？"
                ok-text="删除"
                ok-type="danger"
                cancel-text="取消"
                @confirm="handleDeleteMyApp(app)"
              >
                <a-button type="text" size="small" danger :icon="h(DeleteOutlined)" />
              </a-popconfirm>
            </template>
          </AppCard>
        </div>
      </a-spin>

      <div v-if="myAppsTotal > myAppsQuery.pageSize!" class="pagination-wrap">
        <a-pagination
          v-model:current="myAppsQuery.pageNum"
          :total="myAppsTotal"
          :page-size="myAppsQuery.pageSize"
          @change="(p) => { myAppsQuery.pageNum = p; fetchMyApps() }"
        />
      </div>
    </section>

    <!-- 精选应用 -->
    <section class="app-section">
      <div class="section-header">
        <h2 class="section-title">精选案例</h2>
        <a-input-search
          v-model:value="goodAppsQuery.appName"
          placeholder="搜索应用名称"
          style="width: 220px"
          allow-clear
          @search="fetchGoodApps"
        />
      </div>

      <a-spin :spinning="goodAppsLoading">
        <div v-if="goodApps.length === 0 && !goodAppsLoading" class="empty-state">
          <a-empty description="暂无精选案例" />
        </div>
        <div v-else class="app-grid">
          <AppCard
            v-for="app in goodApps"
            :key="app.id"
            :app="app"
            :user="app.user"
            fallback-name="ZeoCode 官方"
            @click="router.push(`/app/chat/${app.id}`)"
          />
        </div>
      </a-spin>

      <div v-if="goodAppsTotal > goodAppsQuery.pageSize!" class="pagination-wrap">
        <a-pagination
          v-model:current="goodAppsQuery.pageNum"
          :total="goodAppsTotal"
          :page-size="goodAppsQuery.pageSize"
          @change="(p) => { goodAppsQuery.pageNum = p; fetchGoodApps() }"
        />
      </div>
    </section>
  </div>
</template>

<style scoped>
.home-page {
  margin: -24px;
  background: linear-gradient(150deg, #e8fdf5 0%, #eff6ff 45%, #f5f0ff 100%);
  min-height: calc(100vh - 64px - 53px);
  padding-bottom: 60px;
}

/* Hero */
.hero {
  text-align: center;
  padding: 72px 24px 48px;
}

.hero-title {
  font-size: 2.8rem;
  font-weight: 800;
  color: #1a1a2e;
  margin-bottom: 12px;
  letter-spacing: -0.5px;
}

.hero-subtitle {
  font-size: 1.1rem;
  color: #64748b;
  margin-bottom: 32px;
}

.input-card {
  max-width: 720px;
  margin: 0 auto;
  background: #ffffff;
  border-radius: 20px;
  box-shadow: 0 8px 40px rgba(0, 0, 0, 0.1);
  padding: 20px 20px 16px;
}

.prompt-input {
  font-size: 15px;
  color: #374151;
  resize: none;
  background: transparent;
}

.prompt-input :deep(textarea) {
  background: transparent !important;
}

.input-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
}

.quick-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-tag {
  cursor: pointer;
  border-radius: 20px;
  padding: 2px 12px;
  font-size: 13px;
  background: #f1f5f9;
  border-color: #e2e8f0;
  color: #475569;
  transition: all 0.2s;
}

.quick-tag:hover {
  background: #ede9fe;
  border-color: #c4b5fd;
  color: #7c3aed;
}

.send-btn {
  background: #1a1a2e;
  border-color: #1a1a2e;
  flex-shrink: 0;
}

.send-btn:hover {
  background: #7c3aed !important;
  border-color: #7c3aed !important;
}

/* 应用区块 */
.app-section {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 24px;
  margin-top: 48px;
}

.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.section-title {
  font-size: 1.4rem;
  font-weight: 700;
  color: #1a1a2e;
  margin: 0;
}

.app-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 20px;
}

.empty-state {
  padding: 48px 0;
  text-align: center;
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}
</style>
