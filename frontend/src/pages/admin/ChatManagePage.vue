<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { message } from 'ant-design-vue'
import { SearchOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { listAllChatHistoryByPageForAdmin, remove1 } from '@/api/chatHistoryController'
import type { TableColumnType } from 'ant-design-vue'
import dayjs from 'dayjs'

// ---- 搜索表单 ----
const searchForm = reactive<API.ChatHistoryQueryRequest>({
  id: undefined,
  appId: undefined,
  userId: undefined,
  messageType: undefined,
  message: undefined,
  pageNum: 1,
  pageSize: 10,
  sortField: 'createTime',
  sortOrder: 'descend',
})

const MESSAGE_TYPE_OPTIONS = [
  { label: '用户消息', value: 'user' },
  { label: 'AI 消息', value: 'ai' },
]

// ---- 表格数据 ----
const loading = ref(false)
const tableData = ref<API.ChatHistory[]>([])
const total = ref(0)

const columns: TableColumnType[] = [
  { title: 'ID', dataIndex: 'id', width: 100 },
  {
    title: '类型',
    dataIndex: 'messageType',
    width: 100,
  },
  {
    title: '消息内容',
    dataIndex: 'message',
    ellipsis: true,
  },
  { title: '应用 ID', dataIndex: 'appId', width: 120 },
  { title: '用户 ID', dataIndex: 'userId', width: 120 },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    width: 170,
    customRender: ({ text }: { text: string }) =>
      text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
  { title: '操作', key: 'action', width: 80, fixed: 'right' as const },
]

// ---- 查询 ----
const fetchChats = async () => {
  loading.value = true
  try {
    const params: API.ChatHistoryQueryRequest = Object.fromEntries(
      Object.entries(searchForm).filter(([, v]) => v !== '' && v !== undefined && v !== null),
    )
    const res = await listAllChatHistoryByPageForAdmin(params)
    if (res.data?.code === 0 && res.data.data) {
      tableData.value = res.data.data.records ?? []
      total.value = res.data.data.totalRow ?? 0
    } else {
      message.error(res.data?.message || '获取列表失败')
    }
  } catch {
    message.error('网络异常')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => { searchForm.pageNum = 1; fetchChats() }

const handleReset = () => {
  searchForm.id = undefined
  searchForm.appId = undefined
  searchForm.userId = undefined
  searchForm.messageType = undefined
  searchForm.message = undefined
  searchForm.pageNum = 1
  searchForm.sortField = 'createTime'
  searchForm.sortOrder = 'descend'
  fetchChats()
}

const handlePageChange = (page: number, pageSize: number) => {
  searchForm.pageNum = page
  searchForm.pageSize = pageSize
  fetchChats()
}

// ---- 删除 ----
const handleDelete = async (record: API.ChatHistory) => {
  try {
    const res = await remove1({ id: record.id! })
    if (res.data) {
      message.success('删除成功')
      fetchChats()
    } else {
      message.error('删除失败')
    }
  } catch {
    message.error('网络异常')
  }
}

onMounted(fetchChats)
</script>

<template>
  <div class="chat-manage-page">
    <div class="page-header">
      <h2 class="page-title">对话管理</h2>
      <span class="page-desc">查看和管理所有用户的 AI 对话记录</span>
    </div>

    <!-- 搜索区 -->
    <a-card class="search-card" :bordered="false">
      <a-form layout="inline" :model="searchForm" @finish="handleSearch">
        <a-form-item label="记录 ID" name="id">
          <a-input-number
            v-model:value="searchForm.id"
            placeholder="请输入 ID"
            :min="1"
            style="width: 130px"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="应用 ID" name="appId">
          <a-input-number
            v-model:value="searchForm.appId"
            placeholder="应用 ID"
            :min="1"
            style="width: 130px"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="用户 ID" name="userId">
          <a-input-number
            v-model:value="searchForm.userId"
            placeholder="用户 ID"
            :min="1"
            style="width: 120px"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="消息类型" name="messageType">
          <a-select
            v-model:value="searchForm.messageType"
            placeholder="全部类型"
            style="width: 130px"
            allow-clear
          >
            <a-select-option
              v-for="item in MESSAGE_TYPE_OPTIONS"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item label="消息内容" name="message">
          <a-input
            v-model:value="searchForm.message"
            placeholder="关键词搜索"
            style="width: 160px"
            allow-clear
          />
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :icon="h(SearchOutlined)">搜索</a-button>
            <a-button @click="handleReset">重置</a-button>
          </a-space>
        </a-form-item>
      </a-form>
    </a-card>

    <!-- 表格区 -->
    <a-card class="table-card" :bordered="false">
      <a-table
        :columns="columns"
        :data-source="tableData"
        :loading="loading"
        :pagination="false"
        :scroll="{ x: 900 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <!-- 消息类型 -->
          <template v-if="column.dataIndex === 'messageType'">
            <a-tag :color="record.messageType?.toLowerCase().includes('user') ? 'blue' : 'green'">
              {{ record.messageType?.toLowerCase().includes('user') ? '用户' : 'AI' }}
            </a-tag>
          </template>

          <!-- 创建时间 -->
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
          </template>

          <!-- 操作 -->
          <template v-else-if="column.key === 'action'">
            <a-popconfirm
              title="确定删除该条对话记录吗？"
              ok-text="确认删除"
              ok-type="danger"
              cancel-text="取消"
              @confirm="handleDelete(record)"
            >
              <a-button type="link" danger size="small" :icon="h(DeleteOutlined)">删除</a-button>
            </a-popconfirm>
          </template>
        </template>
      </a-table>

      <div class="pagination-wrap">
        <a-pagination
          v-model:current="searchForm.pageNum"
          v-model:page-size="searchForm.pageSize"
          :total="total"
          show-size-changer
          show-quick-jumper
          :show-total="(t: number) => `共 ${t} 条`"
          @change="handlePageChange"
        />
      </div>
    </a-card>
  </div>
</template>

<style scoped>
.chat-manage-page { padding: 0; }

.page-header { margin-bottom: 20px; }

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1d2939;
  margin: 0 0 4px;
}

.page-desc { font-size: 14px; color: #8c8c8c; }

.search-card {
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.table-card {
  border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.pagination-wrap {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
