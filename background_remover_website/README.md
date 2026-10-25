# ClearCut — Render-ready Python Background Remover

Flask + rembg application configured for a persistent Python web service. Vercel serverless functions are not a good fit for the roughly 474 MB dependency bundle and memory-heavy ONNX model used by `rembg`.

## Deploy on Render

1. Push this folder's contents to a GitHub repository (or use the existing repository and replace the project files).
2. In Render, choose **New + → Web Service**, connect the GitHub repository.
3. If these files are inside `background_remover_website`, set **Root Directory** to `background_remover_website`; otherwise leave it blank.
4. Runtime: Python. Build command: `pip install -r requirements.txt`.
5. Start command: `gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --threads 4 --timeout 180`.
6. Use a service with sufficient RAM for ONNX Runtime (at least 2 GB recommended). First image request may be slower because the model must download.
7. After deploy, open `/health`; it should return `{"status":"ok"}`.

## Local run

```bash
python -m pip install -r requirements.txt
python app.py
```

Supported formats: PNG, JPG/JPEG, WEBP. Maximum upload size: 15 MB.
