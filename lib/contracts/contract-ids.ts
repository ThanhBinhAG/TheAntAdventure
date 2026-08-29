export function nextContractId(
  existing: { id?: string }[],
  year = new Date().getFullYear(),
): string {
  const prefix = `CTR-${year}-`;
  const nums = existing
    .map((c) => c.id)
    .filter((id): id is string => typeof id === 'string' && id.startsWith(prefix))
    .map((id) => parseInt(id.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));
  const next = (nums.length ? Math.max(...nums) : 0) + 1;
  return `${prefix}${String(next).padStart(3, '0')}`;
}
