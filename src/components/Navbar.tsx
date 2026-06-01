import { Menu, MenuButton, MenuItem, MenuItems, Transition, Popover, PopoverButton, PopoverPanel } from '@headlessui/react'
import { Fragment } from 'react'
import {
    HomeIcon, CubeIcon, ClipboardDocumentListIcon, ArrowTrendingUpIcon,
    Squares2X2Icon, SunIcon, MoonIcon, ChevronDownIcon,
    UserIcon, DocumentTextIcon, ChartBarIcon, ExclamationCircleIcon,
    CalendarIcon, EllipsisHorizontalIcon, ArrowRightOnRectangleIcon, BriefcaseIcon, CheckIcon,
    BookOpenIcon, TruckIcon, TagIcon, UsersIcon,
    CalculatorIcon, CubeTransparentIcon,
    BanknotesIcon,
    FolderIcon,
    WrenchScrewdriverIcon,
    PhotoIcon,
    CreditCardIcon,
    ArrowPathRoundedSquareIcon,
    PlayCircleIcon
} from '@heroicons/react/24/outline';
import { useTheme } from 'strata-design-system'
import { useTenant } from '../TenantContext'
import { useAuth } from '../context/AuthContext'
import { useDemo } from '../context/DemoContext'
import { useDemoProfile } from '../context/useDemoProfile'
import { readVertical, useOfficeworksVertical } from './officeworks/shared/verticalSignal';

import ActionCenter from './notifications/ActionCenter';

import logoLightBrand from '../assets/logo-light-brand.png';
import logoDarkBrand from '../assets/logo-dark-brand.png';

// --- Officeworks demo personas (single profile · standalone demo) ---
const DEMO_PROFILES: Record<string, { name: string; role: string; photo: string }> = {
    Dealer: {
        name: 'Officeworks',
        role: 'Strata AI Demo',
        photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop&crop=face',
    },
    'Officeworks Design Manager': {
        name: 'Felicia Miano-Poles',
        role: 'EVP Design & PM',
        photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=80&h=80&fit=crop&crop=face',
    },
    'Officeworks Designer': {
        name: 'Kimberly Tucker',
        role: 'Design Manager · PA',
        photo: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=80&h=80&fit=crop&crop=face',
    },
    'Officeworks Sales Coordinator': {
        name: 'Randy Martinez',
        role: 'Sales Coordinator',
        photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop&crop=face',
    },
    'Officeworks Peer Reviewer': {
        name: 'Rebecca Warren',
        role: 'Lead Designer · MA / NY / NJ',
        photo: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&h=80&fit=crop&crop=face',
    },
    'Officeworks Sr Operations': {
        name: 'Alan McPhee',
        role: 'Sr Operations · Furniture',
        photo: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=80&h=80&fit=crop&crop=face',
    },
    'Officeworks Head of Ops Walls': {
        name: 'Paul Egan',
        role: 'Head of Ops · Walls',
        photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=80&h=80&fit=crop&crop=face',
    },
    'Officeworks Sales Lead': {
        name: 'Sales Lead',
        role: 'Sales · Mid-Atlantic · Furniture + Walls',
        photo: 'https://images.unsplash.com/photo-1573497019418-b400bb3ab074?w=80&h=80&fit=crop&crop=face',
    },
};

function resolveProfileKey(role: string | undefined, app: string | undefined): string {
    if (app?.startsWith('bfi-')) {
        if (role === 'Project Manager')      return 'BFI Project Manager';
        if (role === 'Finance / AR')         return 'BFI Finance';
        if (role === 'Designer')             return 'BFI Designer';
        if (role === 'Receiving Coordinator') return 'BFI Receiving';
        if (role === 'BFI Manager')          return 'BFI Manager';
        return 'BFI Account Manager';
    }
    if (app?.startsWith('officeworks-')) {
        if (role === 'Design Manager')    return 'Officeworks Design Manager';
        if (role === 'Designer')          return 'Officeworks Designer';
        if (role === 'Sales Coordinator') return 'Officeworks Sales Coordinator';
        if (role === 'Peer Reviewer')     return 'Officeworks Peer Reviewer';
        if (role === 'Sr Operations') {
            // L&D Sr Operations role splits into Furniture / Walls
            // by the active vertical sub-toggle set in the sidebar.
            const v = readVertical();
            return v === 'walls' ? 'Officeworks Head of Ops Walls' : 'Officeworks Sr Operations';
        }
        if (role === 'Sales Lead') return 'Officeworks Sales Lead';
        return 'Officeworks Design Manager';
    }
    return 'Dealer';
}

