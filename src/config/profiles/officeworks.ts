// ═══════════════════════════════════════════════════════════════════════════════
// OFFICEWORKS — Officeworks Inc. · Strata AI Spec Check & Design Demo Profile
//
// CLIENT: Officeworks Inc. (Burlington MA · ~181 employees · 10 markets · $100M+
//         Teknion 30-year partner · GSA contract · 2022 Teknion Orion Award)
//
// DEMO PROCESS: Spec Check & Design (Furniture vertical · 30 designers · 3 mgrs)
// PROTAGONIST: Kimberly Tucker (Design Manager · PA/Pittsburgh/Ancillary)
// DEMO CLIENT: MANATT Phelps & Phillips LLP · DC market · price-protected SQ
//
// STRUCTURE: 17 steps mapped from BPMN (12 numbered tasks + 9 sub-steps +
//            13 gateways + 3 end events) in 5 swimlanes
//
//   Group 1 — Intake & Assignment       sc1.0, sc1.0b
//   Group 2 — Design & Validation       sc1.2 (BOM export + send validation), sc1.4 (SQ)
//   Group 3 — Teknion Order Preview     sc1.5, sc1.5b (phasing folded into sc1.5b post-resubmit)
//   Group 4 — Spec Check  ⭐ HEROES     sc1.6 (SC2+SC3), sc1.7 (SC7)
//   Group 5 — Submission & Confirm      sc1.8, sc1.8b, sc1.9 ⭐ (Gemini)
//
// CEO TOP 4 PAIN POINTS (Chris Hanes confirmed):
//   #1 SC2 → sc1.6  |  #2 SC5 → Dashboard
//   #3 SC7 → sc1.7  |  #4 SC6 → Dashboard
// ═══════════════════════════════════════════════════════════════════════════════

import type { DemoStep } from '../demoProfiles';
import type { StepBehavior } from '../../components/demo/DemoStepBanner';

// ─── STEPS ───────────────────────────────────────────────────────────────────

