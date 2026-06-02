/**
 * COMPONENT: OfficeworksFunnel
 * PURPOSE: Manager-centric kanban view (Felicia's POV) — 5-stage funnel
 *          for Spec Check & Design process. MANATT (active) moves between
 *          columns as demo advances. 3 context projects sit in fixed columns.
 *
 * CLONE OF: src/components/bfi/BFIProcessKanban.tsx (simplified · kanban-only)
 *
 * 5 STAGES: Intake → Design → Spec Check → Submission → Acknowledgment
 * MAPPING: see stepIdToColIdx() · maps currentStep.id → MANATT column index
 *
 * DS TOKENS: bg-card · bg-muted · bg-ai/10 · bg-info/10 · bg-warning/10 ·
 *            bg-primary/10 · bg-success/10 · text-foreground · text-muted-foreground
 */

import { useEffect, useRef, useState } from 'react'
import { Search, LayoutGrid, MoreHorizontal, Users, Truck, Mail } from 'lucide-react'
import { useDemo } from '../../context/DemoContext'
import { MANATT_ORDER_META } from './shared/manattOrderData'
import { stepIdToColIdx } from './shared/funnelStages'
import {
    MANATT_LD_RFP, FINAL_QUOTE, WALLS_FINAL_QUOTE,
    LD_CONTEXT_PROJECTS, MANATT_LD_BADGE, MANATT_LD_BADGE_BY_STEP,
    MANATT_LD_SUBTITLE, MANATT_LD_SUBTITLE_BY_STEP,
} from './shared/manattLaborData'
import { SALES_ACTOR, SALES_OPPORTUNITIES, SALES_VOLUME_FACTS, SALES_INBOX_THREADS } from './shared/manattSalesData'
import { useOfficeworksVertical } from './shared/verticalSignal'
import { useIntakenThreads, resetIntakenThreads, writeSelectedThread, writeShowNewArrival, MANATT_THREAD_ID } from './shared/salesInboxSignal'
import CapacityModal from './CapacityModal'

// ─── Funnel columns · per flow ────────────────────────────────────────────────

const SPEC_COLUMNS = [
    { id: 'intake',     label: 'Intake',         color: 'text-ai',      border: 'border-ai/30',      pill: 'bg-ai/10 text-ai border border-ai/20' },
    { id: 'design',     label: 'Design',         color: 'text-info',    border: 'border-info/30',    pill: 'bg-info/10 text-info border border-info/20' },
    { id: 'spec-check', label: 'Spec Check',     color: 'text-warning', border: 'border-warning/30', pill: 'bg-warning/10 text-warning border border-warning/20' },
    { id: 'submission', label: 'Submission',     color: 'text-primary', border: 'border-primary/30', pill: 'bg-primary/10 text-primary border border-primary/20' },
    { id: 'ack',        label: 'Acknowledgment', color: 'text-success', border: 'border-success/30', pill: 'bg-success/10 text-success border border-success/20' },
] as const

const LD_COLUMNS = [
    { id: 'ld-intake',     label: 'RFP Intake',  color: 'text-ai',      border: 'border-ai/30',      pill: 'bg-ai/10 text-ai border border-ai/20' },
    { id: 'ld-conditions', label: 'Conditions',  color: 'text-info',    border: 'border-info/30',    pill: 'bg-info/10 text-info border border-info/20' },
    { id: 'ld-bid',        label: 'Vendor Bid',  color: 'text-warning', border: 'border-warning/30', pill: 'bg-warning/10 text-warning border border-warning/20' },
    { id: 'ld-eval',       label: 'Bid Eval',    color: 'text-primary', border: 'border-primary/30', pill: 'bg-primary/10 text-primary border border-primary/20' },
    { id: 'ld-quote',      label: 'Final Quote', color: 'text-success', border: 'border-success/30', pill: 'bg-success/10 text-success border border-success/20' },
] as const

