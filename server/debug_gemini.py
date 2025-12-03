import os
import requests
from dotenv import load_dotenv

load_dotenv()
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

print(f"Key: {GEMINI_API_KEY}")

if not GEMINI_API_KEY:
    print("No key found!")
    exit(1)

url = f"https://generativelanguage.googleapis.com/v1/models?key={GEMINI_API_KEY}"
print(f"Requesting {url}...")
try:
    r = requests.get(url, timeout=15)
    print(f"Status: {r.status_code}")
    print(f"Body: {r.text}")
except Exception as e:
    print(f"Error: {e}")