export const OFFICEWORKS_STEPS: DemoStep[] = [

    // ═══════════════════════════════════════════
    // GROUP 1: Intake & Assignment
    // ═══════════════════════════════════════════
    {
        id: 'sc1.0',
        groupId: 1,
        groupTitle: 'Intake & Assignment',
        title: 'Form arrives · review & send clarification',
        description: 'Review the incoming intake form · CAD missing and SQ blank for the GSA price-protected client. Strata drafted the clarifying email · review and send. Designer assignment unlocks once the reply arrives.',
        app: 'officeworks-intake',
        role: 'Design Manager',
        flowId: 'spec-check',
    },
    {
        id: 'sc1.0b',
        groupId: 1,
        groupTitle: 'Intake & Assignment',
        title: 'Reply received · review form & assign designer',
        description: 'Reply received with CAD attached and SQ confirmed · form complete. Review the updated intake and assign a designer · Strata recommends one based on capacity, region and project history.',
        app: 'officeworks-intake',
        role: 'Design Manager',
        flowId: 'spec-check',
    },

    // ═══════════════════════════════════════════
    // GROUP 2: Design & Validation
    // ═══════════════════════════════════════════
    {
        id: 'sc1.2',
        groupId: 2,
        groupTitle: 'Design & Validation',
        title: 'Design BOM + Validation Doc · send for client approval',
        description: 'Three sub-steps · upload the BOM · attach the validation deck · send the proposal for client sign-off.',
        app: 'officeworks-design',
        role: 'Designer',
        flowId: 'spec-check',
    },
    {
        id: 'sc1.4',
        groupId: 2,
        groupTitle: 'Design & Validation',
        title: 'SQ / Price-protected check',
        description: 'Verify the SQ number and confirm the catalog effective date for the price-protected GSA client · Strata embeds the manufacturer platform inline, no context switch.',
        app: 'officeworks-spec-check',
        role: 'Designer',
        flowId: 'spec-check',
    },

    // ═══════════════════════════════════════════
    // GROUP 3: Teknion Order Preview
    // ═══════════════════════════════════════════
    {
        id: 'sc1.5',
        groupId: 3,
        groupTitle: 'Teknion Order Preview',
        title: 'Submit Order Preview via Teknion portal',
        description: 'Submit the Order Preview to the manufacturer portal · BOM auto-fills. Wait for the response (typical 1-2 weeks) and pick the outcome · clean, spec gap, or timeline conflict.',
        app: 'officeworks-spec-check',
        role: 'Design Manager',
        flowId: 'spec-check',
    },
    {
        id: 'sc1.5b',
        groupId: 3,
        groupTitle: 'Teknion Order Preview',
        title: 'Resolve specification gaps',
        description: 'A spec gap is flagged on a line · Strata suggests the fix · accept or edit · BOM revised · resubmit the preview.',
        app: 'officeworks-spec-check',
        role: 'Designer',
        flowId: 'spec-check',
    },
    // ═══════════════════════════════════════════
    // GROUP 4: Spec Check ⭐ HERO FLOWS
    // ═══════════════════════════════════════════
    {
        id: 'sc1.6',
        groupId: 4,
        groupTitle: 'Spec Check',
        title: 'Self-audit BOM × 6 attributes',
        description: 'Run the 5-step audit · Big Picture → Validation Doc → BOM & Drawing → CRs → One Last Check · across 71 lines and 13 CRs. AI cross-references floor plan, validation doc and CR catalog. Today 6h on paper · with Strata 25min.',
        app: 'officeworks-spec-check',
        role: 'Designer',
        flowId: 'spec-check',
    },
    {
        id: 'sc1.7',
        groupId: 4,
        groupTitle: 'Spec Check',
        title: 'Peer review · second designer',
        description: 'A peer designer audits the self-audit · Strata summarizes deltas to focus the review and surfaces tacit-knowledge rules captured from prior projects. Save them to the knowledge base before approving.',
        app: 'officeworks-spec-check',
        role: 'Peer Reviewer',
        flowId: 'spec-check',
    },

    // ═══════════════════════════════════════════
    // GROUP 5: Submission & Confirmation
    // ═══════════════════════════════════════════
    {
        id: 'sc1.8',
        groupId: 5,
        groupTitle: 'Submission & Confirmation',
        title: 'BOM submission email · PDF + SP4',
        description: 'Send the BOM Submission email · BOM PDF and SP4 file attached. Strata pre-validates the SP4 against the ERP schema.',
        app: 'officeworks-submission',
        role: 'Designer',
        flowId: 'spec-check',
    },
    {
        id: 'sc1.8b',
        groupId: 5,
        groupTitle: 'Submission & Confirmation',
        title: 'Coordinator uploads · Salesperson releases PO',
        description: 'Three sequential sub-steps · upload the SP4 to the ERP · apply the discount · review and release the PO to the manufacturer.',
        app: 'officeworks-submission',
        role: 'Sales Coordinator',
        flowId: 'spec-check',
    },
    {
        id: 'sc1.9',
        groupId: 5,
        groupTitle: 'Submission & Confirmation',
        title: 'Acknowledgment review · Gemini supercharge',
        description: 'Open the manufacturer acknowledgment · run the diff scan across 71 lines and 13 CRs · resolve any discrepancy. Three terminal states · Acknowledged, Confirmed, or Held/Canceled.',
        app: 'officeworks-submission',
        role: 'Design Manager',
        flowId: 'spec-check',
    },

    // ═══════════════════════════════════════════════════════════════════════
    // LABOR & DELIVERY ESTIMATION FLOW · parallel to Spec Check & Design
    // ─────────────────────────────────────────────────────────────────────
    // Furniture vertical · Alan McPhee (Sr Operations · Burlington MA) is the
    // operational equivalent of Felicia. Runs the labor RFP to 3 approved DC
    // installers for MANATT 4F while Kimberly's BOM is being designed.
    // BPMN: Furniture path (F1-F6 · V1-V3 · Q0-Q1 · EE1) — 8 steps.
    // ═══════════════════════════════════════════════════════════════════════

    // ─── GROUP 6: RFP Intake ────────────────────────────────────────────────
    {
        id: 'sc-LD.0',
        groupId: 6,
        groupTitle: 'RFP Intake',
        title: 'RFP arrives from GC · acknowledge & route',
        description: 'Labor RFP arrives from the GC via portal · drawings, SIF and cover letter attached. Review attachments and acknowledge · SLA timer (48h) starts. Today RFPs arrive through 7 formats · Strata routes them into one inbox.',
        app: 'officeworks-labor',
        role: 'Sr Operations',
        flowId: 'labor-delivery',
    },
    {
        id: 'sc-LD.1',
        groupId: 6,
        groupTitle: 'RFP Intake',
        title: 'Scope takeoff · AI extraction from drawings',
        description: 'Run AI takeoff on the drawing · Strata surfaces workstations, CRs, labor hours and delivery stops in seconds. Override any value before continuing. Today this is ~2.5h manual count · the single most time-consuming step.',
        app: 'officeworks-labor',
        role: 'Sr Operations',
        flowId: 'labor-delivery',
    },

    // ─── GROUP 7: Building & Workforce Conditions ───────────────────────────
    {
        id: 'sc-LD.2',
        groupId: 7,
        groupTitle: 'Building & Conditions',
        title: 'Assess building & workforce conditions',
        description: 'Assess the 12 building and workforce conditions · freight elevator, dock type, union, OSHA, prevailing wage, equipment. Strata pulls 8 of 12 from the Building KB (5 prior projects at this address) · confirm the 2 medium-confidence items.',
        app: 'officeworks-labor',
        role: 'Sr Operations',
        flowId: 'labor-delivery',
    },

    // ─── GROUP 8: Vendor Bid Request ────────────────────────────────────────
    {
        id: 'sc-LD.3',
        groupId: 8,
        groupTitle: 'Vendor Bid Request',
        title: 'Select installer pool · 3 approved DC vendors',
        description: 'Pick the installer pool · 3 approved vendors surfaced with scorecards. One flagged as capacity-Low (3 active jobs) · one recommended on price, on-time and change-order rate. Confirm the pool.',
        app: 'officeworks-labor',
        role: 'Sr Operations',
        flowId: 'labor-delivery',
    },
    {
        id: 'sc-LD.4',
        groupId: 8,
        groupTitle: 'Vendor Bid Request',
        title: 'Compose & send bid request to 3 installers',
        description: 'Send the bid request to 3 installers · Strata pre-fills scope, drawings, conditions summary and the 48h deadline. Review the 3 pre-flight checks and send. SLA timers start per recipient. Today ~700–900 emails/month manually.',
        app: 'officeworks-labor',
        role: 'Sr Operations',
        flowId: 'labor-delivery',
    },

    // ─── GROUP 9: Bid Evaluation ────────────────────────────────────────────
    {
        id: 'sc-LD.5',
        groupId: 9,
        groupTitle: 'Bid Evaluation',
        title: 'Receive bids · compare vs internal benchmark',
        description: 'Bids arrive staggered · Strata computes the internal benchmark and flags variance per bid (15% threshold). Compare and pick the winner candidate. Today this comparison is mental · no variance detection (DC 2024: $160k → $106k post-rebid).',
        app: 'officeworks-labor',
        role: 'Sr Operations',
        flowId: 'labor-delivery',
    },
    {
        id: 'sc-LD.6',
        groupId: 9,
        groupTitle: 'Bid Evaluation',
        title: 'Select winning installer · notify decisions',
        description: 'Select the winning installer · Strata drafts the 3 notifications (winner + 2 declines). Review and confirm · never auto-send. Today vendor picks are scorecard-free.',
        app: 'officeworks-labor',
        role: 'Sr Operations',
        flowId: 'labor-delivery',
    },

    // ─── GROUP 10: Final Quote Assembly ─────────────────────────────────────
    {
        id: 'sc-LD.7',
        groupId: 10,
        groupTitle: 'Final Quote Assembly',
        title: 'Assemble final quote · upload to GC portal',
        description: 'Three sequential sub-steps · apply the margin to the vendor net · preview Excel cells with cell-level audit · upload the final quote to the GC portal. Today this is manual copy-validate-re-enter with formula errors in both files.',
        app: 'officeworks-labor',
        role: 'Sr Operations',
        flowId: 'labor-delivery',
    },

    // ═══════════════════════════════════════════════════════════════════════
    // SALES FLOW · parallel to Spec Check and L&D
    // ─────────────────────────────────────────────────────────────────────
    // Sales Lead protagonist · Mid-Atlantic · Furniture + Walls. Anchored on
    // AS-IS painpoints S3 (email overload 150-200/day · confirmed lost deals),
    // S9 (multi-channel chaos), S7 (Works form 75-80% incomplete · no SLA),
    // SC5 (capacity self-reported). 8 steps · triage → assignment → close.
    // ═══════════════════════════════════════════════════════════════════════

    // ─── GROUP 11: Inbox Triage & Opportunity Intake ────────────────────────
    {
        id: 'sc-S.0',
        groupId: 11,
        groupTitle: 'Inbox Triage & Intake',
        title: 'Unified inbox triage · multi-channel feed',
        description: 'Inbound across email · Teams · GC portals lands in one queue. Strata classifies each thread (action · FYI · urgent), dedups cross-channel duplicates and scores urgency. Today the Sales Lead opens 3 inboxes in parallel · 150-200 emails/day · confirmed lost deals.',
        app: 'officeworks-sales',
        role: 'Sales Lead',
        flowId: 'sales',
    },
    {
        id: 'sc-S.1',
        groupId: 11,
        groupTitle: 'Inbox Triage & Intake',
        title: 'Opportunity intake · pre-flight check',
        description: 'Convert a triaged signal into a structured opp record. Strata extracts company · project size · budget hint from the thread and flags missing Works-form fields BEFORE submit. Today ~75-80% of Works forms arrive incomplete · 2-4 design revisions per project as a result.',
        app: 'officeworks-sales',
        role: 'Sales Lead',
        flowId: 'sales',
    },

    // ─── GROUP 12: Capacity Check & Rep Assignment ──────────────────────────
    {
        id: 'sc-S.2',
        groupId: 12,
        groupTitle: 'Capacity & Assignment',
        title: 'Rep capacity ledger · live load view',
        description: 'See every rep · open opportunities · pipeline value · quota progress · prior wins with this account. Strata pulls the ledger from Copper events (read-only mock). Today capacity is self-reported Thursdays in a spreadsheet · revisions and rework never enter it.',
        app: 'officeworks-sales',
        role: 'Sales Lead',
        flowId: 'sales',
    },
    {
        id: 'sc-S.3',
        groupId: 12,
        groupTitle: 'Capacity & Assignment',
        title: 'Handoff briefing · accept assignment',
        description: 'Strata briefs you on the assigned opp · why you were picked · what was extracted from the inbox · the SLA gates. Accept assignment to start qualification. Priority opps trigger expedited SLAs (12h / 24h).',
        app: 'officeworks-sales',
        role: 'Sales Rep · DC + NoVA',
        flowId: 'sales',
    },

    // ─── GROUP 13: Discovery & Multi-Channel Outreach ───────────────────────
    {
        id: 'sc-S.4',
        groupId: 13,
        groupTitle: 'Discovery & Outreach',
        title: 'Discovery & qualification checklist',
        description: 'Log discovery notes against a BANT + MEDDIC template. Strata auto-summarizes the email thread into the template and flags missing fields. Today salespeople guess at client requirements · named root cause of the 2-4 design revision cycles.',
        app: 'officeworks-sales',
        role: 'Sales Rep · DC + NoVA',
        flowId: 'sales',
    },
    {
        id: 'sc-S.5',
        groupId: 13,
        groupTitle: 'Discovery & Outreach',
        title: 'Multi-channel outreach draft',
        description: 'Compose follow-up across email · Teams · SMS in one composer. Strata pre-fills from discovery and suggests the channel-of-record. Drafts only · never auto-send. Today the same request hits 3 channels · reps must monitor all of them.',
        app: 'officeworks-sales',
        role: 'Sales Rep · DC + NoVA',
        flowId: 'sales',
    },

    // ─── GROUP 14: Proposal & Close ─────────────────────────────────────────
    {
        id: 'sc-S.6',
        groupId: 14,
        groupTitle: 'Proposal & Close',
        title: 'Proposal assembly · BOM + labor + pricing',
        description: 'Pull the Spec Check BOM + L&D labor quote + NetSuite price catalog into a single proposal · PDF preview + draft email. Today this is ~6 hours of stops-and-starts pasted from Ignite folders into Word and Excel.',
        app: 'officeworks-sales',
        role: 'Sales Rep · DC + NoVA',
        flowId: 'sales',
    },
    {
        id: 'sc-S.7',
        groupId: 14,
        groupTitle: 'Proposal & Close',
        title: 'Close + auto-handoff to Ops',
        description: 'Mark win/loss · Strata builds the post-award handoff packet (Works post-award form + NetSuite SO + Ignite folder access) and routes to Spec Check or L&D. Today the post-award handoff is at minimum 2 separate manual steps · the coordinator NetSuite action is routinely missed.',
        app: 'officeworks-sales',
        role: 'Sales Rep · DC + NoVA',
        flowId: 'sales',
    },

];

