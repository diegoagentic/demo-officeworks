// ─── Officeworks Sales · inbox → funnel signal ───────────────────────────────
// Two pieces of cross-subtree state for the reframed Sales flow 1:
//   1. intakenThreadIds — emails the Sales Lead picked from the inbox to add to
//      the funnel as pipeline cards (MANATT flows full downstream; others are
//      context cards in the Triage column).
//   2. selectedThreadId — the thread the Review modal focuses (Thread Detail /
//      intake) when "Review" or "Intake" is chosen.
//
// Same lightweight pattern as verticalSignal.ts (sessionStorage + custom events)
// because the funnel, the SalesInboxModal and the Review modal live in sibling
// subtrees where React context wouldn't reach all of them.

import { useEffect, useState } from 'react';

const INTAKEN_KEY = 'officeworks:sales-intaken-threads';
const SELECTED_KEY = 'officeworks:sales-selected-thread';
const INTAKEN_EVENT = 'officeworks:sales-intaken-change';
const SELECTED_EVENT = 'officeworks:sales-selected-change';

// MANATT hero thread · the only pick that flows the full downstream demo.
export const MANATT_THREAD_ID = 'sit-001';

// ─── Intaken threads (funnel cards) ──────────────────────────────────────────

export function readIntakenThreads(): string[] {
    if (typeof window === 'undefined') return [];
    try {
        const raw = window.sessionStorage.getItem(INTAKEN_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function addIntakenThread(id: string): void {
    if (typeof window === 'undefined') return;
    const current = readIntakenThreads();
    if (current.includes(id)) return;
    const next = [...current, id];
    window.sessionStorage.setItem(INTAKEN_KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent(INTAKEN_EVENT, { detail: next }));
}

export function resetIntakenThreads(): void {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(INTAKEN_KEY);
    window.dispatchEvent(new CustomEvent(INTAKEN_EVENT, { detail: [] }));
}

/** Reactive hook · re-renders the consumer when the intaken set changes. */
export function useIntakenThreads(): string[] {
    const [ids, setIds] = useState<string[]>(readIntakenThreads);
    useEffect(() => {
        const onChange = (e: Event) => {
            const detail = (e as CustomEvent).detail as string[] | undefined;
            setIds(Array.isArray(detail) ? detail : readIntakenThreads());
        };
        window.addEventListener(INTAKEN_EVENT, onChange);
        return () => window.removeEventListener(INTAKEN_EVENT, onChange);
    }, []);
    return ids;
}

// ─── Selected thread (review modal focus) ────────────────────────────────────

export function readSelectedThread(): string | null {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(SELECTED_KEY);
}

export function writeSelectedThread(id: string | null): void {
    if (typeof window === 'undefined') return;
    if (id) window.sessionStorage.setItem(SELECTED_KEY, id);
    else window.sessionStorage.removeItem(SELECTED_KEY);
    window.dispatchEvent(new CustomEvent(SELECTED_EVENT, { detail: id ?? null }));
}

/** Reactive hook · re-renders when the focused thread changes. */
export function useSelectedThread(): string | null {
    const [id, setId] = useState<string | null>(readSelectedThread);
    useEffect(() => {
        const onChange = (e: Event) => {
            const detail = (e as CustomEvent).detail as string | null | undefined;
            setId(detail ?? null);
        };
        window.addEventListener(SELECTED_EVENT, onChange);
        return () => window.removeEventListener(SELECTED_EVENT, onChange);
    }, []);
    return id;
}

// ─── Show NEW arrival flag (notification path vs View inbox path) ────────────
// Set to true when the Review modal opens via the ActionCenter notification
// (sc-S.0 ingest event) so MANATT-4F gets the "NEW · just arrived" highlight.
// Set to false when opening via the "View inbox" funnel button so no card
// gets the new-arrival treatment.

const SHOW_NEW_ARRIVAL_KEY = 'officeworks:sales-show-new-arrival';
const SHOW_NEW_ARRIVAL_EVENT = 'officeworks:sales-show-new-arrival-change';

export function readShowNewArrival(): boolean {
    if (typeof window === 'undefined') return false;
    return window.sessionStorage.getItem(SHOW_NEW_ARRIVAL_KEY) === '1';
}

export function writeShowNewArrival(value: boolean): void {
    if (typeof window === 'undefined') return;
    if (value) window.sessionStorage.setItem(SHOW_NEW_ARRIVAL_KEY, '1');
    else window.sessionStorage.removeItem(SHOW_NEW_ARRIVAL_KEY);
    window.dispatchEvent(new CustomEvent(SHOW_NEW_ARRIVAL_EVENT, { detail: value }));
}

/** Reactive hook · re-renders when the new-arrival flag changes. */
export function useShowNewArrival(): boolean {
    const [value, setValue] = useState<boolean>(readShowNewArrival);
    useEffect(() => {
        const onChange = (e: Event) => {
            const detail = (e as CustomEvent).detail as boolean | undefined;
            setValue(detail === true);
        };
        window.addEventListener(SHOW_NEW_ARRIVAL_EVENT, onChange);
        return () => window.removeEventListener(SHOW_NEW_ARRIVAL_EVENT, onChange);
    }, []);
    return value;
}
