import { useLayoutEffect, useRef, useState } from 'react'
import { IconSend, IconStop } from './icons'

const MAX_HEIGHT = 200

export default function Composer({ inputRef, onSend, onStop, streaming, disabled, placeholder }) {
  const [value, setValue] = useState('')
  const localRef = useRef(null)
  const textareaRef = inputRef ?? localRef

  useLayoutEffect(() => {
    const el = textareaRef.current
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, MAX_HEIGHT)}px`
  }, [value, textareaRef])

  const canSend = value.trim() && !streaming && !disabled

  const submit = (e) => {
    e?.preventDefault()
    if (!canSend) return
    onSend(value)
    setValue('')
  }

  return (
    <form className="composer" onSubmit={submit}>
      <div className={`composer-box${disabled ? ' is-disabled' : ''}`}>
        <textarea
          ref={textareaRef}
          rows={1}
          value={value}
          placeholder={placeholder}
          disabled={disabled}
          aria-label="Ask a question about your documents"
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) submit(e)
          }}
        />
        {streaming ? (
          <button type="button" className="icon-btn icon-btn-stop" onClick={onStop} aria-label="Stop generating" title="Stop (Esc)">
            <IconStop />
          </button>
        ) : (
          <button type="submit" className="icon-btn icon-btn-send" disabled={!canSend} aria-label="Send question" title="Send (Enter)">
            <IconSend />
          </button>
        )}
      </div>
      <p className="composer-hint">
        <span><kbd>/</kbd> focus</span>
        <span><kbd>Enter</kbd> send</span>
        <span><kbd>Shift</kbd>+<kbd>Enter</kbd> new line</span>
        <span><kbd>Esc</kbd> stop</span>
      </p>
    </form>
  )
}
