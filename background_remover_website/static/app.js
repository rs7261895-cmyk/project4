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
let selectedFile = null;
let originalUrl = null;
let resultUrl = null;

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.remove('hidden');
}
function clearError() {
  errorMessage.textContent = '';
  errorMessage.classList.add('hidden');
}
function formatSize(bytes) {
  return bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(0)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
function chooseFile(file) {
  clearError();
  if (!file) return;
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
    showError('Please choose a PNG, JPG, JPEG, or WEBP image.');
    return;
  }
  if (file.size > 15 * 1024 * 1024) {
    showError('This image is larger than 15 MB. Please choose a smaller file.');
    return;
  }
  selectedFile = file;
  if (originalUrl) URL.revokeObjectURL(originalUrl);
  originalUrl = URL.createObjectURL(file);
  sourcePreview.src = originalUrl;
  fileName.textContent = file.name;
  fileSize.textContent = formatSize(file.size);
  dropzone.classList.add('hidden');
  resultPanel.classList.add('hidden');
  previewPanel.classList.remove('hidden');
  progressPanel.classList.add('hidden');
}
document.getElementById('chooseBtn').addEventListener('click', () => fileInput.click());
document.getElementById('browseBtn').addEventListener('click', () => fileInput.click());
document.getElementById('changeBtn').addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', e => chooseFile(e.target.files[0]));

['dragenter', 'dragover'].forEach(eventName => dropzone.addEventListener(eventName, e => {
  e.preventDefault(); dropzone.classList.add('dragover');
}));
['dragleave', 'drop'].forEach(eventName => dropzone.addEventListener(eventName, e => {
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
  formData.append('image', selectedFile);
  try {
    const response = await fetch('/remove-background', { method: 'POST', body: formData });
    if (!response.ok) {
      let message = 'Something went wrong. Please try again.';
      try { message = (await response.json()).error || message; } catch (_) {}
      throw new Error(message);
    }
    const blob = await response.blob();
    if (resultUrl) URL.revokeObjectURL(resultUrl);
    resultUrl = URL.createObjectURL(blob);
    document.getElementById('originalResult').src = originalUrl;
    document.getElementById('resultImage').src = resultUrl;
    progressPanel.classList.add('hidden');
    resultPanel.classList.remove('hidden');
  } catch (error) {
    progressPanel.classList.add('hidden');
    previewPanel.classList.remove('hidden');
    showError(error.message || 'Could not process this image. Please try again.');
  } finally {
    removeBtn.disabled = false;
  }
});
document.getElementById('downloadBtn').addEventListener('click', () => {
  if (!resultUrl) return;
  const link = document.createElement('a');
  link.href = resultUrl;
  link.download = 'background-removed.png';
  document.body.appendChild(link);
  link.click();
  link.remove();
});
document.getElementById('startOverBtn').addEventListener('click', () => {
  selectedFile = null;
  fileInput.value = '';
  previewPanel.classList.add('hidden');
  resultPanel.classList.add('hidden');
  progressPanel.classList.add('hidden');
  dropzone.classList.remove('hidden');
  clearError();
  if (originalUrl) URL.revokeObjectURL(originalUrl);
  if (resultUrl) URL.revokeObjectURL(resultUrl);
  originalUrl = null;
  resultUrl = null;
});
