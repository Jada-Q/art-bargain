import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';

export async function GET(request: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      {
        ok: false,
        error: 'ANTHROPIC_API_KEY missing. Set it in .env.local — see .env.example.',
      },
      { status: 500 },
    );
  }

  const url = new URL(request.url);
  const prompt = url.searchParams.get('prompt') ?? 'Say "hello from claude" in 5 words.';

  const client = new Anthropic({ apiKey });

  try {
    const result = await client.messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = result.content
      .filter((block): block is Extract<typeof block, { type: 'text' }> => block.type === 'text')
      .map((b) => b.text)
      .join('');

    return NextResponse.json({
      ok: true,
      model: result.model,
      text,
      stop_reason: result.stop_reason,
      usage: result.usage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
