<script setup lang="ts">
import { ref, reactive, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'
import { SearchOutlined, DeleteOutlined, EditOutlined, UserOutlined } from '@ant-design/icons-vue'
import { listUserVoByPage, deleteUser, updateUser } from '@/api/userController'
import { useUserStore } from '@/stores/user'
import type { TableColumnType } from 'ant-design-vue'
import dayjs from 'dayjs'

const router = useRouter()
const userStore = useUserStore()

// 非管理员直接跳走
if (userStore.loginUser?.userRole !== 'admin') {
  message.error('无权限访问')
  router.replace('/')
}

// ---- 搜索表单 ----
const searchForm = reactive<API.UserQueryRequest>({
  id: undefined,
  userName: undefined,
  userAccount: undefined,
  userRole: undefined,
  pageNum: 1,
  pageSize: 10,
})

// ---- 表格数据 ----
const loading = ref(false)
const tableData = ref<API.UserVO[]>([])
const total = ref(0)

const columns: TableColumnType[] = [
  { title: 'ID', dataIndex: 'id', width: 110 },
  {
    title: '头像',
    dataIndex: 'userAvatar',
    width: 72,
    customRender: ({ record }: { record: API.UserVO }) =>
      h('a-avatar', {
        src: record.userAvatar ?? undefined,
        icon: !record.userAvatar ? h(UserOutlined) : undefined,
        size: 36,
      }),
  },
  { title: '账号', dataIndex: 'userAccount', width: 140 },
  { title: '用户名', dataIndex: 'userName', width: 140 },
  {
    title: '简介',
    dataIndex: 'userProfile',
    width: 200,
    ellipsis: true,
    customRender: ({ text }: { text: string }) => text || '-',
  },
  {
    title: '角色',
    dataIndex: 'userRole',
    width: 100,
    customRender: ({ text }: { text: string }) => {
      const map: Record<string, { color: string; label: string }> = {
        admin: { color: '#7c3aed', label: '管理员' },
        user: { color: '#10b981', label: '普通用户' },
      }
      const item = map[text] ?? { color: '#8c8c8c', label: text }
      return h(
        'span',
        {
          style: {
            color: item.color,
            fontWeight: '600',
            fontSize: '13px',
          },
        },
        item.label,
      )
    },
  },
  {
    title: '注册时间',
    dataIndex: 'createTime',
    width: 180,
    customRender: ({ text }: { text: string }) =>
      text ? dayjs(text).format('YYYY-MM-DD HH:mm:ss') : '-',
  },
  {
    title: '操作',
    key: 'action',
    width: 140,
    fixed: 'right' as const,
  },
]

// ---- 查询 ----
const fetchUsers = async () => {
  loading.value = true
  try {
    // 过滤空字符串，避免将 "" 传给后端
    const params: API.UserQueryRequest = Object.fromEntries(
      Object.entries(searchForm).filter(([, v]) => v !== '' && v !== undefined && v !== null),
    )
    const res = await listUserVoByPage(params)
    if (res.data?.code === 0 && res.data.data) {
      tableData.value = res.data.data.records ?? []
      total.value = res.data.data.totalRow ?? 0
    } else {
      message.error(res.data?.message || '获取用户列表失败')
    }
  } catch {
    message.error('网络异常，请稍后重试')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  searchForm.pageNum = 1
  fetchUsers()
}

const handleReset = () => {
  searchForm.id = undefined
  searchForm.userName = undefined
  searchForm.userAccount = undefined
  searchForm.userRole = undefined
  searchForm.pageNum = 1
  fetchUsers()
}

// ---- 分页 ----
const handlePageChange = (page: number, pageSize: number) => {
  searchForm.pageNum = page
  searchForm.pageSize = pageSize
  fetchUsers()
}

// ---- 删除 ----
const handleDelete = (record: API.UserVO) => {
  Modal.confirm({
    title: '确认删除',
    content: `确定要删除用户「${record.userName || record.userAccount}」吗？此操作不可撤销。`,
    okText: '确认删除',
    okType: 'danger',
    cancelText: '取消',
    async onOk() {
      try {
        const res = await deleteUser({ id: record.id })
        if (res.data?.code === 0) {
          message.success('删除成功')
          fetchUsers()
        } else {
          message.error(res.data?.message || '删除失败')
        }
      } catch {
        message.error('网络异常，请稍后重试')
      }
    },
  })
}

// ---- 编辑弹窗 ----
const editVisible = ref(false)
const editLoading = ref(false)
const editForm = reactive<API.UserUpdateRequest>({
  id: undefined,
  userName: '',
  userAvatar: '',
  userProfile: '',
  userRole: 'user',
})

const openEdit = (record: API.UserVO) => {
  editForm.id = record.id
  editForm.userName = record.userName ?? ''
  editForm.userAvatar = record.userAvatar ?? ''
  editForm.userProfile = record.userProfile ?? ''
  editForm.userRole = record.userRole ?? 'user'
  editVisible.value = true
}

const handleEditOk = async () => {
  editLoading.value = true
  try {
    const res = await updateUser(editForm)
    if (res.data?.code === 0) {
      message.success('修改成功')
      editVisible.value = false
      fetchUsers()
    } else {
      message.error(res.data?.message || '修改失败')
    }
  } catch {
    message.error('网络异常，请稍后重试')
  } finally {
    editLoading.value = false
  }
}

const handleEditCancel = () => {
  editVisible.value = false
}

onMounted(() => {
  fetchUsers()
})
</script>

<template>
  <div class="user-manage-page">
    <div class="page-header">
      <h2 class="page-title">用户管理</h2>
      <span class="page-desc">查看和管理已注册用户，可删除违规账号</span>
    </div>

    <!-- 搜索区 -->
    <a-card class="search-card" :bordered="false">
      <a-form layout="inline" :model="searchForm" @finish="handleSearch">
        <a-form-item label="用户 ID" name="id">
          <a-input-number
            v-model:value="searchForm.id"
            placeholder="请输入 ID"
            :min="1"
            style="width: 150px"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="账号" name="userAccount">
          <a-input
            v-model:value="searchForm.userAccount"
            placeholder="请输入账号"
            style="width: 160px"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="用户名" name="userName">
          <a-input
            v-model:value="searchForm.userName"
            placeholder="请输入用户名"
            style="width: 160px"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="角色" name="userRole">
          <a-select
            v-model:value="searchForm.userRole"
            placeholder="全部"
            style="width: 130px"
            allow-clear
          >
            <a-select-option value="user">普通用户</a-select-option>
            <a-select-option value="admin">管理员</a-select-option>
          </a-select>
        </a-form-item>

        <a-form-item>
          <a-space>
            <a-button type="primary" html-type="submit" :icon="h(SearchOutlined)">
              搜索
            </a-button>
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
        :scroll="{ x: 1000 }"
        row-key="id"
      >
        <!-- 头像列 -->
        <template #bodyCell="{ column, record }">
          <template v-if="column.dataIndex === 'userAvatar'">
            <a-avatar :src="record.userAvatar ?? undefined" :size="36">
              <template v-if="!record.userAvatar" #icon>
                <UserOutlined />
              </template>
            </a-avatar>
          </template>

          <!-- 角色列 -->
          <template v-else-if="column.dataIndex === 'userRole'">
            <a-tag :color="record.userRole === 'admin' ? 'purple' : 'green'">
              {{ record.userRole === 'admin' ? '管理员' : '普通用户' }}
            </a-tag>
          </template>

          <!-- 注册时间列 -->
          <template v-else-if="column.dataIndex === 'createTime'">
            {{ record.createTime ? dayjs(record.createTime).format('YYYY-MM-DD HH:mm:ss') : '-' }}
          </template>

          <!-- 操作列 -->
          <template v-else-if="column.key === 'action'">
            <a-space size="small">
              <a-button
                type="link"
                size="small"
                :icon="h(EditOutlined)"
                @click="openEdit(record)"
              >
                编辑
              </a-button>
              <a-popconfirm
                :title="`确定删除「${record.userName || record.userAccount}」吗？`"
                ok-text="确认删除"
                ok-type="danger"
                cancel-text="取消"
                @confirm="handleDelete(record)"
              >
                <a-button type="link" danger size="small" :icon="h(DeleteOutlined)">
                  删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </template>
      </a-table>

      <!-- 分页 -->
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

    <!-- 编辑用户弹窗 -->
    <a-modal
      v-model:open="editVisible"
      title="编辑用户信息"
      :confirm-loading="editLoading"
      ok-text="保存"
      cancel-text="取消"
      width="480px"
      @ok="handleEditOk"
      @cancel="handleEditCancel"
    >
      <a-form :model="editForm" layout="vertical" style="margin-top: 16px">
        <a-form-item label="头像 URL" name="userAvatar">
          <a-input
            v-model:value="editForm.userAvatar"
            placeholder="请输入头像图片地址"
            allow-clear
          />
          <div v-if="editForm.userAvatar" class="avatar-preview">
            <a-avatar :src="editForm.userAvatar" :size="52" />
            <span class="avatar-preview-tip">预览</span>
          </div>
        </a-form-item>

        <a-form-item label="用户名" name="userName">
          <a-input
            v-model:value="editForm.userName"
            placeholder="请输入用户名"
            allow-clear
          />
        </a-form-item>

        <a-form-item label="简介" name="userProfile">
          <a-textarea
            v-model:value="editForm.userProfile"
            placeholder="请输入用户简介"
            :rows="3"
            :maxlength="200"
            show-count
          />
        </a-form-item>

        <a-form-item label="角色" name="userRole">
          <a-select v-model:value="editForm.userRole" style="width: 100%">
            <a-select-option value="user">普通用户</a-select-option>
            <a-select-option value="admin">管理员</a-select-option>
          </a-select>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<style scoped>
.user-manage-page {
  padding: 0;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #1d2939;
  margin: 0 0 4px;
}

.page-desc {
  font-size: 14px;
  color: #8c8c8c;
}

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

.avatar-preview {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.avatar-preview-tip {
  font-size: 12px;
  color: #8c8c8c;
}
</style>