const SALES_COLUMNS = [
    { id: 's-triage',   label: 'Triage',   color: 'text-ai',      border: 'border-ai/30',      pill: 'bg-ai/10 text-ai border border-ai/20' },
    { id: 's-assign',   label: 'Assign',   color: 'text-info',    border: 'border-info/30',    pill: 'bg-info/10 text-info border border-info/20' },
    { id: 's-discover', label: 'Discover', color: 'text-warning', border: 'border-warning/30', pill: 'bg-warning/10 text-warning border border-warning/20' },
    { id: 's-propose',  label: 'Propose',  color: 'text-primary', border: 'border-primary/30', pill: 'bg-primary/10 text-primary border border-primary/20' },
    { id: 's-close',    label: 'Close',    color: 'text-success', border: 'border-success/30', pill: 'bg-success/10 text-success border border-success/20' },
] as const

// ─── Sales flow · MANATT card content per column ────────────────────────────

const SALES_BADGE: Record<number, { label: string; className: string }> = {
    0: { label: 'Triaged',       className: 'bg-ai/10 text-ai border border-ai/20' },
    1: { label: 'Assigned',      className: 'bg-info/10 text-info border border-info/20' },
    2: { label: 'Qualifying',    className: 'bg-warning/10 text-warning border border-warning/20' },
    3: { label: 'Proposal',      className: 'bg-primary/10 text-primary border border-primary/20' },
    4: { label: 'Won',           className: 'bg-success/10 text-success border border-success/20' },
}

const SALES_BADGE_BY_STEP: Record<string, { label: string; className: string }> = {
    'sc-S.0': { label: 'Triage',    className: 'bg-ai/10 text-ai border border-ai/20' },
    'sc-S.1': { label: 'Intake',    className: 'bg-ai/10 text-ai border border-ai/20' },
    'sc-S.7': { label: 'Handoff',   className: 'bg-success/10 text-success border border-success/20' },
}

const SALES_SUBTITLE: Record<number, string> = {
    0: 'Inbound thread · MANATT 4F · 26h since last touch · urgent',
    1: 'Sales Rep · DC + NoVA recommended · SLA 24h qualify / 48h proposal',
    2: 'BANT + MEDDIC capture · 2 missing fields flagged before client call',
    3: 'Proposal assembled · BOM + labor + pricing · CBRE portal due 14-May 17:00',
    4: 'WON · $1,541,392 · auto-handoff to Spec Check + L&D',
}

const SALES_SUBTITLE_BY_STEP: Record<string, string> = {
    'sc-S.0': 'Multi-channel feed · 12 threads · 5 urgent · classified',
    'sc-S.5': 'Multi-channel outreach drafted · email + Teams + SMS · drafts only',
}

// ─── MANATT contextual content per column · Spec Check flow ──────────────────

const SPEC_BADGE: Record<number, { label: string; className: string }> = {
    0: { label: 'New Form',        className: 'bg-ai/10 text-ai border border-ai/20' },
    1: { label: 'In Design',       className: 'bg-info/10 text-info border border-info/20' },
    2: { label: 'Self + Peer',     className: 'bg-warning/10 text-warning border border-warning/20' },
    3: { label: 'SP4 sent',        className: 'bg-primary/10 text-primary border border-primary/20' },
    4: { label: 'Ack received',    className: 'bg-success/10 text-success border border-success/20' },
}

// Per-step overrides on MANATT card badge/subtitle (when the funnel column alone
// doesn't capture the state — e.g. sc1.0b shares the Intake column with sc1.0
// but represents a different moment in the arc).
const SPEC_BADGE_BY_STEP: Record<string, { label: string; className: string }> = {
    'sc1.0b': { label: 'Pending', className: 'bg-warning/10 text-warning border border-warning/20' },
}

const SPEC_SUBTITLE: Record<number, string> = {
    0: 'Form received · CAD missing · GSA SQ blank',
    1: 'CET layout · 71 lines · 13 CRs · Flintwood 5N',
    2: 'Kimberly self-audit · Rebecca peer review · Felicia oversight',
    3: 'SP4 uploaded to NetSuite · 79% discount applied · PO released',
    4: 'Teknion ack PO-DC-0009642 · diff scan in progress',
}

const SPEC_SUBTITLE_BY_STEP: Record<string, string> = {
    'sc1.0b': 'Form complete · CAD received · awaiting designer assignment',
}

