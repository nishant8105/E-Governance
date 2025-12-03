# server.py
# Robust FastAPI proxy for Google Generative Language (Gemini)
# - auto-selects generateContent model from your account
# - safe timeouts and error handling
# - returns consistent JSON: { success: true, text: "..." } or { success: false, error: "..." }
#
# Usage:
# 1) pip install fastapi uvicorn requests python-dotenv
# 2) create .env with GEMINI_API_KEY=your_key
# 3) python -m uvicorn server:app --reload --port 5000

import os
import json
import traceback
import requests
from typing import Optional, Tuple
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

if not GEMINI_API_KEY or GEMINI_API_KEY == "AIzaSyDXZIYnTZ2iXlWS8mlwgjSY0mWO3leRRIU":
    # do not crash on import in some environments; raise only on first request if missing
    print("WARNING: GEMINI_API_KEY not found or is invalid/placeholder. Server will run but API calls will fail.")

app = FastAPI(title="Gemini Proxy")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # local dev only; restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Determine absolute paths to static directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
HOME_DIR = os.path.join(BASE_DIR, "../home")
CHATBOT_DIR = os.path.join(BASE_DIR, "../chatbot")

# Mount static files
# Mount /chatbot first to ensure it's not caught by the root wildcard if that were an issue (though explicit mounts usually fine)
app.mount("/chatbot", StaticFiles(directory=CHATBOT_DIR, html=True), name="chatbot")

class GeminiRequest(BaseModel):
    prompt: str

# preferred models from ListModels (ordered)
PREFERRED_MODELS = [
    "models/gemini-2.5-flash",
    "models/gemini-2.5-pro",
    "models/gemini-2.0-flash",
    "models/gemini-2.0-flash-001",
    "models/gemini-2.5-flash-lite",
]

_model_cache = None

def list_models() -> dict:
    global _model_cache
    if _model_cache is not None:
        return _model_cache

    if not GEMINI_API_KEY or GEMINI_API_KEY == "AIzaSyDXZIYnTZ2iXlWS8mlwgjSY0mWO3leRRIU":
        raise RuntimeError("GEMINI_API_KEY not set or is invalid placeholder")

    url = f"https://generativelanguage.googleapis.com/v1/models?key={GEMINI_API_KEY}"
    r = requests.get(url, timeout=15)
    try:
        data = r.json()
    except Exception as e:
        raise RuntimeError(f"ListModels failed: status={r.status_code} body={r.text[:2000]}") from e
    
    if "error" in data:
        msg = data["error"].get("message", "Unknown API error")
        raise RuntimeError(f"Gemini API Error: {msg}")

    _model_cache = data
    return data

def pick_generation_model() -> Tuple[str, str]:
    """
    Return (model_name, method) where method is 'generateContent'
    Raises RuntimeError if no suitable model found.
    """
    md = list_models()
    models = md.get("models") if isinstance(md, dict) else None
    if not models:
        raise RuntimeError("No models returned by ListModels")

    # map name->info
    name_map = {m.get("name"): m for m in models if isinstance(m, dict) and m.get("name")}
    # try preferred models
    for pref in PREFERRED_MODELS:
        info = name_map.get(pref)
        if info:
            methods = info.get("supportedGenerationMethods", []) or []
            if "generateContent" in methods:
                return pref, "generateContent"

    # fallback: pick first model that supports generateContent
    for m in models:
        methods = m.get("supportedGenerationMethods") or []
        if "generateContent" in methods:
            return m.get("name"), "generateContent"

    raise RuntimeError("No model supporting generateContent found for this API key")

def extract_text_from_generate_content_response(data: dict) -> Optional[str]:
    """
    Try several common shapes and deep search for first 'text' result.
    """
    try:
        # 1) candidates -> content -> list -> objects with 'text'
        cands = data.get("candidates")
        if isinstance(cands, list) and cands:
            first = cands[0]
            content = first.get("content")
            # content might be list of blocks
            if isinstance(content, list):
                for block in content:
                    if isinstance(block, dict) and "text" in block and isinstance(block["text"], str):
                        return block["text"]
                    # fallback: block may have 'parts'
                    parts = block.get("parts")
                    if isinstance(parts, list):
                        p0 = parts[0]
                        if isinstance(p0, dict) and "text" in p0:
                            return p0["text"]
                        if isinstance(p0, str):
                            return p0
            # content might be dict with 'parts'
            if isinstance(content, dict):
                parts = content.get("parts")
                if isinstance(parts, list) and parts:
                    p0 = parts[0]
                    if isinstance(p0, dict) and "text" in p0:
                        return p0["text"]
                    if isinstance(p0, str):
                        return p0

        # 2) output style: output -> [ { content: [ { text: ... } ] } ]
        out = data.get("output")
        if isinstance(out, list):
            for item in out:
                if isinstance(item, dict) and "content" in item:
                    for c in item["content"]:
                        if isinstance(c, dict) and "text" in c:
                            return c["text"]

        # 3) deep search for first string under keys named 'text'
        def deep_find_text(obj):
            if isinstance(obj, str):
                return obj
            if isinstance(obj, dict):
                if "text" in obj and isinstance(obj["text"], str):
                    return obj["text"]
                for v in obj.values():
                    r = deep_find_text(v)
                    if r:
                        return r
            if isinstance(obj, list):
                for it in obj:
                    r = deep_find_text(it)
                    if r:
                        return r
            return None

        return deep_find_text(data)
    except Exception:
        return None

@app.post("/api/gemini")
def ask_gemini(req: GeminiRequest):
    if not GEMINI_API_KEY or GEMINI_API_KEY == "AIzaSyDXZIYnTZ2iXlWS8mlwgjSY0mWO3leRRIU":
        return {"success": False, "error": "GEMINI_API_KEY missing or invalid on server"}

    try:
        model_name, method = pick_generation_model()
    except Exception as e:
        return {"success": False, "error": "model selection failed", "details": str(e)}

    model_short = model_name.split("/")[-1]
    endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_short}:generateContent?key={GEMINI_API_KEY}"

    payload = {
        "contents": [
            {
                "parts": [
                    {"text": req.prompt}
                ]
            }
        ]
    }

    try:
        resp = requests.post(endpoint, json=payload, timeout=25)
    except requests.exceptions.RequestException as e:
        tb = traceback.format_exc()
        print("HTTP request exception:", str(e))
        print(tb)
        return {"success": False, "error": "HTTP error contacting Gemini", "details": str(e)}

    status = resp.status_code
    body = resp.text or ""

    # Non-200: try return helpful info
    if status != 200:
        try:
            err = resp.json()
        except Exception:
            err = body[:2000]
        return {"success": False, "error": "Model endpoint returned non-200", "status": status, "body": err}

    try:
        data = resp.json()
    except Exception:
        return {"success": False, "error": "Model returned non-JSON", "body": body[:2000]}

    # DEBUG: print truncated raw response to server console (development)
    try:
        print("\n==== RAW GEMINI RESPONSE (truncated) ====")
        print(json.dumps(data, ensure_ascii=False, indent=2)[:4000])
        print("==== END RAW RESPONSE ====\n")
    except Exception:
        pass

    text = extract_text_from_generate_content_response(data)
    if text:
        # return consistent shape expected by frontend
        return {"success": True, "text": text, "raw": data}
    else:
        return {"success": False, "error": "Could not extract text from model response", "raw": data}

# Mount root last to serve as catch-all for the website
app.mount("/", StaticFiles(directory=HOME_DIR, html=True), name="home")
