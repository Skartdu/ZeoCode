/** 代码生成类型，对应后端 CodeGenTypeEnum */
export const CODE_GEN_TYPE_ENUM = {
  HTML: {
    value: 'html',
    label: '原生 HTML 模式',
    color: 'blue',
  },
  MULTI_FILE: {
    value: 'multi_file',
    label: '原生多文件模式',
    color: 'cyan',
  },
  VUE_PROJECT: {
    value: 'vue_project',
    label: 'Vue 工程模式',
    color: 'green',
  },
} as const

/** 所有类型列表，方便下拉选择等场景遍历 */
export const CODE_GEN_TYPE_LIST = Object.values(CODE_GEN_TYPE_ENUM)

/** 根据 value 获取 label */
export const getCodeGenTypeLabel = (value?: string): string => {
  if (!value) return '-'
  const found = CODE_GEN_TYPE_LIST.find((item) => item.value === value)
  return found ? found.label : value
}

/** 根据 value 获取 Ant Design Tag 颜色 */
export const getCodeGenTypeColor = (value?: string): string => {
  if (!value) return 'default'
  const found = CODE_GEN_TYPE_LIST.find((item) => item.value === value)
  return found ? found.color : 'default'
}
