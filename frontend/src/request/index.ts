import axios from 'axios'
import { message } from 'ant-design-vue'

// 创建 Axios 实例
const myAxios = axios.create({
  baseURL: 'http://localhost:8123/api',
  timeout: 60000,
  withCredentials: true,
  // 在 JSON.parse 之前，将超出 JS 安全整数范围的大整数（如雪花 ID）替换为字符串
  // 防止 Number 精度丢失（JS MAX_SAFE_INTEGER 为 16 位以下）
  transformResponse: [
    (data: string) => {
      try {
        return JSON.parse(data.replace(/:(\s*)(\d{16,})/g, ':"$2"'))
      } catch {
        return data
      }
    },
  ],
})

// 全局请求拦截器
myAxios.interceptors.request.use(
  function (config) {
    // Do something before request is sent
    return config
  },
  function (error) {
    // Do something with request error
    return Promise.reject(error)
  },
)

// 全局响应拦截器
myAxios.interceptors.response.use(
  function (response) {
    const { data } = response
    // 未登录
    if (data.code === 40100) {
      // 不是获取用户信息的请求，并且用户目前不是已经在用户登录页面，则跳转到登录页面
      if (
        !response.request.responseURL.includes('user/get/login') &&
        !window.location.pathname.includes('/user/login')
      ) {
        message.warning('请先登录')
        window.location.href = `/user/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`
      }
    }
    return response
  },
  function (error) {
    // Any status codes that falls outside the range of 2xx cause this function to trigger
    // Do something with response error
    return Promise.reject(error)
  },
)

export default myAxios
