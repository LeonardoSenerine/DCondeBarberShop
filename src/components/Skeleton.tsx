interface SkeletonProps {
  className?: string;
  /** Renders N copies, useful for list rows. */
  count?: number;
}

/** Shimmering placeholder box. Size it with `className` (h-*, w-*, rounded-*). */
export function Skeleton({ className = "", count = 1 }: SkeletonProps) {
  if (count === 1) return <span className={`dc-skeleton block ${className}`} aria-hidden />;
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className={`dc-skeleton block ${className}`} aria-hidden />
      ))}
    </>
  );
}
