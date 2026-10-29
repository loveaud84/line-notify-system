import { useMemo, useState } from 'react';

export interface Pagination<T> {
  page: number;
  totalPages: number;
  pageSize: number;
  items: T[];
  pageNumbers: number[];
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  goPrev: () => void;
  goNext: () => void;
  /** Resets to page 1 — call whenever a filter changes. */
  reset: () => void;
}

/**
 * Client-side pagination over an already-filtered list.
 *
 * The page index is clamped rather than stored clamped, so deleting the last
 * row on the last page falls back to a valid page instead of rendering empty.
 */
export function usePagination<T>(items: T[], initialPageSize = 5): Pagination<T> {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(initialPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  const pageNumbers = useMemo(
    () => Array.from({ length: totalPages }, (_, i) => i + 1),
    [totalPages],
  );

  return {
    page: safePage,
    totalPages,
    pageSize,
    items: pageItems,
    pageNumbers,
    setPage,
    setPageSize: (size: number) => {
      setPageSizeState(size);
      setPage(1);
    },
    goPrev: () => setPage(Math.max(1, safePage - 1)),
    goNext: () => setPage(Math.min(totalPages, safePage + 1)),
    reset: () => setPage(1),
  };
}
