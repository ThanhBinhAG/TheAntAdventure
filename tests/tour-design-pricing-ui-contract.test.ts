import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const pricingStep = readFileSync('components/tour-design/PricingStep.tsx', 'utf8');
const experiencesStep = readFileSync('components/tour-design/TourExperiencesStep.tsx', 'utf8');
const packagePreview = readFileSync('components/tour-design/PackagePreviewPanel.tsx', 'utf8');
const outlineStep = readFileSync('components/tour-design/OutlineStep.tsx', 'utf8');
const tourDesignPage = readFileSync('components/tour-design/TourDesignPage.tsx', 'utf8');

test('Pricing navigation is disabled only for users without Tour Design write permission', () => {
  assert.match(pricingStep, /onClick=\{onNext\} disabled=\{!canWrite\}/);
  assert.doesNotMatch(pricingStep, /onClick=\{onNext\} disabled=\{!selectedProducts\.length\}/);
});

test('Package rows preview while Use This Package performs the permission-gated selection', () => {
  const previewPackage = experiencesStep.slice(
    experiencesStep.indexOf('function previewPackage'),
    experiencesStep.indexOf('function usePackage'),
  );
  const usePackage = experiencesStep.slice(
    experiencesStep.indexOf('function usePackage'),
    experiencesStep.indexOf('  return (', experiencesStep.indexOf('function usePackage')),
  );

  assert.match(previewPackage, /setPreviewPkgId\(pkg\.id\)/);
  assert.doesNotMatch(previewPackage, /onSelectPackage/);
  assert.match(usePackage, /onSelectPackage\(pkg\)/);
  assert.match(experiencesStep, /onClick=\{\(\) => previewPackage\(p\)\}/);
  assert.match(experiencesStep, /onUsePackage=\{usePackage\}/);
  assert.match(experiencesStep, /isSelected=\{selectedPackageId === activePreview\?\.id\}/);
  assert.match(packagePreview, /onClick=\{\(\) => onUsePackage\(pkg\)\} disabled=\{!canWrite\}/);
  assert.match(packagePreview, /tp\('tour-design', 'pkgSelected'\)/);
});

test('Outline navigation and Tour Experiences tab are gated only by Tour Design write permission', () => {
  assert.match(outlineStep, /onClick=\{onNext\} disabled=\{!canWrite\}/);
  assert.doesNotMatch(outlineStep, /disabled=\{experiencesBlocked\}/);
  assert.doesNotMatch(tourDesignPage, /isExperiencesBlocked/);
  assert.doesNotMatch(tourDesignPage, /td-step-locked/);
});

test('Tour Experiences navigation to Pricing is gated only by Tour Design write permission', () => {
  const nextPricingButton = tourDesignPage.slice(
    tourDesignPage.indexOf('persistDraft({ step: 3, selectedCodes, selectedPackageId });'),
    tourDesignPage.indexOf('</button>', tourDesignPage.indexOf('persistDraft({ step: 3, selectedCodes, selectedPackageId });')),
  );

  assert.match(nextPricingButton, /disabled=\{!canWrite\}/);
  assert.doesNotMatch(tourDesignPage, /disabled=\{\(selectedCodes\.length === 0 && !selectedPackageId\) \|\| !canWrite\}/);
});
