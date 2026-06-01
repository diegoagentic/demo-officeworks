/**
 * COMPONENT: RequestInfoDialog (shared)
 * PURPOSE: Reusable "send clarification / claim email" modal.
 *          Lift from BFI's ClaimDialog (LaurenClaimScene) to a shared primitive
 *          that any demo profile can drive with its own recipients, subject,
 *          message body, attachments, alert rows, and success copy.
 *
 * Anatomy (unchanged from BFI):
 *   - Header: avatar + label + subtitle + close
 *   - EmailMetadataBlock (subject + From/To/CC/Date editable)
 *   - Alert box (e.g., "Missing Item" / "Missing Required Information")
 *   - Editable message textarea (9 rows)
 *   - Removable attachment chips
 *   - Send → button with 900ms delay before firing onSent
 *   - Post-send success banner
 */

import { Fragment, useState } from 'react'
import { Dialog, Transition, TransitionChild, DialogPanel } from '@headlessui/react'
import { AlertTriangle, CheckCircle2, FileText, Send, X } from 'lucide-react'
import EmailMetadataBlock from './EmailMetadataBlock'

export interface RequestInfoAttachment {
    name: string
    meta: string
}

export interface RequestInfoDefaults {
    from: string
    to: string
    cc?: string
    date: string
    subject: string
    message: string
    attachments?: RequestInfoAttachment[]
    alertTitle: string
    alertRows: Array<{ label: string; value: string }>
    successTitle: string
    successSubtitle: string
}

export interface RequestInfoDialogProps {
    isOpen: boolean
    onSent: () => void
    onClose?: () => void
    headerLabel: string
    headerSubtitle: string
    headerAvatar?: string
    defaults: RequestInfoDefaults
    /** Optional footer block rendered inside the scroll area (e.g., DataSourcesBar). */
    footer?: React.ReactNode
}

export default function RequestInfoDialog({
    isOpen, onSent, onClose, headerLabel, headerSubtitle, headerAvatar = '',
    defaults, footer,
}: RequestInfoDialogProps) {
    const [sent, setSent] = useState(false)
    const [message, setMessage] = useState(defaults.message)
    const [fromEmail, setFromEmail] = useState(defaults.from)
    const [toEmail, setToEmail] = useState(defaults.to)
    const [ccEmail, setCcEmail] = useState(defaults.cc ?? '')
    const [dateText, setDateText] = useState(defaults.date)
    const [subject, setSubject] = useState(defaults.subject)
    const [attachments, setAttachments] = useState<RequestInfoAttachment[]>(defaults.attachments ?? [])

    const handleSend = () => { setSent(true); setTimeout(() => onSent(), 900) }
    const removeAttachment = (name: string) =>
        setAttachments(prev => prev.filter(a => a.name !== name))

    const fields = [
        { label: 'From', value: fromEmail, onChange: setFromEmail },
        { label: 'To',   value: toEmail,   onChange: setToEmail },
        ...(defaults.cc !== undefined
            ? [{ label: 'CC', value: ccEmail, onChange: setCcEmail, muted: true }]
            : []),
        { label: 'Date', value: dateText, onChange: setDateText },
    ]

    return (
        <Transition show={isOpen} as={Fragment}>
            <Dialog as="div" className="relative z-[400]" onClose={() => {}}>
                <TransitionChild
                    as={Fragment}
                    enter="ease-out duration-200" enterFrom="opacity-0" enterTo="opacity-100"
                    leave="ease-in duration-150" leaveFrom="opacity-100" leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
                </TransitionChild>

                <div className="fixed inset-0 flex items-center justify-center p-6">
                    <TransitionChild
                        as={Fragment}
                        enter="ease-out duration-200" enterFrom="opacity-0 scale-95" enterTo="opacity-100 scale-100"
                        leave="ease-in duration-150" leaveFrom="opacity-100 scale-100" leaveTo="opacity-0 scale-95"
                    >
                        <DialogPanel className="w-full max-w-lg transform rounded-2xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[88vh]">

                            {/* Header */}
                            <div className="flex items-center gap-3 px-5 py-3.5 border-b border-border bg-muted/30 shrink-0">
                                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
                                    <span className="text-[9px] font-black text-muted-foreground">{headerAvatar}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-[12px] font-bold text-foreground">{headerLabel}</div>
                                    <div className="text-[10px] text-muted-foreground">{headerSubtitle}</div>
                                </div>
                                <button onClick={onClose} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors shrink-0" aria-label="Close">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>

                            {/* Scrollable body */}
                            <div className="flex-1 overflow-y-auto">
                                <div className="px-5 pt-4 pb-3 border-b border-border/60">
                                    <EmailMetadataBlock
                                        subject={{ value: subject, onChange: setSubject }}
                                        fields={fields}
                                        disabled={sent}
                                    />
                                </div>

                                <div className="px-5 py-4 space-y-3">
                                    {/* Alert summary */}
                                    <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 space-y-1 text-[11px]">
                                        <div className="flex items-center gap-1.5 mb-1">
                                            <AlertTriangle className="h-3 w-3 text-destructive shrink-0" />
                                            <span className="text-[10px] font-bold text-foreground uppercase tracking-wide">{defaults.alertTitle}</span>
                                        </div>
                                        {defaults.alertRows.map(r => (
                                            <div key={r.label} className="flex items-start gap-2">
                                                <span className="text-muted-foreground w-14 shrink-0">{r.label}:</span>
                                                <span className="font-medium text-foreground">{r.value}</span>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Editable message */}
                                    <div className="space-y-1.5">
                                        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wide">Message</span>
                                        <textarea
                                            value={message}
                                            onChange={e => setMessage(e.target.value)}
                                            rows={9}
                                            disabled={sent}
                                            className="w-full text-[11px] text-foreground bg-muted/30 border border-border rounded-xl px-3.5 py-2.5 leading-relaxed resize-none outline-none focus:border-primary/50 transition-colors disabled:opacity-60"
                                        />
                                    </div>

                                    {/* Attachments */}
                                    {attachments.length > 0 && (
                                        <div className="flex flex-col gap-1.5">
                                            {attachments.map(a => (
                                                <div key={a.name} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-muted/40 border border-border text-[11px] text-foreground font-medium">
                                                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                                                    <span className="flex-1 truncate">{a.name}</span>
                                                    <span className="text-[9px] text-muted-foreground">· {a.meta}</span>
                                                    {!sent && (
                                                        <button onClick={() => removeAttachment(a.name)} className="p-0.5 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0" aria-label={`Remove ${a.name}`}>
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {sent && (
                                        <div className="bg-success/5 border border-success/30 rounded-xl p-3 flex items-start gap-2 animate-in fade-in duration-300">
                                            <CheckCircle2 className="h-4 w-4 text-success shrink-0 mt-0.5" />
                                            <div className="text-xs">
                                                <div className="font-bold text-foreground">{defaults.successTitle}</div>
                                                <div className="text-muted-foreground mt-0.5">{defaults.successSubtitle}</div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {footer && <div className="px-5 pb-4">{footer}</div>}
                            </div>

                            {!sent && (
                                <div className="px-5 py-3.5 border-t border-border bg-card shrink-0">
                                    <button onClick={handleSend}
                                        className="w-full flex items-center justify-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-bold bg-primary text-primary-foreground hover:opacity-90 transition-all shadow-sm">
                                        <Send className="h-3.5 w-3.5" />
                                        Send →
                                    </button>
                                </div>
                            )}
                        </DialogPanel>
                    </TransitionChild>
                </div>
            </Dialog>
        </Transition>
    )
}
