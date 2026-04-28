export async function verifyFormLive(slug: string, timeoutMs = 120000): Promise<boolean> {
  const base = process.env.ANFORM_FORMS_BASE_URL ?? 'https://form.anvui.edu.vn';
  const url = `${base}/${slug}/`;
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
      });
      if (res.status >= 200 && res.status < 400) {
        const txt = await res.text();
        if (txt.length > 1000 && txt.toLowerCase().includes('<!doctype html')) {
          return true;
        }
      }
    } catch {
      // ignore — keep polling
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
  return false;
}