// ─── STEP BEHAVIOR (presenter guide · action-forward) ────────────────────────

export const OFFICEWORKS_STEP_BEHAVIOR: Record<string, StepBehavior> = {
    'sc1.0':  { mode: 'interactive', userAction: 'Open the notification · review the form · send the clarification email' },
    'sc1.0b': { mode: 'interactive', userAction: 'Open the reply notification · review the completed form · approve and assign the designer' },
    'sc1.2':  { mode: 'interactive', userAction: '(1) Drop the BOM · review the 3 findings · (2) Attach the validation deck · (3) Send the proposal for client approval' },
    'sc1.4':  { mode: 'interactive', userAction: 'Open the manufacturer platform inline · verify the SQ # and the catalog year' },
    'sc1.5':  { mode: 'interactive', userAction: 'Submit the Order Preview · wait for the response · pick the outcome (clean / spec gap / timeline conflict)' },
    'sc1.5b': { mode: 'interactive', userAction: 'Accept the spec gap fix · resubmit the preview' },
    'sc1.6':  { mode: 'interactive', userAction: 'Toggle Current State → Strata · run the 5-step audit · resolve issues · send to peer' },
    'sc1.7':  { mode: 'interactive', userAction: 'Read the peer annotations · save the tacit-knowledge rules · approve · send BOM submission' },
    'sc1.8':  { mode: 'interactive', userAction: 'Review the BOM Submission email · send to the client and coordinator' },
    'sc1.8b': { mode: 'interactive', userAction: 'Watch the ERP upload + discount · release the PO to the manufacturer' },
    'sc1.9':  { mode: 'interactive', userAction: 'Open the real PO acknowledgment · run the diff · resolve any discrepancy · pick terminal state (Confirmed / Held)' },

    // ─── L&D flow ───────────────────────────────────────────────────────────
    'sc-LD.0': { mode: 'interactive', userAction: 'Expand the 3 attachments · acknowledge & route the RFP · SLA 48h starts' },
    'sc-LD.1': { mode: 'interactive', userAction: 'Run AI takeoff on the drawing · review the 4 metrics · override the workstation count if needed' },
    'sc-LD.2': { mode: 'interactive', userAction: 'Review the 12 conditions · confirm the 2 medium-confidence items · save to project' },
    'sc-LD.3': { mode: 'interactive', userAction: 'Review the 3 approved installers · keep / deselect · send bid request to N' },
    'sc-LD.4': { mode: 'interactive', userAction: 'Review the email + 3 pre-flight checks · send to 3 installers' },
    'sc-LD.5': { mode: 'interactive', userAction: 'Watch the 3 bids arrive · review variance vs internal benchmark · proceed to selection' },
    'sc-LD.6': { mode: 'interactive', userAction: 'Select the recommended installer · review the 3 email drafts · confirm winner' },
    'sc-LD.7': { mode: 'interactive', userAction: '(1) Set the margin · (2) approve Excel cells · (3) upload to the GC portal' },

    // ─── Sales flow ─────────────────────────────────────────────────────────
    'sc-S.0': { mode: 'interactive', userAction: 'Review the 12 inbound threads · keep / FYI / urgent · open one to triage' },
    'sc-S.1': { mode: 'interactive', userAction: 'Open the new opp · accept Strata extraction · resolve missing-field flags · save record' },
    'sc-S.2': { mode: 'interactive', userAction: 'Review the rep capacity ledger · drill into a rep if overloaded' },
    'sc-S.3': { mode: 'interactive', userAction: 'Pick the recommended rep · confirm SLA targets · start the timer' },
    'sc-S.4': { mode: 'interactive', userAction: 'Accept the Strata discovery summary · resolve BANT + MEDDIC missing fields · save' },
    'sc-S.5': { mode: 'interactive', userAction: 'Pick the channel (email / Teams / SMS) · review the draft · queue for send' },
    'sc-S.6': { mode: 'interactive', userAction: 'Review the assembled proposal · PDF + quote line items · approve the draft email' },
    'sc-S.7': { mode: 'interactive', userAction: 'Mark win/loss · review the handoff packet · route to Spec Check or L&D' },
};

