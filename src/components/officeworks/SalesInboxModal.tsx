/**
 * COMPONENT: SalesInboxModal
 * PURPOSE: Sales flow-1 entry surface. When a new email arrives (sc-S.0) this
 *          modal opens with the multi-channel inbox. The Sales Lead triages
 *          (filter by topic), then for each thread can:
 *            - Intake → : add the email to the funnel as a pipeline card
 *                         (MANATT flows the full downstream; others are context)
 *            - Review   : open the Review modal focused on the thread
 *            - Return   : draft a clarification request (draft-only · never sent)
 *
 * Replaces CapacityModal as the header action in the Sales flow.
 * DS TOKENS only · mirrors CapacityModal shell + UnifiedInboxFeed row.
 */

import { Fragment, useMemo, useState } from 'react'
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react'
import { X, Mail, MessageSquare, Globe, ArrowRight, Eye, CornerUpLeft, Sparkles, Star } from 'lucide-react'
import {
    SALES_INBOX_THREADS,
    SALES_INBOX_TOPICS,
    SALES_VOLUME_FACTS,
    type SalesInboxChannel,
    type SalesInboxTopic,
} from './shared/manattSalesData'
import { MANATT_THREAD_ID } from './shared/salesInboxSignal'

interface SalesInboxModalProps {
    isOpen: boolean
    onClose: () => void
    /** Add the email to the funnel + (for MANATT) advance the flow to intake. */
    onIntake: (threadId: string) => void
    /** Open the Review modal focused on this thread. */
    onReview: (threadId: string) => void
    /** Thread ids already added to the funnel (badge as "In pipeline"). */
    intakenIds: string[]
}

const TOPIC_LABEL: Record<SalesInboxTopic, string> = Object.fromEntries(
    SALES_INBOX_TOPICS.map(t => [t.id, t.label]),
) as Record<SalesInboxTopic, string>

// Pre-filled clarification draft per topic · draft-only, never auto-sent.
const RETURN_DRAFT: Partial<Record<SalesInboxTopic, string>> = {
    'works-gap': 'Thanks — before we start drawing we need the CAD file, the SQ number, and a clearer scope. Could you confirm these?',
    'scope-lock': 'Happy to lock scope. Can you confirm the final workstation count and the GSA price tier so we finalize today?',
    'pricing-gsa': 'To price accurately, could you confirm the floors in scope and the applicable GSA/price-protection tier?',
    'rfp-portal': 'Received the portal RFP — to respond we need the finalized GC quote template and confirmed deadline. Please confirm.',
}
const RETURN_DRAFT_DEFAULT = 'Thanks for reaching out — could you share a bit more detail so we can route this correctly?'

function ChannelIcon({ channel }: { channel: SalesInboxChannel }) {
    if (channel === 'teams') return <MessageSquare className="h-3.5 w-3.5 text-info shrink-0" aria-hidden="true" />
    if (channel === 'portal') return <Globe className="h-3.5 w-3.5 text-warning shrink-0" aria-hidden="true" />
    return <Mail className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
}

