/**
 * Crop a photo to a centered square and shrink it (default 400×400 JPEG).
 * Keeps uploads tiny (~20–40 KB) so they're quick on mobile data.
 */
export async function squarePhoto(file, size = 400, quality = 0.82) {
  const img = await loadImage(file);
  const w = img.width, h = img.height;
  const s = Math.min(w, h);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = Math.min(size, s);
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, (w - s) / 2, (h - s) / 2, s, s, 0, 0, canvas.width, canvas.height);
  img.close?.();
  const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', quality));
  if (!blob) throw new Error('Could not read this photo');
  return blob;
}

async function loadImage(file) {
  if ('createImageBitmap' in window) {
    try {
      return await createImageBitmap(file, { imageOrientation: 'from-image' });
    } catch { /* fall back below */ }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  } finally {
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
}
