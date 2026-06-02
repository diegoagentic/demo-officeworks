// ═══════════════════════════════════════════════════════════════════════════════
// MANATT · Sales flow demo data
//
// Same project as MANATT_ORDER_META (manattOrderData.ts) + MANATT_LD_RFP
// (manattLaborData.ts) · PO-DC-0009642 · MANATT Phelps & Phillips · 4th Floor.
// The Sales flow runs UPSTREAM of Spec Check + L&D · it produces the works
// form that triggers them.
//
// Source anchors (every datum traces to AS-IS Sales Notion v6 / Karen Dann
// transcript / BPMN Enhanced Painpoints HTML):
//   - Email volume:        Notion AS-IS §8 (150-200/day · confirmed lost deals)
//   - Multi-channel:       Notion AS-IS §8 + S9 (Karen ~52:00)
//   - Pipeline scale:      Notion AS-IS §11 (~8,842 opps · ~$2B)
//   - Works form gap:      Notion AS-IS §2 + Felicia Spec Check 30-Apr (75-80%)
//   - Capacity ledger:     SC5 (self-reported Thursdays · BPMN PP2)
//   - Conversion rates:    Notion §11 (~10-15% entry → 75%)
//   - Process not enforced: S7 (11-page workflow + new tracker manual)
// ═══════════════════════════════════════════════════════════════════════════════

export const SALES_ACTOR = {
    role: 'Sales Lead',
    territoryLabel: 'Mid-Atlantic · Furniture + Walls',
    personaSubLine: 'Manages 60–80 active opportunities across $80K–$5M',
    avatarInitials: 'SL',
} as const

// ─── §11 Pipeline scale (mocked to AS-IS volumes) ────────────────────────────

export const SALES_VOLUME_FACTS = {
    inboundEmailsPerDayPerRep: 175,                         // §8 · 150-200
    callsPerDayPerRep: 4,
    peakCallsPerDay: 10,
    totalOpenOpportunities: 8842,                           // §11
    totalPipelineValueB: 2,                                 // $2B
    weeklyPricingRequests: 18,                              // §11 · 15-20
    saMgrActiveProjects: 67,                                // §11 · 60-70
    saMgrBurstExample: '8 JP Morgan requests in one week',
    avgQuoteToCloseWeeksMin: 3,
    avgQuoteToCloseWeeksMax: 8,
    endToEndCycleMonthsMin: 3,
    endToEndCycleMonthsMax: 6,
    extremeRFPMonths: 9,
    pipelineConversionTo75Min: 10,                          // §11 · 10-15%
    pipelineConversionTo75Max: 15,
    worksFormIncompletePctMin: 75,                          // §2 · 75-80%
    worksFormIncompletePctMax: 80,
} as const

// ─── §1 Copper probability tiers (Karen Dann transcript) ─────────────────────

export const SALES_COPPER_STAGES = [
    { pct: 0,   label: 'Speculative',                 description: 'Placeholder · heard about but not yet pursued' },
    { pct: 25,  label: 'Actively pursuing',           description: 'Submitted for pricing or design' },
    { pct: 50,  label: 'Strong conviction',           description: 'Feeling good about this one' },
    { pct: 75,  label: 'Awarded (no LOI)',            description: 'Walls · triggers design request form' },
    { pct: 90,  label: 'Contract · waiting on PO',    description: 'Actively in design' },
    { pct: 100, label: 'Order placed',                description: 'Transitions from Copper to NetSuite' },
] as const

// ─── §11 + §2 Multi-channel inbox (12 threads, mixed verticals) ──────────────

export type SalesInboxChannel = 'email' | 'teams' | 'portal'
export type SalesInboxUrgency = 'high' | 'med' | 'low'

// Topic taxonomy · derived from existing thread content (AS-IS grounded) ·
// powers the topic filter chips in SalesInboxModal.
export type SalesInboxTopic =
    | 'scope-lock' | 'pricing-gsa' | 'rfp-portal' | 'new-opp' | 'day-two'
    | 'works-gap' | 'vendor-logistics' | 'pipeline-exec' | 'noise'

