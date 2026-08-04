import os
from supabase import create_client

url = os.environ.get("VITE_SUPABASE_URL")
key = os.environ.get("VITE_SUPABASE_ANON_KEY")

if not url or not key:
    print("Missing Supabase env vars")
    exit(1)

supabase = create_client(url, key)
response = supabase.storage.list_buckets()
print(response)
