import os
import requests
import json

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

headers = {
    "apikey": key,
    "Authorization": f"Bearer {key}"
}

try:
    response = requests.get(f"{url}/storage/v1/bucket", headers=headers)
    if response.status_code == 200:
        buckets = response.json()
        print("Buckets found:")
        for b in buckets:
            print(f"- {b['id']} (Public: {b['public']})")
    else:
        print(f"Error listing buckets: {response.status_code} {response.text}")
except Exception as e:
    print(f"Error: {e}")