export const SALES_INBOX_TOPICS: { id: SalesInboxTopic; label: string }[] = [
    { id: 'scope-lock',       label: 'Scope lock' },
    { id: 'pricing-gsa',      label: 'Pricing / GSA' },
    { id: 'rfp-portal',       label: 'RFP / GC portal' },
    { id: 'new-opp',          label: 'New opportunity' },
    { id: 'day-two',          label: 'Day-Two reorder' },
    { id: 'works-gap',        label: 'Works-form gap' },
    { id: 'vendor-logistics', label: 'Vendor / logistics' },
    { id: 'pipeline-exec',    label: 'Pipeline / exec' },
    { id: 'noise',            label: 'Noise' },
]

export interface SalesInboxThread {
    id: string
    channel: SalesInboxChannel
    from: string
    fromOrg: string
    subject: string
    snippet: string
    receivedAt: string
    intentScore: number        // 0-100 (Strata classifier confidence)
    urgency: SalesInboxUrgency
    dedupGroupId?: string
    oppLinked?: string         // matched opp id if found
    intent: 'action' | 'fyi' | 'urgent'
    topic: SalesInboxTopic
    hoursSinceLastTouch?: number
    attachments?: { filename: string; size: string }[]
    topics?: string[]
}

export const SALES_INBOX_THREADS: SalesInboxThread[] = [
    {
        id: 'sit-001',
        topic: 'scope-lock',
        channel: 'email',
        from: 'Caitlin Barolet · MANATT Facilities',
        fromOrg: 'MANATT Phelps & Phillips',
        subject: 'RE: MANATT 4th Floor · need to lock scope this week',
        snippet: 'Hi team, we are 26 hours past last touch on the proposal — please confirm the 120-workstation count and the GSA price.',
        receivedAt: '2026-05-13 08:42',
        intentScore: 96,
        urgency: 'high',
        oppLinked: 'opp-manatt-4f',
        intent: 'urgent',
        hoursSinceLastTouch: 26,
        dedupGroupId: 'dg-manatt',
        attachments: [
            { filename: 'MANATT-4F-floor-plan-v2.pdf', size: '184 KB' },
            { filename: 'GSA-SQ-436533-pricing.xlsx', size: '42 KB' },
        ],
        topics: ['MANATT-4F', 'GSA SQ', 'Scope lock', '120 workstations'],
    },
    {
        id: 'sit-002',
        topic: 'scope-lock',
        channel: 'teams',
        from: 'Caitlin Barolet · MANATT Facilities',
        fromOrg: 'MANATT Phelps & Phillips',
        subject: 'Quick ping — same scope question',
        snippet: 'Just emailed but also pinging here in case email is buried · need scope lock today.',
        receivedAt: '2026-05-13 08:45',
        intentScore: 93,
        urgency: 'high',
        oppLinked: 'opp-manatt-4f',
        intent: 'urgent',
        hoursSinceLastTouch: 26,
        dedupGroupId: 'dg-manatt',
        topics: ['MANATT-4F', 'Scope lock', 'Teams cross-channel'],
    },
    {
        id: 'sit-003',
        topic: 'pricing-gsa',
        channel: 'email',
        from: 'David Lin · JPM Procurement',
        fromOrg: 'JPMorgan Chase',
        subject: 'JPM-ATL refresh · pricing request for 8 floors',
        snippet: 'Strategic account · burst week · need pricing per floor by EOD Friday.',
        receivedAt: '2026-05-12 16:12',
        intentScore: 91,
        urgency: 'high',
        oppLinked: 'opp-jpm-atl',
        intent: 'action',
        attachments: [{ filename: 'JPM-ATL-RFP-2026.pdf', size: '320 KB' }],
        topics: ['JPM Strategic', '8 floors', 'Pricing burst', 'ATL'],
    },
    {
        id: 'sit-004',
        topic: 'rfp-portal',
        channel: 'portal',
        from: 'Building Connected · GC portal',
        fromOrg: 'CBRE',
        subject: 'BC-RFP-882041 · MANATT 4F · GC quote due 2026-05-14 17:00',
        snippet: 'Portal RFP · GC quote template attached · deadline 24h.',
        receivedAt: '2026-05-13 09:00',
        intentScore: 99,
        urgency: 'high',
        oppLinked: 'opp-manatt-4f',
        intent: 'urgent',
        attachments: [
            { filename: 'BC-RFP-882041-GC-quote-template.xlsx', size: '128 KB' },
            { filename: 'MANATT-4F-RFP-package.pdf', size: '2.1 MB' },
        ],
        topics: ['GC portal', 'BC-RFP', '24h deadline', 'MANATT-4F'],
    },
    {
        id: 'sit-005',
        topic: 'day-two',
        channel: 'email',
        from: 'Marcus Webb · Day-Two request',
        fromOrg: 'PNC Bank · 28th Floor',
        subject: 'Re-order — 6 task chairs to match installed set',
        snippet: 'Quick reorder · client forgot during initial spec · please route to coordinator.',
        receivedAt: '2026-05-13 07:30',
        intentScore: 82,
        urgency: 'low',
        intent: 'action',
        topics: ['Day-Two reorder', 'PNC', 'Coordinator route'],
    },
    {
        id: 'sit-006',
        topic: 'works-gap',
        channel: 'email',
        from: 'Felicia Miano-Poles · Design',
        fromOrg: 'Officeworks · Design',
        subject: 'Works form for OPP-2026-0884 is incomplete',
        snippet: 'CAD missing, SQ blank, scope vague · please clarify before we start drawing.',
        receivedAt: '2026-05-13 06:55',
        intentScore: 88,
        urgency: 'med',
        intent: 'action',
        attachments: [{ filename: 'OPP-2026-0884-works-form-draft.pdf', size: '24 KB' }],
        topics: ['Works form gap', 'CAD missing', 'SQ blank', 'Internal'],
    },
    {
        id: 'sit-007',
        topic: 'vendor-logistics',
        channel: 'email',
        from: 'Jonathan Spence · CBRE',
        fromOrg: 'CBRE Construction Management',
        subject: 'FYI · MANATT 4F construction milestones update',
        snippet: 'Wall framing starts week of May 19 · furniture install window May 26-30.',
        receivedAt: '2026-05-12 14:18',
        intentScore: 76,
        urgency: 'low',
        oppLinked: 'opp-manatt-4f',
        intent: 'fyi',
        topics: ['Construction milestones', 'CBRE', 'Install window'],
    },
    {
        id: 'sit-008',
        topic: 'pipeline-exec',
        channel: 'teams',
        from: 'Sarah Finnegan · CRO',
        fromOrg: 'Officeworks · Exec',
        subject: 'Pipeline review prep · 75%+ Walls opps',
        snippet: 'For tomorrow\'s bi-weekly · please confirm 4 opps on the 75% bucket.',
        receivedAt: '2026-05-13 07:12',
        intentScore: 84,
        urgency: 'med',
        intent: 'action',
        attachments: [{ filename: 'walls-pipeline-75pct.xlsx', size: '88 KB' }],
        topics: ['Pipeline review', 'Walls 75%', 'Exec prep'],
    },
    {
        id: 'sit-009',
        topic: 'new-opp',
        channel: 'email',
        from: 'Alex Park · DLA Piper',
        fromOrg: 'DLA Piper',
        subject: 'New opportunity · NYC office expansion · ~200 workstations',
        snippet: 'Heard from your team at NeoCon · want to discuss a 6-month-out project.',
        receivedAt: '2026-05-12 11:30',
        intentScore: 79,
        urgency: 'med',
        intent: 'action',
        topics: ['New opp', 'DLA Piper', '200 workstations', '6mo out'],
    },
    {
        id: 'sit-010',
        topic: 'noise',
        channel: 'email',
        from: 'GSA Catalog Updates',
        fromOrg: 'GSA',
        subject: 'Catalog 2026 SQ refresh · effective 2026-07-01',
        snippet: 'Bulk newsletter · catalog updates · no action required.',
        receivedAt: '2026-05-12 09:00',
        intentScore: 22,
        urgency: 'low',
        intent: 'fyi',
        topics: ['GSA newsletter', 'Catalog 2026', 'No action'],
    },
    {
        id: 'sit-011',
        topic: 'vendor-logistics',
        channel: 'email',
        from: 'Tifani Burgess · Teknion',
        fromOrg: 'Teknion',
        subject: 'CR 2046138 leadtime confirmation',
        snippet: 'Spec gap response for the MANATT order preview · standard 6 weeks.',
        receivedAt: '2026-05-13 08:10',
        intentScore: 71,
        urgency: 'med',
        oppLinked: 'opp-manatt-4f',
        intent: 'fyi',
        topics: ['Teknion', 'CR 2046138', '6-week leadtime'],
    },
    {
        id: 'sit-012',
        topic: 'noise',
        channel: 'email',
        from: 'Karen Dann auto-OoO',
        fromOrg: 'Officeworks · NC',
        subject: 'OoO · back Monday',
        snippet: 'Auto-reply.',
        receivedAt: '2026-05-12 17:00',
        intentScore: 8,
        urgency: 'low',
        intent: 'fyi',
        topics: ['Auto-reply', 'OoO'],
    },
]

