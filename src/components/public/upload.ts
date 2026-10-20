/** Datei per einmaligem Upload-Link hochladen (mit Fortschritt 0-100). */
export function uploadToSignedUrl(url: string, file: File, onProgress: (p: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", url);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => (xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(xhr.status === 413 ? "Datei zu gross" : "Upload fehlgeschlagen")));
    xhr.onerror = () => reject(new Error("Upload fehlgeschlagen, bitte Verbindung prüfen"));
    xhr.send(file);
  });
}

/** Ereignis an ein vorhandenes Tag-Management melden (wie bisher, ohne eigenes Tracking). */
export function track(event: string, data: Record<string, unknown> = {}) {
  const w = window as unknown as { dataLayer?: unknown[] };
  w.dataLayer = w.dataLayer ?? [];
  w.dataLayer.push({ event, ...data });
}