// ─── Context projects (3 fixed cards in other columns) ────────────────────────

interface ContextCard {
    code: string
    initials: string
    client: string
    value: string
    colIdx: number
    avatarBg: string
    avatarColor: string
    desc: string
    designer: string
}

const SPEC_CONTEXT_CARDS: ContextCard[] = [
    {
        code: 'NYC-DOH-2847', initials: 'DOH', client: 'NYC Dept. of Health · Brooklyn',
        value: '$148,200', colIdx: 0,
        avatarBg: 'bg-ai/20', avatarColor: 'text-ai',
        desc: 'Form received · 18 stations · awaiting designer assignment',
        designer: 'Unassigned',
    },
    {
        code: 'JPM-ATL-4471', initials: 'JPM', client: 'JPMorgan · Atlanta HQ',
        value: '$892,400', colIdx: 2,
        avatarBg: 'bg-warning/20', avatarColor: 'text-warning',
        desc: 'Full floor · 200+ stations · 3-day burst week',
        designer: 'James O\'Brien (DC)',
    },
    {
        code: 'GSA-DC2-0892', initials: 'GSA', client: 'GSA · DC2 (price-protected)',
        value: '$76,500', colIdx: 3,
        avatarBg: 'bg-primary/20', avatarColor: 'text-primary',
        desc: 'SP4 in NetSuite · awaiting Caitlin to release PO',
        designer: 'Sandra Park (DC)',
    },
]

// Sales · 3 context opps live in non-MANATT columns
const SALES_CONTEXT_CARDS: ContextCard[] = [
    {
        code: 'JPM-ATL-4471', initials: 'JPM', client: 'JPMorgan · Atlanta HQ · pricing burst',
        value: '$3.28M', colIdx: 1,
        avatarBg: 'bg-info/20', avatarColor: 'text-info',
        desc: 'Strategic account · 8 floors · qualify SLA running',
        designer: 'Sales Rep · ATL + Carolinas',
    },
    {
        code: 'DLA-NYC-22F', initials: 'DLA', client: 'DLA Piper · NYC expansion',
        value: '$780K', colIdx: 2,
        avatarBg: 'bg-warning/20', avatarColor: 'text-warning',
        desc: 'Walls vertical · NeoCon intro · 6mo out',
        designer: 'Sales Rep · NYC + Tri-State',
    },
    {
        code: 'ELI-PA-1180', initials: 'ELI', client: 'Eli Lilly · PA facility',
        value: '$425K', colIdx: 3,
        avatarBg: 'bg-primary/20', avatarColor: 'text-primary',
        desc: 'Proposal in assembly · spec attached · BANT + MEDDIC complete',
        designer: 'Sales Rep · PA + WV',
    },
]

// ─── Header text + actor info per flow ───────────────────────────────────────

const HEADER_BY_FLOW = {
    'spec-check': {
        title: 'Spec Check & Design · Pipeline',
        sub: 'Felicia Miano-Poles · EVP Design & PM · ~30 designers across 3 regions',
        capacityLabel: 'View capacity',
        capacityCount: '~30 designers',
    },
    'labor-delivery': {
        title: 'Labor & Delivery · Pipeline',
        sub: 'Alan McPhee · Sr Operations · Furniture · ~240 estimates/mo · DC + NoVA + MD',
        capacityLabel: 'View installers',
        capacityCount: '6 approved DC',
    },
    'sales': {
        title: 'Sales · Pipeline',
        sub: `${SALES_ACTOR.role} · ${SALES_ACTOR.territoryLabel} · ${SALES_ACTOR.personaSubLine}`,
        capacityLabel: 'View inbox',
        capacityCount: `${SALES_INBOX_THREADS.length} threads`,
    },
} as const

// Walls vertical override · same title but Paul Egan + Walls metrics
const HEADER_WALLS = {
    title: 'Labor & Delivery · Pipeline',
    sub: 'Paul Egan · Head of Ops · Walls · ~60 estimates/mo · NJ + PA + MA · centralized governance',
    capacityLabel: 'View installers',
    capacityCount: '3 approved Walls',
} as const

