import { describe, expect, it } from 'vitest';
import { isSessionOutsideArchive, shouldNavigateAfterResume } from './sessionLifecycle';

describe('isSessionOutsideArchive', () => {
    it('keeps stopped resumable sessions visible and hides only explicit archives', () => {
        expect(isSessionOutsideArchive({ active: false, metadata: { lifecycleState: 'paused' } })).toBe(true);
        expect(isSessionOutsideArchive({ active: false, metadata: { lifecycleState: 'running' } })).toBe(true);
        expect(isSessionOutsideArchive({ active: false, metadata: { lifecycleState: 'archived', archiveReason: 'Idle timeout' } })).toBe(true);
        expect(isSessionOutsideArchive({ active: false, metadata: { lifecycleState: 'archived' } })).toBe(false);
    });
});

describe('shouldNavigateAfterResume', () => {
    it('only redirects when the user stayed on the page that started resume', () => {
        expect(shouldNavigateAfterResume('/session/a', '/session/a', true)).toBe(true);
        expect(shouldNavigateAfterResume('/session/a', '/session/b', true)).toBe(false);
        expect(shouldNavigateAfterResume('/session/a', '/session/a', false)).toBe(false);
    });
});
