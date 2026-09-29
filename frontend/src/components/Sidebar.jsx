import { useRef, useState } from 'react'
import { APP_NAME, AUTHOR, TECH_STACK } from '../config'
import Robot from './Robot'
import { IconCpu, IconFile, IconFolder, IconLayers, IconUpload } from './icons'

const STATUS = {
  pending: { label: 'Connecting', tone: 'pending' },
  ok: { label: 'Online', tone: 'ok' },
  error: { label: 'Offline', tone: 'error' },
}

export default function Sidebar({ health, online, busy, robotState, onUpload, onIndexFolder, onAbout }) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const sources = health?.sources ?? []
  const uploadDisabled = busy.upload || !online
  const status = online === null ? STATUS.pending : online ? STATUS.ok : STATUS.error

  const openPicker = () => {
    if (!uploadDisabled) inputRef.current.click()
  }
  const handleFiles = (files) => {
    const file = files?.[0]
    if (file && !uploadDisabled) onUpload(file)
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <Robot size={46} state={robotState} />
        <div>
          <h1>{APP_NAME}</h1>
          <p>Document intelligence, running locally</p>
        </div>
      </div>

      <section className="card">
        <div className="card-head">
          <h2>System</h2>
          <span className={`live live-${status.tone}`}>
            <span className="live-dot" />
            {status.label}
          </span>
        </div>
        <dl className="metrics">
          <div className="metric">
            <dt>Documents</dt>
            <dd>{sources.length}</dd>
          </div>
          <div className="metric">
            <dt>Chunks</dt>
            <dd>{(health?.indexed_chunks ?? 0).toLocaleString()}</dd>
          </div>
        </dl>
        <div className="model-line" title={health?.model}>
          <IconCpu width={15} height={15} />
          <span>{health?.model?.split('/').pop() ?? 'Model not loaded'}</span>
        </div>
      </section>

      <section className="card">
        <div className="card-head">
          <h2>Knowledge base</h2>
        </div>

        <div
          className={`dropzone${dragging ? ' is-dragging' : ''}${uploadDisabled ? ' is-disabled' : ''}`}
          role="button"
          tabIndex={uploadDisabled ? -1 : 0}
          aria-disabled={uploadDisabled}
          onClick={openPicker}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              openPicker()
            }
          }}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
        >
          <span className="dropzone-icon">
            {busy.upload ? <span className="spinner" /> : <IconUpload width={20} height={20} />}
          </span>
          <strong>{busy.upload ? 'Indexing file…' : 'Drop a PDF or TXT'}</strong>
          <span>{busy.upload ? 'Chunking and embedding' : 'or click to browse'}</span>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.txt"
            hidden
            onChange={(e) => { handleFiles(e.target.files); e.target.value = '' }}
          />
        </div>

        <button className="btn btn-outline btn-block" onClick={onIndexFolder} disabled={busy.folder || !online}>
          {busy.folder ? <span className="spinner" /> : <IconFolder width={16} height={16} />}
          {busy.folder ? 'Indexing folder…' : 'Load documents folder'}
        </button>

        {sources.length > 0 && (
          <ul className="doc-list">
            {sources.map((name) => (
              <li key={name} className="doc-item">
                <span className="doc-icon"><IconFile width={15} height={15} /></span>
                <span className="doc-name" title={name}>{name}</span>
                <span className={`doc-ext doc-ext-${name.split('.').pop().toLowerCase()}`}>
                  {name.split('.').pop()}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="sidebar-footer">
        <button className="about-link" onClick={onAbout}>
          <IconLayers width={15} height={15} />
          How it works
        </button>
        <div className="stack">
          {TECH_STACK.map((t) => <span key={t} className="stack-chip">{t}</span>)}
        </div>
        <p className="credit">Designed &amp; built by <strong>{AUTHOR}</strong></p>
      </footer>
    </aside>
  )
}
