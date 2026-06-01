import React from 'react';
import { useDemo } from '../../context/DemoContext';
import { useTheme } from 'strata-design-system';
import { Popover, PopoverButton, PopoverPanel, Transition } from '@headlessui/react';
import {
    CheckCircle2,
    Circle,
    ChevronRight,
    ChevronLeft,
    ChevronDown,
    Check,
    Play,
    Pause,
    Loader2,
    Star,
} from 'lucide-react';

// Hero moments — emotional peak beats per profile. Surfaced in the sidebar
// with a star marker so the audience knows which beats are the demo's
// crescendo and the presenter doesn't accidentally rush past them.
//
// Apr 27: m4.3 (Spec Check finding) was a hero, but Design AI was removed
// from the active tour (Matt: "primary and only necessary is accounting").
// MBIDesignPage stays navigable via tab so anyone can still see that scene
// — but it's not in the guided tour so no sidebar marker.
const HERO_STEP_IDS = new Set<string>([
    'm2.2',  // MBI · HealthTrust GPO 3% rebate modal — the most interactive AP scene
]);
import { useDemoProfile } from '../../context/useDemoProfile';
import { useOfficeworksVertical, writeVertical } from '../officeworks/shared/verticalSignal';

function resolveRoleLabel(role: string, _app: string): string {
    // Officeworks-only · all roles are passed through as-is.
    return role;
}