// ─── Opportunities (3 hero · MANATT-4F · JPM-ATL · DLA-NYC) ──────────────────

export type SalesVertical = 'furniture' | 'walls'

export interface SalesOpportunity {
    oppId: string
    company: string
    projectCode: string
    vertical: SalesVertical
    estValueUSD: number
    copperStage: 0 | 25 | 50 | 75 | 90 | 100
    slaDeadline?: string
    slaState?: 'on-track' | 'at-risk' | 'breached'
    repAssigned?: string
    specAttached: boolean
    worksFormComplete?: boolean
    daysInStage: number
    accountType: 'strategic' | 'standard' | 'gc-referral'
    market: string
}

export const SALES_OPPORTUNITIES: SalesOpportunity[] = [
    {
        oppId: 'opp-manatt-4f',
        company: 'MANATT Phelps & Phillips',
        projectCode: 'MANATT-4F',
        vertical: 'furniture',
        estValueUSD: 1_541_392,
        copperStage: 75,
        slaDeadline: '2026-05-14 09:14',
        slaState: 'at-risk',
        repAssigned: 'rep-a',
        specAttached: true,
        worksFormComplete: false,
        daysInStage: 14,
        accountType: 'gc-referral',
        market: 'DC',
    },
    {
        oppId: 'opp-jpm-atl',
        company: 'JPMorgan Chase',
        projectCode: 'JPM-ATL-4471',
        vertical: 'furniture',
        estValueUSD: 3_280_000,
        copperStage: 50,
        slaDeadline: '2026-05-16 17:00',
        slaState: 'on-track',
        repAssigned: 'rep-c',
        specAttached: false,
        worksFormComplete: false,
        daysInStage: 6,
        accountType: 'strategic',
        market: 'ATL',
    },
    {
        oppId: 'opp-dla-nyc',
        company: 'DLA Piper',
        projectCode: 'DLA-NYC-22F',
        vertical: 'walls',
        estValueUSD: 780_000,
        copperStage: 25,
        daysInStage: 2,
        specAttached: false,
        worksFormComplete: false,
        accountType: 'standard',
        market: 'NYC',
    },
    {
        oppId: 'opp-pnc-d2',
        company: 'PNC Bank · 28F',
        projectCode: 'PNC-D2-0617',
        vertical: 'furniture',
        estValueUSD: 12_400,
        copperStage: 100,
        repAssigned: 'rep-coord',
        specAttached: false,
        worksFormComplete: true,
        daysInStage: 1,
        accountType: 'standard',
        market: 'PIT',
    },
    {
        oppId: 'opp-eli-pa',
        company: 'Eli Lilly',
        projectCode: 'ELI-PA-1180',
        vertical: 'furniture',
        estValueUSD: 425_000,
        copperStage: 50,
        slaDeadline: '2026-05-18 12:00',
        slaState: 'on-track',
        repAssigned: 'rep-d',
        specAttached: true,
        worksFormComplete: true,
        daysInStage: 9,
        accountType: 'standard',
        market: 'PA',
    },
]

