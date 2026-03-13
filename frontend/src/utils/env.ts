/** 应用预览基础域名，例：http://localhost:8123/api/static */
export const PREVIEW_BASE_URL = import.meta.env.VITE_APP_PREVIEW_BASE_URL as string

/**
 * 拼接应用本地预览 URL
 * - 普通模式：{PREVIEW_BASE_URL}/{codeGenType}_{appId}/
 * - Vue 工程模式：{PREVIEW_BASE_URL}/vue_project_{appId}/dist/
 */
export const getPreviewUrl = (codeGenType: string, appId: string): string => {
  const base = `${PREVIEW_BASE_URL}/${codeGenType}_${appId}/`
  return codeGenType === 'vue_project' ? `${base}dist/index.html` : base
}

/**
 * 部署后的访问域名（可选）。
 * 若配置了 VITE_APP_DEPLOY_BASE_URL，则拼接到后端返回的路径前；
 * 否则直接使用后端返回的完整 URL。
 */
export const DEPLOY_BASE_URL = (import.meta.env.VITE_APP_DEPLOY_BASE_URL as string) || ''

export const getDeployUrl = (urlFromBackend: string): string =>
  DEPLOY_BASE_URL ? `${DEPLOY_BASE_URL}${urlFromBackend}` : urlFromBackend
