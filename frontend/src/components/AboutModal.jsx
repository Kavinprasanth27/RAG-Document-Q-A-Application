import { useEffect, useRef } from 'react'
import { APP_NAME, AUTHOR, PIPELINE_STEPS, TECH_STACK } from '../config'
import { IconX } from './icons'

export default function AboutModal({ open, onClose }) {
  const dialogRef = useRef(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={dialogRef}
      className="modal"
      onClose={onClose}
      onClick={(e) => { if (e.target === dialogRef.current) onClose() }}
    >
      <div className="modal-body">
        <header className="modal-head">
          <div>
            <p className="eyebrow">Architecture</p>
            <h2>How {APP_NAME} answers a question</h2>
          </div>
          <button className="icon-btn-plain" onClick={onClose} aria-label="Close">
            <IconX />
          </button>
        </header>

        <ol className="arch">
          {PIPELINE_STEPS.map((step, i) => (
            <li key={step.title} className="arch-step">
              <span className="arch-num">{String(i + 1).padStart(2, '0')}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.detail}</p>
                <code>{step.tech}</code>
              </div>
            </li>
          ))}
        </ol>

        <footer className="modal-foot">
          <div className="stack">
            {TECH_STACK.map((t) => <span key={t} className="stack-chip">{t}</span>)}
          </div>
          <p className="credit">Designed &amp; built by <strong>{AUTHOR}</strong></p>
        </footer>
      </div>
    </dialog>
  )
}
