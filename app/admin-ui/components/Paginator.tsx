import React from 'react';

interface PaginatorProps {
  nextCursor?: string;
  prevCursor?: string;
  onNext?: () => void;
  onPrev?: () => void;
  hasMore?: boolean;
}

export function Paginator({ nextCursor, prevCursor, onNext, onPrev, hasMore }: PaginatorProps) {
  if (!nextCursor && !prevCursor && !hasMore) {
    return null;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
      <button
        className="btn"
        onClick={onPrev}
        disabled={!prevCursor}
      >
        Previous
      </button>
      <button
        className="btn"
        onClick={onNext}
        disabled={!nextCursor && !hasMore}
      >
        Next
      </button>
    </div>
  );
}
