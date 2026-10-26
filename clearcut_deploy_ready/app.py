"""ClearCut Studio background remover (Flask + rembg)."""
from __future__ import annotations

import logging
import os
from io import BytesIO
from pathlib import Path
from threading import Lock

from flask import Flask, jsonify, render_template, request, send_file
from PIL import Image, ImageOps, UnidentifiedImageError

APP_DIR = Path(__file__).resolve().parent
MODEL_NAME = os.getenv("REMBG_MODEL", "u2netp")
MAX_UPLOAD_MB = int(os.getenv("MAX_UPLOAD_MB", "12"))
MAX_IMAGE_EDGE = int(os.getenv("MAX_IMAGE_EDGE", "1280"))
MAX_PIXELS = int(os.getenv("MAX_IMAGE_PIXELS", "25000000"))
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = MAX_UPLOAD_MB * 1024 * 1024
logging.basicConfig(level=os.getenv("LOG_LEVEL", "INFO"))

# Avoid decompression-bomb images that can exhaust the worker's memory.
Image.MAX_IMAGE_PIXELS = MAX_PIXELS
_model_session = None
_model_lock = Lock()


def get_model_session():
    """Load the ONNX model once per worker, lazily on first request."""
    global _model_session
    if _model_session is None:
        with _model_lock:
            if _model_session is None:
                from rembg import new_session
                app.logger.info("Loading rembg model '%s'", MODEL_NAME)
                _model_session = new_session(MODEL_NAME)
                app.logger.info("rembg model is ready")
    return _model_session


@app.errorhandler(413)
def request_too_large(_error):
    return jsonify(error=f"Image is too large. Maximum upload size is {MAX_UPLOAD_MB} MB."), 413


@app.route("/health", methods=["GET"])
def health():
    # This confirms the web process is alive. The AI model loads on first upload.
    return jsonify(status="ok", service="clearcut-studio", model=MODEL_NAME)


@app.route("/", methods=["GET"])
def index():
    return render_template("index.html")


@app.route("/remove-background", methods=["POST"])
def remove_background():
    if "image" not in request.files:
        return jsonify(error="Choose an image first."), 400

    uploaded = request.files["image"]
    if not uploaded.filename:
        return jsonify(error="Choose an image first."), 400
    extension = uploaded.filename.rsplit(".", 1)[-1].lower() if "." in uploaded.filename else ""
    if extension not in ALLOWED_EXTENSIONS:
        return jsonify(error="Use a PNG, JPG, JPEG, or WEBP image."), 400

    raw = uploaded.read()
    if not raw:
        return jsonify(error="The selected file is empty."), 400

    try:
        with Image.open(BytesIO(raw)) as source:
            source.verify()
        with Image.open(BytesIO(raw)) as source:
            source = ImageOps.exif_transpose(source).convert("RGB")
            source.thumbnail((MAX_IMAGE_EDGE, MAX_IMAGE_EDGE), Image.Resampling.LANCZOS)
            normalized = BytesIO()
            source.save(normalized, format="PNG", optimize=True)
            input_bytes = normalized.getvalue()
    except Image.DecompressionBombError:
        return jsonify(error="This image has too many pixels. Resize it and try again."), 400
    except (UnidentifiedImageError, OSError, ValueError):
        return jsonify(error="This file is not a valid image. Export it as JPG or PNG and try again."), 400

    try:
        from rembg import remove
        session = get_model_session()
        result = remove(input_bytes, session=session)
        with Image.open(BytesIO(result)) as processed:
            output_image = processed.convert("RGBA")
            output = BytesIO()
            output_image.save(output, format="PNG", optimize=True)
        output.seek(0)
        return send_file(
            output,
            mimetype="image/png",
            as_attachment=False,
            download_name="clearcut-transparent.png",
            max_age=0,
        )
    except Exception as exc:  # Full traceback is logged server-side.
        app.logger.exception("Background removal failed")
        detail = str(exc).lower()
        if any(term in detail for term in ("memory", "out of memory", "killed")):
            message = "The AI server ran out of memory. Try a smaller image or use a service with more RAM."
        elif any(term in detail for term in ("connect", "download", "url", "certificate")):
            message = "The AI model could not download. Check the service logs and outbound internet access, then retry."
        elif "onnx" in detail or "runtime" in detail:
            message = "The AI runtime failed to start. Check the deployment logs for the ONNX Runtime error."
        else:
            message = "Background removal failed on the server. Open the service logs and check the error details."
        return jsonify(error=message), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", "10000")))
