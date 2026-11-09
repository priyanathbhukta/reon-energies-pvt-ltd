/**
 * Universal PDF downloader that guarantees the file is saved directly
 * to device storage / File Explorer / Downloads folder on both desktop and mobile devices.
 */
export async function downloadPdfFile(url: string, filename: string = 'document.pdf') {
  if (!url) {
    alert('PDF download URL is not available.');
    return;
  }

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  try {
    // 1. Fetch file as binary blob
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const blob = await res.blob();

    // 2. If modern showSaveFilePicker API is supported (Desktop Chromium), use it
    if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
      try {
        const handle = await (window as any).showSaveFilePicker({
          suggestedName: cleanFilename,
          types: [{
            description: 'PDF Document',
            accept: { 'application/pdf': ['.pdf'] },
          }],
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch (pickerErr: any) {
        if (pickerErr.name === 'AbortError') return;
      }
    }

    // 3. Create a local blob: URL (Same-Origin - guaranteed to trigger download on Android/iOS/Desktop)
    const blobUrl = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = blobUrl;
    a.download = cleanFilename;
    document.body.appendChild(a);
    a.click();

    setTimeout(() => {
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);
    }, 2000);

  } catch (err) {
    console.warn('Direct blob download failed, falling back to window download link:', err);
    const downloadUrl = `${url}${url.includes('?') ? '&' : '?'}download=true`;
    const fallbackLink = document.createElement('a');
    fallbackLink.href = downloadUrl;
    fallbackLink.download = cleanFilename;
    fallbackLink.target = '_blank';
    document.body.appendChild(fallbackLink);
    fallbackLink.click();
    setTimeout(() => document.body.removeChild(fallbackLink), 1000);
  }
}