export default function SalesInboxModal({ isOpen, onClose, onIntake, onReview, intakenIds }: SalesInboxModalProps) {
    const [topicFilter, setTopicFilter] = useState<SalesInboxTopic | 'all'>('all')
    const [returnOpenId, setReturnOpenId] = useState<string | null>(null)
    const [returnedIds, setReturnedIds] = useState<string[]>([])

    const topicCounts = useMemo(() => {
        const c = new Map<SalesInboxTopic, number>()
        for (const t of SALES_INBOX_THREADS) c.set(t.topic, (c.get(t.topic) ?? 0) + 1)
        return c
    }, [])

    const filtered = useMemo(
        () => (topicFilter === 'all' ? SALES_INBOX_THREADS : SALES_INBOX_THREADS.filter(t => t.topic === topicFilter)),
        [topicFilter],
    )

    const dedupeGroups = useMemo(() => {
        const seen = new Map<string, number>()
        SALES_INBOX_THREADS.forEach(t => {
            if (!t.dedupGroupId) return
            seen.set(t.dedupGroupId, (seen.get(t.dedupGroupId) ?? 0) + 1)
        })
        return seen
    }, [])

    const handleReturn = (id: string) => {
        setReturnedIds(prev => (prev.includes(id) ? prev : [...prev, id]))
        setReturnOpenId(null)
    }

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[400]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150"  leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-center justify-center p-6">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150"  leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-full max-w-3xl transform rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">

                            {/* Header */}
                            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30 shrink-0">
                                <div className="h-8 w-8 rounded-full bg-ai/15 flex items-center justify-center shrink-0">
                                    <Sparkles className="h-4 w-4 text-ai" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[13px] font-bold text-foreground">Unified inbox · multi-channel triage</div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Strata classified {SALES_INBOX_THREADS.length} threads · deduped · scored ·
                                        {' '}{SALES_VOLUME_FACTS.inboundEmailsPerDayPerRep} emails/day per rep
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Topic filter chips */}
                            <div className="px-5 py-3 border-b border-border bg-muted/15 shrink-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => setTopicFilter('all')}
                                        aria-pressed={topicFilter === 'all'}
                                        className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                            topicFilter === 'all'
                                                ? 'bg-primary text-primary-foreground'
                                                : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                                        }`}
                                    >
                                        All <span className="tabular-nums opacity-70">{SALES_INBOX_THREADS.length}</span>
                                    </button>
                                    {SALES_INBOX_TOPICS.map(topic => {
                                        const n = topicCounts.get(topic.id) ?? 0
                                        if (n === 0) return null
                                        const active = topicFilter === topic.id
                                        return (
                                            <button
                                                key={topic.id}
                                                type="button"
                                                onClick={() => setTopicFilter(topic.id)}
                                                aria-pressed={active}
                                                className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                                                    active
                                                        ? 'bg-primary text-primary-foreground'
                                                        : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                                                }`}
                                            >
                                                {topic.label} <span className="tabular-nums opacity-70">{n}</span>
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Thread list */}
                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
                                {filtered.map(t => {
                                    const dupCount = t.dedupGroupId ? dedupeGroups.get(t.dedupGroupId) ?? 1 : 1
                                    const isDup = dupCount > 1
                                    const isRecommended = t.id === MANATT_THREAD_ID
                                    const inPipeline = intakenIds.includes(t.id)
                                    const isReturned = returnedIds.includes(t.id)
                                    return (
                                        <div
                                            key={t.id}
                                            className={`relative rounded-lg border bg-card overflow-hidden transition-colors ${
                                                isRecommended ? 'border-ai/60 ring-2 ring-ai/30 animate-in fade-in zoom-in-95 duration-500' : 'border-border hover:border-foreground/20'
                                            }`}
                                        >
                                            {isRecommended && !inPipeline && (
                                                <span className="absolute top-1 right-1 z-10 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-ai text-ai-foreground shadow-md">
                                                    <Sparkles className="h-2.5 w-2.5" /> New · just arrived
                                                </span>
                                            )}
                                            {/* Row head */}
                                            <div className="px-3 py-2 flex items-center gap-2">
                                                <ChannelIcon channel={t.channel} />
                                                <span className="text-[11px] font-bold text-foreground truncate flex-1 min-w-0">{t.from}</span>
                                                <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-muted text-muted-foreground border border-border">
                                                    {TOPIC_LABEL[t.topic]}
                                                </span>
                                                {isDup && (
                                                    <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-ai/10 text-ai border border-ai/20">
                                                        Dedup · {dupCount}
                                                    </span>
                                                )}
                                                {t.intent === 'urgent' && (
                                                    <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/20">Urgent</span>
                                                )}
                                                {t.intent === 'action' && (
                                                    <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/20">Action</span>
                                                )}
                                                {t.intent === 'fyi' && (
                                                    <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-muted text-muted-foreground border border-border">FYI</span>
                                                )}
                                            </div>

                                            {/* Row body */}
                                            <div className="px-3 pb-2 space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[12px] font-medium text-foreground truncate">{t.subject}</span>
                                                    {isRecommended && (
                                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-ai/10 text-ai border border-ai/20 shrink-0">
                                                            <Star className="h-2.5 w-2.5" /> Recommended
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground line-clamp-2">{t.snippet}</div>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
                                                    <span>{t.receivedAt}</span>
                                                    {typeof t.hoursSinceLastTouch === 'number' && t.hoursSinceLastTouch > 12 && (
                                                        <span className="text-destructive font-bold">· {t.hoursSinceLastTouch}h since last touch</span>
                                                    )}
                                                    <span className="ml-auto">Strata intent score · {t.intentScore}</span>
                                                </div>
                                            </div>

                                            {/* Return composer (draft-only) */}
                                            {returnOpenId === t.id && (
                                                <div className="px-3 pb-2.5">
                                                    <div className="rounded-md border border-border bg-muted/20 p-2.5 space-y-2">
                                                        <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Request information · draft (not sent)</div>
                                                        <textarea
                                                            defaultValue={RETURN_DRAFT[t.topic] ?? RETURN_DRAFT_DEFAULT}
                                                            rows={3}
                                                            aria-label="Clarification draft"
                                                            className="w-full text-[11px] bg-card border border-border rounded-md px-2 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                                        />
                                                        <div className="flex items-center justify-end gap-2">
                                                            <button
                                                                type="button"
                                                                onClick={() => setReturnOpenId(null)}
                                                                className="text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleReturn(t.id)}
                                                                className="inline-flex items-center gap-1.5 text-[11px] font-bold rounded-md px-2.5 py-1 bg-foreground text-background hover:opacity-80 transition-opacity"
                                                            >
                                                                Queue draft · not sent
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Actions */}
                                            <div className="px-3 py-2 border-t border-border flex items-center gap-2 bg-muted/10">
                                                {isReturned ? (
                                                    <span className="text-[10px] font-semibold text-warning inline-flex items-center gap-1">
                                                        <CornerUpLeft className="h-3 w-3" /> Returned · awaiting clarification (draft queued)
                                                    </span>
                                                ) : inPipeline ? (
                                                    <span className="text-[10px] font-semibold text-success inline-flex items-center gap-1">
                                                        <ArrowRight className="h-3 w-3" /> In pipeline · added to funnel
                                                    </span>
                                                ) : (
                                                    <button
                                                        type="button"
                                                        onClick={() => setReturnOpenId(t.id)}
                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-muted/50 transition-colors"
                                                    >
                                                        <CornerUpLeft className="h-3.5 w-3.5" /> Return for info
                                                    </button>
                                                )}

                                                <div className="ml-auto flex items-center gap-2">
                                                    <button
                                                        type="button"
                                                        onClick={() => onReview(t.id)}
                                                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-foreground border border-border px-2.5 py-1 rounded-md hover:bg-muted/50 transition-colors"
                                                    >
                                                        <Eye className="h-3.5 w-3.5" /> Review
                                                    </button>
                                                    {!inPipeline && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onIntake(t.id)}
                                                            className="inline-flex items-center gap-1 text-[11px] font-bold rounded-md px-2.5 py-1 bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
                                                        >
                                                            Intake <ArrowRight className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-border bg-card shrink-0 flex items-center justify-between gap-3">
                                <p className="text-[11px] text-muted-foreground">
                                    Strata classified · deduped · scored. Sales Lead resolves the queue · no auto-action.
                                </p>
                                <button
                                    onClick={onClose}
                                    className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[12px] font-bold bg-muted text-foreground hover:bg-muted/70 transition-colors"
                                >
                                    Close
                                </button>
                            </div>

                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    )
}
