import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import { BellIcon, MagnifyingGlassIcon, XMarkIcon, Squares2X2Icon, ExclamationTriangleIcon, CreditCardIcon, ClipboardDocumentCheckIcon, TruckIcon, DocumentTextIcon, CheckCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { Fragment, useState, useMemo, useEffect } from 'react';
import { clsx } from 'clsx';
import { mockNotifications } from './data';
import FilterTabs from './FilterTabs';
import NotificationItem from './NotificationItem';
import type { Notification, NotificationTab } from './types';
import { useDemo } from '../../context/DemoContext';
import { usePauseAware } from '../../context/usePauseAware';

// Flow 2 notifications for Step 2.6
const FLOW2_NOTIFICATIONS: Notification[] = [
    {
        id: 'f2-hat-confirmed', type: 'ack_received', priority: 'low',
        title: 'Acknowledgement-7841 (HAT) — Confirmed',
        message: '5 lines confirmed. AI vendor rule applied: part number match is sufficient per client directive.',
        meta: 'ACKIngestionAgent', timestamp: 'Just now', unread: true,
        actions: [{ label: 'View Acknowledgement', primary: true }], persona: 'dealer',
    },
    {
        id: 'f2-ais-resolved', type: 'ack_received', priority: 'high',
        title: 'Acknowledgement-7842 (AIS) — 3 Exceptions Resolved',
        message: '50 lines processed. Grommet corrected (Line 41), dates accepted (+14/+11 days), backorder BO-1064B created for 6 units.',
        meta: 'DiscrepResolverAgent', timestamp: 'Just now', unread: true,
        actions: [{ label: 'View Details', primary: true }], persona: 'dealer',
    },
    {
        id: 'f2-expert-queue', type: 'system', priority: 'medium',
        title: 'Expert Queue Update',
        message: 'Acknowledgement-7842 grommet auto-corrected (Line 41, X-DS6030 CB). Next queue: 2 pending Acknowledgements.',
        meta: 'NotificationAgent', timestamp: '2 min ago', unread: true,
        actions: [{ label: 'View Queue', primary: true }], persona: 'expert',
    },
    {
        id: 'f2-crm-sync', type: 'system', priority: 'medium',
        title: 'CRM Order Lifecycle — Ready to Sync',
        message: 'ACK-7841 and ACK-7842 fully processed. Delivery dates, backorder status, and resolution data ready to sync to Premier Underground Design project timeline.',
        meta: 'OrderSyncAgent', timestamp: 'Just now', unread: true,
        actions: [{ label: 'Sync to CRM', primary: true }], persona: 'dealer',
    },
];

// BFI steps generic incoming-event notifications
interface BfiStepNotif {
    badge: string
    badgeColor: 'ai' | 'warning' | 'success'
    title: string
    desc: string
    sender: string
    re?: string
    attachment?: string
    cta: string
    event: string
    footerText: string
}

const BFI_STEP_NOTIFICATIONS: Record<string, BfiStepNotif> = {
    'a1.2c': {
        badge: '1 new', badgeColor: 'success',
        title: 'PO Received · DOE-2847 ready for review',
        desc: 'Q-2026-0089 has been approved and converted to PO DOE-2847 ($235,560). Please review PO and labor figures before confirming and sending to CORE.',
        sender: 'nycdoe-procurement@schools.nyc.gov',
        re: 'Purchase Order DOE-2847 · NYC Dept. of Education · $235,560',
        attachment: 'DOE-2847-PurchaseOrder.pdf',
        cta: 'Review PO →',
        event: 'bfi:po-review-open',
        footerText: 'PO review pending',
    },
    'a1.2d': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Purchase Order confirmed · NYC Dept. of Education',
        desc: 'DOE-2847 · Q-2026-0089 · Delivery May 14–21 · 35 cartons · warehouse receiving',
        sender: 'NYC Dept. of Education · Procurement',
        cta: 'Review receiving documents →',
        event: 'bfi:wig-open',
        footerText: 'WIG receiving ready',
    },
    'a1.2e': {
        badge: '1 urgent', badgeColor: 'warning',
        title: 'Missing Carton · DOE-2847',
        desc: 'Carton #34 not received at WIG NJ — Monitor Arm Dual Adjustable. Receiving complete: 34/35 cartons.',
        sender: 'Lena C. · Receiving Coordinator',
        cta: 'Review & file claim →',
        event: 'bfi:claim-open',
        footerText: 'Awaiting claim',
    },
    'a1.2f': {
        badge: '1 new', badgeColor: 'success',
        title: 'Shortage claim resolved · Herman Miller',
        desc: 'Monitor Arm Dual Adjustable · Replacement carton ETA May 18 · Cleared for work order scheduling.',
        sender: 'Herman Miller · Customer Service',
        cta: 'Review & notify →',
        event: 'bfi:resolved-open',
        footerText: 'Work order ready',
    },
    'a1.3b': {
        badge: '1 new', badgeColor: 'ai',
        title: 'CPR approved · Final quote ready · DOE-2847',
        desc: 'Lauren DeMarco completed CPR reconciliation — Carpenters −5h, OT −2h · Total −$2,340 · Pending: send final quote to Herman Miller.',
        sender: 'Lauren DeMarco · Account Manager',
        cta: 'Review & send quote to Nancy →',
        event: 'bfi:michael-open',
        footerText: 'Quote pending',
    },
    'a1.3c': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Final Labor Quote ready · DOE-2847 · Invoice upload requested',
        desc: 'CPR-adjusted quote ($6,920) has been approved. Please upload the Quote Tool approved invoice to complete the fee verification process.',
        sender: 'Michael Boyle · Director of Strategic Accounts',
        cta: 'Upload invoice →',
        event: 'bfi:invoice-open',
        footerText: 'Invoice upload pending',
    },
    'a1.4': {
        badge: '1 new', badgeColor: 'success',
        title: 'Quote Tool invoice forwarded · DOE-2847 · Fee verification requested',
        desc: 'The Quote Tool approved invoice ($6,920) for Purchase Order DOE-2847 is attached. CPR reconciliation is complete — please review and confirm the agency fee.',
        sender: 'Lauren DeMarco · Account Manager · BFI',
        cta: 'Review fee →',
        event: 'bfi:fee-open',
        footerText: 'Fee verification pending',
    },
}

// BFI Step a1.1 — Miller Knoll quote request notification
const BFI_A11_NOTIFICATIONS: Notification[] = [
    {
        id: 'bfi-a11-miller-knoll',
        type: 'quote_update',
        priority: 'high',
        title: 'New quote request · Miller Knoll',
        message: 'Robert Chen sent SIF + PDF specs for DOE-2847 · NYC Dept. of Education · Q-2026-0089',
        meta: 'robert.chen@millerknoll.com · May 6 · 8:14 AM',
        timestamp: 'May 6 · 8:14 AM',
        unread: true,
        actions: [{ label: 'Ingest with Strata', primary: true }],
    },
];

// ─── Officeworks · step notifications (P52: parallel to BFI pattern) ──────────
// Shape mirrors BfiStepNotif. Contract for future notifications: add an entry
// here, then have the relevant scene listen for `event` via window.addEventListener.

type OwStepNotif = BfiStepNotif

