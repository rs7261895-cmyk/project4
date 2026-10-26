const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const previewPanel = document.getElementById('previewPanel');
const resultPanel = document.getElementById('resultPanel');
const progressPanel = document.getElementById('progressPanel');
const errorMessage = document.getElementById('errorMessage');
const sourcePreview = document.getElementById('sourcePreview');
const fileName = document.getElementById('fileName');
const fileSize = document.getElementById('fileSize');
const removeBtn = document.getElementById('removeBtn');
let selectedFile = null, originalUrl = null, resultUrl = null;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}
function clearError() {
  errorMessage.textContent = '';
  errorMessage.classList.add('hidden');
}
function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function releaseUrl(url) { if (url) URL.revokeObjectURL(url); }
function chooseFile(file) {
  clearError();
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    showError('Please choose a PNG, JPG, JPEG, or WEBP image.'); fileInput.value = ''; return;
  }
  if (file.size > 12 * 1024 * 1024) {
    showError('This image is over 12 MB. Please choose a smaller image.'); fileInput.value = ''; return;
  }
  if (!file.size) { showError('This file is empty. Choose another image.'); return; }
  selectedFile = file;
  releaseUrl(originalUrl); releaseUrl(resultUrl); resultUrl = null;
  originalUrl = URL.createObjectURL(file);
  sourcePreview.src = originalUrl;
  fileName.textContent = file.name;
  fileSize.textContent = formatSize(file.size);
  dropzone.classList.add('hidden');
  resultPanel.classList.add('hidden');
  progressPanel.classList.add('hidden');
  previewPanel.classList.remove('hidden');
}
document.getElementById('chooseBtn').addEventListener('click', () => fileInput.click());
document.getElementById('changeBtn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => chooseFile(e.target.files[0]));
['dragenter', 'dragover'].forEach(name => dropzone.addEventListener(name, e => {
  e.preventDefault(); dropzone.classList.add('dragover');
}));
['dragleave', 'drop'].forEach(name => dropzone.addEventListener(name, e => {
  e.preventDefault(); dropzone.classList.remove('dragover');
}));
dropzone.addEventListener('drop', e => chooseFile(e.dataTransfer.files[0]));

removeBtn.addEventListener('click', async () => {
  if (!selectedFile) return;
  clearError();
  previewPanel.classList.add('hidden');
  resultPanel.classList.add('hidden');
  progressPanel.classList.remove('hidden');
  removeBtn.disabled = true;
  const formData = new FormData();
  formData.append('image', selectedFile, selectedFile.name);
  try {
    const response = await fetch('/remove-background', { method: 'POST', body: formData });
    const contentType = (response.headers.get('content-type') || '').toLowerCase();
    if (!response.ok) {
      let message = `The server returned an error (${response.status}).`;
      if (contentType.includes('application/json')) {
        const data = await response.json();
        if (data && data.error) message = data.error;
      } else if (response.status >= 500) {
        message = 'The image server failed. Check your hosting logs; the service may need more memory or the AI model may still be downloading.';
      }
      throw new Error(message);
    }
    if (!contentType.includes('image/png')) {
      throw new Error('The server did not return a PNG image. Please check the server logs and try again.');
    }
    const blob = await response.blob();
    if (!blob.size) throw new Error('The server returned an empty image. Please try again.');
    releaseUrl(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    document.getElementById('originalResult').src = originalUrl;
    document.getElementById('resultImage').src = resultUrl;
    progressPanel.classList.add('hidden');
    resultPanel.classList.remove('hidden');
  } catch (error) {
    progressPanel.classList.add('hidden');
    previewPanel.classList.remove('hidden');
    showError(error.name === 'TypeError'
      ? 'Could not reach the image server. Check your internet connection and confirm the website is deployed and running.'
      : (error.message || 'Could not process this image. Please try again.'));
  } finally {
    removeBtn.disabled = false;
  }
});
document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!resultUrl) return;
  const link = document.createElement('a');
  link.href = resultUrl; link.download = 'clearcut-transparent.png';
  document.body.appendChild(link); link.click(); link.remove();
});
document.getElementById('startOverBtn').addEventListener('click', () => {
  selectedFile = null; fileInput.value = '';
  previewPanel.classList.add('hidden'); resultPanel.classList.add('hidden');
  progressPanel.classList.add('hidden'); dropzone.classList.remove('hidden');
  clearError(); releaseUrl(originalUrl); releaseUrl(resultUrl);
  originalUrl = null; resultUrl = null;
});
window.addEventListener('beforeunload', () => { releaseUrl(originalUrl); releaseUrl(resultUrl); });
