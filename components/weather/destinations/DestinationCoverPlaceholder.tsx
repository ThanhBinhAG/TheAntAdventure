'use client';

type Props = {
  name: string;
  hint?: string;
  className?: string;
};

/** Solid black stand-in when a destination has no cover photo yet. */
export default function DestinationCoverPlaceholder({
  name,
  hint = 'Chưa có ảnh — chỉnh sửa để thêm',
  className = '',
}: Props) {
  return (
    <div className={`wg-cover-ph${className ? ` ${className}` : ''}`} aria-hidden>
      <span className="wg-cover-ph-name">{name}</span>
      {hint ? <span className="wg-cover-ph-hint">{hint}</span> : null}
    </div>
  );
}