const OFFICEWORKS_STEP_NOTIFICATIONS: Record<string, OwStepNotif> = {
    'sc1.2': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Assignment received · MANATT 4th Floor',
        desc: 'Felicia assigned you MANATT 4th Floor · scope confirmed (~30 stations · Standard/Large · Flintwood 5N White Oak). Build the BOM in CET/CAP and upload it to Strata for analysis.',
        sender: 'Felicia Miano-Poles · EVP Design & PM',
        re: 'MANATT 4th Floor · start CET design + BOM',
        cta: 'Open CET workspace →',
        event: 'officeworks:cet-open',
        footerText: 'CET design pending',
    },
    'sc1.4': {
        badge: '1 new', badgeColor: 'success',
        title: 'SQ verified · GSA price-protected catalog 2025',
        desc: 'Strata embedded Create platform inline · SQ #436533 confirmed · PZ Description column verified vs current catalog. No catalog drift.',
        sender: 'Teknion Create · SQ lookup',
        re: 'MANATT · GSA SQ #436533 · catalog 2025 verified',
        cta: 'Submit Order Preview →',
        event: 'officeworks:preview-open',
        footerText: 'Order Preview submission pending',
    },
    'sc1.5': {
        badge: '1 new', badgeColor: 'warning',
        title: 'Order Preview returned · #OP-2025-0001605',
        desc: 'Tifani returned the preview · timeline conflict detected on 40-day CRs · GW3 gateway: resolve spec gaps or phase the order.',
        sender: 'Tifani · Teknion Order Preview team',
        re: 'OP-2025-0001605 · MANATT 4th Floor · GW3 timeline conflict',
        attachment: 'OP-2025-0001605-preview.pdf',
        cta: 'Open preview response →',
        event: 'officeworks:preview-response-open',
        footerText: 'Gateway GW3 decision pending',
    },
    'sc1.5b': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Spec gap fix ready · CR 2046138 lead time',
        desc: 'Strata drafted the spec gap fix · CR 2046138 phasing recommendation · BOM revised · ready to resubmit preview.',
        sender: 'Strata AI · Spec Gap Resolver',
        re: 'CR 2046138 · phasing recommendation · BOM revised',
        cta: 'Resubmit preview →',
        event: 'officeworks:preview-resubmit-open',
        footerText: 'Preview resubmit pending',
    },
    'sc1.5c': {
        badge: '1 new', badgeColor: 'warning',
        title: '3-way phasing huddle · timeline alignment',
        desc: 'Teknion can\'t hit the date. Phasing plan drafted with Designer + PM + Salesperson. GW3A: phasing changes order structure · new preview needed.',
        sender: 'Strata AI · Phasing Coordinator',
        re: 'MANATT · 3-way phasing · GW3A new preview required',
        cta: 'Open phasing plan →',
        event: 'officeworks:phasing-open',
        footerText: 'Phasing decision pending',
    },
    'sc1.7': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Peer review request · Rebecca Warren assigned',
        desc: 'Kimberly\'s self-audit complete · 3 issues resolved. Peer assigned: Rebecca Warren (MA/NY/NJ) · delta summary focuses on CRs + electrical layout.',
        sender: 'Kimberly Tucker · Designer (PA)',
        re: 'MANATT 4th Floor · self-audit complete · peer review request',
        cta: 'Open peer audit →',
        event: 'officeworks:peer-open',
        footerText: 'Peer review pending',
    },
    'sc1.8': {
        badge: '1 new', badgeColor: 'success',
        title: 'Peer audit complete · BOM ready for submission',
        desc: 'Rebecca\'s peer audit complete · 2 new rules saved to Officeworks knowledge base · BOM approved for submission to Caitlin + Sales Coordinator.',
        sender: 'Rebecca Warren · Peer reviewer (MA)',
        re: 'MANATT · peer audit complete · BOM approved · SP4 ready',
        attachment: 'MANATT-4F_BOM_final.pdf + SP4',
        cta: 'Review BOM submission email →',
        event: 'officeworks:submission-open',
        footerText: 'BOM submission pending',
    },
    'sc1.8b': {
        badge: '1 new', badgeColor: 'ai',
        title: 'PO released to Teknion · PO-DC-0009642',
        desc: 'Sales Coordinator uploaded SP4 to NetSuite · 79% discount applied · Salesperson Caitlin released PO to Teknion. PO-DC-0009642 generated.',
        sender: 'Caitlin Barolet · MANATT Salesperson',
        re: 'PO-DC-0009642 released to Teknion · awaiting acknowledgement',
        cta: 'Track Teknion ack →',
        event: 'officeworks:po-tracking-open',
        footerText: 'Awaiting Teknion acknowledgement',
    },
    'sc1.9': {
        badge: '1 new', badgeColor: 'success',
        title: 'Acknowledgement received · Universal #2-10468963',
        desc: 'Teknion acknowledgement received for PO-DC-0009642 · 11 pages · Gemini cross-reference across 71 lines + 13 CRs · 70/71 match · 1 discrepancy on shipping date.',
        sender: 'Teknion · Order Acknowledgement',
        re: 'PO-DC-0009642 · Universal #2-10468963 · 70/71 lines match',
        attachment: 'PO-DC-0009642-ack.pdf',
        cta: 'Review acknowledgement →',
        event: 'officeworks:ack-open',
        footerText: 'Acknowledgement review pending',
    },

    // ─── Labor & Delivery flow (sc-LD.0 to sc-LD.7) ──────────────────────────
    'sc-LD.0': {
        badge: '1 new', badgeColor: 'ai',
        title: 'New labor RFP · MANATT 4F · CBRE',
        desc: 'CBRE submitted the labor + delivery RFP via Building Connected · 3 attachments (drawings + SIF + cover) · SLA 48h MSA window starts on acknowledge.',
        sender: 'Jonathan Spence · CBRE',
        re: 'Labor RFP · MANATT 4F · respond by Wed May 14 9 AM',
        attachment: 'manatt-4th-floor.dwg + cbre-rfp-cover.pdf',
        cta: 'Review RFP →',
        event: 'officeworks:ld-rfp-ingest',
        footerText: 'RFP acknowledgement pending',
    },
    'sc-LD.1': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Ready to run AI takeoff',
        desc: 'RFP acknowledged · Strata can extract scope from manatt-4th-floor.dwg in ~18s vs ~2.5h manual count in Bluebeam (single most time-consuming step today).',
        sender: 'Strata AI · Takeoff Assistant',
        re: 'MANATT 4F · AI takeoff from drawings',
        cta: 'Run AI takeoff →',
        event: 'officeworks:ld-takeoff-open',
        footerText: 'Takeoff pending',
    },
    'sc-LD.2': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Building conditions ready · 1551 K St NW',
        desc: 'Strata pulled 8 of 12 conditions from the Building KB (5 prior projects at this address) · 2 medium-confidence items need Alan to confirm before proceeding to vendor pool.',
        sender: 'Strata AI · Building KB',
        re: 'MANATT 4F · 12 building & workforce conditions',
        cta: 'Review conditions →',
        event: 'officeworks:ld-conditions-open',
        footerText: 'Conditions review pending',
    },
    'sc-LD.3': {
        badge: '1 new', badgeColor: 'warning',
        title: 'DC installer pool ready · 3 approved',
        desc: 'Strata flags Pinnacle Systems (3 active jobs · capacity Low) and recommends TriState Labor Solutions (96% on-time · 2% CO rate · high headroom).',
        sender: 'Strata AI · Vendor Recommendation',
        re: 'MANATT 4F · 3 installers DC · capacity-aware shortlist',
        cta: 'Open vendor pool →',
        event: 'officeworks:ld-vendor-pool-open',
        footerText: 'Vendor pool selection pending',
    },
    'sc-LD.4': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Bid request drafted · 3 installers',
        desc: 'Strata pre-filled the bid request email with scope + drawings + conditions summary + 48h deadline. 3 pre-flight checks all green. One-click send to all 3 installers.',
        sender: 'Strata AI · Bid Request Drafter',
        re: 'MANATT 4F · bid request · Pinnacle + Northeast + TriState',
        cta: 'Open email draft →',
        event: 'officeworks:ld-bid-send-open',
        footerText: 'Bid request send pending',
    },
    'sc-LD.5': {
        badge: '3 new', badgeColor: 'success',
        title: '3/3 bids received within 48h',
        desc: 'Pinnacle $21,250 · Northeast $21,700 · TriState $20,900. Internal benchmark $21,900 · all within 15% variance threshold. TriState wins on price + headroom.',
        sender: 'Strata AI · Bid Tracker',
        re: 'MANATT 4F · 3/3 bids in · variance check OK',
        cta: 'Open bid comparison →',
        event: 'officeworks:ld-bid-compare-open',
        footerText: 'Bid evaluation pending',
    },
    'sc-LD.6': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Winner recommendation ready · TriState',
        desc: 'Strata drafted 3 notification emails (winner + 2 loser declines) ready for Alan to review and send. Never auto-send (CLAUDE.md rule).',
        sender: 'Strata AI · Winner Selector',
        re: 'MANATT 4F · TriState Labor Solutions selected · notifications drafted',
        cta: 'Confirm winner →',
        event: 'officeworks:ld-winner-select-open',
        footerText: 'Winner confirmation pending',
    },
    'sc-LD.7': {
        badge: '1 new', badgeColor: 'success',
        title: 'Ready to assemble final quote · 12h to GC deadline',
        desc: 'Vendor net $20,900 + OW margin 18% = $24,662 quoted to CBRE. Cell-level audit · Excel template ready · upload to Building Connected portal.',
        sender: 'Strata AI · Quote Assembly',
        re: 'MANATT 4F · final quote $24,662 · BC-RFP-882041',
        cta: 'Open final quote →',
        event: 'officeworks:ld-final-upload-open',
        footerText: 'Final upload pending',
    },

    // ─── Sales flow (sc-S.0 to sc-S.7) ───────────────────────────────────────
    'sc-S.0': {
        badge: '12 new', badgeColor: 'ai',
        title: 'Unified inbox · 12 threads queued',
        desc: 'Strata classified 12 inbound threads across email + Teams + portal in 1.8s · 5 urgent · 4 action · 3 FYI. MANATT-4F flagged red · 26h since last touch.',
        sender: 'Strata AI · Inbox Triage',
        re: 'Sales inbox · multi-channel feed · classify & dedup',
        cta: 'Triage inbox →',
        event: 'officeworks:sales-inbox-ingest',
        footerText: 'Inbox triage pending',
    },
    // sc-S.1 · NO notification · the Sales Manager just created this opp record
    // via their Intake action in sc-S.0 · sending them a "new opportunity"
    // notification about something they just created themselves is redundant.
    // The modal continues open into stage `sales-intake` as a continuation of
    // the Intake action · the `officeworks:sales-intake-open` listener in
    // OfficeworksPage stays wired in case external code needs to re-open it.
    'sc-S.2': {
        badge: '1 new', badgeColor: 'ai',
        title: 'Rep capacity ledger ready · 5 reps · Mid-Atlantic',
        desc: 'Live capacity ledger pulled from Copper events (read-only mock). Rep B flagged overloaded (84 open opps). Strata recommends Rep A (DC + NoVA · 2 prior MANATT wins · 78% quota).',
        sender: 'Strata AI · Capacity Tracker',
        re: 'MANATT-4F · 5-rep capacity view · territory + load + quota',
        cta: 'Open capacity ledger →',
        event: 'officeworks:sales-capacity-open',
        footerText: 'Capacity review pending',
    },
    'sc-S.3': {
        badge: '1 new', badgeColor: 'ai',
        title: "You've been assigned to MANATT-4F",
        desc: 'Sales Rep · DC + NoVA · Strata briefing ready. Review why you were picked, what was extracted from the inbox, the SLA gates, and the suggested first touch. Priority opps trigger expedited 12h/24h SLAs.',
        sender: 'Strata AI · Rep Handoff',
        re: 'MANATT-4F · handoff briefing · SLA gates · first-touch suggestion',
        cta: 'Open handoff briefing →',
        event: 'officeworks:sales-assign-open',
        footerText: 'Handoff briefing pending',
    },
    // sc-S.4 · NO notification · same Sales Rep continuing from the sc-S.3
    // handoff acceptance. The modal stays open via STAYS_OPEN_WITHIN_FLOW2
    // ('sc-S.3') so the rep transitions seamlessly into discovery work.
    // Sending a fresh "Discovery summary ready" notification for an action
    // they just chose themselves is redundant.
    // sc-S.5 · NO notification · same Sales Rep continuing from the sc-S.4
    // discovery save. The modal stays open via STAYS_OPEN_WITHIN_FLOW2
    // ('sc-S.4') so the rep transitions seamlessly into outreach drafting.
    // Sending a fresh "Outreach drafts ready" notification for an action they
    // just chose themselves is redundant.
    // sc-S.6 · NO notification · same Sales Rep continuing from the sc-S.5
    // outreach send. The modal stays open via STAYS_OPEN_WITHIN_FLOW2
    // ('sc-S.5') so the rep transitions seamlessly into proposal review.
    // Sending a fresh "Proposal assembled" notification for an action they
    // just chose themselves is redundant.
    'sc-S.7': {
        badge: '1 new', badgeColor: 'success',
        title: 'Outcome ready · WON · handoff packet built',
        desc: 'MANATT-4F closed at $1,541,392. Strata built the post-award handoff packet · Works post-award + NetSuite SO bridge + downstream flow triggers · no missed coordinator step.',
        sender: 'Strata AI · Handoff Orchestrator',
        re: 'MANATT-4F · WON · route to Spec Check + L&D',
        cta: 'Open handoff packet →',
        event: 'officeworks:sales-handoff-open',
        footerText: 'Handoff routing pending',
    },
}

