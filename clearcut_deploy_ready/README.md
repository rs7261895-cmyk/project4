# ClearCut Studio — deploy-ready background remover

A responsive Flask website that removes image backgrounds with `rembg` and returns transparent PNGs. This package is prepared for **Render Web Service** deployment.

> **Important:** Do not deploy this full Flask/ONNX project as a Vercel static site. Vercel functions have request-size and runtime/package constraints that make this AI backend unreliable. For a dependable first deployment, deploy the whole app to Render. Your website and image-processing endpoint will share one URL, so no separate API URL or CORS setup is required.

## Deploy with Render Blueprint (recommended)

1. Extract this ZIP. The files `app.py`, `requirements.txt`, `render.yaml`, `templates/`, and `static/` must be at the repository root.
2. Push these files to a GitHub repository. Do not upload the ZIP file itself.
3. Open <https://dashboard.render.com/>, choose **New + → Blueprint**, and connect the repository. Render reads `render.yaml` and creates the service.
4. Wait for the build to finish. The build command installs dependencies and downloads the lightweight `u2netp` model in advance to reduce first-upload failures.
5. Open the service URL and visit `/health`. It should return JSON with `"status": "ok"`.
6. Upload a small JPG or PNG first. Then test a larger image.

The included Render configuration uses a paid Starter web service and a single Gunicorn worker to reduce memory pressure. Model download requires outbound internet during the build. If that download fails, inspect the first error in the build logs before retrying.

## Local run (Windows PowerShell)

```powershell
py -3.11 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
$env:U2NET_HOME = ".u2net"
python -c "from rembg import new_session; new_session('u2netp')"
python app.py
```

Open <http://127.0.0.1:10000>.

## Local run (Linux/macOS)

```bash
python3.11 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
export U2NET_HOME=.u2net
python -c "from rembg import new_session; new_session('u2netp')"
python app.py
```

## Useful settings

- `REMBG_MODEL=u2netp` — lighter model selected by default.
- `MAX_IMAGE_EDGE=1280` — resize long image edges before inference to reduce memory usage.
- `MAX_UPLOAD_MB=12` — request upload limit.
- `U2NET_HOME=.u2net` — model cache directory.

## Troubleshooting

- **Build fails while downloading model:** open the full Render build log and check whether the model host is reachable. Do not hide or ignore the first package/model error.
- **`/health` works but upload returns 500:** open Render → service → Logs and inspect the traceback from `Background removal failed`.
- **Memory errors:** use a service with more RAM or lower `MAX_IMAGE_EDGE` to `900` in environment variables.
- **413 response:** reduce the image size below 12 MB.
- **Model/runtime errors:** redeploy only after resolving the exact dependency or download error in the logs.

## Notes

- `/health` confirms the Flask process is alive; it does not itself run an inference test.
- The first successful image test is the real end-to-end check.
- No API keys are required. Uploaded images are processed in memory by this app; the app does not intentionally save uploaded originals to disk.
