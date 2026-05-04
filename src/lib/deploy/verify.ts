export async function verifySubmitEndpoint(
  submitUrl: string,
  timeoutMs = 60000,
): Promise<{ ok: boolean; error?: string }> {
  const start = Date.now();
  let lastError = 'timeout';
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(submitUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          name: '__healthcheck__',
          email: 'healthcheck@anform.local',
          phone: '0',
          klass: '',
          sessions: [],
          sessionIds: [],
          formSlug: '',
          meta: { __healthcheck: true },
        }),
        signal: AbortSignal.timeout(8000),
        cache: 'no-store',
      });
      const ct = res.headers.get('content-type') ?? '';
      if (!ct.includes('application/json')) {
        lastError = `non-json response (status ${res.status}, content-type ${ct})`;
      } else {
        const body = (await res.json()) as { ok?: boolean; error?: string };
        if (body.ok) return { ok: true };
        lastError = `endpoint returned ok=false (${body.error ?? 'unknown'})`;
      }
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return { ok: false, error: lastError };
}

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