// Officeworks Step sc1.0 — MANATT intake (parallel to BFI a1.1 ingest pattern)
const OFFICEWORKS_SC10_NOTIFICATIONS: Notification[] = [
    {
        id: 'ow-sc10-manatt-intake',
        type: 'quote_update',
        priority: 'high',
        title: 'New project intake · MANATT 4th Floor',
        message: 'Caitlin Barolet (DC) submitted the Works form for MANATT 4th Floor build-out · CAD file missing · SQ blank for GSA price-protected client',
        meta: 'caitlin.barolet@manatt.com · May 6 · 9:42 AM',
        timestamp: 'May 6 · 9:42 AM',
        unread: true,
        actions: [{ label: 'Ingest with Strata', primary: true }],
    },
];

const SC10_INGEST_LINES = [
    { text: 'Works form parsed · 12 fields extracted',                                               isWarning: false },
    { text: 'PDF floor plan attached · manatt-4th-floor-floorplan.pdf',                              isWarning: false },
    { text: 'CAD file (.dwg) expected · MISSING — clarification email drafted to Caitlin',           isWarning: true  },
    { text: 'SQ blank · GSA price-protected · Strata suggests #436533 (catalog 2025)',               isWarning: true  },
]

// Officeworks Step sc1.0b — Caitlin replied with CAD + SQ
const OFFICEWORKS_SC10B_NOTIFICATIONS: Notification[] = [
    {
        id: 'ow-sc10b-manatt-reply',
        type: 'quote_update',
        priority: 'high',
        title: 'Caitlin replied · CAD attached',
        message: 'Re: MANATT 4th Floor clarification · CAD floor plan (.dwg, 4.8 MB) attached and SQ #436533 confirmed. Form is complete · designer assignment unlocked.',
        meta: 'caitlin.barolet@manatt.com · 2026-04-17 · 11:08 AM',
        timestamp: '2026-04-17 · 11:08 AM',
        unread: true,
        actions: [{ label: 'Open reply', primary: true }],
    },
];

const SC10B_INGEST_LINES = [
    { text: 'Reply parsed from caitlin.barolet@manatt.com',                  isWarning: false },
    { text: 'CAD attachment received · manatt-4th-floor.dwg · 4.8 MB',       isWarning: false },
    { text: 'SQ #436533 confirmed · GSA price-protected · catalog 2025',     isWarning: false },
    { text: 'Form completeness · all required fields satisfied',             isWarning: false },
]

// Flow 1 notification for Step 1.10 — single focused notification
const FLOW1_NOTIFICATIONS: Notification[] = [
    {
        id: 'f1-po', type: 'po_created', priority: 'high',
        title: 'PO Created from RFQ',
        message: 'Order #PO-1029 generated for Home Exteriors — $134,250. Quote QT-1025 approved (2/2). Ready for pipeline.',
        meta: 'POBuilderAgent', timestamp: 'Just now', unread: true,
        actions: [{ label: 'View PO', primary: true }], persona: 'dealer',
    },
];

