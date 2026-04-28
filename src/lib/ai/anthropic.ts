import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from '@/lib/utils/retry';

let _client: Anthropic | null = null;

export function getAnthropic() {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

// Quick text completion via Sonnet (good for short-form, low-latency tasks)
export async function quickComplete(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  model?: string;
}): Promise<string> {
  return withRetry(async () => {
    const client = getAnthropic();
    const res = await client.messages.create({
      model: opts.model ?? 'claude-sonnet-4-6',
      max_tokens: opts.maxTokens ?? 1024,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    });
    const block = res.content[0];
    if (block.type !== 'text') throw new Error('Unexpected content block');
    return block.text;
  }, 'anthropic.quickComplete');
}

// Heavyweight HTML generation via Opus
export async function generateHtml(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string> {
  return withRetry(async () => {
    const client = getAnthropic();
    const res = await client.messages.create({
      model: 'claude-opus-4-7',
      max_tokens: opts.maxTokens ?? 16000,
      system: opts.system,
      messages: [{ role: 'user', content: opts.user }],
    });
    const block = res.content[0];
    if (block.type !== 'text') throw new Error('Unexpected content block');
    return block.text;
  }, 'anthropic.generateHtml');
}
