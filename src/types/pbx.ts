
export interface Extension {
    id: string;
    extensionId: string;
    name: string | null;
    status?: string;
    mobileNumber?: string | null;
    email?: string | null;
    sipServer?: string | null;
    sipUser?: string | null;
    sipPassword?: string | null;
    isSynced?: boolean;
    lastSeen?: Date | null;
}

export interface ActiveCallDetails {
    callId: string;
    from: string;
    to: string;
    status: string;
}
