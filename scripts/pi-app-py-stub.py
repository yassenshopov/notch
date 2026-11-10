"""Load legacy spotify-display bytecode; patch modes 1-9, / page, and now-playing mode field."""
from __future__ import annotations

import importlib.machinery
import importlib.util
import os
import shutil
from pathlib import Path

from flask import jsonify, request, send_from_directory

ROOT = Path(__file__).resolve().parent
cache = ROOT / "__pycache__"
pyc = cache / "app.cpython-311.pyc"
MODE_FILE = ROOT / ".mode"


def _sync_sidecars() -> None:
    if not pyc.is_file():
        raise SystemExit(f"missing bytecode: {pyc}")
    cache.mkdir(parents=True, exist_ok=True)
    for name in (".tokens.json", ".mode"):
        src = ROOT / name
        dst = cache / name
        if src.is_file():
            shutil.copy2(src, dst)
    for html in ROOT.glob("*.html"):
        dst = cache / html.name
        if not dst.exists():
            try:
                os.symlink(html, dst)
            except OSError:
                shutil.copy2(html, dst)


def _read_mode() -> int:
    try:
        m = int(MODE_FILE.read_text().strip())
        return m if 1 <= m <= 9 else 1
    except (OSError, ValueError):
        return 1


def _write_mode(mode: int) -> int:
    m = int(mode)
    if not (1 <= m <= 9):
        raise ValueError("invalid_mode")
    MODE_FILE.write_text(f"{m}\n")
    shutil.copy2(MODE_FILE, cache / ".mode")
    return m


def _load_legacy_app():
    _sync_sidecars()
    loader = importlib.machinery.SourcelessFileLoader("spotify_display_legacy", str(pyc))
    spec = importlib.util.spec_from_loader("spotify_display_legacy", loader)
    if spec is None or spec.loader is None:
        raise SystemExit("failed to load legacy spec")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod.app, mod


app, legacy = _load_legacy_app()


def index_for_mode():
    m = _read_mode()
    page = "index.html" if m == 1 else f"mode{m}.html"
    return send_from_directory(str(ROOT), page)


def mode_endpoint():
    if request.method == "POST":
        raw = request.args.get("set")
        if raw is None:
            return jsonify({"error": "missing set"}), 400
        try:
            m = _write_mode(int(raw))
        except ValueError:
            return jsonify({"error": "invalid_mode", "detail": "use 1-9"}), 400
        legacy.current_mode["mode"] = m
        return jsonify({"mode": m, "switched": True})
    m = _read_mode()
    legacy.current_mode["mode"] = m
    return jsonify({"mode": m})


_orig_now_playing = app.view_functions.get("now_playing")


def now_playing_with_mode():
    m = _read_mode()
    legacy.current_mode["mode"] = m
    if _orig_now_playing is None:
        return jsonify({"playing": False, "mode": m})
    resp = _orig_now_playing()
    try:
        if hasattr(resp, "get_json"):
            data = resp.get_json(silent=True)
            if isinstance(data, dict):
                data["mode"] = m
                return jsonify(data), resp.status_code
    except Exception:
        pass
    return resp


app.view_functions["index"] = index_for_mode
if "mode_endpoint" in app.view_functions:
    app.view_functions["mode_endpoint"] = mode_endpoint
else:
    app.add_url_rule("/api/mode", view_func=mode_endpoint, methods=["GET", "POST"])

if _orig_now_playing is not None:
    app.view_functions["now_playing"] = now_playing_with_mode

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8)
