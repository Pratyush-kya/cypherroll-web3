import { crashEngine } from '@/lib/crash-engine';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial state
      controller.enqueue(encoder.encode(`data: ${JSON.stringify(crashEngine.getState())}\n\n`));

      // Subscribe to 50ms engine state updates
      const unsubscribe = crashEngine.subscribe((state) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(state)}\n\n`));
        } catch {
          unsubscribe();
        }
      });

      // Handle client disconnect
      req.signal.addEventListener('abort', () => {
        unsubscribe();
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    },
  });
}
