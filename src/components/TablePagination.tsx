import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  startIndex?: number;
  endIndex?: number;
  totalCount?: number;
  pageSize?: number;
  onPageSizeChange?: (size: number) => void;
}

const PAGE_SIZE_OPTIONS = [5, 10, 30, 50, 100];

export function TablePagination({
  currentPage,
  totalPages,
  onPageChange,
  startIndex,
  endIndex,
  totalCount,
  pageSize,
  onPageSizeChange,
}: TablePaginationProps) {
  if (totalCount !== undefined ? totalCount === 0 : totalPages <= 0) return null;

  const getPageButtons = (): (number | "...")[] => {
    if (totalPages <= 5) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "...")[] = [1];
    if (currentPage > 3) pages.push("...");
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
      pages.push(i);
    }
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
    return pages;
  };

  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className="flex flex-col gap-3 border-t border-border/50 bg-muted/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
      {/* Left: Info + page size */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Data range text */}
        <p className="text-xs text-muted-foreground tabular-nums">
          {totalCount !== undefined && startIndex !== undefined && endIndex !== undefined ? (
            <>
              <span className="font-medium text-foreground">{startIndex}–{endIndex}</span>
              {" "}dari{" "}
              <span className="font-medium text-foreground">{totalCount}</span>
              {" "}data
            </>
          ) : (
            <>Hal. <span className="font-medium text-foreground">{currentPage}</span> / {totalPages}</>
          )}
        </p>

        {/* Page size select */}
        {pageSize !== undefined && onPageSizeChange && (
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted-foreground">Tampilkan</span>
            <Select
              value={pageSize.toString()}
              onValueChange={(val) => onPageSizeChange(Number(val))}
            >
              <SelectTrigger className="h-7 w-[58px] rounded-lg border-border/60 bg-background text-xs shadow-none focus:ring-1 focus:ring-primary/40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start" className="min-w-[58px]">
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <SelectItem key={size} value={size.toString()} className="text-xs">
                    {size}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Right: Page navigation */}
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          {/* First page */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
            disabled={!canPrev}
            onClick={() => onPageChange(1)}
            title="Halaman pertama"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>

          {/* Previous */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
            disabled={!canPrev}
            onClick={() => onPageChange(currentPage - 1)}
            title="Sebelumnya"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          {/* Page numbers — hidden on very small screens */}
          <div className="hidden items-center gap-0.5 xs:flex sm:flex">
            {getPageButtons().map((page, idx) =>
              page === "..." ? (
                <span
                  key={`ellipsis-${idx}`}
                  className="flex h-7 w-6 items-center justify-center text-xs text-muted-foreground select-none"
                >
                  ···
                </span>
              ) : (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "ghost"}
                  size="icon"
                  className={`h-7 w-7 rounded-lg text-xs font-medium transition-colors ${
                    page === currentPage
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  }`}
                  onClick={() => onPageChange(page as number)}
                >
                  {page}
                </Button>
              )
            )}
          </div>

          {/* Mobile: current / total label */}
          <span className="flex items-center px-1 text-xs font-medium text-foreground sm:hidden">
            {currentPage} / {totalPages}
          </span>

          {/* Next */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
            disabled={!canNext}
            onClick={() => onPageChange(currentPage + 1)}
            title="Selanjutnya"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>

          {/* Last page */}
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground disabled:opacity-30"
            disabled={!canNext}
            onClick={() => onPageChange(totalPages)}
            title="Halaman terakhir"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
