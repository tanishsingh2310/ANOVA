import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Sparkles,
} from "lucide-react";
import { apiRequest } from "../../../services/api";
import "../../../styles/food-recommendations.css";

const PAGE_SIZE = 6;

function getPaginationPages(currentPage, totalPages) {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "...",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages,
    ];
  }

  return [
    1,
    "...",
    currentPage - 1,
    currentPage,
    currentPage + 1,
    "...",
    totalPages,
  ];
}

function DishPhoto({ dish, containerClass, photoClass }) {
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setImageFailed(false);
  }, [dish.image, dish.id, dish._id]);

  if (!dish.image || imageFailed) {
    return (
      <span className={containerClass} aria-hidden="true">
        {dish.imageFallback || "🍽️"}
      </span>
    );
  }

  return (
    <img
      className={photoClass}
      src={dish.image}
      alt={dish.name || "Menu dish"}
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function FoodRecommendations({ branchId }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(branchId || "");
  const [dishes, setDishes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [dietary, setDietary] = useState("All");
  const [sortBy, setSortBy] = useState("price-low");
  const [maxPrice, setMaxPrice] = useState(1000);
  const [budget, setBudget] = useState("300");
  const [showPopularOnly, setShowPopularOnly] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [recommendationMode, setRecommendationMode] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Load public branches for branch selection and defaulting when branchId is 'all'
  useEffect(() => {
    let isMounted = true;

    async function loadBranches() {
      try {
        const response = await apiRequest("/api/branches/public");
        const available = Array.isArray(response?.branches)
          ? response.branches
          : Array.isArray(response)
          ? response
          : [];

        if (isMounted && available.length > 0) {
          setBranches(available);
          if (!branchId || branchId === "all") {
            const pune = available.find(
              (b) =>
                b.name?.toLowerCase().includes("pune") ||
                b._id === "6ad0e90a53cc462cbaaec9fa"
            );
            setSelectedBranch(pune ? pune._id : available[0]._id);
          }
        }
      } catch (err) {
        console.warn("Unable to load restaurant locations:", err);
      }
    }

    loadBranches();

    return () => {
      isMounted = false;
    };
  }, [branchId]);

  const effectiveBranchId = useMemo(() => {
    if (selectedBranch && selectedBranch !== "all") {
      return selectedBranch;
    }
    if (branchId && branchId !== "all") {
      return branchId;
    }
    return branches[0]?._id || "";
  }, [selectedBranch, branchId, branches]);

  useEffect(() => {
    let isMounted = true;

    async function loadRecommendationData() {
      if (!effectiveBranchId) {
        setDishes([]);
        setOrders([]);
        setLoading(false);
        setError("");
        return;
      }

      setLoading(true);
      setError("");
      setDishes([]);
      setOrders([]);

      try {
        const [menuData, orderData] = await Promise.all([
          apiRequest(`/api/menu/${effectiveBranchId}`),
          apiRequest(`/api/orders/${effectiveBranchId}`),
        ]);

        if (!Array.isArray(menuData) || !Array.isArray(orderData)) {
          throw new Error("The server returned an unexpected data format.");
        }

        if (isMounted) {
          setDishes(menuData);
          setOrders(orderData);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err.message || "Unable to load menu recommendations."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadRecommendationData();

    return () => {
      isMounted = false;
    };
  }, [effectiveBranchId]);

    const salesByMenuItemId = useMemo(() => {
    const totals = {};

    for (const order of orders) {
      if (order.status === "Cancelled" || !Array.isArray(order.items)) {
        continue;
      }

      for (const item of order.items) {
        const menuItemId = String(
          item.menuItemId?._id ?? item.menuItemId ?? ""
        );

        if (!menuItemId) {
          continue;
        }

        const quantity = Number(item.quantity) || 0;

        totals[menuItemId] = (totals[menuItemId] || 0) + quantity;
      }
    }

    return totals;
  }, [orders]);

    
  const recommendationDishes = useMemo(() => {
    const categoryIcons = {
      Starters: "🥗",
      "Main Course": "🍽️",
      Pizza: "🍕",
      Desserts: "🍰",
      Beverages: "🥤",
    };

    return dishes.map((dish) => {
      const salesCount =
        salesByMenuItemId[String(dish._id)] || 0;

      return {
        ...dish,
        id: String(dish._id),
        salesCount,
        popular: salesCount > 0,

        // Preserve the actual image path stored in MongoDB.
        image: dish.image || "",

        // Keep an emoji available as a fallback.
        imageFallback: categoryIcons[dish.category] || "🍽️",

        ingredients: Array.isArray(dish.ingredients)
          ? dish.ingredients
          : [],
      };
    });
  }, [dishes, salesByMenuItemId]);



    const categories = [
    "All",
    "Starters",
    "Main Course",
    "Pizza",
    "Desserts",
    "Beverages",
  ];

    const filteredDishes = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = recommendationDishes.filter((dish) => {
      const matchesSearch =
        String(dish.name || "").toLowerCase().includes(query) ||
        String(dish.description || "").toLowerCase().includes(query) ||
        dish.ingredients.some((ingredient) =>
          String(ingredient).toLowerCase().includes(query)
        );

      const matchesCategory =
        category === "All" || dish.category === category;

      const matchesDietary =
        dietary === "All" || dish.dietary === dietary;

      const matchesPrice = Number(dish.price) <= maxPrice;

      const matchesPopularity =
        !showPopularOnly || dish.popular;

      return (
        matchesSearch &&
        matchesCategory &&
        matchesDietary &&
        matchesPrice &&
        matchesPopularity &&
        dish.available
      );
    });

    if (sortBy === "price-low") {
      result.sort(
        (a, b) =>
          Number(a.price) - Number(b.price) ||
          (a.name || "").localeCompare(b.name || "")
      );
    } else if (sortBy === "price-high") {
      result.sort(
        (a, b) =>
          Number(b.price) - Number(a.price) ||
          (a.name || "").localeCompare(b.name || "")
      );
    } else if (sortBy === "name-asc") {
      result.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    } else if (sortBy === "popular") {
      result.sort(
        (a, b) =>
          b.salesCount - a.salesCount ||
          Number(a.price) - Number(b.price) ||
          (a.name || "").localeCompare(b.name || "")
      );
    } else if (sortBy === "recommended") {
      result.sort(
        (a, b) =>
          b.salesCount - a.salesCount ||
          Number(a.price) - Number(b.price) ||
          (a.name || "").localeCompare(b.name || "")
      );
    } else {
      result.sort(
        (a, b) =>
          Number(a.price) - Number(b.price) ||
          (a.name || "").localeCompare(b.name || "")
      );
    }

    return result;
  }, [
    recommendationDishes,
    search,
    category,
    dietary,
    maxPrice,
    showPopularOnly,
    sortBy,
  ]);

  const recommendations = useMemo(() => {
    const amount = Number(budget);

    if (!Number.isFinite(amount) || amount <= 0) {
      return [];
    }

    return recommendationDishes
      .filter(
        (dish) =>
          dish.available &&
          Number(dish.price) <= amount &&
          (dietary === "All" || dish.dietary === dietary)
      )
      .sort(
        (a, b) =>
          b.salesCount - a.salesCount ||
          a.price - b.price
      )
      .slice(0, 4);
  }, [recommendationDishes, budget, dietary]);

    const availableDishes = useMemo(
    () => recommendationDishes.filter((dish) => dish.available),
    [recommendationDishes]
  );

  const popularDishesCount = availableDishes.filter(
    (dish) => dish.salesCount > 0
  ).length;

  const dietaryOptionsCount = new Set(
    availableDishes
      .map((dish) => dish.dietary)
      .filter(Boolean)
  ).size;

  const startingPrice = availableDishes.length
    ? Math.min(...availableDishes.map((dish) => Number(dish.price)))
    : null;

  // Reset to page 1 whenever filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage(1);
  }, [
    search,
    category,
    dietary,
    sortBy,
    maxPrice,
    showPopularOnly,
    effectiveBranchId,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredDishes.length / PAGE_SIZE));

  // Keep the page valid when filtered results change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setCurrentPage((page) => {
      const lastPage = Math.max(1, totalPages);
      return Math.min(page, lastPage);
    });
  }, [totalPages]);

  const paginationPages = useMemo(
    () => getPaginationPages(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const paginatedDishes = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredDishes.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredDishes, currentPage]);

  const resetFilters = () => {
    setSearch("");
    setCategory("All");
    setDietary("All");
    setSortBy("price-low");
    setMaxPrice(1000);
    setShowPopularOnly(false);
    setRecommendationMode(false);
    setCurrentPage(1);
  };

  return (
  <main className="food-page">
    <header className="food-header">
      <div>
        <p className="food-subtitle">
          Discover popular dishes and suggest the right meal for every guest.
        </p>
      </div>

      <div className="food-header-actions">
        {branches.length > 0 && (
          <div className="food-branch-selector">
            <label htmlFor="food-branch-select">Branch:</label>
            <select
              id="food-branch-select"
              value={effectiveBranchId}
              onChange={(event) => setSelectedBranch(event.target.value)}
            >
              {branches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.city})
                </option>
              ))}
            </select>
          </div>
        )}

        <button
          type="button"
          className="food-recommend-button"
          onClick={() => setRecommendationMode((current) => !current)}
        >
          <Sparkles size={15} aria-hidden="true" />
          {recommendationMode ? "Browse Menu" : "Find Recommendations"}
        </button>
      </div>
    </header>

    {loading && (
      <p className="food-no-results" role="status">
        Loading menu and recommendations...
      </p>
    )}

    {!loading && error && (
      <p className="food-no-results" role="alert">
        Unable to load food recommendations: {error}
      </p>
    )}

    <section className="food-overview">
        <article className="food-overview-card">
          <div className="food-overview-icon">🍽</div>
          <div>
            <span>Available Dishes</span>
            <strong>{availableDishes.length}</strong>
          </div>
        </article>

        <article className="food-overview-card">
          <div className="food-overview-icon">★</div>
          <div>
            <span>Popular Choices</span>
            <strong>{popularDishesCount}</strong>
          </div>
        </article>

        <article className="food-overview-card">
          <div className="food-overview-icon">♧</div>
          <div>
            <span>Dietary Options</span>
            <strong>{dietaryOptionsCount}</strong>
          </div>
        </article>

        <article className="food-overview-card">
          <div className="food-overview-icon">₹</div>
          <div>
            <span>Starting Price</span>
            <strong>{startingPrice === null ? "—" : currency(startingPrice)}</strong>
          </div>
        </article>
      </section>

      {recommendationMode && (
        <section className="food-smart-panel">
          <div className="food-smart-heading">
            <span className="food-smart-icon">✦</span>
            <div>
              <h2>Personalised Suggestions</h2>
              <p>
                Find suitable dishes using a budget and dietary preference.
              </p>
            </div>
          </div>

          <div className="food-smart-controls">
            <div className="food-budget-control">
              <label htmlFor="food-budget">Maximum budget per dish</label>
              <div className="food-budget-input">
                <span>₹</span>
                <input
                  id="food-budget"
                  type="number"
                  min="1"
                  value={budget}
                  onChange={(event) => setBudget(event.target.value)}
                  placeholder="Enter budget"
                />
              </div>
            </div>

            <div className="food-preference-control">
              <label htmlFor="food-preference">Dietary preference</label>
              <select
                id="food-preference"
                value={dietary}
                onChange={(event) => setDietary(event.target.value)}
              >
                <option value="All">No preference</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
              </select>
            </div>
          </div>

          <div className="food-smart-results-heading">
            <h3>Suggested for You</h3>
            <span>{recommendations.length} suggestions</span>
          </div>

          {Number(budget) <= 0 || !Number.isFinite(Number(budget)) ? (
            <p className="food-no-results">
              Please enter a valid budget greater than ₹0 to receive recommendations.
            </p>
          ) : recommendations.length > 0 ? (
            <div className="food-recommendation-list">
              {recommendations.map((dish) => (
                <button
                  type="button"
                  className="food-recommendation-item"
                  key={dish.id}
                  onClick={() => setSelectedDish(dish)}
                >
                   <DishPhoto
                           dish={dish}
                           containerClass="food-recommendation-emoji"
                           photoClass="food-recommendation-photo"
                    />
                  <span className="food-recommendation-info">
                    <strong>{dish.name}</strong>
                    <small>
                      {dish.dietary || "Dietary information unavailable"} · {dish.salesCount} ordered
                    </small>
                  </span>
                  <strong className="food-recommendation-price">
                    {currency(dish.price)}
                  </strong>
                </button>
              ))}
            </div>
          ) : (
            <p className="food-no-results">
              No dishes match this budget ({currency(Number(budget))}) and dietary preference ({dietary}). Try adjusting
              your choices.
            </p>
          )}
        </section>
      )}

      <section className="food-menu-section">
        <div className="food-menu-heading">
          <div>
            <h2>Explore the Menu</h2>
            <p>Browse dishes and find the right recommendation.</p>
          </div>
          <span className="food-result-count">
            {filteredDishes.length} dishes
          </span>
        </div>

        <div className="food-filter-panel">
          <div className="food-search">
            <Search size={16} aria-hidden="true" className="food-search-icon" />
            <input
              type="search"
              placeholder="Search dishes or ingredients..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              aria-label="Search dishes or ingredients"
            />
          </div>

          <div className="food-filter-row">
            <div className="food-filter-control">
              <label htmlFor="food-category">Category</label>
              <select
                id="food-category"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item === "All" ? "All Categories" : item}
                  </option>
                ))}
              </select>
            </div>

            <div className="food-filter-control">
              <label htmlFor="food-dietary">Dietary preference</label>
              <select
                id="food-dietary"
                value={dietary}
                onChange={(event) => setDietary(event.target.value)}
              >
                <option value="All">All preferences</option>
                <option value="Vegetarian">Vegetarian</option>
                <option value="Vegan">Vegan</option>
                <option value="Non-Vegetarian">Non-Vegetarian</option>
              </select>
            </div>

            <div className="food-filter-control">
              <label htmlFor="food-sort">Sort by</label>
              <select
                id="food-sort"
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value)}
              >
                <option value="price-low">Price: Low to High</option>
                <option value="recommended">Recommended</option>
                <option value="popular">Most Popular</option>
                <option value="price-high">Price: High to Low</option>
                <option value="name-asc">Name: A to Z</option>
              </select>
            </div>
          </div>

          <div className="food-price-filter">
            <div className="food-price-heading">
              <label htmlFor="food-max-price">Maximum dish price</label>
              <strong>{currency(maxPrice)}</strong>
            </div>
            <input
              id="food-max-price"
              type="range"
              min="50"
              max="1500"
              step="25"
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
              aria-label="Filter dishes by maximum price"
            />
          </div>

          <div className="food-filter-footer">
            <label className="food-popular-toggle">
              <input
                type="checkbox"
                checked={showPopularOnly}
                onChange={(event) => setShowPopularOnly(event.target.checked)}
              />
              <span>Show popular dishes only</span>
            </label>

            <button
              type="button"
              className="food-reset-button"
              onClick={resetFilters}
            >
              Reset filters
            </button>
          </div>
        </div>

        {filteredDishes.length > 0 ? (
          <>
            <div className="food-dish-grid">
              {paginatedDishes.map((dish) => (
                <article className="food-dish-card" key={dish.id}>
                  <div className="food-dish-visual">
                    <DishPhoto
                        dish={dish}
                        containerClass="food-dish-emoji"
                        photoClass="food-dish-photo"
                     />

                    {dish.popular && (
                      <span className="food-popular-badge">Popular choice</span>
                    )}

                    <span className="food-dietary-badge">
                      <span
                        className={`food-dietary-dot food-dietary-${(dish.dietary || "unspecified")
                          .toLowerCase()
                          .replace(/[^a-z]+/g, "-")}`}
                      />
                      {dish.dietary || "Not specified"}
                    </span>
                  </div>

                  <div className="food-dish-content">
                    <div className="food-dish-title-row">
                      <h3>{dish.name}</h3>
                      <strong>{currency(dish.price)}</strong>
                    </div>

                    <p className="food-dish-description">{dish.description}</p>

                    <div className="food-dish-meta">
                      <span className="food-rating">
                        {dish.salesCount} ordered
                      </span>
                      <span>{dish.category}</span>
                    </div>

                    <div className="food-dish-footer">
                      <span className="food-spice-level">
                        <span aria-hidden="true">♨</span>
                        {dish.spice || "Not specified"}
                      </span>

                      <button
                        type="button"
                        className="food-details-button"
                        onClick={() => setSelectedDish(dish)}
                      >
                        View Details <span aria-hidden="true">→</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>

            <div className="food-pagination" aria-label="Menu pagination">
              <span className="food-pagination-info">
                Showing <strong>{(currentPage - 1) * PAGE_SIZE + 1}</strong>–
                <strong>{Math.min(currentPage * PAGE_SIZE, filteredDishes.length)}</strong> of{" "}
                <strong>{filteredDishes.length}</strong> dishes · Page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
              </span>

              <div className="food-pagination-buttons">
                <button
                  type="button"
                  className="food-pagination-button"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous
                </button>

                {paginationPages.map((page, index) =>
                  page === "..." ? (
                    <span
                      key={`ellipsis-${index}`}
                      className="food-pagination-ellipsis"
                      aria-hidden="true"
                    >
                      ...
                    </span>
                  ) : (
                    <button
                      key={page}
                      type="button"
                      className={`food-pagination-button ${
                        currentPage === page ? "active" : ""
                      }`}
                      onClick={() => setCurrentPage(page)}
                      aria-current={currentPage === page ? "page" : undefined}
                      aria-label={`Page ${page}`}
                    >
                      {page}
                    </button>
                  )
                )}

                <button
                  type="button"
                  className="food-pagination-button"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage >= totalPages}
                  aria-label="Next page"
                >
                  Next
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </div>
            </div>
          </>
        ) : dishes.length === 0 && !loading && !error ? (
          <div className="food-empty-state">
            <span aria-hidden="true">🍽️</span>
            <h3>No dishes available</h3>
            <p>There are no menu items configured for this branch yet.</p>
          </div>
        ) : !loading && !error ? (
          <div className="food-empty-state">
            <span aria-hidden="true">⌕</span>
            <h3>No matching dishes</h3>
            <p>Try a different search term or adjust your filters.</p>
            <button type="button" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        ) : null}
      </section>

      {selectedDish && (
        <div
          className="food-modal-overlay"
          onClick={() => setSelectedDish(null)}
        >
          <section
            className="food-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="food-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="food-modal-top">
              <DishPhoto
                dish={selectedDish}
                containerClass="food-modal-visual"
                photoClass="food-modal-photo"
              />
              <button
                type="button"
                className="food-modal-close"
                onClick={() => setSelectedDish(null)}
                aria-label="Close dish details"
              >
                ×
              </button>
            </div>

            <div className="food-modal-body">
              <p className="food-eyebrow">{selectedDish.category}</p>

              <div className="food-modal-title-row">
                <h2 id="food-modal-title">{selectedDish.name}</h2>
                <strong>{currency(selectedDish.price)}</strong>
              </div>

              <div className="food-modal-meta">
  <span>{selectedDish.salesCount} ordered</span>
  <span>{selectedDish.spice || "Spice level unspecified"}</span>
</div>

              <p className="food-modal-description">
                {selectedDish.description}
              </p>

              <div className="food-modal-diet">
  <span
    className={`food-dietary-dot food-dietary-${(selectedDish.dietary || "unspecified")
      .toLowerCase()
      .replace(/[^a-z]+/g, "-")}`}
  />
  {selectedDish.dietary || "Not specified"}
</div>

              <div className="food-ingredients-section">
                <h3>Ingredients</h3>
                <div className="food-ingredient-list">
                  {selectedDish.ingredients.length > 0 ? (
    selectedDish.ingredients.map((ingredient, index) => (
      <span key={`${ingredient}-${index}`}>{ingredient}</span>
    ))
  ) : (
    <span>Ingredients not specified</span>
  )}
                </div>
              </div>

              <button
                type="button"
                className="food-modal-done"
                onClick={() => setSelectedDish(null)}
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}

export default FoodRecommendations;