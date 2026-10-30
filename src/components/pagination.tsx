'use client';

import { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const PAGE_SIZES = [10, 30, 50, 100, 500];

interface PaginationProps {
  total: number;
  /** 1-based. */
  page: number;
  pageSize: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}

/** Footer for any table: range, rows per page (10/30/50/100/500) and previous/next. */
export function Pagination({ total, page, pageSize, onPage, onPageSize }: PaginationProps) {
  if (total === 0) return null;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const current = Math.min(page, pages);
  const start = (current - 1) * pageSize;
  const btn = 'p-1.5 rounded-lg border border-slate-800 text-slate-300 hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="px-4 py-3 border-t border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
      <span>
        Showing {start + 1}–{Math.min(start + pageSize, total)} of {total}
      </span>
      <div className="flex items-center gap-2">
        <label htmlFor="page-size">Rows per page</label>
        <select
          id="page-size"
          value={pageSize}
          onChange={(e) => { onPageSize(Number(e.target.value)); onPage(1); }}
          className="rounded-lg border border-slate-700 bg-slate-950 px-2 py-1 text-slate-200"
        >
          {PAGE_SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
        </select>
        <button className={btn} disabled={current <= 1} onClick={() => onPage(current - 1)} aria-label="Previous page"><ChevronLeft className="w-4 h-4" /></button>
        <span>Page {current} of {pages}</span>
        <button className={btn} disabled={current >= pages} onClick={() => onPage(current + 1)} aria-label="Next page"><ChevronRight className="w-4 h-4" /></button>
      </div>
    </div>
  );
}

/** For tables whose rows are all loaded: slices them and returns the footer to render under the table. */
export function usePagination<T>(rows: T[]) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]!);
  const pages = Math.max(1, Math.ceil(rows.length / pageSize));
  const start = (Math.min(page, pages) - 1) * pageSize;
  return {
    pageRows: rows.slice(start, start + pageSize),
    footer: <Pagination total={rows.length} page={page} pageSize={pageSize} onPage={setPage} onPageSize={setPageSize} />,
  };
}
