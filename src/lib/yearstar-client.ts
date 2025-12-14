import WebSocket from 'ws';
import { prisma } from './prisma';

export interface YearstarConfig {
    ip: string;
    port: string;
    clientId: string;
    clientSecret: string;
}

export interface YearstarEvent {
    type: string;
    data: any;
    timestamp: number;
}

export class YearstarWebSocketClient {
    private ws: WebSocket | null = null;
    private config: YearstarConfig;
    private heartbeatInterval: NodeJS.Timeout | null = null;
    private reconnectTimeout: NodeJS.Timeout | null = null;
    private isConnecting: boolean = false;
    private eventHandlers: Map<string, ((event: YearstarEvent) => void)[]> = new Map();

    constructor(config: YearstarConfig) {
        this.config = config;
    }

    /**
     * Connect to the Yearstar PBX WebSocket
     */
    async connect(): Promise<void> {
        if (this.isConnecting || (this.ws && this.ws.readyState === WebSocket.OPEN)) {
            console.log('Already connected or connecting...');
            return;
        }

        this.isConnecting = true;
        const wsUrl = `ws://${this.config.ip}:${this.config.port}`;

        try {
            console.log(`Connecting to Yearstar PBX at ${wsUrl}...`);
            this.ws = new WebSocket(wsUrl);

            this.ws.on('open', () => {
                console.log('WebSocket connection established');
                this.isConnecting = false;
                this.authenticate();
                this.startHeartbeat();
            });

            this.ws.on('message', (data: WebSocket.Data) => {
                this.handleMessage(data);
            });

            this.ws.on('error', (error) => {
                console.error('WebSocket error:', error);
                this.isConnecting = false;
            });

            this.ws.on('close', () => {
                console.log('WebSocket connection closed');
                this.isConnecting = false;
                this.stopHeartbeat();
                this.scheduleReconnect();
            });
        } catch (error) {
            console.error('Failed to connect:', error);
            this.isConnecting = false;
            this.scheduleReconnect();
        }
    }

    /**
     * Authenticate with the PBX using client credentials
     */
    private authenticate(): void {
        if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

        const authMessage = {
            action: 'authenticate',
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
        };

        console.log('Sending authentication...');
        this.ws.send(JSON.stringify(authMessage));
    }

    /**
     * Start heartbeat to keep connection alive
     */
    private startHeartbeat(): void {
        // Send heartbeat every 30 seconds
        this.heartbeatInterval = setInterval(() => {
            if (this.ws && this.ws.readyState === WebSocket.OPEN) {
                const heartbeat = {
                    action: 'heartbeat',
                    timestamp: Date.now(),
                };
                this.ws.send(JSON.stringify(heartbeat));
                console.log('Heartbeat sent');
            }
        }, 30000);
    }

    /**
     * Stop heartbeat interval
     */
    private stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    /**
     * Schedule reconnection attempt
     */
    private scheduleReconnect(): void {
        if (this.reconnectTimeout) return;

        console.log('Scheduling reconnection in 5 seconds...');
        this.reconnectTimeout = setTimeout(() => {
            this.reconnectTimeout = null;
            this.connect();
        }, 5000);
    }

    /**
     * Handle incoming WebSocket messages
     */
    private async handleMessage(data: WebSocket.Data): Promise<void> {
        try {
            const message = JSON.parse(data.toString());
            console.log('Received message:', message);

            // Store event in database
            await this.storeEvent(message);

            // Emit event to handlers
            const event: YearstarEvent = {
                type: message.type || message.event || 'unknown',
                data: message,
                timestamp: Date.now(),
            };

            this.emit(event.type, event);
            this.emit('*', event); // Emit to wildcard listeners
        } catch (error) {
            console.error('Error handling message:', error);
        }
    }

    /**
     * Store event in database
     */
    private async storeEvent(eventData: any): Promise<void> {
        try {
            await prisma.systemEvent.create({
                data: {
                    eventType: eventData.type || eventData.event || 'unknown',
                    eventData: eventData,
                },
            });
        } catch (error) {
            console.error('Error storing event:', error);
        }
    }

    /**
     * Register event handler
     */
    on(eventType: string, handler: (event: YearstarEvent) => void): void {
        if (!this.eventHandlers.has(eventType)) {
            this.eventHandlers.set(eventType, []);
        }
        this.eventHandlers.get(eventType)!.push(handler);
    }

    /**
     * Emit event to registered handlers
     */
    private emit(eventType: string, event: YearstarEvent): void {
        const handlers = this.eventHandlers.get(eventType);
        if (handlers) {
            handlers.forEach(handler => handler(event));
        }
    }

    /**
     * Send a message to the PBX
     */
    send(message: any): void {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            console.error('WebSocket is not connected');
        }
    }

    /**
     * Make a call
     */
    makeCall(from: string, to: string): void {
        this.send({
            action: 'make_call',
            from,
            to,
            timestamp: Date.now(),
        });
    }

    /**
     * Get extension status
     */
    getExtensionStatus(extensionId: string): void {
        this.send({
            action: 'get_extension_status',
            extension_id: extensionId,
            timestamp: Date.now(),
        });
    }

    /**
     * Disconnect from PBX
     */
    disconnect(): void {
        this.stopHeartbeat();
        if (this.reconnectTimeout) {
            clearTimeout(this.reconnectTimeout);
            this.reconnectTimeout = null;
        }
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
    }
}

// Singleton instance
let yearstarClient: YearstarWebSocketClient | null = null;

export function getYearstarClient(): YearstarWebSocketClient {
    if (!yearstarClient) {
        const config: YearstarConfig = {
            ip: process.env.YEARSTAR_PBX_IP || '',
            port: process.env.YEARSTAR_PBX_PORT || '',
            clientId: process.env.YEARSTAR_CLIENT_ID || '',
            clientSecret: process.env.YEARSTAR_CLIENT_SECRET || '',
        };

        yearstarClient = new YearstarWebSocketClient(config);
    }

    return yearstarClient;
}
