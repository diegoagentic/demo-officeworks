/**
 * COMPONENT: OfficeworksDocumentReviewModal
 * PURPOSE: Stage-adaptive document review modal · Manager opens it from
 *          the OfficeworksFunnel to drill into MANATT project at any stage.
 *
 * CLONE OF: src/components/bfi/BFIDocumentReviewModal.tsx (simplified shell)
 *
 * STAGE: one of 15 — matches every demo step
 * LAYOUT:
 *   - Header (project · stage progress · close)
 *   - AI context banner (per stage)
 *   - Split pane: Left doc tabs (3/5) · Right stage panel (2/5)
 *   - Footer: Approve & Continue CTA → calls onValidate (= nextStep)
 *
 * DS TOKENS: bg-card · bg-ai/X · text-foreground · semantic only
 */

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import * as TooltipPrimitive from '@radix-ui/react-tooltip'
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react'
import { X, Sparkles, FileText, MapPin, ClipboardCheck, ArrowRight, AlertCircle, CheckCircle2, FileWarning, Image as ImageIcon, Eye, UserCheck, Users, Paperclip, Mail, Loader2, HelpCircle, ShieldCheck, Search, AlertTriangle, DollarSign, Send, Calendar, Layers, Pencil, Inbox, Building2, Truck, ChevronDown, ChevronRight as ChevronRightIcon, Save, Edit3, Target, TrendingUp, MessageSquare, Smartphone, ExternalLink, Activity, Clock, Briefcase, Award, Check, Database, Upload, Star, Zap, CalendarClock } from 'lucide-react'
import { useDemo } from '../../context/DemoContext'
import { MANATT_ORDER_META } from './shared/manattOrderData'
import {
    MANATT_LD_RFP, MANATT_TAKEOFF, TAKEOFF_BULLETS, MANATT_BUILDING_CONDITIONS,
    APPROVED_INSTALLERS_DC, BID_RESPONSES, INTERNAL_BENCHMARK, FINAL_QUOTE,
    PORTAL_UPLOAD_BULLETS, HISTORICAL_RECEIPTS, LD_VOLUME_FACTS, ALAN_MCPHEE,
    WALLS_TAKEOFF,
    COVER_LETTER_BODY, SIF_FURNITURE, SIF_WALLS,
    BID_REQUEST_EMAIL_FURNITURE, WALLS_BID_REQUEST_SECTIONS_A_G,
    NOTIFICATION_DRAFTS, PORTAL_STATUS,
    getActiveVerticalData,
} from './shared/manattLaborData'
import {
    SALES_ACTOR, SALES_VOLUME_FACTS,
    SALES_INBOX_THREADS, SALES_OPPORTUNITIES, SALES_REPS,
    SALES_DISCOVERY_TEMPLATE, SALES_OUTREACH_DRAFTS,
    SALES_PROPOSAL_LINE_ITEMS, SALES_PROPOSAL_META,
    SALES_HANDOFF_PACKET, SALES_HANDOFF_ROUTES,
    SALES_STAGE_AI_BANNER, SALES_STAGE_PAINPOINT_CHIPS,
    SALES_OPP_EXTRACTED_SNIPPETS, SALES_OPP_CLARIFICATION_DRAFT,
    SALES_DISCOVERY_CLIENT_CLARIFICATION_DRAFT, SALES_DISCOVERY_MANAGER_ESCALATION_DRAFT,
    SALES_OPP_INTAKE_INSIGHTS,
    SALES_INTAKE_SOURCES, SALES_INTAKE_PROCESSING_STEPS,
    SALES_REP_RECOMMENDATION, SALES_REP_REGION_GROUPS,
    MANATT_ACCOUNT_HISTORY,
    type SalesInboxThread, type SalesRep,
    type IntakeSourceCard,
} from './shared/manattSalesData'
import { useOfficeworksVertical } from './shared/verticalSignal'
import { useSelectedThread, writeSelectedThread, useIntakenThreads, addIntakenThread, useShowNewArrival, useIntakePhase, writeIntakePhase, useIntakeSource, writeIntakeSource, useAssignedRepId, writeAssignedRepId, useOppPriority, writeOppPriority, MANATT_THREAD_ID } from './shared/salesInboxSignal'
import { OFFICEWORKS_FUNNEL } from './shared/funnelStages'
import CapacityHeatmap from './shared/CapacityHeatmap'
import BlueprintFloorPlan from './shared/BlueprintFloorPlan'
import { OFFICEWORKS_PDFS } from './shared/PDFPreviewModal'
import { findDesigner, regionLabel, computeCapacity } from './shared/designerProfiles'
import RequestInfoDialog from '../shared/RequestInfoDialog'
import SelfAuditScene from './SelfAuditScene'

// Stages matching demo steps (intake split into intake/intake-complete)
export type OfficeworksReviewStage =
    | 'intake' | 'intake-complete'
    | 'design' | 'bom-gen' | 'validation' | 'field-verify'
    | 'sq-check' | 'teknion-preview' | 'spec-gap' | 'phasing'
    | 'self-audit' | 'peer-review' | 'submission' | 'handoff' | 'ack-review'
    // ─── L&D flow · 8 stages (sc-LD.0 to sc-LD.7) ─────────────────────────
    | 'ld-rfp-intake' | 'ld-takeoff' | 'ld-conditions' | 'ld-vendor-pool'
    | 'ld-bid-send' | 'ld-bid-compare' | 'ld-winner-select' | 'ld-final-upload'
    // ─── Sales flow · 8 stages (sc-S.0 to sc-S.7) ────────────────────────
    | 'sales-inbox' | 'sales-intake' | 'sales-capacity' | 'sales-assign'
    | 'sales-discovery' | 'sales-outreach' | 'sales-proposal' | 'sales-handoff'

// Stage → funnel column index (5 cols: intake / design / spec-check / submission / ack)
const STAGE_TO_COL: Record<OfficeworksReviewStage, number> = {
    'intake': 0, 'intake-complete': 0,
    'design': 1, 'bom-gen': 1, 'validation': 1, 'field-verify': 1, 'sq-check': 1,
    'teknion-preview': 2, 'spec-gap': 2, 'phasing': 2, 'self-audit': 2, 'peer-review': 2,
    'submission': 3, 'handoff': 3,
    'ack-review': 4,
    // L&D flow maps to its own 5-column rhythm (intake → conditions → bid → eval → quote).
    // We reuse the same 0..4 indices · the funnel labels are spec-check-specific and
    // are hidden for L&D stages (see render guard below).
    'ld-rfp-intake': 0, 'ld-takeoff': 0,
    'ld-conditions': 1,
    'ld-vendor-pool': 2, 'ld-bid-send': 2,
    'ld-bid-compare': 3, 'ld-winner-select': 3,
    'ld-final-upload': 4,
    // Sales flow · 5-column rhythm (triage → assign → discover → propose → close)
    'sales-inbox': 0, 'sales-intake': 0,
    'sales-capacity': 1, 'sales-assign': 1,
    'sales-discovery': 2, 'sales-outreach': 2,
    'sales-proposal': 3,
    'sales-handoff': 4,
}

const LD_STAGES: ReadonlySet<OfficeworksReviewStage> = new Set([
    'ld-rfp-intake', 'ld-takeoff', 'ld-conditions', 'ld-vendor-pool',
    'ld-bid-send', 'ld-bid-compare', 'ld-winner-select', 'ld-final-upload',
])

const SALES_STAGES: ReadonlySet<OfficeworksReviewStage> = new Set([
    'sales-inbox', 'sales-intake', 'sales-capacity', 'sales-assign',
    'sales-discovery', 'sales-outreach', 'sales-proposal', 'sales-handoff',
])

// L&D-flow funnel (5 cols mirroring the design funnel but L&D-themed).
const LD_FUNNEL = [
    { id: 'ld-intake', label: 'RFP Intake' },
    { id: 'ld-conditions', label: 'Conditions' },
    { id: 'ld-bid', label: 'Vendor Bid' },
    { id: 'ld-eval', label: 'Bid Eval' },
    { id: 'ld-quote', label: 'Final Quote' },
] as const

// Sales-flow funnel (5 cols mirroring the rhythm: triage → assign → discover → propose → close).
const SALES_FUNNEL = [
    { id: 's-triage', label: 'Triage' },
    { id: 's-assign', label: 'Assign' },
    { id: 's-discover', label: 'Discover' },
    { id: 's-propose', label: 'Propose' },
    { id: 's-close', label: 'Close' },
] as const

const STAGE_AI_BANNER: Record<OfficeworksReviewStage, string> = {
    'intake':           '75-80% of Works forms arrive incomplete · Strata detected missing CAD + blank SQ · email drafted to Caitlin',
    'intake-complete':  'Caitlin replied · CAD .dwg attached · SQ #436533 confirmed · designer assignment unlocked',
    'design':           'Three sub-steps · (1) Upload BOM · Strata analyzes + 3 findings · (2) Attach validation deck · Strata reads 6 sections · (3) Send proposal to client · GW2A gate clears on Felicia\'s sign-off',
    'bom-gen':          'CAP generates BOM · 71 lines across 4 Tags · List $296,228 / Net $61,464.80 · 13 CRs (25-40 days)',
    'validation':       'Google Slides auto-compiled · client approval gate · GW2A revision type sub-gateway',
    'field-verify':     'Pre-installation drawings sent to Abigail PM · field verification BEFORE Teknion order',
    'sq-check':         'MANATT GSA · SQ #436533 confirmed · Create platform inline · 2025 catalog vigente',
    'teknion-preview':  'Tifani returns preview · 1-2 weeks · GW3: clean / spec gap / timeline conflict',
    'spec-gap':         'Spec gap on CR 2046138 (40-day leadtime) · Strata suggests fix · resubmit preview',
    'phasing':          'Teknion can\'t meet date · 3-way huddle Designer + PM + Salesperson · phased plan',
    'self-audit':       'Kimberly checks her own BOM · 5-step audit · 71 lines × 6 attrs · 13 CRs · Today: 6h paper. With Strata: 25min.',
    'peer-review':      'Peer audits Kimberly\'s self-audit · Strata surfaces tacit rules from Felicia\'s history as proposed KB entries (SC7)',
    'submission':       'BOM PDF + SP4 file to Caitlin + Coordinator · OW Best Practice template',
    'handoff':          'Coordinator uploads SP4 to NetSuite · 79% discount · Caitlin releases PO to Teknion',
    'ack-review':       'Gemini already in use · Strata supercharges · 71-line diff · 2 EE terminal states',
    // L&D flow banners
    'ld-rfp-intake':    'CBRE submitted the MANATT 4F labor RFP via Building Connected · 3 attachments · SLA 48h · Strata routes the email into the labor inbox.',
    'ld-takeoff':       'Today: ~2.5h manual workstation count in Bluebeam · the single most time-consuming step. With Strata: 18s read of manatt-4th-floor.dwg + reviewable overrides.',
    'ld-conditions':    'Today this knowledge is "nowhere — only in my head" (Alan, ~6:54). Strata pulls 8 of 12 conditions from the Building KB at 1551 K St NW · Alan confirms the 2 medium-confidence ones.',
    'ld-vendor-pool':   'DC pool consolidated May/2026 · 3 approved installers. Strata flags Pinnacle (3 active jobs · capacity Low) and recommends TriState (96% on-time · 2% CO).',
    'ld-bid-send':      '~700–900 outbound bid request emails per month today, all manual. Strata pre-fills the 48h bid request · Alan reviews 3 pre-flight checks · sends to 3 installers in one click.',
    'ld-bid-compare':   'Strata computes the internal benchmark · 320h × $60/hr + 2 stops × $1,350 = $21,900 · flags variance ≥15%. All 3 bids land within tolerance · TriState wins on price + headroom.',
    'ld-winner-select': 'TriState selected · Strata drafts 3 emails (winner notify + 2 loser notifies). Alan reviews and sends · winner + loser comms tracked.',
    'ld-final-upload':  '3 sub-steps: apply OW margin → preview Excel cells → upload to Building Connected portal. Today manual copy/validate/re-enter with formula errors found in both files.',
    // Sales flow banners
    'sales-inbox':      'Strata classified 12 inbound threads in 1.8s · dedup, intent and urgency scored across email + Teams + portal · today reps work 3 inboxes in parallel under 150-200 emails/day.',
    'sales-intake':     'Strata extracts company · size · budget hint from the thread and pre-flights the Works form · catches the 75-80% incomplete cycle BEFORE submit, not after.',
    'sales-capacity':   'Live capacity ledger pulled from Copper events (read-only mock) · revisions and rework included · the Thursday spreadsheet captures intent, this captures reality.',
    'sales-assign':     'Strata suggests a rep on territory + prior wins + load · 24h qualify / 48h proposal SLA timer auto-starts · auto-escalates to Sales Manager if breached.',
    'sales-discovery':  'Strata auto-summarized the 7-message thread into BANT + MEDDIC · 2 missing fields flagged before the rep talks to the client · stops the salesperson-guessing root cause of revisions.',
    'sales-outreach':   'Strata drafted across email + Teams + SMS in one composer · channel-of-record suggestion · drafts only, never auto-sends · rep reviews and confirms each one.',
    'sales-proposal':   'Strata pulled the Spec Check BOM + L&D labor quote + NetSuite catalog (read-only) into one proposal · the 6h stops-and-starts assembly collapses to a review pass.',
    'sales-handoff':    'Strata builds the post-award handoff packet · Works post-award form + NetSuite SO bridge + downstream flow triggers · no missed coordinator step.',
}

// ─── Sub-component: Stage progress stepper (5 stages) ──────────────────────────

function StageProgress({ activeCol, stage }: { activeCol: number; stage: OfficeworksReviewStage }) {
    const funnel = LD_STAGES.has(stage) ? LD_FUNNEL
                 : SALES_STAGES.has(stage) ? SALES_FUNNEL
                 : OFFICEWORKS_FUNNEL
    return (
        <div className="flex items-center gap-1">
            {funnel.map((s, i) => {
                const isPast = i < activeCol
                const isActive = i === activeCol
                return (
                    <Fragment key={s.id}>
                        <div className={`flex items-center gap-1.5 px-2.5 h-7 rounded-md text-[11px] font-medium ${
                            isActive ? 'bg-primary text-primary-foreground' :
                            isPast ? 'bg-success/10 text-success' :
                            'bg-muted text-muted-foreground'
                        }`}>
                            <span className="font-mono tabular-nums">{i + 1}</span>
                            <span>{s.label}</span>
                        </div>
                        {i < funnel.length - 1 && (
                            <div className={`h-px w-3 ${isPast ? 'bg-success/40' : 'bg-border'}`} />
                        )}
                    </Fragment>
                )
            })}
        </div>
    )
}

// ─── Document tabs (left panel) ────────────────────────────────────────────────

const DOC_TABS = [
    { id: 'works-form' as const, icon: FileText, label: 'Works Form' },
    { id: 'bom' as const,        icon: ClipboardCheck, label: 'BOM' },
    { id: 'validation' as const, icon: FileText, label: 'Validation Doc' },
    { id: 'floor-plan' as const, icon: MapPin, label: 'Floor Plan' },
    { id: 'attachments' as const, icon: Paperclip, label: 'Attachments' },
    { id: 'ack' as const,        icon: FileText, label: 'Acknowledgment' },
    // ─── L&D flow tabs ──────────────────────────────────────────────────────
    { id: 'ld-sif' as const,                 icon: FileText,       label: 'SIF' },
    { id: 'ld-cover-letter' as const,        icon: Mail,           label: 'Cover Letter' },
    { id: 'ld-takeoff-report' as const,      icon: ClipboardCheck, label: 'Takeoff Report' },
    { id: 'ld-conditions-record' as const,   icon: Building2,      label: 'Conditions Record' },
    { id: 'ld-vendor-pool' as const,         icon: Users,          label: 'Vendor Pool' },
    { id: 'ld-bid-request' as const,         icon: Send,           label: 'Bid Request' },
    { id: 'ld-internal-benchmark' as const,  icon: Target,         label: 'Internal Benchmark' },
    { id: 'ld-bids-received' as const,       icon: DollarSign,     label: 'Bids Received' },
    { id: 'ld-scorecard' as const,           icon: TrendingUp,     label: 'Scorecard' },
    { id: 'ld-notifications' as const,       icon: Mail,           label: 'Notifications' },
    { id: 'ld-excel-quote' as const,         icon: FileText,       label: 'Excel Quote' },
    { id: 'ld-portal-status' as const,       icon: CheckCircle2,   label: 'Portal Status' },
    // ─── Sales flow tabs ────────────────────────────────────────────────────
    { id: 'sales-inbox-feed' as const,        icon: Inbox,          label: 'Inbox Feed' },
    { id: 'sales-thread-detail' as const,     icon: Mail,           label: 'Thread Detail' },
    { id: 'sales-opp-record' as const,        icon: FileText,       label: 'Opp Record' },
    { id: 'sales-capacity-ledger' as const,   icon: Users,          label: 'Capacity Ledger' },
    { id: 'sales-assignment' as const,        icon: UserCheck,      label: 'Assignment' },
    { id: 'sales-discovery-notes' as const,   icon: ClipboardCheck, label: 'Discovery Notes' },
    { id: 'sales-account-history' as const,   icon: Award,          label: 'Account History' },
    { id: 'sales-outreach-draft' as const,    icon: Send,           label: 'Outreach Draft' },
    { id: 'sales-proposal-pdf' as const,      icon: FileText,       label: 'Proposal PDF' },
    { id: 'sales-quote-detail' as const,      icon: DollarSign,     label: 'Quote Detail' },
    { id: 'sales-win-loss' as const,          icon: Target,         label: 'Win / Loss' },
    { id: 'sales-handoff-packet' as const,    icon: TrendingUp,     label: 'Handoff Packet' },
] as const

type DocTab = typeof DOC_TABS[number]['id']

// Stage-aware tab visibility. Flow 1 + Flow 2 (design through sq-check) start
// with a 3-tab contextual base (Works Form, Floor Plan, Attachments). The BOM
// and Validation Doc tabs are added dynamically by DefaultDocTabs once the
// designer uploads the BOM (sc1.2) or compiles the validation doc (sc1.3) —
// see FlowProgress.
const STAGE_TABS: Partial<Record<OfficeworksReviewStage, DocTab[]>> = {
    'intake': ['works-form', 'floor-plan', 'attachments'],
    'intake-complete': ['works-form', 'floor-plan', 'attachments'],
    'design': ['works-form', 'floor-plan', 'attachments'],
    'sq-check': ['works-form', 'floor-plan', 'attachments'],
    // ─── L&D flow tabs per stage ────────────────────────────────────────────
    'ld-rfp-intake':     ['floor-plan', 'ld-sif', 'ld-cover-letter'],
    'ld-takeoff':        ['floor-plan', 'ld-takeoff-report'],
    'ld-conditions':     ['floor-plan', 'ld-conditions-record'],
    'ld-vendor-pool':    ['ld-vendor-pool'],
    'ld-bid-send':       ['ld-bid-request', 'floor-plan'],
    'ld-bid-compare':    ['ld-internal-benchmark', 'ld-bids-received'],
    'ld-winner-select':  ['ld-scorecard', 'ld-notifications'],
    'ld-final-upload':   ['ld-excel-quote', 'ld-portal-status'],
    // ─── Sales flow tabs per stage ──────────────────────────────────────────
    'sales-inbox':       ['sales-thread-detail'],
    'sales-intake':      ['sales-opp-record', 'sales-thread-detail'],
    'sales-capacity':    ['sales-capacity-ledger', 'sales-opp-record'],
    'sales-assign':      ['sales-opp-record', 'sales-thread-detail'],
    'sales-discovery':   ['sales-thread-detail', 'sales-account-history', 'sales-opp-record'],
    'sales-outreach':    ['sales-outreach-draft', 'sales-thread-detail'],
    'sales-proposal':    ['sales-proposal-pdf', 'sales-quote-detail', 'sales-outreach-draft'],
    'sales-handoff':     ['sales-handoff-packet', 'sales-win-loss'],
}
const DEFAULT_TAB_SET: DocTab[] = ['works-form', 'bom', 'validation', 'floor-plan', 'ack']

// Flags toggled by Flow 2 panels as the designer produces artifacts.
// Used by DefaultDocTabs to reveal the BOM / Validation Doc tabs and by
// BOMPreview to flip from placeholder to real table.
// `validationStarted` flips at sub-step 2 (designer clicks "Attach validation
// deck") so the tab appears as an empty placeholder · `validationCompiled`
// flips at the end of processing so the tab fills with the file + sections.
interface FlowProgress {
    bomUploaded: boolean
    validationStarted: boolean
    validationCompiled: boolean
    clientApproved: boolean
}

// Default doc tab per stage (which document is most relevant)
const DEFAULT_DOC: Record<OfficeworksReviewStage, DocTab> = {
    'intake': 'works-form', 'intake-complete': 'works-form',
    'design': 'floor-plan', 'bom-gen': 'bom', 'validation': 'validation', 'field-verify': 'floor-plan',
    'sq-check': 'bom', 'teknion-preview': 'bom', 'spec-gap': 'bom', 'phasing': 'bom',
    'self-audit': 'bom', 'peer-review': 'bom',
    'submission': 'bom', 'handoff': 'bom',
    'ack-review': 'ack',
    // L&D stages · each opens at its primary document tab.
    'ld-rfp-intake':     'floor-plan',
    'ld-takeoff':        'floor-plan',
    'ld-conditions':     'ld-conditions-record',
    'ld-vendor-pool':    'ld-vendor-pool',
    'ld-bid-send':       'ld-bid-request',
    'ld-bid-compare':    'ld-internal-benchmark',
    'ld-winner-select':  'ld-scorecard',
    'ld-final-upload':   'ld-excel-quote',
    // Sales stages · each opens at its primary document tab.
    'sales-inbox':       'sales-thread-detail',
    'sales-intake':      'sales-opp-record',
    'sales-capacity':    'sales-capacity-ledger',
    'sales-assign':      'sales-opp-record',
    'sales-discovery':   'sales-thread-detail',
    'sales-outreach':    'sales-outreach-draft',
    'sales-proposal':    'sales-proposal-pdf',
    'sales-handoff':     'sales-handoff-packet',
}

// ─── Component ────────────────────────────────────────────────────────────────

interface Props {
    isOpen: boolean
    onClose: () => void
    stage: OfficeworksReviewStage
    /** Called when user clicks "Approve & Continue" — advances demo */
    onValidate: () => void
    /** Optional override for the right-panel content (used by parent to inject hero scenes) */
    rightPanelOverride?: React.ReactNode
    /** Optional override for the left doc panel (default shows BOM/floor plan placeholders) */
    leftPanelOverride?: React.ReactNode
    /** Bypass split-pane entirely · use full modal body for the content (hero scenes) */
    fullContent?: React.ReactNode
    /** Currently assigned designer (passed in from parent state) · used by IntakeAssignPanel */
    assignedDesigner?: string | null
    /** Called when user assigns/changes a designer from inside the modal */
    onAssignDesigner?: (name: string) => void
    /** Peer reviewer picked at sc1.6 · propagated to sc1.7 PeerReviewScene */
    peerReviewerName?: string | null
    /** Called when SelfAuditScene's PeerAssignPopover picks a peer */
    onAssignPeerReviewer?: (name: string | null) => void
    /** L&D · vendor pool picked at sc-LD.3 · propagated to sc-LD.4 (bid request) and sc-LD.5 (compare) */
    selectedVendorIds?: string[] | null
    /** Called when VendorPoolSelector confirms the installer pool */
    onSelectVendors?: (ids: string[]) => void
    /** L&D · winner picked at sc-LD.6 · propagated to sc-LD.7 (final quote) */
    winnerVendorId?: string | null
    /** Called when WinnerSelectPanel confirms a winner */
    onSelectWinner?: (id: string) => void
}

export default function OfficeworksDocumentReviewModal({
    isOpen, onClose, stage, onValidate, rightPanelOverride, leftPanelOverride, fullContent,
    assignedDesigner, onAssignDesigner,
    peerReviewerName, onAssignPeerReviewer,
    selectedVendorIds, onSelectVendors,
    winnerVendorId, onSelectWinner,
}: Props) {
    const { isSidebarCollapsed, isDemoActive } = useDemo()
    const leftOffset = isDemoActive && !isSidebarCollapsed ? 'left-80' : 'left-0'
    const activeCol = STAGE_TO_COL[stage]
    const aiBanner = STAGE_AI_BANNER[stage]

    // Modal-level progress flags · drive dynamic tab visibility + BOMPreview gate
    const [flowProgress, setFlowProgress] = useState<FlowProgress>({
        bomUploaded: false,
        validationStarted: false,
        validationCompiled: false,
        clientApproved: false,
    })
    // Hydration logic for flowProgress flags · they are monotonic in the normal
    // flow (once true, never false). Three branches:
    //   · intake / intake-complete · reset to false (back-navigation guard)
    //   · design                   · no-op, DesignBOMPanel owns its sub-state
    //   · any other (post-design)  · force flags to true so the BOM + Validation
    //                                tabs stay populated even when the demo
    //                                opens mid-flow (refresh, jump-to-step,
    //                                notification CTA at a later stage).
    useEffect(() => {
        if (stage === 'intake' || stage === 'intake-complete') {
            setFlowProgress({ bomUploaded: false, validationStarted: false, validationCompiled: false, clientApproved: false })
            return
        }
        if (stage === 'design') return
        setFlowProgress({ bomUploaded: true, validationStarted: true, validationCompiled: true, clientApproved: true })
    }, [stage])
    const markBomUploaded       = () => setFlowProgress(p => ({ ...p, bomUploaded: true }))
    const markValidationStarted = () => setFlowProgress(p => ({ ...p, validationStarted: true }))
    const markValidationDone    = () => setFlowProgress(p => ({ ...p, validationCompiled: true }))
    const markClientApproved    = () => setFlowProgress(p => ({ ...p, clientApproved: true }))

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[200]" onClose={onClose}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-300" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-200"  leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className={`fixed top-0 ${leftOffset} right-0 bottom-0 bg-black/50 backdrop-blur-sm`} />
                </TransitionChild>

                <div className={`fixed top-0 ${leftOffset} right-0 bottom-0 overflow-y-auto`}>
                    <div className="flex min-h-full items-center justify-center p-3">
                        <TransitionChild
                            as={Fragment}
                            enter="ease-out duration-300" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                            leave="ease-in duration-200"  leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                        >
                            <DialogPanel className="w-full max-w-6xl h-[calc(100vh-1.5rem)] transform overflow-hidden rounded-2xl bg-card text-left shadow-2xl border border-border flex flex-col">

                                {/* ── Header ── */}
                                <div className="px-6 py-4 border-b border-border flex items-center justify-between gap-4 shrink-0">
                                    <div className="flex items-center gap-3 min-w-0 shrink-0">
                                        <div className="h-9 w-9 rounded-xl bg-ai/10 text-ai flex items-center justify-center shrink-0">
                                            <Sparkles className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="text-[15px] font-bold text-foreground leading-tight truncate">
                                                    Document Review — MANATT 4th Floor
                                                </h3>
                                                <OppPriorityChipMaybe />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Stage progress in header */}
                                    <div className="flex-1 flex justify-center min-w-0 overflow-hidden">
                                        <StageProgress activeCol={activeCol} stage={stage} />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        aria-label="Close"
                                        className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                </div>

                                {/* AI context banner (per stage) */}
                                <div className="px-6 py-2 bg-ai/5 border-b border-ai/20 flex items-center gap-2 shrink-0">
                                    <Sparkles className="h-3.5 w-3.5 text-ai shrink-0" />
                                    <p className="text-[11px] text-ai font-medium truncate">
                                        <span className="font-bold">Strata AI · </span>{aiBanner}
                                    </p>
                                </div>

                                {/* ── Body: either fullContent (heros) or split-pane (default) ── */}
                                {fullContent ? (
                                    <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-muted/10">
                                        {fullContent}
                                    </div>
                                ) : (
                                    <div className="flex-1 grid grid-cols-5 min-h-0">
                                        {/* Left: Document tabs */}
                                        <div className="col-span-3 border-r border-border flex flex-col min-h-0">
                                            {leftPanelOverride ?? <DefaultDocTabs stage={stage} flowProgress={flowProgress} />}
                                        </div>

                                        {/* Right: Stage-adaptive panel */}
                                        <div className="col-span-2 flex flex-col min-h-0 overflow-hidden">
                                            {(() => {
                                                if (rightPanelOverride) {
                                                    return (
                                                        <>
                                                            <div className="flex-1 overflow-y-auto p-5">{rightPanelOverride}</div>
                                                        </>
                                                    )
                                                }
                                                // Flow 1 · intake assign · owns its own CTA
                                                if (stage === 'intake' || stage === 'intake-complete') {
                                                    return (
                                                        <IntakeAssignPanel
                                                            stage={stage}
                                                            assignedDesigner={assignedDesigner ?? null}
                                                            onAssignDesigner={onAssignDesigner}
                                                            onValidate={onValidate}
                                                        />
                                                    )
                                                }
                                                // Flow 2 · interactive panels (each owns its own CTA)
                                                if (stage === 'design')     return <DesignBOMPanel onValidate={onValidate} onBOMUploaded={markBomUploaded} onValidationStarted={markValidationStarted} onValidationCompiled={markValidationDone} onClientApproved={markClientApproved} bomUploaded={flowProgress.bomUploaded} />
                                                if (stage === 'sq-check')   return <SQCheckPanel onValidate={onValidate} />
                                                // Flow 3 · 2 interactive panels
                                                if (stage === 'teknion-preview') return <TeknionPreviewPanel onValidate={onValidate} />
                                                if (stage === 'spec-gap')        return <SpecGapResolvePanel onValidate={onValidate} />
                                                // Flow 4 · sc1.6 Self-audit · designer-led 5-step audit + peer assignment
                                                if (stage === 'self-audit')      return <SelfAuditScene onValidate={onValidate} peerName={peerReviewerName ?? null} onAssignPeerReviewer={onAssignPeerReviewer ?? (() => {})} />
                                                // Flow 5 · sc1.8 submission email + sc1.8b NetSuite/PO handoff
                                                if (stage === 'submission')      return <SubmissionEmailPanel onValidate={onValidate} />
                                                if (stage === 'handoff')         return <HandoffPanel onValidate={onValidate} />
                                                // ─── L&D Flow (sc-LD.0–sc-LD.7) ─────────────────────────
                                                if (stage === 'ld-rfp-intake')    return <RFPIntakePanel onValidate={onValidate} />
                                                if (stage === 'ld-takeoff')       return <TakeoffPanel onValidate={onValidate} />
                                                if (stage === 'ld-conditions')    return <ConditionsChecklistPanel onValidate={onValidate} />
                                                if (stage === 'ld-vendor-pool')   return <VendorPoolSelector onValidate={onValidate} selectedVendorIds={selectedVendorIds ?? null} onSelectVendors={onSelectVendors ?? (() => {})} />
                                                if (stage === 'ld-bid-send')      return <BidRequestPanel onValidate={onValidate} selectedVendorIds={selectedVendorIds ?? null} />
                                                if (stage === 'ld-bid-compare')   return <BidComparisonPanel onValidate={onValidate} />
                                                if (stage === 'ld-winner-select') return <WinnerSelectPanel onValidate={onValidate} winnerVendorId={winnerVendorId ?? null} onSelectWinner={onSelectWinner ?? (() => {})} />
                                                if (stage === 'ld-final-upload')  return <FinalQuotePanel onValidate={onValidate} />
                                                // ─── Sales Flow (sc-S.0–sc-S.7) ──────────────────────
                                                if (stage === 'sales-inbox')     return <SalesInboxTriagePanel onValidate={onValidate} />
                                                if (stage === 'sales-intake')    return <SalesOppIntakePanel onValidate={onValidate} />
                                                if (stage === 'sales-capacity')  return <SalesCapacityPanel onValidate={onValidate} />
                                                if (stage === 'sales-assign')    return <SalesAssignmentPanel onValidate={onValidate} />
                                                if (stage === 'sales-discovery') return <SalesDiscoveryPanel onValidate={onValidate} />
                                                if (stage === 'sales-outreach')  return <SalesOutreachPanel onValidate={onValidate} />
                                                if (stage === 'sales-proposal')  return <SalesProposalPanel onValidate={onValidate} />
                                                if (stage === 'sales-handoff')   return <SalesHandoffPanel onValidate={onValidate} />
                                                // Default · static description + Approve & Continue
                                                return (
                                                    <>
                                                        <div className="flex-1 overflow-y-auto p-5">
                                                            <DefaultStagePanel stage={stage} onValidate={onValidate} />
                                                        </div>
                                                        <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                                                            <button
                                                                type="button"
                                                                onClick={onValidate}
                                                                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
                                                            >
                                                                Approve & Continue
                                                                <ArrowRight className="h-4 w-4" />
                                                            </button>
                                                        </div>
                                                    </>
                                                )
                                            })()}
                                        </div>
                                    </div>
                                )}
                            </DialogPanel>
                        </TransitionChild>
                    </div>
                </div>
            </Dialog>
        </Transition>
    )
}

// ─── Default doc tabs (left panel) ─────────────────────────────────────────────

function DefaultDocTabs({ stage, flowProgress }: { stage: OfficeworksReviewStage; flowProgress: FlowProgress }) {
    const baseTabIds = STAGE_TABS[stage] ?? DEFAULT_TAB_SET
    const visibleTabIds: DocTab[] = [...baseTabIds]
    // Sales-* stages render only their stage-specific tabs · the dynamic
    // BOM / Validation Doc tabs belong to the Spec Check flow and would leak
    // here once the user has navigated through sc1.2 in the same session.
    const isSalesStage = stage.startsWith('sales-')
    // Dynamic tabs · appear once their artifact exists.
    if (!isSalesStage && flowProgress.bomUploaded && !visibleTabIds.includes('bom')) visibleTabIds.push('bom')
    if (!isSalesStage && (flowProgress.validationStarted || flowProgress.validationCompiled) && !visibleTabIds.includes('validation')) visibleTabIds.push('validation')
    const visibleTabs = DOC_TABS.filter(t => visibleTabIds.includes(t.id))
    const [activeTab, setActiveTab] = useState<DocTab>(DEFAULT_DOC[stage])

    // Reset activeTab when stage changes · otherwise navigating from sc1.2
    // (which sets activeTab='bom') to sc-S.0 leaves the BOM preview visible
    // even though the tab bar no longer shows BOM.
    useEffect(() => {
        setActiveTab(DEFAULT_DOC[stage])
    }, [stage])

    // Auto-surface the BOM tab the moment the upload completes (bomUploaded → true).
    // Only relevant in Spec Check flow · sales-* stages don't have a BOM tab.
    useEffect(() => {
        if (flowProgress.bomUploaded && !isSalesStage) setActiveTab('bom')
    }, [flowProgress.bomUploaded, isSalesStage])

    // "View in BOM" / "View floor plan" links anywhere in the modal surface their tab.
    useEffect(() => {
        const surfaceBom = () => setActiveTab('bom')
        const surfaceFloorPlan = () => setActiveTab('floor-plan')
        const surfaceValidation = () => setActiveTab('validation')
        window.addEventListener('officeworks:bom-tab-focus', surfaceBom)
        window.addEventListener('officeworks:floor-plan-focus', surfaceFloorPlan)
        window.addEventListener('officeworks:validation-tab-focus', surfaceValidation)
        return () => {
            window.removeEventListener('officeworks:bom-tab-focus', surfaceBom)
            window.removeEventListener('officeworks:floor-plan-focus', surfaceFloorPlan)
            window.removeEventListener('officeworks:validation-tab-focus', surfaceValidation)
        }
    }, [])

    return (
        <>
            {/* Tab bar · hidden when only 1 tab is visible (e.g. sc-S.0 only
                shows Thread Detail · the tab label would just look like a
                repeated title above the content). */}
            {visibleTabs.length > 1 && (
            <div className="flex items-center gap-0 border-b border-border bg-muted/30 shrink-0 px-4 pt-2 overflow-x-auto">
                {visibleTabs.map(tab => {
                    const isDynamic = (tab.id === 'bom' && flowProgress.bomUploaded)
                                   || (tab.id === 'validation' && flowProgress.validationCompiled)
                    const isBaseTab = baseTabIds.includes(tab.id)
                    const justArrived = isDynamic && !isBaseTab
                    return (
                        <button
                            key={tab.id}
                            type="button"
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold border-b-2 mr-1 shrink-0 transition-colors ${
                                activeTab === tab.id
                                    ? 'border-primary text-foreground'
                                    : 'border-transparent text-muted-foreground hover:text-foreground'
                            } ${justArrived ? 'animate-in fade-in slide-in-from-right-1 duration-300' : ''}`}
                        >
                            <tab.icon className="h-3 w-3" />
                            {tab.label}
                            {justArrived && (
                                <span className="ml-1 text-[8px] font-bold uppercase tracking-wider bg-success/15 text-success border border-success/30 rounded px-1 py-0 animate-pulse">
                                    new
                                </span>
                            )}
                        </button>
                    )
                })}
            </div>
            )}

            {/* Tab content */}
            <div className="flex-1 min-h-0">
                <DocTabContent tab={activeTab} stage={stage} flowProgress={flowProgress} />
            </div>
        </>
    )
}

// ─── Doc tab content dispatch (real previews) ─────────────────────────────────

function DocTabContent({ tab, stage, flowProgress }: { tab: DocTab; stage: OfficeworksReviewStage; flowProgress: FlowProgress }) {
    if (tab === 'works-form') return <WorksFormPreview stage={stage} />
    if (tab === 'bom') return <BOMPreview stage={stage} bomUploaded={flowProgress.bomUploaded} />
    if (tab === 'validation') return <ValidationDocPreview validationCompiled={flowProgress.validationCompiled} clientApproved={flowProgress.clientApproved} />
    if (tab === 'floor-plan') return <FloorPlanPreview stage={stage} />
    if (tab === 'attachments') return <AttachmentsPreview stage={stage} />
    if (tab === 'ack') return <AckPreview stage={stage} />
    // ─── L&D doc previews ──────────────────────────────────────────────────
    if (tab === 'ld-sif')                return <LDSifPreview />
    if (tab === 'ld-cover-letter')       return <LDCoverLetterPreview />
    if (tab === 'ld-takeoff-report')     return <LDTakeoffReportPreview />
    if (tab === 'ld-conditions-record')  return <LDConditionsRecordPreview />
    if (tab === 'ld-vendor-pool')        return <LDVendorPoolPreview />
    if (tab === 'ld-bid-request')        return <LDBidRequestPreview />
    if (tab === 'ld-internal-benchmark') return <LDInternalBenchmarkPreview />
    if (tab === 'ld-bids-received')      return <LDBidsReceivedPreview />
    if (tab === 'ld-scorecard')          return <LDScorecardPreview />
    if (tab === 'ld-notifications')      return <LDNotificationsPreview />
    if (tab === 'ld-excel-quote')        return <LDExcelQuotePreview />
    if (tab === 'ld-portal-status')      return <LDPortalStatusPreview />
    // ─── Sales doc previews ────────────────────────────────────────────────
    if (tab === 'sales-inbox-feed')       return <SalesInboxFeedPreview />
    if (tab === 'sales-thread-detail')    return <SalesThreadDetailPreview />
    if (tab === 'sales-opp-record')       return <SalesOppRecordPreview stage={stage} />
    if (tab === 'sales-capacity-ledger')  return <SalesCapacityLedgerPreview />
    if (tab === 'sales-assignment')       return <SalesAssignmentPreview />
    if (tab === 'sales-discovery-notes')  return <SalesDiscoveryNotesPreview />
    if (tab === 'sales-account-history')  return <SalesAccountHistoryPreview />
    if (tab === 'sales-outreach-draft')   return <SalesOutreachDraftPreview />
    if (tab === 'sales-proposal-pdf')     return <SalesProposalPDFPreview />
    if (tab === 'sales-quote-detail')     return <SalesQuoteDetailPreview />
    if (tab === 'sales-win-loss')         return <SalesWinLossPreview />
    if (tab === 'sales-handoff-packet')   return <SalesHandoffPacketPreview />
    return null
}

// ─── Works Form preview · highlights missing fields at intake ────────────────

interface FormField {
    label: string
    value: string | null
    status: 'complete' | 'missing'
    required: boolean
    note?: string
}

function WorksFormPreview({ stage }: { stage: OfficeworksReviewStage }) {
    // Only at sc1.0 (intake) are CAD + SQ missing. From sc1.0b (intake-complete) onward
    // the reply arrived and the form is complete.
    const isIntakePending = stage === 'intake'
    const isIntakeComplete = stage === 'intake-complete'
    const cadValue = isIntakePending
        ? null
        : isIntakeComplete
            ? 'manatt-4th-floor.dwg · received 2026-04-17 11:08 from Caitlin'
            : 'manatt-4th-floor.dwg · received 18h after submission'

    const fields: FormField[] = [
        { label: 'Client', value: 'Manatt Phelps & Phillips LLP', status: 'complete', required: true },
        { label: 'Project', value: 'MANATT · 4th Floor · Workstations', status: 'complete', required: true },
        { label: 'Market', value: 'DC (Washington D.C.)', status: 'complete', required: true },
        { label: 'Scope', value: '~30 workstations · Standard/Large', status: 'complete', required: true },
        { label: 'Submitted by', value: 'Caitlin Barolet · DC Salesrep', status: 'complete', required: true },
        { label: 'Co-submitter', value: 'Danielle Dunlap', status: 'complete', required: false },
        { label: 'CAD file (.dwg)', value: cadValue, status: isIntakePending ? 'missing' : 'complete', required: true, note: isIntakePending ? 'Required to start design in CET' : undefined },
        { label: 'PDF floor plan', value: 'manatt-4th-floor-floorplan.pdf', status: 'complete', required: false },
        { label: 'SQ number (price-protected)', value: isIntakePending ? null : `#${MANATT_ORDER_META.specialQuote}`, status: isIntakePending ? 'missing' : 'complete', required: true, note: isIntakePending ? 'GSA client · price protection required' : undefined },
        { label: 'Catalog effective', value: isIntakePending ? 'Strata suggests 2025' : '2025', status: 'complete', required: true },
        { label: 'Due date', value: '2026-03-20 (Sched Ship)', status: 'complete', required: true },
    ]

    const missingCount = fields.filter(f => f.status === 'missing').length

    return (
        <div className="h-full overflow-y-auto p-6 bg-muted/20">
            <div className="bg-card border border-border rounded-xl overflow-hidden max-w-2xl mx-auto">
                {/* Header */}
                <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Google Form · Works Intake</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Submitted 2026-04-16 · auto-routed to 3 design managers</div>
                    </div>
                    {isIntakePending && missingCount > 0 && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning border border-warning/20 rounded-md px-2 py-1 animate-pulse">
                            {missingCount} missing
                        </span>
                    )}
                    {isIntakeComplete && (
                        <span className="text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 rounded-md px-2 py-1">
                            Complete
                        </span>
                    )}
                </div>

                {/* AI helper line at intake */}
                {isIntakePending && missingCount > 0 && (
                    <div className="px-4 py-2 bg-ai/5 border-b border-ai/20 flex items-start gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-ai shrink-0 mt-0.5" />
                        <div className="text-[11px] text-ai">
                            <span className="font-bold">Strata flagged {missingCount} missing required fields</span> · email drafted to Caitlin Barolet · CAD must arrive before design can start in CET (Task 3)
                        </div>
                    </div>
                )}

                {/* Form fields */}
                <div className="divide-y divide-border">
                    {fields.map((f, i) => (
                        <div
                            key={i}
                            className={`px-4 py-2.5 grid grid-cols-3 gap-3 items-center text-sm ${
                                f.status === 'missing' ? 'bg-warning/5' : ''
                            }`}
                        >
                            <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                                {f.label}
                                {f.required && <span className="text-destructive">*</span>}
                            </div>
                            <div className="col-span-2 flex items-center justify-between gap-2">
                                <span className={`text-sm flex-1 truncate ${
                                    f.status === 'missing' ? 'text-warning italic' : 'text-foreground'
                                }`}>
                                    {f.value ?? '— required —'}
                                </span>
                                {f.status === 'missing' ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning border border-warning/30 rounded px-1.5 py-0.5 shrink-0 animate-pulse">
                                        <AlertCircle className="h-3 w-3" />
                                        Missing
                                    </span>
                                ) : (
                                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                                )}
                            </div>
                            {f.note && (
                                <div className="col-span-3 text-[10px] text-warning italic pl-2 -mt-1">{f.note}</div>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="px-4 py-2.5 bg-muted/30 border-t border-border text-[10px] text-muted-foreground text-center">
                    The Works form (intranet) · auto-routes to all 3 design managers · 24-48h assignment SLA (not enforced)
                </div>
            </div>
        </div>
    )
}

// ─── BOM tab ──────────────────────────────────────────────────────────────────

function BOMPreview({ bomUploaded }: { stage: OfficeworksReviewStage; bomUploaded: boolean }) {
    // BOM tab is invisible until the designer uploads (see DefaultDocTabs), but
    // if the tab is forced open (e.g., via dev), show a clear placeholder.
    if (!bomUploaded) {
        return (
            <div className="h-full flex items-center justify-center p-6 bg-muted/20">
                <div className="bg-card border border-dashed border-border rounded-xl p-8 max-w-md text-center space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                        <ClipboardCheck className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-foreground">BOM not yet uploaded</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                            The designer builds the BOM externally in CET / CAP and uploads the file (.pdf, .sp4, .xlsx) to Strata. Awaiting upload in the right panel.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="h-full flex flex-col bg-muted/20">
            <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2 shrink-0">
                <ClipboardCheck className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    MANATT-4F_BOM_v1.pdf · 149 line items · $1,541,392 List
                </div>
                <span className="ml-auto text-[10px] text-success font-medium">Uploaded</span>
            </div>
            <iframe
                // #navpanes=0 hides the native thumbnail sidebar · view=FitH fits page width
                src={`${OFFICEWORKS_PDFS.manattBOM}#navpanes=0&view=FitH`}
                title="MANATT 4F BOM"
                className="flex-1 w-full border-0 bg-card"
            />
        </div>
    )
}

// ─── Validation Doc tab ───────────────────────────────────────────────────────

// Strata's analysis of the validation document the designer attached.
// 6 sections detected across 24 slides · order matches typical OW Validation Doc.
const VALIDATION_DOC_SECTIONS = [
    { page: 1,  title: 'Overall floor plan',  detail: 'CAD-aligned · 71 stations across 4 workstation groups',         iconKey: 'plan' },
    { page: 4,  title: '2D drawings',          detail: 'Workstation typicals + dimensions for each room type',          iconKey: 'draw' },
    { page: 9,  title: '3D renderings',        detail: 'Photo-real preview of the finished space',                      iconKey: 'cube' },
    { page: 14, title: 'Finishes catalog',     detail: 'Mica Very White 83 · Smooth Felt Admiral Blue · Flintwood 5N',  iconKey: 'palette' },
    { page: 18, title: 'Wire management',      detail: 'E-chain · cable wrap · power cubes · monitor arms',             iconKey: 'cable' },
    { page: 21, title: 'Electrical layout',    detail: 'Washington D.C. code · base feed visible · Power Spine 120',    iconKey: 'zap' },
] as const

function SectionIcon({ iconKey }: { iconKey: string }) {
    const cls = 'h-3.5 w-3.5 text-muted-foreground shrink-0'
    if (iconKey === 'plan')    return <MapPin       className={cls} aria-hidden="true" />
    if (iconKey === 'draw')    return <FileText     className={cls} aria-hidden="true" />
    if (iconKey === 'cube')    return <ImageIcon    className={cls} aria-hidden="true" />
    if (iconKey === 'palette') return <Sparkles     className={cls} aria-hidden="true" />
    if (iconKey === 'cable')   return <Search       className={cls} aria-hidden="true" />
    if (iconKey === 'zap')     return <ShieldCheck  className={cls} aria-hidden="true" />
    return <FileText className={cls} aria-hidden="true" />
}

interface ValidationDocPreviewProps {
    validationCompiled: boolean
    clientApproved?: boolean
}

function ValidationDocPreview({ validationCompiled, clientApproved = false }: ValidationDocPreviewProps) {
    const [downloadState, setDownloadState] = useState<'idle' | 'downloading' | 'done'>('idle')
    const [sendInfoVisible, setSendInfoVisible] = useState(false)

    if (!validationCompiled) {
        return (
            <div className="h-full flex items-center justify-center p-6 bg-muted/20">
                <div className="bg-card border border-dashed border-border rounded-xl p-8 max-w-md text-center space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto" aria-hidden="true">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-foreground">Validation document not yet attached</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                            The designer prepares the presentation outside Strata (Google Slides, PowerPoint, etc.) and attaches it here. Send it from the right panel to populate this tab.
                        </p>
                    </div>
                </div>
            </div>
        )
    }

    const handleDownload = () => {
        setDownloadState('downloading')
        setTimeout(() => setDownloadState('done'), 1200)
    }

    const handleSend = () => {
        setSendInfoVisible(true)
        setTimeout(() => setSendInfoVisible(false), 2400)
    }

    return (
        <div className="h-full overflow-y-auto p-4 bg-muted/20 space-y-4">
            {/* File card · the uploaded presentation */}
            <section
                aria-label="Validation document"
                className="bg-card border border-border rounded-xl overflow-hidden max-w-2xl mx-auto"
            >
                <div className="px-4 py-3 flex items-start gap-3">
                    <div className="h-11 w-11 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0" aria-hidden="true">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-foreground truncate">MANATT-Validation-Doc-v1.pptx</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 rounded px-1.5 py-0.5 shrink-0">
                                Uploaded
                            </span>
                            {clientApproved && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 rounded px-1.5 py-0.5 shrink-0">
                                    Approved by client
                                </span>
                            )}
                            {!clientApproved && (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-warning/10 text-warning border border-warning/20 rounded px-1.5 py-0.5 shrink-0">
                                    Awaiting approval
                                </span>
                            )}
                        </div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                            1.8 MB · 24 slides · attached by Designer
                        </div>
                    </div>
                </div>
                <div className="border-t border-border px-4 py-2.5 flex items-center gap-2 bg-muted/20">
                    <button
                        type="button"
                        onClick={handleDownload}
                        disabled={downloadState === 'downloading'}
                        aria-label="Download MANATT validation document"
                        aria-busy={downloadState === 'downloading'}
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors disabled:opacity-60"
                    >
                        {downloadState === 'downloading' && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
                        {downloadState === 'done' && <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />}
                        {downloadState === 'idle' && <Paperclip className="h-3.5 w-3.5" aria-hidden="true" />}
                        {downloadState === 'idle' && 'Download'}
                        {downloadState === 'downloading' && 'Downloading…'}
                        {downloadState === 'done' && 'Downloaded'}
                    </button>
                    <button
                        type="button"
                        onClick={handleSend}
                        aria-label="Re-send validation document to client"
                        className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors"
                    >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        Send
                    </button>
                    {sendInfoVisible && (
                        <span role="status" className="text-[10px] italic text-muted-foreground animate-in fade-in duration-200">
                            Resend opens from the right panel
                        </span>
                    )}
                </div>
            </section>

            {/* Strata's page analysis · replaces the old empty card grid */}
            <section
                aria-label="Validation document section analysis by Strata"
                className="bg-card border border-border rounded-xl overflow-hidden max-w-2xl mx-auto"
            >
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                    <Sparkles className="h-3.5 w-3.5 text-ai" aria-hidden="true" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                        Strata read the document · 6 sections detected
                    </span>
                </div>
                <ul className="divide-y divide-border">
                    {VALIDATION_DOC_SECTIONS.map(s => (
                        <li key={s.page} className="px-4 py-2.5 flex items-start gap-3">
                            <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-7 shrink-0 mt-0.5" aria-hidden="true">
                                {String(s.page).padStart(2, '0')}.
                            </span>
                            <span className="mt-0.5">
                                <SectionIcon iconKey={s.iconKey} />
                            </span>
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-medium text-foreground">
                                    <span className="sr-only">Page {s.page}: </span>{s.title}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">{s.detail}</div>
                            </div>
                        </li>
                    ))}
                </ul>
            </section>
        </div>
    )
}

// ─── Floor Plan tab · BlueprintFloorPlan shared SVG (lifted from BFI) ─────────

function FloorPlanPreview({ stage }: { stage: OfficeworksReviewStage }) {
    const isIntakePending = stage === 'intake'
    const isIntakeComplete = stage === 'intake-complete'
    const headerLabel = isIntakePending
        ? 'PDF Floor Plan · manatt-4th-floor-floorplan.pdf'
        : isIntakeComplete
            ? 'PDF Floor Plan + CAD · manatt-4th-floor.dwg attached'
            : 'CAD Floor Plan'
    return (
        <div className="h-full overflow-y-auto p-4 bg-muted/20">
            <div className="bg-card border border-border rounded-xl overflow-hidden max-w-3xl mx-auto">
                <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                            {headerLabel}
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">MANATT 4th Floor · 71 stations · WS-01(10) + WS-02(6)×2 + WS-02.A(8)</div>
                    </div>
                    {isIntakePending && (
                        <span className="text-[10px] text-muted-foreground font-medium">PDF · 4 pages · 2.1 MB</span>
                    )}
                    {isIntakeComplete && (
                        <span className="text-[10px] text-success font-medium">PDF + .dwg received ✓</span>
                    )}
                    {!isIntakePending && !isIntakeComplete && (
                        <span className="text-[10px] text-success font-medium">CAD verified ✓</span>
                    )}
                </div>
                <div className="p-4 bg-muted/10">
                    <BlueprintFloorPlan
                        locationLabel="Architectural Layout · MANATT 4th Floor"
                        zoneALabel="ZONE A · WORKSTATIONS WS-01/WS-02 ×22"
                        zoneBLabel="ZONE B · CONFERENCE + BREAK"
                        zoneCLabel="ZONE C · WS-02.A ×8 + STORAGE"
                        footerLabel={`Manatt Phelps & Phillips LLP · ${MANATT_ORDER_META.poNumber} · by Caitlin Barolet`}
                    />
                </div>
                <div className="px-4 py-2.5 bg-muted/30 border-t border-border text-[10px] text-muted-foreground text-center">
                    {MANATT_ORDER_META.sqName} · {MANATT_ORDER_META.poNumber} · DC market · 4th Floor
                </div>
            </div>
        </div>
    )
}

// ─── Attachments tab · file list with status (intake-only) ────────────────────

function AttachmentsPreview({ stage }: { stage: OfficeworksReviewStage }) {
    const isIntakePending = stage === 'intake'
    const files = [
        {
            name: 'manatt-4th-floor-floorplan.pdf',
            kind: 'PDF',
            meta: 'Received with form · 2026-04-16 · 2.1 MB',
            status: 'attached' as const,
        },
        {
            name: 'manatt-4th-floor.dwg',
            kind: 'CAD',
            meta: isIntakePending
                ? 'Required to start design in CET (Task 3)'
                : 'Received from Caitlin · 2026-04-17 11:08 · 4.8 MB',
            status: (isIntakePending ? 'missing' : 'attached') as 'missing' | 'attached',
        },
    ]
    return (
        <div className="h-full overflow-y-auto p-4 bg-muted/20">
            <div className="bg-card border border-border rounded-xl overflow-hidden max-w-2xl mx-auto">
                <div className="px-4 py-3 border-b border-border bg-muted/40 flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">
                        <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Attachments</div>
                        <div className="text-[10px] text-muted-foreground mt-0.5">Files submitted with the Works form · auto-routed for review</div>
                    </div>
                </div>

                <div className="divide-y divide-border">
                    {files.map(f => (
                        <div key={f.name} className={`px-4 py-3 flex items-center gap-3 ${f.status === 'missing' ? 'bg-warning/5' : ''}`}>
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${
                                f.status === 'missing' ? 'bg-warning/10 text-warning' : 'bg-success/10 text-success'
                            }`}>
                                {f.status === 'missing' ? <AlertCircle className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-semibold text-foreground truncate">
                                    {f.name}
                                </div>
                                <div className={`text-[10px] mt-0.5 ${f.status === 'missing' ? 'text-warning italic' : 'text-muted-foreground'}`}>
                                    {f.meta}
                                </div>
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-wider rounded px-2 py-1 shrink-0 ${
                                f.status === 'missing'
                                    ? 'bg-warning/10 text-warning border border-warning/30 animate-pulse'
                                    : 'bg-success/10 text-success border border-success/30'
                            }`}>
                                {f.status === 'missing' ? 'Missing' : 'Attached'}
                            </span>
                        </div>
                    ))}
                </div>

                {isIntakePending ? (
                    <div className="px-4 py-3 bg-ai/5 border-t border-ai/20 flex items-start gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-ai shrink-0 mt-0.5" />
                        <div className="text-[11px] text-ai">
                            <span className="font-bold">Clarification email drafted to Caitlin Barolet.</span> CAD must arrive before design can start in CET (Task 3).
                        </div>
                    </div>
                ) : (
                    <div className="px-4 py-3 bg-success/5 border-t border-success/20 flex items-start gap-2">
                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                        <div className="text-[11px] text-success">
                            <span className="font-bold">Caitlin replied · CAD and SQ resolved.</span> Form is complete · proceed to designer assignment.
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── Acknowledgment tab · real PDF iframe at ack-review · placeholder otherwise ─

function AckPreview({ stage }: { stage: OfficeworksReviewStage }) {
    if (stage !== 'ack-review') {
        return (
            <div className="h-full flex items-center justify-center p-6 bg-muted/20">
                <div className="bg-card border border-dashed border-border rounded-xl p-8 max-w-md text-center space-y-3">
                    <div className="h-12 w-12 rounded-xl bg-muted text-muted-foreground flex items-center justify-center mx-auto">
                        <FileWarning className="h-6 w-6" />
                    </div>
                    <div>
                        <h4 className="text-sm font-semibold text-foreground">Acknowledgment not yet received</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                            Teknion acknowledgment arrives after the Sales Coordinator releases the PO (stage <span className="font-mono">handoff</span>).
                            Currently at stage <span className="font-mono">{stage}</span>.
                        </p>
                    </div>
                </div>
            </div>
        )
    }
    return (
        <div className="h-full flex flex-col bg-muted/20">
            <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2 shrink-0">
                <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                <div className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                    Real Teknion Acknowledgment · {MANATT_ORDER_META.poNumber}
                </div>
                <span className="ml-auto text-[10px] text-success font-medium">Universal #{MANATT_ORDER_META.universal}</span>
            </div>
            <iframe
                src={OFFICEWORKS_PDFS.poAcknowledgment}
                title="PO-DC-0009642 Acknowledgment"
                className="flex-1 w-full border-0 bg-card"
            />
        </div>
    )
}

// ─── Default right panel (used for stages without a hero override) ─────────────

interface PanelProps { stage: OfficeworksReviewStage; onValidate: () => void }

function DefaultStagePanel({ stage }: PanelProps) {
    const intro: Record<OfficeworksReviewStage, { headline: string; body: React.ReactNode; cta?: string }> = {
        'intake': {
            headline: 'Form completeness · Assign designer',
            body: <>
                <p>Caitlin Barolet submitted the Works form for MANATT 4th Floor. <span className="text-warning font-medium">CAD file missing</span>, <span className="text-warning font-medium">SQ blank</span>.</p>
                <p className="mt-2">Strata drafted a clarifying email to Caitlin and surfaced the capacity heatmap. Felicia reviews the form and assigns the designer (GW1 soft check).</p>
            </>,
            cta: 'Request CAD + assign designer',
        },
        'design': {
            headline: 'CET layout in progress',
            body: <p>Kimberly drawing 32 typicals across 4 tag groups (WS-01/02/02/02.A) · Level 4. Teknion part library loaded. <span className="font-medium">Optional DDP parallel:</span> Prepare Deep Discounting BOM for volume discount negotiation.</p>,
            cta: 'Export to CAP',
        },
        'bom-gen': {
            headline: 'CAP exports BOM · 71 line items',
            body: <p>Specifications + electrical coordination embedded here (not standalone steps). Subtotals grouped per Tag (Alias 1) + Level 4 (Alias 2). List Total ${MANATT_ORDER_META.listTotal.toLocaleString()}.</p>,
            cta: 'Continue to validation',
        },
        'validation': {
            headline: 'Client approval gate (GW2A)',
            body: <p>Google Slides validation doc compiled (2D/3D drawings, finishes, electrical). Sent to MANATT for approval. <span className="text-warning font-medium">Primary delay driver.</span> If revisions: layout change → Task 3 (CET) · BOM-only → Task 4 (CAP).</p>,
            cta: 'Client approved · proceed',
        },
        'field-verify': {
            headline: 'Field verification (PM handoff)',
            body: <p>Pre-installation drawings (2D dimensions + blocking + electrical) sent to Abigail's PM team. Field verification happens <span className="font-medium">BEFORE order placed</span> with Teknion. Confirms GC built space to spec.</p>,
            cta: 'Field verification complete',
        },
        'sq-check': {
            headline: 'SQ #436533 · price-protected GSA',
            body: <p>MANATT is a price-protected law firm. Strata embeds the Teknion Create platform inline (no context switch · SC3 dramatized). Verifying SQ #436533 + 2025 catalog effective date.</p>,
            cta: 'Confirm SQ · use 2025 catalog',
        },
        'teknion-preview': {
            headline: 'Order Preview submitted to Tifani',
            body: <p>Form auto-filled from BOM. Submitted. Tifani's typical turnaround 1-2 weeks. <span className="font-medium">GW3 outcomes:</span> clean → audit · spec gap → Task 7A · timeline conflict → Task 7B phasing.</p>,
            cta: 'Clean response · proceed to audit',
        },
        'spec-gap': {
            headline: 'Resolve specification gaps',
            body: <p>Tifani flagged a spec gap on a 40-day CR. Strata suggests the fix · designer accepts/edits · BOM revised · preview resubmitted (sub-loop back to GW3).</p>,
            cta: 'Apply fix · resubmit preview',
        },
        'phasing': {
            headline: '3-way order phasing huddle',
            body: <p>Teknion can't meet Must-Arrive Date due to 40-day Flintwood CRs. 3-way comms: Designer + PM (Abigail) + Salesperson (Caitlin). Long-lead items phased into subsequent deliveries.</p>,
            cta: 'Phased plan accepted',
        },
        'self-audit':  { headline: 'Self-audit panel', body: <p>Hero panel · see right side.</p> },
        'peer-review': { headline: 'Peer review panel', body: <p>Hero panel · see right side.</p> },
        // 'submission' and 'handoff' are dispatched by SubmissionEmailPanel /
        // HandoffPanel above · these entries are intentionally omitted.
        'submission':  { headline: 'BOM Submission', body: <p>Dispatched · see right panel.</p> },
        'handoff':     { headline: 'NetSuite handoff', body: <p>Dispatched · see right panel.</p> },
        'ack-review':  { headline: 'Acknowledgment review', body: <p>Hero panel · see right side.</p> },
        // L&D stages · all rendered via dedicated full-pane panels (see dispatch).
        'intake-complete': { headline: 'Form complete', body: <p>Dispatched · see right panel.</p> },
        'ld-rfp-intake':   { headline: 'RFP intake panel · CBRE / MANATT 4F', body: <p>Dispatched · see right panel.</p> },
        'ld-takeoff':      { headline: 'AI scope takeoff', body: <p>Dispatched · see right panel.</p> },
        'ld-conditions':   { headline: 'Building & workforce conditions', body: <p>Dispatched · see right panel.</p> },
        'ld-vendor-pool':  { headline: 'Installer pool selection', body: <p>Dispatched · see right panel.</p> },
        'ld-bid-send':     { headline: 'Bid request to 3 installers', body: <p>Dispatched · see right panel.</p> },
        'ld-bid-compare':  { headline: 'Bid evaluation · variance check', body: <p>Dispatched · see right panel.</p> },
        'ld-winner-select':{ headline: 'Select winning installer', body: <p>Dispatched · see right panel.</p> },
        'ld-final-upload': { headline: 'Final quote · upload to portal', body: <p>Dispatched · see right panel.</p> },
        // Sales stages (right panel handled by Sales*Panel components)
        'sales-inbox':     { headline: 'Unified inbox triage', body: <p>Dispatched · see right panel.</p> },
        'sales-intake':    { headline: 'Opportunity intake · pre-flight', body: <p>Dispatched · see right panel.</p> },
        'sales-capacity':  { headline: 'Rep capacity ledger', body: <p>Dispatched · see right panel.</p> },
        'sales-assign':    { headline: 'Rep assignment · SLA gate', body: <p>Dispatched · see right panel.</p> },
        'sales-discovery': { headline: 'Discovery & qualification', body: <p>Dispatched · see right panel.</p> },
        'sales-outreach':  { headline: 'Multi-channel outreach', body: <p>Dispatched · see right panel.</p> },
        'sales-proposal':  { headline: 'Proposal assembly', body: <p>Dispatched · see right panel.</p> },
        'sales-handoff':   { headline: 'Close & handoff to Ops', body: <p>Dispatched · see right panel.</p> },
    }

    const data = intro[stage]

    return (
        <div className="space-y-4 text-sm">
            <div>
                <h4 className="text-base font-semibold text-foreground">{data.headline}</h4>
                <div className="text-muted-foreground mt-2 leading-relaxed">{data.body}</div>
            </div>
        </div>
    )
}

// ─── IntakeAssignPanel · stage-aware: sc1.0 = send clarification · sc1.0b = assign ─

interface IntakeAssignPanelProps {
    stage: OfficeworksReviewStage
    assignedDesigner: string | null
    onAssignDesigner?: (name: string) => void
    onValidate: () => void
}

const REQUEST_MESSAGE = `Hi Caitlin,

Thanks for submitting the Works form for the MANATT 4th Floor build-out. To start the design in CET we need two items before we can route to a designer:

  · CAD floor plan (.dwg) · required for layout in CET (Task 3)
  · SQ number for the GSA price-protected client · Strata suggests #${MANATT_ORDER_META.specialQuote} (catalog 2025) · please confirm

The rest of the form is complete. As soon as the CAD arrives we'll assign and kick off.

— Strata (drafted on behalf of Felicia Miano-Poles · EVP Design & PM)
strata-ai@officeworks.com`

function IntakeAssignPanel({ stage, assignedDesigner, onAssignDesigner, onValidate }: IntakeAssignPanelProps) {
    const isIntakePending = stage === 'intake'
    const isIntakeComplete = stage === 'intake-complete'
    const designerProfile = assignedDesigner ? findDesigner(assignedDesigner) : null
    const [dialogOpen, setDialogOpen] = useState(false)
    const [sizeConfirmed, setSizeConfirmed] = useState(false)

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                {/* Form completeness summary · adapts to stage */}
                <div>
                    <h4 className="text-base font-semibold text-foreground">Form completeness</h4>
                    {isIntakePending ? (
                        <ul className="mt-2 space-y-1.5">
                            <li className="flex items-start gap-2 text-xs text-warning">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span><span className="font-semibold">CAD file missing</span> · Strata drafted email to Caitlin Barolet</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs text-warning">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span><span className="font-semibold">SQ blank</span> · GSA price-protected · Strata suggests SQ #{MANATT_ORDER_META.specialQuote} · catalog 2025</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs text-success">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>All other fields complete · proceed in parallel (GW1 soft check)</span>
                            </li>
                        </ul>
                    ) : (
                        <ul className="mt-2 space-y-1.5">
                            <li className="flex items-start gap-2 text-xs text-success">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span><span className="font-semibold">CAD .dwg received</span> · 4.8 MB · from Caitlin · 2026-04-17 11:08</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs text-success">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span><span className="font-semibold">SQ #{MANATT_ORDER_META.specialQuote} confirmed</span> · GSA price-protected · catalog 2025</span>
                            </li>
                            <li className="flex items-start gap-2 text-xs text-success">
                                <CheckCircle2 className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                                <span>All required fields satisfied · ready for designer assignment</span>
                            </li>
                        </ul>
                    )}
                </div>

                {/* sc1.0 · send clarification block */}
                {isIntakePending && (
                    <div className="border-t border-border pt-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                Missing required information
                            </h4>
                            <span className="text-[10px] uppercase tracking-wider font-bold bg-warning/10 text-warning border border-warning/20 rounded px-2 py-0.5 animate-pulse">
                                Required
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Strata drafted a clarification email to <span className="font-medium text-foreground">Caitlin Barolet</span> requesting the CAD file (.dwg) and SQ number. Designer assignment unlocks once the response arrives.
                        </p>
                        <div className="bg-muted/40 border border-border rounded-lg p-3 text-xs space-y-1">
                            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                Email preview
                            </div>
                            <div className="text-foreground"><span className="text-muted-foreground">To: </span>caitlin.barolet@manatt.com</div>
                            <div className="text-foreground"><span className="text-muted-foreground">Subject: </span>MANATT 4th Floor · clarification needed · CAD file + SQ number</div>
                            <div className="text-muted-foreground line-clamp-2 pt-1">Thanks for submitting the Works form for the MANATT 4th Floor build-out. To start the design in CET we need two items before we can route to a designer…</div>
                        </div>
                    </div>
                )}

                {/* sc1.0b · resolved · designer list */}
                {isIntakeComplete && (() => {
                    const kim = findDesigner('Kimberly Tucker')
                    const kimCap = kim ? computeCapacity(kim) : null
                    const kimRationale = kimCap
                        ? `${kimCap.freeHours}h free this week / ${kimCap.availableHours}h available · prior MANATT · cross-market`
                        : 'prior MANATT · cross-market'
                    return (
                    <div className="border-t border-border pt-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <div className="font-semibold text-success">Caitlin replied with CAD + SQ confirmed · received 2026-04-17 11:08</div>
                                <div className="text-muted-foreground">Ready to assign · Felicia recommends Kimberly Tucker · {kimRationale}</div>
                            </div>
                        </div>

                        {/* Strata project-size identification (GW1B) · DM confirms before assigning */}
                        <div className="rounded-lg border border-ai/20 bg-ai/5 px-3 py-2.5 space-y-2">
                            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                <Sparkles className="h-3 w-3 text-ai" />
                                Strata · project size (GW1B)
                            </div>
                            <div className="text-xs text-foreground">
                                Identified as{' '}
                                <RuleTooltip
                                    rule="GW1B project-size gateway: Small projects (1-5 stations) bypass several design tasks; Standard/Large run the full flow. MANATT is ~30 stations → Standard/Large."
                                    source="Source: officeworks-sot.md (project size) + BPMN gateway GW1B"
                                >
                                    <strong>Standard / Large</strong>
                                </RuleTooltip>
                                {' '}· ~30 stations · full design flow.
                            </div>
                            <label className="flex items-start gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={sizeConfirmed}
                                    onChange={e => setSizeConfirmed(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                                />
                                <span className="text-[11px] text-foreground">Confirm project size · Standard / Large</span>
                            </label>
                        </div>

                        <div className="flex items-center justify-between">
                            <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Users className="h-4 w-4 text-muted-foreground" />
                                Assign designer
                            </h4>
                            {!assignedDesigner && (
                                <span className="text-[10px] uppercase tracking-wider font-bold bg-warning/10 text-warning border border-warning/20 rounded px-2 py-0.5 animate-pulse">
                                    Required
                                </span>
                            )}
                        </div>

                        <CapacityHeatmap
                            onSelect={onAssignDesigner}
                            selectedName={assignedDesigner}
                            highlightName="Kimberly Tucker"
                            priorClientHighlight={{
                                label: 'Worked with MANATT',
                                predicate: d => !!d.priorMANATT,
                            }}
                            compact
                        />

                        {designerProfile && (
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs space-y-1 animate-in fade-in slide-in-from-top-1 duration-300">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-foreground flex items-center gap-1.5">
                                        <UserCheck className="h-3.5 w-3.5 text-foreground/70" />
                                        Assigning to {designerProfile.name}
                                    </span>
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground bg-primary/25 rounded px-1.5 py-0.5">{designerProfile.seniority}</span>
                                </div>
                                <div className="text-muted-foreground grid grid-cols-2 gap-2">
                                    <div><span className="text-[10px] uppercase">Region · </span>{regionLabel(designerProfile.region)}</div>
                                    <div><span className="text-[10px] uppercase">Utilization · </span>{designerProfile.utilization}%</div>
                                    <div><span className="text-[10px] uppercase">Active · </span>{designerProfile.projects.active.length} projects</div>
                                    <div><span className="text-[10px] uppercase">YTD · </span>{designerProfile.projects.completedYTD} completed</div>
                                </div>
                            </div>
                        )}
                    </div>
                    )
                })()}
            </div>

            {/* Footer CTA · stage-aware */}
            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                {isIntakePending && (
                    <button
                        type="button"
                        onClick={() => setDialogOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold transition-colors"
                    >
                        Open & send message
                        <ArrowRight className="h-4 w-4" />
                    </button>
                )}
                {isIntakeComplete && (
                    <button
                        type="button"
                        onClick={onValidate}
                        disabled={!assignedDesigner || !sizeConfirmed}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {assignedDesigner && sizeConfirmed ? (
                            <>
                                Approve & Assign · Continue to Design
                                <ArrowRight className="h-4 w-4" />
                            </>
                        ) : !assignedDesigner ? (
                            'Select a designer to continue'
                        ) : (
                            'Confirm project size to continue'
                        )}
                    </button>
                )}
            </div>

            {/* RequestInfoDialog · only used in sc1.0; on send → advance demo to sc1.0b */}
            {isIntakePending && (
                <RequestInfoDialog
                    isOpen={dialogOpen}
                    onSent={() => { setDialogOpen(false); onValidate() }}
                    onClose={() => setDialogOpen(false)}
                    headerAvatar="CB"
                    headerLabel="Salesperson · DC market"
                    headerSubtitle="caitlin.barolet@manatt.com · Clarification Request"
                    defaults={{
                        from: 'strata-ai@officeworks.com',
                        to: 'caitlin.barolet@manatt.com',
                        cc: 'felicia.miano-poles@officeworks.com · EVP Design & PM',
                        date: '2026-04-16 · 10:48 AM',
                        subject: 'MANATT 4th Floor · clarification needed · CAD file + SQ number',
                        message: REQUEST_MESSAGE,
                        attachments: [{ name: 'manatt-works-form-summary.pdf', meta: '1 page · auto-generated' }],
                        alertTitle: 'Missing Required Information',
                        alertRows: [
                            { label: 'Client',  value: 'Manatt Phelps & Phillips LLP' },
                            { label: 'Project', value: 'MANATT · 4th Floor · ~30 stations' },
                            { label: 'Missing 1', value: 'CAD floor plan (.dwg)' },
                            { label: 'Missing 2', value: `SQ number · GSA price-protected (Strata suggests #${MANATT_ORDER_META.specialQuote})` },
                        ],
                        successTitle: 'Clarification request sent',
                        successSubtitle: 'Awaiting CAD attachment + SQ confirmation',
                    }}
                />
            )}
        </>
    )
}

// ═══════════════════════════════════════════════════════════════════════════
// Flow 2 panels · sc1.2 DesignBOMPanel (BOM upload + analysis + send validation) ·
//                 sc1.4 SQCheckPanel
// Modal stays open across these stages (handled in OfficeworksPage).
// ═══════════════════════════════════════════════════════════════════════════

// ─── sc1.2 DesignBOMPanel · PP2 capacity ledger + BOM upload narrative + PP1 ──

interface DesignBOMPanelProps {
    onValidate: () => void
    onBOMUploaded: () => void
    onValidationStarted: () => void
    onValidationCompiled: () => void
    onClientApproved: () => void
    bomUploaded: boolean
}

// Email body for the unified proposal (BOM + Validation Doc) sent to the client.
const PROPOSAL_MESSAGE = `Hi Caitlin,

Attached please find the proposal for MANATT 4th Floor:
• BOM · 149 line items · $1,541,392 list (Teknion T25)
• Validation Document · 24 slides · floor plan, 2D/3D drawings, finishes, wire mgmt, electrical

Please forward to Felicia at MANATT for sign-off before we proceed to SQ verification and Teknion submission.

Thanks,
Kimberly`

// Bullets shown in 'processing-validation' phase · sub-step 2.
const VALIDATION_BULLETS = [
    'Parsing MANATT-Validation-Doc-v1.pptx · 24 slides',
    'Detecting sections · floor plan · 2D · 3D · finishes · wire · electrical',
    'Cross-referencing with the 149-line BOM finishes',
    '6 sections detected · ready for client review',
]

const LEDGER_EVENTS = [
    { text: 'CET session opened · Kimberly · 11:14 AM', delay: 400 },
    { text: '+6h committed to Kimberly · this week', delay: 900 },
    { text: 'Revision cycle started · WS-02.A typicals',  delay: 1400 },
    { text: 'Capacity ledger sync · 18h committed / 40h available', delay: 1900 },
]

const UPLOAD_BULLETS = [
    'Parsing PDF · 149 line items extracted · 15 pages · Teknion T25',
    '11 areas tagged (WS-01/02/02.A · Office_WO.1/.2/.3 · Office_IO.1/.4 · Focus RM · Wellness · Reception)',
    '22 Custom Requests flagged for spec-check verification',
    'Cross-referencing finish codes · 1 inconsistency surfaced (Item 73 · XS Storm White vs area XG Very White)',
    'Pricing parsed · $1,541,392 List · catalog effective Sep 2025 + Oct 2025 mix',
    'AI BOM Validator queued · 149 × 6 = 894 attribute checks pending',
]

const RELATED_PROCESSES = [
    { label: 'AI BOM Validator', detail: '894 checks queued for self-audit (sc1.6) · PP1 SC2' },
    { label: 'Validation document', detail: 'Google Slides template auto-populated · 11 area sheets ready to compile' },
    { label: 'Pre-install drawings', detail: 'Dimensions + blocking + floor cores per area · ready for Abigail (PM)' },
    { label: 'Capacity ledger', detail: '18h committed updated · feeding live capacity board (PP2 SC5)' },
]

/**
 * Findings derived from the REAL MANATT-4F_BOM_v1.pdf (149 line items, 11
 * areas, 22 CRs, $1.54M list). Each finding has an actual page/item citation
 * the user can verify by clicking "View in BOM" — the iframe of the real PDF
 * loads in the BOM tab and the user can navigate to the cited page.
 */
interface BOMFinding {
    id: string
    severity: 'warning' | 'ai'
    title: string
    detail: string
    source: string
    answer: string
    citation: string
    primary: { label: string; tone: 'success' | 'ai' }
    secondary: string
}

const BOM_FINDINGS: BOMFinding[] = [
    {
        id: 'finish-mismatch',
        severity: 'warning',
        title: 'One panel has the wrong finish · Item 73',
        detail: 'This wall-office panel says "Storm White" but the other 9 panels in the same office area are "Very White". Likely a typo at order entry.',
        source: 'Source: BOM · page 9 · Item 73',
        answer: 'All other panels in this wall office are "Source Laminate · Very White". Item 73 is the only one using "Storm White". Very likely a copy-paste slip when the BOM was generated. Worth confirming with Caitlin before the order goes to Teknion — a wrong finish ships and has to be replaced at install.',
        citation: 'Compared Item 73 against the other 9 panels in the same wall-office area',
        primary: { label: 'Flag for revision', tone: 'success' },
        secondary: 'Keep as-is',
    },
    {
        id: 'cr-2046138',
        severity: 'ai',
        title: 'Custom-made screen needs a quick check · CR 2046138',
        detail: 'A workstation includes a custom solid screen in flintwood White Oak finish · 1 unit · $1,406.',
        source: 'Source: BOM · page 13 · Item 118',
        answer: 'Custom parts from Teknion always need an extra look before sending the order. Open this one in Teknion Create to confirm the design matches what was quoted, the finish is right, and the lead-time fits the install date.',
        citation: 'Teknion Create · CR 2046138 lookup',
        primary: { label: 'Verified · proceed', tone: 'success' },
        secondary: 'Open in Teknion Create',
    },
    {
        id: 'cr-2090148',
        severity: 'ai',
        title: 'Same custom shelf appears in 5 different offices · CR 2090148',
        detail: 'Items 10, 31, 52, 62, 73 — 5 different private offices · $427 each, $2,135 total.',
        source: 'Source: BOM · pages 2-9 · 5 line items',
        answer: 'The same custom shelf modification is repeated across 5 rooms. Worth a quick floor-plan check that each room genuinely needs it (sometimes one room gets duplicated by mistake), then a single lookup in Teknion Create covers all 5 since they share the same part.',
        citation: 'BOM · CR 2090148 on items 10 / 31 / 52 / 62 / 73',
        primary: { label: 'All 5 verified · proceed', tone: 'success' },
        secondary: 'Open in Teknion Create',
    },
]

/** Surface the BOM tab from anywhere in the modal · listened by DefaultDocTabs */
const focusBOMTab = () => window.dispatchEvent(new CustomEvent('officeworks:bom-tab-focus'))

/**
 * Renders the 3 real BOM_FINDINGS in the analyzed phase · same interaction
 * idiom as the checklist rows (expand → "Strata answers" KB popover → Accept marks
 * resolved). Each finding cites a real page/item in the PDF and offers a
 * "View in BOM" link that surfaces the iframe tab via focusBOMTab().
 */
/** Surface the Floor Plan tab · listened by DefaultDocTabs */
const focusFloorPlanTab = () => window.dispatchEvent(new CustomEvent('officeworks:floor-plan-focus'))

/** Surface the Validation Doc tab · listened by DefaultDocTabs */
const focusValidationTab = () => window.dispatchEvent(new CustomEvent('officeworks:validation-tab-focus'))

function BOMFindings() {
    const [resolved, setResolved] = useState<Set<string>>(new Set())
    const [expanded, setExpanded] = useState<string | null>(null)

    const accept = (id: string) => {
        setResolved(prev => new Set(prev).add(id))
        setExpanded(null)
    }

    return (
        <div className="space-y-1.5">
            <div className="flex items-center justify-between">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3 text-ai" />
                    Strata findings · {BOM_FINDINGS.length} flagged
                </div>
                {resolved.size < BOM_FINDINGS.length && (
                    <span className="text-[10px] uppercase tracking-wider font-bold bg-warning/10 text-warning border border-warning/20 rounded px-2 py-0.5">
                        {BOM_FINDINGS.length - resolved.size} to review
                    </span>
                )}
            </div>

            {/* Source of truth · the BOM is checked against the floor plan (AS-IS · Felicia 0:33) */}
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                    <div className="text-[11px] font-bold text-foreground">Verified against · Floor Plan (CET design)</div>
                    <div className="text-[10px] text-muted-foreground mt-0.5">
                        Strata checks the 149 BOM lines against the parts, quantities, finishes &amp; CRs drawn in CET.
                    </div>
                    <button type="button" onClick={focusFloorPlanTab} className="mt-1 text-[10px] font-bold text-foreground bg-primary/20 rounded px-1.5 py-0.5 hover:bg-primary/30 transition-colors">
                        View floor plan ↗
                    </button>
                </div>
            </div>

            {BOM_FINDINGS.map(f => {
                const isResolved = resolved.has(f.id)
                const isExpanded = expanded === f.id
                const SeverityIcon = f.severity === 'warning' ? AlertCircle : Sparkles
                const severityColor = f.severity === 'warning' ? 'text-warning' : 'text-ai'
                const restingBorder = f.severity === 'warning' ? 'border-warning/30 bg-warning/5' : 'border-ai/20 bg-ai/5'
                return (
                    <div key={f.id} className={`rounded-lg border ${isResolved ? 'border-success/30 bg-success/5' : restingBorder}`}>
                        <button
                            type="button"
                            onClick={() => !isResolved && setExpanded(isExpanded ? null : f.id)}
                            disabled={isResolved}
                            className="w-full flex items-start gap-2 px-3 py-2.5 text-left"
                        >
                            {isResolved
                                ? <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                                : <SeverityIcon className={`h-4 w-4 ${severityColor} shrink-0 mt-0.5`} />}
                            <div className="flex-1 min-w-0">
                                <div className={`text-xs font-semibold ${isResolved ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                                    {f.title}
                                </div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">{f.detail}</div>
                                <div className="text-[10px] italic text-muted-foreground mt-0.5">{f.source}</div>
                            </div>
                            {!isResolved && (
                                <span className="text-[10px] font-bold text-foreground bg-primary/20 rounded px-1.5 py-0.5 shrink-0">
                                    {isExpanded ? 'Hide' : 'Strata answers'} {isExpanded ? '▴' : '▾'}
                                </span>
                            )}
                        </button>
                        {isExpanded && !isResolved && (
                            <div className="border-t border-border/60 px-3 py-2.5 space-y-2 animate-in fade-in duration-200">
                                <div className="text-xs text-foreground">{f.answer}</div>
                                <div className="text-[10px] text-muted-foreground italic">{f.citation}</div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <button
                                        type="button"
                                        onClick={() => accept(f.id)}
                                        className={`inline-flex items-center gap-1.5 rounded-md text-[11px] font-bold px-2.5 py-1 border transition-colors ${
                                            f.primary.tone === 'ai'
                                                ? 'bg-ai/15 text-ai border-ai/30 hover:bg-ai/20'
                                                : 'bg-success/15 text-success border-success/30 hover:bg-success/20'
                                        }`}
                                    >
                                        <CheckCircle2 className="h-3 w-3" /> {f.primary.label}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => accept(f.id)}
                                        className="inline-flex items-center rounded-md text-[11px] font-medium px-2.5 py-1 border border-border text-muted-foreground hover:bg-muted/50 transition-colors"
                                    >
                                        {f.secondary}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={focusBOMTab}
                                        className="ml-auto text-[10px] font-bold text-foreground bg-primary/20 rounded px-1.5 py-0.5 hover:bg-primary/30 transition-colors"
                                    >
                                        View in BOM ↗
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function DesignBOMPanel({ onValidate, onBOMUploaded, onValidationStarted, onValidationCompiled, onClientApproved, bomUploaded }: DesignBOMPanelProps) {
    type Phase =
        | 'waiting-bom'
        | 'processing-bom'
        | 'bom-analyzed'
        | 'waiting-validation'
        | 'processing-validation'
        | 'validation-ready'
        | 'sending'
        | 'approved'
    const [phase, setPhase] = useState<Phase>(bomUploaded ? 'bom-analyzed' : 'waiting-bom')
    const [ledgerCount, setLedgerCount] = useState(0)
    const [ddpEnabled, setDdpEnabled] = useState(false)
    const [uploadCount, setUploadCount] = useState(0)
    const [validationCount, setValidationCount] = useState(0)
    const [proposalDialog, setProposalDialog] = useState(false)
    const timeoutsRef = useRef<number[]>([])

    // Phase 'waiting-bom': progressive ledger events
    useEffect(() => {
        if (phase !== 'waiting-bom') return
        setLedgerCount(0)
        LEDGER_EVENTS.forEach((ev, i) => {
            const id = window.setTimeout(() => setLedgerCount(i + 1), ev.delay)
            timeoutsRef.current.push(id)
        })
        return () => {
            timeoutsRef.current.forEach(id => window.clearTimeout(id))
            timeoutsRef.current = []
        }
    }, [phase])

    // Phase 'processing-bom': progressive bullets · then advance to 'bom-analyzed'
    useEffect(() => {
        if (phase !== 'processing-bom') return
        setUploadCount(0)
        UPLOAD_BULLETS.forEach((_, i) => {
            const id = window.setTimeout(() => setUploadCount(i + 1), 500 * (i + 1))
            timeoutsRef.current.push(id)
        })
        const doneId = window.setTimeout(() => {
            setPhase('bom-analyzed')
            onBOMUploaded()  // flips flowProgress.bomUploaded → DefaultDocTabs auto-switches to the BOM tab
        }, 500 * UPLOAD_BULLETS.length + 400)
        timeoutsRef.current.push(doneId)
        return () => {
            timeoutsRef.current.forEach(id => window.clearTimeout(id))
            timeoutsRef.current = []
        }
    }, [phase, onBOMUploaded])

    // Phase 'processing-validation': progressive bullets · then advance to 'validation-ready'
    useEffect(() => {
        if (phase !== 'processing-validation') return
        VALIDATION_BULLETS.forEach((_, i) => {
            const id = window.setTimeout(() => setValidationCount(i + 1), 500 * (i + 1))
            timeoutsRef.current.push(id)
        })
        const doneId = window.setTimeout(() => {
            onValidationCompiled() // flips flowProgress.validationCompiled → fills the Validation Doc tab
            setPhase('validation-ready')
        }, 500 * VALIDATION_BULLETS.length + 400)
        timeoutsRef.current.push(doneId)
        return () => {
            timeoutsRef.current.forEach(id => window.clearTimeout(id))
            timeoutsRef.current = []
        }
    }, [phase, onValidationCompiled])

    // Phase 'sending': 1.5s simulated client wait · then 'approved'
    useEffect(() => {
        if (phase !== 'sending') return
        const id = window.setTimeout(() => {
            onClientApproved()
            setPhase('approved')
        }, 1500)
        timeoutsRef.current.push(id)
        return () => {
            timeoutsRef.current.forEach(t => window.clearTimeout(t))
            timeoutsRef.current = []
        }
    }, [phase, onClientApproved])

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                {/* Capacity ledger ticker · PP2 */}
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-muted-foreground" />
                        <h4 className="text-base font-semibold text-foreground">Live capacity ledger</h4>
                        <span className="text-[10px] text-muted-foreground">· events from CET</span>
                    </div>
                    <div className="bg-muted/30 border border-border rounded-lg p-3 text-xs space-y-1.5 min-h-[120px]">
                        {LEDGER_EVENTS.slice(0, ledgerCount).map((ev, i) => (
                            <div key={i} className="flex items-start gap-2 text-foreground animate-in fade-in slide-in-from-left-1 duration-300">
                                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                                <span>{ev.text}</span>
                            </div>
                        ))}
                        {phase === 'waiting-bom' && ledgerCount < LEDGER_EVENTS.length && (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground italic pt-1">
                                <span className="h-1.5 w-1.5 rounded-full bg-ai animate-pulse" />
                                Waiting for next event…
                            </div>
                        )}
                    </div>
                </div>

                {/* Sub-step 1 · Dropzone BOM + DDP toggle */}
                {phase === 'waiting-bom' && (
                    <>
                        <div className="border-t border-border pt-4 space-y-2">
                            <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                                <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                Sub-step 1 · Upload BOM
                            </h4>
                            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 flex items-start gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                                <span className="text-[11px] text-muted-foreground">
                                    Scope confirmed on the kickoff call · ~30 stations · <span className="font-medium text-foreground">Standard/Large</span> (GW1B) · finishes locked.
                                </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                Kimberly builds the BOM externally in <span className="font-medium text-foreground">CET / CAP</span> and uploads the file to Strata for analysis. Supported: .pdf · .sp4 · .xlsx
                            </p>
                            <button
                                type="button"
                                onClick={() => { focusBOMTab(); setPhase('processing-bom') }}
                                aria-label="Attach BOM file (simulated)"
                                className="w-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-lg p-5 flex flex-col items-center justify-center gap-2 transition-colors"
                            >
                                <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center" aria-hidden="true">
                                    <Paperclip className="h-5 w-5 text-muted-foreground" />
                                </div>
                                <div className="text-xs font-semibold text-foreground">Drop BOM file here · or click to browse</div>
                                <div className="text-[10px] text-muted-foreground italic">Demo · click to simulate the upload of MANATT-4F_BOM_v1.sp4 (212 KB)</div>
                            </button>
                        </div>
                        <div>
                            <label className="flex items-start gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={ddpEnabled}
                                    onChange={e => setDdpEnabled(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
                                />
                                <div>
                                    <div className="text-sm font-semibold text-foreground">Optional · DDP parallel</div>
                                    <div className="text-[11px] text-muted-foreground">Prepare Deep Discounting BOM in parallel for RFP volume negotiation.</div>
                                </div>
                            </label>
                        </div>
                    </>
                )}

                {/* Sub-step 1 · processing BOM bullets */}
                {phase === 'processing-bom' && (
                    <div className="border-t border-border pt-4 space-y-2 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 text-foreground animate-spin" aria-hidden="true" />
                            <h4 className="text-base font-semibold text-foreground">Strata processing BOM upload…</h4>
                        </div>
                        <ul className="space-y-1.5" role="status" aria-live="polite">
                            {UPLOAD_BULLETS.slice(0, uploadCount).map((b, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-foreground animate-in fade-in slide-in-from-left-1 duration-300">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" aria-hidden="true" />
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Sub-step 1 · BOM analyzed · findings + related processes */}
                {phase === 'bom-analyzed' && (
                    <div className="border-t border-border pt-4 space-y-4 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 flex items-start gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                            <div className="text-xs flex-1 min-w-0">
                                <div className="font-semibold text-success">BOM uploaded · 149 line items · $1,541,392 list</div>
                                <div className="text-muted-foreground">
                                    MANATT-4F_BOM_v1.pdf · Teknion T25 · 11 areas · 22 CRs · largest: Office_WO.1 (20 units · $419,660){ddpEnabled ? ' · DDP parallel queued' : ''}
                                </div>
                                <div className="flex items-center gap-2 mt-1.5">
                                    <button type="button" onClick={focusBOMTab} className="text-[10px] font-bold text-foreground bg-primary/20 rounded px-1.5 py-0.5 hover:bg-primary/30 transition-colors">
                                        View in BOM ↗
                                    </button>
                                    <button type="button" onClick={() => setPhase('waiting-bom')} className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground border border-border rounded px-1.5 py-0.5 hover:bg-muted/50 transition-colors">
                                        <Paperclip className="h-3 w-3" aria-hidden="true" /> Replace file
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* BOM Findings · derived from real PDF content · each with citation + KB popover */}
                        <BOMFindings />

                        <div className="space-y-1.5">
                            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Sparkles className="h-3 w-3 text-ai" />
                                Related processes ready
                            </div>
                            {RELATED_PROCESSES.map(p => (
                                <div key={p.label} className="rounded-lg border border-ai/20 bg-ai/5 px-3 py-2">
                                    <div className="text-[11px] font-semibold text-foreground">{p.label}</div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">{p.detail}</div>
                                </div>
                            ))}
                        </div>

                        <div className="text-[10px] text-muted-foreground italic">
                            Tip · click the <strong>BOM</strong> tab on the left to scroll through the real 15-page PDF · each finding above cites a page + item.
                        </div>
                    </div>
                )}

                {/* Sub-step 2 · Dropzone PowerPoint validation deck */}
                {phase === 'waiting-validation' && (
                    <div className="border-t border-border pt-4 space-y-2 animate-in fade-in duration-300">
                        <h4 className="text-base font-semibold text-foreground flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                            Sub-step 2 · Attach validation deck
                        </h4>
                        <p className="text-[11px] text-muted-foreground">
                            Attach the validation deck (Google Slides export, PowerPoint, PDF). Strata reads the sections and prepares them for the client proposal.
                        </p>
                        <button
                            type="button"
                            onClick={() => { focusValidationTab(); setPhase('processing-validation') }}
                            aria-label="Attach validation deck (simulated)"
                            className="w-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-lg p-5 flex flex-col items-center justify-center gap-2 transition-colors"
                        >
                            <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center" aria-hidden="true">
                                <Paperclip className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div className="text-xs font-semibold text-foreground">Drop validation deck here · or click to attach</div>
                            <div className="text-[10px] text-muted-foreground italic">Demo · click to simulate the upload of MANATT-Validation-Doc-v1.pptx (1.8 MB · 24 slides)</div>
                        </button>
                    </div>
                )}

                {/* Sub-step 2 · processing validation bullets */}
                {phase === 'processing-validation' && (
                    <div className="border-t border-border pt-4 space-y-2 animate-in fade-in duration-300">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 text-foreground animate-spin" aria-hidden="true" />
                            <h4 className="text-base font-semibold text-foreground">Strata reading the document…</h4>
                        </div>
                        <ul className="space-y-1.5" role="status" aria-live="polite">
                            {VALIDATION_BULLETS.slice(0, validationCount).map((b, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-foreground animate-in fade-in slide-in-from-left-1 duration-300">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" aria-hidden="true" />
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Sub-step 3 · validation ready · proposal preview */}
                {phase === 'validation-ready' && (
                    <div className="border-t border-border pt-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-4 py-3 flex items-start gap-3">
                                <div className="h-9 w-9 rounded-lg bg-warning/10 text-warning flex items-center justify-center shrink-0" aria-hidden="true">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-foreground">Proposal ready to send</div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                        BOM (149 lines · $1.54M list) + Validation Document (24 slides · 6 sections). Sales (Caitlin Barolet) will forward to Felicia Miano-Poles at MANATT.
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                                    Validation Doc · 6 sections detected by Strata
                                </span>
                            </div>
                            <ul className="divide-y divide-border">
                                {VALIDATION_DOC_SECTIONS.map(s => (
                                    <li key={s.page} className="px-4 py-1.5 flex items-center gap-2.5">
                                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-7 shrink-0" aria-hidden="true">
                                            {String(s.page).padStart(2, '0')}.
                                        </span>
                                        <SectionIcon iconKey={s.iconKey} />
                                        <span className="text-[11px] text-foreground flex-1 min-w-0 truncate">{s.title}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}

                {/* Sub-step 3 · sending (after dialog Send) · spinner */}
                {phase === 'sending' && (
                    <div className="border-t border-border pt-4 space-y-3 animate-in fade-in duration-300">
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-4 py-3 flex items-start gap-3">
                                <div className="h-9 w-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0" aria-hidden="true">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-foreground">Sending proposal to MANATT…</div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                        Designer → Sales → client · waiting for sign-off…
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Sub-step 3 · approved · sign-off banner */}
                {phase === 'approved' && (
                    <div className="border-t border-border pt-4 space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                        <div className="rounded-xl border border-success/30 bg-success/5 overflow-hidden">
                            <div className="px-4 py-3 flex items-start gap-3">
                                <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0" aria-hidden="true">
                                    <CheckCircle2 className="h-5 w-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-foreground">Client approved the proposal</div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                        Felicia Miano-Poles signed off · BOM + validation locked · GW2A gate cleared
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                                    6 sections approved by client
                                </span>
                            </div>
                            <ul className="divide-y divide-border">
                                {VALIDATION_DOC_SECTIONS.map(s => (
                                    <li key={s.page} className="px-4 py-1.5 flex items-center gap-2.5">
                                        <span className="text-[10px] font-mono text-muted-foreground tabular-nums w-7 shrink-0" aria-hidden="true">
                                            {String(s.page).padStart(2, '0')}.
                                        </span>
                                        <SectionIcon iconKey={s.iconKey} />
                                        <span className="text-[11px] text-foreground flex-1 min-w-0 truncate">{s.title}</span>
                                        <CheckCircle2 className="h-3 w-3 text-success shrink-0" aria-label="Section approved" />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                {phase === 'waiting-bom' && (
                    <button
                        type="button"
                        disabled
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed"
                    >
                        Upload BOM to continue
                    </button>
                )}
                {phase === 'processing-bom' && (
                    <button type="button" disabled aria-busy="true" className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Processing upload…
                    </button>
                )}
                {phase === 'bom-analyzed' && (
                    <button
                        type="button"
                        onClick={() => { onValidationStarted(); focusValidationTab(); setPhase('waiting-validation') }}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold transition-colors"
                    >
                        Attach validation deck
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
                {phase === 'waiting-validation' && (
                    <button
                        type="button"
                        disabled
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed"
                    >
                        Attach validation deck to continue
                    </button>
                )}
                {phase === 'processing-validation' && (
                    <button type="button" disabled aria-busy="true" className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Processing…
                    </button>
                )}
                {phase === 'validation-ready' && (
                    <button
                        type="button"
                        onClick={() => setProposalDialog(true)}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold transition-colors"
                    >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        Send proposal to client →
                    </button>
                )}
                {phase === 'sending' && (
                    <button type="button" disabled aria-busy="true" className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Awaiting client approval…
                        <span className="sr-only">Awaiting client approval response</span>
                    </button>
                )}
                {phase === 'approved' && (
                    <button
                        type="button"
                        onClick={onValidate}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
                    >
                        Continue to SQ check
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
            </div>

            <RequestInfoDialog
                isOpen={proposalDialog}
                onSent={() => { setProposalDialog(false); setPhase('sending') }}
                onClose={() => setProposalDialog(false)}
                headerAvatar="CB"
                headerLabel="Send proposal to client · GW2A gate"
                headerSubtitle="Client sign-off blocks SQ + Teknion"
                defaults={{
                    from: 'kimberly.tucker@officeworks.com',
                    to: 'caitlin.barolet@manatt.com',
                    cc: 'felicia.miano-poles@officeworks.com',
                    date: '2026-04-22 · 2:15 PM',
                    subject: 'MANATT 4th Floor · Proposal for Client Approval',
                    message: PROPOSAL_MESSAGE,
                    attachments: [
                        { name: 'MANATT-4F_BOM_v1.pdf',          meta: '149 lines · 212 KB' },
                        { name: 'MANATT-Validation-Doc-v1.pptx', meta: '24 slides · 1.8 MB' },
                    ],
                    alertTitle: 'Client approval required (GW2A)',
                    alertRows: [
                        { label: 'Project',   value: 'MANATT 4th Floor · DC market' },
                        { label: 'Documents', value: 'BOM + Validation Document' },
                        { label: 'Sent to',   value: 'Caitlin Barolet (Sales) → Felicia Miano-Poles (MANATT)' },
                    ],
                    successTitle: 'Proposal sent to client',
                    successSubtitle: "Awaiting Felicia's sign-off · typical reply 1-2 business days",
                }}
            />
        </>
    )
}

// ─── sc1.4 SQCheckPanel · PP3 (Knowledge Assistant peak) ──────────────────────

/**
 * Inline tooltip that surfaces the business rule behind a value + its source.
 * Same dark Radix tooltip used by DataSourcesBar. Renders the wrapped term with
 * a small help icon; rule + source appear on hover/focus.
 */
function RuleTooltip({ children, rule, source }: { children: React.ReactNode; rule: string; source: string }) {
    return (
        <TooltipPrimitive.Provider delayDuration={150}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger asChild>
                    <span className="inline-flex items-center gap-0.5 cursor-help underline decoration-dotted decoration-muted-foreground/50 underline-offset-2">
                        {children}
                        <HelpCircle className="h-2.5 w-2.5 opacity-50 shrink-0" />
                    </span>
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Portal>
                    <TooltipPrimitive.Content
                        side="top"
                        sideOffset={6}
                        className="z-[60] max-w-[280px] rounded-lg bg-zinc-900 px-3 py-2 text-[11px] leading-snug text-zinc-100 shadow-lg animate-in fade-in-0 zoom-in-95"
                    >
                        <div>{rule}</div>
                        <div className="text-zinc-400 mt-1 italic">{source}</div>
                        <TooltipPrimitive.Arrow className="fill-zinc-900" />
                    </TooltipPrimitive.Content>
                </TooltipPrimitive.Portal>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    )
}

// ─── SQ Confirmation Email Dialog ─────────────────────────────────────────────
// Clone of BFI PatriciaDialog · sent by the designer (Kimberly) after she
// confirms the SQ inline · closes the loop on SC4 (no built-in trigger today).
// Recipients per Spec Check AS-IS · §Section 9 BOM Submission flow.

const SQ_EMAIL_FROM = 'kimberly.tucker@officeworksinc.com'
const SQ_EMAIL_TO   = 'caitlin.barolet@officeworksinc.com'
const SQ_EMAIL_CC   = 'felicia.miano-poles@officeworksinc.com, dc-coordinator@officeworksinc.com'

function buildSQEmailSubject(): string {
    return `SQ #${MANATT_ORDER_META.specialQuote} Confirmed · MANATT 4th Floor · Price Protected · 2025 Catalog`
}

function buildSQEmailBody(): string {
    const discountPct = Math.round((MANATT_ORDER_META.discountTotal / MANATT_ORDER_META.listTotal) * 100)
    return `Hi Caitlin,

Confirming pricing protection for MANATT 4th Floor before I submit the Order Preview to Teknion. Sharing for your records and so you can align with the client.

· SQ #${MANATT_ORDER_META.specialQuote} (${MANATT_ORDER_META.sqName})
· Catalog: 2025 · effective dates valid through Sched Ship ${MANATT_ORDER_META.schedShipDate}
· List Total: $${MANATT_ORDER_META.listTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
· Net Total: $${MANATT_ORDER_META.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}
· Discount: ~${discountPct}% off list

Verification trail (cross-referenced by Strata):
  ✓ Teknion Create platform · SQ lookup ACTIVE
  ✓ Officeworks-DC special pricing form · on file (filed at intake)
  ✓ Prior acknowledgment ${MANATT_ORDER_META.poNumber} · terms consistent
  ✓ Catalog 2025 effective dates · valid

The 4 documented risk checks (PZ column · all 71 items on SQ · Service Fees/T-code surcharges · catalog effective date) are all confirmed.

Next step: submitting the Order Preview to Tifani at Teknion. I'll notify you when she returns the preview number.

— Kimberly Tucker
   Design Manager · PA · cross-market to DC
   Officeworks Inc.`
}

interface SQEmailMetaRow {
    label: string
    value: string
    onChange?: (v: string) => void
    muted?: boolean
}

function SQEmailMetadataBlock({ rows, disabled }: { rows: SQEmailMetaRow[]; disabled: boolean }) {
    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden divide-y divide-border">
            {rows.map(r => (
                <div key={r.label} className="flex items-center gap-2 px-3 py-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-12 shrink-0">{r.label}</span>
                    {r.onChange ? (
                        <input
                            type="text"
                            value={r.value}
                            onChange={e => r.onChange!(e.target.value)}
                            disabled={disabled}
                            className={`flex-1 bg-transparent text-[11px] focus:outline-none ${r.muted ? 'text-muted-foreground' : 'text-foreground'} disabled:opacity-60`}
                        />
                    ) : (
                        <span className={`flex-1 text-[11px] truncate ${r.muted ? 'text-muted-foreground' : 'text-foreground'}`}>{r.value}</span>
                    )}
                </div>
            ))}
        </div>
    )
}

interface SQConfirmationDialogProps {
    isOpen: boolean
    onSent: () => void
    onCancel: () => void
    /** Optional override · when absent uses the SQ-confirmation defaults (to Caitlin) */
    emailConfig?: {
        title?: string
        subtitle?: string
        from?: string
        to?: string
        cc?: string
        subject?: string
        body?: string
        attachments?: { name: string; size: string; badge: string }[]
        sentMessage?: string
    }
}

function SQConfirmationDialog({ isOpen, onSent, onCancel, emailConfig }: SQConfirmationDialogProps) {
    const cfg = emailConfig ?? {}
    const [subject, setSubject] = useState(cfg.subject ?? buildSQEmailSubject())
    const [message, setMessage] = useState(cfg.body ?? buildSQEmailBody())
    const [attachments, setAttachments] = useState(cfg.attachments ?? [
        { name: `MANATT-SQ-${MANATT_ORDER_META.specialQuote}-confirmation.pdf`, size: '240 KB', badge: 'Auto-generated' },
        { name: 'verification-trail.json', size: '8 KB', badge: 'Sources log' },
    ])
    const [sending, setSending] = useState(false)
    const [sent, setSent] = useState(false)

    const handleSend = () => {
        setSending(true)
        setTimeout(() => {
            setSending(false)
            setSent(true)
            setTimeout(() => onSent(), 900)
        }, 800)
    }

    const removeAttachment = (name: string) =>
        setAttachments(prev => prev.filter(a => a.name !== name))

    const fromEmail = cfg.from ?? SQ_EMAIL_FROM
    const toEmail   = cfg.to   ?? SQ_EMAIL_TO
    const ccEmail   = cfg.cc   ?? SQ_EMAIL_CC
    const title       = cfg.title       ?? 'SQ Confirmation · MANATT 4th Floor'
    const subtitle    = cfg.subtitle    ?? 'Strata drafted on your behalf · review and send'
    const sentMessage = cfg.sentMessage ?? 'Sent · recipients notified'

    const metaRows: SQEmailMetaRow[] = [
        { label: 'From', value: fromEmail },
        { label: 'To',   value: toEmail },
        { label: 'CC',   value: ccEmail, muted: true },
        { label: 'Subj', value: subject, onChange: setSubject },
    ]

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={() => { if (!sending && !sent) onCancel() }} className="relative z-[400]">
                <TransitionChild as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </TransitionChild>
                <div className="fixed inset-0 flex items-center justify-center p-6">
                    <TransitionChild as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0 scale-95 translate-y-2" enterTo="opacity-100 scale-100 translate-y-0"
                        leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-full max-w-lg bg-card rounded-2xl shadow-2xl flex flex-col max-h-[88vh] border border-border overflow-hidden">
                            {/* Header */}
                            <div className="flex items-center gap-3 px-5 py-4 border-b border-border shrink-0">
                                <div className="h-8 w-8 rounded-full bg-ai/10 flex items-center justify-center shrink-0">
                                    <span className="text-[11px] font-black text-ai">ST</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-[13px] font-bold text-foreground">{title}</p>
                                    <p className="text-[10px] text-muted-foreground">{subtitle}</p>
                                </div>
                                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                            </div>

                            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
                                {/* Attachments — removable */}
                                {attachments.map(a => (
                                    <div key={a.name} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl border border-success/30 bg-success/5">
                                        <Paperclip className="h-3.5 w-3.5 text-success shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[11px] font-semibold text-foreground truncate">{a.name}</div>
                                            <div className="text-[9px] text-muted-foreground">{a.size}</div>
                                        </div>
                                        <span className="text-[9px] font-bold text-success bg-success/10 border border-success/20 px-1.5 py-0.5 rounded shrink-0">{a.badge}</span>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                        {!sent && (
                                            <button
                                                type="button"
                                                onClick={() => removeAttachment(a.name)}
                                                className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                                                aria-label={`Remove ${a.name}`}
                                            >
                                                <X className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Email metadata (From/To/CC read-only · Subject editable) */}
                                <SQEmailMetadataBlock rows={metaRows} disabled={sent} />

                                {/* Editable body */}
                                <textarea
                                    value={message}
                                    onChange={e => setMessage(e.target.value)}
                                    rows={16}
                                    disabled={sent}
                                    className="w-full rounded-xl border border-border bg-card px-3 py-3 text-[11px] text-foreground leading-relaxed resize-none focus:outline-none focus:border-primary/50 transition-colors font-mono disabled:opacity-60"
                                />
                            </div>

                            <div className="px-5 py-4 border-t border-border shrink-0 flex items-center gap-2">
                                {sent ? (
                                    <div className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-success/10 border border-success/20">
                                        <CheckCircle2 className="h-4 w-4 text-success" />
                                        <span className="text-[12px] font-bold text-success">{sentMessage}</span>
                                    </div>
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={onCancel}
                                            disabled={sending}
                                            className="h-10 px-3 rounded-xl border border-border bg-card hover:bg-muted text-xs font-medium text-foreground transition-colors disabled:opacity-50"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleSend}
                                            disabled={sending}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-ai text-white text-[12px] font-bold hover:opacity-90 transition-all disabled:opacity-60"
                                        >
                                            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                                            {sending ? 'Sending…' : 'Send →'}
                                        </button>
                                    </>
                                )}
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    )
}

// ─── (ClientApprovalPanel removed · sc1.2 DesignBOMPanel now owns BOM + Validation + Send-to-client + Approval) ───

interface SQCheckPanelProps { onValidate: () => void }

function SQCheckPanel({ onValidate }: SQCheckPanelProps) {
    const [confirmed, setConfirmed] = useState(false)
    const [emailDialogOpen, setEmailDialogOpen] = useState(false)

    const handleEmailSent = () => {
        setEmailDialogOpen(false)
        setConfirmed(true)
    }

    const discountPct = Math.round((MANATT_ORDER_META.discountTotal / MANATT_ORDER_META.listTotal) * 100)

    return (
        <>
            <SQConfirmationDialog
                isOpen={emailDialogOpen}
                onSent={handleEmailSent}
                onCancel={() => setEmailDialogOpen(false)}
            />
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-muted-foreground" />
                    <h4 className="text-base font-semibold text-foreground">Strata Knowledge Assistant · SQ lookup</h4>
                </div>
                <p className="text-[11px] text-muted-foreground">PP3 · Captured-knowledge assistant answers the SQ / catalog / GSA question inline · no senior interrupt needed.</p>

                {/* ── Section 1 · Question + Answer (existing · keep) ── */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Question</span>
                        <span className="text-xs text-foreground">Is MANATT GSA price-protected? Which catalog applies?</span>
                    </div>
                    <div className="px-4 py-3">
                        <div className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Answer</div>
                        <div className="text-xs text-foreground">
                            <strong className="text-success">YES · </strong>
                            <RuleTooltip
                                rule="GSA / government clients are price-protected and require a Special Quote (SQ) lookup. ~20% of all orders need this — ~50% of DC orders for GSA accounts."
                                source="Source: Spec Check AS-IS · 'Exception: Price-Protected Orders'"
                            >
                                <strong className="text-success">GSA price-protected</strong>
                            </RuleTooltip>
                            . The{' '}
                            <RuleTooltip
                                rule="The price catalog effective date must be confirmed — using the wrong price zone / catalog is a documented spec-check error that sends incorrect pricing to the client."
                                source="Source: Spec Check AS-IS · Error Profile"
                            >
                                2025 catalog
                            </RuleTooltip>
                            {' '}applies for{' '}
                            <RuleTooltip
                                rule="A Special Quote number is the manufacturer's price-protection reference for this client / project. Verified in Teknion Create together with the manufacturer's special pricing form."
                                source="Source: Spec Check AS-IS · Tools (Create = CR / SQ verification)"
                            >
                                SQ #436533
                            </RuleTooltip>
                            .
                        </div>
                    </div>
                </div>

                {/* ── Section 2 · Pricing terms (real PO numbers) ── */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-foreground" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">Pricing terms locked under SQ #{MANATT_ORDER_META.specialQuote}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-border">
                        <div className="bg-card px-3 py-2.5">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">List Total</div>
                            <div className="text-base text-foreground tabular-nums mt-0.5">${MANATT_ORDER_META.listTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-card px-3 py-2.5">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Net Total</div>
                            <div className="text-base font-bold text-success tabular-nums mt-0.5">${MANATT_ORDER_META.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-card px-3 py-2.5">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Discount Total</div>
                            <div className="text-base text-foreground tabular-nums mt-0.5">${MANATT_ORDER_META.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-card px-3 py-2.5">
                            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Implied %</div>
                            <div className="text-base font-bold text-success tabular-nums mt-0.5">~{discountPct}% off list</div>
                        </div>
                    </div>
                    <div className="px-4 py-2.5 bg-muted/20 border-t border-border text-[11px] text-foreground/70">
                        Valid for items on the SQ schedule. Service Fees and T-code surcharges may apply differently.
                    </div>
                </div>

                {/* ── Section 4 · Verification trail (NEW · sources with timestamps) ── */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Search className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Verification trail · 4 sources cross-referenced</span>
                    </div>
                    <ul className="divide-y divide-border">
                        {[
                            {
                                title: 'Teknion Create platform',
                                detail: `SQ #${MANATT_ORDER_META.specialQuote} lookup`,
                                badge: 'ACTIVE',
                                badgeClass: 'bg-success/10 text-success border-success/20',
                                meta: 'verified just now',
                            },
                            {
                                title: 'Officeworks-DC special pricing form',
                                detail: 'on file · filed by Caitlin Barolet at intake',
                                badge: 'ON FILE',
                                badgeClass: 'bg-success/10 text-success border-success/20',
                                meta: '18h ago',
                            },
                            {
                                title: `Prior acknowledgment ${MANATT_ORDER_META.poNumber}`,
                                detail: 'terms consistent · Universal #' + MANATT_ORDER_META.universal,
                                badge: 'MATCH',
                                badgeClass: 'bg-success/10 text-success border-success/20',
                                meta: MANATT_ORDER_META.orderReceipt,
                            },
                            {
                                title: 'Catalog 2025 effective dates',
                                detail: `Sched Ship ${MANATT_ORDER_META.schedShipDate} within window`,
                                badge: 'VALID',
                                badgeClass: 'bg-success/10 text-success border-success/20',
                                meta: 'verified just now',
                            },
                        ].map((src, i) => (
                            <li key={i} className="px-4 py-2 flex items-center gap-2.5">
                                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-foreground font-medium truncate">{src.title}</div>
                                    <div className="text-[10px] text-muted-foreground truncate">{src.detail}</div>
                                </div>
                                <div className="flex flex-col items-end gap-0.5 shrink-0">
                                    <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border ${src.badgeClass}`}>{src.badge}</span>
                                    <span className="text-[9px] text-muted-foreground">{src.meta}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>

                {confirmed && (
                    <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <div className="text-xs">
                            <div className="font-semibold text-success">SQ #{MANATT_ORDER_META.specialQuote} confirmed · 2025 catalog locked</div>
                            <div className="text-muted-foreground">
                                <strong className="text-foreground">Caitlin notified</strong> · Felicia &amp; Coordinator CC'd · proceed to Teknion Order Preview
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                {!confirmed ? (
                    <button
                        type="button"
                        onClick={() => setEmailDialogOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold transition-colors"
                    >
                        <Mail className="h-4 w-4" />
                        Confirm SQ →
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onValidate}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
                    >
                        Proceed to Teknion Order Preview
                        <ArrowRight className="h-4 w-4" />
                    </button>
                )}
            </div>
        </>
    )
}

// ─── Flow 3 · sc1.5 · Teknion Order Preview submission ────────────────────────
// Replaces the descriptive default panel · 5 sections · action-oriented.
// SC2 painpoint: pre-flight validation runs locally what Tifani would catch in 1-2 weeks.
// SC6 painpoint: submission tracker visualizes the 1-2 week black box.

const PRE_FLIGHT_CHECKS = [
    {
        id: 'crs-finish',
        label: 'All 13 CRs have complete finish + grain spec',
        tooltip: 'Strata checked each custom request against the validation document — finish family, color code, and grain direction all populated. Missing finishes are the #1 reason Tifani returns a spec gap.',
        source: 'Source: Spec Check AS-IS · §Step 8 (CR review) + validation doc',
    },
    {
        id: 'parts',
        label: '71 part numbers · valid in Teknion 2025 catalog',
        tooltip: 'Each part number cross-referenced against the active 2025 catalog. Discontinued parts and 2024 carry-overs flagged before submission.',
        source: 'Source: Teknion 2025 catalog · Effective May 26, 2025',
    },
    {
        id: 'pricing',
        label: 'Price zone applied · matches SQ #436533',
        tooltip: 'PZ Description column verified · all rows show "Price Effective May 26, 2025" matching the SQ. No off-SQ items would surprise the client at invoice.',
        source: 'Source: Confirmed at Step 6A · SQ check',
    },
    {
        id: 'leadtime',
        label: 'Longest CR leadtime fits Sched Ship 2026/03/20',
        tooltip: 'Strata computed longest CR leadtime (40 days · CR 2046138 Flintwood Add-On Screen) against the Sched Ship date. Buffer remains for Teknion factory queue.',
        source: 'Source: Manatt order data · CR leadtime ledger',
    },
] as const

const SIGNALS = [
    { ts: '2025/12/30 14:22', text: 'Teknion · order received · queued for Tifani', icon: 'check' as const },
    { ts: 'Now',              text: 'Teknion · in review by Tifani · ETA varies by factory load', icon: 'loader' as const },
    { ts: 'Pending',          text: 'Tifani returns preview number + status', icon: 'gray' as const },
]

interface TeknionPreviewPanelProps { onValidate: () => void }

function TeknionPreviewPanel({ onValidate }: TeknionPreviewPanelProps) {
    const [phase, setPhase] = useState<'pre-flight' | 'submitted'>('pre-flight')
    const [emailDialogOpen, setEmailDialogOpen] = useState(false)

    const tifaniSubmissionConfig = {
        title: 'Order Preview Submission · MANATT 4th Floor',
        subtitle: 'Strata pre-validated · ready to send',
        from: 'kimberly.tucker@officeworksinc.com',
        to: 'tifani.cooper@teknion.com',
        cc: 'felicia.miano-poles@officeworksinc.com, caitlin.barolet@officeworksinc.com',
        subject: `Order Preview · MANATT 4th Floor · ${MANATT_ORDER_META.poNumber} · Sched Ship ${MANATT_ORDER_META.schedShipDate}`,
        body: `Hi Tifani,

Submitting the order preview for MANATT 4th Floor for your review. Strata ran pre-flight validation against the 2025 catalog — all 4 checks passed before submission.

Project summary:
· PO: ${MANATT_ORDER_META.poNumber} · Universal #${MANATT_ORDER_META.universal}
· 71 line items · 13 CRs (all with finish + grain spec)
· Sched Ship: ${MANATT_ORDER_META.schedShipDate}
· Longest CR lead time: 40 days (CR 2046138 Flintwood Add-On Screen) · buffered

SQ #${MANATT_ORDER_META.specialQuote} confirmed at our end · 2025 catalog effective.

Please let me know if you spot any spec gaps. Targeting your typical 1-2 week turnaround for the preview number.

— Kimberly Tucker
   Design Manager · PA · cross-market to DC
   Officeworks Inc.`,
        attachments: [
            { name: `MANATT-4F-BOM-v1.pdf`, size: '1.4 MB', badge: 'BOM · 149 lines' },
            { name: `MANATT-validation-doc.pdf`, size: '380 KB', badge: 'Approved by client' },
            { name: `pre-flight-validation.json`, size: '12 KB', badge: 'Strata · 4 checks passed' },
        ],
        sentMessage: 'Sent · recipients notified',
    }

    return (
        <>
            <SQConfirmationDialog
                isOpen={emailDialogOpen}
                onSent={() => { setEmailDialogOpen(false); setPhase('submitted') }}
                onCancel={() => setEmailDialogOpen(false)}
                emailConfig={tifaniSubmissionConfig}
            />

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                {/* Section 1 · Pre-flight checks */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                        <ShieldCheck className="h-4 w-4 text-foreground" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">Pre-flight · 4 validations vs Teknion catalog</span>
                    </div>
                    <ul className="divide-y divide-border">
                        {PRE_FLIGHT_CHECKS.map(check => (
                            <li key={check.id} className="px-4 py-2.5 flex items-start gap-2.5">
                                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                                <RuleTooltip rule={check.tooltip} source={check.source}>
                                    <span className="text-xs text-foreground">{check.label}</span>
                                </RuleTooltip>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Section 2 · Order economics · SQ-locked */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-foreground" aria-hidden="true" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">Order economics · SQ-locked</span>
                    </div>
                    <div className="grid grid-cols-2 gap-px bg-border">
                        <div className="bg-card px-3 py-2.5">
                            <RuleTooltip
                                rule="List Total is the full Teknion catalog price before SQ discount. Used as the baseline for the implied % off."
                                source="Source: MANATT-4F_BOM_v1 · 149 lines"
                            >
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">List Total</span>
                            </RuleTooltip>
                            <div className="text-base text-foreground tabular-nums mt-0.5">${MANATT_ORDER_META.listTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-card px-3 py-2.5">
                            <RuleTooltip
                                rule="Net Total is what Officeworks Inc. pays Teknion after the SQ contract discount. Confirmed against the SQ schedule at Step 6A."
                                source="Source: SQ #436533 · effective May 26, 2025"
                            >
                                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Net Total</span>
                            </RuleTooltip>
                            <div className="text-base font-bold text-success tabular-nums mt-0.5">${MANATT_ORDER_META.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-card px-3 py-2.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Discount Total</span>
                            <div className="text-base text-foreground tabular-nums mt-0.5">${MANATT_ORDER_META.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="bg-card px-3 py-2.5">
                            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Implied %</span>
                            <div className="text-base font-bold text-success tabular-nums mt-0.5">~{Math.round((MANATT_ORDER_META.discountTotal / MANATT_ORDER_META.listTotal) * 100)}% off list</div>
                        </div>
                    </div>
                    <div className="px-4 py-2.5 bg-muted/20 border-t border-border text-[11px] text-foreground/70">
                        SQ #{MANATT_ORDER_META.specialQuote} · catalog effective May 26, 2025 · 71 lines covered · PO amount ${MANATT_ORDER_META.poAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </div>
                </div>

                {/* Section 3 · Order composition */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Layers className="h-4 w-4 text-foreground" aria-hidden="true" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">Order composition</span>
                    </div>
                    <ul className="divide-y divide-border text-xs">
                        <li className="px-4 py-2 flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Line items</span>
                            <span className="text-foreground tabular-nums">71</span>
                        </li>
                        <li className="px-4 py-2 flex items-center justify-between gap-3">
                            <RuleTooltip
                                rule="Custom Requests are non-catalog items requiring Teknion factory quoting. Longest leadtime drives the GW3 timeline-conflict risk."
                                source="Source: Spec Check AS-IS · §Step 8 · CR ledger"
                            >
                                <span className="text-muted-foreground">Custom Requests</span>
                            </RuleTooltip>
                            <span className="text-foreground tabular-nums">13 · longest 40d (CR 2046138 Flintwood)</span>
                        </li>
                        <li className="px-4 py-2 flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Workstation groups</span>
                            <span className="text-foreground tabular-nums">4 · 30 stations (WS-01 ×10 · WS-02 ×6 · WS-02 ×6 · WS-02.A ×8)</span>
                        </li>
                        <li className="px-4 py-2 flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">BOM sub-categories</span>
                            <span className="text-foreground">9 · panels · glass · electrical · storage · hat · office · conference · accessory · screen</span>
                        </li>
                        <li className="px-4 py-2 flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Largest tag</span>
                            <span className="text-foreground">Office_WO.1 · 20 units</span>
                        </li>
                    </ul>
                </div>

                {/* Section 4 · Timeline & buffer */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-foreground" aria-hidden="true" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">Timeline &amp; buffer</span>
                    </div>
                    <ul className="divide-y divide-border text-xs">
                        <li className="px-4 py-2 flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Order receipt</span>
                            <span className="text-foreground tabular-nums">{MANATT_ORDER_META.orderReceipt}</span>
                        </li>
                        <li className="px-4 py-2 flex items-center justify-between gap-3">
                            <RuleTooltip
                                rule="No-change-after date locks the BOM for Teknion factory planning. Changes after this date trigger rework + leadtime extension."
                                source="Source: PO-DC-0009642 contract terms"
                            >
                                <span className="text-muted-foreground">Lockdown (no-change-after)</span>
                            </RuleTooltip>
                            <span className="text-foreground tabular-nums">{MANATT_ORDER_META.noChangeAfter}</span>
                        </li>
                        <li className="px-4 py-2 flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Sched Ship</span>
                            <span className="text-foreground tabular-nums">{MANATT_ORDER_META.schedShipDate}</span>
                        </li>
                        <li className="px-4 py-2 flex items-center justify-between gap-3">
                            <span className="text-muted-foreground">Longest CR leadtime</span>
                            <span className="text-foreground tabular-nums">40 days · CR 2046138</span>
                        </li>
                        <li className="px-4 py-2 flex items-center justify-between gap-3">
                            <span className="text-muted-foreground font-medium">Buffer at Sched Ship</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 rounded px-1.5 py-0.5 tabular-nums">~40 days · healthy</span>
                        </li>
                    </ul>
                    <div className="px-4 py-2.5 bg-muted/20 border-t border-border text-[11px] text-foreground/70">
                        Strata recomputes the buffer if Tifani returns a leadtime adjustment.
                    </div>
                </div>

                {/* Section 5 · GW3 outcome forecast · Strata read */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-ai" aria-hidden="true" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">GW3 outcome forecast · Strata read</span>
                    </div>
                    <ul className="divide-y divide-border text-xs">
                        <li className="px-4 py-2.5 flex items-start gap-2.5">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-success">Clean</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                    All pre-flight checks pass · all 13 CRs spec&apos;d · 71 part numbers valid · catalog matches SQ.
                                </div>
                            </div>
                        </li>
                        <li className="px-4 py-2.5 flex items-start gap-2.5">
                            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-warning">Spec gap</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                    Low risk · finishes documented at sc1.7 peer review · grain direction confirmed on 5 Flintwood CRs · cross-referenced with validation doc.
                                </div>
                            </div>
                        </li>
                        <li className="px-4 py-2.5 flex items-start gap-2.5">
                            <AlertCircle className="h-4 w-4 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <div className="font-semibold text-foreground">Timeline conflict</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">
                                    Low risk · longest CR (40 days) fits within the ~40-day Sched Ship buffer · monitor Tifani&apos;s response for factory queue updates.
                                </div>
                            </div>
                        </li>
                    </ul>
                    <div className="px-4 py-2.5 bg-muted/20 border-t border-border text-[11px] text-foreground/70 italic">
                        Strata derives these reads from pre-flight + leadtime ledger + CR catalog cross-check · not a guarantee.
                    </div>
                </div>

                {/* Section 3 · Submission tracker (only when submitted) */}
                {phase === 'submitted' && (
                    <div className="rounded-xl border border-success/30 bg-card overflow-hidden animate-in fade-in slide-in-from-top-1 duration-400">
                        <div className="px-4 py-3 bg-success/5 border-b border-success/20 flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-success" />
                            <span className="text-xs font-bold uppercase tracking-wider text-success">Submission tracker · Tifani 1-2 week turnaround</span>
                        </div>
                        <div className="px-4 py-3 flex items-center gap-1.5 text-[11px]">
                            <div className="flex items-center gap-1.5 px-2 h-7 rounded-md bg-success/10 text-success font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Submitted
                            </div>
                            <div className="h-px w-3 bg-success/40" />
                            <div className="flex items-center gap-1.5 px-2 h-7 rounded-md bg-ai/10 text-ai font-semibold">
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                Tifani reviewing
                            </div>
                            <div className="h-px w-3 bg-border" />
                            <div className="flex items-center gap-1.5 px-2 h-7 rounded-md bg-muted text-muted-foreground">
                                Returned
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 4 · Real-time signals (only when submitted) */}
                {phase === 'submitted' && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden animate-in fade-in slide-in-from-top-1 duration-400">
                        <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Search className="h-4 w-4 text-foreground" />
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Real-time signals from Teknion</span>
                        </div>
                        <ul className="divide-y divide-border">
                            {SIGNALS.map((s, i) => (
                                <li key={i} className="px-4 py-2 flex items-center gap-2.5 text-xs">
                                    {s.icon === 'check' && <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />}
                                    {s.icon === 'loader' && <Loader2 className="h-3.5 w-3.5 text-ai animate-spin shrink-0" />}
                                    {s.icon === 'gray' && <div className="h-3.5 w-3.5 rounded-full border border-border shrink-0" />}
                                    <span className="flex-1 text-foreground truncate">{s.text}</span>
                                    <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{s.ts}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>

            {/* Footer CTA */}
            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                {phase === 'pre-flight' ? (
                    <button
                        type="button"
                        onClick={() => setEmailDialogOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold transition-colors"
                    >
                        <Mail className="h-4 w-4" />
                        Submit Order Preview →
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onValidate}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
                    >
                        Continue · spec gap detected
                        <ArrowRight className="h-4 w-4" />
                    </button>
                )}
            </div>
        </>
    )
}

// ─── Flow 3 · sc1.5b · Resolve specification gap ──────────────────────────────
// SC7 painpoint: Strata answers the CR question inline · no senior interrupt.
// S3 painpoint: auto-drafted resubmission email · designer doesn't write from scratch.

interface SpecGapResolvePanelProps { onValidate: () => void }

function SpecGapResolvePanel({ onValidate }: SpecGapResolvePanelProps) {
    const [phase, setPhase] = useState<'gap-shown' | 'resubmitted'>('gap-shown')
    const [emailDialogOpen, setEmailDialogOpen] = useState(false)
    const [mode, setMode] = useState<'strata' | 'upload'>('upload')
    const [selectedOption, setSelectedOption] = useState<'vertical' | 'horizontal' | 'custom' | null>(null)
    const [customText, setCustomText] = useState('')
    const [uploadPhase, setUploadPhase] = useState<'idle' | 'uploading' | 'uploaded'>('idle')
    const [uploadedFile, setUploadedFile] = useState<{ name: string; size: string } | null>(null)
    const uploadTimeoutRef = useRef<number | null>(null)

    useEffect(() => {
        return () => {
            if (uploadTimeoutRef.current !== null) window.clearTimeout(uploadTimeoutRef.current)
        }
    }, [])

    // The actual grain direction value the designer is sending to Tifani.
    // Trimmed custom text falls back to a placeholder string only for display;
    // the CTA stays disabled until customText is non-empty.
    const chosenValue =
        selectedOption === 'vertical'   ? 'vertical' :
        selectedOption === 'horizontal' ? 'horizontal' :
        selectedOption === 'custom'     ? customText.trim() :
        ''

    const canSubmitStrata = selectedOption !== null && (selectedOption !== 'custom' || customText.trim().length > 0)
    const canSubmitUpload = uploadPhase === 'uploaded' && uploadedFile !== null
    const canSubmit = mode === 'strata' ? canSubmitStrata : canSubmitUpload

    // Email body branches first by mode · in strata mode the body varies with
    // the chosen value (vertical = Strata's grounded recommendation, horizontal
    // is flagged as a divergence, custom echoes the designer's text). In upload
    // mode the body references the attached corrected file.
    const strataBody =
        selectedOption === 'vertical'
            ? `Hi Tifani,

Quick follow-up on your spec gap for CR 2046138 (Solid Add-On Screen · Flintwood White Oak 5N).

Grain direction: vertical · matches the validation doc approved by Manatt and the other 4 Flintwood pieces in this project (CRs 2046131, 2046136, 2046139, 2046140 — all vertical).

No other changes to the BOM. Resubmitting for your review · same Sched Ship target ${MANATT_ORDER_META.schedShipDate}.

— Kimberly Tucker
   Design Manager · PA · cross-market to DC
   Officeworks Inc.`
            : selectedOption === 'horizontal'
            ? `Hi Tifani,

Quick follow-up on your spec gap for CR 2046138 (Solid Add-On Screen · Flintwood White Oak 5N).

Grain direction: horizontal. Note: this differs from the other 4 Flintwood pieces (CRs 2046131, 2046136, 2046139, 2046140) and from the validation doc page 7 (vertical). Confirming this is intentional.

No other changes to the BOM. Resubmitting for your review · same Sched Ship target ${MANATT_ORDER_META.schedShipDate}.

— Kimberly Tucker
   Design Manager · PA · cross-market to DC
   Officeworks Inc.`
            : `Hi Tifani,

Quick follow-up on your spec gap for CR 2046138 (Solid Add-On Screen · Flintwood White Oak 5N).

Grain direction: ${chosenValue || '—'}.

No other changes to the BOM. Resubmitting for your review · same Sched Ship target ${MANATT_ORDER_META.schedShipDate}.

— Kimberly Tucker
   Design Manager · PA · cross-market to DC
   Officeworks Inc.`

    const uploadBody = `Hi Tifani,

Quick follow-up on your spec gap for CR 2046138 · attaching the corrected BOM with the grain direction updated. Strata flagged the change for your review.

No other changes to the BOM. Resubmitting for your review · same Sched Ship target ${MANATT_ORDER_META.schedShipDate}.

— Kimberly Tucker
   Design Manager · PA · cross-market to DC
   Officeworks Inc.`

    const resubmitConfig = {
        title: 'Resubmit · CR 2046138 grain direction',
        subtitle: 'Strata drafted the answer · review and send',
        from: 'kimberly.tucker@officeworksinc.com',
        to: 'tifani.cooper@teknion.com',
        cc: 'felicia.miano-poles@officeworksinc.com',
        subject: `Re: Order Preview · MANATT 4th Floor · CR 2046138 grain direction`,
        body: mode === 'strata' ? strataBody : uploadBody,
        attachments: mode === 'strata'
            ? [
                { name: `CR-2046138-grain-update.pdf`, size: '120 KB', badge: 'Spec update' },
                { name: `flintwood-grain-reference.png`, size: '88 KB', badge: 'Validation doc · page 7' },
            ]
            : uploadedFile
                ? [{ name: uploadedFile.name, size: uploadedFile.size, badge: 'Updated BOM' }]
                : [],
        sentMessage: 'Resubmitted · recipients notified',
    }

    const handleUploadClick = () => {
        setUploadPhase('uploading')
        if (uploadTimeoutRef.current !== null) window.clearTimeout(uploadTimeoutRef.current)
        uploadTimeoutRef.current = window.setTimeout(() => {
            setUploadedFile({ name: 'MANATT-4F_BOM_v1.1.pdf', size: '215 KB' })
            setUploadPhase('uploaded')
        }, 1200)
    }

    return (
        <>
            <SQConfirmationDialog
                isOpen={emailDialogOpen}
                onSent={() => { setEmailDialogOpen(false); setPhase('resubmitted') }}
                onCancel={() => setEmailDialogOpen(false)}
                emailConfig={resubmitConfig}
            />

            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                {/* Section 1 · Tifani's response banner */}
                <div className="rounded-xl border border-ai/40 bg-ai/5 px-4 py-3 flex items-start gap-2.5">
                    <Mail className="h-4 w-4 text-ai shrink-0 mt-0.5" />
                    <div className="text-xs">
                        <div className="font-semibold text-foreground">Tifani returned preview · 1 spec gap detected</div>
                        <div className="text-muted-foreground mt-0.5">Preview #OP-2025-0001605 · 2 of 3 surfaced CRs verified clean · 1 needs clarification</div>
                    </div>
                </div>

                {/* Section 2 · Gap card · context only · Strata's recommendation lives in the edit card */}
                <div className="rounded-xl border border-warning/30 bg-card overflow-hidden">
                    <div className="px-4 py-3 flex items-start gap-3">
                        <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-semibold text-foreground">CR 2046138 · finish detail missing in spec</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                                Tifani: &quot;Flintwood White Oak 5N specified but no grain direction provided. Default vertical assumed?&quot;
                            </div>
                            <div className="text-[10px] italic text-muted-foreground mt-0.5">Source: Tifani · Teknion · 2025/12/31 09:14</div>
                        </div>
                    </div>
                </div>

                {/* Mode selector · Strata vs Upload (only while gap-shown) */}
                {phase === 'gap-shown' && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-4 py-3 bg-muted/30 border-b border-border">
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">How do you want to fix this gap?</span>
                        </div>
                        <fieldset className="px-4 py-3 grid grid-cols-2 gap-2">
                            <legend className="sr-only">Fix mode</legend>
                            <label className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                                mode === 'strata' ? 'border-ai/40 bg-ai/5' : 'border-border bg-card hover:bg-muted/30'
                            }`}>
                                <input
                                    type="radio"
                                    name="fix-mode"
                                    value="strata"
                                    checked={mode === 'strata'}
                                    onChange={() => setMode('strata')}
                                    className="mt-0.5 h-3.5 w-3.5 accent-primary shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="text-xs font-semibold text-foreground">Resolve with Strata</span>
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-ai/10 text-ai border border-ai/20 rounded px-1.5 py-0.5">
                                            <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                                            Recommends
                                        </span>
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                        Pick from suggested options · inline
                                    </div>
                                </div>
                            </label>
                            <label className={`flex items-start gap-2.5 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${
                                mode === 'upload' ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-muted/30'
                            }`}>
                                <input
                                    type="radio"
                                    name="fix-mode"
                                    value="upload"
                                    checked={mode === 'upload'}
                                    onChange={() => setMode('upload')}
                                    className="mt-0.5 h-3.5 w-3.5 accent-primary shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                    <span className="text-xs font-semibold text-foreground">Upload corrected file</span>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                        Attach a revised BOM or validation doc
                                    </div>
                                </div>
                            </label>
                        </fieldset>
                    </div>
                )}

                {/* Mode = upload · dropzone or uploaded file card */}
                {phase === 'gap-shown' && mode === 'upload' && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Paperclip className="h-4 w-4 text-foreground" aria-hidden="true" />
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Attach corrected file</span>
                        </div>
                        <div className="px-4 py-3 space-y-2.5">
                            <p className="text-[11px] text-muted-foreground">
                                BOM (.pdf / .sp4) or validation document (.pdf / .pptx) · Strata will detect what changed and notify Tifani.
                            </p>
                            {uploadPhase === 'idle' && (
                                <button
                                    type="button"
                                    onClick={handleUploadClick}
                                    aria-label="Attach corrected file (simulated)"
                                    className="w-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-lg p-5 flex flex-col items-center justify-center gap-2 transition-colors"
                                >
                                    <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center" aria-hidden="true">
                                        <Paperclip className="h-5 w-5 text-muted-foreground" />
                                    </div>
                                    <div className="text-xs font-semibold text-foreground">Drop corrected file here · or click to attach</div>
                                    <div className="text-[10px] text-muted-foreground italic">Demo · click to simulate the upload of MANATT-4F_BOM_v1.1.pdf (215 KB)</div>
                                </button>
                            )}
                            {uploadPhase === 'uploading' && (
                                <div
                                    role="status"
                                    aria-busy="true"
                                    className="rounded-lg border border-border bg-muted/30 px-3 py-3 flex items-center gap-2 animate-in fade-in duration-200"
                                >
                                    <Loader2 className="h-4 w-4 text-foreground animate-spin" aria-hidden="true" />
                                    <span className="text-xs text-foreground">Strata reading the file…</span>
                                </div>
                            )}
                            {uploadPhase === 'uploaded' && uploadedFile && (
                                <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 flex items-start gap-3 animate-in fade-in slide-in-from-top-1 duration-300">
                                    <div className="h-9 w-9 rounded-lg bg-success/10 text-success flex items-center justify-center shrink-0" aria-hidden="true">
                                        <FileText className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-xs font-semibold text-foreground truncate">{uploadedFile.name}</span>
                                            <span className="text-[9px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 rounded px-1.5 py-0.5">Uploaded</span>
                                        </div>
                                        <div className="text-[11px] text-muted-foreground mt-0.5">{uploadedFile.size} · attached to the resubmit</div>
                                        <div className="text-[10px] italic text-muted-foreground mt-1">
                                            Strata detected: CR 2046138 grain direction updated to vertical.
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Mode = strata · inline edit · designer picks the grain direction */}
                {phase === 'gap-shown' && mode === 'strata' && (
                    <div className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Pencil className="h-4 w-4 text-foreground" aria-hidden="true" />
                            <span className="text-xs font-bold uppercase tracking-wider text-foreground">Update CR 2046138 · grain direction</span>
                        </div>
                        <div className="px-4 py-3 space-y-2.5">
                            <p className="text-[11px] text-muted-foreground">
                                Required by Tifani · choose the value to apply to the BOM. Strata pre-computed the grounded recommendation.
                            </p>
                            <fieldset className="space-y-1.5">
                                <legend className="sr-only">Grain direction</legend>

                                {/* Vertical · Strata recommendation */}
                                <label className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                                    selectedOption === 'vertical' ? 'border-ai/40 bg-ai/5' : 'border-border bg-card hover:bg-muted/30'
                                }`}>
                                    <input
                                        type="radio"
                                        name="grain-direction"
                                        value="vertical"
                                        checked={selectedOption === 'vertical'}
                                        onChange={() => setSelectedOption('vertical')}
                                        className="mt-0.5 h-3.5 w-3.5 accent-primary shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5 flex-wrap">
                                            <span className="text-xs font-semibold text-foreground">Vertical</span>
                                            <RuleTooltip
                                                rule="Vertical grain matches the validation doc Manatt approved on page 7 and the other 4 Flintwood CRs in this BOM (2046131, 2046136, 2046139, 2046140)."
                                                source="Source: Validation doc page 7 · MANATT CR ledger 4 of 4 Flintwood"
                                            >
                                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-ai/10 text-ai border border-ai/20 rounded px-1.5 py-0.5">
                                                    <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
                                                    Strata recommends
                                                </span>
                                            </RuleTooltip>
                                        </div>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                            Matches validation doc + 4 other Flintwood CRs
                                        </div>
                                    </div>
                                </label>

                                {/* Horizontal */}
                                <label className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                                    selectedOption === 'horizontal' ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-muted/30'
                                }`}>
                                    <input
                                        type="radio"
                                        name="grain-direction"
                                        value="horizontal"
                                        checked={selectedOption === 'horizontal'}
                                        onChange={() => setSelectedOption('horizontal')}
                                        className="mt-0.5 h-3.5 w-3.5 accent-primary shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-foreground">Horizontal</span>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                            Diverges from validation doc · Strata will flag the difference in the email
                                        </div>
                                    </div>
                                </label>

                                {/* Custom · textarea appears when selected */}
                                <label className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                                    selectedOption === 'custom' ? 'border-primary/40 bg-primary/5' : 'border-border bg-card hover:bg-muted/30'
                                }`}>
                                    <input
                                        type="radio"
                                        name="grain-direction"
                                        value="custom"
                                        checked={selectedOption === 'custom'}
                                        onChange={() => setSelectedOption('custom')}
                                        className="mt-0.5 h-3.5 w-3.5 accent-primary shrink-0"
                                    />
                                    <div className="flex-1 min-w-0">
                                        <span className="text-xs font-semibold text-foreground">Custom</span>
                                        <div className="text-[10px] text-muted-foreground mt-0.5">
                                            Type the value to send to Tifani
                                        </div>
                                    </div>
                                </label>
                                {selectedOption === 'custom' && (
                                    <textarea
                                        value={customText}
                                        onChange={e => setCustomText(e.target.value.slice(0, 80))}
                                        placeholder="e.g. diagonal weft · book-matched · request clarification"
                                        rows={2}
                                        maxLength={80}
                                        aria-label="Custom grain direction value"
                                        className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-card text-xs text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:border-primary/40 focus:ring-1 focus:ring-primary/20 animate-in fade-in duration-200"
                                    />
                                )}
                            </fieldset>

                            {/* Applied banner · live preview of the change */}
                            {canSubmit && (
                                <div
                                    role="status"
                                    className="rounded-lg border border-success/30 bg-success/5 px-3 py-2 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-200"
                                >
                                    <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
                                    <div className="text-[11px]">
                                        <div className="font-semibold text-success">
                                            Change applied · CR 2046138 · grain direction = {chosenValue}
                                        </div>
                                        <div className="text-muted-foreground">This will be sent to Tifani when you resubmit the preview.</div>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="px-4 py-2.5 bg-muted/20 border-t border-border space-y-0.5">
                            <p className="text-[10px] italic text-muted-foreground leading-relaxed">
                                Strata&apos;s recommendation: <strong className="text-foreground not-italic">vertical grain</strong> · matches validation doc page 7 + the other 4 Flintwood CRs (2046131, 2046136, 2046139, 2046140).
                            </p>
                            <p className="text-[10px] italic text-muted-foreground">
                                Source: Spec Check AS-IS · §Step 8A + MANATT CR ledger (4/4 Flintwood = vertical)
                            </p>
                        </div>
                    </div>
                )}

                {/* Section 3 · Resubmission summary (only when resubmitted) */}
                {phase === 'resubmitted' && (
                    <div className="rounded-lg border border-success/30 bg-success/5 px-3 py-2.5 flex items-start gap-2 animate-in fade-in slide-in-from-top-1 duration-300">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                        <div className="text-xs">
                            <div className="font-semibold text-success">
                                {mode === 'strata'
                                    ? `CR 2046138 updated · grain direction: ${chosenValue}`
                                    : `CR 2046138 updated · corrected file sent to Tifani`}
                            </div>
                            <div className="text-muted-foreground">
                                {mode === 'upload' && uploadedFile
                                    ? `${uploadedFile.name} · ${uploadedFile.size} · Tifani notified · Felicia CC'd`
                                    : `Resubmission queued · Tifani notified · Felicia CC'd · expected clean on next turnaround`}
                            </div>
                        </div>
                    </div>
                )}

                {/* Section 4 · Schedule risk · phasing comms drafted (only when resubmitted · folded in from former sc1.5c) */}
                {phase === 'resubmitted' && (
                    <div className="rounded-xl border border-warning/30 bg-card overflow-hidden animate-in fade-in slide-in-from-top-1 duration-400">
                        <div className="px-4 py-3 bg-warning/5 border-b border-warning/20 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4 text-warning" />
                            <span className="text-xs font-bold uppercase tracking-wider text-warning">Also detected · Sched Ship at risk</span>
                        </div>
                        <div className="px-4 py-3 space-y-2.5 text-xs">
                            <p className="text-foreground">
                                The 40-day Flintwood CRs combined with the resubmit cycle push the Must-Arrive Date close to the {MANATT_ORDER_META.schedShipDate} ship target. Strata drafted a 3-way phasing huddle to PM and Salesperson so phasing options are ready before Tifani returns.
                            </p>
                            <div className="rounded-lg bg-muted/30 border border-border px-3 py-2 space-y-1">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">3-way phasing thread</div>
                                <div className="flex justify-between gap-2 text-foreground">
                                    <span>Designer</span><span className="font-mono text-[11px]">Kimberly Tucker (you)</span>
                                </div>
                                <div className="flex justify-between gap-2 text-foreground">
                                    <span>PM</span><span className="font-mono text-[11px]">Abigail's team · Furniture PMs</span>
                                </div>
                                <div className="flex justify-between gap-2 text-foreground">
                                    <span>Salesperson</span><span className="font-mono text-[11px]">Caitlin Barolet · DC</span>
                                </div>
                            </div>
                            <p className="text-muted-foreground italic text-[11px]">
                                Long-lead items (Flintwood CRs) phased into a Phase 2 delivery · core workstations ship on schedule.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer CTA · 5 states (2 modes × 2 sub-states + resubmitted) */}
            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                {phase === 'gap-shown' && !canSubmit && (
                    <button
                        type="button"
                        disabled
                        aria-busy={mode === 'upload' && uploadPhase === 'uploading'}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed"
                    >
                        {mode === 'upload' && uploadPhase === 'uploading' && (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        )}
                        {mode === 'strata'
                            ? 'Select grain direction to continue'
                            : uploadPhase === 'uploading'
                                ? 'Reading file…'
                                : 'Upload corrected file to continue'}
                    </button>
                )}
                {phase === 'gap-shown' && canSubmit && (
                    <button
                        type="button"
                        onClick={() => setEmailDialogOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold transition-colors"
                    >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Resubmit preview to Tifani →
                    </button>
                )}
                {phase === 'resubmitted' && (
                    <button
                        type="button"
                        onClick={onValidate}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
                    >
                        Proceed to Self-Audit
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
            </div>
        </>
    )
}

// ─── Flow 5 · sc1.8 · BOM Submission email · PDF + SP4 ─────────────────────────
// Designer (Kimberly) sends the BOM submission email to Caitlin (Sales DC) +
// Sales Coordinator. Strata pre-validates SP4 vs NetSuite schema before send.
// Pattern: 3 summary cards + SQConfirmationDialog (same dialog reused by sc1.4
// and sc1.5) with an emailConfig override.

const PRE_FLIGHT_SUBMISSION = [
    {
        label: 'SP4 schema validated · NetSuite-ready',
        detail: 'No field gaps · 149 lines mapped to NetSuite item codes · discount field unlocked',
    },
    {
        label: 'BOM PDF · 149 lines · all CRs cited',
        detail: '13 CRs cross-referenced with Teknion Create · finishes + grain direction confirmed',
    },
    {
        label: 'Recipient list verified · Coordinator role auto-resolved',
        detail: 'Caitlin Barolet (DC Salesperson) + Sales Coordinator · Felicia CC for oversight',
    },
] as const

const SUBMISSION_EMAIL_BODY = `Hi Caitlin,

Submitting the BOM for MANATT 4th Floor · ready for NetSuite handoff.

Project summary:
· PO target: ${MANATT_ORDER_META.poNumber}
· 71 line items · 13 CRs · ${MANATT_ORDER_META.manufacturer}
· List ${MANATT_ORDER_META.listTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · Net ${MANATT_ORDER_META.netTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (79% off · SQ #${MANATT_ORDER_META.specialQuote} GSA price-protected)
· Sched Ship: ${MANATT_ORDER_META.schedShipDate}

Strata pre-validated the SP4 against the NetSuite schema before send · please forward to the Coordinator so they can upload to NetSuite and apply the discount. I'll standby for the Teknion acknowledgment.

Thanks,
Kimberly`

interface SubmissionEmailPanelProps { onValidate: () => void }

function SubmissionEmailPanel({ onValidate }: SubmissionEmailPanelProps) {
    const [phase, setPhase] = useState<'compose' | 'sending' | 'sent'>('compose')
    const [emailDialogOpen, setEmailDialogOpen] = useState(false)

    const submissionEmailConfig = {
        title: 'BOM Submission · MANATT 4th Floor',
        subtitle: 'Strata pre-validated · ready for NetSuite handoff',
        from: 'kimberly.tucker@officeworksinc.com',
        to: 'caitlin.barolet@officeworksinc.com',
        cc: 'coordinator-dc@officeworksinc.com, felicia.miano-poles@officeworksinc.com',
        subject: `BOM Submission · MANATT 4th Floor · ${MANATT_ORDER_META.poNumber}`,
        body: SUBMISSION_EMAIL_BODY,
        attachments: [
            { name: `MANATT-4F_BOM_v1.pdf`,        size: '212 KB', badge: 'BOM · 149 lines' },
            { name: `MANATT-4F-SP4.json`,           size: '54 KB',  badge: 'Schema validated' },
        ],
        sentMessage: 'BOM submission sent · Coordinator + Salesperson notified',
    }

    return (
        <>
            <SQConfirmationDialog
                isOpen={emailDialogOpen}
                onSent={() => {
                    setEmailDialogOpen(false)
                    setPhase('sending')
                    window.setTimeout(() => setPhase('sent'), 900)
                }}
                onCancel={() => setEmailDialogOpen(false)}
                emailConfig={submissionEmailConfig}
            />
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                {/* Section 1 · Recipient summary */}
                <section
                    aria-label="BOM submission recipients"
                    className="rounded-xl border border-border bg-card overflow-hidden"
                >
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Mail className="h-4 w-4 text-foreground" aria-hidden="true" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">BOM submission · to Sales + Coordinator</span>
                    </div>
                    <div className="px-4 py-3 space-y-1.5 text-xs">
                        <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">From</span>
                            <span className="text-foreground font-mono">kimberly.tucker@officeworksinc.com</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">To</span>
                            <span className="text-foreground">Caitlin Barolet · Salesperson (DC)</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Cc</span>
                            <span className="text-foreground">Sales Coordinator · Felicia Miano-Poles</span>
                        </div>
                        <div className="flex justify-between gap-3">
                            <span className="text-muted-foreground">Subject</span>
                            <span className="text-foreground">BOM Submission · MANATT 4th Floor · {MANATT_ORDER_META.poNumber}</span>
                        </div>
                    </div>
                </section>

                {/* Section 2 · Pre-flight validation */}
                <section
                    aria-label="Pre-flight validation"
                    className="rounded-xl border border-border bg-card overflow-hidden"
                >
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-foreground" aria-hidden="true" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">Pre-flight · 3 checks before send</span>
                    </div>
                    <ul className="divide-y divide-border">
                        {PRE_FLIGHT_SUBMISSION.map(check => (
                            <li key={check.label} className="px-4 py-2.5 flex items-start gap-2.5">
                                <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs text-foreground">{check.label}</div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5">{check.detail}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                </section>

                {/* Section 3 · Attachments */}
                <section
                    aria-label="Submission attachments"
                    className="rounded-xl border border-border bg-card overflow-hidden"
                >
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Paperclip className="h-4 w-4 text-foreground" aria-hidden="true" />
                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">Attachments · 2 files</span>
                    </div>
                    <ul className="divide-y divide-border">
                        <li className="px-4 py-2.5 flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-foreground">MANATT-4F_BOM_v1.pdf</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">212 KB · 149 lines · 13 CRs cited</div>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-muted text-foreground border border-border rounded px-1.5 py-0.5 shrink-0">BOM</span>
                        </li>
                        <li className="px-4 py-2.5 flex items-center gap-3">
                            <FileText className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <div className="text-xs font-semibold text-foreground">MANATT-4F-SP4.json</div>
                                <div className="text-[11px] text-muted-foreground mt-0.5">54 KB · NetSuite-ready · all field gaps resolved</div>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 rounded px-1.5 py-0.5 shrink-0">Schema validated</span>
                        </li>
                    </ul>
                </section>

                {/* Sent banner */}
                {phase === 'sent' && (
                    <div
                        role="status"
                        className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 flex items-start gap-2.5 animate-in fade-in slide-in-from-top-1 duration-300"
                    >
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="flex-1 min-w-0 text-xs">
                            <div className="font-semibold text-success">Submission sent · Coordinator + Salesperson notified</div>
                            <div className="text-muted-foreground mt-0.5">
                                BOM PDF + SP4 file attached · awaiting Coordinator handoff to NetSuite · ETA ~4 minutes.
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Footer CTA */}
            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                {phase === 'compose' && (
                    <button
                        type="button"
                        onClick={() => setEmailDialogOpen(true)}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold transition-colors"
                    >
                        <Mail className="h-4 w-4" aria-hidden="true" />
                        Send BOM submission →
                    </button>
                )}
                {phase === 'sending' && (
                    <button
                        type="button"
                        disabled
                        aria-busy="true"
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed"
                    >
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        Sending to recipients…
                    </button>
                )}
                {phase === 'sent' && (
                    <button
                        type="button"
                        onClick={onValidate}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
                    >
                        Continue to NetSuite handoff
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
            </div>
        </>
    )
}

// ─── Flow 5 · sc1.8b · Coordinator → Salesperson handoff ───────────────────────
// 3 sequential sub-steps · each unlocks the next · same role/data as before but
// stacked vertically full-width for legibility on the narrow modal right pane.
//   Step 1 · Coordinator · Upload SP4 to NetSuite
//   Step 2 · Coordinator · Apply 79% discount
//   Step 3 · Salesperson Caitlin · Review + release PO to Teknion

const SP4_UPLOAD_BULLETS = [
    'Uploading SP4 to NetSuite · validating fields',
    'Mapping 149 lines to NetSuite item codes',
    'Resolving Teknion T25 catalog references',
    'SP4 uploaded · ready for discount',
] as const

interface HandoffPanelProps { onValidate: () => void }

type HandoffStep =
    | 'step-1-upload'
    | 'step-1-uploading'
    | 'step-2-discount'
    | 'step-3-review'
    | 'step-3-releasing'
    | 'step-3-released'

/** Map each sub-step phase to its parent step number (1, 2, or 3) for compare helpers. */
function stepNumberOf(s: HandoffStep): 1 | 2 | 3 {
    if (s === 'step-1-upload' || s === 'step-1-uploading') return 1
    if (s === 'step-2-discount') return 2
    return 3
}

/** Status badge variants reused by all three cards. */
function StatusChip({ variant }: { variant: 'pending' | 'active' | 'done' }) {
    if (variant === 'done') {
        return (
            <span
                role="status"
                className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 rounded px-1.5 py-0.5 shrink-0"
            >
                <CheckCircle2 className="h-3 w-3" aria-hidden="true" />
                Done
            </span>
        )
    }
    if (variant === 'active') {
        return (
            <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-foreground text-background rounded px-1.5 py-0.5 shrink-0">
                In progress
            </span>
        )
    }
    return (
        <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">
            Awaiting
        </span>
    )
}

function HandoffPanel({ onValidate }: HandoffPanelProps) {
    const [step, setStep] = useState<HandoffStep>('step-1-upload')
    const [uploadCount, setUploadCount] = useState(0)
    const timeoutsRef = useRef<number[]>([])

    useEffect(() => () => {
        timeoutsRef.current.forEach(id => window.clearTimeout(id))
        timeoutsRef.current = []
    }, [])

    // Step 1 upload simulation · bullets at 350ms · auto-advance to step 2.
    useEffect(() => {
        if (step !== 'step-1-uploading') return
        SP4_UPLOAD_BULLETS.forEach((_, i) => {
            const id = window.setTimeout(() => setUploadCount(i + 1), 350 * (i + 1))
            timeoutsRef.current.push(id)
        })
        const doneId = window.setTimeout(() => setStep('step-2-discount'), 350 * SP4_UPLOAD_BULLETS.length + 250)
        timeoutsRef.current.push(doneId)
    }, [step])

    // Step 3 PO release simulation.
    useEffect(() => {
        if (step !== 'step-3-releasing') return
        const id = window.setTimeout(() => setStep('step-3-released'), 1500)
        timeoutsRef.current.push(id)
    }, [step])

    const currentStepNum = stepNumberOf(step)
    const canContinue = step === 'step-3-released'

    // CTA copy varies by current sub-step when disabled.
    const disabledCopy =
        step === 'step-1-upload'    ? 'Coordinator about to upload SP4…' :
        step === 'step-1-uploading' ? 'Coordinator uploading SP4…' :
        step === 'step-2-discount'  ? 'Coordinator applying discount…' :
        step === 'step-3-review'    ? 'Salesperson reviewing PO…' :
        /* step-3-releasing */        'Salesperson releasing PO…'

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
                {/* Banner · sequential context */}
                <div className="rounded-xl border border-ai/30 bg-ai/5 px-4 py-3 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold text-foreground">
                            Three sequential sub-steps · Coordinator → Salesperson
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                            Coordinator uploads SP4 + applies the 79% discount · then Caitlin releases the PO to Teknion. Each step unlocks the next.
                        </div>
                    </div>
                </div>

                {/* STEP 1 · Coordinator · Upload SP4 to NetSuite */}
                {(() => {
                    const variant: 'pending' | 'active' | 'done' =
                        currentStepNum > 1 ? 'done' :
                        currentStepNum === 1 ? 'active' :
                        'pending'
                    return (
                        <section
                            aria-label="Step 1 · Coordinator · Upload SP4 to NetSuite"
                            aria-current={variant === 'active' ? 'step' : undefined}
                            className={`rounded-xl border overflow-hidden ${
                                variant === 'done' ? 'border-success/30 bg-success/5' :
                                variant === 'active' ? 'border-border bg-card' :
                                'border-border bg-card opacity-60'
                            }`}
                        >
                            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">
                                    1
                                </span>
                                <UserCheck className="h-4 w-4 text-foreground shrink-0" aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
                                        Upload SP4 to NetSuite
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">Sales Coordinator</div>
                                </div>
                                <StatusChip variant={variant} />
                            </div>

                            {variant === 'active' && step === 'step-1-upload' && (
                                <div className="px-4 py-3 space-y-2.5">
                                    <p className="text-[11px] text-muted-foreground">
                                        Drop the validated SP4 here · NetSuite will accept the {MANATT_ORDER_META.specialQuote} schema mapping.
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => setStep('step-1-uploading')}
                                        aria-label="Upload SP4 to NetSuite (simulated)"
                                        className="w-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                                    >
                                        <div className="h-9 w-9 rounded-xl bg-muted/60 flex items-center justify-center" aria-hidden="true">
                                            <Paperclip className="h-4 w-4 text-muted-foreground" />
                                        </div>
                                        <div className="text-xs font-semibold text-foreground">Drop SP4 here · or click to upload</div>
                                        <div className="text-[10px] text-muted-foreground italic">Demo · click to simulate the upload of MANATT-4F-SP4.json (54 KB)</div>
                                    </button>
                                </div>
                            )}
                            {variant === 'active' && step === 'step-1-uploading' && (
                                <div className="px-4 py-3 space-y-2" role="status" aria-busy="true">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 text-foreground animate-spin" aria-hidden="true" />
                                        <span className="text-xs font-semibold text-foreground">Uploading to NetSuite · ETA 4 min</span>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {SP4_UPLOAD_BULLETS.slice(0, uploadCount).map((b, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-foreground animate-in fade-in slide-in-from-left-1 duration-200">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" aria-hidden="true" />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {variant === 'done' && (
                                <div className="px-4 py-2.5 text-xs text-foreground flex items-center gap-2">
                                    <FileText className="h-3.5 w-3.5 text-success shrink-0" aria-hidden="true" />
                                    <span><strong>MANATT-4F-SP4.json</strong> · 54 KB · 149 lines mapped · NetSuite-ready</span>
                                </div>
                            )}
                            {variant === 'pending' && (
                                <div className="px-4 py-2.5 text-[11px] italic text-muted-foreground">
                                    Will activate at the start of the handoff.
                                </div>
                            )}
                        </section>
                    )
                })()}

                {/* STEP 2 · Coordinator · Apply 79% discount */}
                {(() => {
                    const variant: 'pending' | 'active' | 'done' =
                        currentStepNum > 2 ? 'done' :
                        currentStepNum === 2 ? 'active' :
                        'pending'
                    return (
                        <section
                            aria-label="Step 2 · Coordinator · Apply 79% discount"
                            aria-current={variant === 'active' ? 'step' : undefined}
                            className={`rounded-xl border overflow-hidden ${
                                variant === 'done' ? 'border-success/30 bg-success/5' :
                                variant === 'active' ? 'border-border bg-card' :
                                'border-border bg-card opacity-60'
                            }`}
                        >
                            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">
                                    2
                                </span>
                                <DollarSign className="h-4 w-4 text-foreground shrink-0" aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
                                        Apply 79% discount
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">Sales Coordinator · SQ #{MANATT_ORDER_META.specialQuote}</div>
                                </div>
                                <StatusChip variant={variant} />
                            </div>

                            {variant === 'active' && (
                                <div className="px-4 py-3 space-y-2.5">
                                    <p className="text-[11px] text-muted-foreground">
                                        SP4 is loaded · apply the GSA price-protected discount to lock the net total.
                                    </p>
                                    <ul className="divide-y divide-border text-[11px] rounded-lg border border-border overflow-hidden">
                                        <li className="px-3 py-1.5 flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">List total</span>
                                            <span className="text-foreground tabular-nums">${MANATT_ORDER_META.listTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </li>
                                        <li className="px-3 py-1.5 flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Discount (79% off)</span>
                                            <span className="text-foreground tabular-nums">−${MANATT_ORDER_META.discountTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </li>
                                        <li className="px-3 py-1.5 flex items-center justify-between gap-3 bg-muted/30">
                                            <span className="text-foreground font-medium">Net total</span>
                                            <span className="text-success font-bold tabular-nums">${MANATT_ORDER_META.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </li>
                                    </ul>
                                    <button
                                        type="button"
                                        onClick={() => setStep('step-3-review')}
                                        aria-label="Apply 79% discount in NetSuite"
                                        className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                                    >
                                        <DollarSign className="h-3.5 w-3.5" aria-hidden="true" />
                                        Apply 79% discount
                                    </button>
                                </div>
                            )}
                            {variant === 'done' && (
                                <div className="px-4 py-2.5 text-xs text-foreground flex items-center gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" aria-hidden="true" />
                                    <span><strong>Net ${MANATT_ORDER_META.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> applied · SQ #{MANATT_ORDER_META.specialQuote} · ready for sales handoff</span>
                                </div>
                            )}
                            {variant === 'pending' && (
                                <div className="px-4 py-2.5 text-[11px] italic text-muted-foreground">
                                    Discount calculator unlocks once SP4 is uploaded.
                                </div>
                            )}
                        </section>
                    )
                })()}

                {/* STEP 3 · Salesperson · Review + release PO to Teknion */}
                {(() => {
                    const variant: 'pending' | 'active' | 'done' =
                        step === 'step-3-released' ? 'done' :
                        currentStepNum === 3 ? 'active' :
                        'pending'
                    return (
                        <section
                            aria-label="Step 3 · Salesperson Caitlin · Review and release PO to Teknion"
                            aria-current={variant === 'active' ? 'step' : undefined}
                            className={`rounded-xl border overflow-hidden ${
                                variant === 'done' ? 'border-success/30 bg-success/5' :
                                variant === 'active' ? 'border-border bg-card' :
                                'border-border bg-card opacity-60'
                            }`}
                        >
                            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">
                                    3
                                </span>
                                <Send className="h-4 w-4 text-foreground shrink-0" aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold uppercase tracking-wider text-foreground truncate">
                                        Release PO to Teknion
                                    </div>
                                    <div className="text-[10px] text-muted-foreground truncate">Salesperson · Caitlin Barolet</div>
                                </div>
                                <StatusChip variant={variant} />
                            </div>

                            {variant === 'active' && (
                                <div className="px-4 py-3 space-y-2.5">
                                    <p className="text-[11px] text-muted-foreground">
                                        Review the PO before sending to Teknion · the PO number is generated on release.
                                    </p>
                                    <ul className="divide-y divide-border text-[11px] rounded-lg border border-border overflow-hidden">
                                        <li className="px-3 py-1.5 flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">PO number</span>
                                            <span className="text-muted-foreground italic">TBD on release</span>
                                        </li>
                                        <li className="px-3 py-1.5 flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">SQ #</span>
                                            <span className="text-foreground tabular-nums">{MANATT_ORDER_META.specialQuote} · GSA price-protected</span>
                                        </li>
                                        <li className="px-3 py-1.5 flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Net total</span>
                                            <span className="text-success font-bold tabular-nums">${MANATT_ORDER_META.netTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                        </li>
                                        <li className="px-3 py-1.5 flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Sched ship</span>
                                            <span className="text-foreground tabular-nums">{MANATT_ORDER_META.schedShipDate}</span>
                                        </li>
                                        <li className="px-3 py-1.5 flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Recipient</span>
                                            <span className="text-foreground font-mono">tekco1@teknion.com</span>
                                        </li>
                                    </ul>
                                    {step === 'step-3-review' ? (
                                        <button
                                            type="button"
                                            onClick={() => setStep('step-3-releasing')}
                                            aria-label="Review and release PO to Teknion"
                                            className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1"
                                        >
                                            <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                            Release PO to Teknion →
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            disabled
                                            aria-busy="true"
                                            className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-muted text-muted-foreground text-xs font-medium cursor-not-allowed"
                                        >
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                                            Releasing PO…
                                        </button>
                                    )}
                                </div>
                            )}
                            {variant === 'done' && (
                                <div className="px-4 py-2.5 text-xs text-foreground space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" aria-hidden="true" />
                                        <span><strong>{MANATT_ORDER_META.poNumber}</strong> generated · sent to tekco1@teknion.com</span>
                                    </div>
                                    <div className="pl-5 text-[11px] text-muted-foreground">
                                        Universal #{MANATT_ORDER_META.universal} · order receipt {MANATT_ORDER_META.orderReceipt}
                                    </div>
                                </div>
                            )}
                            {variant === 'pending' && (
                                <div className="px-4 py-2.5 text-[11px] italic text-muted-foreground">
                                    Awaiting Coordinator handoff · Caitlin reviews and releases when ready.
                                </div>
                            )}
                        </section>
                    )
                })()}
            </div>

            {/* Footer CTA · enabled only when step-3-released */}
            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                {!canContinue ? (
                    <button
                        type="button"
                        disabled
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed"
                    >
                        {disabledCopy}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onValidate}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
                    >
                        Continue to Acknowledgment review
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
            </div>
        </>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LABOR & DELIVERY · 8 PANELS (sc-LD.0 to sc-LD.7)
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Shared L&D building block: painpoint chip at bottom of each panel ──────
function PainpointChip({ text }: { text: string }) {
    return (
        <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 flex items-start gap-2 text-[11px]">
            <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
            <span className="text-foreground leading-relaxed">{text}</span>
        </div>
    )
}

// ─── Shared L&D building block: AI-grounded source line ─────────────────────
function SourceCite({ source }: { source: string }) {
    return (
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground italic">
            <Sparkles className="h-3 w-3 text-ai shrink-0" aria-hidden="true" />
            <span>{source}</span>
        </span>
    )
}

// ─── sc-LD.0 · RFPIntakePanel ───────────────────────────────────────────────
interface LDPanelProps { onValidate: () => void }

const RFP_ATTACHMENTS = [
    { name: 'manatt-4th-floor.dwg', size: '2.4 MB', label: 'CAD drawing' },
    { name: 'cbre-rfp-cover.pdf',   size: '184 KB', label: 'RFP cover letter' },
    { name: 'manatt-sif.pdf',       size: '92 KB',  label: 'SIF (scope of work)' },
] as const

function RFPIntakePanel({ onValidate }: LDPanelProps) {
    const [acknowledged, setAcknowledged] = useState(false)
    const [showAttachments, setShowAttachments] = useState(false)

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
                {/* Email-style header card · sender info */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-full bg-info/20 flex items-center justify-center shrink-0" aria-hidden="true">
                            <span className="text-[10px] font-black text-info">JS</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-foreground truncate">{MANATT_LD_RFP.gcContactName}</div>
                            <div className="text-[10px] text-muted-foreground truncate">CBRE · General Contractor</div>
                        </div>
                        <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0 ${
                            acknowledged ? 'bg-success/10 text-success border border-success/20' : 'bg-warning/10 text-warning border border-warning/20'
                        }`}>
                            {acknowledged ? <><CheckCircle2 className="h-3 w-3" aria-hidden="true" /> Active</> : 'New'}
                        </span>
                    </div>
                    <div className="px-4 py-3 space-y-2">
                        <div className="text-xs text-foreground">
                            <strong>Subject:</strong> Labor RFP · MANATT 4F · responses due Wed May 14 9 AM
                        </div>
                        <p className="text-[11px] text-muted-foreground leading-relaxed">
                            Please quote labor + delivery for the {MANATT_LD_RFP.projectName}. Drawings + SIF attached. Submit pricing back via Building Connected — ref {MANATT_LD_RFP.gcPortalRef}.
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-muted-foreground pt-1">
                            <Mail className="h-3 w-3" aria-hidden="true" />
                            <span>{MANATT_LD_RFP.gcContact}</span>
                            <span className="text-border">·</span>
                            <Calendar className="h-3 w-3" aria-hidden="true" />
                            <span>Received {MANATT_LD_RFP.rfpReceivedAt}</span>
                        </div>
                    </div>
                </div>

                {/* Attachments · expandable */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <button
                        type="button"
                        onClick={() => setShowAttachments(v => !v)}
                        aria-expanded={showAttachments}
                        className="w-full px-4 py-2.5 flex items-center gap-2 hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <Paperclip className="h-3.5 w-3.5 text-foreground shrink-0" aria-hidden="true" />
                        <span className="text-xs font-semibold text-foreground">{RFP_ATTACHMENTS.length} attachments</span>
                        <span className="ml-auto"><ChevronDown className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${showAttachments ? 'rotate-180' : ''}`} aria-hidden="true" /></span>
                    </button>
                    {showAttachments && (
                        <ul className="divide-y divide-border border-t border-border animate-in fade-in slide-in-from-top-1 duration-200">
                            {RFP_ATTACHMENTS.map(att => (
                                <li key={att.name} className="px-4 py-2 flex items-center gap-2.5 text-[11px]">
                                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                                    <span className="text-foreground font-medium truncate flex-1">{att.name}</span>
                                    <span className="text-muted-foreground italic">{att.label}</span>
                                    <span className="text-muted-foreground tabular-nums">{att.size}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* AI routing card */}
                <div className="rounded-xl border border-ai/30 bg-ai/5 px-4 py-3 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold text-foreground">Strata routed this RFP to the labor inbox</div>
                        <div className="text-muted-foreground mt-0.5">
                            Building KB · 1551 K St NW · 5 prior projects ({MANATT_LD_RFP.market} market). MANATT Spec Check is already in flight for the same project · Kimberly's BOM links here.
                        </div>
                    </div>
                </div>

                {/* Painpoint hero · why this step matters */}
                <PainpointChip text={`Today: RFPs scattered across 7 intake formats · no tracking. ${LD_VOLUME_FACTS.outboundEmailsPerMonth} bid request emails/month manually. ${LD_VOLUME_FACTS.furniturePct}% of ${LD_VOLUME_FACTS.estimatesPerMonth} estimates/mo are Furniture · ${LD_VOLUME_FACTS.wallsPct}% Walls.`} />

                {/* Acknowledge action + SLA */}
                {!acknowledged ? (
                    <button
                        type="button"
                        onClick={() => setAcknowledged(true)}
                        aria-label="Acknowledge & route RFP"
                        className="w-full inline-flex items-center justify-center gap-1.5 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <Inbox className="h-4 w-4" aria-hidden="true" />
                        Acknowledge & route · start SLA
                    </button>
                ) : (
                    <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden="true" />
                        <div className="flex-1 min-w-0 text-xs">
                            <div className="font-semibold text-foreground">RFP acknowledged · routed to Alan McPhee</div>
                            <div className="text-muted-foreground mt-0.5 tabular-nums">SLA · {MANATT_LD_RFP.slaDeadlineHours}h MSA · due {MANATT_LD_RFP.slaDeadlineAt}</div>
                        </div>
                    </div>
                )}

            </div>

            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                <button
                    type="button"
                    onClick={onValidate}
                    disabled={!acknowledged}
                    className={`w-full inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors ${
                        acknowledged
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                >
                    {acknowledged ? <>Continue to scope takeoff <ArrowRight className="h-4 w-4" aria-hidden="true" /></> : 'Acknowledge the RFP first'}
                </button>
            </div>
        </>
    )
}

// ─── sc-LD.1 · TakeoffPanel ─────────────────────────────────────────────────
function TakeoffPanel({ onValidate }: LDPanelProps) {
    const vertical = useOfficeworksVertical()
    const { takeoff: VERTICAL_TAKEOFF, takeoffBullets: VERTICAL_BULLETS, scopeUnitLabel, scopeUnitValue, scopeSecondary } = getActiveVerticalData(vertical)
    type Phase = 'idle' | 'running' | 'done'
    const [phase, setPhase] = useState<Phase>('idle')
    const [bulletCount, setBulletCount] = useState(0)
    // Override count tracks the primary scope unit (workstations for Furniture,
    // linear feet for Walls). We default to the takeoff's primary value.
    const primaryScopeValue = 'workstationCount' in VERTICAL_TAKEOFF ? VERTICAL_TAKEOFF.workstationCount : VERTICAL_TAKEOFF.linearFeet
    const [overrideCount, setOverrideCount] = useState<number>(primaryScopeValue)
    const [overrideTouched, setOverrideTouched] = useState(false)
    const timeoutsRef = useRef<number[]>([])

    useEffect(() => () => {
        timeoutsRef.current.forEach(id => window.clearTimeout(id))
        timeoutsRef.current = []
    }, [])

    useEffect(() => {
        if (phase !== 'running') return
        VERTICAL_BULLETS.forEach((_, i) => {
            const id = window.setTimeout(() => setBulletCount(i + 1), 350 * (i + 1))
            timeoutsRef.current.push(id)
        })
        const doneId = window.setTimeout(() => setPhase('done'), 350 * VERTICAL_BULLETS.length + 200)
        timeoutsRef.current.push(doneId)
    }, [phase])

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
                <div className="rounded-xl border border-ai/30 bg-ai/5 px-4 py-3 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold text-foreground">Scope takeoff · the single most time-consuming step</div>
                        <div className="text-muted-foreground mt-0.5">
                            Today: ~{VERTICAL_TAKEOFF.bluebeamTimeManualMin / 60}h manual count in Bluebeam (Alan + Paul · ~42:00). With Strata: {VERTICAL_TAKEOFF.strataTimeSec}s read of {MANATT_LD_RFP.drawingFile}.
                        </div>
                    </div>
                </div>

                {/* Painpoint hero · why this step matters */}
                <PainpointChip text={`Today: ${LD_VOLUME_FACTS.bluebeamManualNote}. With Strata: 18s + reviewable overrides.`} />

                {/* Drawing thumbnail + AI takeoff button */}
                {phase === 'idle' && (
                    <button
                        type="button"
                        onClick={() => setPhase('running')}
                        aria-label="Run AI takeoff on the drawing"
                        className="w-full border-2 border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-lg p-4 flex flex-col items-center justify-center gap-2 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <div className="h-10 w-10 rounded-xl bg-muted/60 flex items-center justify-center" aria-hidden="true">
                            <MapPin className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="text-xs font-semibold text-foreground">Run AI takeoff on {MANATT_LD_RFP.drawingFile}</div>
                        <div className="text-[10px] text-muted-foreground italic">Click to simulate · same drawing as the design flow</div>
                    </button>
                )}
                {phase === 'running' && (
                    <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-2" role="status" aria-busy="true">
                        <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 text-foreground animate-spin" aria-hidden="true" />
                            <span className="text-xs font-semibold text-foreground">AI takeoff in progress · {VERTICAL_TAKEOFF.strataTimeSec}s</span>
                        </div>
                        <ul className="space-y-1.5">
                            {VERTICAL_BULLETS.slice(0, bulletCount).map((b, i) => (
                                <li key={i} className="flex items-start gap-2 text-xs text-foreground animate-in fade-in slide-in-from-left-1 duration-200">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" aria-hidden="true" />
                                    <span>{b}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {phase === 'done' && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="grid grid-cols-2 gap-2.5">
                            {[
                                { label: scopeUnitLabel, value: overrideCount, editable: true },
                                vertical === 'walls'
                                    ? { label: 'Doors', value: 'doorCount' in VERTICAL_TAKEOFF ? VERTICAL_TAKEOFF.doorCount : 0, editable: false }
                                    : { label: 'CRs', value: 'crCount' in VERTICAL_TAKEOFF ? VERTICAL_TAKEOFF.crCount : 0, editable: false },
                                { label: 'Labor hours',  value: `${VERTICAL_TAKEOFF.estimatedLaborHours} h`, editable: false },
                                { label: 'Delivery stops', value: VERTICAL_TAKEOFF.estimatedDeliveryStops, editable: false },
                            ].map(m => (
                                <div key={m.label} className="rounded-lg border border-border bg-card px-3 py-2.5">
                                    <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">{m.label}</div>
                                    {m.editable ? (
                                        <div className="flex items-center gap-1.5 mt-1">
                                            <input
                                                type="number"
                                                min={1}
                                                max={9999}
                                                value={overrideCount}
                                                onChange={e => { setOverrideCount(Math.max(1, Math.min(9999, parseInt(e.target.value) || primaryScopeValue))); setOverrideTouched(true) }}
                                                aria-label={`Override ${scopeUnitLabel.toLowerCase()}`}
                                                className="w-16 text-lg font-bold text-foreground bg-transparent border-b border-border focus:outline-none focus:border-primary tabular-nums"
                                            />
                                            <Edit3 className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                                        </div>
                                    ) : (
                                        <div className="text-lg font-bold text-foreground tabular-nums mt-1">{m.value}</div>
                                    )}
                                </div>
                            ))}
                        </div>
                        {vertical === 'walls' && (
                            <div className="text-[10px] text-muted-foreground italic">Wall heights · {scopeSecondary}</div>
                        )}
                        {overrideTouched && overrideCount !== primaryScopeValue && (
                            <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 flex items-center gap-2 text-[11px] animate-in fade-in duration-150">
                                <Save className="h-3.5 w-3.5 text-info shrink-0" aria-hidden="true" />
                                <span className="text-foreground">Override saved · Strata learns from this for future takeoffs.</span>
                            </div>
                        )}
                    </div>
                )}

            </div>

            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                <button
                    type="button"
                    onClick={onValidate}
                    disabled={phase !== 'done'}
                    className={`w-full inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors ${
                        phase === 'done'
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                >
                    {phase === 'done' ? <>Continue to building conditions <ArrowRight className="h-4 w-4" aria-hidden="true" /></> : phase === 'running' ? 'Running takeoff…' : 'Run takeoff first'}
                </button>
            </div>
        </>
    )
}

// ─── sc-LD.2 · ConditionsChecklistPanel ─────────────────────────────────────
function ConditionsChecklistPanel({ onValidate }: LDPanelProps) {
    const [expandedId, setExpandedId] = useState<string | null>(null)
    const [confirmedIds, setConfirmedIds] = useState<Set<string>>(() => {
        // High-confidence items are auto-confirmed
        return new Set(MANATT_BUILDING_CONDITIONS.filter(c => c.confidence === 'high').map(c => c.id))
    })
    const mediumIds = MANATT_BUILDING_CONDITIONS.filter(c => c.confidence === 'medium').map(c => c.id)
    const allConfirmed = mediumIds.every(id => confirmedIds.has(id))

    const handleConfirm = (id: string) => {
        setConfirmedIds(prev => { const s = new Set(prev); s.add(id); return s })
    }

    const highCount = MANATT_BUILDING_CONDITIONS.filter(c => c.confidence === 'high').length

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
                <div className="rounded-xl border border-ai/30 bg-ai/5 px-4 py-3 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold text-foreground">
                            Strata pulled {highCount} of {MANATT_BUILDING_CONDITIONS.length} conditions from Building KB · {MANATT_LD_RFP.buildingAddress}
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                            {MANATT_LD_RFP.priorProjectsAtAddress} prior projects at this address · {mediumIds.length} medium-confidence items need Alan's confirm.
                        </div>
                    </div>
                </div>

                {/* Painpoint hero · why this step matters */}
                <PainpointChip text={LD_VOLUME_FACTS.nowhereCurrentlyQuote} />

                {/* GW-F3 escalation hint · BPMN path "No" by default · would route to F3a Sr Ops resolution if confidence drops */}
                {!allConfirmed && (
                    <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 flex items-start gap-2 text-[11px] animate-in fade-in duration-200">
                        <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="text-foreground leading-relaxed">
                            <strong>GW-F3 gateway</strong> · {mediumIds.length - mediumIds.filter(id => confirmedIds.has(id)).length} medium-confidence condition(s) pending. If left unconfirmed, Strata escalates to <strong>Sr Operations</strong> for resolution (F3a path) before vendor pool selection unlocks.
                        </div>
                    </div>
                )}

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Building2 className="h-3.5 w-3.5 text-foreground shrink-0" aria-hidden="true" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Building & workforce conditions ({MANATT_BUILDING_CONDITIONS.length})</span>
                        <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-success/10 text-success border border-success/20">
                            {confirmedIds.size}/{MANATT_BUILDING_CONDITIONS.length} confirmed
                        </span>
                    </div>
                    <ul className="divide-y divide-border">
                        {MANATT_BUILDING_CONDITIONS.map(cond => {
                            const isExpanded = expandedId === cond.id
                            const isConfirmed = confirmedIds.has(cond.id)
                            const isMedium = cond.confidence === 'medium'
                            return (
                                <li key={cond.id} className="px-4 py-2.5">
                                    <button
                                        type="button"
                                        onClick={() => setExpandedId(isExpanded ? null : cond.id)}
                                        aria-expanded={isExpanded}
                                        className="w-full flex items-center gap-2 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded"
                                    >
                                        <ChevronRightIcon className={`h-3 w-3 text-muted-foreground shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} aria-hidden="true" />
                                        <span className="text-[11px] font-medium text-foreground truncate min-w-0">{cond.label}</span>
                                        <span className="text-[11px] text-muted-foreground tabular-nums truncate">{cond.value}</span>
                                        <span className={`ml-auto inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0 ${
                                            isConfirmed ? 'bg-success/10 text-success border border-success/20' :
                                            isMedium ? 'bg-warning/10 text-warning border border-warning/20' :
                                            'bg-muted text-muted-foreground border border-border'
                                        }`}>
                                            {isConfirmed ? <><CheckCircle2 className="h-2.5 w-2.5 mr-1" aria-hidden="true" /> {cond.confidence}</> : cond.confidence}
                                        </span>
                                    </button>
                                    {isExpanded && (
                                        <div className="pl-5 pt-2 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                                            <SourceCite source={cond.source} />
                                            {isMedium && !isConfirmed && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleConfirm(cond.id)}
                                                    aria-label={`Confirm ${cond.label}`}
                                                    className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider bg-foreground text-background rounded px-2 py-1 hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                                >
                                                    <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" />
                                                    Confirm value
                                                </button>
                                            )}
                                            {isConfirmed && isMedium && (
                                                <div className="text-[10px] text-success">Confirmed by Alan</div>
                                            )}
                                        </div>
                                    )}
                                </li>
                            )
                        })}
                    </ul>
                </div>

            </div>

            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                <button
                    type="button"
                    onClick={onValidate}
                    disabled={!allConfirmed}
                    className={`w-full inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors ${
                        allConfirmed
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                >
                    {allConfirmed ? <>Save to project · continue to vendor pool <ArrowRight className="h-4 w-4" aria-hidden="true" /></> : `Confirm ${mediumIds.length - mediumIds.filter(id => confirmedIds.has(id)).length} medium-confidence item(s) first`}
                </button>
            </div>
        </>
    )
}

// ─── sc-LD.3 · VendorPoolSelector ───────────────────────────────────────────
interface VendorPoolSelectorProps extends LDPanelProps {
    selectedVendorIds: string[] | null
    onSelectVendors: (ids: string[]) => void
}

function VendorPoolSelector({ onValidate, selectedVendorIds, onSelectVendors }: VendorPoolSelectorProps) {
    const vertical = useOfficeworksVertical()
    const { installers, governance } = getActiveVerticalData(vertical)
    // Default: all 3 pre-selected (Alan's default behavior · he can deselect)
    const initialSelection = useMemo(
        () => selectedVendorIds && selectedVendorIds.length > 0
            ? new Set(selectedVendorIds)
            : new Set(installers.map(v => v.id)),
        [selectedVendorIds, installers]
    )
    const [selection, setSelection] = useState<Set<string>>(initialSelection)

    const toggle = (id: string) => {
        setSelection(prev => {
            const s = new Set(prev)
            if (s.has(id)) s.delete(id); else s.add(id)
            return s
        })
    }

    const handleContinue = () => {
        onSelectVendors(Array.from(selection))
        onValidate()
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
                <div className="rounded-xl border border-ai/30 bg-ai/5 px-4 py-3 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold text-foreground">
                            {vertical === 'walls' ? 'Walls installer pool · centralized governance' : 'DC installer pool · consolidated May/2026'}
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                            {vertical === 'walls'
                                ? `${governance?.contrastNote}. Paul actively workload-balances · structured PDF Section A-G.`
                                : `${LD_VOLUME_FACTS.vendorConsolidationNote}. Strata flags capacity + scorecard per vendor.`}
                        </div>
                    </div>
                </div>

                {/* Painpoint hero · why this step matters */}
                <PainpointChip text={vertical === 'walls'
                    ? "Walls already workload-balanced (Paul selects centrally) · contrast vs Furniture decentralized. With Strata: same scorecard surface, same audit trail across both verticals."
                    : "Today: PMs select freely · no capacity check · multi-million job to same vendor 3x in a row possible (Alan, ~32:19). With Strata: capacity-aware + scorecard-backed."
                } />

                {installers.map(v => {
                    const isSelected = selection.has(v.id)
                    return (
                        <div
                            key={v.id}
                            className={`rounded-xl border overflow-hidden transition-colors ${
                                isSelected ? 'border-border bg-card' : 'border-border bg-card opacity-60'
                            }`}
                        >
                            <div className="px-4 py-3 flex items-start gap-3">
                                <label className="flex items-start cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={isSelected}
                                        onChange={() => toggle(v.id)}
                                        aria-label={`${isSelected ? 'Deselect' : 'Select'} ${v.name}`}
                                        className="mt-1 h-4 w-4 rounded border-border accent-primary cursor-pointer"
                                    />
                                </label>
                                <div className="flex-1 min-w-0 space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="text-xs font-bold text-foreground truncate">{v.name}</span>
                                        {v.flagText && (
                                            <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0 ${
                                                v.flagTone === 'success' ? 'bg-success/10 text-success border border-success/20' :
                                                v.flagTone === 'warning' ? 'bg-warning/10 text-warning border border-warning/20' :
                                                'bg-muted text-muted-foreground border border-border'
                                            }`}>
                                                {v.flagTone === 'success' && <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />}
                                                {v.flagTone === 'warning' && <AlertTriangle className="h-2.5 w-2.5" aria-hidden="true" />}
                                                {v.flagText}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground">
                                        {v.markets} · {v.msaRate} · {v.unionStatus}
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 pt-1">
                                        <div className="text-center">
                                            <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">Headroom</div>
                                            <div className={`text-[11px] font-bold tabular-nums ${
                                                v.headroomTone === 'success' ? 'text-success' :
                                                v.headroomTone === 'warning' ? 'text-warning' :
                                                'text-foreground'
                                            }`}>{v.headroom}</div>
                                            <div className="text-[9px] text-muted-foreground tabular-nums">{v.activeJobsCount} active · {v.crewCapacityRemaining}h crew left</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">On-time</div>
                                            <div className="text-[11px] font-bold text-foreground tabular-nums flex items-center justify-center gap-0.5">
                                                {v.onTimeRate}%
                                                {v.onTimeTrend === 'up' && <span className="text-success" aria-label="trending up">↑</span>}
                                                {v.onTimeTrend === 'down' && <span className="text-warning" aria-label="trending down">↓</span>}
                                                {v.onTimeTrend === 'flat' && <span className="text-muted-foreground" aria-label="flat">→</span>}
                                            </div>
                                            <div className="text-[9px] text-muted-foreground tabular-nums">past 12mo: {v.past12moJobs} jobs</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground">CO rate</div>
                                            <div className="text-[11px] font-bold text-foreground tabular-nums flex items-center justify-center gap-0.5">
                                                {v.changeOrderRate}%
                                                {v.changeOrderTrend === 'up' && <span className="text-warning" aria-label="trending up">↑</span>}
                                                {v.changeOrderTrend === 'down' && <span className="text-success" aria-label="trending down">↓</span>}
                                                {v.changeOrderTrend === 'flat' && <span className="text-muted-foreground" aria-label="flat">→</span>}
                                            </div>
                                            <div className="text-[9px] text-muted-foreground italic">{v.changeOrderTrend === 'down' ? 'improving' : v.changeOrderTrend === 'up' ? 'watch' : 'stable'}</div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                })}

            </div>

            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                <button
                    type="button"
                    onClick={handleContinue}
                    disabled={selection.size === 0}
                    className={`w-full inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors ${
                        selection.size > 0
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                >
                    {selection.size > 0 ? <>Continue with {selection.size} installer{selection.size > 1 ? 's' : ''} <ArrowRight className="h-4 w-4" aria-hidden="true" /></> : 'Select at least 1 installer'}
                </button>
            </div>
        </>
    )
}

// ─── sc-LD.4 · BidRequestPanel ──────────────────────────────────────────────
interface BidRequestPanelProps extends LDPanelProps {
    selectedVendorIds: string[] | null
}

function BidRequestPanel({ onValidate, selectedVendorIds }: BidRequestPanelProps) {
    const vertical = useOfficeworksVertical()
    const { installers, actor } = getActiveVerticalData(vertical)
    const selectedVendors = installers.filter(v =>
        selectedVendorIds && selectedVendorIds.length > 0 ? selectedVendorIds.includes(v.id) : true
    )
    const [sent, setSent] = useState(false)

    const handleSend = () => {
        setSent(true)
    }

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
                {/* Painpoint hero · why this step matters */}
                <PainpointChip text={`~${LD_VOLUME_FACTS.outboundEmailsPerMonth} outbound emails/month manually today. With Strata: 1-click + tracked SLA per recipient.`} />

                {/* Email composer header */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-foreground shrink-0" aria-hidden="true" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Bid request · drafted by Strata · sent by Alan</span>
                    </div>
                    <div className="px-4 py-3 space-y-2.5 text-xs">
                        <div className="grid grid-cols-[60px_1fr] gap-2 items-start">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground pt-0.5">From</span>
                            <span className="text-foreground">{actor.fullName} &lt;{actor.email}&gt;</span>
                        </div>
                        <div className="grid grid-cols-[60px_1fr] gap-2 items-start">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground pt-0.5">To</span>
                            <div className="flex flex-wrap gap-1">
                                {selectedVendors.map(v => (
                                    <span key={v.id} className="inline-flex items-center gap-1 text-[10px] font-medium bg-info/10 text-info border border-info/20 rounded px-1.5 py-0.5">
                                        {v.name}
                                    </span>
                                ))}
                            </div>
                        </div>
                        <div className="grid grid-cols-[60px_1fr] gap-2 items-start">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground pt-0.5">Subject</span>
                            <span className="text-foreground font-medium">Bid request · {MANATT_LD_RFP.projectName} · respond by {MANATT_LD_RFP.slaDeadlineAt}</span>
                        </div>
                        <div className="border-t border-border pt-2.5">
                            <div className="text-[11px] text-foreground leading-relaxed space-y-1.5">
                                <p>Team,</p>
                                <p>We have a labor + delivery RFP for {MANATT_LD_RFP.projectName} ({MANATT_LD_RFP.market} market · {MANATT_LD_RFP.buildingAddress}). Scope summary attached + drawings.</p>
                                <p>
                                    <strong>Scope</strong>: {vertical === 'walls' ? `${WALLS_TAKEOFF.linearFeet} linear feet · ${WALLS_TAKEOFF.doorCount} doors · ${WALLS_TAKEOFF.wallHeights}` : `${MANATT_TAKEOFF.workstationCount} workstations · ${MANATT_TAKEOFF.crCount} CRs`} · {(vertical === 'walls' ? WALLS_TAKEOFF : MANATT_TAKEOFF).estimatedLaborHours}h estimated labor · {(vertical === 'walls' ? WALLS_TAKEOFF : MANATT_TAKEOFF).estimatedDeliveryStops} delivery stops. Building is IBEW Local 26 union, dock-with-leveler, straight-time only.
                                </p>
                                <p>
                                    <strong>Deadline</strong>: respond by {MANATT_LD_RFP.slaDeadlineAt} ({MANATT_LD_RFP.slaDeadlineHours}h MSA window). Please separate labor and delivery in your quote.
                                </p>
                                <p className="text-muted-foreground italic pt-1">— Alan McPhee · Sr Operations · drafted by Strata</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pre-flight checks */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <ShieldCheck className="h-3.5 w-3.5 text-foreground shrink-0" aria-hidden="true" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Pre-flight · 3 checks</span>
                    </div>
                    <ul className="divide-y divide-border">
                        {[
                            { label: `Recipient list complete (${selectedVendors.length})`, ok: selectedVendors.length > 0 },
                            { label: 'Attachments present (3) · drawings + conditions + bid form', ok: true },
                            { label: `Deadline within ${MANATT_LD_RFP.slaDeadlineHours}h MSA window`, ok: true },
                        ].map(check => (
                            <li key={check.label} className="px-4 py-2 flex items-center gap-2 text-[11px]">
                                <CheckCircle2 className={`h-3.5 w-3.5 shrink-0 ${check.ok ? 'text-success' : 'text-muted-foreground'}`} aria-hidden="true" />
                                <span className="text-foreground">{check.label}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {sent ? (
                    <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 flex items-center gap-2.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden="true" />
                        <div className="flex-1 min-w-0 text-xs">
                            <div className="font-semibold text-foreground">Bid request sent · {selectedVendors.length} delivery {selectedVendors.length > 1 ? 'tracks' : 'track'}</div>
                            <div className="text-muted-foreground mt-0.5">SLA timer per recipient · 48h. Strata watches for responses.</div>
                        </div>
                    </div>
                ) : (
                    <button
                        type="button"
                        onClick={handleSend}
                        aria-label={`Send bid request to ${selectedVendors.length} installers`}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                        <Send className="h-4 w-4" aria-hidden="true" />
                        Send to {selectedVendors.length} installer{selectedVendors.length > 1 ? 's' : ''}
                    </button>
                )}

            </div>

            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                <button
                    type="button"
                    onClick={onValidate}
                    disabled={!sent}
                    className={`w-full inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors ${
                        sent
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                >
                    {sent ? <>Continue to bid evaluation <ArrowRight className="h-4 w-4" aria-hidden="true" /></> : 'Send the bid request first'}
                </button>
            </div>
        </>
    )
}

// ─── sc-LD.5 · BidComparisonPanel ───────────────────────────────────────────
function BidComparisonPanel({ onValidate }: LDPanelProps) {
    const vertical = useOfficeworksVertical()
    const { installers, bids: VERTICAL_BIDS, benchmark } = getActiveVerticalData(vertical)
    type VendorPhase = 'waiting' | 'received'
    const [phases, setPhases] = useState<Record<string, VendorPhase>>(() =>
        Object.fromEntries(installers.map(v => [v.id, 'waiting']))
    )
    const timeoutsRef = useRef<number[]>([])

    useEffect(() => () => {
        timeoutsRef.current.forEach(id => window.clearTimeout(id))
        timeoutsRef.current = []
    }, [])

    useEffect(() => {
        VERTICAL_BIDS.forEach(bid => {
            const id = window.setTimeout(() => {
                setPhases(prev => ({ ...prev, [bid.vendorId]: 'received' }))
            }, bid.arrivalDelayMs)
            timeoutsRef.current.push(id)
        })
    }, [VERTICAL_BIDS])

    const allReceived = Object.values(phases).every(p => p === 'received')

    const bidsWithVariance = VERTICAL_BIDS.map(bid => {
        const variance = Math.round(((bid.total - benchmark.totalBaseline) / benchmark.totalBaseline) * 100)
        const tone: 'success' | 'warning' | 'danger' =
            Math.abs(variance) < 5 ? 'success' :
            Math.abs(variance) < benchmark.varianceThresholdPct ? 'warning' :
            'danger'
        return { ...bid, variance, tone }
    })

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
                {/* Strata Internal Number · hero card · matches Alan's vision (~46:32) */}
                <div className="rounded-xl border border-ai/30 bg-ai/5 px-4 py-3.5 space-y-2">
                    <div className="flex items-start gap-2.5">
                        <Sparkles className="h-4 w-4 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="flex-1 min-w-0 text-xs">
                            <div className="font-semibold text-foreground">Strata Internal Number · computed before bids arrive</div>
                            <div className="text-muted-foreground mt-0.5">
                                {benchmark.formulaText}. Variance threshold {benchmark.varianceThresholdPct}% · auto-flag outliers when bids land.
                            </div>
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2 pt-1.5 border-t border-ai/20">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Benchmark</span>
                        <span className="text-2xl font-bold text-ai tabular-nums">${benchmark.totalBaseline.toLocaleString()}</span>
                        <span className="text-[11px] text-muted-foreground italic ml-auto">→ comparing against this when 3 bids return</span>
                    </div>
                </div>

                {/* Painpoint hero · why this step matters */}
                <PainpointChip text="Today: Alan/Paul compare in their heads · no automated variance detection. With Strata: 15% threshold + flag outliers + reconcile suggestions." />

                {/* Vendor arrival cards (staggered) */}
                <div className="space-y-2">
                    {installers.map(v => {
                        const phase = phases[v.id]
                        const bid = bidsWithVariance.find(b => b.vendorId === v.id)
                        return (
                            <div key={v.id} className={`rounded-xl border overflow-hidden ${
                                phase === 'received' ? 'border-success/30 bg-success/5' : 'border-border bg-card opacity-60'
                            }`}>
                                <div className="px-4 py-2.5 flex items-center gap-2">
                                    <span className="text-xs font-bold text-foreground truncate min-w-0 flex-1">{v.name}</span>
                                    {phase === 'waiting' ? (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">
                                            <Loader2 className="h-2.5 w-2.5 animate-spin" aria-hidden="true" /> Waiting
                                        </span>
                                    ) : (
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 rounded px-1.5 py-0.5 shrink-0 animate-in fade-in slide-in-from-right-1 duration-200">
                                            <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" /> Received {bid?.receivedAt.slice(11)}
                                        </span>
                                    )}
                                </div>
                                {phase === 'received' && bid && (
                                    <div className="px-4 py-2 border-t border-border grid grid-cols-3 gap-2 text-[11px] animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div><span className="text-muted-foreground">Labor</span><div className="text-foreground tabular-nums">${bid.laborTotal.toLocaleString()}</div></div>
                                        <div><span className="text-muted-foreground">Delivery</span><div className="text-foreground tabular-nums">${bid.deliveryTotal.toLocaleString()}</div></div>
                                        <div><span className="text-muted-foreground">Total</span><div className="text-foreground font-bold tabular-nums">${bid.total.toLocaleString()}</div></div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>

                {allReceived && (
                    <>
                        {/* Comparison table with internal benchmark + variance */}
                        <div className="rounded-xl border border-border bg-card overflow-hidden animate-in fade-in slide-in-from-top-1 duration-300">
                            <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                                <ClipboardCheck className="h-3.5 w-3.5 text-foreground shrink-0" aria-hidden="true" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Variance vs internal benchmark · {benchmark.varianceThresholdPct}% threshold</span>
                            </div>
                            <table className="w-full text-[11px]">
                                <thead className="bg-muted/20">
                                    <tr className="text-left">
                                        <th className="px-3 py-1.5 font-semibold text-muted-foreground">Vendor</th>
                                        <th className="px-3 py-1.5 font-semibold text-muted-foreground text-right">Total</th>
                                        <th className="px-3 py-1.5 font-semibold text-muted-foreground text-right">vs benchmark</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {bidsWithVariance.map(b => {
                                        const v = installers.find(i => i.id === b.vendorId)!
                                        return (
                                            <tr key={b.vendorId} className="border-t border-border">
                                                <td className="px-3 py-1.5 text-foreground">{v.name}</td>
                                                <td className="px-3 py-1.5 text-foreground tabular-nums text-right">${b.total.toLocaleString()}</td>
                                                <td className="px-3 py-1.5 text-right">
                                                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold tabular-nums rounded px-1.5 py-0.5 ${
                                                        b.tone === 'success' ? 'bg-success/10 text-success border border-success/20' :
                                                        b.tone === 'warning' ? 'bg-warning/10 text-warning border border-warning/20' :
                                                        'bg-destructive/10 text-destructive border border-destructive/20'
                                                    }`}>
                                                        {b.variance > 0 ? '+' : ''}{b.variance}%
                                                    </span>
                                                </td>
                                            </tr>
                                        )
                                    })}
                                    <tr className="border-t border-border bg-muted/30">
                                        <td className="px-3 py-1.5 text-muted-foreground italic">Internal benchmark</td>
                                        <td className="px-3 py-1.5 text-foreground tabular-nums text-right">${benchmark.totalBaseline.toLocaleString()}</td>
                                        <td className="px-3 py-1.5 text-muted-foreground text-right">baseline</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Historical receipt callout */}
                        <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 flex items-start gap-2 text-[11px] animate-in fade-in duration-300">
                            <FileWarning className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" aria-hidden="true" />
                            <div className="text-foreground leading-relaxed">
                                <strong>{HISTORICAL_RECEIPTS.dcRebid2024.note}</strong> · ${HISTORICAL_RECEIPTS.dcRebid2024.quoted.toLocaleString()} → ${HISTORICAL_RECEIPTS.dcRebid2024.actual.toLocaleString()} (−${HISTORICAL_RECEIPTS.dcRebid2024.delta.toLocaleString()}). This is why variance check matters.
                            </div>
                        </div>
                    </>
                )}

            </div>

            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                <button
                    type="button"
                    onClick={onValidate}
                    disabled={!allReceived}
                    className={`w-full inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors ${
                        allReceived
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                >
                    {allReceived ? <>Proceed to winner selection <ArrowRight className="h-4 w-4" aria-hidden="true" /></> : 'Waiting on bids…'}
                </button>
            </div>
        </>
    )
}

// ─── sc-LD.6 · WinnerSelectPanel ────────────────────────────────────────────
interface WinnerSelectPanelProps extends LDPanelProps {
    winnerVendorId: string | null
    onSelectWinner: (id: string) => void
}

function WinnerSelectPanel({ onValidate, winnerVendorId, onSelectWinner }: WinnerSelectPanelProps) {
    const vertical = useOfficeworksVertical()
    const { installers, bids: VERTICAL_BIDS } = getActiveVerticalData(vertical)
    const [confirmed, setConfirmed] = useState<boolean>(winnerVendorId !== null)
    const [hoveredId, setHoveredId] = useState<string | null>(null)

    const handleSelect = (id: string) => {
        onSelectWinner(id)
        setConfirmed(true)
    }
    const recommendedVendor = installers.find(v => v.flagText === 'Strata recommends')

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
                <div className="rounded-xl border border-ai/30 bg-ai/5 px-4 py-3 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold text-foreground">
                            Strata recommends {recommendedVendor?.name ?? installers[0]?.name}
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                            Best mix of price, on-time and change-order rate across the {installers.length}-vendor pool. Drafts winner + {installers.length - 1} loser notifications.
                        </div>
                    </div>
                </div>

                {/* Painpoint hero · why this step matters */}
                <PainpointChip text="Today: PM picks · no scorecard data · history lives in Alan/Paul's heads. With Strata: scorecard-backed recommendation + audit trail." />

                {installers.map(v => {
                    const bid = VERTICAL_BIDS.find(b => b.vendorId === v.id)!
                    const isWinner = winnerVendorId === v.id
                    const isLoser = winnerVendorId !== null && !isWinner
                    return (
                        <div
                            key={v.id}
                            onMouseEnter={() => setHoveredId(v.id)}
                            onMouseLeave={() => setHoveredId(null)}
                            className={`rounded-xl border overflow-hidden transition-colors ${
                                isWinner ? 'border-success/40 bg-success/5' :
                                isLoser ? 'border-border bg-card opacity-50' :
                                hoveredId === v.id ? 'border-primary/40 bg-primary/5' : 'border-border bg-card'
                            }`}
                        >
                            <div className="px-4 py-3 flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-foreground truncate">{v.name}</span>
                                        {v.flagText === 'Strata recommends' && !confirmed && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 rounded px-1.5 py-0.5 shrink-0">
                                                <Sparkles className="h-2.5 w-2.5" aria-hidden="true" /> Recommended
                                            </span>
                                        )}
                                        {isWinner && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 rounded px-1.5 py-0.5 shrink-0">
                                                <CheckCircle2 className="h-2.5 w-2.5" aria-hidden="true" /> Awarded
                                            </span>
                                        )}
                                        {isLoser && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border rounded px-1.5 py-0.5 shrink-0">
                                                Declined · email sent
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] text-muted-foreground mt-0.5">
                                        ${bid.total.toLocaleString()} · {v.onTimeRate}% on-time · {v.changeOrderRate}% CO rate
                                    </div>
                                </div>
                                {!confirmed && (
                                    <button
                                        type="button"
                                        onClick={() => handleSelect(v.id)}
                                        aria-label={`Select ${v.name} as winner`}
                                        className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                            v.flagText === 'Strata recommends'
                                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                                : 'bg-muted text-foreground hover:bg-muted/80'
                                        }`}
                                    >
                                        Select winner
                                    </button>
                                )}
                            </div>
                        </div>
                    )
                })}

                {confirmed && winnerVendorId && (
                    <div className="rounded-xl border border-success/30 bg-success/5 px-4 py-3 space-y-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-success shrink-0" aria-hidden="true" />
                            <span className="text-xs font-semibold text-foreground">3 emails queued · drafted by Strata · sent by Alan</span>
                        </div>
                        <ul className="space-y-1 pl-6 text-[11px] text-foreground">
                            <li>Winner notify · {installers.find(v => v.id === winnerVendorId)?.name}</li>
                            {installers.filter(v => v.id !== winnerVendorId).map(v => (
                                <li key={v.id}>Decline notify · {v.name}</li>
                            ))}
                        </ul>
                        <div className="text-[10px] text-muted-foreground italic pt-1">Never auto-send · Alan reviews + confirms (CLAUDE.md rule).</div>
                    </div>
                )}

            </div>

            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                <button
                    type="button"
                    onClick={onValidate}
                    disabled={!confirmed}
                    className={`w-full inline-flex items-center justify-center gap-2 h-10 rounded-md text-sm font-medium transition-colors ${
                        confirmed
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                            : 'bg-muted text-muted-foreground cursor-not-allowed'
                    }`}
                >
                    {confirmed ? <>Continue to final quote assembly <ArrowRight className="h-4 w-4" aria-hidden="true" /></> : 'Select a winner first'}
                </button>
            </div>
        </>
    )
}

// ─── sc-LD.7 · FinalQuotePanel · 3-step sequential (reusa HandoffPanel pattern)
type FinalQuoteStep = 'step-1-margin' | 'step-2-excel' | 'step-3-upload' | 'step-3-uploading' | 'step-3-done'

function fqStepNumberOf(s: FinalQuoteStep): 1 | 2 | 3 {
    if (s === 'step-1-margin') return 1
    if (s === 'step-2-excel') return 2
    return 3
}

function FinalQuotePanel({ onValidate }: LDPanelProps) {
    const vertical = useOfficeworksVertical()
    const { finalQuote, bids: VERTICAL_BIDS } = getActiveVerticalData(vertical)
    const [step, setStep] = useState<FinalQuoteStep>('step-1-margin')
    const [marginPct, setMarginPct] = useState(finalQuote.owMarginPct * 100)
    const [bulletCount, setBulletCount] = useState(0)
    const [seniorReview, setSeniorReview] = useState(false)
    const timeoutsRef = useRef<number[]>([])

    useEffect(() => () => {
        timeoutsRef.current.forEach(id => window.clearTimeout(id))
        timeoutsRef.current = []
    }, [])

    useEffect(() => {
        if (step !== 'step-3-uploading') return
        PORTAL_UPLOAD_BULLETS.forEach((_, i) => {
            const id = window.setTimeout(() => setBulletCount(i + 1), 350 * (i + 1))
            timeoutsRef.current.push(id)
        })
        const doneId = window.setTimeout(() => setStep('step-3-done'), 350 * PORTAL_UPLOAD_BULLETS.length + 200)
        timeoutsRef.current.push(doneId)
    }, [step])

    const currentStepNum = fqStepNumberOf(step)
    const marginAmount = Math.round(finalQuote.vendorNet * (marginPct / 100))
    const quotedTotal = finalQuote.vendorNet + marginAmount
    const canContinue = step === 'step-3-done'

    const disabledCopy =
        step === 'step-1-margin'    ? 'Set the OW margin first…' :
        step === 'step-2-excel'     ? 'Approve Excel cells…' :
        step === 'step-3-upload'    ? 'Upload to Building Connected portal…' :
        /* uploading */               'Uploading to portal…'

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
                <div className="rounded-xl border border-ai/30 bg-ai/5 px-4 py-3 flex items-start gap-2.5">
                    <Sparkles className="h-4 w-4 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold text-foreground flex items-center gap-2">
                            <span>Final quote · 3 sequential sub-steps</span>
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-warning/10 text-warning border border-warning/20 rounded px-1.5 py-0.5 shrink-0">
                                GW3 · Quote due in 8h
                            </span>
                        </div>
                        <div className="text-muted-foreground mt-0.5">
                            Apply OW margin → preview Excel cells in the GC quote template → upload to the GC portal. GC deadline imminent.
                        </div>
                    </div>
                </div>

                {/* Painpoint hero · why this step matters */}
                <PainpointChip text="Today: manual Excel copy-validate-re-enter · formula errors in both client + OW files · IQ ERP identified as future installer-side backbone but not in use today. With Strata: cell-level audit + automated population." />

                {/* STEP 1 · Apply margin */}
                {(() => {
                    const variant: 'pending' | 'active' | 'done' = currentStepNum > 1 ? 'done' : 'active'
                    return (
                        <section
                            aria-label="Step 1 · Apply OW margin"
                            aria-current={variant === 'active' ? 'step' : undefined}
                            className={`rounded-xl border overflow-hidden ${
                                variant === 'done' ? 'border-success/30 bg-success/5' : 'border-border bg-card'
                            }`}
                        >
                            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">1</span>
                                <DollarSign className="h-4 w-4 text-foreground shrink-0" aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold uppercase tracking-wider text-foreground truncate">Apply OW margin</div>
                                    <div className="text-[10px] text-muted-foreground truncate">Vendor net ${finalQuote.vendorNet.toLocaleString()}</div>
                                </div>
                                <StatusChip variant={variant} />
                            </div>
                            {variant === 'active' && (
                                <div className="px-4 py-3 space-y-2.5">
                                    <div className="flex items-center justify-between gap-3 text-xs">
                                        <span className="text-muted-foreground">OW margin %</span>
                                        <span className="text-foreground font-bold tabular-nums">{marginPct.toFixed(0)}%</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={12}
                                        max={25}
                                        value={marginPct}
                                        onChange={e => setMarginPct(parseInt(e.target.value))}
                                        aria-label="OW margin percentage"
                                        className="w-full accent-primary"
                                    />
                                    <ul className="divide-y divide-border text-[11px] rounded-lg border border-border overflow-hidden">
                                        <li className="px-3 py-1.5 flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">Vendor net (TriState)</span>
                                            <span className="text-foreground tabular-nums">${finalQuote.vendorNet.toLocaleString()}</span>
                                        </li>
                                        <li className="px-3 py-1.5 flex items-center justify-between gap-3">
                                            <span className="text-muted-foreground">OW margin · {marginPct.toFixed(0)}%</span>
                                            <span className="text-foreground tabular-nums">+${marginAmount.toLocaleString()}</span>
                                        </li>
                                        <li className="px-3 py-1.5 flex items-center justify-between gap-3 bg-muted/30">
                                            <span className="text-foreground font-medium">Quoted to GC</span>
                                            <span className="text-success font-bold tabular-nums">${quotedTotal.toLocaleString()}</span>
                                        </li>
                                    </ul>
                                    <button
                                        type="button"
                                        onClick={() => setStep('step-2-excel')}
                                        aria-label="Confirm pricing"
                                        className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    >
                                        Confirm pricing
                                    </button>
                                </div>
                            )}
                            {variant === 'done' && (
                                <div className="px-4 py-2.5 text-xs text-foreground flex items-center gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" aria-hidden="true" />
                                    <span><strong>${quotedTotal.toLocaleString()}</strong> quoted to GC · {marginPct.toFixed(0)}% OW margin</span>
                                </div>
                            )}
                        </section>
                    )
                })()}

                {/* STEP 2 · Excel cell preview */}
                {(() => {
                    const variant: 'pending' | 'active' | 'done' = currentStepNum > 2 ? 'done' : currentStepNum === 2 ? 'active' : 'pending'
                    return (
                        <section
                            aria-label="Step 2 · Preview Excel cells"
                            aria-current={variant === 'active' ? 'step' : undefined}
                            className={`rounded-xl border overflow-hidden ${
                                variant === 'done' ? 'border-success/30 bg-success/5' :
                                variant === 'active' ? 'border-border bg-card' :
                                'border-border bg-card opacity-60'
                            }`}
                        >
                            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">2</span>
                                <FileText className="h-4 w-4 text-foreground shrink-0" aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold uppercase tracking-wider text-foreground truncate">Excel cell preview</div>
                                    <div className="text-[10px] text-muted-foreground truncate">{finalQuote.excelTemplate}</div>
                                </div>
                                <StatusChip variant={variant} />
                            </div>
                            {variant === 'active' && (
                                <div className="px-4 py-3 space-y-2.5">
                                    <ul className="divide-y divide-border text-[11px] rounded-lg border border-border overflow-hidden font-mono">
                                        {[
                                            { cell: finalQuote.excelCells.labor,        label: 'Labor',            value: `$${VERTICAL_BIDS.find(b => b.vendorId === finalQuote.winnerVendorId)!.laborTotal.toLocaleString()}` },
                                            { cell: finalQuote.excelCells.delivery,     label: 'Delivery',         value: `$${VERTICAL_BIDS.find(b => b.vendorId === finalQuote.winnerVendorId)!.deliveryTotal.toLocaleString()}` },
                                            { cell: finalQuote.excelCells.owTotal,      label: 'OW total',         value: `$${quotedTotal.toLocaleString()}` },
                                            { cell: finalQuote.excelCells.owMarginPct,  label: 'OW margin %',      value: `${marginPct.toFixed(0)}%` },
                                        ].map(row => (
                                            <li key={row.cell} className="px-3 py-1.5 flex items-center gap-3">
                                                <span className="text-info font-bold tabular-nums shrink-0">{row.cell}</span>
                                                <span className="text-muted-foreground flex-1 font-sans">{row.label}</span>
                                                <span className="text-foreground tabular-nums">{row.value}</span>
                                            </li>
                                        ))}
                                    </ul>
                                    <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 flex items-start gap-2 text-[10px]">
                                        <ShieldCheck className="h-3 w-3 text-info shrink-0 mt-0.5" aria-hidden="true" />
                                        <span className="text-foreground">All 4 cells balanced · no formula errors detected · Strata cell-level audit.</span>
                                    </div>
                                    {/* Optional Senior Review toggle (BPMN Optional Senior Review step) */}
                                    <label className="flex items-center gap-2 cursor-pointer rounded-lg border border-border bg-card px-3 py-2 text-[11px] hover:bg-muted/30 transition-colors">
                                        <input
                                            type="checkbox"
                                            checked={seniorReview}
                                            onChange={e => setSeniorReview(e.target.checked)}
                                            aria-label="Request optional senior review before upload"
                                            className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                                        />
                                        <span className="text-foreground flex-1">Request optional Senior Review before upload</span>
                                        {seniorReview && (
                                            <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider bg-warning/10 text-warning border border-warning/20 rounded px-1.5 py-0.5 shrink-0">
                                                Queued · Sr Ops
                                            </span>
                                        )}
                                    </label>
                                    <button
                                        type="button"
                                        onClick={() => setStep('step-3-upload')}
                                        aria-label="Approve Excel and continue"
                                        className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    >
                                        {seniorReview ? 'Approve · pending Sr review' : 'Approve & continue'}
                                    </button>
                                </div>
                            )}
                            {variant === 'done' && (
                                <div className="px-4 py-2.5 text-xs text-foreground flex items-center gap-2">
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" aria-hidden="true" />
                                    <span><strong>4 cells</strong> populated + audited · {finalQuote.excelTemplate}</span>
                                </div>
                            )}
                            {variant === 'pending' && (
                                <div className="px-4 py-2.5 text-[11px] italic text-muted-foreground">Unlocks once pricing is confirmed.</div>
                            )}
                        </section>
                    )
                })()}

                {/* STEP 3 · Upload to Building Connected portal */}
                {(() => {
                    const variant: 'pending' | 'active' | 'done' = step === 'step-3-done' ? 'done' : currentStepNum === 3 ? 'active' : 'pending'
                    return (
                        <section
                            aria-label="Step 3 · Upload to Building Connected portal"
                            aria-current={variant === 'active' ? 'step' : undefined}
                            className={`rounded-xl border overflow-hidden ${
                                variant === 'done' ? 'border-success/30 bg-success/5' :
                                variant === 'active' ? 'border-border bg-card' :
                                'border-border bg-card opacity-60'
                            }`}
                        >
                            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center gap-2">
                                <span className="h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">3</span>
                                <Truck className="h-4 w-4 text-foreground shrink-0" aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-xs font-bold uppercase tracking-wider text-foreground truncate">Upload to {MANATT_LD_RFP.gcPortal} portal</div>
                                    <div className="text-[10px] text-muted-foreground truncate">Ref {finalQuote.portalRef}</div>
                                </div>
                                <StatusChip variant={variant} />
                            </div>
                            {variant === 'active' && step === 'step-3-upload' && (
                                <div className="px-4 py-3 space-y-2.5">
                                    <p className="text-[11px] text-muted-foreground">Submitting the final quote to {MANATT_LD_RFP.gcCompany} ({MANATT_LD_RFP.gcContactName}) before the GC deadline.</p>
                                    <button
                                        type="button"
                                        onClick={() => setStep('step-3-uploading')}
                                        aria-label="Upload to portal"
                                        className="w-full inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                                    >
                                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                                        Upload to {MANATT_LD_RFP.gcPortal}
                                    </button>
                                </div>
                            )}
                            {variant === 'active' && step === 'step-3-uploading' && (
                                <div className="px-4 py-3 space-y-2" role="status" aria-busy="true">
                                    <div className="flex items-center gap-2">
                                        <Loader2 className="h-4 w-4 text-foreground animate-spin" aria-hidden="true" />
                                        <span className="text-xs font-semibold text-foreground">Uploading…</span>
                                    </div>
                                    <ul className="space-y-1.5">
                                        {PORTAL_UPLOAD_BULLETS.slice(0, bulletCount).map((b, i) => (
                                            <li key={i} className="flex items-start gap-2 text-xs text-foreground animate-in fade-in slide-in-from-left-1 duration-200">
                                                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" aria-hidden="true" />
                                                <span>{b}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                            {variant === 'done' && (
                                <div className="px-4 py-2.5 text-xs text-foreground space-y-1">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" aria-hidden="true" />
                                        <span><strong>EE1 · Quote submitted</strong> · ref {finalQuote.portalRef}</span>
                                    </div>
                                    <div className="pl-5 text-[11px] text-muted-foreground">Submitted at {finalQuote.portalSubmittedAt} · before GC deadline.</div>
                                </div>
                            )}
                            {variant === 'pending' && (
                                <div className="px-4 py-2.5 text-[11px] italic text-muted-foreground">Unlocks once the Excel preview is approved.</div>
                            )}
                        </section>
                    )
                })()}

                {step === 'step-3-done' && (
                    <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-[11px] text-foreground animate-in fade-in duration-200">
                        → Next in real life: Post-Award sub-process · winner + loser notifications, install monitoring, change-order classification (Client / OW / Contractor). Demo coverage v2.
                    </div>
                )}

            </div>

            <div className="border-t border-border px-5 py-3 bg-card shrink-0">
                {!canContinue ? (
                    <button type="button" disabled className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-muted text-muted-foreground text-sm font-medium cursor-not-allowed">
                        {disabledCopy}
                    </button>
                ) : (
                    <button
                        type="button"
                        onClick={onValidate}
                        className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-colors"
                    >
                        Finish · return to dashboard
                        <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                )}
            </div>
        </>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// L&D DOC PREVIEWS · 12 components for the modal left-panel
// All use fidelidad-media: header + summary + body table/section list.
// Vertical-aware via useOfficeworksVertical() where applicable.
// ═══════════════════════════════════════════════════════════════════════════════

function LDPreviewShell({ icon: Icon, filename, size, statusBadge, children }: {
    icon: React.ComponentType<{ className?: string }>
    filename: string
    size?: string
    statusBadge?: { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' }
    children: React.ReactNode
}) {
    const toneClass = statusBadge?.tone === 'success' ? 'bg-success/10 text-success border border-success/20'
                    : statusBadge?.tone === 'warning' ? 'bg-warning/10 text-warning border border-warning/20'
                    : statusBadge?.tone === 'info'    ? 'bg-info/10 text-info border border-info/20'
                    : 'bg-muted text-muted-foreground border border-border'
    return (
        <div className="h-full flex flex-col bg-muted/20">
            <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2 shrink-0">
                <Icon className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                <div className="text-[11px] font-bold uppercase tracking-wide text-foreground">{filename}</div>
                {size && <span className="text-[10px] text-muted-foreground">· {size}</span>}
                {statusBadge && (
                    <span className={`ml-auto inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${toneClass}`}>
                        {statusBadge.label}
                    </span>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
                {children}
            </div>
        </div>
    )
}

// ─── ld-sif · Scope of Information File ─────────────────────────────────────
function LDSifPreview() {
    const vertical = useOfficeworksVertical()
    const sif = vertical === 'walls' ? SIF_WALLS : SIF_FURNITURE
    return (
        <LDPreviewShell icon={FileText} filename="manatt-sif.pdf" size="92 KB" statusBadge={{ label: 'GC attached', tone: 'info' }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{sif.title}</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">{sif.project}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{sif.deliveryAddress} · Market: {sif.market}</div>
                </div>
                <ul className="divide-y divide-border">
                    {sif.scope.map(item => (
                        <li key={item.label} className="px-4 py-2 flex items-start gap-3 text-[11px]">
                            <span className="text-muted-foreground w-32 shrink-0">{item.label}</span>
                            <span className="text-foreground flex-1">{item.value}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="text-[10px] text-muted-foreground italic px-1">Source: CBRE Construction Management · {MANATT_LD_RFP.gcContact}</div>
        </LDPreviewShell>
    )
}

// ─── ld-cover-letter · GC RFP cover letter email ────────────────────────────
function LDCoverLetterPreview() {
    const cl = COVER_LETTER_BODY
    return (
        <LDPreviewShell icon={Mail} filename="cbre-rfp-cover.pdf" size="184 KB" statusBadge={{ label: 'Received', tone: 'success' }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border space-y-1">
                    <div className="grid grid-cols-[60px_1fr] gap-2 text-[11px]">
                        <span className="text-muted-foreground">From</span>
                        <span className="text-foreground"><strong>{cl.from}</strong> · {cl.fromTitle}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-2 text-[11px]">
                        <span className="text-muted-foreground">To</span>
                        <span className="text-foreground"><strong>{cl.to}</strong> · {cl.toTitle}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-2 text-[11px]">
                        <span className="text-muted-foreground">Subject</span>
                        <span className="text-foreground font-medium">{cl.subject}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-2 text-[10px] text-muted-foreground">
                        <span>Received</span>
                        <span>{cl.receivedAt}</span>
                    </div>
                </div>
                <div className="px-4 py-3 space-y-2 text-[11px] text-foreground leading-relaxed">
                    {cl.body.map((line, i) => <p key={i}>{line}</p>)}
                </div>
            </div>
        </LDPreviewShell>
    )
}

// ─── ld-takeoff-report · AI takeoff output ──────────────────────────────────
function LDTakeoffReportPreview() {
    const vertical = useOfficeworksVertical()
    const { takeoff } = getActiveVerticalData(vertical)
    const isWalls = vertical === 'walls'
    return (
        <LDPreviewShell icon={ClipboardCheck} filename="takeoff-report-manatt-4f.pdf" size="48 KB" statusBadge={{ label: 'AI · 18s', tone: 'success' }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Strata AI Takeoff Report</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">Source: {takeoff.takeoffSourceFile}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">Today: ~{takeoff.bluebeamTimeManualMin / 60}h manual count in Bluebeam · With Strata: {takeoff.strataTimeSec}s</div>
                </div>
                <ul className="divide-y divide-border">
                    {isWalls ? (
                        <>
                            <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Linear feet</span><span className="text-foreground font-bold tabular-nums">{WALLS_TAKEOFF.linearFeet} lf</span></li>
                            <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Door openings</span><span className="text-foreground font-bold tabular-nums">{WALLS_TAKEOFF.doorCount}</span></li>
                            <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Wall heights</span><span className="text-foreground tabular-nums">{WALLS_TAKEOFF.wallHeights}</span></li>
                        </>
                    ) : (
                        <>
                            <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Workstations</span><span className="text-foreground font-bold tabular-nums">{MANATT_TAKEOFF.workstationCount}</span></li>
                            <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Configurable items (CRs)</span><span className="text-foreground font-bold tabular-nums">{MANATT_TAKEOFF.crCount}</span></li>
                        </>
                    )}
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Estimated labor hours</span><span className="text-foreground font-bold tabular-nums">{takeoff.estimatedLaborHours} h</span></li>
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Delivery stops</span><span className="text-foreground font-bold tabular-nums">{takeoff.estimatedDeliveryStops}</span></li>
                </ul>
            </div>
            <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-[10px] text-foreground flex items-start gap-2">
                <Sparkles className="h-3 w-3 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                <span>Strata confidence high · all measurements auto-extracted · Alan can override any value before continuing.</span>
            </div>
        </LDPreviewShell>
    )
}

// ─── ld-conditions-record · Building KB record ──────────────────────────────
function LDConditionsRecordPreview() {
    return (
        <LDPreviewShell icon={Building2} filename="building-kb-1551-k-st-nw.pdf" size="24 KB" statusBadge={{ label: 'KB · 5 prior projects', tone: 'success' }}>
            <div className="rounded-xl border border-ai/30 bg-ai/5 px-3 py-2 flex items-start gap-2 text-[11px]">
                <Sparkles className="h-3.5 w-3.5 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-foreground leading-relaxed">
                    Pulled from Building Knowledge Base · {MANATT_LD_RFP.buildingAddress} · {MANATT_LD_RFP.priorProjectsAtAddress} prior projects indexed.
                </div>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-foreground">12 Building & workforce conditions</div>
                </div>
                <ul className="divide-y divide-border">
                    {MANATT_BUILDING_CONDITIONS.map(cond => (
                        <li key={cond.id} className="px-4 py-2 flex items-start gap-3 text-[11px]">
                            <span className="text-muted-foreground w-32 shrink-0">{cond.label}</span>
                            <span className="text-foreground flex-1">{cond.value}</span>
                            <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0 ${
                                cond.confidence === 'high'   ? 'bg-success/10 text-success border border-success/20' :
                                cond.confidence === 'medium' ? 'bg-warning/10 text-warning border border-warning/20' :
                                'bg-muted text-muted-foreground border border-border'
                            }`}>{cond.confidence}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </LDPreviewShell>
    )
}

// ─── ld-vendor-pool · Approved installer pool ───────────────────────────────
function LDVendorPoolPreview() {
    const vertical = useOfficeworksVertical()
    const { installers } = getActiveVerticalData(vertical)
    const label = vertical === 'walls' ? 'Walls pool (NJ + PA + MA)' : 'DC installer pool (consolidated May/2026)'
    return (
        <LDPreviewShell icon={Users} filename="approved-installers.pdf" size="36 KB" statusBadge={{ label: `${installers.length} active`, tone: 'success' }}>
            <div className="text-[11px] text-muted-foreground">{label} · with scorecards from the past 12 months</div>
            <div className="space-y-2">
                {installers.map(v => (
                    <div key={v.id} className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground truncate flex-1 min-w-0">{v.name}</span>
                            {v.flagText && (
                                <span className={`inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0 ${
                                    v.flagTone === 'success' ? 'bg-success/10 text-success border border-success/20' :
                                    v.flagTone === 'warning' ? 'bg-warning/10 text-warning border border-warning/20' :
                                    'bg-muted text-muted-foreground border border-border'
                                }`}>{v.flagText}</span>
                            )}
                        </div>
                        <div className="px-4 py-2 text-[11px] text-muted-foreground">{v.markets} · {v.msaRate} · {v.unionStatus}</div>
                        <div className="px-4 py-2 grid grid-cols-3 gap-2 text-[11px] border-t border-border">
                            <div><span className="text-muted-foreground">On-time</span><div className="text-foreground font-bold tabular-nums">{v.onTimeRate}%</div></div>
                            <div><span className="text-muted-foreground">CO rate</span><div className="text-foreground font-bold tabular-nums">{v.changeOrderRate}%</div></div>
                            <div><span className="text-muted-foreground">12mo jobs</span><div className="text-foreground font-bold tabular-nums">{v.past12moJobs}</div></div>
                        </div>
                    </div>
                ))}
            </div>
        </LDPreviewShell>
    )
}

// ─── ld-bid-request · Bid request form / email (vertical swap) ──────────────
function LDBidRequestPreview() {
    const vertical = useOfficeworksVertical()
    if (vertical === 'walls') {
        return (
            <LDPreviewShell icon={FileText} filename="bid-request-form-A-G.pdf" size="68 KB" statusBadge={{ label: 'Walls · structured', tone: 'success' }}>
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 bg-muted/30 border-b border-border">
                        <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">{WALLS_BID_REQUEST_SECTIONS_A_G.template}</div>
                        <div className="text-sm font-bold text-foreground mt-0.5">{WALLS_BID_REQUEST_SECTIONS_A_G.title}</div>
                    </div>
                    <ul className="divide-y divide-border">
                        {WALLS_BID_REQUEST_SECTIONS_A_G.sections.map(s => (
                            <li key={s.id} className="px-4 py-2.5">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="h-5 w-5 rounded-full bg-foreground text-background text-[10px] font-bold flex items-center justify-center shrink-0" aria-hidden="true">{s.id}</span>
                                    <span className="text-[11px] font-bold text-foreground">{s.label}</span>
                                </div>
                                <ul className="pl-7 space-y-0.5">
                                    {s.fields.map(f => (
                                        <li key={f} className="text-[10px] text-muted-foreground">· {f}</li>
                                    ))}
                                </ul>
                            </li>
                        ))}
                    </ul>
                </div>
            </LDPreviewShell>
        )
    }
    const e = BID_REQUEST_EMAIL_FURNITURE
    return (
        <LDPreviewShell icon={Mail} filename="bid-request-draft.eml" size="12 KB" statusBadge={{ label: 'Furniture · free-form', tone: 'warning' }}>
            <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-[10px] text-foreground flex items-start gap-2">
                <AlertCircle className="h-3 w-3 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                <span>~{LD_VOLUME_FACTS.outboundEmailsPerMonth} outbound bid requests/month today · all composed manually.</span>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border space-y-1">
                    <div className="grid grid-cols-[60px_1fr] gap-2 text-[11px]">
                        <span className="text-muted-foreground">From</span>
                        <span className="text-foreground">{e.from}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-2 text-[11px]">
                        <span className="text-muted-foreground">Subject</span>
                        <span className="text-foreground font-medium">{e.subject}</span>
                    </div>
                </div>
                <div className="px-4 py-3 space-y-2 text-[11px] text-foreground leading-relaxed">
                    {e.body.map((line, i) => <p key={i}>{line}</p>)}
                </div>
                <div className="border-t border-border px-4 py-2 bg-muted/20">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Pre-flight checks</div>
                    <ul className="space-y-0.5">
                        {e.preFlight.map(c => (
                            <li key={c} className="flex items-center gap-2 text-[10px] text-foreground">
                                <CheckCircle2 className="h-3 w-3 text-success shrink-0" aria-hidden="true" />
                                {c}
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </LDPreviewShell>
    )
}

// ─── ld-internal-benchmark · Strata methodology card ────────────────────────
function LDInternalBenchmarkPreview() {
    const vertical = useOfficeworksVertical()
    const { benchmark } = getActiveVerticalData(vertical)
    return (
        <LDPreviewShell icon={Target} filename="internal-benchmark.pdf" size="18 KB" statusBadge={{ label: 'Strata methodology', tone: 'info' }}>
            <div className="rounded-xl border border-ai/30 bg-ai/5 p-4 space-y-3">
                <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="flex-1 min-w-0 text-xs">
                        <div className="font-semibold text-foreground">Strata Internal Number</div>
                        <div className="text-muted-foreground mt-0.5">{benchmark.formulaText}</div>
                    </div>
                </div>
                <div className="flex items-baseline gap-2 pt-2 border-t border-ai/20">
                    <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Benchmark</span>
                    <span className="text-2xl font-bold text-ai tabular-nums">${benchmark.totalBaseline.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-2 border-t border-ai/20">
                    <span className="text-muted-foreground">Variance threshold</span>
                    <span className="text-foreground font-bold tabular-nums">{benchmark.varianceThresholdPct}%</span>
                </div>
            </div>
            <div className="rounded-lg border border-warning/30 bg-warning/5 px-3 py-2 text-[10px] text-foreground flex items-start gap-2">
                <AlertCircle className="h-3 w-3 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                <span>Today this benchmark only exists in Alan/Paul's heads · Alan ~46:32 · "AI would do an internal number first."</span>
            </div>
        </LDPreviewShell>
    )
}

// ─── ld-bids-received · 3 vendor bids stacked ───────────────────────────────
function LDBidsReceivedPreview() {
    const vertical = useOfficeworksVertical()
    const { installers, bids, benchmark } = getActiveVerticalData(vertical)
    return (
        <LDPreviewShell icon={DollarSign} filename="bids-received.pdf" size="40 KB" statusBadge={{ label: '3/3 received', tone: 'success' }}>
            <div className="text-[11px] text-muted-foreground">3 bid emails received within the 48h MSA window · variance vs ${benchmark.totalBaseline.toLocaleString()} benchmark</div>
            <div className="space-y-2">
                {bids.map(b => {
                    const v = installers.find(i => i.id === b.vendorId)
                    const variance = Math.round(((b.total - benchmark.totalBaseline) / benchmark.totalBaseline) * 100)
                    const tone = Math.abs(variance) < 5 ? 'success' : Math.abs(variance) < benchmark.varianceThresholdPct ? 'warning' : 'danger'
                    return (
                        <div key={b.vendorId} className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                                <span className="text-xs font-bold text-foreground truncate flex-1">{v?.name}</span>
                                <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0 ${
                                    tone === 'success' ? 'bg-success/10 text-success border border-success/20' :
                                    tone === 'warning' ? 'bg-warning/10 text-warning border border-warning/20' :
                                    'bg-destructive/10 text-destructive border border-destructive/20'
                                }`}>{variance > 0 ? '+' : ''}{variance}%</span>
                            </div>
                            <div className="px-4 py-2 grid grid-cols-3 gap-2 text-[11px]">
                                <div><span className="text-muted-foreground">Labor</span><div className="text-foreground tabular-nums">${b.laborTotal.toLocaleString()}</div></div>
                                <div><span className="text-muted-foreground">Delivery</span><div className="text-foreground tabular-nums">${b.deliveryTotal.toLocaleString()}</div></div>
                                <div><span className="text-muted-foreground">Total</span><div className="text-foreground font-bold tabular-nums">${b.total.toLocaleString()}</div></div>
                            </div>
                            <div className="px-4 py-1.5 border-t border-border text-[10px] text-muted-foreground">Received {b.receivedAt}</div>
                        </div>
                    )
                })}
            </div>
        </LDPreviewShell>
    )
}

// ─── ld-scorecard · Vendor comparison table ─────────────────────────────────
function LDScorecardPreview() {
    const vertical = useOfficeworksVertical()
    const { installers } = getActiveVerticalData(vertical)
    return (
        <LDPreviewShell icon={TrendingUp} filename="vendor-scorecard.pdf" size="22 KB" statusBadge={{ label: 'Past 12 months', tone: 'info' }}>
            <div className="text-[11px] text-muted-foreground">Comparing the {installers.length}-vendor pool on price, on-time and change-order history.</div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-[11px]">
                    <thead className="bg-muted/30">
                        <tr className="text-left">
                            <th className="px-3 py-2 font-semibold text-muted-foreground">Vendor</th>
                            <th className="px-3 py-2 font-semibold text-muted-foreground text-right">On-time</th>
                            <th className="px-3 py-2 font-semibold text-muted-foreground text-right">CO rate</th>
                            <th className="px-3 py-2 font-semibold text-muted-foreground text-right">12mo jobs</th>
                        </tr>
                    </thead>
                    <tbody>
                        {installers.map(v => (
                            <tr key={v.id} className="border-t border-border">
                                <td className="px-3 py-2">
                                    <div className="text-foreground font-medium">{v.name}</div>
                                    <div className="text-[10px] text-muted-foreground">{v.markets}</div>
                                </td>
                                <td className="px-3 py-2 text-right tabular-nums text-foreground">{v.onTimeRate}%</td>
                                <td className="px-3 py-2 text-right tabular-nums text-foreground">{v.changeOrderRate}%</td>
                                <td className="px-3 py-2 text-right tabular-nums text-foreground">{v.past12moJobs}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </LDPreviewShell>
    )
}

// ─── ld-notifications · 3 drafts (winner + 2 losers) ────────────────────────
function LDNotificationsPreview() {
    const vertical = useOfficeworksVertical()
    const { installers } = getActiveVerticalData(vertical)
    const winner = installers.find(v => v.flagText === 'Strata recommends') ?? installers[0]
    const losers = installers.filter(v => v.id !== winner?.id)
    return (
        <LDPreviewShell icon={Mail} filename="notification-drafts.pdf" size="14 KB" statusBadge={{ label: 'Drafts · review before send', tone: 'warning' }}>
            <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-[10px] text-foreground flex items-start gap-2">
                <ShieldCheck className="h-3 w-3 text-info shrink-0 mt-0.5" aria-hidden="true" />
                <span>Strata never auto-sends · Alan reviews and confirms each draft (CLAUDE.md rule).</span>
            </div>
            <div className="rounded-xl border border-success/30 bg-success/5 overflow-hidden">
                <div className="px-4 py-2.5 bg-success/10 border-b border-success/20 flex items-center gap-2">
                    <span className="text-xs font-bold text-foreground">Winner notify · {winner?.name}</span>
                    <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-success/10 text-success border border-success/20 rounded px-1.5 py-0.5">Awarded</span>
                </div>
                <div className="px-4 py-2 text-[11px] text-foreground font-medium">{NOTIFICATION_DRAFTS.winner.subject}</div>
                <div className="px-4 py-2 border-t border-border space-y-1 text-[11px] text-foreground leading-relaxed">
                    {NOTIFICATION_DRAFTS.winner.body.map((line, i) => <p key={i}>{line}</p>)}
                </div>
            </div>
            {losers.map((v, idx) => {
                const draft = idx === 0 ? NOTIFICATION_DRAFTS.loserPinnacle : NOTIFICATION_DRAFTS.loserNortheast
                return (
                    <div key={v.id} className="rounded-xl border border-border bg-card overflow-hidden">
                        <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">Decline · {v.name}</span>
                            <span className="ml-auto text-[9px] font-bold uppercase tracking-wider bg-muted text-muted-foreground border border-border rounded px-1.5 py-0.5">Not awarded</span>
                        </div>
                        <div className="px-4 py-2 text-[11px] text-foreground font-medium">{draft.subject}</div>
                        <div className="px-4 py-2 border-t border-border space-y-1 text-[11px] text-foreground leading-relaxed">
                            {draft.body.map((line, i) => <p key={i}>{line}</p>)}
                        </div>
                    </div>
                )
            })}
        </LDPreviewShell>
    )
}

// ─── ld-excel-quote · GC quote template preview ─────────────────────────────
function LDExcelQuotePreview() {
    const vertical = useOfficeworksVertical()
    const { finalQuote, bids } = getActiveVerticalData(vertical)
    const winnerBid = bids.find(b => b.vendorId === finalQuote.winnerVendorId)
    const marginAmount = Math.round(finalQuote.vendorNet * finalQuote.owMarginPct)
    const quotedTotal = finalQuote.vendorNet + marginAmount
    return (
        <LDPreviewShell icon={FileText} filename={finalQuote.excelTemplate} size="58 KB" statusBadge={{ label: 'Cell-level audit', tone: 'info' }}>
            <div className="text-[11px] text-muted-foreground">Strata populated 4 cells in the GC quote template · margin {Math.round(finalQuote.owMarginPct * 100)}% on vendor net ${finalQuote.vendorNet.toLocaleString()}.</div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                    <FileText className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Cell-level audit</span>
                </div>
                <ul className="divide-y divide-border text-[11px] font-mono">
                    <li className="px-4 py-2 flex items-center gap-3">
                        <span className="text-info font-bold tabular-nums shrink-0">{finalQuote.excelCells.labor}</span>
                        <span className="text-muted-foreground flex-1 font-sans">Labor</span>
                        <span className="text-foreground tabular-nums">${winnerBid?.laborTotal.toLocaleString()}</span>
                    </li>
                    <li className="px-4 py-2 flex items-center gap-3">
                        <span className="text-info font-bold tabular-nums shrink-0">{finalQuote.excelCells.delivery}</span>
                        <span className="text-muted-foreground flex-1 font-sans">Delivery</span>
                        <span className="text-foreground tabular-nums">${winnerBid?.deliveryTotal.toLocaleString()}</span>
                    </li>
                    <li className="px-4 py-2 flex items-center gap-3 bg-muted/30">
                        <span className="text-info font-bold tabular-nums shrink-0">{finalQuote.excelCells.owTotal}</span>
                        <span className="text-muted-foreground flex-1 font-sans">Officeworks total</span>
                        <span className="text-success font-bold tabular-nums">${quotedTotal.toLocaleString()}</span>
                    </li>
                    <li className="px-4 py-2 flex items-center gap-3">
                        <span className="text-info font-bold tabular-nums shrink-0">{finalQuote.excelCells.owMarginPct}</span>
                        <span className="text-muted-foreground flex-1 font-sans">OW margin %</span>
                        <span className="text-foreground tabular-nums">{Math.round(finalQuote.owMarginPct * 100)}%</span>
                    </li>
                </ul>
            </div>
            <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-[10px] text-foreground flex items-start gap-2">
                <ShieldCheck className="h-3 w-3 text-info shrink-0 mt-0.5" aria-hidden="true" />
                <span>All 4 cells balanced · no formula errors · Strata cell-level audit before upload.</span>
            </div>
        </LDPreviewShell>
    )
}

// ─── ld-portal-status · GC portal submission confirmation ───────────────────
function LDPortalStatusPreview() {
    const vertical = useOfficeworksVertical()
    const { finalQuote } = getActiveVerticalData(vertical)
    return (
        <LDPreviewShell icon={CheckCircle2} filename={`portal-confirmation-${finalQuote.portalRef}.pdf`} size="8 KB" statusBadge={{ label: PORTAL_STATUS.status, tone: 'success' }}>
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-2">
                <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-5 w-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                        <div className="text-sm font-bold text-foreground">Submitted to {PORTAL_STATUS.portal}</div>
                        <div className="text-[11px] text-muted-foreground">{PORTAL_STATUS.timeBeforeDeadline} before GC deadline</div>
                    </div>
                </div>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <ul className="divide-y divide-border text-[11px]">
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">Portal</span><span className="text-foreground">{PORTAL_STATUS.portal}</span></li>
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">Reference number</span><span className="text-foreground font-mono">{finalQuote.portalRef}</span></li>
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">Submitted at</span><span className="text-foreground tabular-nums">{finalQuote.portalSubmittedAt}</span></li>
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">Deadline</span><span className="text-foreground tabular-nums">{PORTAL_STATUS.deadline}</span></li>
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">Quoted total</span><span className="text-success font-bold tabular-nums">${finalQuote.quotedTotal.toLocaleString()}</span></li>
                </ul>
            </div>
        </LDPreviewShell>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES FLOW · helpers + 8 panels + 11 doc previews
// All Sales-specific UI for sc-S.0 → sc-S.7. Same in-file pattern as L&D.
// Source: manattSalesData.ts · all grounded in AS-IS Notion v6 + BPMN.
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Helper · PainpointChip (consistent banner for all 8 panels) ─────────────
function SalesPainpointChip({ stage }: { stage: OfficeworksReviewStage }) {
    const chip = SALES_STAGE_PAINPOINT_CHIPS[stage]
    if (!chip) return null
    return (
        <div className="inline-flex items-center gap-1.5 rounded-full bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
            <AlertCircle className="h-3 w-3" aria-hidden="true" />
            <span>{chip.id} · {chip.label}</span>
        </div>
    )
}

// ─── Helper · AI banner (consistent across panels) ───────────────────────────
function SalesAIBanner({ stage }: { stage: OfficeworksReviewStage }) {
    const text = SALES_STAGE_AI_BANNER[stage]
    if (!text) return null
    return (
        <div className="rounded-lg border border-ai/30 bg-ai/5 px-3 py-2.5 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-ai shrink-0 mt-0.5" aria-hidden="true" />
            <div className="text-[12px] text-foreground leading-relaxed">
                <span className="font-bold text-ai">Strata AI · </span>{text}
            </div>
        </div>
    )
}

// ─── Helper · SLATimerChip · static deadline with semantic tone ──────────────
function SLATimerChip({ hoursLeft, label }: { hoursLeft: number; label?: string }) {
    const tone = hoursLeft < 0 ? 'destructive'
               : hoursLeft < 12 ? 'warning'
               : 'success'
    const toneClass = tone === 'destructive' ? 'bg-destructive/10 text-destructive border-destructive/30'
                    : tone === 'warning'     ? 'bg-warning/10 text-warning border-warning/30'
                    : 'bg-success/10 text-success border-success/30'
    const display = hoursLeft < 0 ? `${Math.abs(hoursLeft)}h overdue` : `${hoursLeft}h left`
    return (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full border px-2 py-0.5 ${toneClass}`}>
            <Clock className="h-3 w-3" aria-hidden="true" />
            {label ? `${label} · ${display}` : display}
        </span>
    )
}

// ─── Helper · Channel icon ───────────────────────────────────────────────────
function ChannelIcon({ channel, className }: { channel: string; className?: string }) {
    const cls = className ?? 'h-3.5 w-3.5'
    if (channel === 'email')  return <Mail className={`${cls} text-info`} aria-hidden="true" />
    if (channel === 'teams')  return <MessageSquare className={`${cls} text-ai`} aria-hidden="true" />
    if (channel === 'portal') return <ExternalLink className={`${cls} text-foreground`} aria-hidden="true" />
    if (channel === 'sms')    return <Smartphone className={`${cls} text-warning`} aria-hidden="true" />
    return <Activity className={`${cls} text-muted-foreground`} aria-hidden="true" />
}

// ─── Helper · Source cite footer ─────────────────────────────────────────────
function SalesSourceCite({ source }: { source: string }) {
    return (
        <div className="text-[10px] text-muted-foreground italic px-1 flex items-center gap-1">
            <Sparkles className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
            Source: {source}
        </div>
    )
}

// ─── Helper · Reusable preview shell (mirror of LDPreviewShell) ──────────────
function SalesPreviewShell({ icon: Icon, filename, size, statusBadge, children }: {
    icon: React.ComponentType<{ className?: string }>
    filename: string
    size?: string
    statusBadge?: { label: string; tone: 'success' | 'warning' | 'neutral' | 'info' | 'danger' }
    children: React.ReactNode
}) {
    const toneClass = statusBadge?.tone === 'success' ? 'bg-success/10 text-success border border-success/20'
                    : statusBadge?.tone === 'warning' ? 'bg-warning/10 text-warning border border-warning/20'
                    : statusBadge?.tone === 'info'    ? 'bg-info/10 text-info border border-info/20'
                    : statusBadge?.tone === 'danger'  ? 'bg-destructive/10 text-destructive border border-destructive/20'
                    : 'bg-muted text-muted-foreground border border-border'
    return (
        <div className="h-full flex flex-col bg-muted/20">
            <div className="px-4 py-2.5 border-b border-border bg-muted/40 flex items-center gap-2 shrink-0">
                <Icon className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                <div className="text-[11px] font-bold uppercase tracking-wide text-foreground">{filename}</div>
                {size && <span className="text-[10px] text-muted-foreground">· {size}</span>}
                {statusBadge && (
                    <span className={`ml-auto inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 ${toneClass}`}>
                        {statusBadge.label}
                    </span>
                )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 text-sm">
                {children}
            </div>
        </div>
    )
}

// ─── Helper · Panel hero header (consistent across panels) ───────────────────
// Auto-renders the PriorityChip inline with the title when the salesOppPriority
// signal is true. Reads the signal directly so no opt-in prop is needed.
function SalesPanelHero({ stage, title, subtitle, kpiRow }: {
    stage: OfficeworksReviewStage
    title: string
    subtitle: string
    kpiRow?: React.ReactNode
}) {
    const isPriority = useOppPriority()
    return (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start gap-3">
                <div className="h-9 w-9 rounded-lg bg-ai/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-ai" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-foreground">{title}</span>
                        {isPriority && <PriorityChip />}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</div>
                </div>
            </div>
            <SalesPainpointChip stage={stage} />
            <SalesAIBanner stage={stage} />
            {kpiRow}
        </div>
    )
}

// ─── Helper · PriorityChip (consistent star badge for priority opps) ─────────
function PriorityChip({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
    const cls = size === 'xs'
        ? 'text-[9px] px-1.5 py-0 gap-0.5'
        : 'text-[10px] px-2 py-0.5 gap-1'
    const iconSize = size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3'
    return (
        <span className={`inline-flex items-center rounded border bg-warning/10 text-warning border-warning/30 font-bold uppercase tracking-wider ${cls}`}>
            <Star className={`${iconSize} fill-current`} aria-hidden="true" />
            Priority
        </span>
    )
}

// Reads the signal · renders the chip conditionally. Use where the parent JSX
// doesn't already call useOppPriority (e.g. inside read-only preview shells).
function OppPriorityChipMaybe({ size = 'sm' }: { size?: 'xs' | 'sm' }) {
    const isPriority = useOppPriority()
    if (!isPriority) return null
    return <PriorityChip size={size} />
}

// ─── Sticky CTA footer reused across panels ──────────────────────────────────
function SalesStickyCTA({ label, onClick, disabled, secondaryNote }: {
    label: string; onClick: () => void; disabled?: boolean; secondaryNote?: string
}) {
    return (
        <div className="border-t border-border px-5 py-3 bg-card shrink-0 space-y-1.5">
            {secondaryNote && (
                <div className="text-[10px] text-muted-foreground italic px-1">{secondaryNote}</div>
            )}
            <button
                type="button"
                onClick={onClick}
                disabled={disabled}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-colors"
            >
                {label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </button>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES PANELS · 8 right-panel components
// ═══════════════════════════════════════════════════════════════════════════════

// ─── sc-S.0 · Unified Inbox Triage ──────────────────────────────────────────
function SalesInboxTriagePanel({ onValidate }: LDPanelProps) {
    const [filter, setFilter] = useState<'all' | 'urgent' | 'action' | 'fyi'>('all')
    // Notification path → MANATT highlighted as "NEW · just arrived".
    // View inbox path  → no card highlighted (clean inbox exploration).
    const showNewArrival = useShowNewArrival()
    const counts = useMemo(() => {
        const c = { all: SALES_INBOX_THREADS.length, urgent: 0, action: 0, fyi: 0 }
        for (const t of SALES_INBOX_THREADS) {
            if (t.intent === 'urgent') c.urgent++
            else if (t.intent === 'action') c.action++
            else if (t.intent === 'fyi') c.fyi++
        }
        return c
    }, [])
    const filtered = useMemo(() =>
        filter === 'all' ? SALES_INBOX_THREADS : SALES_INBOX_THREADS.filter(t => t.intent === filter),
    [filter])

    // Review (per-card): update the left-panel Thread Detail with this thread.
    const handleReview = (threadId: string) => {
        writeSelectedThread(threadId)
    }
    // Intake (per-card): mark the thread as added to the pipeline.
    // The demo advances on MANATT-4F · other threads just join the pipeline
    // as visual confirmation that Strata can intake any of them.
    const handleIntake = (threadId: string) => {
        addIntakenThread(threadId)
        if (threadId === MANATT_THREAD_ID) {
            onValidate()
        }
    }

    return (
        <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
            <SalesPanelHero
                stage="sales-inbox"
                title="Unified inbox triage · multi-channel feed"
                subtitle={`${SALES_VOLUME_FACTS.inboundEmailsPerDayPerRep} emails/day per rep · cross-channel today is 3 inboxes in parallel`}
            />

            <div className="flex items-center gap-1 p-0.5 rounded-md bg-muted/30 text-[11px]">
                {([
                    { id: 'all'    as const, label: 'All',     n: counts.all },
                    { id: 'urgent' as const, label: 'Urgent',  n: counts.urgent },
                    { id: 'action' as const, label: 'Action',  n: counts.action },
                    { id: 'fyi'    as const, label: 'FYI',     n: counts.fyi },
                ]).map(f => (
                    <button
                        key={f.id}
                        type="button"
                        onClick={() => setFilter(f.id)}
                        className={`flex-1 px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                            filter === f.id
                                ? 'bg-card text-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        {f.label} <span className="tabular-nums opacity-70">{f.n}</span>
                    </button>
                ))}
            </div>

            <UnifiedInboxFeed
                threads={filtered}
                onReview={handleReview}
                onIntake={handleIntake}
                newArrivalThreadId={showNewArrival ? MANATT_THREAD_ID : undefined}
            />

            <SalesSourceCite source="Notion AS-IS §8 · 150–200 emails/day · S9 multi-channel ~52:00 (Karen)" />
        </div>
    )
}

// ─── New component · UnifiedInboxFeed ───────────────────────────────────────
function UnifiedInboxFeed({
    threads,
    onReview,
    onIntake,
    newArrivalThreadId,
}: {
    threads: SalesInboxThread[]
    onReview?: (threadId: string) => void
    onIntake?: (threadId: string) => void
    newArrivalThreadId?: string
}) {
    const focusedId = useSelectedThread()
    const intakenIds = useIntakenThreads()
    // Local processing state · simulates Strata's intake processing for ~800ms
    // before the thread joins the pipeline (visual feedback that something is
    // happening · vs an instant state change).
    const [processingIds, setProcessingIds] = useState<Set<string>>(new Set())
    const dedupeGroups = useMemo(() => {
        const seen = new Map<string, number>()
        threads.forEach(t => {
            if (!t.dedupGroupId) return
            seen.set(t.dedupGroupId, (seen.get(t.dedupGroupId) ?? 0) + 1)
        })
        return seen
    }, [threads])

    const handleIntakeClick = (threadId: string) => {
        if (processingIds.has(threadId) || intakenIds.includes(threadId)) return
        setProcessingIds(prev => new Set(prev).add(threadId))
        // 800ms feels like "Strata is doing something" without being annoying.
        window.setTimeout(() => {
            onIntake?.(threadId)
            setProcessingIds(prev => {
                const next = new Set(prev)
                next.delete(threadId)
                return next
            })
        }, 800)
    }

    return (
        <div className="space-y-2">
            {threads.map(t => {
                const dupCount = t.dedupGroupId ? dedupeGroups.get(t.dedupGroupId) ?? 1 : 1
                const isDup = dupCount > 1
                const isNew = t.id === newArrivalThreadId
                const isFocused = t.id === focusedId
                const inPipeline = intakenIds.includes(t.id)
                const isProcessing = processingIds.has(t.id)
                const ringClass = isProcessing
                    ? 'border-ai/40 ring-2 ring-ai/20 transition-all'
                    : inPipeline
                    ? 'border-success/40 ring-1 ring-success/20'
                    : isNew
                    ? 'border-ai/60 ring-2 ring-ai/30 animate-in fade-in zoom-in-95 duration-500'
                    : isFocused
                    ? 'border-ai ring-2 ring-ai/40'
                    : 'border-border hover:border-foreground/20'
                return (
                    <div key={t.id} className={`rounded-lg border bg-card overflow-hidden transition-colors ${ringClass}`}>
                        <div className="px-3 py-2 flex items-center gap-2">
                            <ChannelIcon channel={t.channel} />
                            <span className="text-[11px] font-bold text-foreground truncate flex-1 min-w-0">{t.from}</span>
                            {isDup && (
                                <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-ai/10 text-ai border border-ai/20">
                                    Dedup · {dupCount} channels
                                </span>
                            )}
                            {/* Status chip: mutually exclusive priority · Processing > In pipeline > New > intent */}
                            {isProcessing ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-ai/15 text-ai border border-ai/30">
                                    <Loader2 className="h-2.5 w-2.5 animate-spin" /> Processing...
                                </span>
                            ) : inPipeline ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-success/15 text-success border border-success/30 animate-in fade-in duration-300">
                                    <Check className="h-2.5 w-2.5" /> In pipeline
                                </span>
                            ) : isNew ? (
                                <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-ai text-ai-foreground">
                                    <Sparkles className="h-2.5 w-2.5" /> New
                                </span>
                            ) : t.intent === 'urgent' ? (
                                <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-destructive/10 text-destructive border border-destructive/20">
                                    Urgent
                                </span>
                            ) : t.intent === 'action' ? (
                                <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-warning/10 text-warning border border-warning/20">
                                    Action
                                </span>
                            ) : (
                                <span className="inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 bg-muted text-muted-foreground border border-border">
                                    FYI
                                </span>
                            )}
                        </div>
                        <div className="px-3 pb-2 space-y-1">
                            <div className="text-[12px] font-medium text-foreground truncate">{t.subject}</div>
                            <div className="text-[11px] text-muted-foreground line-clamp-2">{t.snippet}</div>
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
                                <span>{t.receivedAt}</span>
                                {typeof t.hoursSinceLastTouch === 'number' && t.hoursSinceLastTouch > 12 && (
                                    <span className="text-destructive font-bold">· {t.hoursSinceLastTouch}h since last touch</span>
                                )}
                                <span className="ml-auto">Strata intent score · {t.intentScore}</span>
                            </div>
                        </div>
                        {(onReview || onIntake) && (
                            <div className="px-3 pb-2 pt-1 flex items-center gap-2 border-t border-border/60 bg-muted/20">
                                {isProcessing ? (
                                    <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-semibold text-ai">
                                        <Loader2 className="h-3 w-3 animate-spin" /> Adding to funnel...
                                    </span>
                                ) : inPipeline ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-success">
                                        <ArrowRight className="h-3 w-3" aria-hidden="true" /> Added to funnel
                                    </span>
                                ) : (
                                    <>
                                        {onReview && (
                                            <button
                                                type="button"
                                                onClick={() => onReview(t.id)}
                                                className="inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-medium border border-border bg-card hover:bg-muted/60 text-foreground transition-colors"
                                            >
                                                <Eye className="h-3 w-3" aria-hidden="true" />
                                                Review
                                            </button>
                                        )}
                                        {onIntake && (
                                            <button
                                                type="button"
                                                onClick={() => handleIntakeClick(t.id)}
                                                className={`ml-auto inline-flex items-center justify-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-bold transition-colors text-foreground ${
                                                    isNew
                                                        ? 'bg-primary hover:bg-primary/90'
                                                        : 'bg-primary/20 border border-primary/40 hover:bg-primary/30'
                                                }`}
                                            >
                                                Intake
                                                <ArrowRight className="h-3 w-3" aria-hidden="true" />
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

// ─── sc-S.1 · Email draft modal · clarification reply review + send ─────────
// Nested modal inside the Document Review Modal · shows the recipient (the
// missing piece per user feedback), subject, editable body. On Send, simulates
// a 600ms send animation then resolves to onSent (caller decides what happens
// next · typically: close modal + advance the demo).
function EmailDraftModal({
    isOpen, onClose, onSent,
    to, subject, body,
}: {
    isOpen: boolean
    onClose: () => void
    onSent: () => void
    to: string
    subject: string
    body: string
}) {
    type SendPhase = 'idle' | 'sending' | 'sent'
    const [phase, setPhase] = useState<SendPhase>('idle')
    const [draftBody, setDraftBody] = useState(body)

    // Reset state every time the modal opens.
    useEffect(() => {
        if (isOpen) {
            setPhase('idle')
            setDraftBody(body)
        }
    }, [isOpen, body])

    const handleSend = () => {
        if (phase !== 'idle') return
        setPhase('sending')
        setTimeout(() => {
            setPhase('sent')
            setTimeout(() => onSent(), 400)
        }, 600)
    }

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog onClose={phase === 'idle' ? onClose : () => {}} className="relative z-[400]">
                <TransitionChild as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-background/70 backdrop-blur-sm" />
                </TransitionChild>
                <div className="fixed inset-0 flex items-center justify-center p-4">
                    <TransitionChild as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-full max-w-2xl rounded-2xl border border-border bg-card shadow-2xl overflow-hidden flex flex-col">
                            {/* Header */}
                            <div className="px-5 py-3 border-b border-border flex items-center gap-2">
                                <div className="h-8 w-8 rounded-lg bg-ai/10 flex items-center justify-center">
                                    <Sparkles className="h-4 w-4 text-ai" aria-hidden="true" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-bold text-foreground">Clarification email · review and send</div>
                                    <div className="text-[11px] text-muted-foreground mt-0.5">Strata drafted this reply · the rep reviews and sends</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={phase !== 'idle'}
                                    className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    aria-label="Close"
                                >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>

                            {/* Recipient + subject */}
                            <div className="px-5 py-3 border-b border-border bg-muted/30 space-y-2">
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-12 shrink-0">To</span>
                                    <span className="text-[12px] text-foreground font-medium">{to}</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-12 shrink-0">Cc</span>
                                    <span className="text-[11px] text-muted-foreground italic">[Sales Lead] · auto-cc per CLAUDE.md "send-as-rep"</span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-12 shrink-0">Subject</span>
                                    <span className="text-[12px] text-foreground font-medium">{subject}</span>
                                </div>
                            </div>

                            {/* Body (editable) */}
                            <div className="px-5 py-3 border-b border-border">
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Body · editable</label>
                                <textarea
                                    value={draftBody}
                                    onChange={e => setDraftBody(e.target.value)}
                                    disabled={phase !== 'idle'}
                                    rows={14}
                                    className="w-full rounded-md border border-border bg-card text-foreground text-[12px] px-3 py-2 font-sans leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-ai/40 focus:border-ai/40 disabled:opacity-60 disabled:cursor-not-allowed"
                                />
                            </div>

                            {/* Footer · status note + actions */}
                            <div className="px-5 py-3 bg-muted/20 flex items-center gap-3">
                                <div className="flex-1 min-w-0 text-[11px] text-muted-foreground italic flex items-center gap-1.5">
                                    {phase === 'idle' && (
                                        <>
                                            <Sparkles className="h-3 w-3 text-ai shrink-0" aria-hidden="true" />
                                            <span>Strata never auto-sends · review and click Send when ready.</span>
                                        </>
                                    )}
                                    {phase === 'sending' && (
                                        <>
                                            <Loader2 className="h-3 w-3 text-ai animate-spin shrink-0" aria-hidden="true" />
                                            <span>Sending via Outlook…</span>
                                        </>
                                    )}
                                    {phase === 'sent' && (
                                        <>
                                            <CheckCircle2 className="h-3 w-3 text-success shrink-0" aria-hidden="true" />
                                            <span>Sent · saving opp record + advancing.</span>
                                        </>
                                    )}
                                </div>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    disabled={phase !== 'idle'}
                                    className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-semibold bg-card border border-border text-foreground hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    onClick={handleSend}
                                    disabled={phase !== 'idle'}
                                    className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Send className="h-3 w-3" aria-hidden="true" /> Send via Outlook
                                </button>
                            </div>
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    )
}

// ─── sc-S.1 · Strata insights card (right-panel · Phase 1C/refining only) ───
// Surfaces the "AI value-add" headline · 3 KPIs + pattern match + forward look
// + next best actions. Data lives in SALES_OPP_INTAKE_INSIGHTS · risk level
// derives dynamically from the live toClarifyCount in the parent panel.
function SalesIntakeInsightsCard({ toClarifyCount }: { toClarifyCount: number }) {
    const I = SALES_OPP_INTAKE_INSIGHTS
    const risk: { label: string; tone: 'warning' | 'info' | 'success' } =
        toClarifyCount > 3 ? { label: 'High', tone: 'warning' }
        : toClarifyCount > 0 ? { label: 'Med',  tone: 'info' }
        :                       { label: 'Low',  tone: 'success' }

    return (
        <div className="rounded-xl border border-ai/30 bg-ai/5 overflow-hidden">
            {/* Header */}
            <div className="px-4 py-2 bg-card border-b border-ai/20 flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5 text-ai" aria-hidden="true" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                    Strata insights · this intake
                </span>
            </div>

            {/* 3 mini-KPIs */}
            <div className="grid grid-cols-3 divide-x divide-ai/20 bg-card">
                <SalesInsightKPI label="Confidence" value={`${I.confidence.pct}%`} tone="ai" sub={I.confidence.detail} />
                <SalesInsightKPI label="Incomplete risk" value={risk.label} tone={risk.tone} sub={`${toClarifyCount} fields to clarify`} />
                <SalesInsightKPI label="Time saved" value={`~${I.timeSaved.hoursMin}-${I.timeSaved.hoursMax}h`} tone="success" sub={I.timeSaved.detail} />
            </div>

            {/* Pattern match */}
            <div className="px-4 py-2.5 border-t border-ai/20 bg-card flex items-start gap-2">
                <TrendingUp className="h-3.5 w-3.5 text-ai shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-[11px] text-foreground leading-relaxed">
                    <strong>Pattern:</strong> {I.patternMatch.title} · {I.patternMatch.detail}
                </div>
            </div>

            {/* Forward look */}
            <div className="px-4 py-2.5 border-t border-ai/20 bg-card">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                    <Eye className="h-3 w-3" aria-hidden="true" /> Forward look · sc-S.2 / sc-S.3
                </div>
                <ul className="space-y-1">
                    {I.forwardLook.map(item => (
                        <li key={item} className="text-[11px] text-foreground flex items-start gap-1.5">
                            <ChevronRightIcon className="h-3 w-3 text-ai shrink-0 mt-0.5" aria-hidden="true" />
                            <span>{item}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Next best actions */}
            <div className="px-4 py-3 border-t border-ai/20 bg-card">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2">
                    Next best actions
                </div>
                <ul className="space-y-1.5">
                    {I.nextBestActions.map((action, i) => (
                        <li key={action} className="text-[11px] text-foreground flex items-start gap-2">
                            <span className="shrink-0 mt-0.5 inline-flex items-center justify-center h-4 w-4 rounded-full bg-ai/15 text-ai text-[9px] font-bold">{i + 1}</span>
                            <span>{action}</span>
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    )
}

function SalesInsightKPI({ label, value, tone, sub }: {
    label: string
    value: string
    tone: 'ai' | 'success' | 'warning' | 'info'
    sub: string
}) {
    const toneClass = tone === 'ai' ? 'text-ai'
                    : tone === 'success' ? 'text-success'
                    : tone === 'warning' ? 'text-warning'
                    : 'text-info'
    return (
        <div className="px-3 py-2.5 text-center">
            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">{label}</div>
            <div className={`text-[18px] font-bold mt-0.5 ${toneClass}`}>{value}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5 leading-tight">{sub}</div>
        </div>
    )
}

// ─── sc-S.1 · Project priority toggle (Sales Lead flags for expedited SLA) ──
// Inserted in the refining-phase RIGHT panel between Strata insights and the
// pre-flight check. Click toggles the `salesOppPriority` signal · the chip
// then propagates to all downstream Sales steps via PriorityChip renders.
function PriorityTogglePanel() {
    const isPriority = useOppPriority()
    return (
        <div className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center shrink-0">
                <Star className={`h-4 w-4 text-warning ${isPriority ? 'fill-current' : ''}`} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
                <div className="text-[11px] font-bold uppercase tracking-wider text-foreground">Project priority</div>
                <div className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {isPriority
                        ? 'Marked as priority · expedited SLA (12h qualify / 24h proposal) on the assigned rep.'
                        : 'Mark to trigger expedited SLA (12h qualify / 24h proposal) and a visual flag for the assigned rep.'}
                </div>
            </div>
            <button
                type="button"
                onClick={() => writeOppPriority(!isPriority)}
                className={`shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-bold transition-colors ${
                    isPriority
                        ? 'bg-warning text-warning-foreground hover:bg-warning/90'
                        : 'bg-card border border-border text-foreground hover:bg-muted'
                }`}
                aria-pressed={isPriority}
            >
                <Star className={`h-3.5 w-3.5 ${isPriority ? 'fill-current' : ''}`} aria-hidden="true" />
                {isPriority ? 'Priority on' : 'Mark as priority'}
            </button>
        </div>
    )
}

// ─── sc-S.1 · Opportunity Intake ────────────────────────────────────────────
// IMPORTANT React-hooks rule · all hooks declared at the top BEFORE any early
// return · do not reintroduce useMemo / useState below the phase conditionals.
function SalesOppIntakePanel({ onValidate }: LDPanelProps) {
    const phase = useIntakePhase()
    const source = useIntakeSource()
    const opp = SALES_OPPORTUNITIES[0] // MANATT-4F
    const [draftOpen, setDraftOpen] = useState(false)
    const [emailModalOpen, setEmailModalOpen] = useState(false)
    const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null)

    // Pre-flight fields · 3 status tones (declared up-front so the hook order
    // stays constant across all phases · used only in refining/saving views).
    //   present       · confirmed by source, ready for submit
    //   present-soft  · inferred from thread (guess) · needs client confirmation
    //   missing       · not extractable from thread · must be clarified
    type FieldStatus = 'missing' | 'present' | 'present-soft'
    type FieldRow = { label: string; status: FieldStatus; value?: string; hint?: string }

    const fields = useMemo<FieldRow[]>(() => [
        // CAD attached as PDF floor plan per AS-IS narrative · Design team needs DWG
        // to base their layout · the demo-level subvalidation makes this visible.
        { label: 'CAD file',            status: 'present-soft', value: 'PDF floor plan attached', hint: 'Design team needs DWG · clarify with client' },
        { label: 'SQ number',           status: 'missing', hint: 'Spec Quote # from prior engagement' },
        { label: 'Scope detail',        status: 'missing', hint: 'Pieces + finish + qty · needed for pricing' },
        { label: 'Timeline / move-in',  status: 'present-soft', value: '2026-08-30 · guess', hint: 'Inferred from "summer move-in" · needs confirmation' },
        { label: 'Company',             status: 'present', value: opp.company },
        { label: 'Est value range',     status: 'present', value: `$${(opp.estValueUSD / 1000).toFixed(0)}k` },
        { label: 'Vertical',            status: 'present', value: opp.vertical },
        { label: 'Market',              status: 'present', value: opp.market },
        { label: 'Account type',        status: 'present', value: opp.accountType },
    ], [opp])

    const missingCount = fields.filter(f => f.status === 'missing').length
    const softCount = fields.filter(f => f.status === 'present-soft').length
    const toClarifyCount = missingCount + softCount
    const allClear = toClarifyCount === 0

    // Sticky CTA click · 2 paths:
    //   allClear   → no clarification needed · go straight to saving animation.
    //   has gaps   → open the EmailDraftModal so the rep reviews and sends the
    //                clarification reply · on Send confirm, run the same save
    //                animation (writeIntakePhase('saving') + onValidate).
    const runSaveAnimation = () => {
        if (phase === 'saving') return
        writeIntakePhase('saving')
        const t = setTimeout(() => {
            onValidate()
        }, 800)
        setSaveTimer(t)
    }
    const handleSave = () => {
        const hasGaps = !allClear
        if (hasGaps) {
            setEmailModalOpen(true)
            return
        }
        runSaveAnimation()
    }
    const handleEmailSent = () => {
        setEmailModalOpen(false)
        runSaveAnimation()
    }
    useEffect(() => () => { if (saveTimer) clearTimeout(saveTimer) }, [saveTimer])

    // Phase 1A · Source picker · context-only right panel (no redundant list).
    if (phase === 'source-pick') {
        return (
            <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                    <SalesPanelHero
                        stage="sales-intake"
                        title="Opportunity intake · pick a source first"
                        subtitle="Strata drafts the opp record from the source you pick on the left"
                    />
                    <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                        <div className="flex items-center gap-2">
                            <ClipboardCheck className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Why this step exists</span>
                        </div>
                        <p className="text-[11px] text-foreground leading-relaxed">
                            Per the AS-IS BPMN, the AI-triage agent must <strong>link to a Copper opp (if matched)</strong> before the rep drafts the Works form. Skipping this step is the upstream root cause of the {SALES_VOLUME_FACTS.worksFormIncompletePctMin}-{SALES_VOLUME_FACTS.worksFormIncompletePctMax}% Works form incompleteness (Felicia · Spec Check 30-Apr).
                        </p>
                        <p className="text-[11px] text-muted-foreground italic">
                            For MANATT-4F: Strata already found <strong className="text-foreground not-italic">Hayes Construction</strong> as the GC referrer in Copper · the recommended path enriches the new opp with that account context.
                        </p>
                    </div>
                    <SalesSourceCite source="BPMN AI-triage agent · &quot;Link to Copper opp (if matched)&quot; · HTML PP S7 (process orchestrator gate)" />
                </div>
                <SalesStickyCTA
                    label="Pick an intake source on the left"
                    onClick={() => {}}
                    disabled
                    secondaryNote="Strata waits for the rep to pick a source · then drafts the opp record."
                />
            </>
        )
    }

    // Phase 1B · Processing · right panel mirrors the left animation.
    if (phase === 'processing') {
        const sourceLabel = source === 'link-copper' ? 'Hayes Construction (Copper)'
                          : source === 'upload-pdf'  ? 'Uploaded PDF'
                          : 'picked source'
        return (
            <>
                <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                    <SalesPanelHero
                        stage="sales-intake"
                        title="Strata processing intake"
                        subtitle={`Drafting opp record from ${sourceLabel} · ~1.5s`}
                    />
                    <div className="rounded-xl border border-ai/30 bg-ai/5 p-4 flex items-center gap-3">
                        <Loader2 className="h-5 w-5 text-ai animate-spin shrink-0" aria-hidden="true" />
                        <div className="text-[12px] text-foreground">
                            <strong className="text-ai">Strata AI · </strong>
                            Extracting → enriching → drafting. Hold tight.
                        </div>
                    </div>
                </div>
                <SalesStickyCTA
                    label="Processing…"
                    onClick={() => {}}
                    disabled
                    secondaryNote="Strata is drafting the opp record from your picked source."
                />
            </>
        )
    }

    // Phase 1C/1D · Refining or Saving · the full pre-flight + draft view.
    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                <SalesPanelHero
                    stage="sales-intake"
                    title="Opportunity intake · pre-flight Works form"
                    subtitle={`${opp.company} · ${opp.projectCode} · $${(opp.estValueUSD / 1000).toFixed(0)}k est · ${opp.vertical}`}
                />

                {/* ─── Strata insights · 3 KPIs + pattern + forward look + actions ─── */}
                {/* Provenance card lives in the LEFT panel now (DRAFT opp record) · */}
                {/* showing it on the right too would duplicate the same data.       */}
                <SalesIntakeInsightsCard toClarifyCount={toClarifyCount} />

                {/* ─── Project priority · Sales Lead can flag for expedited SLA ──── */}
                <PriorityTogglePanel />

                {/* ─── Pre-flight check · 9 Works form fields ─────────────────────── */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <ClipboardCheck className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Pre-flight check · 9 Works form fields</span>
                        <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 ${
                            allClear ? 'bg-success/10 text-success border border-success/20'
                                     : 'bg-warning/10 text-warning border border-warning/20'
                        }`}>
                            {allClear ? 'Complete' : `${toClarifyCount} to clarify`}
                        </span>
                    </div>
                    <ul className="divide-y divide-border">
                        {fields.map(f => (
                            <li key={f.label} className="px-4 py-2 flex items-start gap-3 text-[11px]">
                                <span className="text-muted-foreground w-28 shrink-0 pt-0.5">{f.label}</span>
                                {f.status === 'present' ? (
                                    <span className="text-foreground flex-1">{f.value ?? '—'}</span>
                                ) : f.status === 'present-soft' ? (
                                    <div className="flex-1 min-w-0">
                                        <div className="text-warning font-medium">{f.value}</div>
                                        {f.hint && <div className="text-[10px] text-muted-foreground italic mt-0.5">{f.hint}</div>}
                                    </div>
                                ) : (
                                    <div className="flex-1 min-w-0">
                                        <div className="inline-flex items-center gap-1 text-warning">
                                            <AlertCircle className="h-3 w-3" aria-hidden="true" />
                                            <em className="italic">missing · clarify before submit</em>
                                        </div>
                                        {f.hint && <div className="text-[10px] text-muted-foreground mt-0.5">{f.hint}</div>}
                                    </div>
                                )}
                                {f.status === 'present' ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" aria-hidden="true" />
                                ) : (
                                    <AlertCircle className="h-3.5 w-3.5 text-warning shrink-0 mt-0.5" aria-hidden="true" />
                                )}
                            </li>
                        ))}
                    </ul>
                </div>

                {/* ─── Prereqs gateway · process orchestrator gate (BPMN PP S7) ──── */}
                {allClear ? (
                    <div className="rounded-xl border border-success/30 bg-success/5 p-3.5 flex items-center gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success shrink-0" aria-hidden="true" />
                        <div className="flex-1">
                            <p className="text-[12px] font-semibold text-foreground">All prereqs met · ready to submit Works form</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Strata orchestrator gate cleared · downstream design team unblocked</p>
                        </div>
                    </div>
                ) : (
                    <div className="rounded-xl border border-warning/30 bg-warning/5 p-3.5 flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-warning shrink-0" aria-hidden="true" />
                        <div className="flex-1">
                            <p className="text-[12px] font-semibold text-foreground">Prereqs not met · cannot submit Works form yet</p>
                            <p className="text-[11px] text-muted-foreground mt-0.5">Strata blocks the submit per BPMN PP S7 · process orchestrator gate</p>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-[11px] font-bold text-warning uppercase tracking-wider">{missingCount} missing · {softCount} soft</p>
                            <p className="text-[10px] text-muted-foreground">→ send clarification</p>
                        </div>
                    </div>
                )}

                {/* ─── Strata-drafted clarification email · drafts only ──────────── */}
                {!allClear && (
                    <div className="rounded-xl border border-ai/30 bg-ai/5 overflow-hidden">
                        <button
                            type="button"
                            onClick={() => setDraftOpen(o => !o)}
                            className="w-full px-4 py-3 flex items-center gap-2 hover:bg-ai/10 transition-colors text-left"
                            aria-expanded={draftOpen}
                            aria-controls="sales-clarification-draft-body"
                        >
                            <Sparkles className="h-4 w-4 text-ai shrink-0" aria-hidden="true" />
                            <div className="flex-1 min-w-0">
                                <div className="text-[12px] font-semibold text-foreground">Strata drafted clarification reply · for your review</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5">To: {SALES_OPP_CLARIFICATION_DRAFT.to}</div>
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider rounded border border-ai/30 bg-card text-ai px-1.5 py-0.5 shrink-0">Draft only</span>
                            <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform ${draftOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
                        </button>
                        {draftOpen && (
                            <div id="sales-clarification-draft-body" className="border-t border-ai/20 bg-card">
                                <div className="px-4 py-3 border-b border-border space-y-1.5">
                                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">Subject</div>
                                    <div className="text-[12px] text-foreground font-medium">{SALES_OPP_CLARIFICATION_DRAFT.subject}</div>
                                </div>
                                <pre className="px-4 py-3 text-[11px] text-foreground font-sans whitespace-pre-wrap leading-relaxed">{SALES_OPP_CLARIFICATION_DRAFT.body}</pre>
                                <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center gap-2">
                                    <p className="text-[10px] text-muted-foreground italic flex-1">Strata never auto-sends · review and Send when ready, or edit inline before sending.</p>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-semibold bg-card border border-border text-foreground hover:bg-muted transition-colors"
                                    >
                                        <Edit3 className="h-3 w-3" aria-hidden="true" /> Edit draft
                                    </button>
                                    <button
                                        type="button"
                                        className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                    >
                                        <Send className="h-3 w-3" aria-hidden="true" /> Send via Outlook
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ─── SLA timer preview ────────────────────────────────────────── */}
                <div className="flex items-start gap-2 text-[11px] text-muted-foreground border-t border-border pt-3">
                    <Clock className="h-3.5 w-3.5 text-foreground shrink-0 mt-0.5" aria-hidden="true" />
                    <span><strong className="text-foreground">On submit:</strong> 24h designer assignment SLA starts · 48h kickoff SLA · auto-escalates to Sales Manager if breached</span>
                </div>

                <SalesSourceCite source={`Felicia Miano-Poles · Spec Check 30-Apr · ~${SALES_VOLUME_FACTS.worksFormIncompletePctMin}-${SALES_VOLUME_FACTS.worksFormIncompletePctMax}% Works forms incomplete · HTML BPMN PP S2 + PP S7 (process orchestrator gate)`} />
            </div>
            <SalesStickyCTA
                label={phase === 'saving'
                    ? 'Saving to Copper…'
                    : allClear ? 'Save opp record · submit Works form' : 'Save opp record · review clarification draft'}
                onClick={handleSave}
                disabled={phase === 'saving'}
                secondaryNote={phase === 'saving'
                    ? 'Strata writes the confirmed record to Copper · ~800ms.'
                    : allClear
                        ? 'Strata never auto-submits Works form · the rep clarifies and submits.'
                        : 'Strata holds Works form submit until client clarifies · review the draft and send.'
                }
            />

            {/* Nested modal · clarification email review + send */}
            <EmailDraftModal
                isOpen={emailModalOpen}
                onClose={() => setEmailModalOpen(false)}
                onSent={handleEmailSent}
                to={SALES_OPP_CLARIFICATION_DRAFT.to}
                subject={SALES_OPP_CLARIFICATION_DRAFT.subject}
                body={SALES_OPP_CLARIFICATION_DRAFT.body}
            />
        </>
    )
}

// ─── sc-S.2 · Rep Capacity Ledger · master-detail RIGHT panel ───────────────
// LEFT panel (SalesCapacityLedgerPreview) is the master list · click a rep
// there → writes salesAssignedRepId signal → this RIGHT panel re-renders the
// detail card for that rep. If no user click yet, the detail defaults to the
// Strata recommendation so the panel is never empty.
function SalesCapacityPanel({ onValidate }: LDPanelProps) {
    const selectedId = useAssignedRepId()
    const effectiveId = selectedId ?? SALES_REP_RECOMMENDATION.repId
    const rep = SALES_REPS.find(r => r.id === effectiveId)!
    const isUserSelection = !!selectedId

    // ── Auto match-assessment (replaces the v1 checkbox) ────────────────────
    // MANATT-4F is a DC furniture opp · derive 4 quality signals from the rep.
    const oppMarket = 'DC'
    const territoryMatch = rep.territory.includes(oppMarket)
    const priorManattCount = rep.priorWinsWithAccount.MANATT ?? 0
    const priorWinsOk = priorManattCount > 0
    const capacityOk = rep.capacityFlag !== 'overloaded'
    const responseOk = rep.onTimeResponseRatePct >= 80
    const allGreen = territoryMatch && capacityOk && responseOk

    const canProceed = isUserSelection
    const shortLabel = rep.label.replace('Sales ', '')

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                <SalesPanelHero
                    stage="sales-capacity"
                    title="Rep capacity ledger · best-fit assignment"
                    subtitle={`Pick a rep from the left ledger · Strata recommends ${SALES_REPS.find(r => r.id === SALES_REP_RECOMMENDATION.repId)?.label}`}
                />

                {/* Strata reco banner · no checkbox · auto-match handled below */}
                <div className="rounded-xl border border-ai/30 bg-ai/5 p-3 flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-ai shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-[12px] text-foreground leading-relaxed">
                        <strong className="text-ai">Strata · best-fit rep · </strong>
                        {SALES_REP_RECOMMENDATION.rationale}
                    </div>
                </div>

                {/* Selected rep detail card */}
                <SalesRepDetailCard
                    rep={rep}
                    isUserSelection={isUserSelection}
                    territoryMatch={territoryMatch}
                    priorWinsOk={priorWinsOk}
                    capacityOk={capacityOk}
                    responseOk={responseOk}
                />

                <SalesSourceCite source="BPMN PP SC5 · capacity self-reported Thursdays vs Strata live ledger · revisions + rework included" />
            </div>
            <SalesStickyCTA
                label={
                    canProceed ? `Assign ${shortLabel} · proceed to discovery`
                               : 'Click a rep on the left to assign'
                }
                onClick={onValidate}
                disabled={!canProceed}
                secondaryNote={
                    !canProceed ? 'Strata recommends Rep A (Mid-Atlantic) · click any rep on the left ledger to confirm.'
                  : !allGreen   ? 'Cross-territory or capacity warning · confirm with Sales Manager before commit.'
                                : 'Strata starts the 24h qualify / 48h proposal SLA timer on assignment.'
                }
            />
        </>
    )
}

// ─── sc-S.2 · SalesRepDetailCard (RIGHT panel detail view) ──────────────────
// Renders the currently selected rep with:
//   - prominent territory header (region + sub-regions + focus + status)
//   - 4 auto match-assessment chips (Territory / Prior wins / Load / Response)
//   - full-width quota bar
//   - 3-col metrics + active opps + prior wins + KPI footer
// `isUserSelection=false` means the user hasn't clicked yet · we show the
// Strata default with a discrete "Strata default" chip in the header.
function SalesRepDetailCard({
    rep,
    isUserSelection,
    territoryMatch,
    priorWinsOk,
    capacityOk,
    responseOk,
}: {
    rep: SalesRep
    isUserSelection: boolean
    territoryMatch: boolean
    priorWinsOk: boolean
    capacityOk: boolean
    responseOk: boolean
}) {
    const region = SALES_REP_REGION_GROUPS.find(g => g.key === rep.regionGroup)
    const priorManattCount = rep.priorWinsWithAccount.MANATT ?? 0
    const priorWinsCount = Object.values(rep.priorWinsWithAccount).reduce((s, n) => s + n, 0)
    const statusToneClass =
        rep.capacityFlag === 'overloaded' ? 'bg-destructive/10 text-destructive border-destructive/30' :
        rep.capacityFlag === 'optimal'    ? 'bg-warning/10 text-warning border-warning/20' :
                                            'bg-success/10 text-success border-success/20'
    const quotaBarClass =
        rep.capacityFlag === 'overloaded' ? 'bg-destructive' :
        rep.capacityFlag === 'optimal'    ? 'bg-warning' :
                                            'bg-success'

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            {/* ── Territory header · prominent · border-l-4 accent ─────────── */}
            <div className="border-l-4 border-l-ai bg-muted/20 px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2 flex-1 min-w-0">
                        <Building2 className="h-5 w-5 text-ai shrink-0 mt-0.5" aria-hidden="true" />
                        <div className="flex-1 min-w-0">
                            <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">Territory · {region?.label}</div>
                            <div className="text-base font-bold text-foreground mt-0.5">{rep.territory}</div>
                            {region?.focus && (
                                <div className="text-[11px] text-muted-foreground mt-0.5 italic">{region.focus}</div>
                            )}
                        </div>
                    </div>
                    <div className="shrink-0 flex flex-col items-end gap-1">
                        <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border ${statusToneClass}`}>
                            {rep.capacityFlag}
                        </span>
                        {rep.isRegionLead && (
                            <span className="text-[9px] uppercase tracking-wider font-bold bg-foreground/10 text-foreground/70 rounded px-1.5 py-0.5">Lead</span>
                        )}
                        {!isUserSelection && (
                            <span className="text-[9px] uppercase tracking-wider font-bold bg-ai/10 text-ai border border-ai/20 rounded px-1.5 py-0.5">Strata default</span>
                        )}
                    </div>
                </div>
                <div className="text-[12px] text-foreground font-semibold mt-2">{rep.label}</div>
            </div>

            {/* ── 4 auto match-assessment chips ─────────────────────────────── */}
            <div className="px-4 py-3 border-t border-border space-y-2">
                <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5">Match assessment · MANATT-4F</div>
                <div className="grid grid-cols-2 gap-2">
                    <MatchChip
                        ok={territoryMatch}
                        label="Territory"
                        detail={territoryMatch ? 'DC office in DC + NoVA' : 'Cross-territory'}
                    />
                    <MatchChip
                        ok={priorWinsOk}
                        neutralIfNotOk
                        label="Prior wins"
                        detail={priorWinsOk ? `MANATT:${priorManattCount}` : 'No prior MANATT'}
                    />
                    <MatchChip
                        ok={capacityOk}
                        label="Load"
                        detail={`${rep.quotaProgressPct}% · ${rep.capacityFlag}`}
                    />
                    <MatchChip
                        ok={responseOk}
                        label="Response SLA"
                        detail={`${rep.onTimeResponseRatePct}% on-time`}
                    />
                </div>
            </div>

            {/* ── Quota bar full-width ──────────────────────────────────────── */}
            <div className="px-4 py-3 border-t border-border">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1.5">
                    <span>Quota progress</span>
                    <span className="text-foreground">{rep.quotaProgressPct}% YTD</span>
                </div>
                <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full ${quotaBarClass}`} style={{ width: `${Math.min(100, rep.quotaProgressPct)}%` }} />
                </div>
            </div>

            {/* ── 3-col metrics ─────────────────────────────────────────────── */}
            <div className="px-4 py-3 border-t border-border grid grid-cols-3 gap-2">
                <div className="rounded-md border border-border bg-muted/20 p-2">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Open opps</div>
                    <div className="text-[14px] font-bold text-foreground tabular-nums mt-0.5">{rep.openOpps}</div>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-2">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Qualified pipeline</div>
                    <div className="text-[14px] font-bold text-foreground tabular-nums mt-0.5">${(rep.qualifiedPipelineValueUSD / 1_000_000).toFixed(1)}M</div>
                </div>
                <div className="rounded-md border border-border bg-muted/20 p-2">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">On-time response</div>
                    <div className="text-[14px] font-bold text-foreground tabular-nums mt-0.5">{rep.onTimeResponseRatePct}%</div>
                </div>
            </div>

            {/* ── Active opps list ──────────────────────────────────────────── */}
            {rep.recentActiveOpps.length > 0 && (
                <div className="px-4 py-3 border-t border-border">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                        <Briefcase className="h-3 w-3" aria-hidden="true" /> Active opps · {rep.recentActiveOpps.length}
                    </div>
                    <ul className="space-y-1">
                        {rep.recentActiveOpps.map(o => (
                            <li key={o.code} className="flex items-center gap-2 text-[11px]">
                                <span className="text-foreground font-medium tabular-nums w-32 shrink-0 truncate">{o.code}</span>
                                <span className="text-muted-foreground flex-1 truncate">{o.client}</span>
                                <span className="text-foreground tabular-nums shrink-0">${(o.valueUSD / 1_000).toFixed(0)}k</span>
                                <span className="text-muted-foreground text-[10px] tabular-nums shrink-0">{o.stage}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* ── Prior wins chips ──────────────────────────────────────────── */}
            {priorWinsCount > 0 && (
                <div className="px-4 py-3 border-t border-border">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground mb-1.5 flex items-center gap-1.5">
                        <Award className="h-3 w-3" aria-hidden="true" /> Prior wins · {priorWinsCount}
                    </div>
                    <div className="flex flex-wrap gap-1">
                        {Object.entries(rep.priorWinsWithAccount).map(([account, count]) => (
                            <span
                                key={account}
                                className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded border px-1.5 py-0.5 ${
                                    account === 'MANATT'
                                        ? 'bg-info/15 text-info border-info/30'
                                        : 'bg-card text-foreground border-border'
                                }`}
                            >
                                {account}:{count}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            {/* ── KPI footer 3-col ──────────────────────────────────────────── */}
            <div className="px-4 py-3 border-t border-border bg-muted/10 grid grid-cols-3 gap-2">
                <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Avg cycle</div>
                    <div className="text-[12px] font-bold text-foreground tabular-nums mt-0.5">{rep.avgCycleWeeks}w</div>
                </div>
                <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Lost deal rate</div>
                    <div className="text-[12px] font-bold text-foreground tabular-nums mt-0.5">{rep.lostDealRatePct}%</div>
                </div>
                <div className="text-center">
                    <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Total wins</div>
                    <div className="text-[12px] font-bold text-foreground tabular-nums mt-0.5">{priorWinsCount}</div>
                </div>
            </div>
        </div>
    )
}

function MatchChip({ ok, label, detail, neutralIfNotOk }: {
    ok: boolean
    label: string
    detail: string
    neutralIfNotOk?: boolean
}) {
    const okClass    = 'border-success/30 bg-success/5'
    const warnClass  = 'border-warning/30 bg-warning/5'
    const neutralCls = 'border-border bg-muted/30'
    const cls = ok ? okClass : neutralIfNotOk ? neutralCls : warnClass
    const Icon = ok ? CheckCircle2 : neutralIfNotOk ? HelpCircle : AlertTriangle
    const iconColor = ok ? 'text-success' : neutralIfNotOk ? 'text-muted-foreground' : 'text-warning'
    return (
        <div className={`rounded-md border px-2.5 py-1.5 flex items-start gap-2 ${cls}`}>
            <Icon className={`h-3.5 w-3.5 shrink-0 mt-0.5 ${iconColor}`} aria-hidden="true" />
            <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-foreground">{label}</div>
                <div className="text-[10px] text-muted-foreground truncate">{detail}</div>
            </div>
        </div>
    )
}

// ─── New component · RepCapacityLedger ──────────────────────────────────────
// Master list of sales reps · used in sc-S.2 LEFT panel.
// - Read-only mode (no onSelect): renders div cards · original AS-IS look.
// - Selectable mode (onSelect provided): renders button cards · click writes
//   the selected id · the SELECTED card gets a ring-primary outline. No
//   background tint on any other card · the RIGHT panel renders the detail.
function RepCapacityLedger({
    reps,
    onSelect,
    selectedId,
}: {
    reps: readonly SalesRep[]
    onSelect?: (id: string) => void
    selectedId?: string | null
}) {
    const isInteractive = !!onSelect
    return (
        <div className="space-y-2">
            {reps.map(r => {
                const tone = r.capacityFlag === 'overloaded' ? 'destructive'
                           : r.capacityFlag === 'optimal'    ? 'warning'
                           : 'success'
                const toneClass = tone === 'destructive' ? 'bg-destructive/10 text-destructive border-destructive/20'
                                : tone === 'warning'     ? 'bg-warning/10 text-warning border-warning/20'
                                : 'bg-success/10 text-success border-success/20'
                const isSelected = selectedId === r.id
                const cardClass = `w-full text-left rounded-xl border bg-card overflow-hidden transition-all ${
                    isSelected      ? 'border-primary ring-2 ring-primary/30'
                    : isInteractive ? 'border-border hover:border-foreground/30 cursor-pointer'
                                    : 'border-border'
                }`
                const body = (
                    <>
                        <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                            <Briefcase className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                            <span className="text-xs font-bold text-foreground truncate flex-1">{r.label}</span>
                            {isSelected && (
                                <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                            )}
                            <span className={`inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border ${toneClass}`}>
                                {r.capacityFlag}
                            </span>
                        </div>
                        <div className="px-4 py-2 text-[11px] text-muted-foreground">{r.territory}</div>
                        <div className="px-4 py-2 grid grid-cols-3 gap-2 text-[11px] border-t border-border">
                            <div><span className="text-muted-foreground">Open opps</span><div className="text-foreground font-bold tabular-nums">{r.openOpps}</div></div>
                            <div><span className="text-muted-foreground">Qualified $</span><div className="text-foreground font-bold tabular-nums">${(r.qualifiedPipelineValueUSD / 1_000_000).toFixed(1)}M</div></div>
                            <div><span className="text-muted-foreground">Quota</span><div className="text-foreground font-bold tabular-nums">{r.quotaProgressPct}%</div></div>
                        </div>
                        <div className="px-4 py-2 grid grid-cols-2 gap-2 text-[11px] border-t border-border">
                            <div><span className="text-muted-foreground">On-time response</span><div className="text-foreground tabular-nums">{r.onTimeResponseRatePct}%</div></div>
                            <div>
                                <span className="text-muted-foreground">Prior wins</span>
                                <div className="text-foreground tabular-nums">
                                    {Object.keys(r.priorWinsWithAccount).length === 0
                                        ? '—'
                                        : Object.entries(r.priorWinsWithAccount).map(([k, v]) => `${k}:${v}`).join(' · ')}
                                </div>
                            </div>
                        </div>
                    </>
                )
                if (isInteractive) {
                    return (
                        <button
                            key={r.id}
                            type="button"
                            onClick={() => onSelect!(r.id)}
                            aria-pressed={isSelected}
                            className={cardClass}
                        >
                            {body}
                        </button>
                    )
                }
                return (
                    <div key={r.id} className={cardClass}>
                        {body}
                    </div>
                )
            })}
        </div>
    )
}

// ─── sc-S.3 · Handoff briefing (assigned rep accepts + starts qualification) ─
// The rep (not the Sales Lead) lands here after sc-S.2 assignment. Strata
// briefs them on why they were picked, what was extracted from the inbox, the
// SLA gates they're now accountable for, and a suggested first-touch action.
function SalesAssignmentPanel({ onValidate }: LDPanelProps) {
    const assignedId = useAssignedRepId()
    const isPriority = useOppPriority()
    const rep = SALES_REPS.find(r => r.id === assignedId) ?? SALES_REPS[0]
    const opp = SALES_OPPORTUNITIES[0]
    const region = SALES_REP_REGION_GROUPS.find(g => g.key === rep.regionGroup)
    const priorManattCount = rep.priorWinsWithAccount.MANATT ?? 0
    const qualifyHours = isPriority ? 12 : 24
    const proposalHours = isPriority ? 24 : 48

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                <SalesPanelHero
                    stage="sales-assign"
                    title="Welcome — you've been assigned to MANATT-4F"
                    subtitle={`${rep.label} · ${priorManattCount > 0 ? `${priorManattCount} prior MANATT win${priorManattCount > 1 ? 's' : ''}` : 'first MANATT engagement'} · ${rep.capacityFlag} load`}
                />

                {/* 1 · Why you were picked */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Award className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Why Strata picked you</span>
                    </div>
                    <div className="px-4 py-3 grid grid-cols-3 gap-2">
                        <BriefingChip
                            icon={<MapPin className="h-3 w-3" />}
                            label="Territory"
                            detail={`${rep.territory} · ${opp.market} office`}
                        />
                        <BriefingChip
                            icon={<Award className="h-3 w-3" />}
                            label="Prior wins"
                            detail={priorManattCount > 0 ? `MANATT:${priorManattCount}` : 'No prior MANATT'}
                            neutralIfEmpty={priorManattCount === 0}
                        />
                        <BriefingChip
                            icon={<TrendingUp className="h-3 w-3" />}
                            label="Load"
                            detail={`${rep.quotaProgressPct}% · ${rep.capacityFlag}`}
                            warn={rep.capacityFlag === 'overloaded'}
                        />
                    </div>
                    {region?.focus && (
                        <div className="px-4 pb-3 text-[11px] text-muted-foreground italic">
                            <strong className="text-foreground not-italic">{region.label} focus:</strong> {region.focus}
                        </div>
                    )}
                </div>

                {/* 2 · What Strata extracted from the thread */}
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Mail className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">What Strata extracted</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">THREAD-SIT-001.EML</span>
                    </div>
                    <ul className="divide-y divide-border">
                        <li className="px-4 py-1.5 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Company</span>
                            <span className="text-foreground font-medium">{opp.company}</span>
                        </li>
                        <li className="px-4 py-1.5 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Est value</span>
                            <span className="text-foreground font-medium tabular-nums">${(opp.estValueUSD / 1_000).toFixed(0)}k</span>
                        </li>
                        <li className="px-4 py-1.5 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Vertical</span>
                            <span className="text-foreground font-medium">{opp.vertical} · refresh</span>
                        </li>
                        <li className="px-4 py-1.5 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Market</span>
                            <span className="text-foreground font-medium">{opp.market} office · 4th floor · 21.8k sf</span>
                        </li>
                        <li className="px-4 py-1.5 flex items-center justify-between text-[11px]">
                            <span className="text-muted-foreground">Source</span>
                            <span className="text-foreground font-medium">Caitlin Barolet (referred via Hayes Construction GC)</span>
                        </li>
                    </ul>
                </div>

                {/* 3 · SLA gates · expedited if priority */}
                <div className={`rounded-xl border overflow-hidden ${isPriority ? 'border-warning/40 bg-warning/5' : 'border-info/30 bg-info/5'}`}>
                    <div className={`px-4 py-2.5 border-b flex items-center gap-2 ${isPriority ? 'border-warning/30' : 'border-info/20'}`}>
                        <Clock className={`h-3.5 w-3.5 ${isPriority ? 'text-warning' : 'text-info'}`} aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">SLA gates · auto-tracked</span>
                        {isPriority && (
                            <span className="ml-auto inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider rounded border bg-warning/15 text-warning border-warning/30 px-1.5 py-0.5">
                                <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" /> Expedited
                            </span>
                        )}
                    </div>
                    <div className="px-4 py-3 grid grid-cols-2 gap-2">
                        <div className="rounded-md border border-border bg-card p-2.5 text-center">
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Qualify</div>
                            <div className="text-[18px] font-bold text-foreground tabular-nums mt-0.5">{qualifyHours}h</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">starts on accept</div>
                        </div>
                        <div className="rounded-md border border-border bg-card p-2.5 text-center">
                            <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Proposal</div>
                            <div className="text-[18px] font-bold text-foreground tabular-nums mt-0.5">{proposalHours}h</div>
                            <div className="text-[9px] text-muted-foreground mt-0.5">starts on qualify</div>
                        </div>
                    </div>
                    <div className="px-4 pb-3 text-[11px] text-muted-foreground italic">
                        Auto-escalates to Sales Manager if breached · system-tracked via Copper event feed.
                    </div>
                </div>

                {/* 4 · Suggested first-touch */}
                <div className="rounded-xl border border-ai/30 bg-ai/5 overflow-hidden">
                    <div className="px-4 py-2.5 bg-card border-b border-ai/20 flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-ai" aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Suggested first-touch</span>
                    </div>
                    <ul className="divide-y divide-ai/20 bg-card">
                        <li className="px-4 py-2.5 flex items-center gap-2 text-[11px]">
                            <Mail className="h-3.5 w-3.5 text-foreground shrink-0" aria-hidden="true" />
                            <span className="flex-1 text-foreground">Strata drafted an intro email · ready to send to Caitlin</span>
                            <button
                                type="button"
                                className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[10px] font-semibold bg-card border border-border text-foreground hover:bg-muted transition-colors"
                            >
                                Review draft
                            </button>
                        </li>
                        <li className="px-4 py-2.5 flex items-center gap-2 text-[11px]">
                            <Calendar className="h-3.5 w-3.5 text-foreground shrink-0" aria-hidden="true" />
                            <span className="flex-1 text-foreground">Suggested calendar slot · Tue 2 PM ET (Caitlin's typical free window)</span>
                            <button
                                type="button"
                                className="shrink-0 inline-flex items-center gap-1 h-7 px-2.5 rounded-md text-[10px] font-semibold bg-card border border-border text-foreground hover:bg-muted transition-colors"
                            >
                                Open calendar
                            </button>
                        </li>
                    </ul>
                </div>

                <SalesSourceCite source="BPMN PP S7 · process orchestrator gate · Strata briefs the rep + starts SLA timers · auto-escalates if breached" />
            </div>
            <SalesStickyCTA
                label="Accept assignment · start qualification"
                onClick={onValidate}
                secondaryNote={isPriority
                    ? `Priority opp · expedited ${qualifyHours}h/${proposalHours}h SLA · auto-escalates to Sales Manager if breached.`
                    : `${qualifyHours}h qualify / ${proposalHours}h proposal SLA starts on accept · auto-escalates if breached.`
                }
            />
        </>
    )
}

// Briefing chip · used in the sc-S.3 handoff "Why you were picked" row.
function BriefingChip({ icon, label, detail, warn, neutralIfEmpty }: {
    icon: React.ReactNode
    label: string
    detail: string
    warn?: boolean
    neutralIfEmpty?: boolean
}) {
    const cls = warn ? 'border-warning/30 bg-warning/5'
              : neutralIfEmpty ? 'border-border bg-muted/30'
              : 'border-success/30 bg-success/5'
    const iconCls = warn ? 'text-warning'
                  : neutralIfEmpty ? 'text-muted-foreground'
                  : 'text-success'
    return (
        <div className={`rounded-md border p-2 ${cls}`}>
            <div className={`flex items-center gap-1 text-[9px] uppercase tracking-wider font-bold ${iconCls}`}>
                {icon}
                <span>{label}</span>
            </div>
            <div className="text-[10px] text-foreground mt-1 leading-tight">{detail}</div>
        </div>
    )
}

// ─── sc-S.4 · Discovery & Qualification ─────────────────────────────────────
// Each row is editable (pencil → input + 3-pill confidence selector). Below
// the MEDDIC card, when fields are still missing, a clarification action card
// surfaces 2 buttons that open the shared EmailDraftModal with pre-drafted
// emails: one to the client (PP5 send-as-rep pattern), one to the Sales
// Manager (PP7 escalation pattern).
function SalesDiscoveryPanel({ onValidate }: LDPanelProps) {
    const bant = SALES_DISCOVERY_TEMPLATE.filter(f => f.framework === 'BANT')
    const meddic = SALES_DISCOVERY_TEMPLATE.filter(f => f.framework === 'MEDDIC')

    // Local edits state · maps field key → { value, confidence }
    const [edits, setEdits] = useState<Record<string, DiscoveryEdit>>({})
    const handleEdit = (key: string, value: string, confidence: DiscoveryConfidence) => {
        setEdits(prev => ({ ...prev, [key]: { value, confidence } }))
    }

    // Effective missing list considers edits (rep may have filled an originally missing field)
    const missing = SALES_DISCOVERY_TEMPLATE.filter(f => {
        const effectiveValue = edits[f.key]?.value ?? f.value ?? ''
        return effectiveValue.trim().length === 0
    })

    // Clarification modal state · 2 paths (client | manager)
    const [emailModal, setEmailModal] = useState<null | 'client' | 'manager'>(null)

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                <SalesPanelHero
                    stage="sales-discovery"
                    title="Discovery & qualification checklist"
                    subtitle={`Strata auto-summarized the 7-message thread into BANT + MEDDIC · ${missing.length} field${missing.length === 1 ? '' : 's'} missing`}
                />

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <ClipboardCheck className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">BANT · qualification</span>
                    </div>
                    <ul className="divide-y divide-border">
                        {bant.map(f => (
                            <DiscoveryRow key={f.key} field={f} edits={edits} onEdit={handleEdit} />
                        ))}
                    </ul>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Target className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">MEDDIC · enterprise qualification</span>
                        {missing.length > 0 && (
                            <span className="ml-auto inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-warning/10 text-warning border border-warning/20">
                                {missing.length} missing
                            </span>
                        )}
                    </div>
                    <ul className="divide-y divide-border">
                        {meddic.map(f => (
                            <DiscoveryRow key={f.key} field={f} edits={edits} onEdit={handleEdit} />
                        ))}
                    </ul>
                </div>

                {/* Resolve missing fields card · 2 clarification actions */}
                {missing.length > 0 && (
                    <div className="rounded-xl border border-warning/30 bg-warning/5 overflow-hidden">
                        <div className="px-4 py-2.5 bg-card border-b border-warning/20 flex items-center gap-2">
                            <AlertCircle className="h-3.5 w-3.5 text-warning" aria-hidden="true" />
                            <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">
                                Resolve missing fields · {missing.length} blocking proposal
                            </span>
                        </div>
                        <ul className="px-4 py-2 text-[11px] text-foreground space-y-0.5">
                            {missing.map(f => (
                                <li key={f.key}>· {f.label}</li>
                            ))}
                        </ul>
                        <div className="px-4 py-2.5 bg-card border-t border-warning/20 flex flex-wrap gap-2">
                            <button
                                type="button"
                                onClick={() => setEmailModal('client')}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                            >
                                <Mail className="h-3 w-3" aria-hidden="true" />
                                Request from client
                            </button>
                            <button
                                type="button"
                                onClick={() => setEmailModal('manager')}
                                className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-bold bg-card border border-border text-foreground hover:bg-muted transition-colors"
                            >
                                <Users className="h-3 w-3" aria-hidden="true" />
                                Escalate to manager
                            </button>
                        </div>
                        <div className="px-4 pb-2.5 text-[10px] text-muted-foreground italic">
                            Drafts only · BPMN PP S3 (send-as-rep) + PP S7 (orchestrator escalation) · rep reviews and sends.
                        </div>
                    </div>
                )}

                <SalesSourceCite source={`PP S2 (BPMN) · salesperson guessing → 2-4 design revisions · ${SALES_VOLUME_FACTS.worksFormIncompletePctMin}-${SALES_VOLUME_FACTS.worksFormIncompletePctMax}% Works forms incomplete`} />
            </div>
            <SalesStickyCTA
                label="Save discovery · proceed to outreach"
                onClick={onValidate}
                secondaryNote={missing.length > 0 ? `${missing.length} field${missing.length === 1 ? '' : 's'} will be flagged on next sync · queue follow-up` : 'All fields captured'}
            />

            {/* Client clarification email · sc-S.4 PP5 pattern */}
            <EmailDraftModal
                isOpen={emailModal === 'client'}
                onClose={() => setEmailModal(null)}
                onSent={() => setEmailModal(null)}
                to={SALES_DISCOVERY_CLIENT_CLARIFICATION_DRAFT.to}
                subject={SALES_DISCOVERY_CLIENT_CLARIFICATION_DRAFT.subject}
                body={SALES_DISCOVERY_CLIENT_CLARIFICATION_DRAFT.body}
            />

            {/* Manager escalation email · sc-S.4 PP7 pattern */}
            <EmailDraftModal
                isOpen={emailModal === 'manager'}
                onClose={() => setEmailModal(null)}
                onSent={() => setEmailModal(null)}
                to={SALES_DISCOVERY_MANAGER_ESCALATION_DRAFT.to}
                subject={SALES_DISCOVERY_MANAGER_ESCALATION_DRAFT.subject}
                body={SALES_DISCOVERY_MANAGER_ESCALATION_DRAFT.body}
            />
        </>
    )
}

type DiscoveryConfidence = 'high' | 'medium' | 'low'
type DiscoveryEdit = { value: string; confidence: DiscoveryConfidence }

function confidenceChipClass(c: DiscoveryConfidence) {
    return c === 'high'   ? 'bg-success/10 text-success border border-success/20' :
           c === 'medium' ? 'bg-warning/10 text-warning border border-warning/20' :
                            'bg-muted text-muted-foreground border border-border'
}

function DiscoveryRow({
    field,
    edits,
    onEdit,
}: {
    field: typeof SALES_DISCOVERY_TEMPLATE[number]
    edits: Record<string, DiscoveryEdit>
    onEdit: (key: string, value: string, confidence: DiscoveryConfidence) => void
}) {
    const edit = edits[field.key]
    const effectiveValue = edit?.value ?? field.value ?? ''
    const effectiveConfidence = edit?.confidence ?? (field.confidence as DiscoveryConfidence | undefined) ?? 'medium'
    const present = Boolean(effectiveValue)
    const wasEdited = edit !== undefined

    const [isEditing, setIsEditing] = useState(false)
    const [draftValue, setDraftValue] = useState<string>(effectiveValue)
    const [draftConfidence, setDraftConfidence] = useState<DiscoveryConfidence>(effectiveConfidence)

    const startEdit = () => {
        setDraftValue(effectiveValue)
        setDraftConfidence(effectiveConfidence)
        setIsEditing(true)
    }
    const saveEdit = () => {
        if (draftValue.trim().length === 0) return    // don't save empty
        onEdit(field.key, draftValue.trim(), draftConfidence)
        setIsEditing(false)
    }
    const cancelEdit = () => setIsEditing(false)

    if (isEditing) {
        return (
            <li className="px-4 py-2.5 text-[11px]">
                <div className="flex items-start gap-3">
                    <span className="text-muted-foreground w-28 shrink-0 pt-1">{field.label}</span>
                    <div className="flex-1 space-y-1.5 min-w-0">
                        <input
                            type="text"
                            value={draftValue}
                            onChange={e => setDraftValue(e.target.value)}
                            placeholder="Add value..."
                            className="w-full rounded border border-ai/40 bg-card text-foreground text-[11px] px-2 py-1 focus:outline-none focus:ring-1 focus:ring-ai/40"
                            autoFocus
                        />
                        <div className="flex items-center gap-1">
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mr-1">Confidence:</span>
                            {(['high', 'medium', 'low'] as DiscoveryConfidence[]).map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setDraftConfidence(c)}
                                    className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 border transition-colors ${
                                        draftConfidence === c
                                            ? confidenceChipClass(c)
                                            : 'bg-card text-muted-foreground border-border hover:border-foreground/30'
                                    }`}
                                >
                                    {c}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex flex-col gap-1 shrink-0">
                        <button type="button" onClick={saveEdit} className="inline-flex items-center justify-center h-6 w-6 rounded bg-success/15 text-success hover:bg-success/25 transition-colors" aria-label="Save">
                            <Check className="h-3 w-3" aria-hidden="true" />
                        </button>
                        <button type="button" onClick={cancelEdit} className="inline-flex items-center justify-center h-6 w-6 rounded bg-muted text-muted-foreground hover:bg-muted/70 transition-colors" aria-label="Cancel">
                            <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                    </div>
                </div>
            </li>
        )
    }

    return (
        <li className="group px-4 py-2 text-[11px]">
            <div className="flex items-start gap-3">
                <span className="text-muted-foreground w-28 shrink-0">{field.label}</span>
                {present ? (
                    <>
                        <span className="text-foreground flex-1">{effectiveValue}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider rounded px-1.5 py-0.5 shrink-0 ${confidenceChipClass(effectiveConfidence)}`}>
                            {effectiveConfidence}
                        </span>
                    </>
                ) : (
                    <span className="flex-1 inline-flex items-center gap-1 text-warning italic">
                        <AlertCircle className="h-3 w-3" aria-hidden="true" />
                        missing · click to add
                    </span>
                )}
                <button
                    type="button"
                    onClick={startEdit}
                    className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    aria-label={`Edit ${field.label}`}
                >
                    <Pencil className="h-3 w-3" aria-hidden="true" />
                </button>
            </div>
            {wasEdited && (
                <div className="ml-[7.25rem] mt-0.5 text-[10px] text-muted-foreground italic">
                    Edited · was &quot;{field.value ?? 'missing'}&quot;{field.confidence ? ` (${field.confidence})` : ''}
                </div>
            )}
        </li>
    )
}

// ─── sc-S.5 · Multi-Channel Outreach Draft ──────────────────────────────────
function SalesOutreachPanel({ onValidate }: LDPanelProps) {
    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                <SalesPanelHero
                    stage="sales-outreach"
                    title="Multi-channel outreach draft"
                    subtitle="Email · Teams · SMS · drafts only · Sales Lead reviews and confirms each send"
                />

                <ChannelTabsComposer drafts={SALES_OUTREACH_DRAFTS} />

                <SalesSourceCite source="PP S9 (BPMN) · multi-channel chaos · same request via 3 channels · Karen ~52:00" />
            </div>
            <SalesStickyCTA
                label="Queue drafts · proceed to proposal"
                onClick={onValidate}
                secondaryNote="CLAUDE.md rule · Strata never auto-sends · every send confirmed by the rep."
            />
        </>
    )
}

// ─── New component · ChannelTabsComposer ────────────────────────────────────
function ChannelTabsComposer({ drafts }: { drafts: readonly typeof SALES_OUTREACH_DRAFTS[number][] }) {
    const [active, setActive] = useState(0)
    const draft = drafts[active]

    return (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-1 px-2 py-2 bg-muted/30 border-b border-border">
                {drafts.map((d, i) => (
                    <button
                        key={i}
                        type="button"
                        onClick={() => setActive(i)}
                        className={`flex-1 px-3 py-1.5 rounded text-[11px] font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                            active === i ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                        }`}
                    >
                        <ChannelIcon channel={d.channel} />
                        <span>{d.label}</span>
                        {d.suggestedAsChannelOfRecord && (
                            <span className="ml-1 inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded px-1 py-0.5 bg-ai/10 text-ai border border-ai/20">
                                Suggested
                            </span>
                        )}
                    </button>
                ))}
            </div>
            <div className="p-4 space-y-2">
                <div className="text-[11px] text-foreground font-medium">{draft.subjectOrPreview}</div>
                <div className="space-y-1.5 text-[11px] text-foreground leading-relaxed">
                    {draft.body.map((line, i) => (
                        line === '' ? <div key={i} className="h-2" /> : <p key={i}>{line}</p>
                    ))}
                </div>
                {draft.attachments && draft.attachments.length > 0 && (
                    <div className="pt-2 border-t border-border flex items-center gap-2 text-[10px] text-muted-foreground">
                        <Paperclip className="h-3 w-3" aria-hidden="true" />
                        {draft.attachments.join(' · ')}
                    </div>
                )}
            </div>
        </div>
    )
}

// ─── sc-S.6 · Proposal Assembly ─────────────────────────────────────────────
function SalesProposalPanel({ onValidate }: LDPanelProps) {
    const subtotal = SALES_PROPOSAL_LINE_ITEMS.reduce((acc, l) => acc + l.qty * l.unitPriceUSD, 0)
    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                <SalesPanelHero
                    stage="sales-proposal"
                    title="Proposal assembly · BOM + labor + pricing"
                    subtitle={`${SALES_PROPOSAL_META.quotePDFFile} · ${SALES_PROPOSAL_LINE_ITEMS.length} lines · GSA SQ price-protected`}
                />

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <FileText className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Pulled inputs</span>
                    </div>
                    <ul className="divide-y divide-border text-[11px]">
                        <li className="px-4 py-2 flex items-center gap-3">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                            <span className="flex-1">Spec Check BOM · 71 lines · $1,541,392 list</span>
                            <span className="text-[10px] text-muted-foreground italic">sc1.7 output</span>
                        </li>
                        <li className="px-4 py-2 flex items-center gap-3">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                            <span className="flex-1">L&D labor quote · TriState · $20,900 + 18% margin</span>
                            <span className="text-[10px] text-muted-foreground italic">sc-LD.7 output</span>
                        </li>
                        <li className="px-4 py-2 flex items-center gap-3">
                            <CheckCircle2 className="h-3.5 w-3.5 text-success" aria-hidden="true" />
                            <span className="flex-1">NetSuite catalog · GSA SQ #436533 · 2025</span>
                            <span className="text-[10px] text-muted-foreground italic">read-only mock</span>
                        </li>
                    </ul>
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <DollarSign className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Quote totals</span>
                    </div>
                    <ul className="divide-y divide-border text-[11px]">
                        <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">List subtotal</span><span className="text-foreground tabular-nums">${subtotal.toLocaleString()}</span></li>
                        <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">GSA discount</span><span className="text-foreground tabular-nums">{SALES_PROPOSAL_META.gsaDiscountPct}% off</span></li>
                        <li className="px-4 py-2 flex items-center justify-between bg-muted/20"><span className="text-muted-foreground">Net to client</span><span className="text-success font-bold tabular-nums">${SALES_PROPOSAL_META.netToClientUSD.toLocaleString()}</span></li>
                        <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">GC portal due</span><span className="text-foreground tabular-nums">{SALES_PROPOSAL_META.gcQuoteDueAt}</span></li>
                    </ul>
                </div>

                <SalesSourceCite source={SALES_PROPOSAL_META.quoteSource} />
            </div>
            <SalesStickyCTA
                label="Approve proposal · queue email + portal upload"
                onClick={onValidate}
                secondaryNote="Today this assembly is ~6h in stops-and-starts · with Strata it's a review pass."
            />
        </>
    )
}

// ─── sc-S.7 · Close + Handoff ───────────────────────────────────────────────
function SalesHandoffPanel({ onValidate }: LDPanelProps) {
    const [outcome, setOutcome] = useState<'won' | 'lost' | 'pending'>('won')
    const [route, setRoute] = useState<string>('route-furn')

    return (
        <>
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-sm">
                <SalesPanelHero
                    stage="sales-handoff"
                    title="Close + auto-handoff to Ops"
                    subtitle="Mark win/loss · Strata builds the packet · routes to Spec Check or L&D"
                />

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Award className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Outcome</span>
                    </div>
                    <div className="p-2 grid grid-cols-3 gap-2">
                        {(['won', 'pending', 'lost'] as const).map(o => (
                            <button
                                key={o}
                                type="button"
                                onClick={() => setOutcome(o)}
                                className={`px-3 py-2 rounded-md text-[11px] font-bold uppercase tracking-wider transition-colors border ${
                                    outcome === o
                                        ? (o === 'won' ? 'bg-success/10 text-success border-success/30' :
                                           o === 'lost' ? 'bg-destructive/10 text-destructive border-destructive/30' :
                                                           'bg-warning/10 text-warning border-warning/30')
                                        : 'bg-muted/20 text-muted-foreground border-border hover:bg-muted/40'
                                }`}
                            >
                                {o}
                            </button>
                        ))}
                    </div>
                </div>

                {outcome === 'won' && (
                    <>
                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                                <TrendingUp className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Route handoff</span>
                            </div>
                            <ul className="divide-y divide-border">
                                {SALES_HANDOFF_ROUTES.map(r => (
                                    <li key={r.id}>
                                        <label className={`px-4 py-2.5 flex items-start gap-3 cursor-pointer transition-colors ${route === r.id ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
                                            <input
                                                type="radio"
                                                name="route"
                                                checked={route === r.id}
                                                onChange={() => setRoute(r.id)}
                                                className="mt-1"
                                            />
                                            <div className="flex-1 min-w-0">
                                                <div className="text-[12px] font-bold text-foreground">{r.label}</div>
                                                <div className="text-[10px] text-muted-foreground mt-0.5">Triggers · {r.flowsTriggered.length === 0 ? 'no downstream flow (direct to coordinator)' : r.flowsTriggered.join(' · ')}</div>
                                            </div>
                                        </label>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="rounded-xl border border-border bg-card overflow-hidden">
                            <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                                <ClipboardCheck className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">Handoff packet · auto-built</span>
                            </div>
                            <ul className="divide-y divide-border">
                                {SALES_HANDOFF_PACKET.map(f => (
                                    <li key={f.label} className="px-4 py-2 flex items-start gap-3 text-[11px]">
                                        <span className="text-muted-foreground w-32 shrink-0">{f.label}</span>
                                        <span className="text-foreground flex-1">{f.value}</span>
                                        <span className="text-[9px] text-muted-foreground italic shrink-0">{f.source}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </>
                )}

                <SalesSourceCite source="PP S7 (BPMN) · post-award = 2 manual steps · coordinator NetSuite step routinely missed" />
            </div>
            <SalesStickyCTA
                label="Finish · trigger downstream flows · return to dashboard"
                onClick={onValidate}
                secondaryNote="Strata never auto-creates the NetSuite SO · the Sales Coordinator gets the prefilled task."
            />
        </>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// SALES DOC PREVIEWS · 11 components for the modal left-panel
// ═══════════════════════════════════════════════════════════════════════════════

// ─── sales-inbox-feed ───────────────────────────────────────────────────────
function SalesInboxFeedPreview() {
    return (
        <SalesPreviewShell icon={Inbox} filename="unified-inbox-feed.json" size="—" statusBadge={{ label: `${SALES_INBOX_THREADS.length} threads`, tone: 'info' }}>
            <div className="text-[11px] text-muted-foreground">
                Multi-channel feed · email + Teams + portal · classified, deduped and scored by Strata.
            </div>
            <UnifiedInboxFeed threads={SALES_INBOX_THREADS} />
        </SalesPreviewShell>
    )
}

// ─── sales-thread-detail ────────────────────────────────────────────────────
function SalesThreadDetailPreview() {
    // Reactive to selectedThreadId · changes when the user clicks Review on a
    // different card in the right panel's UnifiedInboxFeed.
    const selectedId = useSelectedThread()
    const t = useMemo(
        () => SALES_INBOX_THREADS.find(x => x.id === selectedId) ?? SALES_INBOX_THREADS[0],
        [selectedId],
    )

    const urgencyBorder = t.urgency === 'high' ? 'border-l-4 border-l-destructive'
                       : t.urgency === 'med'  ? 'border-l-4 border-l-warning'
                       : ''

    return (
        <SalesPreviewShell
            icon={Mail}
            filename={`thread-${t.id}.eml`}
            size="14 KB"
            statusBadge={{
                label: t.intent,
                tone: t.intent === 'urgent' ? 'danger' : t.intent === 'action' ? 'warning' : 'neutral',
            }}
        >
            {/* Email header + body · urgency shown via border-l color bar + SalesPreviewShell status badge */}
            <div className={`rounded-xl border border-border bg-card overflow-hidden ${urgencyBorder}`}>
                <div className="px-4 py-3 bg-muted/30 border-b border-border space-y-1">
                    <div className="grid grid-cols-[60px_1fr] gap-2 text-[11px]">
                        <span className="text-muted-foreground">Channel</span>
                        <span className="text-foreground inline-flex items-center gap-1"><ChannelIcon channel={t.channel} /> {t.channel}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-2 text-[11px]">
                        <span className="text-muted-foreground">From</span>
                        <span className="text-foreground"><strong>{t.from}</strong> · {t.fromOrg}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-2 text-[11px]">
                        <span className="text-muted-foreground">Subject</span>
                        <span className="text-foreground font-medium">{t.subject}</span>
                    </div>
                    <div className="grid grid-cols-[60px_1fr] gap-2 text-[10px] text-muted-foreground tabular-nums">
                        <span>Received</span>
                        <span>{t.receivedAt}</span>
                    </div>
                </div>
                <div className="px-4 py-3 space-y-2 text-[12px] text-foreground leading-relaxed">
                    {t.snippet}
                </div>
            </div>

            {/* Attachments */}
            {t.attachments && t.attachments.length > 0 && (
                <div className="rounded-xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                        <Paperclip className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                            Attachments · {t.attachments.length}
                        </span>
                    </div>
                    <ul className="divide-y divide-border">
                        {t.attachments.map(att => (
                            <li key={att.filename} className="px-4 py-2 flex items-center gap-3 text-[11px]">
                                <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" aria-hidden="true" />
                                <span className="text-foreground flex-1 truncate">{att.filename}</span>
                                <span className="text-muted-foreground tabular-nums shrink-0">{att.size}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Topic chips */}
            {t.topics && t.topics.length > 0 && (
                <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1.5">Topics</div>
                    <div className="flex flex-wrap gap-1.5">
                        {t.topics.map(topic => (
                            <span key={topic} className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-0.5 bg-info/10 text-info border border-info/20">
                                {topic}
                            </span>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-lg border border-ai/30 bg-ai/5 px-3 py-2 text-[11px] text-foreground flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-ai shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                    <strong>Strata extracted</strong> · opportunity match · intent · urgency score · saved to Sales Lead queue.
                </div>
            </div>
        </SalesPreviewShell>
    )
}

// ─── sales-opp-record ───────────────────────────────────────────────────────
// Phase-aware. At stage `sales-intake` it routes between:
//   source-pick → SalesSourcePickerView (2 cards)
//   processing  → SalesProcessingView (cascade animation)
//   refining/saving → DRAFT opp record with editable provenance fields
// At any other stage (sales-capacity, sales-discovery) it renders the original
// "advanced" mock view (Stage 75% etc.) untouched.
function SalesOppRecordPreview({ stage }: { stage: OfficeworksReviewStage }) {
    const phase = useIntakePhase()
    const opp = SALES_OPPORTUNITIES[0]

    if (stage === 'sales-intake') {
        if (phase === 'source-pick') return <SalesSourcePickerView />
        if (phase === 'processing')  return <SalesProcessingView />
        // refining | saving · DRAFT opp record with editable provenance
        return <SalesOppRecordDraftView phase={phase} />
    }

    // Default view for sales-capacity, sales-discovery · advanced mock state.
    return (
        <SalesPreviewShell icon={FileText} filename={`opp-${opp.projectCode}.json`} size="6 KB" statusBadge={{ label: `Stage ${opp.copperStage}%`, tone: 'info' }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Opportunity record (Copper read-only mock)</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">{opp.company}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">{opp.projectCode} · {opp.vertical} · {opp.market}</div>
                </div>
                <ul className="divide-y divide-border">
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Est value</span><span className="text-foreground font-bold tabular-nums">${opp.estValueUSD.toLocaleString()}</span></li>
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Copper stage</span><span className="text-foreground">{opp.copperStage}%</span></li>
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Account type</span><span className="text-foreground">{opp.accountType}</span></li>
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Days in stage</span><span className="text-foreground tabular-nums">{opp.daysInStage}</span></li>
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Spec attached</span><span className="text-foreground">{opp.specAttached ? 'yes' : 'no'}</span></li>
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Works form</span><span className="text-foreground">{opp.worksFormComplete ? 'complete' : 'incomplete · 3 fields'}</span></li>
                    {opp.slaDeadline && (
                        <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">SLA deadline</span><span className="text-foreground tabular-nums">{opp.slaDeadline}</span></li>
                    )}
                </ul>
            </div>
        </SalesPreviewShell>
    )
}

// ─── sc-S.1 · Phase 1A · Source picker (left panel) · compact side-by-side ──
function SalesSourcePickerView() {
    const handlePick = (id: 'link-copper' | 'upload-pdf') => {
        writeIntakeSource(id)
        writeIntakePhase('processing')
    }
    return (
        <SalesPreviewShell icon={Inbox} filename="intake-source-picker" statusBadge={{ label: 'Pick source', tone: 'info' }}>
            <div className="rounded-lg border border-ai/30 bg-ai/5 px-3 py-2 flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-ai shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-[11px] text-foreground leading-snug">
                    <span className="font-bold text-ai">Strata · </span>
                    Pick a source to draft the opp record.
                </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
                {SALES_INTAKE_SOURCES.map(src => (
                    <SalesSourceCard key={src.id} src={src} onPick={handlePick} />
                ))}
            </div>
        </SalesPreviewShell>
    )
}

function SalesSourceCard({ src, onPick }: { src: IntakeSourceCard; onPick: (id: 'link-copper' | 'upload-pdf') => void }) {
    const Icon = src.iconKind === 'database' ? Database : FileText
    const isRecommended = src.confidence === 'recommended'
    const ringClass = isRecommended ? 'border-ai/40 ring-1 ring-ai/20' : 'border-border'

    // Link card · pre-filled URL input. Editable for demo confidence.
    const [linkUrl, setLinkUrl] = useState(src.demoUrl ?? '')

    // PDF card · 3-phase mini state machine.
    type PdfPhase = 'empty' | 'uploading' | 'ready'
    const [pdfPhase, setPdfPhase] = useState<PdfPhase>('empty')

    const handleDropzoneClick = () => {
        if (pdfPhase !== 'empty') return
        setPdfPhase('uploading')
        setTimeout(() => setPdfPhase('ready'), 500)
    }
    const handleRemovePdf = () => setPdfPhase('empty')

    const linkProcessDisabled = linkUrl.trim().length === 0
    const pdfProcessDisabled = pdfPhase !== 'ready'
    const ctaDisabled = src.id === 'link-copper' ? linkProcessDisabled : pdfProcessDisabled

    return (
        <div className={`rounded-lg border ${ringClass} bg-card overflow-hidden flex flex-col`}>
            {/* Compact header · icon + label + confidence chip */}
            <div className="px-3 py-2.5 border-b border-border flex items-center gap-2">
                <div className={`h-7 w-7 rounded-md flex items-center justify-center shrink-0 ${isRecommended ? 'bg-ai/10' : 'bg-muted'}`}>
                    <Icon className={`h-3.5 w-3.5 ${isRecommended ? 'text-ai' : 'text-foreground'}`} aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-[12px] font-bold text-foreground truncate">{src.label}</div>
                </div>
                <span className={`shrink-0 inline-flex items-center text-[9px] font-bold uppercase tracking-wider rounded border px-1.5 py-0.5 ${
                    isRecommended ? 'bg-ai/10 text-ai border-ai/30' : 'bg-muted text-muted-foreground border-border'
                }`}>
                    {isRecommended ? 'Reco' : 'Possible'}
                </span>
            </div>

            {/* Match · 1-liner only when Strata found something */}
            {src.matchTone === 'success' && (
                <div className="px-3 py-1.5 border-b border-success/20 bg-success/5 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-success shrink-0" aria-hidden="true" />
                    <span className="text-[10px] font-semibold text-foreground truncate">{src.matchLabel}</span>
                </div>
            )}

            {/* Interaction widget · per-source */}
            <div className="px-3 py-3 flex-1">
                {src.id === 'link-copper' && (
                    <div className="space-y-1.5">
                        <label className="block text-[9px] font-bold uppercase tracking-wider text-muted-foreground">Copper URL</label>
                        <div className="relative">
                            <Database className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" aria-hidden="true" />
                            <input
                                type="text"
                                value={linkUrl}
                                onChange={e => setLinkUrl(e.target.value)}
                                placeholder="https://app.copper.com/..."
                                className="w-full pl-7 pr-2 py-1.5 rounded border border-border bg-card text-foreground text-[10px] focus:outline-none focus:ring-1 focus:ring-ai/40 focus:border-ai/40"
                            />
                        </div>
                        <p className="text-[9px] text-muted-foreground italic">Pre-filled for demo</p>
                    </div>
                )}
                {src.id === 'upload-pdf' && (
                    <>
                        {pdfPhase === 'empty' && (
                            <button
                                type="button"
                                onClick={handleDropzoneClick}
                                className="w-full h-full min-h-[100px] rounded-md border-2 border-dashed border-border bg-muted/20 hover:bg-muted/40 hover:border-ai/40 transition-colors p-3 flex flex-col items-center justify-center gap-1 cursor-pointer"
                                aria-label="Click to upload demo PDF"
                            >
                                <Upload className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                <span className="text-[10px] font-semibold text-foreground text-center leading-snug">Drop PDF · or click for demo file</span>
                                <span className="text-[9px] text-muted-foreground">Up to 25 MB</span>
                            </button>
                        )}
                        {pdfPhase === 'uploading' && (
                            <div className="w-full min-h-[100px] rounded-md border-2 border-dashed border-ai/40 bg-ai/5 p-3 flex items-center gap-2">
                                <Loader2 className="h-3.5 w-3.5 text-ai animate-spin shrink-0" aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-semibold text-foreground truncate">{src.demoFile?.name}</div>
                                    <div className="text-[9px] text-muted-foreground">Uploading · {src.demoFile?.size}</div>
                                </div>
                            </div>
                        )}
                        {pdfPhase === 'ready' && (
                            <div className="w-full min-h-[100px] rounded-md border-2 border-success/40 bg-success/5 p-3 flex items-center gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" aria-hidden="true" />
                                <div className="flex-1 min-w-0">
                                    <div className="text-[10px] font-semibold text-foreground truncate">{src.demoFile?.name}</div>
                                    <div className="text-[9px] text-muted-foreground">Ready · {src.demoFile?.size}</div>
                                </div>
                                <button
                                    type="button"
                                    onClick={handleRemovePdf}
                                    className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                                    aria-label="Remove file"
                                >
                                    <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* CTA · full-width footer */}
            <div className="px-3 pb-3">
                <button
                    type="button"
                    onClick={() => onPick(src.id)}
                    disabled={ctaDisabled}
                    className={`w-full inline-flex items-center justify-center gap-1.5 h-8 rounded-md text-[11px] font-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                        isRecommended
                            ? 'bg-primary text-primary-foreground hover:bg-primary/90 disabled:hover:bg-primary'
                            : 'bg-card border border-primary/40 text-foreground hover:bg-primary/10 disabled:hover:bg-card'
                    }`}
                >
                    {src.ctaLabel} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
            </div>
        </div>
    )
}

// ─── sc-S.1 · Phase 1B · Processing animation (left panel) ──────────────────
function SalesProcessingView() {
    const [stepIdx, setStepIdx] = useState(0)

    useEffect(() => {
        const timers: ReturnType<typeof setTimeout>[] = []
        let cumulative = 0
        SALES_INTAKE_PROCESSING_STEPS.forEach((s, i) => {
            cumulative += s.durationMs
            timers.push(setTimeout(() => {
                if (i < SALES_INTAKE_PROCESSING_STEPS.length - 1) {
                    setStepIdx(i + 1)
                } else {
                    writeIntakePhase('refining')
                }
            }, cumulative))
        })
        return () => timers.forEach(clearTimeout)
    }, [])

    return (
        <SalesPreviewShell icon={Loader2} filename="strata-processing" statusBadge={{ label: 'Processing', tone: 'info' }}>
            <div className="rounded-xl border border-ai/30 bg-ai/5 px-3 py-2.5 flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-ai shrink-0 mt-0.5" aria-hidden="true" />
                <div className="text-[12px] text-foreground leading-relaxed">
                    <span className="font-bold text-ai">Strata AI · </span>
                    Drafting the opp record from picked source. Hold tight · ~1.5s.
                </div>
            </div>
            <ul className="space-y-2">
                {SALES_INTAKE_PROCESSING_STEPS.map((s, i) => {
                    const isActive = i === stepIdx
                    const isDone = i < stepIdx
                    return (
                        <li key={s.label} className={`rounded-xl border bg-card p-3 flex items-start gap-3 transition-colors ${
                            isActive ? 'border-ai/40' : isDone ? 'border-success/30' : 'border-border'
                        }`}>
                            <div className="shrink-0 mt-0.5">
                                {isDone ? (
                                    <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                                ) : isActive ? (
                                    <Loader2 className="h-4 w-4 text-ai animate-spin" aria-hidden="true" />
                                ) : (
                                    <div className="h-4 w-4 rounded-full border border-border" />
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className={`text-[12px] font-semibold ${isDone || isActive ? 'text-foreground' : 'text-muted-foreground'}`}>{s.label}</div>
                                <div className="text-[10px] text-muted-foreground mt-0.5 italic">{s.detail}</div>
                            </div>
                        </li>
                    )
                })}
            </ul>
        </SalesPreviewShell>
    )
}

// ─── sc-S.1 · Phase 1C/1D · DRAFT opp record with editable provenance ───────
function SalesOppRecordDraftView({ phase }: { phase: 'refining' | 'saving' }) {
    const opp = SALES_OPPORTUNITIES[0]
    const source = useIntakeSource()
    const sourceLabel = source === 'link-copper' ? 'Hayes Construction (Copper)'
                      : source === 'upload-pdf'  ? 'Uploaded PDF'
                      : 'email thread'

    // Inline edits over the 5 provenance fields. Local state only · resets on F5.
    const [edits, setEdits] = useState<Record<string, string>>({})
    const [editingField, setEditingField] = useState<string | null>(null)
    const [draftValue, setDraftValue] = useState<string>('')

    const startEdit = (label: string, current: string) => {
        setEditingField(label)
        setDraftValue(edits[label] ?? current)
    }
    const saveEdit = (label: string, original: string) => {
        if (draftValue.trim() === '' || draftValue === original) {
            setEdits(prev => { const next = { ...prev }; delete next[label]; return next })
        } else {
            setEdits(prev => ({ ...prev, [label]: draftValue }))
        }
        setEditingField(null)
    }
    const cancelEdit = () => setEditingField(null)

    return (
        <SalesPreviewShell
            icon={FileText}
            filename={`opp-${opp.projectCode}.json`}
            size="6 KB"
            statusBadge={{ label: phase === 'saving' ? 'Saving to Copper…' : 'DRAFT · pending save', tone: 'warning' }}
        >
            {phase === 'saving' && (
                <div className="rounded-xl border border-ai/30 bg-ai/5 p-3 flex items-center gap-2">
                    <Loader2 className="h-4 w-4 text-ai animate-spin" aria-hidden="true" />
                    <span className="text-[12px] font-semibold text-foreground">Saving opp record to Copper…</span>
                </div>
            )}

            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                        Opportunity record (Strata draft · awaiting Save)
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                        <span className="text-sm font-bold text-foreground">{edits['Company'] ?? opp.company}</span>
                        <OppPriorityChipMaybe />
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                        {opp.projectCode} · drafted from {sourceLabel}
                    </div>
                </div>
                <ul className="divide-y divide-border">
                    {SALES_OPP_EXTRACTED_SNIPPETS.map(f => {
                        const isEditing = editingField === f.label
                        const current = edits[f.label] ?? f.value
                        const wasEdited = edits[f.label] !== undefined
                        return (
                            <li key={f.label} className="px-4 py-2 text-[11px]">
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground w-24 shrink-0">{f.label}</span>
                                    {isEditing ? (
                                        <>
                                            <input
                                                type="text"
                                                value={draftValue}
                                                onChange={e => setDraftValue(e.target.value)}
                                                className="flex-1 rounded border border-ai/40 bg-card text-foreground text-[11px] px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-ai/40"
                                                autoFocus
                                            />
                                            <button type="button" onClick={() => saveEdit(f.label, f.value)} className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded bg-success/15 text-success hover:bg-success/25 transition-colors" aria-label="Save edit">
                                                <Check className="h-3 w-3" aria-hidden="true" />
                                            </button>
                                            <button type="button" onClick={cancelEdit} className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded bg-muted text-muted-foreground hover:bg-muted/70 transition-colors" aria-label="Cancel edit">
                                                <X className="h-3 w-3" aria-hidden="true" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <span className="text-foreground font-medium flex-1">{current}</span>
                                            <button type="button" onClick={() => startEdit(f.label, f.value)} className="shrink-0 inline-flex items-center justify-center h-6 w-6 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors" aria-label={`Edit ${f.label}`}>
                                                <Pencil className="h-3 w-3" aria-hidden="true" />
                                            </button>
                                        </>
                                    )}
                                </div>
                                {wasEdited && !isEditing && (
                                    <div className="ml-[6.5rem] mt-0.5 text-[10px] text-muted-foreground italic">
                                        Edited · was &quot;{f.value}&quot;
                                    </div>
                                )}
                                {!wasEdited && !isEditing && (
                                    <div className="ml-[6.5rem] mt-0.5 text-[10px] text-muted-foreground italic flex items-center gap-1">
                                        <Sparkles className="h-2.5 w-2.5 text-ai" aria-hidden="true" />
                                        Strata · confidence {f.confidence}
                                    </div>
                                )}
                            </li>
                        )
                    })}
                    {/* Static fields · not editable */}
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Copper stage</span><span className="text-foreground">25% · Actively pursuing</span></li>
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Days in stage</span><span className="text-foreground">0 · today</span></li>
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Spec attached</span><span className="text-foreground">no · PDF floor plan only</span></li>
                    <li className="px-4 py-2 flex items-center justify-between text-[11px]"><span className="text-muted-foreground">Works form</span><span className="text-foreground">incomplete · 4 to clarify</span></li>
                </ul>
            </div>

            <div className="text-[10px] text-muted-foreground italic px-1 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
                Source: drafted by Strata · awaiting Save click to commit to Copper.
            </div>
        </SalesPreviewShell>
    )
}

// ─── sales-capacity-ledger ──────────────────────────────────────────────────
function SalesCapacityLedgerPreview() {
    const selectedId = useAssignedRepId()
    return (
        <SalesPreviewShell icon={Users} filename="capacity-ledger.pdf" size="22 KB" statusBadge={{ label: 'Live · Copper mock', tone: 'info' }}>
            <div className="text-[11px] text-muted-foreground">{SALES_REPS.length} reps · 3 regions · Copper events (read-only mock) · click a rep to see the detail on the right.</div>
            <RepCapacityLedger
                reps={SALES_REPS}
                onSelect={writeAssignedRepId}
                selectedId={selectedId}
            />
        </SalesPreviewShell>
    )
}

// ─── sales-assignment ───────────────────────────────────────────────────────
function SalesAssignmentPreview() {
    const recommended = SALES_REPS[0]
    return (
        <SalesPreviewShell icon={UserCheck} filename="assignment-record.pdf" size="6 KB" statusBadge={{ label: 'SLA · 24h / 48h', tone: 'success' }}>
            <div className="rounded-xl border border-ai/30 bg-ai/5 p-4 space-y-2">
                <div className="flex items-start gap-2">
                    <Sparkles className="h-4 w-4 text-ai shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                        <div className="text-sm font-bold text-foreground">Strata recommends · {recommended.label}</div>
                        <div className="text-[11px] text-muted-foreground mt-0.5">Territory match · {recommended.territory} · {Object.entries(recommended.priorWinsWithAccount).map(([k, v]) => `${k}:${v}`).join(' · ')} · {recommended.quotaProgressPct}% quota</div>
                    </div>
                </div>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">SLA targets</span>
                </div>
                <ul className="divide-y divide-border text-[11px]">
                    <li className="px-4 py-2 flex items-center gap-3">
                        <span className="text-muted-foreground w-32">Qualify by</span>
                        <span className="text-foreground flex-1">24 hours after assignment</span>
                        <SLATimerChip hoursLeft={24} />
                    </li>
                    <li className="px-4 py-2 flex items-center gap-3">
                        <span className="text-muted-foreground w-32">Proposal by</span>
                        <span className="text-foreground flex-1">48 hours after qualify</span>
                        <SLATimerChip hoursLeft={48} />
                    </li>
                    <li className="px-4 py-2 flex items-center gap-3">
                        <span className="text-muted-foreground w-32">Escalation</span>
                        <span className="text-foreground flex-1">Sales Manager auto-notified on breach</span>
                    </li>
                </ul>
            </div>
        </SalesPreviewShell>
    )
}

// ─── sales-discovery-notes ──────────────────────────────────────────────────
function SalesDiscoveryNotesPreview() {
    return (
        <SalesPreviewShell icon={ClipboardCheck} filename="discovery-notes.pdf" size="18 KB" statusBadge={{ label: 'BANT + MEDDIC', tone: 'info' }}>
            <div className="text-[11px] text-muted-foreground">Strata auto-summarized 7-message thread into BANT + MEDDIC.</div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-foreground">BANT</div>
                <ul className="divide-y divide-border">
                    {SALES_DISCOVERY_TEMPLATE.filter(f => f.framework === 'BANT').map(f => (
                        <DiscoveryRow key={f.key} field={f} />
                    ))}
                </ul>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border text-[10px] font-bold uppercase tracking-wider text-foreground">MEDDIC</div>
                <ul className="divide-y divide-border">
                    {SALES_DISCOVERY_TEMPLATE.filter(f => f.framework === 'MEDDIC').map(f => (
                        <DiscoveryRow key={f.key} field={f} />
                    ))}
                </ul>
            </div>
        </SalesPreviewShell>
    )
}

// ─── sales-account-history (sc-S.4 LEFT panel · evidence pack) ──────────────
// Renders prior MANATT engagements + Hayes Construction GC referrer profile +
// Strata account notes. The assigned rep reviews this evidence while filling
// the BANT + MEDDIC checklist on the RIGHT panel · replaces the duplicated
// SalesDiscoveryNotesPreview from v1.
function SalesAccountHistoryPreview() {
    const h = MANATT_ACCOUNT_HISTORY
    const totalPriorValueUSD = h.priorProjects.reduce((s, p) => s + p.valueUSD, 0)
    return (
        <SalesPreviewShell
            icon={Award}
            filename="account-history-manatt.pdf"
            size="14 KB"
            statusBadge={{ label: 'Copper read-only mock', tone: 'info' }}
        >
            <div className="text-[11px] text-muted-foreground">
                Strata pulled the {h.accountName} account history + the {h.referrer.name} referrer profile from Copper · evidence for the discovery checklist on the right.
            </div>

            {/* Prior MANATT engagements */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                    <Briefcase className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground flex-1">
                        {h.accountName} · {h.priorProjects.length} prior wins
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                        ${(totalPriorValueUSD / 1_000_000).toFixed(1)}M total
                    </span>
                </div>
                <ul className="divide-y divide-border">
                    {h.priorProjects.map(p => (
                        <li key={p.code} className="px-4 py-2.5 text-[11px]">
                            <div className="flex items-center justify-between gap-3">
                                <span className="text-foreground font-medium truncate">{p.code} · {p.market} · {p.vertical}</span>
                                <span className="text-muted-foreground tabular-nums shrink-0">
                                    ${(p.valueUSD / 1_000_000).toFixed(p.valueUSD >= 1_000_000 ? 1 : 2)}M · {p.year}
                                </span>
                            </div>
                            <div className="text-[10px] text-muted-foreground mt-0.5 flex items-center gap-1.5">
                                <CheckCircle2 className="h-3 w-3 text-success" aria-hidden="true" />
                                <span>Won · {p.cycleWeeks}-week cycle · contact: {p.contact}</span>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Hayes Construction · GC referrer */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">
                        {h.referrer.name} · {h.referrer.relationship}
                    </span>
                </div>
                <div className="px-4 py-3 grid grid-cols-3 gap-2 text-[11px]">
                    <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block">Routed projects</span>
                        <span className="text-foreground font-bold tabular-nums">{h.referrer.priorRoutedProjects}</span>
                    </div>
                    <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block">Avg cycle</span>
                        <span className="text-foreground font-bold tabular-nums">{h.referrer.avgCycleWeeks}w</span>
                    </div>
                    <div>
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold block">On-time</span>
                        <span className="text-foreground font-bold tabular-nums">{h.referrer.onTimeResponsePct}%</span>
                    </div>
                </div>
                <div className="px-4 pb-3 text-[10px] text-muted-foreground italic">
                    Last engagement · {h.referrer.lastEngagement}
                </div>
            </div>

            {/* Strata account notes */}
            <div className="rounded-lg border border-ai/30 bg-ai/5 px-3 py-2.5 text-[11px] text-foreground flex items-start gap-2">
                <Sparkles className="h-3.5 w-3.5 text-ai shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                    <strong className="text-ai">Strata note · </strong>
                    {h.accountNotes}
                </div>
            </div>
        </SalesPreviewShell>
    )
}

// ─── sales-outreach-draft ───────────────────────────────────────────────────
function SalesOutreachDraftPreview() {
    return (
        <SalesPreviewShell icon={Send} filename="outreach-drafts.pdf" size="12 KB" statusBadge={{ label: 'Drafts · review before send', tone: 'warning' }}>
            <div className="rounded-lg border border-info/30 bg-info/5 px-3 py-2 text-[11px] text-foreground flex items-start gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-info shrink-0 mt-0.5" aria-hidden="true" />
                <div>Strata never auto-sends · Sales Lead confirms each (CLAUDE.md rule).</div>
            </div>
            <ChannelTabsComposer drafts={SALES_OUTREACH_DRAFTS} />
        </SalesPreviewShell>
    )
}

// ─── sales-proposal-pdf ─────────────────────────────────────────────────────
function SalesProposalPDFPreview() {
    return (
        <SalesPreviewShell icon={FileText} filename={SALES_PROPOSAL_META.quotePDFFile} size="248 KB" statusBadge={{ label: 'Cell audit complete', tone: 'success' }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border">
                    <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Officeworks proposal · MANATT 4F</div>
                    <div className="text-sm font-bold text-foreground mt-0.5">{SALES_PROPOSAL_META.quotePDFFile}</div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">CBRE portal · {SALES_PROPOSAL_META.cbrePortalRef} · due {SALES_PROPOSAL_META.gcQuoteDueAt}</div>
                </div>
                <ul className="divide-y divide-border text-[11px]">
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">Sections</span><span className="text-foreground">Cover · Scope · BOM · Labor · Pricing · Terms</span></li>
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">BOM lines</span><span className="text-foreground tabular-nums">{SALES_PROPOSAL_LINE_ITEMS.length}</span></li>
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">Net to client</span><span className="text-success font-bold tabular-nums">${SALES_PROPOSAL_META.netToClientUSD.toLocaleString()}</span></li>
                </ul>
            </div>
            <SalesSourceCite source={SALES_PROPOSAL_META.quoteSource} />
        </SalesPreviewShell>
    )
}

// ─── sales-quote-detail ─────────────────────────────────────────────────────
function SalesQuoteDetailPreview() {
    return (
        <SalesPreviewShell icon={DollarSign} filename="quote-line-items.xlsx" size="42 KB" statusBadge={{ label: 'NetSuite read-only mock', tone: 'info' }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <table className="w-full text-[11px]">
                    <thead className="bg-muted/30">
                        <tr className="text-left">
                            <th className="px-3 py-2 font-semibold text-muted-foreground">SKU</th>
                            <th className="px-3 py-2 font-semibold text-muted-foreground">Description</th>
                            <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Qty</th>
                            <th className="px-3 py-2 font-semibold text-muted-foreground text-right">Unit $</th>
                        </tr>
                    </thead>
                    <tbody>
                        {SALES_PROPOSAL_LINE_ITEMS.map(li => (
                            <tr key={li.sku} className="border-t border-border">
                                <td className="px-3 py-2 text-foreground font-mono text-[10px]">{li.sku}</td>
                                <td className="px-3 py-2 text-foreground">{li.desc}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-foreground">{li.qty}</td>
                                <td className="px-3 py-2 text-right tabular-nums text-foreground">${li.unitPriceUSD.toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <SalesSourceCite source="NetSuite catalog (read-only mock) · GSA SQ #436533 · catalog 2025" />
        </SalesPreviewShell>
    )
}

// ─── sales-win-loss ─────────────────────────────────────────────────────────
function SalesWinLossPreview() {
    return (
        <SalesPreviewShell icon={Target} filename="outcome-record.pdf" size="4 KB" statusBadge={{ label: 'WON', tone: 'success' }}>
            <div className="rounded-xl border border-success/30 bg-success/5 p-4 space-y-2">
                <div className="flex items-start gap-2">
                    <Award className="h-5 w-5 text-success shrink-0 mt-0.5" aria-hidden="true" />
                    <div>
                        <div className="text-sm font-bold text-foreground">MANATT-4F · WON</div>
                        <div className="text-[11px] text-muted-foreground">${SALES_OPPORTUNITIES[0].estValueUSD.toLocaleString()} · 2026-06-12 close · 90 → 100% transition</div>
                    </div>
                </div>
            </div>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <ul className="divide-y divide-border text-[11px]">
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">Won amount</span><span className="text-success font-bold tabular-nums">${SALES_OPPORTUNITIES[0].estValueUSD.toLocaleString()}</span></li>
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">Close date</span><span className="text-foreground tabular-nums">2026-06-12</span></li>
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">Cycle time</span><span className="text-foreground tabular-nums">4.5 months</span></li>
                    <li className="px-4 py-2 flex items-center justify-between"><span className="text-muted-foreground">NetSuite SO</span><span className="text-foreground font-mono">SO-WIP-088421 (to create)</span></li>
                </ul>
            </div>
        </SalesPreviewShell>
    )
}

// ─── sales-handoff-packet ───────────────────────────────────────────────────
function SalesHandoffPacketPreview() {
    return (
        <SalesPreviewShell icon={TrendingUp} filename="handoff-packet.pdf" size="32 KB" statusBadge={{ label: 'Auto-routed', tone: 'success' }}>
            <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 bg-muted/30 border-b border-border flex items-center gap-2">
                    <ClipboardCheck className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-foreground">Packet fields · auto-populated</span>
                </div>
                <ul className="divide-y divide-border">
                    {SALES_HANDOFF_PACKET.map(f => (
                        <li key={f.label} className="px-4 py-2 flex items-start gap-3 text-[11px]">
                            <span className="text-muted-foreground w-32 shrink-0">{f.label}</span>
                            <span className="text-foreground flex-1">{f.value}</span>
                            <span className="text-[9px] text-muted-foreground italic shrink-0">{f.source}</span>
                        </li>
                    ))}
                </ul>
            </div>
            <SalesSourceCite source={`${SALES_ACTOR.role} · ${SALES_ACTOR.territoryLabel}`} />
        </SalesPreviewShell>
    )
}

