import type { FormBrief } from '@/types/form-brief';
import type { CoverAnalysis, FormPalette } from '@/lib/cover-analysis';

// Kept for backwards compatibility with previously generated HTML — the
// orchestrator now substitutes both placeholders with the ANFORM submit
// endpoint URL so old templates keep working.
export const HTML_PLACEHOLDER_APPS_SCRIPT = '__APPS_SCRIPT_URL__';
export const HTML_PLACEHOLDER_SUBMIT_URL = '__SUBMIT_URL__';
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
4. Submit POST tới placeholder ${HTML_PLACEHOLDER_SUBMIT_URL} với Content-Type: text/plain (tránh CORS preflight). Endpoint trả JSON {ok:true|false}.
5. Body submit là JSON.stringify({ timestamp, name, email, phone, klass, sessions, sessionIds, formSlug: '${HTML_PLACEHOLDER_FORM_SLUG}', meta }).
6. Hiển thị trang "Đã ghi nhận" sau khi submit (DOM swap, không reload).
7. Validate trước khi submit: bắt buộc các field theo settings, ít nhất 1 buổi nếu sessions.length > 0.
8. Embed danh sách database (nếu có) vào const DB = [...] trong <script> để autocomplete khi user gõ email/tên.
9. Không inline base64 image quá lớn — nếu brief.branding.bannerImage có URL http(s), dùng <img src=...>.
10. Code clean, có comment ngắn gọn các section. KHÔNG dùng React/Vue/framework — chỉ vanilla JS.
11. KHÔNG mở submit URL trong window.open — submit form bằng fetch.

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

export function buildUserPrompt(
  brief: FormBrief,
  slug: string,
  cover?: { palette: FormPalette; analysis: CoverAnalysis; imageUrl: string } | null,
): string {
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

  let coverBlock = '';
  if (cover) {
    const styleHint = brief.branding.coverStyle ?? 'auto';
    const styleDirective: Record<string, string> = {
      auto: 'AI tự chọn style phù hợp ảnh — ưu tiên match suggested_tone bên dưới.',
      minimal: 'Clean, nhiều khoảng trắng, sans-serif, không pattern, ít border.',
      bold: 'Typography rất lớn ở hero, contrast cao, button/badge nổi bật.',
      editorial: 'Phong cách tạp chí — heading serif, có structure, refined.',
      playful: 'Bo tròn nhiều, soft shadow, micro-interactions nhẹ, vui tươi.',
    };

    coverBlock = `

=== COVER IMAGE (BẮT BUỘC dùng) ===
URL: ${cover.imageUrl}
Style hint: ${styleHint} — ${styleDirective[styleHint] ?? styleDirective.auto}

PALETTE (BẮT BUỘC — chỉ dùng các màu này, KHÔNG tự bịa thêm màu khác):
- Primary (header bg, button chính):     ${cover.palette.primary}
- Secondary (button hover, accent phụ):  ${cover.palette.secondary}
- Accent (badges, highlights):            ${cover.palette.accent}
- Background main (body):                 ${cover.palette.bg_main}
- Background tint (cards, sections):      ${cover.palette.bg_tint}
- Text main:                              ${cover.palette.text_main}
- Text muted (helper, subtitle):          ${cover.palette.text_muted}
- Contrast mode:                          ${cover.palette.contrast_mode}

PHÂN TÍCH ẢNH (dùng để bố trí hero):
- Mood:                ${cover.analysis.mood}
- Style:               ${cover.analysis.style}
- Subject:             ${cover.analysis.subject}
- Suggested tone:      ${cover.analysis.suggested_tone}
- Top zone contrast:   ${cover.analysis.contrast_zones.top}
- Center zone:         ${cover.analysis.contrast_zones.center}
- Bottom zone:         ${cover.analysis.contrast_zones.bottom}
- Has text in image:   ${cover.analysis.has_text_in_image}
- Suggested text on image: ${cover.analysis.suggested_text_color}
- Orientation:         ${cover.analysis.primary_orientation}

YÊU CẦU HERO SECTION:
- Dùng ảnh cover làm hero: <img src="${cover.imageUrl}" alt="..."> với object-fit: cover, aspect-ratio 16/9 trên desktop, 4/5 trên mobile.
- Nếu has_text_in_image=true: KHÔNG đặt heading <h1> overlay lên ảnh (trùng nội dung). Đặt heading + form bên DƯỚI ảnh, ảnh chỉ làm visual.
- Nếu has_text_in_image=false: heading + subtitle CÓ THỂ overlay trên ảnh. Dùng suggested_text_color cho màu text. Thêm subtle gradient overlay (rgba 0,0,0,0.35 hoặc rgba 255,255,255,0.7 tuỳ mode) để text luôn readable.
- Mobile (<= 640px): nếu overlay làm khó đọc, fallback layout stack — ảnh ở trên, heading + form ở dưới với background bg_main.
- Form fields, button, badges: BẮT BUỘC dùng đúng các màu trong PALETTE phía trên.`;
  } else {
    coverBlock = `

=== KHÔNG CÓ COVER IMAGE ===
Hero section dùng pure typography:
- Heading lớn (color: branding.primary)
- Subheading (color: text muted)
- Background: branding.background
- Không bịa thêm hero image.`;
  }

  return `BRIEF:\n${JSON.stringify(ctx, null, 2)}\n\nFORM_SLUG: ${slug}${coverBlock}\n\nTrả về HTML hoàn chỉnh duy nhất, bắt đầu bằng <!DOCTYPE html>.`;
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
