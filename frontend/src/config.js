export const APP_NAME = 'DocuBot'
export const AUTHOR = 'Kavin Prasanth M'

export const TECH_STACK = ['React 19', 'Vite', 'FastAPI', 'PyTorch', 'Transformers', 'NumPy']

export const PIPELINE_STEPS = [
  { title: 'Ingest', detail: 'PDF and TXT files are parsed to plain text.', tech: 'pypdf' },
  { title: 'Chunk', detail: 'Text is split into 120-word windows with a 20-word overlap so no idea is cut in half.', tech: 'sliding window' },
  { title: 'Embed', detail: 'Each chunk becomes a 384-dimension vector, mean-pooled and L2-normalised.', tech: 'all-MiniLM-L6-v2' },
  { title: 'Retrieve', detail: 'The question is embedded and matched by cosine similarity; the top 3 chunks become context.', tech: 'NumPy matrix search' },
  { title: 'Generate', detail: 'A grounded prompt tells the model to answer only from the retrieved context.', tech: 'Qwen2.5-1.5B-Instruct' },
  { title: 'Stream', detail: 'Tokens stream to the browser as NDJSON, followed by the cited sources.', tech: 'FastAPI StreamingResponse' },
]