// ─── Rep capacity ledger (5 reps · Mid-Atlantic) ─────────────────────────────

export interface SalesRep {
    id: string
    label: string                          // role-based · no proper names
    territory: string
    openOpps: number
    qualifiedPipelineValueUSD: number
    quotaProgressPct: number               // 0-100
    priorWinsWithAccount: Record<string, number>
    onTimeResponseRatePct: number
    capacityFlag: 'available' | 'optimal' | 'overloaded'
    lastActivityAt: string
}

export const SALES_REPS: SalesRep[] = [
    {
        id: 'rep-a',
        label: 'Sales Rep · DC + NoVA',
        territory: 'DC · NoVA',
        openOpps: 67,
        qualifiedPipelineValueUSD: 12_400_000,
        quotaProgressPct: 78,
        priorWinsWithAccount: { MANATT: 2, CBRE: 4 },
        onTimeResponseRatePct: 84,
        capacityFlag: 'optimal',
        lastActivityAt: '2026-05-13 09:02',
    },
    {
        id: 'rep-b',
        label: 'Sales Rep · NYC + Tri-State',
        territory: 'NYC · NJ · CT',
        openOpps: 84,
        qualifiedPipelineValueUSD: 15_100_000,
        quotaProgressPct: 64,
        priorWinsWithAccount: { DLA: 1 },
        onTimeResponseRatePct: 71,
        capacityFlag: 'overloaded',
        lastActivityAt: '2026-05-13 07:30',
    },
    {
        id: 'rep-c',
        label: 'Sales Rep · ATL + Carolinas',
        territory: 'ATL · NC · SC',
        openOpps: 41,
        qualifiedPipelineValueUSD: 6_800_000,
        quotaProgressPct: 92,
        priorWinsWithAccount: { JPM: 3 },
        onTimeResponseRatePct: 96,
        capacityFlag: 'available',
        lastActivityAt: '2026-05-13 08:55',
    },
    {
        id: 'rep-d',
        label: 'Sales Rep · PA + WV',
        territory: 'Pittsburgh · Philly · WV',
        openOpps: 58,
        qualifiedPipelineValueUSD: 9_100_000,
        quotaProgressPct: 71,
        priorWinsWithAccount: { ELI: 2 },
        onTimeResponseRatePct: 88,
        capacityFlag: 'optimal',
        lastActivityAt: '2026-05-13 08:18',
    },
    {
        id: 'rep-e',
        label: 'Sales Rep · MA + NE (ramp)',
        territory: 'MA · NH · ME',
        openOpps: 23,
        qualifiedPipelineValueUSD: 3_200_000,
        quotaProgressPct: 54,
        priorWinsWithAccount: {},
        onTimeResponseRatePct: 92,
        capacityFlag: 'available',
        lastActivityAt: '2026-05-13 07:45',
    },
]

