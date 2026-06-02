/**
 * COMPONENT: OfficeworksPage + OfficeworksDashboardPage
 *
 * REFACTOR Iter 2: Manager-centric architecture.
 *   - OfficeworksPage renders OfficeworksFunnel as the ALWAYS-visible main view.
 *   - When a demo step is active, OfficeworksDocumentReviewModal opens automatically
 *     on top with stage-adaptive content.
 *   - For 3 hero stages (self-audit, peer-review, ack-review), existing scene
 *     components are passed as `fullContent` to preserve their rich logic.
 *   - For 12 simple stages, modal uses its built-in default panels.
 *
 * OfficeworksDashboardPage: standalone export for the persistent Dashboard navbar tab.
 */

import { useEffect, useState } from 'react'
import { Pencil, LayoutDashboard, ClipboardCheck, Send, Inbox, Truck } from 'lucide-react'
import PageShell from '../shared/PageShell'
import { useDemo } from '../../context/DemoContext'

import OfficeworksFunnel from './OfficeworksFunnel'
import OfficeworksDocumentReviewModal, { type OfficeworksReviewStage } from './OfficeworksDocumentReviewModal'
import OfficeworksDashboardScene from './OfficeworksDashboardScene'

// Hero scenes used as fullContent inside the modal at their stages
import PeerReviewScene from './PeerReviewScene'
import AckReviewScene from './AckReviewScene'

// ─── Map currentStep.id → modal stage ─────────────────────────────────────────

function stepIdToStage(stepId: string | undefined): OfficeworksReviewStage {
    switch (stepId) {
        case 'sc1.0':   return 'intake'
        case 'sc1.0b':  return 'intake-complete'
        case 'sc1.2':   return 'design'
        case 'sc1.4':   return 'sq-check'
        case 'sc1.5':   return 'teknion-preview'
        case 'sc1.5b':  return 'spec-gap'
        case 'sc1.6':   return 'self-audit'
        case 'sc1.7':   return 'peer-review'
        case 'sc1.8':   return 'submission'
        case 'sc1.8b':  return 'handoff'
        case 'sc1.9':   return 'ack-review'
        // ─── L&D flow ───────────────────────────────────────────────────────
        case 'sc-LD.0': return 'ld-rfp-intake'
        case 'sc-LD.1': return 'ld-takeoff'
        case 'sc-LD.2': return 'ld-conditions'
        case 'sc-LD.3': return 'ld-vendor-pool'
        case 'sc-LD.4': return 'ld-bid-send'
        case 'sc-LD.5': return 'ld-bid-compare'
        case 'sc-LD.6': return 'ld-winner-select'
        case 'sc-LD.7': return 'ld-final-upload'
        // ─── Sales flow ─────────────────────────────────────────────────────
        case 'sc-S.0':  return 'sales-inbox'
        case 'sc-S.1':  return 'sales-intake'
        case 'sc-S.2':  return 'sales-capacity'
        case 'sc-S.3':  return 'sales-assign'
        case 'sc-S.4':  return 'sales-discovery'
        case 'sc-S.5':  return 'sales-outreach'
        case 'sc-S.6':  return 'sales-proposal'
        case 'sc-S.7':  return 'sales-handoff'
        default:        return 'intake'
    }
}

// When validating these steps, keep the modal open so Flow 2 plays as a
// continuous in-modal journey (Design BOM + Validation Doc + client approval → SQ).
const STAYS_OPEN_WITHIN_FLOW2 = new Set(['sc1.2'])

// ─── Officeworks notification events (dispatched by ActionCenter) ─────────────
// Per P52 contract: every officeworks: custom event opens the review modal.
// The notification configs live in src/components/notifications/ActionCenter.tsx
// (OFFICEWORKS_STEP_NOTIFICATIONS + OFFICEWORKS_SC10_NOTIFICATIONS).
const OFFICEWORKS_NOTIF_EVENTS = [
    'officeworks:intake-ingest',
    'officeworks:intake-reply-open',
    'officeworks:cet-open',
    'officeworks:bom-open',
    'officeworks:sq-open',
    'officeworks:preview-open',
    'officeworks:preview-response-open',
    'officeworks:preview-resubmit-open',
    'officeworks:phasing-open',
    'officeworks:peer-open',
    'officeworks:submission-open',
    'officeworks:po-tracking-open',
    'officeworks:ack-open',
    // Labor & Delivery flow events
    'officeworks:ld-rfp-ingest',
    'officeworks:ld-takeoff-open',
    'officeworks:ld-conditions-open',
    'officeworks:ld-vendor-pool-open',
    'officeworks:ld-bid-send-open',
    'officeworks:ld-bid-compare-open',
    'officeworks:ld-winner-select-open',
    'officeworks:ld-final-upload-open',
    // Sales flow events
    // NOTE: 'officeworks:sales-inbox-ingest' intentionally omitted — at sc-S.0
    // the SalesInboxModal (opened by OfficeworksFunnel) is the triage surface,
    // not the Review modal. The Review modal opens from the inbox's Review/Intake
    // actions (onOpenReview) once a thread is picked.
    'officeworks:sales-intake-open',
    'officeworks:sales-capacity-open',
    'officeworks:sales-assign-open',
    'officeworks:sales-discovery-open',
    'officeworks:sales-outreach-open',
    'officeworks:sales-proposal-open',
    'officeworks:sales-handoff-open',
] as const

