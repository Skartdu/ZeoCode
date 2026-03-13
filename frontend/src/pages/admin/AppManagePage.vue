<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { Tag } from 'ant-design-vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'
import { SearchOutlined, DeleteOutlined, EditOutlined, StarOutlined, StarFilled } from '@ant-design/icons-vue'
import { listAppVoByPageByAdmin, deleteAppByAdmin, updateAppByAdmin } from '@/api/appController'
import { getCodeGenTypeLabel, getCodeGenTypeColor, CODE_GEN_TYPE_LIST } from '@/constants/codeGenType'
import type { TableColumnType } from 'ant-design-vue'
import dayjs from 'dayjs'

const router = useRouter()

// ---- 搜索表单 ----
const searchForm = reactive<API.AppQueryRequest>({
  id: undefined,
  appName: undefined,
  codeGenType: undefined,
  userId: undefined,
  pageNum: 1,
  pageSize: 10,
  sortField: 'createTime',
  sortOrder: 'descend',
})

// ---- 表格数据 ----
const loading = ref(false)
const tableData = ref<API.AppVO[]>([])
const total = ref(0)

const columns: TableColumnType[] = [
  { title: 'ID', dataIndex: 'id', width: 100 },
  {
    title: '封面',
    dataIndex: 'cover',
    width: 80,
    customRender: ({ record }: { record: API.AppVO }) =>
      record.cover
        ? h('img', { src: record.cover, style: 'width:48px;height:27px;object-fit:cover;border-radius:4px' })
        : h('span', { style: 'color:#ccc' }, '无'),
  },
  { title: '应用名称', dataIndex: 'appName', width: 180, ellipsis: true },
  {
    title: '类型',
    dataIndex: 'codeGenType',
    width: 150,
    customRender: ({ text }: { text: string }) =>
      h(Tag, { color: getCodeGenTypeColor(text) }, () => getCodeGenTypeLabel(text)),
  },
  {
    title: '优先级',
    dataIndex: 'priority',
    width: 90,
    customRender: ({ text }: { text: number }) =>
      text >= 99
        ? h(Tag, { color: 'gold' }, () => '⭐ 精选')
        : h('span', {}, String(text ?? '-')),
  },
  { title: '用户ID', dataIndex: 'userId', width: 100 },
  {
    title: '创建时间',
    dataIndex: 'createTime',
    width: 170,
    customRender: ({ text }: { text: string }) =>
      text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
  { title: '操作', key: 'action', width: 180, fixed: 'right' as const },
]

// ---- 查询 ----
const fetchApps = async () => {
  loading.value = true
  try {
    const params: API.AppQueryRequest = Object.fromEntries(
      Object.entries(searchForm).filter(([, v]) => v !== '' && v !== undefined && v !== null),
    )
    const res = await listAppVoByPageByAdmin(params)
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

const handleSearch = () => { searchForm.pageNum = 1; fetchApps() }

const handleReset = () => {
  searchForm.id = undefined
  searchForm.appName = undefined
  searchForm.codeGenType = undefined
  searchForm.userId = undefined
  searchForm.pageNum = 1
  searchForm.sortField = 'createTime'
  searchForm.sortOrder = 'descend'
  fetchApps()
}

const handlePageChange = (page: number, pageSize: number) => {
  searchForm.pageNum = page
  searchForm.pageSize = pageSize
  fetchApps()
}

// ---- 删除 ----
const handleDelete = async (record: API.AppVO) => {
  try {
    const res = await deleteAppByAdmin({ id: record.id })
    if (res.data?.code === 0) {
      message.success('删除成功')
      fetchApps()
    } else {
      message.error(res.data?.message || '删除失败')
    }
  } catch {
    message.error('网络异常')
  }
}

// ---- 精选 / 取消精选 ----
const isFeatured = (record: API.AppVO) => (record.priority ?? 0) >= 99

const handleFeature = async (record: API.AppVO) => {
  const cancel = isFeatured(record)
  try {
    const res = await updateAppByAdmin({ id: record.id, priority: cancel ? 0 : 99 })
    if (res.data?.code === 0) {
      message.success(cancel ? '已取消精选' : '已设为精选')
      fetchApps()
    } else {
      message.error(res.data?.message || '操作失败')
    }
  } catch {
    message.error('网络异常')
  }
}

onMounted(fetchApps)
</script>

<template>
  <div class="app-manage-page">
    <div class="page-header">
      <h2 class="page-title">应用管理</h2>
      <span class="page-desc">查看和管理所有用户的应用</span>
    </div>

    <!-- 搜索区 -->
    <a-card class="search-card" :bordered="false">
      <a-form layout="inline" :model="searchForm" @finish="handleSearch">
        <a-form-item label="应用 ID" name="id">
          <a-input-number
            v-model:value="searchForm.id"
            placeholder="请输入 ID"
            :min="1"
            style="width: 140px"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="应用名称" name="appName">
          <a-input
            v-model:value="searchForm.appName"
            placeholder="请输入名称"
            style="width: 160px"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="类型" name="codeGenType">
          <a-select
            v-model:value="searchForm.codeGenType"
            placeholder="全部类型"
            style="width: 160px"
            allow-clear
          >
            <a-select-option
              v-for="item in CODE_GEN_TYPE_LIST"
              :key="item.value"
              :value="item.value"
            >
              {{ item.label }}
            </a-select-option>
          </a-select>
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
        :scroll="{ x: 1100 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <!-- 封面 -->
          <template v-if="column.dataIndex === 'cover'">
            <img
              v-if="record.cover"
              :src="record.cover"
              style="width: 48px; height: 27px; object-fit: cover; border-radius: 4px"
            />
            <span v-else style="color: #ccc">无</span>
          </template>

          <!-- 创建时间 -->
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
          </template>

          <!-- 操作 -->
          <template v-else-if="column.key === 'action'">
            <a-space size="small">
              <a-button
                type="link"
                size="small"
                :icon="h(EditOutlined)"
                @click="router.push(`/app/edit/${record.id}`)"
              >
                编辑
              </a-button>
              <a-popconfirm
                :title="`确定删除「${record.appName}」吗？`"
                ok-text="确认删除"
                ok-type="danger"
                cancel-text="取消"
                @confirm="handleDelete(record)"
              >
                <a-button type="link" danger size="small" :icon="h(DeleteOutlined)">删除</a-button>
              </a-popconfirm>
              <a-popconfirm
                :title="isFeatured(record) ? '确定取消精选该应用？' : '将此应用设为精选（优先级 99）？'"
                ok-text="确认"
                cancel-text="取消"
                @confirm="handleFeature(record)"
              >
                <a-button
                  type="link"
                  size="small"
                  :style="{ color: isFeatured(record) ? '#f59e0b' : '#8c8c8c' }"
                  :icon="isFeatured(record) ? h(StarFilled) : h(StarOutlined)"
                >
                  {{ isFeatured(record) ? '取消精选' : '精选' }}
                </a-button>
              </a-popconfirm>
            </a-space>
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
.app-manage-page { padding: 0; }

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
