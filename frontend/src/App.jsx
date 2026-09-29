import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { fetchHealth, indexDocumentsFolder, streamAnswer, uploadDocument } from './api'
import { APP_NAME } from './config'
import Sidebar from './components/Sidebar'
import Message from './components/Message'
import Composer from './components/Composer'
import AboutModal from './components/AboutModal'
import Robot from './components/Robot'
import {
  IconAlert, IconBulb, IconCompass, IconLayers, IconList, IconMoon, IconPlus, IconSun, IconTarget,
} from './components/icons'

const HEALTH_POLL_MS = 10000
const SUGGESTIONS = [
  { icon: IconList, title: 'Summarize', prompt: 'Summarize the main points of these documents' },
  { icon: IconTarget, title: 'Requirements', prompt: 'What are the key requirements or prerequisites?' },
  { icon: IconBulb, title: 'Explain simply', prompt: 'Explain the most important concepts in simple terms' },
  { icon: IconCompass, title: 'Where to start', prompt: 'What should I focus on first?' },
]

let nextId = 0
const newId = () => ++nextId

function Hero({ hasDocs, canAsk, robotState, onPick }) {
  return (
    <div className="hero">
      <div className="hero-robot">
        <Robot size={104} state={robotState} />
      </div>
      <h3>
        Hi, I'm <span className="gradient-text">{APP_NAME}</span>.
      </h3>
      <p>
        {hasDocs
          ? 'Ask me anything about your documents. I only answer from what I find in them, and I show you exactly where.'
          : 'Give me some documents to read first: upload a PDF or TXT, or load the documents folder from the panel on the left.'}
      </p>

      {hasDocs ? (
        <div className="suggestions">
          {SUGGESTIONS.map(({ icon: Icon, title, prompt }) => (
            <button key={title} className="suggestion" onClick={() => onPick(prompt)} disabled={!canAsk}>
              <span className="suggestion-icon"><Icon width={16} height={16} /></span>
              <span>
                <strong>{title}</strong>
                <span>{prompt}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <ol className="steps">
          <li><span>1</span>Load documents</li>
          <li className="steps-line" aria-hidden="true" />
          <li><span>2</span>Ask a question</li>
          <li className="steps-line" aria-hidden="true" />
          <li><span>3</span>Get a cited answer</li>
        </ol>
      )}
    </div>
  )
}

export default function App() {
  const [health, setHealth] = useState(null)
  const [online, setOnline] = useState(null)
  const [messages, setMessages] = useState([])
  const [streaming, setStreaming] = useState(false)
  const [busy, setBusy] = useState({ upload: false, folder: false })
  const [toast, setToast] = useState(null)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [theme, setTheme] = useState(() => localStorage.getItem('docubot-theme') ?? 'light')
  const abortRef = useRef(null)
  const scrollRef = useRef(null)
  const composerRef = useRef(null)
  const stickToBottom = useRef(true)

  const refreshHealth = useCallback(async () => {
    try {
      setHealth(await fetchHealth())
      setOnline(true)
    } catch {
      setOnline(false)
    }
  }, [])

  useEffect(() => {
    refreshHealth()
    const id = setInterval(refreshHealth, HEALTH_POLL_MS)
    return () => clearInterval(id)
  }, [refreshHealth])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('docubot-theme', theme)
  }, [theme])

  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), 4500)
    return () => clearTimeout(id)
  }, [toast])

  useEffect(() => {
    const onKey = (e) => {
      const typing = ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)
      if (e.key === '/' && !typing && !aboutOpen) {
        e.preventDefault()
        composerRef.current?.focus()
      } else if (e.key === 'Escape' && abortRef.current) {
        abortRef.current.abort()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [aboutOpen])

  useLayoutEffect(() => {
    const el = scrollRef.current
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight
  }, [messages])

  const notify = (type, text) => setToast({ id: newId(), type, text })

  const hasDocs = (health?.indexed_chunks ?? 0) > 0
  const canAsk = online && hasDocs
  const docCount = health?.sources?.length ?? 0

  const last = messages[messages.length - 1]
  const robotState =
    online === false ? 'offline'
    : streaming ? (last?.text ? 'speaking' : 'thinking')
    : 'idle'

  async function runIndexing(key, task, successText) {
    setBusy((b) => ({ ...b, [key]: true }))
    try {
      notify('success', successText(await task()))
    } catch (err) {
      notify('error', err.message)
    } finally {
      setBusy((b) => ({ ...b, [key]: false }))
      refreshHealth()
    }
  }

  const handleUpload = (file) => {
    if (!/\.(pdf|txt)$/i.test(file.name)) {
      notify('error', 'Only PDF and TXT files are supported.')
      return
    }
    runIndexing('upload', () => uploadDocument(file), (data) => data.message)
  }

  const handleIndexFolder = () =>
    runIndexing('folder', indexDocumentsFolder, (data) =>
      `Indexed ${data.indexed.length} file${data.indexed.length === 1 ? '' : 's'} (${data.total_chunks} chunks total).`)

  const updateMessage = (id, patch) =>
    setMessages((ms) => ms.map((m) => (m.id === id ? { ...m, ...patch(m) } : m)))

  async function ask(question) {
    const q = question.trim()
    if (!q || streaming || !canAsk) return

    const botId = newId()
    stickToBottom.current = true
    setMessages((ms) => [
      ...ms,
      { id: newId(), role: 'user', text: q },
      { id: botId, role: 'assistant', text: '', sources: null, status: 'streaming', startedAt: Date.now() },
    ])
    setStreaming(true)

    const controller = new AbortController()
    abortRef.current = controller
    try {
      await streamAnswer(q, {
        signal: controller.signal,
        onToken: (t) => updateMessage(botId, (m) => ({
          text: m.text + t,
          firstTokenAt: m.firstTokenAt ?? Date.now(),
        })),
        onSources: (sources) => updateMessage(botId, () => ({ sources })),
      })
      updateMessage(botId, () => ({ status: 'done', endedAt: Date.now() }))
    } catch (err) {
      if (err.name === 'AbortError') updateMessage(botId, () => ({ status: 'stopped', endedAt: Date.now() }))
      else updateMessage(botId, () => ({ status: 'error', error: err.message }))
    } finally {
      abortRef.current = null
      setStreaming(false)
    }
  }

  const composerPlaceholder =
    online === false ? 'Backend is offline…'
    : !hasDocs ? 'Load documents to start asking questions…'
    : `Message ${APP_NAME}…`

  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      <div className="layout">
        <Sidebar
          health={health}
          online={online}
          busy={busy}
          robotState={robotState}
          onUpload={handleUpload}
          onIndexFolder={handleIndexFolder}
          onAbout={() => setAboutOpen(true)}
        />

        <main className="chat">
          <header className="chat-header">
            <div>
              <h2>Ask your documents</h2>
              <p>
                {hasDocs
                  ? `Grounded answers from ${docCount} document${docCount === 1 ? '' : 's'}`
                  : 'Knowledge base is empty'}
              </p>
            </div>
            <div className="chat-header-actions">
              <button
                className="btn btn-ghost"
                onClick={() => setTheme((t) => (t === 'dark' ? 'light' : 'dark'))}
                aria-label={theme === 'dark' ? 'Switch to bright theme' : 'Switch to dark theme'}
                title={theme === 'dark' ? 'Bright theme' : 'Dark theme'}
              >
                {theme === 'dark' ? <IconSun width={16} height={16} /> : <IconMoon width={16} height={16} />}
              </button>
              <button className="btn btn-ghost" onClick={() => setAboutOpen(true)}>
                <IconLayers width={16} height={16} />
                <span className="hide-sm">Architecture</span>
              </button>
              <button
                className="btn btn-ghost"
                onClick={() => setMessages([])}
                disabled={messages.length === 0 || streaming}
              >
                <IconPlus width={16} height={16} />
                <span className="hide-sm">New chat</span>
              </button>
            </div>
          </header>

          {online === false && (
            <div className="banner" role="alert">
              <IconAlert />
              <div>
                <strong>Can't reach the backend.</strong> Start it with <code>start.bat</code>. The model takes
                about 30 seconds to load, and this page reconnects on its own.
              </div>
            </div>
          )}

          <div
            className="chat-scroll"
            ref={scrollRef}
            onScroll={(e) => {
              const el = e.currentTarget
              stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80
            }}
          >
            <div className="chat-inner chat-thread">
              {messages.length === 0 ? (
                <Hero hasDocs={hasDocs} canAsk={canAsk} robotState={robotState} onPick={ask} />
              ) : (
                messages.map((m) => <Message key={m.id} message={m} />)
              )}
            </div>
          </div>

          <div className="chat-footer">
            <div className="chat-inner">
              <Composer
                inputRef={composerRef}
                onSend={ask}
                onStop={() => abortRef.current?.abort()}
                streaming={streaming}
                disabled={!canAsk}
                placeholder={composerPlaceholder}
              />
            </div>
          </div>
        </main>
      </div>

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />

      {toast && (
        <div key={toast.id} className={`toast toast-${toast.type}`} role="status">
          {toast.text}
        </div>
      )}
    </>
  )
}
