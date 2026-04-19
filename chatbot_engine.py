import json
import numpy as np
import re
import os
from dotenv import load_dotenv
from rank_bm25 import BM25Okapi
from difflib import get_close_matches
from groq import Groq

load_dotenv()

# ── SINONIM ──────────────────────────────────────────────
synonyms = {
    "biaya": ["harga", "uang", "tarif"],
    "daftar": ["pendaftaran", "registrasi"],
    "jurusan": ["prodi", "program studi"],
    "beasiswa": ["bantuan", "subsidi"]
}

# ── LOAD DATASET ─────────────────────────────────────────
with open("dataset_pmb.json", "r", encoding="utf-8") as f:
    data = json.load(f)

questions = [d["question"] for d in data]
answers   = [d["answer"]   for d in data]

# ── CACHE WORDLIST ────────────────────────────────────────
all_words = list(set([w for q in questions for w in q.lower().split()]))

# ── GROQ CLIENT ──────────────────────────────────────────
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

# ── TYPO CORRECTION ───────────────────────────────────────
def correct_typo(word):
    match = get_close_matches(word, all_words, n=1, cutoff=0.8)
    return match[0] if match else word

# ── PREPROCESSING ────────────────────────────────────────
def preprocess(text):
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s]', '', text)
    words  = text.split()
    result = []
    for w in words:
        w = correct_typo(w)
        result.append(w)
        for key, syns in synonyms.items():
            if w == key or w in syns:
                result.append(key)
    return result

# ── BUILD BM25 INDEX ─────────────────────────────────────
tokenized = [preprocess(q) for q in questions]
bm25      = BM25Okapi(tokenized)

# ── BM25 RETRIEVAL ────────────────────────────────────────
def retrieve(user_input):
    if not user_input or not user_input.strip():
        return None, 0

    tokens     = preprocess(user_input)
    scores     = bm25.get_scores(tokens)
    top_idx    = np.argsort(scores)[::-1][:3]
    best_score = scores[top_idx[0]]

    if best_score < 0.5:
        return None, 0

    context_docs = [answers[i] for i in top_idx if scores[i] > 0]
    return context_docs, round(float(best_score), 2)

# ── STREAMING GENERATION ──────────────────────────────────
def stream_response(user_input, chat_history=[]):
    """
    Generator: yield token per token dari Groq (streaming).
    chat_history: list of {"role": "user"/"assistant", "content": "..."}
    """
    context_docs, score = retrieve(user_input)

    if context_docs is None:
        yield "Maaf, saya belum memiliki informasi terkait pertanyaan tersebut.\n\nSilakan pilih pertanyaan yang tersedia di bawah."
        return

    context_text = "\n\n".join([f"- {doc}" for doc in context_docs])

    # Susun messages dengan riwayat percakapan
    messages = [
        {
            "role": "system",
            "content": f"""Kamu adalah asisten chatbot resmi Universitas Gunadarma yang membantu calon mahasiswa baru (PMB).

Berikut adalah informasi relevan yang tersedia:
{context_text}

Instruksi:
- Jawab HANYA berdasarkan informasi di atas.
- Gunakan bahasa Indonesia yang ramah, jelas, dan informatif.
- Jika informasi tidak cukup, sampaikan dengan sopan bahwa kamu belum memiliki informasi tersebut.
- Jangan mengarang informasi yang tidak ada di konteks.
- Perhatikan konteks percakapan sebelumnya untuk menjawab dengan lebih relevan."""
        }
    ]

    # Tambahkan riwayat percakapan sebelumnya (maksimal 6 pesan terakhir)
    if chat_history:
        for msg in chat_history[-6:]:
            messages.append({
                "role": msg["role"],
                "content": msg["content"]
            })

    # Tambahkan pesan user saat ini
    messages.append({
        "role": "user",
        "content": user_input
    })

    stream = client.chat.completions.create(
        model="llama-3.1-8b-instant",
        messages=messages,
        temperature=0.3,
        max_tokens=512,
        stream=True
    )

    for chunk in stream:
        token = chunk.choices[0].delta.content
        if token:
            yield token