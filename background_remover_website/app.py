from flask import Flask, render_template, request, send_file, jsonify
from PIL import Image
from io import BytesIO
from threading import Lock
import logging

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
_model_session = None
_model_lock = Lock()


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def get_model_session():
    """Load the AI model only when an image is processed, not on homepage startup."""
    global _model_session
    if _model_session is None:
        with _model_lock:
            if _model_session is None:
                from rembg import new_session
                _model_session = new_session("u2net")
    return _model_session


@app.errorhandler(413)
def file_too_large(_error):
    return jsonify({"error": "Image is too large. Please upload an image smaller than 15 MB."}), 413


@app.route("/health")
def health():
    return jsonify({"status": "ok"})


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/remove-background", methods=["POST"])
def remove_background():
    if "image" not in request.files:
        return jsonify({"error": "Please choose an image first."}), 400

    file = request.files["image"]
    if not file.filename:
        return jsonify({"error": "Please choose an image first."}), 400
    if not allowed_file(file.filename):
        return jsonify({"error": "Use a PNG, JPG, JPEG, or WEBP image."}), 400

    input_bytes = file.read()
    if not input_bytes:
        return jsonify({"error": "The selected file is empty."}), 400

    try:
        from rembg import remove
        result = remove(input_bytes, session=get_model_session())
        output_image = Image.open(BytesIO(result)).convert("RGBA")
        output = BytesIO()
        output_image.save(output, format="PNG", optimize=True)
        output.seek(0)
        return send_file(output, mimetype="image/png", as_attachment=False, download_name="background-removed.png")
    except Exception:
        app.logger.exception("Background removal failed")
        return jsonify({"error": "Background removal failed on the server. Check the service logs; the AI model may still be downloading or the server may need more memory."}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=10000)
