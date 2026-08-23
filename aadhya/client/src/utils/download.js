export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadApiFile(api, path, filename) {
  const res = await api.get(path, { responseType: "blob" });
  downloadBlob(res.data, filename);
}
