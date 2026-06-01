/**
 * COMPONENT: PageShell
 * PURPOSE: Generic page shell — consistent header (tenant + product
 *          breadcrumb), title row, optional preHeader slot, body.
 *
 * PROPS:
 *   - title: string                 — page title
 *   - subtitle?: string             — optional 1-line description
 *   - icon?: ReactNode              — optional Lucide icon for the title
 *   - actions?: ReactNode           — optional right-aligned actions (CTAs)
 *   - preHeader?: ReactNode         — slot rendered above the title row
 *   - tenantLabel: string           — tenant short name (e.g. "Officeworks")
 *   - productLabel: string          — product label (e.g. "Strata for Officeworks")
 *
 * DS TOKENS: bg-background · text-foreground · text-muted-foreground · border-border
 */

import type { ReactNode } from 'react'
import { useDemo } from '../../context/DemoContext'

interface PageShellProps {
    title: string
    subtitle?: string
    icon?: ReactNode
    actions?: ReactNode
    /** activeApp kept for backwards compatibility — now unused (primary nav lives in Navbar) */
    activeApp?: string
    /** Optional slot rendered above the title row — used for tab switchers etc. */
    preHeader?: ReactNode
    tenantLabel: string
    productLabel: string
    children: ReactNode
}

export default function PageShell({ title, subtitle, icon, actions, preHeader, tenantLabel, productLabel, children }: PageShellProps) {
    const { isSidebarCollapsed, isDemoActive } = useDemo()
    const maxW = isDemoActive && !isSidebarCollapsed ? 'max-w-5xl' : 'max-w-7xl'
    return (
        <div className="min-h-screen bg-background dark:bg-black pt-24 px-4 pb-20">
            <div className={`${maxW} mx-auto space-y-6 px-3 transition-all duration-300`}>
                {preHeader && <div>{preHeader}</div>}
                {/* Page title row */}
                <div className="flex items-center justify-between gap-4 pb-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        {icon && (
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-zinc-900 dark:text-primary">
                                {icon}
                            </div>
                        )}
                        <div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span className="font-medium uppercase tracking-wider">{tenantLabel}</span>
                                <span>·</span>
                                <span>{productLabel}</span>
                            </div>
                            <h1 className="text-2xl font-bold text-foreground leading-tight">{title}</h1>
                            {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
                        </div>
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>

                {/* Page body */}
                {children}
            </div>
        </div>
    )
}
