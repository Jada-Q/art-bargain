import { http, HttpResponse } from 'msw';

// Default Anthropic mock returning a static text message.
// Individual tests may `server.use(http.post(...))` to override per-case.
export const defaultAnthropicHandlers = [
  http.post('https://api.anthropic.com/v1/messages', () => {
    return HttpResponse.json({
      id: 'msg_test',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-6',
      content: [{ type: 'text', text: 'mock reply' }],
      stop_reason: 'end_turn',
      stop_sequence: null,
      usage: { input_tokens: 10, output_tokens: 5 },
    });
  }),
];
