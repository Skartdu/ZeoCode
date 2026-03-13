import { ref } from 'vue'
import { defineStore } from 'pinia'
import { getLoginUser } from '@/api/userController'

export const useUserStore = defineStore('user', () => {
  const loginUser = ref<API.LoginUserVO | null>(null)
  // 标记是否已完成过一次用户信息拉取，防止刷新时路由守卫误判
  const initialized = ref(false)

  // 拉取当前登录用户信息
  async function fetchCurrentUser() {
    try {
      const res = await getLoginUser()
      if (res.data?.code === 0 && res.data.data) {
        loginUser.value = res.data.data
      } else {
        loginUser.value = null
      }
    } catch {
      loginUser.value = null
    } finally {
      initialized.value = true
    }
  }

  // 设置用户（登录成功后直接写入，避免多一次请求）
  function setLoginUser(user: API.LoginUserVO) {
    loginUser.value = user
    initialized.value = true
  }

  // 退出登录，清除用户信息
  function clearLoginUser() {
    loginUser.value = null
  }

  return { loginUser, initialized, fetchCurrentUser, setLoginUser, clearLoginUser }
})
