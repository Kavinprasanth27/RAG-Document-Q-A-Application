import sys
import io
import os
import json
import numpy as np
import torch
from threading import Thread
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from transformers import AutoTokenizer, AutoModel, AutoModelForCausalLM, TextIteratorStreamer
import pypdf

sys.stdout.reconfigure(encoding="utf-8")

DOCUMENTS_DIR = os.path.join(os.path.dirname(__file__), "..", "documents")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

device = "cuda" if torch.cuda.is_available() else "cpu"

print(f"Loading embedding model on {device}...")
EMB_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
emb_tokenizer = AutoTokenizer.from_pretrained(EMB_MODEL)
emb_model = AutoModel.from_pretrained(EMB_MODEL).to(device)
emb_model.eval()
print("Embedding model ready.")

print("Loading Qwen2.5-1.5B-Instruct...")
LLM_MODEL = "Qwen/Qwen2.5-1.5B-Instruct"
llm_tokenizer = AutoTokenizer.from_pretrained(LLM_MODEL)
llm_model = AutoModelForCausalLM.from_pretrained(LLM_MODEL, dtype=torch.float32).to(device)
llm_model.eval()
print("LLM ready. Server is up.")

store: list[dict] = []
embeddings: np.ndarray | None = None


def mean_pool(model_output, attention_mask):
    token_emb = model_output.last_hidden_state
    mask = attention_mask.unsqueeze(-1).expand(token_emb.size()).float()
    return (token_emb * mask).sum(1) / mask.sum(1)


def embed(texts: list[str]) -> np.ndarray:
    encoded = emb_tokenizer(texts, padding=True, truncation=True, max_length=128, return_tensors="pt").to(device)
    with torch.no_grad():
        out = emb_model(**encoded)
    vecs = mean_pool(out, encoded["attention_mask"])
    vecs = vecs / vecs.norm(dim=1, keepdim=True)
    return vecs.cpu().numpy()


def chunk_text(text: str, size: int = 120, overlap: int = 20) -> list[str]:
    words = text.split()
    result, i = [], 0
    while i < len(words):
        result.append(" ".join(words[i : i + size]))
        i += size - overlap
    return result


def build_prompt(context: str, question: str) -> str:
    messages = [
        {
            "role": "system",
            "content": (
                "You are a helpful assistant. Answer the question using ONLY the provided context. "
                "Be clear and concise. Mention which document the information comes from. "
                "If the context doesn't contain enough information, say so honestly."
            ),
        },
        {"role": "user", "content": f"Context:\n{context}\n\nQuestion: {question}"},
    ]
    return llm_tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)


def retrieve(question: str, top_k: int = 3):
    q_emb = embed([question])
    scores = np.atleast_1d((embeddings @ q_emb.T).squeeze())
    top_idx = np.argsort(scores)[::-1][:top_k].tolist()
    sources_used: dict[str, list[str]] = {}
    for i in top_idx:
        src = store[i]["source"]
        sources_used.setdefault(src, []).append(store[i]["text"])
    context_block = ""
    for src, passages in sources_used.items():
        context_block += f"\n[Document: {src}]\n" + "\n".join(passages) + "\n"
    source_details = [
        {
            "document": store[i]["source"],
            "excerpt": store[i]["text"][:250] + ("..." if len(store[i]["text"]) > 250 else ""),
            "score": round(float(scores[i]), 3),
        }
        for i in top_idx
    ]
    return context_block, source_details


def index_content(content: bytes, filename: str) -> int:
    global store, embeddings
    if filename.lower().endswith(".pdf"):
        reader = pypdf.PdfReader(io.BytesIO(content))
        text = " ".join(page.extract_text() or "" for page in reader.pages)
    else:
        text = content.decode("utf-8", errors="ignore")
    new_chunks = chunk_text(text)
    if not new_chunks:
        return 0
    new_emb = embed(new_chunks)
    for chunk in new_chunks:
        store.append({"text": chunk, "source": filename})
    embeddings = new_emb if embeddings is None else np.vstack([embeddings, new_emb])
    return len(new_chunks)


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "indexed_chunks": len(store),
        "sources": list({e["source"] for e in store}),
        "model": LLM_MODEL,
    }


@app.post("/api/upload")
def upload(file: UploadFile = File(...)):
    n = index_content(file.file.read(), file.filename)
    if n == 0:
        raise HTTPException(status_code=400, detail="No text could be extracted from the file.")
    return {"message": f"Indexed {n} chunks from '{file.filename}'.", "total_chunks": len(store)}


@app.post("/api/index-documents")
def index_documents():
    if not os.path.isdir(DOCUMENTS_DIR):
        raise HTTPException(status_code=404, detail="Documents folder not found.")
    files = [f for f in os.listdir(DOCUMENTS_DIR) if f.lower().endswith((".pdf", ".txt"))]
    if not files:
        raise HTTPException(status_code=400, detail="No PDF or TXT files found in the documents folder.")
    results = []
    for fname in files:
        with open(os.path.join(DOCUMENTS_DIR, fname), "rb") as f:
            n = index_content(f.read(), fname)
        results.append({"file": fname, "chunks": n})
    return {"indexed": results, "total_chunks": len(store)}


class Query(BaseModel):
    question: str


def token_stream(context: str, question: str, source_details: list):
    prompt = build_prompt(context, question)
    inputs = llm_tokenizer(prompt, return_tensors="pt", truncation=True, max_length=1500).to(device)

    streamer = TextIteratorStreamer(llm_tokenizer, skip_prompt=True, skip_special_tokens=True)
    generate_kwargs = dict(
        **inputs,
        max_new_tokens=200,
        do_sample=False,
        use_cache=True,
        pad_token_id=llm_tokenizer.eos_token_id,
        streamer=streamer,
    )
    thread = Thread(target=llm_model.generate, kwargs=generate_kwargs)
    thread.start()

    for token in streamer:
        yield json.dumps({"type": "token", "text": token}) + "\n"

    thread.join()
    yield json.dumps({"type": "sources", "data": source_details}) + "\n"


@app.post("/api/query")
def query(q: Query):
    if not store:
        raise HTTPException(status_code=400, detail="No documents indexed yet. Upload a file or load the documents folder first.")
    context, source_details = retrieve(q.question)
    return StreamingResponse(
        token_stream(context, q.question, source_details),
        media_type="application/x-ndjson",
    )
