async function errorMessage(res, fallback) {
  try {
    const data = await res.json()
    return data.detail || fallback
  } catch {
    return fallback
  }
}

export async function fetchHealth() {
  const res = await fetch('/api/health')
  if (!res.ok) throw new Error('Backend unavailable')
  return res.json()
}

export async function uploadDocument(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await fetch('/api/upload', { method: 'POST', body: form })
  if (!res.ok) throw new Error(await errorMessage(res, 'Upload failed'))
  return res.json()
}

export async function indexDocumentsFolder() {
  const res = await fetch('/api/index-documents', { method: 'POST' })
  if (!res.ok) throw new Error(await errorMessage(res, 'Could not load the documents folder'))
  return res.json()
}

export async function streamAnswer(question, { signal, onToken, onSources }) {
  const res = await fetch('/api/query', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question }),
    signal,
  })
  if (!res.ok) throw new Error(await errorMessage(res, 'Query failed'))

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  const handleLine = (line) => {
    if (!line.trim()) return
    const msg = JSON.parse(line)
    if (msg.type === 'token') onToken(msg.text)
    else if (msg.type === 'sources') onSources(msg.data)
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })
    // A network chunk can end mid-line; keep the partial line for the next read.
    const lines = buffer.split('\n')
    buffer = lines.pop()
    lines.forEach(handleLine)
  }
  handleLine(buffer + decoder.decode())
}
