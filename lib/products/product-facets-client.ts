export async function invalidateProductFacetsFromClient(): Promise<void> {
    try {
        await fetch('/api/products', {
            method: 'POST',
            cache: 'no-store',
        });
    } catch {
        // Không để lỗi Redis/API làm hỏng giao diện.
    }
}