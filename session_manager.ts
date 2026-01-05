
/**
 * Manages the mapping between client-provided session IDs (e.g., "task-1")
 * and Gemini CLI's internal session IDs (e.g., "54e41765...").
 * 
 * Uses in-memory storage (Map), so mappings are lost on server restart.
 */
export class SessionManager {
    private sessions: Map<string, string> = new Map();

    /**
     * Get the Gemini internal session ID for a given client ID.
     */
    getSessionId(clientId: string): string | undefined {
        return this.sessions.get(clientId);
    }

    /**
     * Set the mapping manually.
     */
    setSessionId(clientId: string, realId: string) {
        this.sessions.set(clientId, realId);
    }

    /**
     * Get all current mappings.
     */
    getAllMappings(): Record<string, string> {
        return Object.fromEntries(this.sessions);
    }

    /**
     * Resolves a client session ID to a real Gemini session ID.
     * If the mapping exists, returns it.
     * If not, executes the `startSessionFn` and detects the newly created session ID
     * by comparing the list of sessions before and after execution.
     * 
     * @param clientId The client-provided session ID
     * @param listSessionsFn Function that returns a list of all current real session IDs
     * @param startSessionFn Function that executes a command to start a new session (e.g. chat)
     * @returns The real Gemini session ID to be used
     */
    async resolveSession(
        clientId: string,
        listSessionsFn: () => Promise<string[]>,
        startSessionFn: () => Promise<unknown>
    ): Promise<string> {
        const existingId = this.sessions.get(clientId);
        if (existingId) {
            return existingId;
        }

        // Capture state before
        const beforeSessions = await listSessionsFn();

        // Execute the command that is expected to create a new session
        // Note: This command should NOT have a session ID argument, 
        // effectively starting a new conversation.
        await startSessionFn();

        // Capture state after
        const afterSessions = await listSessionsFn();

        // Diffing: Find IDs present in 'after' but not in 'before'
        const newIds = afterSessions.filter(id => !beforeSessions.includes(id));

        if (newIds.length === 0) {
            // Only logging warning, looking for edge cases where maybe it reused a session? 
            // or if the command failed silently (but startSessionFn should throw).
            // Fallback: If we can't find it, we can't map it.
            // But wait, if we return undefined/error, the tool call fails.
            // If gemini-cli didn't create a session, maybe it was a one-off command?
            throw new Error(`Failed to map session '${clientId}': No new session created by Gemini CLI.`);
        }

        // If multiple sessions created (unlikely concurrency), pick the most recent?
        // We assume sequential execution here.
        const newId = newIds[0];

        this.sessions.set(clientId, newId);
        return newId;
    }
}
