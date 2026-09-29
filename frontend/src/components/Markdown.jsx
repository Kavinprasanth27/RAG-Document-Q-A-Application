// Minimal renderer for the markdown subset the LLM emits. Builds React
// elements directly (no innerHTML), so model output can never inject markup.

function renderInline(text) {
  return text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
    if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i}>{part.slice(2, -2)}</strong>
    }
    if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
      return <code key={i}>{part.slice(1, -1)}</code>
    }
    return part
  })
}

function parseBlocks(text) {
  const blocks = []
  let list = null
  const flush = () => {
    if (list) blocks.push(list)
    list = null
  }

  for (const raw of text.split('\n')) {
    const line = raw.trimEnd()
    const bullet = line.match(/^\s*[-*•]\s+(.*)/)
    const numbered = line.match(/^\s*(\d+)[.)]\s+(.*)/)
    const heading = line.match(/^#{1,4}\s+(.*)/)

    if (bullet || numbered) {
      const type = bullet ? 'ul' : 'ol'
      if (!list || list.type !== type) {
        flush()
        list = { type, items: [], start: numbered ? Number(numbered[1]) : undefined }
      }
      list.items.push(bullet ? bullet[1] : numbered[2])
      continue
    }
    flush()
    if (heading) blocks.push({ type: 'h', text: heading[1] })
    else if (line.trim()) blocks.push({ type: 'p', text: line })
  }
  flush()
  return blocks
}

export default function Markdown({ text, caret = false }) {
  const blocks = parseBlocks(text)
  const caretEl = caret ? <span className="caret" aria-hidden="true" /> : null
  if (blocks.length === 0) return caretEl

  return blocks.map((block, i) => {
    const isLast = i === blocks.length - 1
    if (block.type === 'ul' || block.type === 'ol') {
      const List = block.type
      return (
        <List key={i} start={block.start}>
          {block.items.map((item, j) => (
            <li key={j}>
              {renderInline(item)}
              {isLast && j === block.items.length - 1 && caretEl}
            </li>
          ))}
        </List>
      )
    }
    if (block.type === 'h') {
      return <h4 key={i}>{renderInline(block.text)}{isLast && caretEl}</h4>
    }
    return <p key={i}>{renderInline(block.text)}{isLast && caretEl}</p>
  })
}
