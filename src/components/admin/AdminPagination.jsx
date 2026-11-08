'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';

export default function AdminPagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 20, 50, 100],
  itemLabel = 'records',
  className = '',
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);

  if (totalItems <= 0) return null;

  const startIndex = (safePage - 1) * pageSize + 1;
  const endIndex = Math.min(safePage * pageSize, totalItems);

  // Generate page numbers with smart ellipsis
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, safePage - 1);
      let end = Math.min(totalPages - 1, safePage + 1);

      if (safePage <= 3) {
        start = 2;
        end = 4;
      } else if (safePage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) pages.push('ellipsis-start');
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push('ellipsis-end');

      pages.push(totalPages);
    }
    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3.5 px-4 py-3 sm:px-5 sm:py-3.5 rounded-2xl border transition-all ${className}`}
      style={{
        backgroundColor: '#0A071E',
        background: 'linear-gradient(135deg, rgba(14, 10, 36, 0.95) 0%, rgba(7, 5, 20, 0.98) 100%)',
        borderColor: 'rgba(0, 240, 255, 0.22)',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 240, 255, 0.03)',
        fontFamily: 'Lexend, -apple-system, sans-serif',
      }}
    >
      {/* Left: Range and Total Count */}
      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
        <div className="text-xs text-[#9A91A8] flex items-center gap-1.5 font-medium">
          <span>Showing</span>
          <span className="text-[#00F0FF] font-black font-mono">
            {startIndex}–{endIndex}
          </span>
          <span>of</span>
          <span className="text-white font-black font-mono">{totalItems}</span>
          <span className="hidden md:inline text-[11px] text-gray-500 font-mono">{itemLabel}</span>
        </div>

        {/* Page Size Selector */}
        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 text-xs text-[#9A91A8]">
            <span className="text-[11px] text-gray-400 hidden lg:inline">Per page:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="bg-[#070514] border border-cyan-500/30 text-cyan-300 rounded-lg px-2 py-1 text-[11px] font-bold font-mono outline-none cursor-pointer hover:border-cyan-400 transition-colors"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt} className="bg-[#0E0A24] text-white">
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Right: Pagination Controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 w-full sm:w-auto justify-center sm:justify-end">
        {/* First Page */}
        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={safePage === 1}
          aria-label="First page"
          className="p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed hover:enabled:scale-105 active:enabled:scale-95 text-gray-300 hover:enabled:text-cyan-300"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <ChevronsLeft size={14} />
        </button>

        {/* Previous Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage === 1}
          aria-label="Previous page"
          className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed hover:enabled:scale-105 active:enabled:scale-95 flex items-center gap-1 text-gray-300 hover:enabled:text-cyan-300"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <ChevronLeft size={13} />
          <span className="hidden sm:inline">Prev</span>
        </button>

        {/* Page Numbers (Desktop) */}
        <div className="hidden sm:flex items-center gap-1">
          {pageNumbers.map((p, idx) => {
            if (typeof p === 'string') {
              return (
                <span key={`ellipsis-${idx}`} className="px-1.5 text-xs text-gray-500 font-bold select-none">
                  •••
                </span>
              );
            }

            const isActive = p === safePage;
            return (
              <button
                key={p}
                type="button"
                onClick={() => onPageChange(p)}
                className="w-8 h-8 rounded-xl text-xs font-black font-mono transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95"
                style={
                  isActive
                    ? {
                        background: 'linear-gradient(135deg, #00F0FF 0%, #E026D8 100%)',
                        color: '#070514',
                        boxShadow: '0 0 15px rgba(0, 240, 255, 0.5)',
                        border: 'none',
                      }
                    : {
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        borderColor: 'rgba(255, 255, 255, 0.1)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                        color: '#9A91A8',
                      }
                }
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Mobile Page Indicator */}
        <span className="sm:hidden px-2.5 py-1 text-xs font-black font-mono text-cyan-300 bg-cyan-950/40 border border-cyan-500/30 rounded-lg">
          {safePage} / {totalPages}
        </span>

        {/* Next Page */}
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage === totalPages}
          aria-label="Next page"
          className="px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-xl border text-xs font-bold transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed hover:enabled:scale-105 active:enabled:scale-95 flex items-center gap-1 text-gray-300 hover:enabled:text-cyan-300"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <span className="hidden sm:inline">Next</span>
          <ChevronRight size={13} />
        </button>

        {/* Last Page */}
        <button
          type="button"
          onClick={() => onPageChange(totalPages)}
          disabled={safePage === totalPages}
          aria-label="Last page"
          className="p-1.5 sm:p-2 rounded-xl border transition-all cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed hover:enabled:scale-105 active:enabled:scale-95 text-gray-300 hover:enabled:text-cyan-300"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
          }}
        >
          <ChevronsRight size={14} />
        </button>
      </div>
    </div>
  );
}
