"use client";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-2 mt-6">
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-card transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        上一頁
      </button>
      <span className="text-sm text-muted px-2">
        {currentPage} / {totalPages}
      </span>
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="px-3 py-1.5 rounded-lg text-sm border border-border hover:bg-card transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
      >
        下一頁
      </button>
    </div>
  );
}

export const PAGE_SIZE = 10;

export function paginate<T>(items: T[], page: number): { paged: T[]; totalPages: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
  const start = (page - 1) * PAGE_SIZE;
  return { paged: items.slice(start, start + PAGE_SIZE), totalPages };
}
