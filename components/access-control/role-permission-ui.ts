/** Bỏ bản nháp của một role, giữ nguyên các bản nháp role khác. */
export function discardRolePermissionDraft(
    drafts: Record<string, string[]>,
    roleCode: string,
): Record<string, string[]> {
    const nextDrafts = { ...drafts };
    delete nextDrafts[roleCode];
    return nextDrafts;
}

/** Nói rõ số quyền role đang có trên tổng danh mục quyền có thể cấp. */
export function formatPermissionAssignmentSummary(
    assignedCount: number,
    catalogCount: number,
): string {
    return `Đã cấp ${assignedCount} / ${catalogCount} quyền`;
}

type PermissionSearchItem = {
    permission_description: string;
};

type PermissionSearchGroup<TItem extends PermissionSearchItem> = {
    label: string;
    items: TItem[];
};

/** Chuẩn hóa nhãn tiếng Việt để tìm được cả chữ có dấu và không dấu. */
function normalizeSearchText(value: string): string {
    return value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLocaleLowerCase('vi');
}

/**
 * Lọc theo tên nhóm hoặc tên quyền hiển thị, không phụ thuộc mã kỹ thuật.
 * Nếu khớp tên nhóm thì giữ cả nhóm; nếu khớp quyền thì chỉ giữ quyền đó.
 */
export function filterPermissionGroupsByQuery<
    TItem extends PermissionSearchItem,
    TGroup extends PermissionSearchGroup<TItem>,
>(groups: TGroup[], query: string): TGroup[] {
    const normalizedQuery = normalizeSearchText(query.trim());

    if (!normalizedQuery) return groups;

    return groups.flatMap((group) => {
        if (normalizeSearchText(group.label).includes(normalizedQuery)) {
            return [group];
        }

        const matchingItems = group.items.filter((item) => (
            normalizeSearchText(item.permission_description)
                .includes(normalizedQuery)
        ));

        if (matchingItems.length === 0) return [];

        return [{ ...group, items: matchingItems } as TGroup];
    });
}
