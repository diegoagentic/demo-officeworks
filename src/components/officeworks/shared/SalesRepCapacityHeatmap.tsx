/**
 * COMPONENT: SalesRepCapacityHeatmap (sc-S.2)
 * PURPOSE: Sales-rep variant of the design-team CapacityHeatmap. Same UX
 *          pattern (accordion grouped by region · auto-expand highlightId ·
 *          per-row Assign button) but reads from SalesRep schema instead of
 *          Designer/designerProfiles.
 *
 * Why a parallel component (vs generalizing CapacityHeatmap):
 *   - Sales rep data shape differs enough (no projects.active, no
 *     errorRate · has openOpps/qualified $/quota/priorWinsWithAccount)
 *     that generalizing would be lossy.
 *   - Spec Check IntakeAssignPanel stays untouched · zero risk to Flow 2.
 *
 * Two modes:
 *   - Browse  (no onSelect)        — accordion shows info only
 *   - Assign  (onSelect provided)  — accordion shows info + "Assign Rep X"
 *                                    button that fires onSelect(repId)
 */

import { Fragment, useState } from 'react'
import {
    Users, CheckCircle2, ChevronRight, ChevronDown, ArrowRight,
    Briefcase, Award, TrendingUp, DollarSign,
} from 'lucide-react'
import {
    SALES_REP_REGION_GROUPS,
    type SalesRep, type SalesRepRegionGroup,
} from './manattSalesData'

// ─── Helper · capacityFlag → status meta ─────────────────────────────────────

function flagChipClass(flag: SalesRep['capacityFlag']) {
    return flag === 'available' ? 'bg-success/10 text-success border-success/20'
         : flag === 'optimal'   ? 'bg-warning/10 text-warning border-warning/20'
         :                        'bg-destructive/10 text-destructive border-destructive/30'
}
function flagDotClass(flag: SalesRep['capacityFlag']) {
    return flag === 'available' ? 'bg-success'
         : flag === 'optimal'   ? 'bg-warning'
         :                        'bg-destructive'
}
function flagLabel(flag: SalesRep['capacityFlag']) {
    return flag === 'available' ? 'Available'
         : flag === 'optimal'   ? 'Optimal'
         :                        'Overloaded'
}

// Format pipeline dollars · $12.4M
function fmtMillions(usd: number) {
    return `$${(usd / 1_000_000).toFixed(1)}M`
}
function fmtThousands(usd: number) {
    return usd >= 1_000_000 ? `$${(usd / 1_000_000).toFixed(1)}M` : `$${(usd / 1_000).toFixed(0)}k`
}

// ─── Public API ──────────────────────────────────────────────────────────────

interface Props {
    reps: SalesRep[]
    /** Strata recommendation · auto-expanded on mount with primary tint */
    highlightId?: string
    /** When set, expansion shows an "Assign Rep X" button that fires onSelect(id) */
    onSelect?: (id: string) => void
    /** Currently selected rep id · row gets primary ring */
    selectedId?: string | null
    /** Optional "Worked with X" filter · matching reps surface in a top section
     *  exclusive from their regional sections (mirrors CapacityHeatmap priorClientHighlight) */
    priorAccountHighlight?: {
        accountKey: string                 // e.g. 'MANATT' · looked up in priorWinsWithAccount
        label: string                      // e.g. 'Worked with MANATT'
    }
    /** Tighter rows for narrow panels */
    compact?: boolean
}

