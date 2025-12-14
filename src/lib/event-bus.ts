import { EventEmitter } from 'events';

// Global Event Bus to allow Server Components/Services to communicate with API Routes (SSE)
// This avoids DB polling for real-time updates.

const globalForEvents = global as unknown as { pbxEventBus: EventEmitter };

export const eventBus = globalForEvents.pbxEventBus || new EventEmitter();

// Increase limit to avoid warnings if many clients connect
eventBus.setMaxListeners(50);

if (process.env.NODE_ENV !== 'production') globalForEvents.pbxEventBus = eventBus;
