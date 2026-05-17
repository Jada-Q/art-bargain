// Shared SSE streaming handler used by the T7 runtime-comparison spike routes.
// Same body, three runtimes — to observe how long each Vercel runtime sustains a stream
// before timing out. Result feeds spec Appendix B.

import Anthropic from '@anthropic-ai/sdk';

// Prompt intentionally elicits a long output (~ several thousand tokens) so we exercise
// timeout boundaries rather than bottlenecking on Anthropic latency.
const PROMPT = `Count from 1 to 100. For every single number, write a detailed two-sentence note about its significance in mathematics, science, history, or culture. Be thorough and precise. Use the exact format on each line: "<number>: <commentary>". Do not skip any number.`;

export function spikeStreamResponse(): Response {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    return new Response('Missing ANTHROPIC_API_KEY', { status: 500 });
  }

  const client = new Anthropic({ apiKey });
  const startTime = Date.now();
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const claudeStream = client.messages.stream({
          model: 'claude-sonnet-4-6',
          max_tokens: 4000,
          messages: [{ role: 'user', content: PROMPT }],
        });

        let charCount = 0;
        for await (const event of claudeStream) {
          if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
            charCount += event.delta.text.length;
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ t: elapsed, chars: charCount, delta: event.delta.text })}\n\n`,
              ),
            );
          }
        }

        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        controller.enqueue(
          encoder.encode(
            `event: done\ndata: ${JSON.stringify({ elapsed_s: elapsed, chars: charCount })}\n\n`,
          ),
        );
        controller.close();
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'unknown';
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
        try {
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ elapsed_s: elapsed, error: msg })}\n\n`,
            ),
          );
          controller.close();
        } catch {
          // controller already closed or stream broken; nothing more we can do.
        }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
    },
  });
}
