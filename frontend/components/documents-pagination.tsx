"use client";

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { cn } from "@/lib/utils";

interface DocumentsPaginationProps {
  page: number;
  totalPages: number;
  total: number;
  limit: number;
  loading: boolean;
  onPageChange: (page: number) => void;
}

/** Builds a windowed page list like [1, "ellipsis", 4, 5, 6, "ellipsis", 12]
 * so the pagination bar stays a fixed size regardless of how many pages exist. */
function getPageNumbers(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const pages: (number | "ellipsis")[] = [1];
  if (current > 3) pages.push("ellipsis");

  const start = Math.max(2, current - 1);
  const end = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("ellipsis");
  pages.push(total);

  return pages;
}

/** Pagination bar for the documents table, driven entirely by docStore's
 * page/totalPages/total state rather than static links. */
export function DocumentsPagination({
  page,
  totalPages,
  total,
  limit,
  loading,
  onPageChange,
}: DocumentsPaginationProps) {
  if (totalPages <= 1) return null;

  const rangeStart = (page - 1) * limit + 1;
  const rangeEnd = Math.min(page * limit, total);
  const isFirstPage = page <= 1;
  const isLastPage = page >= totalPages;

  return (
    <div className="flex flex-col items-center gap-3 border-t border-border py-4 sm:flex-row sm:justify-between sm:px-6">
      <p className="text-xs text-muted-foreground">
        Showing {rangeStart}-{rangeEnd} of {total} document
        {total === 1 ? "" : "s"}
      </p>

      <Pagination className="mx-0 w-auto">
        <PaginationContent>
          <PaginationItem>
            <PaginationPrevious
              href="#"
              aria-disabled={isFirstPage || loading}
              className={cn(
                (isFirstPage || loading) && "pointer-events-none opacity-40",
              )}
              onClick={(e) => {
                e.preventDefault();
                if (!isFirstPage && !loading) onPageChange(page - 1);
              }}
            />
          </PaginationItem>

          {getPageNumbers(page, totalPages).map((p, idx) =>
            p === "ellipsis" ? (
              <PaginationItem key={`ellipsis-${idx}`}>
                <PaginationEllipsis />
              </PaginationItem>
            ) : (
              <PaginationItem key={p}>
                <PaginationLink
                  href="#"
                  isActive={p === page}
                  aria-disabled={loading}
                  onClick={(e) => {
                    e.preventDefault();
                    if (p !== page && !loading) onPageChange(p);
                  }}
                >
                  {p}
                </PaginationLink>
              </PaginationItem>
            ),
          )}

          <PaginationItem>
            <PaginationNext
              href="#"
              aria-disabled={isLastPage || loading}
              className={cn(
                (isLastPage || loading) && "pointer-events-none opacity-40",
              )}
              onClick={(e) => {
                e.preventDefault();
                if (!isLastPage && !loading) onPageChange(page + 1);
              }}
            />
          </PaginationItem>
        </PaginationContent>
      </Pagination>
    </div>
  );
}
