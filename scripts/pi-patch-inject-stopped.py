#!/usr/bin/env python3
from pathlib import Path

APP = Path("/home/pi/spotify-display/app.py")
text = APP.read_text()
old = """    track = payload.get("track")
    if not track:
        return jsonify({"error": "missing_track"}), 400"""
new = """    track = payload.get("track")
    if not track:
        if payload.get("playing") is False:
            track = ""
        else:
            return jsonify({"error": "missing_track"}), 400"""
if old in text:
    APP.write_text(text.replace(old, new, 1))
    print("patched_stopped_inject")
else:
    print("already_patched")