export default function SalesRepCapacityHeatmap({
    reps,
    highlightId,
    onSelect,
    selectedId,
    priorAccountHighlight,
    compact = false,
}: Props) {
    const isInteractive = !!onSelect

    // Split reps when a prior-account section is requested (exclusive grouping).
    // Sort: highlightId first, then by quota ascending (most room first) so the
    // recommended rep leads the list visually.
    const hasAccountWin = (r: SalesRep) =>
        !!priorAccountHighlight && (r.priorWinsWithAccount[priorAccountHighlight.accountKey] ?? 0) > 0

    const highlightedReps = priorAccountHighlight
        ? reps
            .filter(hasAccountWin)
            .sort((a, b) => {
                if (a.id === highlightId) return -1
                if (b.id === highlightId) return 1
                return a.quotaProgressPct - b.quotaProgressPct
            })
        : []
    const regionalSource = priorAccountHighlight
        ? reps.filter(r => !hasAccountWin(r))
        : reps

    // Compact mode style overrides
    const rowPadY    = compact ? 'py-2' : 'py-2.5'
    const rowGap     = compact ? 'gap-2' : 'gap-3'
    const quotaWidth = compact ? 'w-10' : 'w-12'
    const statusChip = compact ? 'text-[9px] px-1.5 py-0' : 'text-[10px] px-2 py-0.5'
    const statusDot  = compact ? 'h-1 w-1' : 'h-1.5 w-1.5'
    const showLeadBadge = !compact

    // Auto-expand the highlighted (recommended) rep on mount
    const [expandedIds, setExpandedIds] = useState<Set<string>>(() => {
        return highlightId ? new Set([highlightId]) : new Set()
    })

    const toggleExpand = (id: string) => {
        setExpandedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }

    const renderRow = (r: SalesRep, idx: number) => {
        const isExpanded = expandedIds.has(r.id)
        const isHighlighted = highlightId === r.id
        const isSelected = selectedId === r.id

        const priorWinsCount = Object.values(r.priorWinsWithAccount).reduce((s, n) => s + n, 0)
        const showPriorAccountChip = !priorAccountHighlight && r.priorWinsWithAccount.MANATT
        const territoryFocus = SALES_REP_REGION_GROUPS.find(g => g.key === r.regionGroup)?.focus

        return (
            <Fragment key={r.id}>
                {/* Collapsed/header row · click toggles expansion */}
                <button
                    type="button"
                    onClick={() => toggleExpand(r.id)}
                    aria-expanded={isExpanded}
                    className={`w-full flex items-center ${rowGap} px-3 ${rowPadY} text-left transition-colors ${
                        idx > 0 ? 'border-t border-border/60' : ''
                    } ${
                        isHighlighted ? 'bg-primary/5' : 'hover:bg-muted/30'
                    } ${
                        isSelected ? 'ring-2 ring-inset ring-primary' : ''
                    }`}
                >
                    <span className="text-muted-foreground shrink-0">
                        {isExpanded
                            ? <ChevronDown className="h-4 w-4" />
                            : <ChevronRight className="h-4 w-4" />
                        }
                    </span>
                    <span className="flex-1 min-w-0 flex items-center gap-1.5">
                        <span className="text-sm font-semibold text-foreground truncate">{r.label}</span>
                        {isSelected && (
                            <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" aria-hidden="true" />
                        )}
                    </span>
                    <span className={`text-sm font-mono tabular-nums text-foreground shrink-0 ${quotaWidth} text-right`}>
                        {r.quotaProgressPct}%
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full border font-semibold shrink-0 ${statusChip} ${flagChipClass(r.capacityFlag)}`}>
                        <span className={`rounded-full ${statusDot} ${flagDotClass(r.capacityFlag)}`} />
                        {flagLabel(r.capacityFlag)}
                    </span>
                    <span className="hidden sm:flex items-center gap-1 shrink-0">
                        {showLeadBadge && r.isRegionLead && (
                            <span className="text-[8px] uppercase tracking-wide font-bold bg-foreground/10 text-foreground/70 rounded px-1 py-0.5">
                                Lead
                            </span>
                        )}
                        {showPriorAccountChip && (
                            <span className="text-[8px] uppercase tracking-wide font-bold bg-info/10 text-info border border-info/20 rounded px-1 py-0.5">
                                Prior MANATT
                            </span>
                        )}
                    </span>
                </button>

                {/* Expanded detail panel */}
                {isExpanded && (
                    <div className="px-3 pb-3 pt-1 bg-muted/10 border-t border-border/40 space-y-3">
                        {/* Territory + focus */}
                        <div className="text-[11px] text-muted-foreground leading-relaxed">
                            <strong className="text-foreground not-italic">{r.territory}</strong>
                            {territoryFocus && <> · {territoryFocus}</>}
                        </div>

                        {/* Quota bar */}
                        <div>
                            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold text-muted-foreground mb-1">
                                <span>Quota progress</span>
                                <span className="text-foreground">{r.quotaProgressPct}% YTD</span>
                            </div>
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                                <div
                                    className={`h-full ${r.capacityFlag === 'overloaded' ? 'bg-destructive' : r.capacityFlag === 'optimal' ? 'bg-warning' : 'bg-success'}`}
                                    style={{ width: `${Math.min(100, r.quotaProgressPct)}%` }}
                                />
                            </div>
                        </div>

                        {/* Metrics 3-col */}
                        <div className="grid grid-cols-3 gap-2">
                            <div className="rounded-md border border-border bg-card p-2">
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Open opps</div>
                                <div className="text-[14px] font-bold text-foreground tabular-nums mt-0.5">{r.openOpps}</div>
                            </div>
                            <div className="rounded-md border border-border bg-card p-2">
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Qualified pipeline</div>
                                <div className="text-[14px] font-bold text-foreground tabular-nums mt-0.5">{fmtMillions(r.qualifiedPipelineValueUSD)}</div>
                            </div>
                            <div className="rounded-md border border-border bg-card p-2">
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">On-time response</div>
                                <div className="text-[14px] font-bold text-foreground tabular-nums mt-0.5">{r.onTimeResponseRatePct}%</div>
                            </div>
                        </div>

                        {/* Prior wins · chip row */}
                        {priorWinsCount > 0 && (
                            <div>
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5 flex items-center gap-1">
                                    <Award className="h-3 w-3" aria-hidden="true" /> Prior wins · {priorWinsCount}
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {Object.entries(r.priorWinsWithAccount).map(([account, count]) => (
                                        <span
                                            key={account}
                                            className={`inline-flex items-center text-[10px] font-bold uppercase tracking-wider rounded border px-1.5 py-0.5 ${
                                                priorAccountHighlight && account === priorAccountHighlight.accountKey
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

                        {/* Active opps · 2-3 entries */}
                        {r.recentActiveOpps.length > 0 && (
                            <div>
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5 flex items-center gap-1">
                                    <Briefcase className="h-3 w-3" aria-hidden="true" /> Active opps · {r.recentActiveOpps.length}
                                </div>
                                <ul className="space-y-1">
                                    {r.recentActiveOpps.map(o => (
                                        <li key={o.code} className="flex items-center gap-2 text-[11px]">
                                            <span className="text-foreground font-medium tabular-nums w-32 shrink-0 truncate">{o.code}</span>
                                            <span className="text-muted-foreground flex-1 truncate">{o.client}</span>
                                            <span className="text-foreground tabular-nums shrink-0">{fmtThousands(o.valueUSD)}</span>
                                            <span className="text-muted-foreground text-[10px] tabular-nums shrink-0">{o.stage}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        {/* KPI 3-col footer */}
                        <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/40">
                            <div className="text-center">
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Avg cycle</div>
                                <div className="text-[12px] font-bold text-foreground tabular-nums mt-0.5">{r.avgCycleWeeks}w</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Lost deal rate</div>
                                <div className="text-[12px] font-bold text-foreground tabular-nums mt-0.5">{r.lostDealRatePct}%</div>
                            </div>
                            <div className="text-center">
                                <div className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">Prior wins</div>
                                <div className="text-[12px] font-bold text-foreground tabular-nums mt-0.5">{priorWinsCount}</div>
                            </div>
                        </div>

                        {/* Assign button · only in interactive mode */}
                        {isInteractive && !isSelected && (
                            <div className="flex justify-end pt-1">
                                <button
                                    type="button"
                                    onClick={(e) => { e.stopPropagation(); onSelect?.(r.id) }}
                                    className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                                >
                                    Assign {r.label.replace('Sales ', '')} <ArrowRight className="h-3 w-3" aria-hidden="true" />
                                </button>
                            </div>
                        )}
                        {isInteractive && isSelected && (
                            <div className="flex items-center justify-end gap-1.5 pt-1 text-[11px] font-semibold text-primary">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Selected
                            </div>
                        )}
                    </div>
                )}
            </Fragment>
        )
    }

    const renderRegionSection = (group: SalesRepRegionGroup) => {
        const meta = SALES_REP_REGION_GROUPS.find(g => g.key === group)
        if (!meta) return null
        const inRegion = regionalSource.filter(r => r.regionGroup === group)
        if (inRegion.length === 0) return null

        const lead = inRegion.find(r => r.id === meta.leadId)

        return (
            <div key={group} className="rounded-xl border border-border bg-card overflow-hidden">
                {/* Group header */}
                <div className="px-3 py-2 bg-muted/40 border-b border-border flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-foreground" aria-hidden="true" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">{meta.label}</span>
                    <span className="text-[10px] text-muted-foreground">· {meta.subRegions}</span>
                    <span className="ml-auto text-[10px] text-muted-foreground">
                        {lead && <>Lead: {lead.label.replace('Sales Rep · ', '')} · </>}
                        {inRegion.length} {inRegion.length === 1 ? 'rep' : 'reps'}
                    </span>
                </div>
                {/* Rows */}
                <div>
                    {inRegion.map(renderRow)}
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-3">
            {/* Prior-account section (exclusive · matching reps shown here, removed from regions) */}
            {priorAccountHighlight && highlightedReps.length > 0 && (
                <div className="rounded-xl border border-info/30 bg-info/5 overflow-hidden">
                    <div className="px-3 py-2 bg-info/10 border-b border-info/30 flex items-center gap-2">
                        <TrendingUp className="h-3.5 w-3.5 text-info" aria-hidden="true" />
                        <span className="text-[11px] font-bold uppercase tracking-wider text-foreground">{priorAccountHighlight.label}</span>
                        <span className="ml-auto text-[10px] text-muted-foreground">{highlightedReps.length} {highlightedReps.length === 1 ? 'rep' : 'reps'}</span>
                    </div>
                    <div>
                        {highlightedReps.map(renderRow)}
                    </div>
                </div>
            )}

            {/* Regional groups · 3 sections */}
            {SALES_REP_REGION_GROUPS.map(g => renderRegionSection(g.key))}
        </div>
    )
}
