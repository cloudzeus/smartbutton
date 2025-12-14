
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
        const { startPBXWebSocket } = await import('@/lib/pbx-websocket-listener');
        // Start the WebSocket listener in the background
        startPBXWebSocket().catch(err => {
            console.error('Failed to initialize PBX WebSocket listener:', err);
        });
    }
}
