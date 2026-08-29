export function isSessionOutsideArchive(session: {
    active: boolean;
    metadata?: { lifecycleState?: string; archiveReason?: string } | null;
}): boolean {
    return session.active
        || session.metadata?.lifecycleState !== 'archived'
        || session.metadata.archiveReason === 'Idle timeout';
}
