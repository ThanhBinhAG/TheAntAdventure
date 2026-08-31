export function nextDevNoteId(existing: { id?: string }[]): string {
  const nums = existing
    .map((row) => row.id)
    .filter((id): id is string => typeof id === 'string' && id.startsWith('DN-'))
    .map((id) => {
      const suffix = id.slice(3);
      const parsed = parseInt(suffix, 10);
      return Number.isNaN(parsed) ? 0 : parsed;
    });
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `DN-${String(next).padStart(3, '0')}`;
}
