RAG Document Q&A Application
An AI-powered document question-answering system that allows users to upload PDF and TXT files and ask natural language questions about their content.

The application uses Retrieval-Augmented Generation (RAG) to retrieve relevant document chunks and generate accurate responses using open-source Large Language Models.
## Features

- Upload PDF and TXT documents
- Automatic document indexing
- Semantic search using embeddings
- AI-generated answers using Qwen2.5
- Real-time streaming responses
- FastAPI backend
- React + Vite frontend
- CPU and GPU support
- Fully local deployment
  
#Architecture Diagram
User
  ↓
React Frontend
  ↓
FastAPI Backend
  ↓
Embedding Model
(all-MiniLM-L6-v2)
  ↓
Vector Search
  ↓
Qwen2.5 LLM
  ↓
Response