// ─── §5 + §6 Discovery template (BANT + MEDDIC) ──────────────────────────────

export interface DiscoveryField {
    key: string
    label: string
    framework: 'BANT' | 'MEDDIC'
    value?: string
    source?: string     // thread id or "missing"
    confidence?: 'high' | 'medium' | 'low'
}

export const SALES_DISCOVERY_TEMPLATE: DiscoveryField[] = [
    { key: 'budget',       label: 'Budget',                framework: 'BANT', value: '$400–600K', source: 'sit-001', confidence: 'medium' },
    { key: 'authority',    label: 'Authority',             framework: 'BANT', value: 'Caitlin Barolet · MANATT facilities lead', source: 'sit-001', confidence: 'high' },
    { key: 'need',         label: 'Need',                  framework: 'BANT', value: '4F refresh · GSA SQ price-protected · 120 workstations', source: 'sit-004', confidence: 'high' },
    { key: 'timing',       label: 'Timing',                framework: 'BANT', value: 'Move-in 2026-08-30 · 14 weeks out', source: 'sit-007', confidence: 'high' },
    { key: 'metrics',      label: 'Success metrics',       framework: 'MEDDIC', value: 'Quote in by 14-May 17:00 · install Aug 26-30', source: 'sit-004', confidence: 'high' },
    { key: 'economic',     label: 'Economic buyer',        framework: 'MEDDIC', value: 'MANATT COO (pending intro)', source: 'inferred', confidence: 'medium' },
    { key: 'decisionCrit', label: 'Decision criteria',     framework: 'MEDDIC', value: undefined, source: 'missing', confidence: 'low' },
    { key: 'decisionProc', label: 'Decision process',      framework: 'MEDDIC', value: 'CBRE GC owns portal · GSA SOP', source: 'sit-004', confidence: 'medium' },
    { key: 'identifyPain', label: 'Pain identified',       framework: 'MEDDIC', value: 'Existing furniture EoL · ergonomic complaints from associates', source: 'sit-001', confidence: 'medium' },
    { key: 'champion',     label: 'Champion',              framework: 'MEDDIC', value: undefined, source: 'missing', confidence: 'low' },
]

