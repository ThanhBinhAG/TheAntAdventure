# components/sidebar/ — Agent overview

## Role
Sidebar-specific chrome widgets (company logo editor, etc.).

## Contents
- `CompanyLogoEditor.tsx` — pick → circular crop → save branding logo
- `CompanyLogoGalleryPicker.tsx` — mini Photo Gallery (folder tiles first, then photo thumbs)

## Boundaries
- Nav structure stays in `components/Sidebar.tsx`. Storage/API: `lib/storage`, `app/api/branding`.
