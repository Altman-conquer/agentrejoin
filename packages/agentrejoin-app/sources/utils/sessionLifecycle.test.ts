import { describe, expect, it } from 'vitest';
import { isSessionOutsideArchive } from './sessionLifecycle';

describe('isSessionOutsideArchive', () => {
    it('keeps stopped resumable sessions visible and hides only explicit archives', () => {
        expect(isSessionOutsideArchive({ active: false, metadata: { lifecycleState: 'paused' } })).toBe(true);
        expect(isSessionOutsideArchive({ active: false, metadata: { lifecycleState: 'running' } })).toBe(true);
        expect(isSessionOutsideArchive({ active: false, metadata: { lifecycleState: 'archived', archiveReason: 'Idle timeout' } })).toBe(true);
        expect(isSessionOutsideArchive({ active: false, metadata: { lifecycleState: 'archived' } })).toBe(false);
    });
});