// ─── §5 Multi-channel outreach drafts ────────────────────────────────────────

export interface SalesChannelDraft {
    channel: SalesInboxChannel | 'sms'
    label: string
    suggestedAsChannelOfRecord: boolean
    subjectOrPreview: string
    body: string[]
    attachments?: string[]
}

export const SALES_OUTREACH_DRAFTS: SalesChannelDraft[] = [
    {
        channel: 'email',
        label: 'Email · primary thread',
        suggestedAsChannelOfRecord: true,
        subjectOrPreview: 'RE: MANATT 4F — scope confirmed, proposal Friday 14-May 12:00',
        body: [
            'Hi Caitlin,',
            '',
            'Confirming the scope on MANATT 4F:',
            '· 120 workstations (Teknion T25 District) · 18 CRs',
            '· GSA SQ #436533 · 2025 catalog · price-protected',
            '· 4th-floor refresh · install window 2026-08-26 → 08-30',
            '',
            'I will have the full proposal package to you by Friday 14-May 12:00. CBRE GC quote will be uploaded to BC-RFP-882041 the same morning.',
            '',
            'Talk soon,',
            'Sales Lead · Mid-Atlantic',
        ],
        attachments: ['MANATT-4F-scope-summary.pdf'],
    },
    {
        channel: 'teams',
        label: 'Teams · back-channel ping to CBRE',
        suggestedAsChannelOfRecord: false,
        subjectOrPreview: 'Heads-up · MANATT 4F proposal on Friday',
        body: [
            'FYI Jonathan — proposal lands Friday 12:00. Quote in GC portal same morning.',
        ],
    },
    {
        channel: 'sms',
        label: 'SMS · only if blocked',
        suggestedAsChannelOfRecord: false,
        subjectOrPreview: 'No outbound · escalate via email or Teams',
        body: [
            'Per channel-of-record protocol · SMS reserved for true blockers, not first contact.',
        ],
    },
]

// ─── §6 Proposal assembly (NetSuite read-only mock catalog) ──────────────────

export interface ProposalLineItem {
    sku: string
    desc: string
    qty: number
    unitPriceUSD: number
}

export const SALES_PROPOSAL_LINE_ITEMS: ProposalLineItem[] = [
    { sku: 'TK-T25-WS-72',      desc: 'Teknion T25 · 72" workstation · District',                qty: 60, unitPriceUSD: 4_120 },
    { sku: 'TK-T25-WS-60',      desc: 'Teknion T25 · 60" workstation · District',                qty: 60, unitPriceUSD: 3_640 },
    { sku: 'TK-T25-PNL-66',     desc: 'T25 panel · 66"H acoustic · Very White XG',               qty: 240, unitPriceUSD: 412 },
    { sku: 'TK-TASK-CHAIR-ADV', desc: 'Teknion task chair · advanced ergo',                       qty: 120, unitPriceUSD: 689 },
    { sku: 'TK-CR-2046138',     desc: 'CR 2046138 · custom storage tower',                        qty: 18, unitPriceUSD: 1_950 },
    { sku: 'TK-CR-2075919',     desc: 'CR 2075919 · BIFMA advisory mod',                          qty: 6, unitPriceUSD: 880 },
    { sku: 'OW-LABOR-INSTALL',  desc: 'Installation labor · TriState · 320h MSA blended',         qty: 1, unitPriceUSD: 20_900 },
    { sku: 'OW-DELIVERY-2STOP', desc: 'Delivery · 2 stops · DC market',                            qty: 1, unitPriceUSD: 3_762 },
] as const

export const SALES_PROPOSAL_META = {
    quotedTotalUSD: 1_541_392,
    listTotalUSD: 1_541_392,
    gsaDiscountPct: 79,
    netToClientUSD: 323_692,
    quotePDFFile: 'MANATT-4F-OW-Proposal-v1.pdf',
    quoteSource: 'NetSuite catalog (read-only mock) · GSA SQ #436533 · 2025',
    cbrePortalRef: 'BC-RFP-882041',
    gcQuoteDueAt: '2026-05-14 17:00',
} as const

// ─── §6 Post-award handoff packet ────────────────────────────────────────────

