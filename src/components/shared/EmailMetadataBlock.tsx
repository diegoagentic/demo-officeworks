/**
 * COMPONENT: EmailMetadataBlock
 * PURPOSE: Reusable metadata header for all BFI email dialogs.
 *          Default read-only (looks like a real email). Toggle "Edit" reveals
 *          inputs so the presenter can adjust subject, recipients, date, etc.
 *          Edit button is always visible — presenter can edit at any phase,
 *          including after Send, for demo flexibility.
 *
 *          Variants:
 *            - 'stacked'  · subject bold heading + label/value rows below
 *                          (used by SendProposalDialog, LaborQuoteDialog,
 *                           LaurenNotificationDialog, ClaimDialog, WalterNotifyDialog)
 *            - 'bordered' · single bordered card with all rows inside
 *                          (used by NancyDialog)
 */

import { useState } from 'react'
import { Pencil, Check } from 'lucide-react'

export interface EmailMetadataField {
    label: string
    value: string
    onChange: (v: string) => void
    /** CC fields render italic gray */
    muted?: boolean
}

interface EmailMetadataBlockProps {
    /** Optional subject rendered as bold heading (stacked variant only) */
    subject?: { value: string; onChange: (v: string) => void }
    /** Metadata rows (From / To / CC / Date / Subj) */
    fields: EmailMetadataField[]
    /** Visual variant — defaults to 'stacked' (email-like) */
    variant?: 'stacked' | 'bordered'
    /** Deprecated · kept for backwards-compatibility with call sites */
    disabled?: boolean
}

const fieldInputCls = 'flex-1 bg-transparent outline-none border-b border-transparent hover:border-border/60 focus:border-primary/50 transition-colors disabled:opacity-60 min-w-0'

export default function EmailMetadataBlock({ subject, fields, variant = 'stacked' }: EmailMetadataBlockProps) {
    const [editing, setEditing] = useState(false)
    const isEdit = editing

    // Edit button is always visible · presenter can edit at any phase (even after Send)
    const editButton = (
        <button
            type="button"
            onClick={() => setEditing(v => !v)}
            aria-pressed={editing}
            className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0"
        >
            {editing ? <><Check className="h-3 w-3" /> Done</> : <><Pencil className="h-3 w-3" /> Edit</>}
        </button>
    )

    if (variant === 'bordered') {
        return (
            <div className="rounded-xl border border-border overflow-hidden text-[11px]">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/30 border-b border-border/60">
                    <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Email metadata</span>
                    <span className="ml-auto">{editButton}</span>
                </div>
                {fields.map((row, i) => (
                    <div key={row.label} className={`flex gap-3 px-3 py-2.5 ${i < fields.length - 1 ? 'border-b border-border/60' : ''}`}>
                        <span className="text-muted-foreground font-semibold w-10 shrink-0">{row.label}</span>
                        {isEdit ? (
                            <input
                                value={row.value}
                                onChange={e => row.onChange(e.target.value)}
                                className={`${fieldInputCls} ${row.muted ? 'text-muted-foreground italic' : 'text-foreground'}`}
                            />
                        ) : (
                            <span className={`flex-1 truncate ${row.muted ? 'text-muted-foreground italic' : 'text-foreground'}`}>{row.value}</span>
                        )}
                    </div>
                ))}
            </div>
        )
    }

    // Stacked variant (default · email-like)
    return (
        <div className="space-y-1.5">
            <div className="flex items-start justify-between gap-2">
                {subject ? (
                    isEdit ? (
                        <input
                            value={subject.value}
                            onChange={e => subject.onChange(e.target.value)}
                            className="w-full text-[13px] font-bold text-foreground leading-snug bg-transparent outline-none border-b border-transparent hover:border-border/60 focus:border-primary/50 transition-colors"
                        />
                    ) : (
                        <p className="flex-1 text-[13px] font-bold text-foreground leading-snug">{subject.value}</p>
                    )
                ) : (
                    <div className="flex-1" />
                )}
                {editButton}
            </div>
            <div className="space-y-0.5">
                {fields.map(row => (
                    <div key={row.label} className="flex items-center gap-2 text-[10px]">
                        <span className="text-muted-foreground w-9 shrink-0">{row.label}:</span>
                        {isEdit ? (
                            <input
                                value={row.value}
                                onChange={e => row.onChange(e.target.value)}
                                className={`${fieldInputCls} font-medium ${row.muted ? 'text-muted-foreground italic' : 'text-foreground'}`}
                            />
                        ) : (
                            <span className={`flex-1 truncate font-medium ${row.muted ? 'text-muted-foreground italic' : 'text-foreground'}`}>{row.value}</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    )
}
