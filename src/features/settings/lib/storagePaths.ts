export function imageExtension(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]+$/.test(fromName)) return fromName;

  const fromMime = file.type.split("/").pop()?.toLowerCase();
  return fromMime && /^[a-z0-9]+$/.test(fromMime) ? fromMime : "jpg";
}

export function publicStoragePath(publicUrl: string | null | undefined, bucket: string): string | null {
  if (!publicUrl) return null;

  try {
    const url = new URL(publicUrl);
    const marker = `/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    const marker = `/object/public/${bucket}/`;
    const [withoutQuery] = publicUrl.split("?");
    const index = withoutQuery.indexOf(marker);
    if (index === -1) return null;
    return decodeURIComponent(withoutQuery.slice(index + marker.length));
  }
}