export interface HandoffPacketField {
    label: string
    value: string
    source: string
}

export const SALES_HANDOFF_PACKET: HandoffPacketField[] = [
    { label: 'Project code',         value: 'MANATT-4F',                           source: 'Sales opp record' },
    { label: 'NetSuite SO',          value: 'SO-WIP-088421 (to create on award)',  source: 'NetSuite (read-only mock)' },
    { label: 'Ignite folder',        value: '/2026/MANATT/4F/',                    source: 'Sales Coordinator' },
    { label: 'Works post-award',     value: 'Auto-populated from opp record',      source: 'Strata orchestrator' },
    { label: 'Furniture PM lead',    value: 'Furniture PM team (Abigail\'s team)',  source: 'Org chart' },
    { label: 'Labor / install PM',   value: 'Service/Delivery team',               source: 'Org chart' },
    { label: 'Designer assignment',  value: 'Triggers sc1.0b in Spec Check flow',  source: 'BPMN PA' },
    { label: 'L&D trigger',          value: 'Triggers sc-LD.0 RFP intake',         source: 'BPMN PA' },
]

export const SALES_HANDOFF_ROUTES = [
    { id: 'route-furn',  label: 'Furniture · trigger Spec Check + L&D',  flowsTriggered: ['spec-check', 'labor-delivery'] },
    { id: 'route-walls', label: 'Walls · trigger L&D walls only',         flowsTriggered: ['labor-delivery'] },
    { id: 'route-dayt',  label: 'Day-Two · route directly to coordinator', flowsTriggered: [] },
] as const

// ─── Dashboard KPIs · Sales variant ──────────────────────────────────────────

export const SALES_KPI_SUMMARY = {
    pipelineValueUSD: 2_000_000_000,                        // $2B · §11
    openOppsCount: 8_842,                                   // §11
    qualifiedCount: 1_148,                                  // ~13% conversion
    proposalSLACompliancePct: 67,                           // 67% inside 48h target
    winRate90dPct: 31,
    winRate90dDeltaPct: +3,                                 // vs prior 90d
    avgCycleMonths: 4.5,
    extremeCycleMonths: 9,
} as const

export const SALES_OPP_TREND_8WK = [
    { week: 'W-7', open: 8_540, qualified: 1_080, won: 96 },
    { week: 'W-6', open: 8_612, qualified: 1_102, won: 88 },
    { week: 'W-5', open: 8_701, qualified: 1_115, won: 94 },
    { week: 'W-4', open: 8_733, qualified: 1_124, won: 102 },
    { week: 'W-3', open: 8_780, qualified: 1_131, won: 110 },
    { week: 'W-2', open: 8_812, qualified: 1_142, won: 98 },
    { week: 'W-1', open: 8_832, qualified: 1_146, won: 116 },
    { week: 'W-0', open: 8_842, qualified: 1_148, won: 121 },
] as const

export const SALES_SLA_DISTRIBUTION = [
    { bucket: '<24h',     count: 612, tone: 'success' as const },
    { bucket: '24-48h',   count: 421, tone: 'success' as const },
    { bucket: '48-72h',   count: 184, tone: 'warning' as const },
    { bucket: '>72h',     count: 116, tone: 'danger'  as const },
]

export const SALES_AT_RISK = [
    { id: 'opp-manatt-4f',   projectCode: 'MANATT-4F',     copperStage: '75% · awarded · no LOI', daysOver: 1,  slaHoursLeft: -2, dollarValueK: 1_541, accountType: 'GC referral · CBRE' },
    { id: 'opp-jpm-atl',     projectCode: 'JPM-ATL-4471',  copperStage: '50% · strong conviction', daysOver: 0,  slaHoursLeft: 22, dollarValueK: 3_280, accountType: 'Strategic' },
    { id: 'opp-pnc-pit',     projectCode: 'PNC-PIT-22',    copperStage: '25% · pricing requested', daysOver: 2,  slaHoursLeft: -28, dollarValueK: 480,  accountType: 'Standard' },
    { id: 'opp-bofa-uplift', projectCode: 'BOFA-UPLIFT-7', copperStage: '50% · strong conviction', daysOver: 1,  slaHoursLeft: -6, dollarValueK: 920,  accountType: 'Strategic' },
    { id: 'opp-eli-pa',      projectCode: 'ELI-PA-1180',   copperStage: '50% · strong conviction', daysOver: 0,  slaHoursLeft: 36, dollarValueK: 425,  accountType: 'Standard' },
]

