import { prisma } from '@/lib/prisma';
import { eventBus } from '@/lib/event-bus';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: Request) {
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            // Helper to format events
            const formatEvent = (event: any) => ({
                id: event.id,
                timestamp: event.timestamp.toISOString(),
                severity: event.eventData?.severity || 'INFO',
                category: event.eventData?.category || 'GENERAL',
                eventName: event.eventData?.description || event.eventData?.eventName || event.eventType || 'Unknown', // Use Description as Title
                message: event.eventData?.message || 'No message',
                details: event.eventData?.details,
                description: event.eventData?.description
            });

            // Helper to encode SSE message
            const sendLogs = (logs: any[]) => {
                const msg = `data: ${JSON.stringify({ type: 'logs', logs })}\n\n`;
                controller.enqueue(encoder.encode(msg));
            };

            // 1. Send initial connection message
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'connected' })}\n\n`));

            // 2. Fetch Recent History (Last 10 events from DB)
            try {
                const history = await prisma.systemEvent.findMany({
                    take: 10,
                    orderBy: { timestamp: 'desc' }
                });
                if (history.length > 0) {
                    // Send in chronological order
                    sendLogs(history.reverse().map(formatEvent));
                }
            } catch (e) {
                console.error("Failed to fetch history:", e);
            }

            // 3. Subscribe to Real-Time Events via Event Bus
            const onEvent = (event: any) => {
                try {
                    sendLogs([formatEvent(event)]);
                } catch (e) {
                    console.error("Error sending event to stream:", e);
                }
            };

            eventBus.on('pbx-event', onEvent);

            // Cleanup
            request.signal.addEventListener('abort', () => {
                eventBus.off('pbx-event', onEvent);
                try {
                    controller.close();
                } catch (e) { }
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
        },
    });
}
