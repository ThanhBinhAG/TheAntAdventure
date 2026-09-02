/** Filter fixed Customer-option catalogues without altering their canonical values. */
export function filterSearchableOptions(options: readonly string[], query: string): string[] {
  const normalized = query.trim().toLocaleLowerCase();
  if (!normalized) return [...options];
  return options.filter((option) => option.toLocaleLowerCase().includes(normalized));
}
