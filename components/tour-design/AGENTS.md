# components/tour-design/ — Agent overview

## Role
Tour Design wizard UI (brief → experiences → outline → pricing → proposal). Folder is kebab-case to match `lib/tour-design`; URL slug remains `tourdesign`.

## Contents
- `TourDesignPage.tsx` — wizard orchestration (URL slug still `tourdesign`); gallery tables lazy-load on experiences / proposal steps
- Step components: ClientBrief, TourExperiences, Outline*, Pricing, Proposal*
- `ProposalExportStep.tsx` — Step 5 shell (state + assemble + export actions)
- `ProposalExportSettings.tsx` — inspector rail (layout cards, notes, hotel rates, template); rail stays fixed while preview scrolls
- `ProposalExportPreview.tsx` — builds/debounces HTML for live preview
- `ProposalDocumentCanvas.tsx` — shared A4 document canvas (page shadow, zoom/Fit); used by Export + Edit Template
- `ProposalExportActionBar.tsx` — bottom bar: Back / New Design + PDF / Print / Word
- `ProposalLayoutPicker` — radio cards with page thumbnails (Classic / Modern / Compact)
- `ProposalEditorModal` + `ProposalTemplateForm` — template editor (sectioned form, sticky nav chips, document canvas preview)
- Panels: PackagePreview, SelectedExperiences, PhotoStack, GuestProfile
- `TourDesignQueueCards.tsx` — compact Tour tasks popover (Sales handoffs + outlines awaiting approval); stays visible while a session is open

## Boundaries
- Workflow/types: `lib/tour-design`. Outline HTML: `lib/outline`. Proposals: `lib/proposals`.
- **Naming:** folder/lib are kebab-case `tour-design`; CRM URL slug and `VALID_PAGES` key remain `tourdesign` (no hyphen). Do not rename the URL to match the folder.
