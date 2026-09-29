# Segment 2 - run this BEFORE building the API. Proves the SLM runs locally.
# Load model directly (from the Hugging Face model card)
import sys
import torch
from transformers import MarianTokenizer, MarianMTModel

sys.stdout.reconfigure(encoding='utf-8')

MODEL_NAME = "Helsinki-NLP/opus-mt-en-dra"

device = "cuda" if torch.cuda.is_available() else "cpu"

tokenizer = MarianTokenizer.from_pretrained(MODEL_NAME)

model = MarianMTModel.from_pretrained(MODEL_NAME).to(device)

text = ">>tam<< Artificial intelligence is changing the world."

inputs = tokenizer(text, return_tensors="pt").to(device)

output = model.generate(**inputs)

print(
    tokenizer.decode(
        output[0],
        skip_special_tokens=True
    )
)