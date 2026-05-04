// Phase 8.7: Cover-image analysis (Claude Sonnet 4.6 vision).
//
// Strategy:
// - Single Anthropic call per image URL with a long, fully-deterministic system
//   prompt → eligible for prompt caching (Sonnet 4.6 minimum cacheable prefix is
//   2048 tokens; the system prompt below is ~2.4K tokens to stay above that).
// - JSON-only output with strict schema validation; markdown fences stripped.
// - In-memory LRU cache keyed by image URL (1h TTL) so repeat generates skip
//   the API entirely.
// - Light retry via the shared withRetry helper.

import { getAnthropic } from '@/lib/ai/anthropic';
import { withRetry } from '@/lib/utils/retry';

export type CoverMood = 'warm' | 'cool' | 'neutral' | 'dark' | 'light' | 'vibrant';
export type CoverStyle = 'photo' | 'illustration' | 'abstract' | 'minimal' | 'gradient';
export type CoverSubject =
  | 'people'
  | 'object'
  | 'landscape'
  | 'text'
  | 'abstract'
  | 'product';
export type CoverTone =
  | 'corporate'
  | 'playful'
  | 'editorial'
  | 'minimal'
  | 'luxurious';
export type ContrastZone = 'dark' | 'light' | 'mixed';

export interface CoverAnalysis {
  dominant_colors: string[]; // 5 hex strings
  mood: CoverMood;
  style: CoverStyle;
  subject: CoverSubject;
  suggested_text_color: 'white' | 'black' | 'auto';
  contrast_zones: { top: ContrastZone; center: ContrastZone; bottom: ContrastZone };
  suggested_tone: CoverTone;
  has_text_in_image: boolean;
  primary_orientation: 'landscape' | 'portrait' | 'square';
}

export interface FormPalette {
  primary: string;
  secondary: string;
  accent: string;
  bg_main: string;
  bg_tint: string;
  text_main: string;
  text_muted: string;
  contrast_mode: 'light' | 'dark';
}