// ─── MANATT card · owner per step + flow ─────────────────────────────────────

function getMANATTOwner(stepId: string | undefined, flowId: 'spec-check' | 'labor-delivery' | 'sales', vertical: 'furniture' | 'walls' = 'furniture'): string {
    if (flowId === 'sales') {
        if (!stepId || stepId === 'sc-S.0') return `${SALES_ACTOR.role} · routing`
        if (stepId === 'sc-S.1' || stepId === 'sc-S.2') return `${SALES_ACTOR.role} · ${SALES_ACTOR.territoryLabel}`
        return 'Sales Rep · DC + NoVA (assigned)'
    }
    if (flowId === 'labor-delivery') {
        if (vertical === 'walls') {
            if (!stepId || stepId === 'sc-LD.0') return 'Paul Egan · routing'
            return 'Paul Egan · Head of Ops'
        }
        if (!stepId || stepId === 'sc-LD.0') return 'Alan McPhee · routing'
        return 'Alan McPhee · Sr Operations'
    }
    // Spec Check (sin cambio)
    if (!stepId || stepId === 'sc1.0' || stepId === 'sc1.0b') return 'Pending assignment'
    return 'Kimberly Tucker (PA · cross-market)'
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    onOpenReview: () => void
    /** Optional: hide the "Review" CTA on the MANATT card (used when modal already open) */
    hideReviewCta?: boolean
    /** Currently assigned designer for MANATT · overrides the default getMANATTOwner() inference */
    assignedDesigner?: string | null
    /**
     * Active flow · Officeworks runs Spec Check & Design and Labor & Delivery
     * in parallel per the AS-IS BPMN. The funnel renders 5 columns + 3 context
     * cards + the MANATT card consistently across both, but the data swaps.
     */
    flowId?: 'spec-check' | 'labor-delivery' | 'sales'
}

