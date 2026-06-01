# demo-officeworks

Standalone demo of Strata's AI for **Officeworks Inc.** (Burlington MA · Teknion 30-year partner · ~181 employees · GSA contract).

## Demo Flows

| Flow | Steps | Actor | Painpoints anchored |
|---|---|---|---|
| **Spec Check & Design** (`sc1.x`) | 11 | Designer | BOM × 6 attrs spec check · CR/SQ lookup · Teknion order preview · peer audit · acknowledgment Gemini diff |
| **Labor & Delivery Estimation** (`sc-LD.x`) | 8 | Sr Operations · Furniture/Walls toggle | RFP intake · AI takeoff · building KB · vendor bid · internal benchmark · final quote to GC portal |
| **Sales** (`sc-S.x`) | 8 | Sales Lead | S3 email overload · S9 multi-channel · S7 process not enforced · SC5 capacity · S2 Works form 75-80% incomplete · S6 proposal cycle |

All three flows are accessible via the dropdown in the demo sidebar. The Spec Check Dashboard, L&D Dashboard and Sales Dashboard tabs surface KPIs per flow.

## Local development

```bash
npm install
npm run dev      # http://localhost:8085
```

## Build & deploy

```bash
npm run build    # outputs dist/
```

Deployed via Vercel on every push to `master`. PDFs in `public/officeworks-pdfs/` render inline thanks to the headers in `vercel.json` (`Content-Type: application/pdf` + `Content-Disposition: inline` + `X-Frame-Options: SAMEORIGIN`).

## Stack

React 19 · Vite 7 · Tailwind · Headless UI · Recharts · lucide-react · jsPDF · html2canvas. Local design system package at `packages/strata-ds/`.

## Provenance

Forked from [`diegoagentic/demo-2026-strata`](https://github.com/diegoagentic/demo-2026-strata) @ commit `b332075`. Git history preserved · the `strip-to-officeworks-only` commit removes all non-Officeworks demos (BFI · MBI · Leland · Workspaces · WRG · Continua · Dupler · OPS · COI · CRM).

## Hard constraints honored

- **Strata never auto-sends** any communication (email · Teams · SMS · portal upload) · drafts only · the human reviews and confirms each send.
- **Strata never replaces** Copper · NetSuite · Ignite · all integrations are read-only mocks with explicit `(read-only mock)` labels.
- **No proper names** in actor labels · roles only (`Sales Lead`, `Designer`, `Sr Operations`).
- All datasets anchored to AS-IS documentation (Sales Notion v6 · Spec Check session · L&D clarification call).
