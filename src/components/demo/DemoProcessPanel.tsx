// Officeworks-only demo: DemoProcessPanel is a no-op.
// The original multi-demo panel handled COI/Continua/Ops "lupa" overlays that
// don't apply to any Officeworks step. Kept as an empty export so the existing
// App.tsx mount point continues to work without code changes.

interface DemoProcessPanelProps {
    onNavigate?: (page: string) => void;
}

export default function DemoProcessPanel(_props: DemoProcessPanelProps) {
    return null;
}
