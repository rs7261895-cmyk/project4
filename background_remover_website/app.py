from flask import Flask, render_template, request, send_file, jsonify
from rembg import remove, new_session
from PIL import Image
from io import BytesIO
import os

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 15 * 1024 * 1024  # 15 MB upload limit
ALLOWED_EXTENSIONS = {"png", "jpg", "jpeg", "webp"}
session = None

def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

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

    try:
        input_bytes = file.read()
        if not input_bytes:
            return jsonify({"error": "The selected file is empty."}), 400

        # rembg returns PNG bytes with transparency.
        output_bytes = remove(input_bytes)
        output_image = Image.open(BytesIO(output_bytes)).convert("RGBA")
        output = BytesIO()
        output_image.save(output, format="PNG", optimize=True)
        output.seek(0)

        return send_file(
            output,
            mimetype="image/png",
            as_attachment=False,
            download_name="background-removed.png"
        )
    except Exception as exc:
        app.logger.exception("Background removal failed")
        return jsonify({"error": "Could not process this image. Try another image or a smaller file."}), 500

if __name__ == "__main__":
    app.run(debug=True)