export default function DemoSidebar() {
    const { currentStepIndex, steps, nextStep, prevStep, goToStep, isDemoActive, setIsDemoActive, isSidebarCollapsed, setIsSidebarCollapsed, isPaused, togglePause } = useDemo();
    const { activeProfile } = useDemoProfile();
    const { theme } = useTheme();
    const STEP_BEHAVIOR = activeProfile.stepBehavior;
    // Officeworks-only standalone demo · activeProfile is always 'officeworks'.
    const isOfficeworks = true;

    // Officeworks runs three flows in parallel (Spec Check & Design ·
    // Labor & Delivery · Sales). Tab toggle filters the sidebar to one flow.
    type OfficeworksFlow = 'spec-check' | 'labor-delivery' | 'sales';
    const [activeFlow, setActiveFlow] = React.useState<OfficeworksFlow>('spec-check');

    // If the user lands directly on a step from a different flow (e.g. resumed
    // session), sync the tab so the active step is visible.
    React.useEffect(() => {
        if (!isOfficeworks) return;
        const curr = steps[currentStepIndex];
        const f = (curr?.flowId ?? 'spec-check') as OfficeworksFlow;
        if (f !== activeFlow) setActiveFlow(f);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOfficeworks, activeProfile.id]);

    // Filtered + original-index-preserving step list for the render loop.
    const displayedSteps = React.useMemo(() => {
        const indexed = steps.map((step, originalIndex) => ({ step, originalIndex }));
        if (!isOfficeworks) return indexed;
        return indexed.filter(({ step }) => (step.flowId ?? 'spec-check') === activeFlow);
    }, [steps, isOfficeworks, activeFlow]);

    const flowCounts = React.useMemo(() => {
        if (!isOfficeworks) return { specCheck: 0, laborDelivery: 0, sales: 0 };
        let s = 0, l = 0, x = 0;
        for (const step of steps) {
            const f = step.flowId ?? 'spec-check';
            if (f === 'spec-check') s++;
            else if (f === 'labor-delivery') l++;
            else if (f === 'sales') x++;
        }
        return { specCheck: s, laborDelivery: l, sales: x };
    }, [steps, isOfficeworks]);

    // L&D vertical sub-toggle (Furniture vs Walls) · only meaningful inside L&D tab.
    const activeVertical = useOfficeworksVertical()
    const handleVerticalSwitch = (vertical: 'furniture' | 'walls') => {
        if (vertical === activeVertical) return
        writeVertical(vertical)
    }

    const handleFlowSwitch = (flow: OfficeworksFlow) => {
        if (flow === activeFlow) return;
        setActiveFlow(flow);
        // Jump to first step of the target flow so currentStepIndex points to a
        // visible row · avoids stale-active-state when the flow changes.
        const firstIdx = steps.findIndex(s => (s.flowId ?? 'spec-check') === flow);
        if (firstIdx >= 0) goToStep(firstIdx);
    };
    const hasDataThreads = false;

    // Invert: when app is dark → sidebar is light, when app is light → sidebar is dark
    const isDarkSidebar = theme === 'light';

    // Color tokens based on inverted theme
    const c = isDarkSidebar ? {
        // Dark sidebar (app is in light mode)
        bg: 'bg-zinc-950',
        bgHeader: 'bg-zinc-900',
        bgStep: 'bg-zinc-900/60',
        bgStepActive: 'bg-zinc-800',
        bgBadge: 'bg-zinc-800',
        bgBadgeActive: 'bg-zinc-700',
        bgBtn: 'bg-zinc-800',
        bgBtnHover: 'hover:bg-zinc-700',
        bgNext: 'bg-white',
        bgNextHover: 'hover:bg-zinc-200',
        textNext: 'text-zinc-950',
        border: 'border-zinc-800',
        borderSubtle: 'border-zinc-800/50',
        textTitle: 'text-white',
        textBody: 'text-zinc-300',
        textMuted: 'text-zinc-500',
        textDim: 'text-zinc-600',
        textBadge: 'text-zinc-400',
        textBadgeActive: 'text-zinc-200',
        textBtn: 'text-zinc-300',
        iconDone: 'text-emerald-400',
        iconDoneFill: 'fill-emerald-400/10',
        iconActive: 'border-white bg-zinc-900',
        iconActiveDot: 'bg-white',
        iconPending: 'text-zinc-700',
        connectorDone: 'bg-emerald-500/40',
        connectorPending: 'bg-zinc-800',
        activeBorder: 'border-l-white/70',
        dealerBadge: 'border-blue-800/50 bg-blue-900/30 text-blue-400',
        fmBadge: 'border-teal-800/50 bg-teal-900/30 text-teal-400',
        fuBadge: 'border-amber-800/50 bg-amber-900/30 text-amber-400',
        expertBadge: 'border-purple-800/50 bg-purple-900/30 text-purple-400',
        scBadge: 'border-indigo-800/50 bg-indigo-900/30 text-indigo-400',
        estimatorBadge: 'border-teal-800/50 bg-teal-900/30 text-teal-400',
        designerBadge: 'border-sky-800/50 bg-sky-900/30 text-sky-400',
        endUserBadge: 'border-rose-800/50 bg-rose-900/30 text-rose-400',
        employeeBadge: 'border-emerald-800/50 bg-emerald-900/30 text-emerald-400',
        opsMgrBadge: 'border-blue-800/50 bg-blue-900/30 text-blue-400',
        apCoordBadge: 'border-violet-800/50 bg-violet-900/30 text-violet-400',
        cfoBadge: 'border-amber-800/50 bg-amber-900/30 text-amber-400',
        accountLeadBadge: 'border-teal-800/50 bg-teal-900/30 text-teal-400',
        projectMgrBadge: 'border-violet-800/50 bg-violet-900/30 text-violet-400',
        financeArBadge: 'border-amber-800/50 bg-amber-900/30 text-amber-400',
        collapsedBg: 'bg-zinc-950',
        collapsedText: 'text-zinc-400',
        collapsedBorder: 'border-zinc-800/50',
        fab: 'bg-zinc-900 text-white border-zinc-700 hover:bg-zinc-800',
    } : {
        // Light sidebar (app is in dark mode)
        bg: 'bg-white',
        bgHeader: 'bg-zinc-50',
        bgStep: 'bg-zinc-50/60',
        bgStepActive: 'bg-zinc-100',
        bgBadge: 'bg-zinc-100',
        bgBadgeActive: 'bg-zinc-200',
        bgBtn: 'bg-zinc-100',
        bgBtnHover: 'hover:bg-zinc-200',
        bgNext: 'bg-zinc-900',
        bgNextHover: 'hover:bg-zinc-800',
        textNext: 'text-white',
        border: 'border-zinc-200',
        borderSubtle: 'border-zinc-200/80',
        textTitle: 'text-zinc-900',
        textBody: 'text-zinc-700',
        textMuted: 'text-zinc-500',
        textDim: 'text-zinc-400',
        textBadge: 'text-zinc-500',
        textBadgeActive: 'text-zinc-800',
        textBtn: 'text-zinc-700',
        iconDone: 'text-emerald-600',
        iconDoneFill: 'fill-emerald-600/10',
        iconActive: 'border-zinc-900 bg-white',
        iconActiveDot: 'bg-zinc-900',
        iconPending: 'text-zinc-300',
        connectorDone: 'bg-emerald-500/40',
        connectorPending: 'bg-zinc-200',
        activeBorder: 'border-l-zinc-900',
        dealerBadge: 'border-blue-200 bg-blue-50 text-blue-700',
        fmBadge: 'border-teal-200 bg-teal-50 text-teal-700',
        fuBadge: 'border-amber-200 bg-amber-50 text-amber-700',
        expertBadge: 'border-purple-200 bg-purple-50 text-purple-700',
        scBadge: 'border-indigo-200 bg-indigo-50 text-indigo-700',
        estimatorBadge: 'border-teal-200 bg-teal-50 text-teal-700',
        designerBadge: 'border-sky-200 bg-sky-50 text-sky-700',
        endUserBadge: 'border-rose-200 bg-rose-50 text-rose-700',
        employeeBadge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        opsMgrBadge: 'border-blue-200 bg-blue-50 text-blue-700',
        apCoordBadge: 'border-violet-200 bg-violet-50 text-violet-700',
        cfoBadge: 'border-amber-200 bg-amber-50 text-amber-700',
        accountLeadBadge: 'border-teal-200 bg-teal-50 text-teal-700',
        projectMgrBadge: 'border-violet-200 bg-violet-50 text-violet-700',
        financeArBadge: 'border-amber-200 bg-amber-50 text-amber-700',
        collapsedBg: 'bg-white',
        collapsedText: 'text-zinc-500',
        collapsedBorder: 'border-zinc-200',
        fab: 'bg-white text-zinc-900 border-zinc-200 hover:bg-zinc-50',
    };

    if (!isDemoActive) {
        return (
            <div className="fixed bottom-6 right-6 z-50">
                <button
                    onClick={() => setIsDemoActive(true)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-full shadow-lg border transition-all font-semibold ${c.fab}`}
                >
                    <Play size={20} fill="currentColor" />
                    <span>Demo</span>
                </button>
            </div>
        );
    }

    if (isSidebarCollapsed) {
        return (
            <div className="fixed left-0 top-32 z-[300]">
                <button
                    onClick={() => setIsSidebarCollapsed(false)}
                    className={`flex flex-col items-center justify-center gap-2 py-4 px-2 rounded-r-xl border border-l-0 shadow-2xl transition-all group w-12 ${c.collapsedBg} ${c.collapsedText} ${c.collapsedBorder} hover:opacity-80`}
                >
                    <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>Demo</span>
                </button>
            </div>
        );
    }

    return (
        <div className={`fixed left-0 top-0 h-full w-80 ${c.bg} border-r ${c.borderSubtle} z-[300] flex flex-col shadow-2xl transition-all duration-300`}>
            {/* Header */}
            <div className={`p-6 border-b ${c.border} ${c.bgHeader}`}>
                <div className="flex items-center justify-between mb-1">
                    <h2 className={`text-lg font-bold ${c.textTitle}`}>Demo Flow</h2>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setIsSidebarCollapsed(true)}
                            className={`p-1 rounded-md ${c.textMuted} hover:opacity-70 transition-colors`}
                            title="Collapse"
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <button
                            onClick={() => setIsDemoActive(false)}
                            className={`${c.textMuted} hover:opacity-70 text-xs uppercase tracking-wider font-semibold ml-1 transition-colors`}
                        >
                            Exit
                        </button>
                    </div>
                </div>
                <p className={`text-xs ${c.textDim}`}>Guided Experience Simulation</p>

                {/* Officeworks · Flow dropdown selector (Spec Check · Labor & Delivery · Sales) */}
                {isOfficeworks && (() => {
                    const FLOW_OPTIONS = [
                        { id: 'spec-check'    as const, label: 'Spec Check & Design', count: flowCounts.specCheck },
                        { id: 'labor-delivery' as const, label: 'Labor & Delivery',    count: flowCounts.laborDelivery },
                        { id: 'sales'         as const, label: 'Sales',                count: flowCounts.sales },
                    ]
                    const activeOpt = FLOW_OPTIONS.find(f => f.id === activeFlow) ?? FLOW_OPTIONS[0]
                    return (
                        <div className="mt-4">
                            <Popover className="relative">
                                {({ open }) => (
                                    <>
                                        <PopoverButton
                                            className={`w-full inline-flex items-center justify-between gap-2 px-3 py-2 rounded-md text-[12px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${c.bgBadgeActive} ${c.textBadgeActive}`}
                                            aria-label="Switch active flow"
                                        >
                                            <span className="truncate">{activeOpt.label}</span>
                                            <span className="inline-flex items-center gap-1.5 shrink-0">
                                                <span className={`text-[10px] tabular-nums rounded-full px-1.5 ${c.bgBadge} ${c.textBadge}`}>
                                                    {activeOpt.count}
                                                </span>
                                                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
                                            </span>
                                        </PopoverButton>
                                        <Transition
                                            as={React.Fragment}
                                            enter="transition ease-out duration-150"
                                            enterFrom="opacity-0 -translate-y-1"
                                            enterTo="opacity-100 translate-y-0"
                                            leave="transition ease-in duration-100"
                                            leaveFrom="opacity-100 translate-y-0"
                                            leaveTo="opacity-0 -translate-y-1"
                                        >
                                            <PopoverPanel className="absolute z-50 left-0 right-0 mt-1 rounded-md bg-card border border-border shadow-lg overflow-hidden">
                                                {({ close }) => (
                                                    <ul role="listbox" aria-label="Officeworks flows">
                                                        {FLOW_OPTIONS.map(opt => {
                                                            const isActive = activeFlow === opt.id
                                                            return (
                                                                <li key={opt.id} role="option" aria-selected={isActive}>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() => { handleFlowSwitch(opt.id); close() }}
                                                                        className={`w-full inline-flex items-center gap-2 px-3 py-2 text-[12px] transition-colors text-left ${
                                                                            isActive
                                                                                ? 'bg-primary/10 text-foreground font-semibold'
                                                                                : 'text-foreground hover:bg-muted/50'
                                                                        }`}
                                                                    >
                                                                        <span className="flex-1 truncate">{opt.label}</span>
                                                                        <span className="text-[10px] tabular-nums rounded-full bg-zinc-900/10 dark:bg-white/10 px-1.5 text-muted-foreground">
                                                                            {opt.count}
                                                                        </span>
                                                                        {isActive && <Check className="h-3.5 w-3.5 text-primary" aria-hidden="true" />}
                                                                    </button>
                                                                </li>
                                                            )
                                                        })}
                                                    </ul>
                                                )}
                                            </PopoverPanel>
                                        </Transition>
                                    </>
                                )}
                            </Popover>
                        </div>
                    )
                })()}

                {/* Officeworks · L&D vertical sub-toggle (Furniture ↔ Walls) */}
                {isOfficeworks && activeFlow === 'labor-delivery' && (
                    <div className="mt-2 flex gap-1 p-0.5 rounded-md bg-zinc-900/5 dark:bg-white/5">
                        <button
                            type="button"
                            onClick={() => handleVerticalSwitch('furniture')}
                            aria-pressed={activeVertical === 'furniture'}
                            className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                activeVertical === 'furniture'
                                    ? `${c.bgBadgeActive} ${c.textBadgeActive}`
                                    : `${c.textMuted} hover:opacity-80`
                            }`}
                        >
                            Furniture · 80%
                        </button>
                        <button
                            type="button"
                            onClick={() => handleVerticalSwitch('walls')}
                            aria-pressed={activeVertical === 'walls'}
                            className={`flex-1 px-2 py-1 rounded text-[10px] font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                                activeVertical === 'walls'
                                    ? `${c.bgBadgeActive} ${c.textBadgeActive}`
                                    : `${c.textMuted} hover:opacity-80`
                            }`}
                        >
                            Walls · 20%
                        </button>
                    </div>
                )}
            </div>

            {/* Steps List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-1 pt-6 scrollbar-micro">
                {displayedSteps.map(({ step, originalIndex }, displayIndex) => {
                    const isActive = originalIndex === currentStepIndex;
                    const isCompleted = originalIndex < currentStepIndex;
                    const prevDisplayed = displayIndex > 0 ? displayedSteps[displayIndex - 1] : null;
                    const nextDisplayed = displayIndex < displayedSteps.length - 1 ? displayedSteps[displayIndex + 1] : null;
                    const showGroupHeader = displayIndex === 0 || prevDisplayed!.step.groupId !== step.groupId;
                    // Compute sequential display number from group position WITHIN the
                    // displayed (filtered) array so numbering looks contiguous per tab.
                    const groupIds = [...new Set(displayedSteps.map(d => d.step.groupId))];
                    const groupSteps = displayedSteps.filter(d => d.step.groupId === step.groupId);
                    const posInGroup = groupSteps.findIndex(d => d.step.id === step.id);
                    const groupDisplayNum = groupIds.indexOf(step.groupId) + 1;
                    const displayNumber = `${groupDisplayNum}.${posInGroup + 1}`;

                    return (
                        <React.Fragment key={step.id}>
                            {showGroupHeader && (
                                <div className="pt-4 pb-2 first:pt-0">
                                    <h3 className={`text-[10px] font-bold ${c.textDim} uppercase tracking-widest`}>{step.groupTitle}</h3>
                                </div>
                            )}
                            <div
                                onClick={() => goToStep(originalIndex)}
                                className={`relative flex items-start gap-3 p-2.5 rounded-lg cursor-pointer transition-all ${isActive ? `${c.bgStepActive} border-l-2 ${c.activeBorder}` : 'hover:opacity-80'}`}
                            >
                                {/* Connector Line · only when next displayed step is in same group */}
                                {nextDisplayed && nextDisplayed.step.groupId === step.groupId && (
                                    <div className={`absolute left-[22px] top-11 w-0.5 h-8 ${isCompleted ? c.connectorDone : c.connectorPending}`} />
                                )}

                                {/* Icon / Status */}
                                <div className="z-10 mt-0.5 shrink-0">
                                    {isCompleted ? (
                                        <CheckCircle2 size={20} className={`${c.iconDone} ${c.iconDoneFill}`} />
                                    ) : isActive ? (
                                        <div className={`w-5 h-5 rounded-full border-2 ${c.iconActive} flex items-center justify-center`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${c.iconActiveDot}`} />
                                        </div>
                                    ) : (
                                        <Circle size={20} className={c.iconPending} />
                                    )}
                                </div>

                                {/* Content */}
                                <div className="space-y-0.5 min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${isActive ? `${c.bgBadgeActive} ${c.textBadgeActive}` : `${c.bgBadge} ${c.textBadge}`}`}>
                                            STEP {displayNumber}
                                        </span>
                                        {(() => {
                                            const label = resolveRoleLabel(step.role, step.app);
                                            return (
                                                <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-sm border ${label === 'Facility Manager' ? c.fmBadge : label === 'Facility User' ? c.fuBadge : label === 'Dealer' ? c.dealerBadge : label === 'End User' ? c.endUserBadge : label === 'Sales Coordinator' ? c.scBadge : label === 'Estimator' ? c.estimatorBadge : label === 'Designer' ? c.designerBadge : label === 'Employee' ? c.employeeBadge : label === 'Operations Manager' ? c.opsMgrBadge : label === 'AP Coordinator' ? c.apCoordBadge : label === 'CFO' ? c.cfoBadge : label === 'Account Manager' ? c.accountLeadBadge : label === 'Project Manager' ? c.projectMgrBadge : label === 'Finance / AR' ? c.financeArBadge : label === 'System' ? c.expertBadge : c.expertBadge}`}>
                                                    {label === 'Facility Manager' ? 'FACILITY MANAGER' : label === 'Facility User' ? 'FACILITY USER' : label}
                                                </span>
                                            );
                                        })()}
                                        {STEP_BEHAVIOR[step.id]?.mode === 'auto' && (
                                            <span className={`text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5 ${isActive ? `${c.bgBadgeActive} ${c.textBadgeActive}` : `${c.bgBadge} ${c.textBadge}`}`}>
                                                <Loader2 size={8} className={isActive ? 'animate-spin' : ''} />
                                                AUTO
                                            </span>
                                        )}
                                        {HERO_STEP_IDS.has(step.id) && (
                                            <span
                                                className={`text-[9px] px-1 py-0.5 rounded flex items-center gap-0.5 font-bold uppercase tracking-wider ${
                                                    isActive
                                                        ? 'bg-amber-500/30 text-amber-200'
                                                        : 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                                                }`}
                                                title="Hero moment — the demo's emotional peak"
                                            >
                                                <Star size={8} className="fill-current" />
                                                HERO
                                            </span>
                                        )}
                                    </div>
                                    <h3 className={`font-semibold text-sm leading-tight ${isActive ? c.textTitle : c.textBody}`}>
                                        {step.title}
                                    </h3>
                                    {isActive && (
                                        <p className={`text-[11px] ${c.textMuted} leading-relaxed animate-in fade-in slide-in-from-top-1 duration-300`}>
                                            {step.description}
                                        </p>
                                    )}
                                    {/* Officeworks demo has no data threads · block intentionally omitted */}
                                    {isCompleted && hasDataThreads && (
                                        <p className={`text-[8px] italic ${c.textDim} leading-tight`}>
                                            {/* never rendered */}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </React.Fragment>
                    );
                })}
            </div>

            {/* Paused Indicator */}
            {isPaused && (
                <div className={`mx-4 mb-2 flex items-center justify-center gap-2 py-2 rounded-lg border ${isDarkSidebar ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' : 'bg-amber-50 border-amber-200 text-amber-600'} animate-pulse`}>
                    <Pause size={14} />
                    <span className="text-xs font-bold uppercase tracking-wider">Paused</span>
                </div>
            )}

            {/* Navigation Controls */}
            <div className={`p-4 border-t ${c.border} ${c.bgHeader}`}>
                <div className="flex gap-2">
                    <button
                        onClick={prevStep}
                        disabled={currentStepIndex === 0}
                        className={`flex-1 flex items-center justify-center gap-1.5 ${c.bgBtn} ${c.textBtn} py-2 rounded-lg text-sm font-semibold disabled:opacity-40 ${c.bgBtnHover} transition-colors`}
                    >
                        <ChevronLeft size={16} />
                        Back
                    </button>
                    <button
                        onClick={togglePause}
                        className={`flex items-center justify-center w-10 rounded-lg text-sm font-semibold transition-colors ${isPaused
                            ? (isDarkSidebar ? 'bg-amber-500/20 text-amber-400 hover:bg-amber-500/30' : 'bg-amber-100 text-amber-600 hover:bg-amber-200')
                            : `${c.bgBtn} ${c.textBtn} ${c.bgBtnHover}`
                        }`}
                        title={isPaused ? 'Resume' : 'Pause'}
                    >
                        {isPaused ? <Play size={16} /> : <Pause size={16} />}
                    </button>
                    <button
                        onClick={nextStep}
                        disabled={currentStepIndex === steps.length - 1}
                        className={`flex-[1.5] flex items-center justify-center gap-1.5 ${c.bgNext} ${c.textNext} py-2 rounded-lg text-sm font-semibold disabled:opacity-40 ${c.bgNextHover} transition-colors shadow-sm`}
                    >
                        Next
                        <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        </div>
    );
}
