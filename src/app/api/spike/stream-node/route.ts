import { spikeStreamResponse } from '@/lib/spike-stream';

// Default Vercel runtime (Node.js serverless function). Default maxDuration applies.

export async function GET() {
  return spikeStreamResponse();
}