// Update supported tabs
export type NavTab = 'Overview' | 'Inventory' | 'Catalogs' | 'Service Center' | 'Transactions' | 'CRM' | 'Pricing';

function NavItem({ icon, label, active = false, badge, onClick }: { icon: React.ReactNode, label: string, active?: boolean, badge?: string, onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`relative flex items-center justify-center h-9 px-2 rounded-full transition-all duration-300 group overflow-hidden ${active ? 'bg-primary text-primary-foreground' : 'hover:bg-muted text-muted-foreground'}`}
        >
            <span className="relative z-10">{icon}</span>
            <span className={`ml-2 text-sm font-medium whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 ease-in-out ${active ? 'max-w-xs opacity-100' : ''}`}>
                {label}
            </span>
            {badge && (
                <span className={`ml-1 text-[7px] px-1.5 py-0.5 rounded font-bold uppercase border whitespace-nowrap max-w-0 opacity-0 group-hover:max-w-xs group-hover:opacity-100 transition-all duration-300 ease-in-out ${active ? 'max-w-xs opacity-100 bg-primary-foreground/10 text-primary-foreground border-primary-foreground/20' : 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20'}`}>
                    {badge}
                </span>
            )}
        </button>
    )
}

interface NavbarProps {
    onLogout: () => void;
    activeTab?: NavTab | string;
    onNavigateToWorkspace: () => void;
    onNavigate: (page: any) => void;
    onOpenDemoGuide?: () => void;
    appName?: string;
    companyName?: string;
    customNavigation?: { name: string, page: string, icon: any, badge?: string }[];
}

