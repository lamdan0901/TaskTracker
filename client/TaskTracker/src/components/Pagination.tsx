import { memo } from "react";

type PaginationProps = {
  pageIndex: number;
  totalPages: number;
  rangeStart: number;
  rangeEnd: number;
  totalCount: number;
  onPageChange: (pageIndex: number) => void;
};

function Pagination({
  pageIndex,
  totalPages,
  rangeStart,
  rangeEnd,
  totalCount,
  onPageChange,
}: PaginationProps) {
  if (totalCount <= 0) {
    return null;
  }

  return (
    <div className="pagination">
      <span>
        Showing {rangeStart}–{rangeEnd} of {totalCount}
      </span>
      <div className="pagination-controls">
        <button
          type="button"
          className="edit-button edit-button-secondary"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={pageIndex <= 0}
        >
          Previous
        </button>
        <span>
          Page {pageIndex + 1} of {totalPages}
        </span>
        <button
          type="button"
          className="edit-button edit-button-secondary"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={pageIndex >= totalPages - 1}
        >
          Next
        </button>
      </div>
    </div>
  );
}

export default memo(Pagination);