const SYSTEM_PROMPT = `Bạn là color & design intelligence cho ANFORM — một sản phẩm tạo form đăng ký mobile-first cho cộng đồng giáo dục An Giáo, Việt Nam. Nhiệm vụ duy nhất của bạn trong cuộc trò chuyện này là: phân tích MỘT bức ảnh người dùng cung cấp (sẽ là cover/poster/hero của một form đăng ký) và trả về dữ liệu mô tả ảnh đó dưới dạng JSON nghiêm ngặt để hệ thống downstream dùng để build palette + chọn typography + bố trí hero section sao cho form trông đồng bộ với ảnh.

QUY TẮC OUTPUT (BẮT BUỘC):
- Chỉ trả về một JSON object duy nhất. Không markdown, không code fence, không text giải thích trước/sau.
- Mọi trường trong schema bên dưới đều bắt buộc; không thêm trường lạ.
- Nếu không chắc về một trường, vẫn phải đoán giá trị hợp lý nhất từ enum cho sẵn — không trả về null/undefined/empty cho trường enum.
- Mỗi giá trị màu hex viết dạng 7 ký tự "#RRGGBB" lowercase, không alpha.

SCHEMA:
{
  "dominant_colors": ["#hex", "#hex", "#hex", "#hex", "#hex"],
  "mood": "warm" | "cool" | "neutral" | "dark" | "light" | "vibrant",
  "style": "photo" | "illustration" | "abstract" | "minimal" | "gradient",
  "subject": "people" | "object" | "landscape" | "text" | "abstract" | "product",
  "suggested_text_color": "white" | "black" | "auto",
  "contrast_zones": {
    "top": "dark" | "light" | "mixed",
    "center": "dark" | "light" | "mixed",
    "bottom": "dark" | "light" | "mixed"
  },
  "suggested_tone": "corporate" | "playful" | "editorial" | "minimal" | "luxurious",
  "has_text_in_image": true | false,
  "primary_orientation": "landscape" | "portrait" | "square"
}

HƯỚNG DẪN PHÂN TÍCH TỪNG TRƯỜNG:

dominant_colors — đúng 5 màu, sắp xếp theo độ ÁP ĐẢO + độ TƯƠI/đặc trưng (saturation cao hoặc lặp lại nhiều). Bỏ qua các màu trung tính không đặc trưng (xám, trắng tinh, đen tinh) trừ khi đó CHÍNH là tinh thần của ảnh. Nếu ảnh chỉ có 2-3 tông, vẫn bịa thêm các sắc thái lân cận để đủ 5 (ví dụ ảnh xanh forest → thêm 1 sắc xanh nhạt hơn + 1 sắc xanh đậm hơn). Ưu tiên màu mà nếu lấy làm primary của một button/badge sẽ trông đẹp + readable.

mood — cảm giác chủ đạo:
- "warm": vàng, cam, đỏ, hồng đào, nâu ấm chiếm ưu thế
- "cool": xanh dương, xanh lá, tím, xám lạnh chiếm ưu thế
- "neutral": cân bằng warm/cool, hoặc tông be/nâu nhạt/xám trung tính
- "dark": chủ đạo tối (trên 60% diện tích < 30% lightness), thường là ảnh ban đêm/tối/moody
- "light": chủ đạo sáng (trên 60% diện tích > 70% lightness), airy/bright
- "vibrant": màu sắc rực rỡ, độ saturation rất cao, "loud", thường là illustration/poster

style — kỹ thuật/medium của ảnh:
- "photo": ảnh chụp thật (người, đồ vật, phong cảnh thật)
- "illustration": vẽ tay/digital illustration với line/shape rõ
- "abstract": hình khối/texture không đại diện cho vật cụ thể
- "minimal": rất ít element, nhiều khoảng trắng, design-y
- "gradient": ảnh chủ yếu là gradient màu (ít subject)

subject — chủ thể chính:
- "people": có người (1 hoặc nhiều), khuôn mặt/dáng người là focus
- "object": đồ vật cụ thể (sản phẩm, sách, ly cà phê, etc.)
- "landscape": phong cảnh thiên nhiên hoặc kiến trúc rộng
- "text": ảnh chủ yếu là text/typography (poster có chữ to, slide có chữ)
- "abstract": không có subject cụ thể
- "product": sản phẩm thương mại được trưng bày có chủ đích (khác "object" — "product" là khi rõ ràng đây là ảnh marketing)

suggested_text_color — nếu phải overlay text TRỰC TIẾP lên ảnh ở zone trung tâm, màu nào readable nhất?
- "white": ảnh trung tâm đa số tối → chữ trắng
- "black": ảnh trung tâm đa số sáng → chữ đen
- "auto": ảnh quá phức tạp/mixed → caller cần dùng overlay scrim

contrast_zones — chia ảnh làm 3 dải ngang (top 1/3, center 1/3, bottom 1/3) và cho biết mỗi dải sáng hay tối:
- "dark": dải đó đa số tối, text trắng đặt vào sẽ readable
- "light": dải đó đa số sáng, text đen sẽ readable
- "mixed": dải đó vừa sáng vừa tối hoặc trung bình — không zone nào dễ cho overlay text

suggested_tone — gợi ý tone of voice + visual treatment cho form:
- "corporate": chuyên nghiệp, sạch, trustable (xanh dương + grey, sans-serif đơn giản)
- "playful": vui tươi, năng lượng cao (màu rực, bo tròn nhiều, illustration-friendly)
- "editorial": phong cách tạp chí (serif heading, layout có structure, refined)
- "minimal": tối giản, nhiều whitespace (ít màu, sans-serif geometric)
- "luxurious": cao cấp (tối + accent vàng/đồng, serif elegant, generous spacing)

has_text_in_image — true nếu trong ảnh đã có text/typography rõ (tên sự kiện, tagline, logo có chữ). false nếu chỉ có hình. Nếu true, downstream sẽ KHÔNG thêm heading overlay (tránh trùng), chỉ thêm subheading nhỏ + form fields bên dưới.

primary_orientation — tỷ lệ ảnh:
- "landscape": rộng > cao (16:9, 4:3, ratio > 1.2)
- "portrait": cao > rộng (ratio < 0.8)
- "square": gần vuông (0.8 ≤ ratio ≤ 1.2)

Lưu ý quan trọng: bạn KHÔNG được trả về phân tích cảm tính dài, không khen ảnh, không xin lỗi nếu ảnh khó. Chỉ JSON.`;

// ─── Vision call ──────────────────────────────────────────

async function callVision(imageUrl: string): Promise<CoverAnalysis> {
  const client = getAnthropic();
  const res = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1500,
    system: [
      {
        type: 'text',
        text: SYSTEM_PROMPT,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'url', url: imageUrl } },
          {
            type: 'text',
            text: 'Phân tích ảnh trên theo schema. Chỉ JSON.',
          },
        ],
      },
    ],
  });

  const block = res.content[0];
  if (!block || block.type !== 'text') {
    throw new Error('Vision API returned no text block');
  }

  let raw = block.text.trim();
  // Strip ``` or ```json fences if model wraps despite instructions
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  // If there's leading prose, slice from first '{' to last '}'
  if (!raw.startsWith('{')) {
    const i = raw.indexOf('{');
    const j = raw.lastIndexOf('}');
    if (i >= 0 && j > i) raw = raw.slice(i, j + 1);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error(`Vision API returned non-JSON: ${raw.slice(0, 120)}`);
  }
  return validateAnalysis(parsed);
}

