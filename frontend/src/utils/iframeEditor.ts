/** 选中元素的信息结构 */
export interface SelectedElementInfo {
  /** 标签名，小写 */
  tagName: string
  /** 元素 id（可能为空） */
  id: string
  /** 元素 class（可能为空） */
  className: string
  /** 文本内容（截取前 80 字符） */
  textContent: string
  /** 简短 CSS 选择器 */
  selector: string
}

/** 元素被选中时的回调 */
export type ElementSelectHandler = (info: SelectedElementInfo) => void

const STYLE_ID = '__ve_style__'

const EDITOR_CSS = `
  [data-ve-hover]:not([data-ve-selected]) {
    outline: 2px dashed #7c3aed !important;
    outline-offset: 2px !important;
    cursor: crosshair !important;
  }
  [data-ve-selected] {
    outline: 3px solid #7c3aed !important;
    outline-offset: 2px !important;
    background-color: rgba(124, 58, 237, 0.06) !important;
    cursor: crosshair !important;
  }
`

/**
 * 注入可视化编辑器到同源 iframe。
 * @returns 清理函数，离开编辑模式或 iframe 重载前调用
 */
export function injectEditor(
  iframe: HTMLIFrameElement,
  onSelect: ElementSelectHandler,
): () => void {
  const doc = iframe.contentDocument
  const win = iframe.contentWindow as IframeWindow | null
  if (!doc || !win) return () => {}

  // 注入高亮 CSS
  if (!doc.getElementById(STYLE_ID)) {
    const style = doc.createElement('style')
    style.id = STYLE_ID
    style.textContent = EDITOR_CSS
    ;(doc.head ?? doc.documentElement).appendChild(style)
  }

  // 已激活则直接返回当前清理函数
  if (win.__veActive) return buildCleanup(win)

  win.__veActive = true

  let hoveredEl: Element | null = null
  let selectedEl: Element | null = null

  const onMouseOver = (e: Event) => {
    const target = e.target as Element
    if (!target || target === doc.body || target === doc.documentElement) return
    if (hoveredEl && hoveredEl !== selectedEl) {
      hoveredEl.removeAttribute('data-ve-hover')
    }
    hoveredEl = target
    if (hoveredEl !== selectedEl) {
      hoveredEl.setAttribute('data-ve-hover', '')
    }
  }

  const onMouseOut = (e: Event) => {
    const rel = (e as MouseEvent).relatedTarget as Element | null
    if (!rel || rel === doc.documentElement) {
      if (hoveredEl && hoveredEl !== selectedEl) {
        hoveredEl.removeAttribute('data-ve-hover')
        hoveredEl = null
      }
    }
  }

  const onClick = (e: Event) => {
    e.preventDefault()
    e.stopPropagation()
    const target = e.target as Element
    if (selectedEl) selectedEl.removeAttribute('data-ve-selected')
    selectedEl = target
    selectedEl.removeAttribute('data-ve-hover')
    selectedEl.setAttribute('data-ve-selected', '')
    onSelect({
      tagName: target.tagName.toLowerCase(),
      id: target.id ?? '',
      className:
        typeof target.className === 'string' ? target.className.trim() : '',
      textContent: (target.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 80),
      selector: computeSelector(target),
    })
  }

  doc.addEventListener('mouseover', onMouseOver)
  doc.addEventListener('mouseout', onMouseOut)
  doc.addEventListener('click', onClick, true) // capture 防止触发 a 标签跳转

  win.__veClear = () => {
    if (selectedEl) {
      selectedEl.removeAttribute('data-ve-selected')
      selectedEl = null
    }
    if (hoveredEl) {
      hoveredEl.removeAttribute('data-ve-hover')
      hoveredEl = null
    }
  }

  win.__veCleanup = () => {
    doc.removeEventListener('mouseover', onMouseOver)
    doc.removeEventListener('mouseout', onMouseOut)
    doc.removeEventListener('click', onClick, true)
    doc.getElementById(STYLE_ID)?.remove()
    win!.__veActive = false
    win!.__veClear = undefined
    win!.__veCleanup = undefined
  }

  return buildCleanup(win)
}

/** 清除 iframe 内已选中元素的高亮 */
export function clearEditorSelection(iframe: HTMLIFrameElement) {
  try {
    ;(iframe.contentWindow as IframeWindow | null)?.__veClear?.()
  } catch {
    // 跨域访问时静默忽略
  }
}

/** 根据 SelectedElementInfo 生成提示词附言 */
export function buildElementPrompt(info: SelectedElementInfo): string {
  const tag = info.id
    ? `<${info.tagName}#${info.id}>`
    : info.className
      ? `<${info.tagName}.${info.className.split(' ')[0]}>`
      : `<${info.tagName}>`
  const text = info.textContent ? `，文本内容："${info.textContent}"` : ''
  return `[选中元素: ${tag} (CSS选择器: ${info.selector})${text}]`
}

// ---- 私有辅助 ----

interface IframeWindow extends Window {
  __veActive?: boolean
  __veClear?: () => void
  __veCleanup?: () => void
}

function buildCleanup(win: IframeWindow): () => void {
  return () => {
    try {
      win.__veCleanup?.()
      win.__veClear?.()
    } catch {
      // ignore
    }
  }
}

function computeSelector(el: Element): string {
  if (el.id) return `#${el.id}`
  const parts: string[] = []
  let cur: Element | null = el
  while (cur && cur.tagName !== 'HTML' && parts.length < 5) {
    let part = cur.tagName.toLowerCase()
    if (cur.id) {
      parts.unshift(`#${cur.id}`)
      break
    }
    const siblings = cur.parentElement?.children
    if (siblings && siblings.length > 1) {
      const idx = Array.from(siblings).indexOf(cur) + 1
      part += `:nth-child(${idx})`
    }
    parts.unshift(part)
    cur = cur.parentElement
  }
  return parts.join(' > ')
}
