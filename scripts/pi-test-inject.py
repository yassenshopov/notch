#!/usr/bin/env python3
import json
import urllib.request

payload = {
    "playing": True,
    "track": "Test Track",
    "artist": "Test Artist",
    "album": "Test Album",
    "duration_ms": 180000,
    "progress_ms": 5000,
}
req = urllib.request.Request(
    "http://127.0.0.1:8/api/now-playing/inject",
    data=json.dumps(payload).encode(),
    headers={"Content-Type": "application/json"},
    method="POST",
)
print("inject", urllib.request.urlopen(req).read().decode())
print("read", urllib.request.urlopen("http://127.0.0.1:8/api/now-playing").read().decode())
