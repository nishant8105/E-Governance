import requests
import json

url = "http://127.0.0.1:5000/api/gemini"
payload = {"prompt": "Hello, are you working?"}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=payload, headers=headers)
    print(f"Status Code: {response.status_code}")
    print("Response Body:")
    print(response.text)
except Exception as e:
    print(f"Error: {e}")