export default function Navbar({
    onLogout,
    activeTab = 'Overview',
    onNavigateToWorkspace,
    onNavigate,
    onOpenDemoGuide,
    appName,
    companyName,
    customNavigation
}: NavbarProps) {
    const { theme, toggleTheme } = useTheme()
    const { currentTenant, tenants, setTenant } = useTenant()
    const { user } = useAuth()
    const { isDemoActive, currentStep, isSidebarCollapsed } = useDemo()
    const { activeProfile, profiles, switchProfile } = useDemoProfile()
    const sidebarExpanded = isDemoActive && !isSidebarCollapsed
    // Subscribe to the Officeworks vertical signal so the avatar updates
    // when the sidebar sub-toggle switches Furniture ↔ Walls.
    useOfficeworksVertical()

    // Demo profile — always show a profile (default to Dealer for initial screen)
    const demoProfile = isDemoActive ? DEMO_PROFILES[resolveProfileKey(currentStep?.role, currentStep?.app)] : DEMO_PROFILES['Dealer'];

    const displayName = demoProfile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
    const userInitials = displayName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    const userEmail = user?.email || ''

    const allNavigation = customNavigation || [
        { name: 'Dashboard', page: 'dashboard', icon: HomeIcon },
        { name: 'Service Center', page: 'mac', icon: ArrowPathRoundedSquareIcon },
        { name: 'Transactions', page: 'transactions', icon: BanknotesIcon },
    ];

    // Use the full custom navigation provided by each simulation app
    const navigation = allNavigation;

    return (
        <div className={`fixed top-6 z-50 flex justify-center px-4 transition-all duration-300 ${sidebarExpanded ? 'left-80 right-0' : 'left-0 right-0'}`}>
            <div className={`relative flex items-center lg:justify-between px-3 py-2 rounded-full gap-1 bg-card/80 backdrop-blur-xl border border-border shadow-lg dark:shadow-glow-md w-full transition-all duration-300 ${sidebarExpanded ? 'max-w-5xl' : 'max-w-7xl'}`}>

                {/* Left Group (Logo + Tenant) */}
                <div className="flex items-center gap-1">
                    {/* Logo */}
                    <div className="px-2 shrink-0">
                        <img src={logoLightBrand} alt="Strata" className="h-8 w-20 object-contain block dark:hidden" />
                        <img src={logoDarkBrand} alt="Strata" className="h-8 w-20 object-contain hidden dark:block" />
                    </div>

                    <div className="h-6 w-px bg-border mx-1 hidden lg:block"></div>

                    {/* App Name + Company (static · single profile) */}
                    <div className="hidden lg:flex flex-col items-start text-left px-2 py-1.5">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider leading-none">{appName || 'Strata AI'}</span>
                        <span className="text-sm font-bold text-foreground leading-tight">
                            {companyName || activeProfile.companyName}
                        </span>
                    </div>
                </div>



                {/* Center Group (Nav Items) - Absolutely Centered on Desktop */}
                <div className="hidden lg:flex items-center gap-1 absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
                    {navigation.map(item => (
                        <NavItem
                            key={item.name}
                            icon={<item.icon className="w-4 h-4" />}
                            label={item.name}
                            active={activeTab === item.page}
                            badge={(item as any).badge}
                            onClick={() => onNavigate(item.page)}
                        />
                    ))}
                </div>

                {/* Right Group (Actions) */}
                <div className="flex items-center gap-1">
                    <div className="h-6 w-px bg-border mx-1 hidden lg:block"></div>

                    {/* Action Center - New Feature */}
                    <ActionCenter />

                    <div className="h-4 w-px bg-border mx-1"></div>

                    {/* My Apps - Hidden for demo build */}
                    {false && <Popover className="relative">
                        <PopoverButton className="p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors outline-none">
                            <Squares2X2Icon className="w-5 h-5" />
                        </PopoverButton>
                        <Transition
                            as={Fragment}
                            enter="transition ease-out duration-200"
                            enterFrom="opacity-0 translate-y-1"
                            enterTo="opacity-100 translate-y-0"
                            leave="transition ease-in duration-150"
                            leaveFrom="opacity-100 translate-y-0"
                            leaveTo="opacity-0 translate-y-1"
                        >
                            <PopoverPanel className={`fixed top-[90px] w-[320px] max-h-[80vh] overflow-y-auto p-3 bg-card/95 backdrop-blur-xl border border-border shadow-2xl rounded-3xl z-[100] lg:mt-4 scrollbar-minimal transition-all duration-300 ${sidebarExpanded ? 'left-[calc(50%+10rem)] -translate-x-1/2' : 'left-1/2 -translate-x-1/2'}`}>
                                <div className="space-y-4">
                                    {/* Mobile Navigation List - Hidden on Desktop */}
                                    <div className="lg:hidden space-y-1">
                                        <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">Navigation</h3>
                                        {navigation.map((item, i) => (
                                            <button
                                                key={i}
                                                onClick={() => onNavigate(item.page)}
                                                className={`flex items-center gap-3 w-full p-2 rounded-xl text-sm font-medium transition-colors ${activeTab === item.page ? 'bg-primary text-primary-foreground shadow-sm dark:bg-primary/10 dark:text-primary dark:shadow-none' : 'hover:bg-muted text-foreground'}`}
                                            >
                                                <item.icon className="w-4 h-4" />
                                                {item.name}
                                                {(item as any).badge && (
                                                    <span className="text-[7px] px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-500 font-bold uppercase border border-indigo-500/20">
                                                        {(item as any).badge}
                                                    </span>
                                                )}
                                            </button>
                                        ))}
                                        <div className="h-px bg-border my-2 mx-1"></div>
                                    </div>

                                    {/* Mobile View: Categorized Grid */}
                                    <div className="lg:hidden space-y-4">
                                        {[
                                            {
                                                title: "Platform",
                                                apps: [
                                                    { icon: <BriefcaseIcon className="w-6 h-6" />, label: "My Work Space", color: "text-zinc-900", bg: "bg-primary", isHighlighted: true, onClick: onNavigateToWorkspace },
                                                    { icon: <HomeIcon className="w-6 h-6" />, label: "Portal", color: "text-zinc-900 dark:text-primary", bg: "bg-primary/10", onClick: () => onNavigate('dashboard') },
                                                ]
                                            },
                                            {
                                                title: "Sales Tools",
                                                apps: [
                                                    { icon: <CalculatorIcon className="w-6 h-6" />, label: "Quoting", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/10" },
                                                    { icon: <WrenchScrewdriverIcon className="w-6 h-6" />, label: "Configurator", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
                                                    { icon: <PhotoIcon className="w-6 h-6" />, label: "Marketing", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-500/10" },
                                                ]
                                            },
                                            {
                                                title: "Finance",
                                                apps: [
                                                    { icon: <CreditCardIcon className="w-6 h-6" />, label: "Credit", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
                                                    { icon: <DocumentTextIcon className="w-6 h-6" />, label: "Invoices", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
                                                    { icon: <BanknotesIcon className="w-6 h-6" />, label: "Rebates", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-500/10" },
                                                ]
                                            },
                                            {
                                                title: "Support",
                                                apps: [
                                                    { icon: <BookOpenIcon className="w-6 h-6" />, label: "Academy", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
                                                    { icon: <ExclamationCircleIcon className="w-6 h-6" />, label: "Service", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
                                                ]
                                            }
                                        ].map((category, idx) => (
                                            <div key={idx}>
                                                <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2 px-1">{category.title}</h3>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {category.apps.map((app, i) => (
                                                        <button
                                                            key={i}
                                                            // @ts-ignore
                                                            onClick={app.onClick}
                                                            className={`relative flex flex-col items-center gap-2 p-2 rounded-2xl transition-all group outline-none focus:ring-2 focus:ring-primary ${
                                                                // @ts-ignore
                                                                app.isHighlighted
                                                                    ? 'ring-1 ring-gray-200 dark:ring-zinc-700 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:ring-0'
                                                                    : 'hover:bg-primary hover:text-primary-foreground hover:shadow-md'
                                                                }`}>
                                                            {/* Badge */}
                                                            {/* @ts-ignore */}
                                                            {app.isHighlighted && (
                                                                <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-white/20 text-primary-foreground text-[9px] font-bold shadow-sm backdrop-blur-sm">
                                                                    New
                                                                </span>
                                                            )}
                                                            <div className={`p-2 rounded-2xl transition-all shadow-sm ${
                                                                // @ts-ignore
                                                                app.isHighlighted
                                                                    ? 'bg-primary text-zinc-900 group-hover:bg-transparent group-hover:text-primary-foreground'
                                                                    : `${app.bg} ${app.color} group-hover:bg-transparent group-hover:text-primary-foreground group-hover:shadow-none`
                                                                }`}>
                                                                {app.icon}
                                                            </div>
                                                            <span className={`text-[10px] font-semibold ${
                                                                // @ts-ignore
                                                                app.isHighlighted
                                                                    ? 'text-primary-foreground'
                                                                    : 'text-muted-foreground group-hover:text-primary-foreground'
                                                                }`}>{app.label}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Desktop View: Unified Grid without Titles */}
                                    <div className="hidden lg:grid grid-cols-3 gap-2">
                                        {[
                                            { icon: <BriefcaseIcon className="w-6 h-6" />, label: "My Work Space", color: "text-zinc-900", bg: "bg-primary", isHighlighted: true, onClick: onNavigateToWorkspace },
                                            { icon: <HomeIcon className="w-6 h-6" />, label: "Portal", color: "text-zinc-900 dark:text-primary", bg: "bg-primary/10", onClick: () => onNavigate('dashboard') },
                                            { icon: <CalculatorIcon className="w-6 h-6" />, label: "Quoting", color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-500/10" },
                                            { icon: <WrenchScrewdriverIcon className="w-6 h-6" />, label: "Configurator", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
                                            { icon: <PhotoIcon className="w-6 h-6" />, label: "Marketing", color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-500/10" },
                                            { icon: <CreditCardIcon className="w-6 h-6" />, label: "Credit", color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10" },
                                            { icon: <DocumentTextIcon className="w-6 h-6" />, label: "Invoices", color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10" },
                                            { icon: <BanknotesIcon className="w-6 h-6" />, label: "Rebates", color: "text-teal-600 dark:text-teal-400", bg: "bg-teal-50 dark:bg-teal-500/10" },
                                            { icon: <BookOpenIcon className="w-6 h-6" />, label: "Academy", color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-500/10" },
                                            { icon: <ExclamationCircleIcon className="w-6 h-6" />, label: "Service", color: "text-red-600 dark:text-red-400", bg: "bg-red-50 dark:bg-red-500/10" },
                                        ]
                                            .map((app, i) => (
                                                <button
                                                    key={i}
                                                    // @ts-ignore
                                                    onClick={app.onClick}
                                                    className={`relative flex flex-col items-center gap-2 p-2 rounded-2xl transition-all group outline-none focus:ring-2 focus:ring-primary ${
                                                        // @ts-ignore
                                                        app.isHighlighted
                                                            ? 'ring-1 ring-gray-200 dark:ring-zinc-700 hover:bg-primary hover:text-primary-foreground hover:shadow-md hover:ring-0'
                                                            : 'hover:bg-primary hover:text-primary-foreground hover:shadow-md'
                                                        }`}>
                                                    {/* Badge */}
                                                    {/* @ts-ignore */}
                                                    {app.isHighlighted && (
                                                        <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 text-[9px] font-bold shadow-sm">
                                                            New
                                                        </span>
                                                    )}
                                                    <div className={`p-2 rounded-2xl ${app.bg} ${app.color} transition-all shadow-sm ${
                                                        // @ts-ignore
                                                        app.isHighlighted
                                                            ? 'bg-primary text-zinc-900 group-hover:bg-transparent group-hover:text-primary-foreground'
                                                            : 'group-hover:bg-transparent group-hover:text-primary-foreground group-hover:shadow-none'
                                                        }`}>
                                                        {app.icon}
                                                    </div>
                                                    <span className={`text-[10px] font-semibold ${
                                                        // @ts-ignore
                                                        app.isHighlighted
                                                            ? 'text-foreground'
                                                            : 'text-muted-foreground group-hover:text-primary-foreground'
                                                        }`}>{app.label}</span>
                                                </button>
                                            ))}
                                        {/* More Button - Desktop Only */}
                                        <button className="relative flex flex-col items-center gap-2 p-2 rounded-2xl transition-all group outline-none hover:bg-primary hover:text-primary-foreground hover:shadow-md">
                                            <div className="p-2 rounded-2xl bg-muted text-muted-foreground group-hover:bg-transparent group-hover:text-primary-foreground transition-all shadow-sm">
                                                <EllipsisHorizontalIcon className="w-6 h-6" />
                                            </div>
                                            <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary-foreground">More</span>
                                        </button>
                                    </div>
                                </div>
                            </PopoverPanel>
                        </Transition>
                    </Popover>}

                    {/* Demo Guide - Hidden for demo build */}
                    {false && onOpenDemoGuide && (
                        <button
                            onClick={onOpenDemoGuide}
                            className="flex p-2 rounded-full bg-purple-100 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/30 transition-colors animate-pulse ring-2 ring-purple-500/60 ring-offset-2 ring-offset-background shadow-sm"
                            title="Demo Guide"
                        >
                            <PlayCircleIcon className="w-5 h-5" />
                        </button>
                    )}

                    <button onClick={toggleTheme} className="hidden lg:flex p-2 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                        {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                    </button>

                    <div className="relative group">
                        <button className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-muted transition-colors text-left outline-none">
                            {/* Demo mode: photo + name + role */}
                            {demoProfile ? (
                                <>
                                    <img
                                        src={demoProfile.photo}
                                        alt={demoProfile.name}
                                        className="w-8 h-8 rounded-full object-cover ring-2 ring-primary/40 shrink-0"
                                    />
                                    <div className="hidden sm:flex flex-col items-start max-w-[140px]">
                                        <span className="text-xs font-semibold text-foreground leading-tight truncate w-full">{demoProfile.name}</span>
                                        <span className="text-[10px] text-muted-foreground leading-none">{demoProfile.role}</span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0">
                                        {userInitials}
                                    </div>
                                </>
                            )}
                            <ChevronDownIcon className="w-3 h-3 text-muted-foreground" />
                        </button>
                        {/* User Dropdown */}
                        <div className="absolute top-full right-0 mt-2 w-56 py-2 rounded-xl bg-card/90 backdrop-blur-xl border border-border shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right z-50">

                            {/* User Info */}
                            <div className="px-4 py-2 border-b border-border mb-1">
                                <p className="text-sm font-medium">{displayName}</p>
                                <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                            </div>

                            {/* Tenant Selector Section */}
                            <div className="px-2 py-1 lg:hidden">
                                <p className="px-2 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">Switch Tenant</p>
                                {tenants.map((tenant) => (
                                    <button
                                        key={tenant}
                                        onClick={() => setTenant(tenant)}
                                        className="w-full flex items-center justify-between px-2 py-1.5 text-xs text-foreground rounded-lg hover:bg-muted transition-colors"
                                    >
                                        <span>{tenant}</span>
                                        {currentTenant === tenant && <CheckIcon className="w-3 h-3 text-primary" />}
                                    </button>
                                ))}
                                <div className="h-px bg-border my-1 mx-2"></div>
                            </div>

                            {/* Theme Toggle */}
                            <div className="p-1 lg:hidden">
                                <button onClick={toggleTheme} className="w-full text-left px-3 py-2 text-xs font-medium text-foreground hover:bg-muted rounded-lg flex items-center gap-2 transition-colors">
                                    {theme === 'dark' ? <SunIcon className="w-4 h-4" /> : <MoonIcon className="w-4 h-4" />}
                                    <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                                </button>
                                <div className="h-px bg-border my-1 mx-2"></div>
                            </div>

                            {/* Sign Out */}
                            <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-muted flex items-center gap-2">
                                <ArrowRightOnRectangleIcon className="w-4 h-4" />
                                Sign Out
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div >
    )
}
