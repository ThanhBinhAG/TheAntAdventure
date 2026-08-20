#!/bin/bash
set -e

echo "=== Running CI Leakage Scan on built browser assets ==="

# Thư mục chứa các tệp tĩnh sau khi build Production của Next.js
BUILD_DIR="${BUILD_DIR:-.next/static}"

if [ ! -d "$BUILD_DIR" ]; then
  echo "Error: Thư mục $BUILD_DIR không tồn tại. Vui lòng chạy 'npm run build' trước."
  exit 1
fi

read_public_env() {
  key="$1"
  value="$(printenv "$key" 2>/dev/null || true)"
  if [ -n "$value" ]; then
    printf '%s' "$value"
    return
  fi
  for env_file in .env .env.local; do
    if [ -f "$env_file" ]; then
      value="$(grep "^${key}=" "$env_file" | tail -n 1 | cut -d'=' -f2- | tr -d '\"' | tr -d "'" || true)"
      if [ -n "$value" ]; then
        printf '%s' "$value"
        return
      fi
    fi
  done
}

SUPABASE_URL="$(read_public_env NEXT_PUBLIC_SUPABASE_URL)"
SUPABASE_ANON_KEY="$(read_public_env NEXT_PUBLIC_SUPABASE_ANON_KEY)"

# Trích xuất Hostname
SUPABASE_HOST=""
if [ -n "$SUPABASE_URL" ]; then
  # Loại bỏ phần protocol (http:// hoặc https://) và path nếu có
  SUPABASE_HOST=$(echo "$SUPABASE_URL" | sed -e 's|^[^/]*//||' -e 's|/.*$||')
  echo "Phát hiện cấu hình Supabase URL: $SUPABASE_URL"
  echo "Hostname cần quét: $SUPABASE_HOST"
fi

LEAK_FOUND=0

# Các từ khóa, đường dẫn nhạy cảm cần quét
KEYWORDS=("NEXT_PUBLIC_SUPABASE" "supabase.co" "/auth/v1" "/rest/v1" "/storage/v1" "/realtime/v1")

# Nếu lấy được hostname thì bổ sung vào danh sách quét
if [ -n "$SUPABASE_HOST" ]; then
  KEYWORDS+=("$SUPABASE_HOST")
fi
if [ -n "$SUPABASE_ANON_KEY" ]; then
  KEYWORDS+=("$SUPABASE_ANON_KEY")
fi

for keyword in "${KEYWORDS[@]}"; do
  echo "Đang quét từ khóa: '$keyword' trong $BUILD_DIR..."
  # Tìm kiếm đệ quy trong thư mục .next/static
  if grep -rFn -- "$keyword" "$BUILD_DIR" 2>/dev/null; then
    echo "⚠️ CẢNH BÁO: Phát hiện rò rỉ từ khóa '$keyword' trong các tệp tĩnh client-side!"
    LEAK_FOUND=1
  fi
done

if [ $LEAK_FOUND -ne 0 ]; then
  echo "❌ Kết quả: CI Leakage Scan thất bại! Có thông tin Supabase riêng tư bị lộ trong client bundles."
  exit 1
else
  echo "✅ Kết quả: CI Leakage Scan thành công! Không phát hiện thông tin Supabase rò rỉ."
fi