const STEP_ICONS_BY_APP: Record<string, React.ReactElement> = {
    'officeworks-intake':      <Inbox className="h-5 w-5" />,
    'officeworks-design':      <Pencil className="h-5 w-5" />,
    'officeworks-spec-check':  <ClipboardCheck className="h-5 w-5" />,
    'officeworks-submission':  <Send className="h-5 w-5" />,
    'officeworks-dashboard':   <LayoutDashboard className="h-5 w-5" />,
    'officeworks-labor':       <Truck className="h-5 w-5" />,
    'officeworks-sales':       <Inbox className="h-5 w-5" />,
}

const STEP_TITLES_BY_APP: Record<string, string> = {
    'officeworks-intake':      'Intake',
    'officeworks-design':      'Design',
    'officeworks-spec-check':  'Spec Check',
    'officeworks-submission':  'Submission',
    'officeworks-dashboard':   'Design Dashboard',
    'officeworks-labor':       'Labor & Delivery',
    'officeworks-sales':       'Sales',
}

// ─── Main page component ──────────────────────────────────────────────────────

export default function OfficeworksPage() {
    const { currentStep, nextStep } = useDemo()
    // Funnel-first: modal opens via the MANATT card's "Review →" button OR
    // when any officeworks:* notification CTA is dispatched from ActionCenter.
    const [isModalOpen, setIsModalOpen] = useState(false)
    // Active designer assignment for MANATT · selected via IntakeAssignPanel or Dashboard
    const [assignedDesigner, setAssignedDesigner] = useState<string | null>(null)
    // Peer reviewer picked at sc1.6 (SelfAuditScene → PeerAssignPopover) · propagated to sc1.7
    const [peerReviewerName, setPeerReviewerName] = useState<string | null>(null)
    // L&D · installer pool picked at sc-LD.3 · propagated to sc-LD.4/5
    const [selectedVendorIds, setSelectedVendorIds] = useState<string[] | null>(null)
    // L&D · winner picked at sc-LD.6 · propagated to sc-LD.7
    const [winnerVendorId, setWinnerVendorId] = useState<string | null>(null)

    const stepId = currentStep?.id
    const stage = stepIdToStage(stepId)
    const app = currentStep?.app ?? 'officeworks-spec-check'
    const icon = STEP_ICONS_BY_APP[app] ?? <ClipboardCheck className="h-5 w-5" />
    const pageTitle = STEP_TITLES_BY_APP[app] ?? 'Spec Check'
    // Flow derived from current step · drives the funnel + page chrome.
    const flowId = (currentStep?.flowId ?? 'spec-check') as 'spec-check' | 'labor-delivery' | 'sales'

    // Listen for all officeworks notification CTA events to open the modal
    useEffect(() => {
        const open = () => setIsModalOpen(true)
        OFFICEWORKS_NOTIF_EVENTS.forEach(evt => window.addEventListener(evt, open))
        return () => OFFICEWORKS_NOTIF_EVENTS.forEach(evt => window.removeEventListener(evt, open))
    }, [])

    const handleClose = () => setIsModalOpen(false)

    const handleValidate = () => {
        const id = currentStep?.id ?? ''
        if (STAYS_OPEN_WITHIN_FLOW2.has(id)) {
            // Flow 2 continuity · advance step without closing the modal · the
            // right panel and AI banner re-render with the next stage.
            nextStep()
            return
        }
        setIsModalOpen(false)
        // brief pause so user sees modal close before next step renders
        setTimeout(() => nextStep(), 200)
    }

    // Pick hero scene as fullContent when at hero stages.
    // sc1.6 'self-audit' uses the standard split-pane pattern · the modal
    // dispatches SelfAuditScene as the right panel so the BOM/Validation Doc
    // tabs stay visible on the left.
    let fullContent: React.ReactNode | undefined
    if (stage === 'peer-review') {
        fullContent = <PeerReviewScene onContinue={handleValidate} peerName={peerReviewerName} />
    } else if (stage === 'ack-review') {
        fullContent = <AckReviewScene onContinue={handleValidate} />
    }

    return (
        <PageShell
            title={pageTitle}
            tenantLabel="Officeworks"
            productLabel="Strata for Officeworks"
            icon={icon}
        >
            <div className="space-y-4 animate-in fade-in duration-500">
                {/* Notifications now come from ActionCenter (bell icon in navbar).
                    Each officeworks step has an entry in OFFICEWORKS_STEP_NOTIFICATIONS;
                    the CTA dispatches an officeworks:* custom event that opens the modal. */}
                <OfficeworksFunnel
                    onOpenReview={() => setIsModalOpen(true)}
                    hideReviewCta={isModalOpen}
                    assignedDesigner={assignedDesigner}
                    flowId={flowId}
                />
            </div>

            <OfficeworksDocumentReviewModal
                isOpen={isModalOpen}
                onClose={handleClose}
                stage={stage}
                onValidate={handleValidate}
                fullContent={fullContent}
                assignedDesigner={assignedDesigner}
                onAssignDesigner={setAssignedDesigner}
                peerReviewerName={peerReviewerName}
                onAssignPeerReviewer={setPeerReviewerName}
                selectedVendorIds={selectedVendorIds}
                onSelectVendors={setSelectedVendorIds}
                winnerVendorId={winnerVendorId}
                onSelectWinner={setWinnerVendorId}
            />
        </PageShell>
    )
}

// ─── Dashboard tab (persistent, no demo step) ─────────────────────────────────

export function OfficeworksDashboardPage() {
    return (
        <PageShell
            title="Design Dashboard"
            tenantLabel="Officeworks"
            productLabel="Strata for Officeworks"
            icon={<LayoutDashboard className="h-5 w-5" />}
        >
            <div className="animate-in fade-in duration-500">
                <OfficeworksDashboardScene />
            </div>
        </PageShell>
    )
}
