import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'

// 按需注册语言，保持包体积精简
import html from 'highlight.js/lib/languages/xml'       // HTML / XML
import css from 'highlight.js/lib/languages/css'
import javascript from 'highlight.js/lib/languages/javascript'
import typescript from 'highlight.js/lib/languages/typescript'
import json from 'highlight.js/lib/languages/json'
import bash from 'highlight.js/lib/languages/bash'

hljs.registerLanguage('html', html)
hljs.registerLanguage('xml', html)
hljs.registerLanguage('css', css)
hljs.registerLanguage('javascript', javascript)
hljs.registerLanguage('js', javascript)
hljs.registerLanguage('typescript', typescript)
hljs.registerLanguage('ts', typescript)
hljs.registerLanguage('json', json)
hljs.registerLanguage('bash', bash)
hljs.registerLanguage('sh', bash)

const highlight = (code: string, lang: string): string => {
  const language = hljs.getLanguage(lang) ? lang : 'plaintext'
  try {
    const highlighted: string =
      language === 'plaintext'
        ? MarkdownIt().utils.escapeHtml(code)
        : hljs.highlight(code, { language, ignoreIllegals: true }).value
    return `<pre class="hljs-pre"><code class="hljs language-${language}">${highlighted}</code></pre>`
  } catch {
    return `<pre class="hljs-pre"><code class="hljs">${MarkdownIt().utils.escapeHtml(code)}</code></pre>`
  }
}

const md: MarkdownIt = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight,
})

export const renderMarkdown = (content: string): string => md.render(content)