export default function OfficeworksFunnel({ onOpenReview, hideReviewCta = false, assignedDesigner, flowId = 'spec-check' }: Props) {
    const { currentStep } = useDemo()
    const [capacityOpen, setCapacityOpen] = useState(false)
    const intakenThreads = useIntakenThreads()
    const isLD = flowId === 'labor-delivery'
    const isSales = flowId === 'sales'
    const vertical = useOfficeworksVertical()
    const isWalls = isLD && vertical === 'walls'

    // Active arrays per flow · same shape, different content.
    const PROCESS_COLUMNS = isSales ? SALES_COLUMNS : isLD ? LD_COLUMNS : SPEC_COLUMNS
    const BADGE          = isSales ? SALES_BADGE          : isLD ? MANATT_LD_BADGE          : SPEC_BADGE
    const BADGE_BY_STEP  = isSales ? SALES_BADGE_BY_STEP  : isLD ? MANATT_LD_BADGE_BY_STEP  : SPEC_BADGE_BY_STEP
    const SUBTITLE       = isSales ? SALES_SUBTITLE       : isLD ? MANATT_LD_SUBTITLE       : SPEC_SUBTITLE
    const SUBTITLE_BY_STEP = isSales ? SALES_SUBTITLE_BY_STEP : isLD ? MANATT_LD_SUBTITLE_BY_STEP : SPEC_SUBTITLE_BY_STEP
    const CONTEXT_CARDS  = isSales ? SALES_CONTEXT_CARDS  : isLD ? LD_CONTEXT_PROJECTS      : SPEC_CONTEXT_CARDS
    const header         = isWalls ? HEADER_WALLS : HEADER_BY_FLOW[flowId]

    const activeCol = stepIdToColIdx(currentStep?.id)
    const col = PROCESS_COLUMNS[activeCol]
    const stepKey = currentStep?.id ?? ''
    const badge = BADGE_BY_STEP[stepKey] ?? BADGE[activeCol]
    const subtitle = SUBTITLE_BY_STEP[stepKey] ?? SUBTITLE[activeCol]
    const owner = assignedDesigner ?? getMANATTOwner(currentStep?.id, flowId, vertical)
    // Quote amount for MANATT card · uses Walls FQ when Walls vertical is active.
    const ldQuotedTotal = isWalls ? WALLS_FINAL_QUOTE.quotedTotal : FINAL_QUOTE.quotedTotal

    const firstStepId = isSales ? 'sc-S.0' : isLD ? 'sc-LD.0' : 'sc1.0'
    const ingestEvent = isSales ? 'officeworks:sales-inbox-ingest' : isLD ? 'officeworks:ld-rfp-ingest' : 'officeworks:intake-ingest'
    const isJustArrived = currentStep?.id === firstStepId

    // First-step gate · MANATT card is hidden until ActionCenter finishes the
    // ingest animation (dispatches officeworks:intake-ingest or :ld-rfp-ingest).
    const [manattIngested, setManattIngested] = useState(() => currentStep?.id !== firstStepId)

    useEffect(() => {
        if (currentStep?.id === firstStepId) {
            setManattIngested(false)
            const onIngest = () => setManattIngested(true)
            window.addEventListener(ingestEvent, onIngest)
            return () => window.removeEventListener(ingestEvent, onIngest)
        } else {
            setManattIngested(true)
        }
    }, [currentStep?.id, firstStepId, ingestEvent])

    // Sales · the MANATT card enters the funnel only when its email is picked
    // from the inbox (intake). Other flows keep the ingest-animation gate.
    const manattVisible = isSales
        ? intakenThreads.includes(MANATT_THREAD_ID)
        : (currentStep?.id !== firstStepId || manattIngested)

    // Stable ref so the inbox-ingest useEffect below doesn't re-fire (and reset
    // the demo state) every time onOpenReview changes reference · without this,
    // each parent re-render would reset writeShowNewArrival(false) right after
    // the notification CTA flipped it to true, killing the MANATT highlight.
    const onOpenReviewRef = useRef(onOpenReview)
    useEffect(() => { onOpenReviewRef.current = onOpenReview }, [onOpenReview])

    // Sales flow-1 · do NOT auto-open the Review modal · wait for the
    // notification CTA ('officeworks:sales-inbox-ingest' event dispatched by
    // ActionCenter when the Sales Lead clicks "Triage inbox →"). When fired,
    // pre-select MANATT and mark it as new arrival so the right-panel feed
    // highlights it · then open the Review modal directly (no intermediate
    // standalone inbox modal).
    useEffect(() => {
        if (!isSales || currentStep?.id !== 'sc-S.0') return
        // Reset the demo state on entry · allows replaying the triage simulation
        // multiple times (different audiences, F5 reloads, navigation back).
        resetIntakenThreads()
        writeSelectedThread(null)
        writeShowNewArrival(false)
        const open = () => {
            // Notification path · pre-select MANATT + mark as new arrival.
            writeSelectedThread(MANATT_THREAD_ID)
            writeShowNewArrival(true)
            onOpenReviewRef.current()
        }
        window.addEventListener('officeworks:sales-inbox-ingest', open)
        return () => window.removeEventListener('officeworks:sales-inbox-ingest', open)
    }, [isSales, currentStep?.id])

    // Non-MANATT emails added to the funnel · rendered as Triage pipeline cards.
    const intakenContextThreads = isSales
        ? intakenThreads
            .filter(id => id !== MANATT_THREAD_ID)
            .map(id => SALES_INBOX_THREADS.find(t => t.id === id))
            .filter((t): t is NonNullable<typeof t> => Boolean(t))
        : []

    return (
        <div className="bg-card border border-border rounded-2xl">
            {/* Header */}
            <div className="border-b border-border px-5 py-4 flex items-center justify-between">
                <div>
                    <h2 className="text-base font-semibold text-foreground">{header.title}</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        {header.sub}
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            if (isSales) {
                                // View inbox path · clean entry · no NEW highlight.
                                resetIntakenThreads()
                                writeSelectedThread(null)
                                writeShowNewArrival(false)
                                onOpenReview()
                            } else {
                                setCapacityOpen(true)
                            }
                        }}
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border text-xs text-foreground hover:bg-muted/50 transition-colors"
                        title={isSales ? 'Unified inbox · multi-channel triage · classified + deduped by Strata' : isLD ? 'Approved installer pool · per market · MSA-locked' : 'Designer capacity · weekly committed/available hours · refreshed nightly'}
                    >
                        {isSales ? <Mail className="h-3.5 w-3.5" /> : isLD ? <Truck className="h-3.5 w-3.5" /> : <Users className="h-3.5 w-3.5" />}
                        {header.capacityLabel}
                        <span className="text-[10px] text-muted-foreground font-normal">· {header.capacityCount}</span>
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border text-xs text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                        title="Search projects"
                    >
                        <Search className="h-3.5 w-3.5" />
                    </button>
                    <button
                        type="button"
                        className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md border border-border bg-muted text-xs text-foreground transition-colors"
                        title="Board view"
                    >
                        <LayoutGrid className="h-3.5 w-3.5" />
                        Board
                    </button>
                </div>
            </div>

            {/* Kanban content */}
            <div className="p-5">
                <div className="grid grid-cols-5 gap-3">
                    {PROCESS_COLUMNS.map((c, colIdx) => {
                        const isManattCol = colIdx === activeCol && manattVisible
                        const colCards = CONTEXT_CARDS.filter(card => card.colIdx === colIdx)
                        const colIntaken = (isSales && colIdx === 0) ? intakenContextThreads : []
                        const count = (isManattCol ? 1 : 0) + colCards.length + colIntaken.length

                        return (
                            <div key={c.id} className="space-y-3 min-h-[200px]">
                                {/* Column header */}
                                <div className="flex items-center justify-between mb-1 px-1">
                                    <h4 className={`font-medium text-sm flex items-center gap-2 ${isManattCol ? c.color : 'text-foreground'}`}>
                                        {c.label}
                                        <span className="bg-muted text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full font-mono tabular-nums">{count}</span>
                                    </h4>
                                    <button className="p-1 text-muted-foreground hover:text-foreground transition-colors" title="Column options">
                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                    </button>
                                </div>

                                {/* MANATT card — highlighted (moves between columns) */}
                                {isManattCol && (
                                    <div className={`relative rounded-2xl border-2 ${col.border} bg-card p-3.5 space-y-3 shadow-md animate-in fade-in slide-in-from-top-2 duration-700 ${
                                        isJustArrived ? 'ring-2 ring-ai/40 ring-offset-2 ring-offset-background' : ''
                                    }`}>
                                        {isJustArrived && (
                                            <div className="absolute -top-2 -right-2 text-[9px] font-bold uppercase tracking-wider bg-ai text-background px-2 py-0.5 rounded-full shadow-md animate-pulse">
                                                Just arrived
                                            </div>
                                        )}
                                        <div className="flex items-start gap-2.5">
                                            <div className="h-8 w-8 rounded-full bg-success/20 flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-zinc-900">
                                                <span className="text-[10px] font-black text-success">MAN</span>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center justify-between gap-1 mb-0.5">
                                                    <span className="text-sm font-bold text-foreground truncate min-w-0">MANATT</span>
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}>
                                                        {badge.label}
                                                    </span>
                                                </div>
                                                <span className="text-[11px] text-muted-foreground block truncate">
                                                    {isSales ? `Manatt Phelps & Phillips · 4F · MANATT-4F · ${SALES_OPPORTUNITIES[0].copperStage}%`
                                                     : isLD ? `Manatt Phelps & Phillips · 4F · ${MANATT_LD_RFP.market}`
                                                     : 'Manatt Phelps & Phillips LLP · DC'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">{isSales ? 'Opp' : 'PO'}</span>
                                                <span className="font-medium text-foreground font-mono">{isSales ? SALES_OPPORTUNITIES[0].oppId : MANATT_ORDER_META.poNumber}</span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">{isSales ? 'Pipeline' : isLD ? 'Quote' : 'Net'}</span>
                                                <span className="font-semibold text-foreground">
                                                    ${isSales ? SALES_OPPORTUNITIES[0].estValueUSD.toLocaleString() : isLD ? ldQuotedTotal.toLocaleString() : MANATT_ORDER_META.netTotal.toLocaleString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-xs">
                                                <span className="text-muted-foreground">{isSales ? 'Sales Lead' : isLD ? 'Owner' : 'Designer'}</span>
                                                <span className="font-medium text-foreground truncate ml-1">{owner}</span>
                                            </div>
                                        </div>

                                        <p className="text-[11px] text-muted-foreground leading-relaxed">{subtitle}</p>

                                        {!hideReviewCta && (
                                            <div className="pt-2 border-t border-border flex items-center justify-between">
                                                <span className="text-[10px] text-muted-foreground">
                                                    {isSales ? `Copper · stage ${SALES_OPPORTUNITIES[0].copperStage}% · ${SALES_VOLUME_FACTS.totalOpenOpportunities.toLocaleString()} open` :
                                                     isLD ? `Portal ${MANATT_LD_RFP.gcPortalRef}` :
                                                     `SQ #${MANATT_ORDER_META.specialQuote}`}
                                                </span>
                                                <div className="relative">
                                                    <span className="absolute -inset-1 rounded-xl bg-ai/20 animate-pulse pointer-events-none" />
                                                    <button
                                                        type="button"
                                                        onClick={onOpenReview}
                                                        className="relative py-1.5 px-3 text-[11px] font-bold rounded-xl bg-foreground text-background hover:opacity-80 transition-all ring-2 ring-ai ring-offset-1"
                                                    >
                                                        Review →
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Context cards (other projects in this column) */}
                                {colCards.map(card => (
                                    <div
                                        key={card.code}
                                        className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5 shadow-sm opacity-60 pointer-events-none"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className={`h-8 w-8 rounded-full ${card.avatarBg} flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-zinc-900`}>
                                                <span className={`text-[10px] font-black ${card.avatarColor}`}>{card.initials}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold text-foreground truncate">{card.code}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">{card.client}</div>
                                            </div>
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed">{card.desc}</p>
                                        <div className="h-px bg-border" />
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground truncate">{card.designer}</span>
                                            <span className="font-semibold text-foreground tabular-nums">{card.value}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Intaken from inbox · non-MANATT pipeline cards (Sales) */}
                                {colIntaken.map(t => (
                                    <div
                                        key={t.id}
                                        className="rounded-2xl border border-border bg-card p-3.5 space-y-2.5 shadow-sm animate-in fade-in slide-in-from-top-2 duration-500"
                                    >
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 rounded-full bg-ai/15 flex items-center justify-center shrink-0 ring-2 ring-white dark:ring-zinc-900">
                                                <span className="text-[10px] font-black text-ai">{t.fromOrg.slice(0, 3).toUpperCase()}</span>
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm font-semibold text-foreground truncate">{t.fromOrg}</div>
                                                <div className="text-[10px] text-muted-foreground truncate">{t.from}</div>
                                            </div>
                                            {t.intent === 'urgent' && (
                                                <span className="text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/20 shrink-0">Urgent</span>
                                            )}
                                        </div>
                                        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-2">{t.subject}</p>
                                        <div className="h-px bg-border" />
                                        <div className="flex items-center justify-between text-[11px]">
                                            <span className="text-muted-foreground truncate">Triaged from inbox</span>
                                            <span className="font-semibold text-ai tabular-nums">intent {t.intentScore}</span>
                                        </div>
                                    </div>
                                ))}

                                {/* Empty state */}
                                {count === 0 && (
                                    <div className="border-2 border-dashed border-border rounded-xl p-5 text-center">
                                        <p className="text-xs text-muted-foreground">No projects</p>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

            </div>

            {/* Capacity modal — opens from "View capacity" button in header.
                Heatmap moved out of the funnel main view to keep the kanban as the
                primary focus. Designer assignment still happens with the embedded
                CapacityHeatmap inside IntakeAssignPanel of the Review modal. */}
            <CapacityModal isOpen={capacityOpen} onClose={() => setCapacityOpen(false)} />

            {/* Sales · unified inbox lives inside the Review modal (right panel).
                Notification CTA and "View inbox" button both open the Review modal
                directly · no standalone inbox modal needed. */}
        </div>
    )
}