// ─── STEP MESSAGES (AI agent progress · short, status-style) ─────────────────

export const OFFICEWORKS_STEP_MESSAGES: Record<string, string[]> = {
    'sc1.0': [
        'Form received · MANATT 4th Floor · DC market',
        'Scanning attachments · CAD file required: not found',
        'GSA client detected · SQ number required: not provided',
        'Drafting clarification email back to Caitlin Barolet',
        'Designer assignment blocked until reply with CAD + SQ',
    ],
    'sc1.0b': [
        'Reply received from Caitlin Barolet · 2026-04-17 11:08',
        'CAD attachment parsed · manatt-4th-floor.dwg · 4.8 MB',
        'SQ #436533 confirmed · GSA price-protected · catalog 2025',
        'Form completeness · all required fields satisfied',
        'Pulling designer capacity across 3 regions',
        'Cross-referencing prior MANATT assignments',
    ],
    'sc1.2': [
        'Designer building BOM externally in CET / CAP',
        'Capacity ledger · CET session opened · +6h committed to Kimberly',
        'BOM uploaded · parsing PDF · 149 line items · 15 pages · Teknion T25',
        '11 areas tagged · 22 Custom Requests flagged for spec-check',
        '1 finish inconsistency surfaced · Item 73 · XS vs area XG Very White',
        'Pricing parsed · $1,541,392 List · AI Validator queued · 894 checks',
        'Validation deck attached · MANATT-Validation-Doc-v1.pptx · 24 slides',
        'Strata read 6 sections · floor plan · 2D · 3D · finishes · wire mgmt · electrical',
        'Proposal sent to Caitlin Barolet · BOM PDF + Validation Doc attached',
        'GW2A gate · SQ + Teknion submission blocked until client sign-off',
        'Felicia Miano-Poles approved · proposal locked · proceed to SQ check',
    ],
    'sc1.4': [
        'GW2C: client = MANATT · GSA contract · SQ required',
        'Opening Create platform inline · NO context switch',
        'SQ #436533 confirmed · price-protected effective 2025',
        'PZ Description column verified vs current catalog',
    ],
    'sc1.5': [
        'Filling Teknion Order Preview form · auto-from BOM',
        'Submitting to Tifani · awaiting response (1-2 weeks)',
        'Order preview #OP-2025-0001605 returned',
        'GW3: timeline conflict detected on 40-day CRs',
    ],
    'sc1.5b': [
        'Highlighting spec gap on line · CR 2046138 leadtime',
        'Drafting fix · phasing recommendation',
        'BOM revised · resubmitting preview',
    ],
    'sc1.6': [
        'AUDIT: assumption that errors WILL exist · find them!',
        'Step 1 Big Picture · DC market · OWDC electrical req',
        'Step 2 Validation Doc · 2D/3D match floor plan · finishes OK',
        'Step 3 BOM × 6 attrs across 71 lines · 8 sub-categories',
        'Step 4 CRs in Create · 13 CRs · CR 2075919 BIFMA advisory',
        'Step 5 final check · 0 $0-list · catalogs current · aisle code OK',
        'Self-audit complete · 3 issues resolved · ready for peer review',
    ],
    'sc1.7': [
        'Peer assigned: Rebecca Warren (MA/NY/NJ)',
        'Delta summary: focus on CRs + electrical layout',
        'Strata surfaced: District inset glass should be 6mm (from Felicia\'s history)',
        'Strata surfaced: Leverage NO field cut metal fascia (from Felicia\'s history)',
        '2 new rules saved to Officeworks knowledge base',
        'Peer audit complete · BOM approved · send submission',
    ],
    'sc1.8': [
        'Drafting BOM Submission email · standard template',
        'Attaching BOM PDF + SP4 file',
        'Pre-validating SP4 vs NetSuite schema',
        'Sent to Caitlin Barolet + Sales Coordinator',
    ],
    'sc1.8b': [
        'Coordinator: uploading SP4 to NetSuite · 4 min',
        'Coordinator: applying discount · 79% off list',
        'Salesperson Caitlin: reviewing PO',
        'PO released to Teknion · PO-DC-0009642 generated',
    ],
    'sc1.9': [
        'Acknowledgment received · Universal #2-10468963',
        'Loading real PO-DC-0009642.pdf · 11 pages',
        'Gemini cross-reference: 71 lines · 13 CRs',
        'Diff scan: line 6 part # variant · within spec',
        'GW6: 70/71 lines match · 1 discrepancy on shipping date',
        'Drafting Change Order to tekco1@teknion.com',
    ],

    // ─── L&D flow messages ──────────────────────────────────────────────────
    'sc-LD.0': [
        'RFP received · MANATT 4F · CBRE via Building Connected',
        '3 attachments detected · manatt-4th-floor.dwg + 2 PDFs',
        'GC contact: Jonathan Spence · jonathan.spence@cbre.com',
        'SLA deadline: 2026-05-14 09:14 · 48h MSA window',
        'Routing to Alan McPhee · Sr Operations · DC market',
    ],
    'sc-LD.1': [
        'Reading manatt-4th-floor.dwg · 4,820 entities parsed',
        'Detecting workstations · 127 found',
        'Detecting CRs · 18 found · matching Spec Check BOM',
        'Estimating labor hours · 320 h at MSA blended rate',
        'Detecting delivery stops · 2 stops · 18 KB cluster',
    ],
    'sc-LD.2': [
        'Pulling building conditions from KB · 1551 K St NW',
        '5 prior projects at this address · 8 high-confidence',
        '2 medium-confidence pending Alan confirm',
        'Union: Yes · IBEW Local 26 · straight-time only',
        '12/12 conditions captured · saving to project record',
    ],
    'sc-LD.3': [
        'DC installer pool consolidated May/2026 · 3 approved',
        'Pinnacle: capacity Low (3 active jobs) · flag for review',
        'Northeast: available · standard MSA rate',
        'TriState: high headroom · 96% on-time · 2% CO rate',
        'Strata recommends TriState · awaiting Alan confirm',
    ],
    'sc-LD.4': [
        'Drafting bid request email · scope + conditions summary',
        'Attachments: 3 files · drawings + conditions + bid form',
        'Pre-flight: recipients (3) · attachments (3) · deadline OK',
        'Sending to 3 installers · SLA timer per recipient · 48h',
        'Bid request sent · waiting on V001 · V002 · V003',
    ],
    'sc-LD.5': [
        'V001 Pinnacle responded · $21,250 · +11% vs benchmark',
        'V002 Northeast responded · $21,700 · +13% vs benchmark',
        'V003 TriState responded · $20,900 · -4% vs benchmark',
        'GW1 clear · 3/3 bids received within 48h',
        'GW2 clear · all bids within 15% variance threshold',
    ],
    'sc-LD.6': [
        'Strata recommends V003 TriState · price + scorecard',
        'Drafting 3 notification emails · winner + 2 declines',
        'Awaiting Alan confirm · drafts ready for review',
        'V003 selected · winner notification queued for send',
    ],
    'sc-LD.7': [
        'OW margin applied · 18% · vendor net $20,900',
        'Quoted total $24,662 to GC',
        'GC quote template loaded · CBRE-Quote-Template-v3.xlsx',
        'Cell-level audit · B12/B13/B14/D17 populated',
        'IQ ERP-compatible export available · future installer integration',
        'Uploading to GC portal · ref BC-RFP-882041',
        'EE1 · customer quote submitted · 16:42',
    ],

    // ─── Sales flow messages ───────────────────────────────────────────────
    'sc-S.0': [
        '12 inbound threads parsed · email (8) · Teams (3) · portal (1)',
        '2 duplicates surfaced · same MANATT spec question via email + Teams',
        'Intent classification · 4 action · 3 FYI · 5 urgent (SLA-at-risk)',
        'Urgency score · MANATT-4F decision request flagged red · 26h since last touch',
        'Saved to Sales Lead queue · 5 require action today',
    ],
    'sc-S.1': [
        'Opening triaged thread · MANATT-4F · CBRE referral',
        'Auto-extracted · company · est size 120 wks · budget hint $400-600k',
        'Pre-flight check on Works form · 4/9 fields missing (CAD · SQ · scope · timeline)',
        'Flagging missing fields BEFORE Works submit · saves 75-80% incomplete cycle',
        'Opportunity record saved · MANATT-4F · stage 25% · ready to qualify',
    ],
    'sc-S.2': [
        'Pulling rep capacity ledger from Copper events · 5 reps in Mid-Atlantic',
        'Rep A · 67 open opps · $12.4M qualified · 78% quota · 2 prior MANATT wins',
        'Rep B · 84 open opps · OVERLOADED · capacity Low flag',
        'Rep C · 41 open opps · $6.8M qualified · 92% quota · territory match',
        'Rep D · 58 open opps · $9.1M qualified · 71% quota',
        'Rep E · 23 open opps · $3.2M qualified · 54% quota · ramp-up',
    ],
    'sc-S.3': [
        'Strata recommends Rep A · territory + 2 prior MANATT wins',
        'Alternative Rep C · best quota progress, territory match',
        'Confirming assignment · SLA timer starts · 24h qualify · 48h proposal',
        'Auto-escalation set · Sales Manager notified if breached',
        'Rep A notified · opp MANATT-4F assigned · SLA timer running',
    ],
    'sc-S.4': [
        'Reading 7-message email thread · 3 weeks of context',
        'Auto-summarized into BANT + MEDDIC template',
        'Budget · est $400-600k (anchored on CBRE prior projects)',
        'Authority · Caitlin Barolet · MANATT facilities lead',
        'Need · 4F refresh · GSA SQ price-protected · 120 workstations',
        'Timing · move-in target 2026-08-30 · 14 weeks out',
        '2 missing MEDDIC fields flagged · Champion · Decision criteria',
    ],
    'sc-S.5': [
        'Drafting follow-up · pre-filled from discovery summary',
        'Channel-of-record suggestion · email (prior thread continuity)',
        'Tabs · email (primary) · Teams (back-channel to CBRE PM) · SMS (urgency)',
        'Pre-flight · recipients OK · attachments (2) · SLA aligned',
        'Drafts queued · Sales Lead reviews and confirms · never auto-send',
    ],
    'sc-S.6': [
        'Pulling Spec Check BOM · MANATT-4F · 71 lines · $1,541,392 list',
        'Pulling L&D labor quote · TriState · $20,900 net + OW margin 18%',
        'Pulling NetSuite catalog (read-only mock) · GSA SQ #436533 price-protected',
        'Assembling proposal PDF · cover · scope · BOM · labor · pricing · terms',
        'Drafting proposal email · attachments (3) · Sales Lead reviews and sends',
    ],
    'sc-S.7': [
        'Outcome confirmed · WON · $1,541,392 · close date 2026-06-12',
        'Building handoff packet · Works post-award form auto-populated',
        'NetSuite SO bridge prepared · SO-WIP-088421 · Sales Coordinator notified',
        'Routing decision · Furniture vertical → Spec Check + L&D trigger',
        'Handoff complete · project team assembled · Designer + Sr Operations on deck',
    ],
};

// ─── SELF-INDICATED STEPS ────────────────────────────────────────────────────

export const OFFICEWORKS_SELF_INDICATED: string[] = [
    'sc1.0', 'sc1.0b', 'sc1.2', 'sc1.4',
    'sc1.5', 'sc1.5b', 'sc1.6', 'sc1.7', 'sc1.8', 'sc1.8b', 'sc1.9',
    'sc-S.0', 'sc-S.1', 'sc-S.2', 'sc-S.3', 'sc-S.4', 'sc-S.5', 'sc-S.6', 'sc-S.7',
];
