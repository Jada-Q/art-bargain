import { spikeStreamResponse } from '@/lib/spike-stream';

export const runtime = 'edge';

export async function GET() {
  return spikeStreamResponse();
}