export default function ActionCenter() {
    const { isDemoActive, isSidebarCollapsed, currentStep, nextStep } = useDemo();
    const { pauseAwareTimeout } = usePauseAware();
    const sidebarExpanded = isDemoActive && !isSidebarCollapsed;
    const [activeTab, setActiveTab] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    // BFI Step a1.1: Auto-open with Miller Knoll quote request
    const isStepA11 = isDemoActive && currentStep?.id === 'a1.1';
    const [a11PanelClosed,  setA11PanelClosed]  = useState(false);
    const [a11IngestState,  setA11IngestState]  = useState<'idle' | 'ingesting' | 'ready'>('idle');
    const [a11IngestCount,  setA11IngestCount]  = useState(0);
    // BFI generic step panel (a1.2d / a1.2e / a1.2f / a1.3b)
    const [bfiPanelClosed, setBfiPanelClosed] = useState(false);
    // Officeworks Step sc1.0 · ingest pattern (parallel to a1.1)
    const isStepSc10 = isDemoActive && currentStep?.id === 'sc1.0';
    const [sc10PanelClosed,  setSc10PanelClosed]  = useState(false);
    const [sc10IngestState,  setSc10IngestState]  = useState<'idle' | 'ingesting' | 'ready'>('idle');
    const [sc10IngestCount,  setSc10IngestCount]  = useState(0);
    // Officeworks Step sc1.0b · reply-received ingest pattern
    const isStepSc10b = isDemoActive && currentStep?.id === 'sc1.0b';
    const [sc10bPanelClosed,  setSc10bPanelClosed]  = useState(false);
    const [sc10bIngestState,  setSc10bIngestState]  = useState<'idle' | 'ingesting' | 'ready'>('idle');
    const [sc10bIngestCount,  setSc10bIngestCount]  = useState(0);
    // Officeworks generic step panel (sc1.1 .. sc1.9)
    const [owPanelClosed, setOwPanelClosed] = useState(false);
    // Delay before any notification panel appears (2s after step loads)
    const [notifDelayReady, setNotifDelayReady] = useState(false);
    // Reset all panels when step changes, then reveal after 2s (pause-aware)
    useEffect(() => {
        setA11PanelClosed(false);
        setA11IngestState('idle');
        setA11IngestCount(0);
        setBfiPanelClosed(false);
        setSc10PanelClosed(false);
        setSc10IngestState('idle');
        setSc10IngestCount(0);
        setSc10bPanelClosed(false);
        setSc10bIngestState('idle');
        setSc10bIngestCount(0);
        setOwPanelClosed(false);
        setNotifDelayReady(false);
        const cancel = pauseAwareTimeout(() => setNotifDelayReady(true), 2000);
        return () => cancel?.();
    }, [currentStep?.id, pauseAwareTimeout]);

    // Step 1.10: Auto-open with single notification
    const isStep19 = isDemoActive && currentStep?.id === '1.10';

    // Step 2.7: Auto-open with animated delivery for Flow 2 Acknowledgement notifications
    const isStep27 = isDemoActive && currentStep?.id === '2.7';
    const [notifDelivered27, setNotifDelivered27] = useState<number[]>([]);

    useEffect(() => {
        if (!isStep27) { setNotifDelivered27([]); return; }
        const cancels = [
            pauseAwareTimeout(() => setNotifDelivered27([0]),          1500),
            pauseAwareTimeout(() => setNotifDelivered27([0, 1]),       3000),
            pauseAwareTimeout(() => setNotifDelivered27([0, 1, 2]),    4500),
            pauseAwareTimeout(() => setNotifDelivered27([0, 1, 2, 3]),6000),
        ];
        return () => cancels.forEach(c => c?.());
    }, [isStep27, pauseAwareTimeout]);

    const tabs: NotificationTab[] = [
        {
            id: 'all', label: 'All',
            count: mockNotifications.filter(n => n.unread).length,
            icon: Squares2X2Icon,
            colorTheme: { activeBg: 'bg-gray-200 dark:bg-white/10', activeText: 'text-zinc-900 dark:text-white', activeBorder: 'border-gray-300 dark:border-white/10', badgeBg: 'bg-zinc-500/20 dark:bg-white/20', badgeText: 'text-zinc-900 dark:text-white' },
            filter: () => true
        },
        {
            id: 'discrepancy', label: 'Discrepancies',
            count: mockNotifications.filter(n => n.type === 'discrepancy' && n.unread).length,
            icon: ExclamationTriangleIcon,
            colorTheme: { activeBg: 'bg-red-500/15', activeText: 'text-red-500', activeBorder: 'border-red-500/20', badgeBg: 'bg-red-500/20', badgeText: 'text-red-500' },
            filter: (n) => n.type === 'discrepancy'
        },
        {
            id: 'quotes', label: 'Quotes & POs',
            count: mockNotifications.filter(n => (n.type === 'quote_update' || n.type === 'po_created' || n.type === 'ack_received' || n.type === 'approval') && n.unread).length,
            icon: DocumentTextIcon,
            colorTheme: { activeBg: 'bg-blue-500/15', activeText: 'text-blue-500', activeBorder: 'border-blue-500/20', badgeBg: 'bg-blue-500/20', badgeText: 'text-blue-500' },
            filter: (n) => n.type === 'quote_update' || n.type === 'po_created' || n.type === 'ack_received' || n.type === 'approval'
        },
        {
            id: 'pricing', label: 'Pricing',
            count: mockNotifications.filter(n => (n.type === 'payment' || n.type === 'invoice') && n.unread).length,
            icon: CreditCardIcon,
            colorTheme: { activeBg: 'bg-amber-500/15', activeText: 'text-amber-500', activeBorder: 'border-amber-500/20', badgeBg: 'bg-amber-500/20', badgeText: 'text-amber-500' },
            filter: (n) => n.type === 'payment' || n.type === 'invoice'
        },
        {
            id: 'shipping', label: 'Shipping',
            count: mockNotifications.filter(n => (n.type === 'shipment' || n.type === 'backorder') && n.unread).length,
            icon: TruckIcon,
            colorTheme: { activeBg: 'bg-green-500/15', activeText: 'text-green-500', activeBorder: 'border-green-500/20', badgeBg: 'bg-green-500/20', badgeText: 'text-green-500' },
            filter: (n) => n.type === 'shipment' || n.type === 'backorder'
        },
    ];

    const filteredNotifications = useMemo(() => {
        const currentTab = tabs.find(t => t.id === activeTab);
        return mockNotifications
            .filter(n => currentTab?.filter(n))
            .filter(n =>
                n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                n.meta.toLowerCase().includes(searchQuery.toLowerCase())
            );
    }, [activeTab, searchQuery]);

    const urgentCount = mockNotifications.filter(n => n.priority === 'high').length;
    const totalCount = mockNotifications.filter(n => n.unread).length;

    // Flow 1 tabs for step 1.10 — single tab since only 1 notification
    const flow1Tabs: NotificationTab[] = [
        { id: 'all', label: 'All', count: FLOW1_NOTIFICATIONS.length, icon: Squares2X2Icon, colorTheme: { activeBg: 'bg-gray-200 dark:bg-white/10', activeText: 'text-zinc-900 dark:text-white', activeBorder: 'border-gray-300 dark:border-white/10', badgeBg: 'bg-zinc-500/20 dark:bg-white/20', badgeText: 'text-zinc-900 dark:text-white' }, filter: () => true },
        { id: 'quotes', label: 'Quotes & POs', count: FLOW1_NOTIFICATIONS.length, icon: DocumentTextIcon, colorTheme: { activeBg: 'bg-blue-500/15', activeText: 'text-blue-500', activeBorder: 'border-blue-500/20', badgeBg: 'bg-blue-500/20', badgeText: 'text-blue-500' }, filter: (n) => n.type === 'po_created' || n.type === 'quote_update' },
    ];

    // Flow 2 tabs for step 2.6
    const flow2Tabs: NotificationTab[] = [
        { id: 'all', label: 'All', count: FLOW2_NOTIFICATIONS.length, icon: Squares2X2Icon, colorTheme: { activeBg: 'bg-gray-200 dark:bg-white/10', activeText: 'text-zinc-900 dark:text-white', activeBorder: 'border-gray-300 dark:border-white/10', badgeBg: 'bg-zinc-500/20 dark:bg-white/20', badgeText: 'text-zinc-900 dark:text-white' }, filter: () => true },
        { id: 'acks', label: 'Acknowledgements', count: FLOW2_NOTIFICATIONS.filter(n => n.type === 'ack_received').length, icon: DocumentTextIcon, colorTheme: { activeBg: 'bg-blue-500/15', activeText: 'text-blue-500', activeBorder: 'border-blue-500/20', badgeBg: 'bg-blue-500/20', badgeText: 'text-blue-500' }, filter: (n) => n.type === 'ack_received' },
        { id: 'system', label: 'System', count: FLOW2_NOTIFICATIONS.filter(n => n.type === 'system').length, icon: SparklesIcon, colorTheme: { activeBg: 'bg-emerald-500/15', activeText: 'text-emerald-500', activeBorder: 'border-emerald-500/20', badgeBg: 'bg-emerald-500/20', badgeText: 'text-emerald-500' }, filter: (n) => n.type === 'system' },
    ];

    const A11_INGEST_LINES = [
        { text: 'DOE-2847.sif parsed · 6 line items extracted', isWarning: false },
        { text: 'NYC-DOE-2847-specs.pdf parsed',                 isWarning: false },
        { text: 'Floor plan detected',                           isWarning: false },
    ];

    const handleA11Ingest = () => {
        setA11IngestState('ingesting');
        pauseAwareTimeout(() => setA11IngestCount(1), 600);
        pauseAwareTimeout(() => setA11IngestCount(2), 1200);
        pauseAwareTimeout(() => setA11IngestCount(3), 1800);
        pauseAwareTimeout(() => {
            setA11IngestState('ready');
            window.dispatchEvent(new CustomEvent('bfi:ingest'));
            pauseAwareTimeout(() => setA11PanelClosed(true), 800);
        }, 2300);
    };

    // Officeworks sc1.0 ingest handler (4 lines · parallel to BFI a1.1)
    const handleSc10Ingest = () => {
        setSc10IngestState('ingesting');
        pauseAwareTimeout(() => setSc10IngestCount(1), 600);
        pauseAwareTimeout(() => setSc10IngestCount(2), 1200);
        pauseAwareTimeout(() => setSc10IngestCount(3), 1800);
        pauseAwareTimeout(() => setSc10IngestCount(4), 2400);
        pauseAwareTimeout(() => {
            setSc10IngestState('ready');
            window.dispatchEvent(new CustomEvent('officeworks:intake-ingest'));
            pauseAwareTimeout(() => setSc10PanelClosed(true), 800);
        }, 2900);
    };

    // Officeworks sc1.0b reply-ingest handler (4 lines · paralelo a sc1.0)
    const handleSc10bIngest = () => {
        setSc10bIngestState('ingesting');
        pauseAwareTimeout(() => setSc10bIngestCount(1), 600);
        pauseAwareTimeout(() => setSc10bIngestCount(2), 1200);
        pauseAwareTimeout(() => setSc10bIngestCount(3), 1800);
        pauseAwareTimeout(() => setSc10bIngestCount(4), 2400);
        pauseAwareTimeout(() => {
            setSc10bIngestState('ready');
            window.dispatchEvent(new CustomEvent('officeworks:intake-reply-open'));
            pauseAwareTimeout(() => setSc10bPanelClosed(true), 800);
        }, 2900);
    };

    const bfiStepConfig = isDemoActive ? BFI_STEP_NOTIFICATIONS[currentStep?.id ?? ''] : undefined;
    const isBfiStepActive = !!bfiStepConfig && !bfiPanelClosed && notifDelayReady;

    const owStepConfig = isDemoActive ? OFFICEWORKS_STEP_NOTIFICATIONS[currentStep?.id ?? ''] : undefined;
    // Flow 2 is now a single in-modal step (sc1.2 = Design BOM + send validation).
    // sc1.2 (Flow 2 entry) + sc1.4 surface their notifs to bridge between flows.
    const SUPPRESS_OW_AC = new Set<string>([]);
    const isOwStepActive = !!owStepConfig && !owPanelClosed && notifDelayReady
        && !SUPPRESS_OW_AC.has(currentStep?.id ?? '');

    const isStepAutoOpen =
        isStep19 || isStep27 ||
        (isStepA11 && !a11PanelClosed && notifDelayReady) ||
        isBfiStepActive ||
        (isStepSc10 && !sc10PanelClosed && notifDelayReady) ||
        (isStepSc10b && !sc10bPanelClosed && notifDelayReady) ||
        isOwStepActive;

    return (
        <>
        <Popover className="relative">
            {({ open }) => (
                <>
                    <PopoverButton className={clsx(
                        "relative p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/10 transition-colors outline-none",
                        (open || isStepAutoOpen) ? "bg-black/5 dark:bg-white/10 text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                    )}>
                        <BellIcon className="w-5 h-5" />
                        {isStepAutoOpen && (
                            <span className="absolute inset-0 rounded-full ring-2 ring-green-500 animate-pulse" />
                        )}
                        {totalCount > 0 && (
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-400 dark:bg-red-500 ring-2 ring-white dark:ring-zinc-900" />
                        )}
                    </PopoverButton>

                    {/* Normal popover - hidden when auto-open steps to avoid duplication */}
                    {!isStepAutoOpen && <Transition
                        as={Fragment}
                        enter="transition ease-out duration-200"
                        enterFrom="opacity-0 translate-y-2 scale-95"
                        enterTo="opacity-100 translate-y-0 scale-100"
                        leave="transition ease-in duration-150"
                        leaveFrom="opacity-100 translate-y-0 scale-100"
                        leaveTo="opacity-0 translate-y-2 scale-95"
                    >
                        <PopoverPanel className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] max-h-[85vh] lg:w-[600px] p-0 z-50 focus:outline-none transition-all duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                            <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">

                                <>
                                    {/* Header */}
                                    <div className="px-5 pt-5 pb-3 shrink-0">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Action Center</h3>
                                            <div className="flex items-center gap-2">
                                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                                    <MagnifyingGlassIcon className="w-5 h-5" />
                                                </button>
                                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                                    <XMarkIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                        <FilterTabs tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-4 space-y-3 scrollbar-minimal">
                                        {filteredNotifications.length > 0 ? (
                                            filteredNotifications.map(notification => (
                                                <NotificationItem key={notification.id} notification={notification} />
                                            ))
                                        ) : (
                                            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 dark:text-gray-400">
                                                <BellIcon className="w-12 h-12 mb-3 text-gray-300 dark:text-gray-600" />
                                                <p className="text-sm font-medium">No updates found</p>
                                                <p className="text-xs mt-1">You're all caught up!</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                                            {filteredNotifications.length} actions
                                        </p>
                                        <p className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                            {urgentCount} urgent
                                        </p>
                                    </div>
                                </>

                            </div>
                        </PopoverPanel>
                    </Transition>}
                </>
            )}
        </Popover>

        {/* Step 1.10: Always-visible Action Center with Flow 1 notifications */}
        {isStep19 && (
            <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] max-h-[85vh] lg:w-[600px] p-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">
                    {/* Header */}
                    <div className="px-5 pt-5 pb-3 shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Action Center</h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 font-bold">Flow 1</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                    <MagnifyingGlassIcon className="w-5 h-5" />
                                </button>
                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <FilterTabs tabs={flow1Tabs} activeTab="all" onTabChange={() => {}} />
                    </div>

                    {/* Flow 1 — Single focused notification */}
                    <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-4 space-y-3 scrollbar-minimal">
                        {FLOW1_NOTIFICATIONS.map((notification) => (
                            <div key={notification.id} className="animate-in fade-in slide-in-from-top-2 duration-500">
                                <NotificationItem
                                    notification={notification}
                                    onActionClick={(action) => {
                                        if (action === 'View PO') nextStep();
                                    }}
                                />
                            </div>
                        ))}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            1 action
                        </p>
                        <p className="text-xs font-bold text-green-500 flex items-center gap-1.5">
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            PO generated
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* BFI Step a1.1: Always-visible Action Center — Miller Knoll quote request */}
        {isStepA11 && !a11PanelClosed && notifDelayReady && (
            <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] max-h-[85vh] lg:w-[600px] p-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">

                    {/* Header */}
                    <div className="px-5 pt-5 pb-3 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Action Center</h3>
                                {a11IngestState === 'idle' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 text-foreground font-bold">1 new</span>
                                )}
                                {a11IngestState === 'ingesting' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-ai/15 text-ai font-bold animate-pulse">Ingesting…</span>
                                )}
                                {a11IngestState === 'ready' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-bold">Ready</span>
                                )}
                            </div>
                            {a11IngestState === 'idle' && (
                                <button onClick={() => setA11PanelClosed(true)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Body — depends on ingest state */}
                    <div className="px-5 pb-5 space-y-3">

                        {/* idle: original notification card */}
                        {a11IngestState === 'idle' && (
                            <div className="relative rounded-2xl ring-2 ring-primary shadow-lg shadow-primary/20 animate-in fade-in duration-500">
                                <span className="absolute -top-2 right-4 text-[9px] font-black text-primary-foreground bg-primary px-2 py-0.5 rounded-full shadow-sm z-10">
                                    INCOMING
                                </span>
                                <NotificationItem
                                    notification={BFI_A11_NOTIFICATIONS[0]}
                                    onActionClick={(action) => {
                                        if (action === 'Ingest with Strata') handleA11Ingest()
                                    }}
                                />
                            </div>
                        )}

                        {/* ingesting: processing animation */}
                        {a11IngestState === 'ingesting' && (
                            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-border p-5 space-y-4 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-ai/10 flex items-center justify-center shrink-0">
                                        <SparklesIcon className="w-4 h-4 text-ai animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Ingesting with Strata AI…</p>
                                        <p className="text-[11px] text-muted-foreground">DOE-2847 · Miller Knoll quote</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {A11_INGEST_LINES.slice(0, a11IngestCount).map((line, i) => (
                                        <div key={i} className={`flex items-center gap-2 text-[11px] animate-in fade-in duration-300 ${line.isWarning ? 'text-warning' : 'text-success'}`}>
                                            {line.isWarning
                                                ? <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                                                : <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                                            }
                                            {line.text}
                                        </div>
                                    ))}
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-ai rounded-full transition-all duration-700"
                                        style={{ width: `${Math.round((a11IngestCount / A11_INGEST_LINES.length) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ready: email detail + all lines + Review Order button */}
                        {a11IngestState === 'ready' && (
                            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-border overflow-hidden animate-in fade-in duration-400">
                                {/* Email header */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                                    <SparklesIcon className="w-4 h-4 text-ai shrink-0" />
                                    <span className="text-sm font-semibold text-foreground flex-1">New quote request · Miller Knoll</span>
                                    <span className="text-[10px] text-muted-foreground shrink-0">May 6 · 8:14 AM</span>
                                </div>
                                {/* Email meta */}
                                <div className="px-4 py-3 space-y-1 border-b border-border">
                                    {[
                                        { label: 'From', value: 'Robert Chen · Miller Knoll Rep' },
                                        { label: 'Re',   value: 'DOE-2847 · NYC Dept. of Education · quote request' },
                                    ].map(f => (
                                        <div key={f.label} className="flex gap-2 text-[11px]">
                                            <span className="text-muted-foreground w-8 shrink-0">{f.label}</span>
                                            <span className="text-foreground font-medium">{f.value}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Attachments */}
                                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Attachments:</span>
                                    <span className="flex items-center gap-1 text-[10px] text-ai font-medium px-2 py-0.5 rounded bg-ai/10 border border-ai/20">
                                        <DocumentTextIcon className="w-3 h-3" /> DOE-2847.sif
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground px-2 py-0.5 rounded bg-muted/40 border border-border">
                                        <DocumentTextIcon className="w-3 h-3" /> NYC-DOE-2847-specs.pdf
                                    </span>
                                </div>
                                {/* AI results */}
                                <div className="px-4 py-3 border-b border-border space-y-2">
                                    {A11_INGEST_LINES.map((line, i) => (
                                        <div key={i} className={`flex items-center gap-2 text-[11px] ${line.isWarning ? 'text-warning' : 'text-success'}`}>
                                            {line.isWarning
                                                ? <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                                                : <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                                            }
                                            {line.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {a11IngestState === 'idle' && (
                        <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">1 action</p>
                            <p className="text-xs font-bold text-ai flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
                                Awaiting ingest
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* BFI Steps a1.2d / a1.2e / a1.2f / a1.3b: Generic incoming-event notification panel */}
        {isBfiStepActive && bfiStepConfig && (
            <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] lg:w-[520px] z-50 animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden">

                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Action Center</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                bfiStepConfig.badgeColor === 'warning' ? 'bg-warning/15 text-warning' :
                                bfiStepConfig.badgeColor === 'success' ? 'bg-success/15 text-success' :
                                'bg-foreground/10 text-foreground'
                            }`}>{bfiStepConfig.badge}</span>
                        </div>
                        <button onClick={() => setBfiPanelClosed(true)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 pb-5">
                        <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-border overflow-hidden">
                            {/* Email subject line */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                                <SparklesIcon className="w-4 h-4 text-ai shrink-0" />
                                <span className="text-sm font-semibold text-foreground flex-1">{bfiStepConfig.title}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">May 6 · 9:30 AM</span>
                            </div>
                            {/* Email meta */}
                            <div className="px-4 py-3 border-b border-border space-y-1">
                                <div className="flex gap-2 text-[11px]">
                                    <span className="text-muted-foreground w-10 shrink-0">From</span>
                                    <span className="text-foreground font-medium">{bfiStepConfig.sender}</span>
                                </div>
                                {bfiStepConfig.re ? (
                                    <div className="flex gap-2 text-[11px]">
                                        <span className="text-muted-foreground w-10 shrink-0">Re</span>
                                        <span className="text-foreground">{bfiStepConfig.re}</span>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 text-[11px]">
                                        <span className="text-muted-foreground w-10 shrink-0">Info</span>
                                        <span className="text-foreground">{bfiStepConfig.desc}</span>
                                    </div>
                                )}
                            </div>
                            {/* Attachment chip — only when present */}
                            {bfiStepConfig.attachment && (
                                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide shrink-0">Attachment:</span>
                                    <span className="flex items-center gap-1 text-[10px] text-success font-medium px-2 py-0.5 rounded bg-success/10 border border-success/20">
                                        <DocumentTextIcon className="w-3 h-3" /> {bfiStepConfig.attachment}
                                    </span>
                                </div>
                            )}
                            {/* Body excerpt — shown only when re is present (full email style) */}
                            {bfiStepConfig.re && (
                                <div className="px-4 py-3 border-b border-border">
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">{bfiStepConfig.desc}</p>
                                </div>
                            )}
                            <div className="px-4 py-4">
                                <button
                                    onClick={() => {
                                        setBfiPanelClosed(true);
                                        window.dispatchEvent(new CustomEvent(bfiStepConfig.event));
                                    }}
                                    className="w-full py-2.5 text-[12px] font-black rounded-xl bg-foreground text-background hover:opacity-80 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                    {bfiStepConfig.cta}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">1 action</p>
                        <p className="text-xs font-bold text-ai flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
                            {bfiStepConfig.footerText}
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Officeworks Step sc1.0: MANATT intake · ingesting animation (parallel to BFI a1.1) */}
        {isStepSc10 && !sc10PanelClosed && notifDelayReady && (
            <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] max-h-[85vh] lg:w-[600px] p-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">

                    {/* Header */}
                    <div className="px-5 pt-5 pb-3 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Action Center</h3>
                                {sc10IngestState === 'idle' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 text-foreground font-bold">1 new</span>
                                )}
                                {sc10IngestState === 'ingesting' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-ai/15 text-ai font-bold animate-pulse">Ingesting…</span>
                                )}
                                {sc10IngestState === 'ready' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-bold">Ready</span>
                                )}
                            </div>
                            {sc10IngestState === 'idle' && (
                                <button onClick={() => setSc10PanelClosed(true)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Body — depends on ingest state */}
                    <div className="px-5 pb-5 space-y-3">

                        {/* idle: incoming notification card */}
                        {sc10IngestState === 'idle' && (
                            <div className="relative rounded-2xl ring-2 ring-primary shadow-lg shadow-primary/20 animate-in fade-in duration-500">
                                <span className="absolute -top-2 right-4 text-[9px] font-black text-primary-foreground bg-primary px-2 py-0.5 rounded-full shadow-sm z-10">
                                    INCOMING
                                </span>
                                <NotificationItem
                                    notification={OFFICEWORKS_SC10_NOTIFICATIONS[0]}
                                    onActionClick={(action) => {
                                        if (action === 'Ingest with Strata') handleSc10Ingest()
                                    }}
                                />
                            </div>
                        )}

                        {/* ingesting: processing animation */}
                        {sc10IngestState === 'ingesting' && (
                            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-border p-5 space-y-4 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-ai/10 flex items-center justify-center shrink-0">
                                        <SparklesIcon className="w-4 h-4 text-ai animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Ingesting with Strata AI…</p>
                                        <p className="text-[11px] text-muted-foreground">MANATT 4th Floor · Caitlin Barolet intake</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {SC10_INGEST_LINES.slice(0, sc10IngestCount).map((line, i) => (
                                        <div key={i} className={`flex items-center gap-2 text-[11px] animate-in fade-in duration-300 ${line.isWarning ? 'text-warning' : 'text-success'}`}>
                                            {line.isWarning
                                                ? <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                                                : <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                                            }
                                            {line.text}
                                        </div>
                                    ))}
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-ai rounded-full transition-all duration-700"
                                        style={{ width: `${Math.round((sc10IngestCount / SC10_INGEST_LINES.length) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ready: email detail + all results */}
                        {sc10IngestState === 'ready' && (
                            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-border overflow-hidden animate-in fade-in duration-400">
                                {/* Email header */}
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                                    <SparklesIcon className="w-4 h-4 text-ai shrink-0" />
                                    <span className="text-sm font-semibold text-foreground flex-1">New project intake · MANATT 4th Floor</span>
                                    <span className="text-[10px] text-muted-foreground shrink-0">May 6 · 9:42 AM</span>
                                </div>
                                {/* Email meta */}
                                <div className="px-4 py-3 space-y-1 border-b border-border">
                                    {[
                                        { label: 'From', value: 'Caitlin Barolet · MANATT (DC)' },
                                        { label: 'Re',   value: 'MANATT 4th Floor build-out · Works form submission' },
                                    ].map(f => (
                                        <div key={f.label} className="flex gap-2 text-[11px]">
                                            <span className="text-muted-foreground w-8 shrink-0">{f.label}</span>
                                            <span className="text-foreground font-medium">{f.value}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Attachments */}
                                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Attachments:</span>
                                    <span className="flex items-center gap-1 text-[10px] text-ai font-medium px-2 py-0.5 rounded bg-ai/10 border border-ai/20">
                                        <DocumentTextIcon className="w-3 h-3" /> Works_form_MANATT_4F.pdf
                                    </span>
                                    <span className="flex items-center gap-1 text-[10px] text-warning font-medium px-2 py-0.5 rounded bg-warning/10 border border-warning/20">
                                        <ExclamationTriangleIcon className="w-3 h-3" /> CAD missing
                                    </span>
                                </div>
                                {/* AI results */}
                                <div className="px-4 py-3 border-b border-border space-y-2">
                                    {SC10_INGEST_LINES.map((line, i) => (
                                        <div key={i} className={`flex items-center gap-2 text-[11px] ${line.isWarning ? 'text-warning' : 'text-success'}`}>
                                            {line.isWarning
                                                ? <ExclamationTriangleIcon className="w-3.5 h-3.5 shrink-0" />
                                                : <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                                            }
                                            {line.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {sc10IngestState === 'idle' && (
                        <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">1 action</p>
                            <p className="text-xs font-bold text-ai flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
                                Awaiting ingest
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Officeworks Step sc1.0b: Caitlin replied · CAD + SQ arrived (parallel to sc1.0) */}
        {isStepSc10b && !sc10bPanelClosed && notifDelayReady && (
            <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] max-h-[85vh] lg:w-[600px] p-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">

                    {/* Header */}
                    <div className="px-5 pt-5 pb-3 shrink-0">
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Action Center</h3>
                                {sc10bIngestState === 'idle' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/10 text-foreground font-bold">1 new · reply</span>
                                )}
                                {sc10bIngestState === 'ingesting' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-ai/15 text-ai font-bold animate-pulse">Reading reply…</span>
                                )}
                                {sc10bIngestState === 'ready' && (
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 text-success font-bold">Ready</span>
                                )}
                            </div>
                            {sc10bIngestState === 'idle' && (
                                <button onClick={() => setSc10bPanelClosed(true)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Body — depends on ingest state */}
                    <div className="px-5 pb-5 space-y-3">

                        {/* idle: incoming reply notification */}
                        {sc10bIngestState === 'idle' && (
                            <div className="relative rounded-2xl ring-2 ring-success shadow-lg shadow-success/20 animate-in fade-in duration-500">
                                <span className="absolute -top-2 right-4 text-[9px] font-black text-success-foreground bg-success px-2 py-0.5 rounded-full shadow-sm z-10">
                                    REPLY
                                </span>
                                <NotificationItem
                                    notification={OFFICEWORKS_SC10B_NOTIFICATIONS[0]}
                                    onActionClick={(action) => {
                                        if (action === 'Open reply') handleSc10bIngest()
                                    }}
                                />
                            </div>
                        )}

                        {/* reading: progressive bullets */}
                        {sc10bIngestState === 'ingesting' && (
                            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-border p-5 space-y-4 animate-in fade-in duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="h-9 w-9 rounded-xl bg-success/10 flex items-center justify-center shrink-0">
                                        <SparklesIcon className="w-4 h-4 text-success animate-pulse" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-foreground">Reading Caitlin's reply…</p>
                                        <p className="text-[11px] text-muted-foreground">MANATT 4th Floor · CAD + SQ verification</p>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    {SC10B_INGEST_LINES.slice(0, sc10bIngestCount).map((line, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[11px] text-success animate-in fade-in duration-300">
                                            <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                                            {line.text}
                                        </div>
                                    ))}
                                </div>
                                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-success rounded-full transition-all duration-700"
                                        style={{ width: `${Math.round((sc10bIngestCount / SC10B_INGEST_LINES.length) * 100)}%` }}
                                    />
                                </div>
                            </div>
                        )}

                        {/* ready: reply detail card */}
                        {sc10bIngestState === 'ready' && (
                            <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-border overflow-hidden animate-in fade-in duration-400">
                                <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                                    <SparklesIcon className="w-4 h-4 text-success shrink-0" />
                                    <span className="text-sm font-semibold text-foreground flex-1">Re: MANATT 4th Floor · clarification (CAD + SQ attached)</span>
                                    <span className="text-[10px] text-muted-foreground shrink-0">2026-04-17 · 11:08 AM</span>
                                </div>
                                <div className="px-4 py-3 space-y-1 border-b border-border">
                                    {[
                                        { label: 'From', value: 'Caitlin Barolet · MANATT (DC)' },
                                        { label: 'Re',   value: 'MANATT 4th Floor · clarification needed · CAD file + SQ number' },
                                    ].map(f => (
                                        <div key={f.label} className="flex gap-2 text-[11px]">
                                            <span className="text-muted-foreground w-8 shrink-0">{f.label}</span>
                                            <span className="text-foreground font-medium">{f.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2 flex-wrap">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Attachments:</span>
                                    <span className="flex items-center gap-1 text-[10px] text-success font-medium px-2 py-0.5 rounded bg-success/10 border border-success/20">
                                        <DocumentTextIcon className="w-3 h-3" /> manatt-4th-floor.dwg · 4.8 MB
                                    </span>
                                </div>
                                <div className="px-4 py-3 space-y-2">
                                    {SC10B_INGEST_LINES.map((line, i) => (
                                        <div key={i} className="flex items-center gap-2 text-[11px] text-success">
                                            <CheckCircleIcon className="w-3.5 h-3.5 shrink-0" />
                                            {line.text}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {sc10bIngestState === 'idle' && (
                        <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">1 action</p>
                            <p className="text-xs font-bold text-success flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                                Awaiting open
                            </p>
                        </div>
                    )}
                </div>
            </div>
        )}

        {/* Officeworks Steps sc1.1 .. sc1.9: Generic incoming-event notification panel */}
        {isOwStepActive && owStepConfig && (
            <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] lg:w-[520px] z-50 animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden">

                    {/* Header */}
                    <div className="px-5 pt-5 pb-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Action Center</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                owStepConfig.badgeColor === 'warning' ? 'bg-warning/15 text-warning' :
                                owStepConfig.badgeColor === 'success' ? 'bg-success/15 text-success' :
                                'bg-foreground/10 text-foreground'
                            }`}>{owStepConfig.badge}</span>
                        </div>
                        <button onClick={() => setOwPanelClosed(true)} className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="px-5 pb-5">
                        <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-800 border border-border overflow-hidden">
                            {/* Email subject line */}
                            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
                                <SparklesIcon className="w-4 h-4 text-ai shrink-0" />
                                <span className="text-sm font-semibold text-foreground flex-1">{owStepConfig.title}</span>
                                <span className="text-[10px] text-muted-foreground shrink-0">May 6 · 9:30 AM</span>
                            </div>
                            {/* Email meta */}
                            <div className="px-4 py-3 border-b border-border space-y-1">
                                <div className="flex gap-2 text-[11px]">
                                    <span className="text-muted-foreground w-10 shrink-0">From</span>
                                    <span className="text-foreground font-medium">{owStepConfig.sender}</span>
                                </div>
                                {owStepConfig.re ? (
                                    <div className="flex gap-2 text-[11px]">
                                        <span className="text-muted-foreground w-10 shrink-0">Re</span>
                                        <span className="text-foreground">{owStepConfig.re}</span>
                                    </div>
                                ) : (
                                    <div className="flex gap-2 text-[11px]">
                                        <span className="text-muted-foreground w-10 shrink-0">Info</span>
                                        <span className="text-foreground">{owStepConfig.desc}</span>
                                    </div>
                                )}
                            </div>
                            {/* Attachment chip */}
                            {owStepConfig.attachment && (
                                <div className="px-4 py-2.5 border-b border-border flex items-center gap-2">
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide shrink-0">Attachment:</span>
                                    <span className="flex items-center gap-1 text-[10px] text-success font-medium px-2 py-0.5 rounded bg-success/10 border border-success/20">
                                        <DocumentTextIcon className="w-3 h-3" /> {owStepConfig.attachment}
                                    </span>
                                </div>
                            )}
                            {/* Body excerpt */}
                            {owStepConfig.re && (
                                <div className="px-4 py-3 border-b border-border">
                                    <p className="text-[11px] text-muted-foreground leading-relaxed">{owStepConfig.desc}</p>
                                </div>
                            )}
                            <div className="px-4 py-4">
                                <button
                                    onClick={() => {
                                        setOwPanelClosed(true);
                                        window.dispatchEvent(new CustomEvent(owStepConfig.event));
                                    }}
                                    className="w-full py-2.5 text-[12px] font-black rounded-xl bg-foreground text-background hover:opacity-80 transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
                                >
                                    {owStepConfig.cta}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">1 action</p>
                        <p className="text-xs font-bold text-ai flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-ai animate-pulse" />
                            {owStepConfig.footerText}
                        </p>
                    </div>
                </div>
            </div>
        )}

        {/* Step 2.6: Always-visible Action Center with Flow 2 Acknowledgement notifications */}
        {isStep27 && (
            <div className={clsx("fixed top-[90px] -translate-x-1/2 w-[95vw] max-h-[85vh] lg:w-[600px] p-0 z-50 animate-in fade-in slide-in-from-top-2 duration-300", sidebarExpanded ? 'left-[calc(50%+10rem)]' : 'left-1/2')}>
                <div className="bg-zinc-100 dark:bg-zinc-900/85 backdrop-blur-xl border border-border shadow-2xl rounded-3xl overflow-hidden flex flex-col max-h-[80vh]">
                    {/* Header */}
                    <div className="px-5 pt-5 pb-3 shrink-0">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Action Center</h3>
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400 font-bold">Flow 2</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                    <MagnifyingGlassIcon className="w-5 h-5" />
                                </button>
                                <button className="p-1 rounded-full hover:bg-black/5 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400 transition-colors">
                                    <XMarkIcon className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        <FilterTabs tabs={flow2Tabs} activeTab="all" onTabChange={() => {}} />
                    </div>

                    {/* Flow 2 Notifications */}
                    <div className="flex-1 overflow-y-auto min-h-0 px-5 pb-4 space-y-3 scrollbar-minimal">
                        {FLOW2_NOTIFICATIONS.map((notification, i) => {
                            const isCRMSync = notification.id === 'f2-crm-sync';
                            const isDelivered = notifDelivered27.includes(i);
                            return (
                                <div
                                    key={notification.id}
                                    className={clsx(
                                        "transition-all duration-700",
                                        isDelivered
                                            ? 'opacity-100 translate-y-0'
                                            : 'opacity-0 translate-y-4 h-0 overflow-hidden'
                                    )}
                                >
                                    <div className={clsx(
                                        "relative rounded-2xl transition-all duration-500",
                                        isCRMSync && isDelivered && "ring-2 ring-brand-500 ring-offset-2 dark:ring-offset-zinc-900 shadow-lg shadow-brand-500/20"
                                    )}>
                                        <NotificationItem
                                            notification={notification}
                                            onActionClick={isCRMSync ? () => nextStep() : undefined}
                                        />
                                        {isDelivered && !isCRMSync && (
                                            <span className="absolute top-3 right-3 text-[9px] font-bold text-green-600 dark:text-green-400 flex items-center gap-1 bg-green-50 dark:bg-green-500/10 px-2 py-0.5 rounded-full">
                                                <CheckCircleIcon className="w-3 h-3" /> Delivered
                                            </span>
                                        )}
                                        {isCRMSync && isDelivered && (
                                            <span className="absolute top-3 right-3 text-[9px] font-bold text-brand-700 dark:text-brand-400 flex items-center gap-1 bg-brand-50 dark:bg-brand-500/15 px-2 py-0.5 rounded-full animate-pulse">
                                                Next Step →
                                            </span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* Footer */}
                    <div className="px-5 py-3 border-t border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-black/20 backdrop-blur-md flex items-center justify-between shrink-0">
                        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                            {notifDelivered27.length} actions
                        </p>
                        {notifDelivered27.includes(3) ? (
                            <p className="text-xs font-bold text-brand-600 dark:text-brand-400 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse" />
                                CRM sync ready
                            </p>
                        ) : (
                            <p className="text-xs font-bold text-red-500 flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                                {FLOW2_NOTIFICATIONS.filter(n => n.priority === 'high').length} urgent
                            </p>
                        )}
                    </div>
                </div>
            </div>
        )}
        </>
    );
}