function validateAnalysis(o: unknown): CoverAnalysis {
  if (!o || typeof o !== 'object') throw new Error('analysis: not an object');
  const a = o as Record<string, unknown>;
  const colors = a.dominant_colors;
  if (!Array.isArray(colors) || colors.length < 1) {
    throw new Error('analysis.dominant_colors must be a non-empty array');
  }
  const hexColors = colors
    .filter((c): c is string => typeof c === 'string' && /^#[0-9a-f]{6}$/i.test(c.trim()))
    .map((c) => c.toLowerCase().trim());
  if (hexColors.length === 0) {
    throw new Error('analysis.dominant_colors had no valid hex strings');
  }
  // Pad to 5 if model returned fewer
  while (hexColors.length < 5) hexColors.push(hexColors[hexColors.length - 1]);

  const cz = (a.contrast_zones ?? {}) as Record<string, unknown>;
  return {
    dominant_colors: hexColors.slice(0, 5),
    mood: oneOf(a.mood, ['warm', 'cool', 'neutral', 'dark', 'light', 'vibrant'], 'neutral'),
    style: oneOf(
      a.style,
      ['photo', 'illustration', 'abstract', 'minimal', 'gradient'],
      'photo',
    ),
    subject: oneOf(
      a.subject,
      ['people', 'object', 'landscape', 'text', 'abstract', 'product'],
      'object',
    ),
    suggested_text_color: oneOf(
      a.suggested_text_color,
      ['white', 'black', 'auto'],
      'auto',
    ),
    contrast_zones: {
      top: oneOf(cz.top, ['dark', 'light', 'mixed'], 'mixed'),
      center: oneOf(cz.center, ['dark', 'light', 'mixed'], 'mixed'),
      bottom: oneOf(cz.bottom, ['dark', 'light', 'mixed'], 'mixed'),
    },
    suggested_tone: oneOf(
      a.suggested_tone,
      ['corporate', 'playful', 'editorial', 'minimal', 'luxurious'],
      'editorial',
    ),
    has_text_in_image: typeof a.has_text_in_image === 'boolean' ? a.has_text_in_image : false,
    primary_orientation: oneOf(
      a.primary_orientation,
      ['landscape', 'portrait', 'square'],
      'landscape',
    ),
  };
}

function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return typeof v === 'string' && (allowed as readonly string[]).includes(v) ? (v as T) : fallback;
}

// ─── Cache ────────────────────────────────────────────────

const TTL_MS = 60 * 60 * 1000;
const cache = new Map<string, { value: CoverAnalysis; expires: number }>();

export async function analyzeCover(imageUrl: string): Promise<CoverAnalysis> {
  if (typeof imageUrl !== 'string' || !/^https?:\/\//i.test(imageUrl)) {
    throw new Error('imageUrl must be an http(s) URL');
  }
  const now = Date.now();
  const hit = cache.get(imageUrl);
  if (hit && hit.expires > now) return hit.value;

  const analysis = await withRetry(() => callVision(imageUrl), 'analyzeCover');
  cache.set(imageUrl, { value: analysis, expires: now + TTL_MS });
  return analysis;
}

export function isCacheHit(imageUrl: string): boolean {
  const hit = cache.get(imageUrl);
  return !!hit && hit.expires > Date.now();
}

// ─── Palette derivation ───────────────────────────────────

export function paletteFromAnalysis(a: CoverAnalysis): FormPalette {
  const [primary, secondary = primary, accent = secondary, ...rest] = a.dominant_colors;
  const isDark = a.mood === 'dark' || a.contrast_zones.center === 'dark';
  const tintBase = rest[0] ?? primary;

  return {
    primary,
    secondary,
    accent,
    bg_main: isDark ? '#1a1a1a' : lighten(tintBase, 0.92),
    bg_tint: lighten(primary, 0.85),
    text_main: isDark ? '#f5f5f5' : '#1a1a1a',
    text_muted: isDark ? '#a3a3a3' : '#666666',
    contrast_mode: isDark ? 'dark' : 'light',
  };
}

function lighten(hex: string, amount: number): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const mix = (c: number) => Math.round(c + (255 - c) * Math.max(0, Math.min(1, amount)));
  return (
    '#' +
    [mix(r), mix(g), mix(b)]
      .map((v) => v.toString(16).padStart(2, '0'))
      .join('')
  );
}
