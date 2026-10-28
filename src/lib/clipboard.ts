export function copyText(text: string): Promise<boolean> {
  const legacy = () =>
    new Promise<boolean>((resolve, reject) => {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.setAttribute('readonly', '')
        textarea.style.cssText =
          'position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;border:0;padding:0;'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        textarea.setSelectionRange(0, text.length)
        const copied = document.execCommand('copy')
        textarea.remove()
        if (copied) resolve(true)
        else reject(new Error('execCommand 返回 false'))
      } catch (error) {
        reject(error)
      }
    })

  let inFrame: boolean
  try {
    inFrame = window.self !== window.top
  } catch {
    inFrame = true
  }
  if (!inFrame && navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard
      .writeText(text)
      .then(() => true)
      .catch(() => legacy())
  }
  return legacy()
}

export function selectNode(node: Node): boolean {
  try {
    const range = document.createRange()
    range.selectNodeContents(node)
    const selection = window.getSelection()
    if (!selection) return false
    selection.removeAllRanges()
    selection.addRange(range)
    return true
  } catch {
    return false
  }
}

export function download(name: string, text: string | null): void {
  const blob = new Blob([text || ''], { type: 'text/markdown;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = name
  anchor.click()
  URL.revokeObjectURL(url)
}
