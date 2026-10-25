# ClearCut — Python Background Remover Website

A responsive Flask website that removes image backgrounds using `rembg` and returns a transparent PNG.

## Requirements
- Python 3.10–3.12 recommended
- Internet connection for the first setup/model download
- Around 2–4 GB free RAM is recommended for local AI processing

## Windows setup (PowerShell)

1. Extract this ZIP.
2. Open PowerShell inside the extracted `background_remover_website` folder.
3. Create a virtual environment:

   ```powershell
   py -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

   If script execution is blocked in PowerShell, use Command Prompt instead:
   ```bat
   .venv\Scripts\activate.bat
   ```

4. Install dependencies:

   ```powershell
   python -m pip install --upgrade pip
   pip install -r requirements.txt
   ```

5. Start the website:

   ```powershell
   python app.py
   ```

6. Open `http://127.0.0.1:5000` in your browser.

## Linux Mint / Ubuntu setup

```bash
cd background_remover_website
python3 -m venv .venv
source .venv/bin/activate
python -m pip install --upgrade pip
pip install -r requirements.txt
python app.py
```

Then open `http://127.0.0.1:5000`.

## Notes
- Supported formats: PNG, JPG/JPEG, WEBP.
- Maximum upload size: 15 MB.
- The first background-removal run may take longer because the AI model may need to download.
- This is a local development server. Do not expose it publicly as-is; use production hosting and add appropriate security controls before deployment.
