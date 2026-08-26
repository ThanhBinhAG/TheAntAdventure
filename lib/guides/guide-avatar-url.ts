/** Browser-safe canonical CRM route for a Guide avatar. */
export function guideAvatarApiUrl(guideId: string): string {
  return `/api/guides/avatar?guideId=${encodeURIComponent(guideId)}`;
}
