import { useEffect, useState } from 'react'
import { APP_NAME } from '../config'
import Markdown from './Markdown'
import Robot from './Robot'
import { IconAlert, IconBook, IconCheck, IconChevron, IconCopy } from './icons'

const STAGES = ['Retrieve context', 'Generate answer', 'Cite sources']

function Pipeline({ active }) {
  return (
    <ol className="pipeline" aria-label="Answer progress">
      {STAGES.map((label, i) => {
        const state = i < active ? 'is-done' : i === active ? 'is-active' : ''
        return (
          <li key={label} className={state}>
            <span className="pipeline-dot">
              {i < active ? <IconCheck width={11} height={11} /> : i + 1}
            </span>
            {label}
          </li>
        )
      })}
    </ol>
  )
}

function Stats({ message }) {
  const { startedAt, firstTokenAt, endedAt, text } = message
  if (!firstTokenAt || !endedAt) return null
  const firstToken = (firstTokenAt - startedAt) / 1000
  const total = (endedAt - startedAt) / 1000
  const genSeconds = (endedAt - firstTokenAt) / 1000
  const words = text.trim().split(/\s+/).length
  return (
    <div className="stats">
      <span>first token <b>{firstToken.toFixed(1)}s</b></span>
      <span>total <b>{total.toFixed(1)}s</b></span>
      {genSeconds > 0 && <span><b>{(words / genSeconds).toFixed(1)}</b> words/s</span>}
    </div>
  )
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!copied) return
    const id = setTimeout(() => setCopied(false), 1800)
    return () => clearTimeout(id)
  }, [copied])

  return (
    <button
      className="action-btn"
      onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}
    >
      {copied ? <IconCheck width={14} height={14} /> : <IconCopy width={14} height={14} />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  )
}

function Sources({ sources }) {
  const docs = [...new Set(sources.map((s) => s.document))]
  return (
    <details className="sources">
      <summary>
        <IconBook width={15} height={15} />
        <span className="sources-label">
          {sources.length} source{sources.length === 1 ? '' : 's'}
        </span>
        <span className="sources-docs">
          {docs.map((d) => <span key={d} className="chip" title={d}>{d}</span>)}
        </span>
        <IconChevron className="sources-chevron" width={16} height={16} />
      </summary>
      <ol className="source-list">
        {sources.map((s, i) => (
          <li key={i} className="source-item">
            <div className="source-head">
              <span className="source-num">{i + 1}</span>
              <span className="source-doc">{s.document}</span>
              {typeof s.score === 'number' && (
                <span className="score" title="Cosine similarity to your question">
                  <span className="score-bar">
                    <span style={{ width: `${Math.max(0, Math.min(1, s.score)) * 100}%` }} />
                  </span>
                  {s.score.toFixed(2)}
                </span>
              )}
            </div>
            <p>{s.excerpt}</p>
          </li>
        ))}
      </ol>
    </details>
  )
}

export default function Message({ message }) {
  if (message.role === 'user') {
    return (
      <div className="msg msg-user">
        <div className="bubble">{message.text}</div>
      </div>
    )
  }

  const { text, status, sources, error } = message
  const isStreaming = status === 'streaming'
  const robotState = isStreaming ? (text ? 'speaking' : 'thinking') : 'idle'

  return (
    <div className="msg msg-assistant">
      <div className="msg-head">
        <span className="avatar"><Robot size={26} state={robotState} /></span>
        <span className="msg-author">{APP_NAME}</span>
        {status === 'done' && <Stats message={message} />}
      </div>

      <div className="msg-card">
        {isStreaming && <Pipeline active={text ? 1 : 0} />}
        {text && (
          <div className="answer">
            <Markdown text={text} caret={isStreaming} />
          </div>
        )}
        {status === 'error' && (
          <div className="inline-error"><IconAlert width={16} height={16} />{error}</div>
        )}
        {status === 'stopped' && <p className="msg-note">Generation stopped.</p>}
        {sources?.length > 0 && <Sources sources={sources} />}
        {!isStreaming && text && (
          <div className="msg-actions"><CopyButton text={text} /></div>
        )}
      </div>
    </div>
  )
}
