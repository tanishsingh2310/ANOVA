export default function InventoryPagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 10,
  onPageChange
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  if (totalItems <= pageSize && currentPage === 1) {
    if (totalItems === 0) return null;
  }

  const startIdx = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endIdx = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipsis
  const getPageNumbers = () => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (currentPage <= 4) {
      for (let i = 1; i <= 5; i++) pages.push(i);
      pages.push('...');
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1);
      pages.push('...');
      for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      pages.push('...');
      pages.push(currentPage - 1);
      pages.push(currentPage);
      pages.push(currentPage + 1);
      pages.push('...');
      pages.push(totalPages);
    }
    return pages;
  };

  const pages = getPageNumbers();

  return (
    <div className="inv-pagination" aria-label="Table pagination">
      <div className="inv-pagination-info">
        Showing <strong>{startIdx}</strong>–<strong>{endIdx}</strong> of <strong>{totalItems}</strong> records
      </div>

      <div className="inv-pagination-buttons">
        <button
          type="button"
          className="inv-pagination-btn"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          aria-label="Previous page"
          title="Previous page"
        >
          ‹
        </button>

        {pages.map((p, idx) => {
          if (p === '...') {
            return (
              <span key={`ellipsis-${idx}`} className="inv-pagination-ellipsis">
                …
              </span>
            );
          }
          const isCurrent = p === currentPage;
          return (
            <button
              key={p}
              type="button"
              className={`inv-pagination-btn ${isCurrent ? 'is-active' : ''}`}
              onClick={() => onPageChange(p)}
              aria-current={isCurrent ? 'page' : undefined}
            >
              {p}
            </button>
          );
        })}

        <button
          type="button"
          className="inv-pagination-btn"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          aria-label="Next page"
          title="Next page"
        >
          ›
        </button>
      </div>
    </div>
  );
}
