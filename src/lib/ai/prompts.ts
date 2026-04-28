import type { FormBrief } from '@/types/form-brief';

export const HTML_PLACEHOLDER_APPS_SCRIPT = '__APPS_SCRIPT_URL__';
export const HTML_PLACEHOLDER_FORM_SLUG = '__FORM_SLUG__';

export const SYSTEM_PROMPT = `Bạn là senior frontend engineer + product designer chuyên tạo form đăng ký mobile-first cho cộng đồng học viên Việt Nam.

NHIỆM VỤ:
Trả về DUY NHẤT một file HTML hoàn chỉnh, self-contained (không link CSS/JS bên ngoài trừ Google Fonts).
KHÔNG thêm văn bản giải thích trước/sau. KHÔNG markdown code fence. Chỉ HTML thuần.

YÊU CẦU KỸ THUẬT:
1. Mobile-first, responsive, font Be Vietnam Pro qua Google Fonts.
2. CHỐNG ZOOM trên mobile:
   - viewport: width=device-width, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0, user-scalable=no
   - JS chặn gesturestart, gesturechange, double-tap touchend
   - input/textarea/select font-size: 16px (chống iOS zoom-in khi focus)
3. Tất cả input phải có placeholder và label rõ ràng.
4. Submit POST tới placeholder ${HTML_PLACEHOLDER_APPS_SCRIPT} với Content-Type: text/plain (tránh CORS preflight với Apps Script).
5. Body submit là JSON.stringify({ timestamp, name, email, phone, klass, sessions, sessionIds, formSlug: '${HTML_PLACEHOLDER_FORM_SLUG}', meta }).
6. Hiển thị trang "Đã ghi nhận" sau khi submit (DOM swap, không reload).
7. Validate trước khi submit: bắt buộc các field theo settings, ít nhất 1 buổi nếu sessions.length > 0.
8. Embed danh sách database (nếu có) vào const DB = [...] trong <script> để autocomplete khi user gõ email/tên.
9. Không inline base64 image quá lớn — nếu brief.branding.bannerImage có URL http(s), dùng <img src=...>.
10. Code clean, có comment ngắn gọn các section. KHÔNG dùng React/Vue/framework — chỉ vanilla JS.
11. KHÔNG mở Apps Script trong window.open — submit form bằng fetch.

CẤU TRÚC:
- <header> với title + subtitle + organizer
- <section id="sessions"> nếu sessions.length > 0: cho phép tick chọn (1 hoặc nhiều theo settings.multiSession)
- <section id="register">: name (required), email/phone tuỳ settings, commitment checkbox tuỳ settings, nút "Đăng ký"
- <section id="success" hidden>: success headline + message, có thể auto redirect tới settings.redirectUrl sau 3s

THIẾT KẾ:
- Forest #{branding.primary} cho header & nút primary
- Honey #{branding.secondary} cho accent (badges, hover)
- Background #{branding.background}
- Border-radius mềm 12-16px, padding rộng rãi, max-width 640px center.
- Button submit: full-width, height 56px, font weight 600.
`;

export function buildUserPrompt(brief: FormBrief, slug: string): string {
  // Compact JSON to fit in context
  const ctx = {
    title: brief.title,
    subtitle: brief.subtitle ?? '',
    description: brief.description ?? '',
    organizer: brief.organizerName ?? '',
    branding: brief.branding,
    settings: brief.settings,
    sessions: brief.sessions.map((s) => ({
      id: s.id,
      title: s.title,
      date: s.date,
      time: s.time,
      speaker: s.speaker ?? '',
      location: s.location ?? '',
    })),
    databaseSize: brief.database.length,
    databaseSample: brief.database.slice(0, 200), // cap embedded list size
  };

  return `BRIEF:\n${JSON.stringify(ctx, null, 2)}\n\nFORM_SLUG: ${slug}\n\nTrả về HTML hoàn chỉnh duy nhất, bắt đầu bằng <!DOCTYPE html>.`;
}

// Strip markdown fences if Claude wraps response.
export function extractHtml(raw: string): string {
  let s = raw.trim();
  // Remove ```html ... ``` or ``` ... ```
  s = s.replace(/^```(?:html)?\s*/i, '').replace(/\s*```$/, '');
  s = s.trim();
  if (!s.toLowerCase().startsWith('<!doctype html')) {
    // Try to find <!DOCTYPE in the text
    const idx = s.toLowerCase().indexOf('<!doctype html');
    if (idx > 0) s = s.slice(idx);
  }
  return s;
}
