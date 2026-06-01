// ═══════════════════════════════════════════════════════════════════════════════
// Demo Profile Registry — Officeworks-only standalone demo
// ═══════════════════════════════════════════════════════════════════════════════

import type { StepBehavior } from '../components/demo/DemoStepBanner';
import { OFFICEWORKS_STEPS, OFFICEWORKS_STEP_BEHAVIOR, OFFICEWORKS_STEP_MESSAGES, OFFICEWORKS_SELF_INDICATED } from './profiles/officeworks';

export type SimulationApp =
    | 'officeworks-intake'
    | 'officeworks-design'
    | 'officeworks-spec-check'
    | 'officeworks-submission'
    | 'officeworks-dashboard'
    | 'officeworks-labor'
    | 'officeworks-sales';

export interface DemoStep {
    id: string;
    groupId: number;
    groupTitle: string;
    title: string;
    description: string;
    app: SimulationApp;
    role: 'Designer' | 'Design Manager' | 'Peer Reviewer' | 'Sales Coordinator' | 'Sr Operations' | 'Sales Lead' | 'System';
    highlightId?: string;
    /**
     * Officeworks runs three flows in parallel (Spec Check & Design ·
     * Labor & Delivery · Sales). Defaults to 'spec-check' when unset.
     */
    flowId?: 'spec-check' | 'labor-delivery' | 'sales';
}

export type DemoProfileId = 'officeworks';

export interface DemoProfile {
    id: DemoProfileId;
    name: string;
    companyName: string;
    description: string;
    icon: string;
    steps: DemoStep[];
    stepBehavior: Record<string, StepBehavior>;
    stepMessages: Record<string, string[]>;
    selfIndicatedSteps: string[];
}

export const DEMO_PROFILES: DemoProfile[] = [
    {
        id: 'officeworks',
        name: 'Officeworks',
        companyName: 'Officeworks Inc.',
        description: 'Spec Check & Design AI · Teknion BOM validation · MANATT 4th Floor',
        icon: '📐',
        steps: OFFICEWORKS_STEPS,
        stepBehavior: OFFICEWORKS_STEP_BEHAVIOR,
        stepMessages: OFFICEWORKS_STEP_MESSAGES,
        selfIndicatedSteps: OFFICEWORKS_SELF_INDICATED,
    },
];
