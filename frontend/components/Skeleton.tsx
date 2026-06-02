interface SkeletonProps {
  rows?: number;
  className?: string;
}

export function Skeleton({ rows = 5, className = '' }: SkeletonProps) {
  return (
    <div className={`p-4 space-y-3 animate-pulse ${className}`}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-[var(--bg-surface-2)] rounded-xl" />
      ))}
    </div>
  );
}
