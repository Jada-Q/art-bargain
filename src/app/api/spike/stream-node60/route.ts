import { spikeStreamResponse } from '@/lib/spike-stream';

// Node.js serverless function with explicit maxDuration override.
// On Hobby plan max is 60s; Pro extends further.
export const maxDuration = 60;

export async function GET() {
  return spikeStreamResponse();
}