export const SALES_ENGAGEMENT_FEED = [
    { id: 'evt-001', icon: 'mail',     channel: 'email',  text: 'Reply sent to Caitlin Barolet · MANATT 4F scope lock',   at: '2026-05-13 09:14' },
    { id: 'evt-002', icon: 'message',  channel: 'teams',  text: 'Teams ping to Jonathan Spence · proposal Friday 12:00',   at: '2026-05-13 09:12' },
    { id: 'evt-003', icon: 'upload',   channel: 'portal', text: 'GC quote uploaded · BC-RFP-882041',                       at: '2026-05-13 09:02' },
    { id: 'evt-004', icon: 'flag',     channel: 'system', text: 'SLA timer started · JPM-ATL pricing · 48h',                at: '2026-05-13 08:55' },
    { id: 'evt-005', icon: 'check',    channel: 'system', text: 'Opportunity moved 25% → 50% · DLA Piper NYC',              at: '2026-05-13 08:40' },
    { id: 'evt-006', icon: 'mail',     channel: 'email',  text: 'Auto-summary saved · Eli Lilly · BANT + MEDDIC complete',  at: '2026-05-13 08:18' },
    { id: 'evt-007', icon: 'alert',    channel: 'system', text: 'Capacity flag · Rep B overloaded · 84 open opps',          at: '2026-05-13 07:30' },
    { id: 'evt-008', icon: 'handoff',  channel: 'system', text: 'Handoff packet built · PNC Day-Two · routed to coordinator', at: '2026-05-13 07:12' },
]

// ─── Stage-level AI banners (parallel to L&D STAGE_AI_BANNER pattern) ────────

export const SALES_STAGE_AI_BANNER: Record<string, string> = {
    'sc-S.0': 'Strata classified 12 inbound threads in 1.8s · dedup, intent and urgency scored across email + Teams + portal.',
    'sc-S.1': 'Strata extracted company, size, budget hint and pre-flight Works form fields BEFORE submit · prevents the 75-80% incomplete cycle.',
    'sc-S.2': 'Strata pulls a live capacity ledger from Copper events · revisions and rework included · the Thursday spreadsheet is the floor, not the ceiling.',
    'sc-S.3': 'Strata suggests a rep on territory + prior wins + load · 24h qualify / 48h proposal SLA timer auto-starts · escalation built in.',
    'sc-S.4': 'Strata auto-summarized the 7-message thread into BANT + MEDDIC · 2 missing fields surfaced before the rep talks to the client.',
    'sc-S.5': 'Strata drafted across email + Teams + SMS with one channel-of-record · drafts only, the rep reviews and confirms each send.',
    'sc-S.6': 'Strata pulls Spec Check BOM + L&D labor quote + NetSuite catalog (read-only) into one proposal · 6h manual collapses to a review pass.',
    'sc-S.7': 'Strata builds the post-award handoff packet · Works post-award + NetSuite SO bridge + downstream flow triggers · no missed coordinator step.',
}

export const SALES_STAGE_PAINPOINT_CHIPS: Record<string, { id: string; label: string }> = {
    'sc-S.0': { id: 'PP S3', label: 'Email overload · 150-200/day · confirmed lost deals' },
    'sc-S.1': { id: 'PP S2', label: 'Works form ~75-80% incomplete · drives 2-4 revision cycles' },
    'sc-S.2': { id: 'PP SC5', label: 'Capacity self-reported Thursdays · rework not captured' },
    'sc-S.3': { id: 'PP S7', label: 'Process not enforced · 11-page doc inconsistently followed' },
    'sc-S.4': { id: 'PP S2', label: 'Salesperson guessing → design revision cycles' },
    'sc-S.5': { id: 'PP S9', label: 'Same request via 3 channels · no protocol' },
    'sc-S.6': { id: 'PP S6', label: 'Proposal ~6h in stops and starts · spec missing' },
    'sc-S.7': { id: 'PP S7', label: 'Post-award handoff = 2 manual steps · coordinator routinely missed' },
}
