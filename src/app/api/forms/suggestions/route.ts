import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { quickComplete } from '@/lib/ai/anthropic';

const schema = z.object({
  context: z.string().min(1, 'Cần mô tả chương trình'),
  kind: z.enum(['headlines', 'thank_you', 'commitment']).default('headlines'),
});

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  }

  const promptByKind: Record<string, string> = {
    headlines: `Đề xuất 3 headline TIẾNG VIỆT ngắn gọn (≤60 ký tự) cho form đăng ký. Mỗi headline trên 1 dòng, không số thứ tự, không markdown.\n\nMô tả chương trình:\n${parsed.data.context}`,
    thank_you: `Viết 3 đoạn cảm ơn (≤2 câu, ấm áp, tiếng Việt) cho trang "Đã ghi nhận". Mỗi đoạn 1 dòng, không số thứ tự, không markdown.\n\nMô tả:\n${parsed.data.context}`,
    commitment: `Viết 3 cam kết ngắn (≤80 ký tự, ngôi thứ nhất, lịch sự) để học viên tick. Mỗi cam kết 1 dòng, không số thứ tự.\n\nMô tả:\n${parsed.data.context}`,
  };

  try {
    const text = await quickComplete({
      system: 'Bạn là copywriter tiếng Việt chuyên nghiệp cho lớp học, ấm áp, không sáo rỗng.',
      user: promptByKind[parsed.data.kind],
      maxTokens: 600,
    });
    const suggestions = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .filter((l) => !/^[-*\d]+[.)]?\s/.test(l) || true)
      .map((l) => l.replace(/^[-*]\s+/, '').replace(/^\d+[.)]\s+/, ''))
      .slice(0, 3);
    return NextResponse.json({ suggestions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
