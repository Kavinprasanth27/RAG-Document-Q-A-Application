RAG Document Q&A Application

A full-stack Retrieval-Augmented Generation (RAG) app that lets you upload documents and ask questions about them. Runs entirely on your local machine using open-source models.

## Architecture

```
RAG/
├── backend/        # FastAPI server (Python)
│   └── main.py
├── frontend/       # React + Vite UI
│   └── src/
├── documents/      # Drop your PDF / TXT files here
├── start.bat       # One-click launcher for backend + frontend
└── Ragproject.py   # Standalone translation demo
```

## Models Used

| Role | Model |
|------|-------|
| Embeddings | `sentence-transformers/all-MiniLM-L6-v2` (~90 MB) |
| Answer generation | `Qwen/Qwen2.5-1.5B-Instruct` (~3 GB) |

Both are downloaded automatically from Hugging Face on first run (models are cached after the first download).

## Setup

### Prerequisites

- Python 3.10+
- Node.js 18+

### 1. Install Python dependencies

```bash
python -m pip install fastapi uvicorn python-multipart pypdf numpy sentence-transformers torch transformers sentencepiece
```

### 2. Install frontend dependencies

```bash
cd frontend
npm install
```

## Running the App

### Quick start (recommended)

Double-click **`start.bat`** in the `RAG` folder. It opens two windows:

- **RAG Backend** — wait for `LLM ready. Server is up.` (~30 seconds)
- **RAG Frontend** — the Vite dev server

Then open `http://localhost:5173` and click **"Load Documents Folder"**.

Use this every time you restart or reopen your laptop. To stop the app, close both windows.

> If port 5173 is already in use, Vite picks the next free port (e.g. 5174) — check the Frontend window for the actual URL.

### Manual start

#### Start the backend

```bash
cd backend
python -m uvicorn main:app --port 8000
```

The first run downloads the models (~3 GB total, cached after first download). Wait for:
```
LLM ready. Server is up.
```

#### Start the frontend (new terminal)

```bash
cd frontend
npm run dev
```

Open `http://localhost:5173` in your browser.

## How to Use

### Option A — Upload via UI
1. Click **"Upload a PDF or TXT file"** and select your document
2. Wait for the "Indexed N chunks" confirmation.
3. Type a question and click **Ask**.

### Option B — Load from documents folder
1. Copy your PDF or TXT files into the `documents/` folder.
2. Click **"Load Documents Folder"** in the UI.
3. Ask your question.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Server status + chunk count |
| POST | `/api/upload` | Upload a PDF or TXT file |
| POST | `/api/index-documents` | Index all files in `documents/` folder |
| POST | `/api/query` | Ask a question `{ "question": "..." }` — streams NDJSON (`token` lines, then a `sources` line) |

## Notes

- Answers stream word-by-word — first token appears in ~2 seconds, full answer in ~2 minutes on CPU.
- Indexed documents are held in memory; restarting the server clears them. Re-click "Load Documents Folder" after each restart.
- No GPU required — runs on CPU. CUDA will be used automatically if available.
- Corporate networks that block `registry.ollama.ai` can still use this app (HuggingFace CDN is used instead).