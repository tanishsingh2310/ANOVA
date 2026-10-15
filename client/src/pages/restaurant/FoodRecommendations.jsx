import { useMemo, useState } from "react";
import "../../styles/food-recommendations.css";

const initialDishes = [
  {
    id: 1,
    name: "Paneer Tikka",
    category: "Starters",
    price: 280,
    rating: 4.8,
    reviews: 124,
    dietary: "Vegetarian",
    spice: "Medium",
    popular: true,
    description: "Chargrilled paneer marinated with aromatic Indian spices.",
    ingredients: ["Paneer", "Yogurt", "Bell peppers", "Indian spices"],
    image: "🧀",
    available: true,
  },
  {
    id: 2,
    name: "Veg Hakka Noodles",
    category: "Main Course",
    price: 220,
    rating: 4.6,
    reviews: 98,
    dietary: "Vegan",
    spice: "Medium",
    popular: true,
    description: "Stir-fried noodles tossed with fresh vegetables and sauces.",
    ingredients: ["Noodles", "Cabbage", "Carrots", "Bell peppers"],
    image: "🍜",
    available: true,
  },
  {
    id: 3,
    name: "Margherita Pizza",
    category: "Main Course",
    price: 350,
    rating: 4.7,
    reviews: 156,
    dietary: "Vegetarian",
    spice: "Mild",
    popular: true,
    description: "Classic pizza topped with tomato, mozzarella, and basil.",
    ingredients: ["Pizza dough", "Tomato sauce", "Mozzarella", "Basil"],
    image: "🍕",
    available: true,
  },
  {
    id: 4,
    name: "Chicken Tikka",
    category: "Starters",
    price: 340,
    rating: 4.9,
    reviews: 142,
    dietary: "Non-Vegetarian",
    spice: "Hot",
    popular: true,
    description: "Tender chicken pieces grilled in a spiced yogurt marinade.",
    ingredients: ["Chicken", "Yogurt", "Ginger", "Spices"],
    image: "🍗",
    available: true,
  },
  {
    id: 5,
    name: "Veg Biryani",
    category: "Main Course",
    price: 260,
    rating: 4.5,
    reviews: 87,
    dietary: "Vegetarian",
    spice: "Medium",
    popular: false,
    description: "Fragrant basmati rice cooked with vegetables and whole spices.",
    ingredients: ["Basmati rice", "Mixed vegetables", "Mint", "Spices"],
    image: "🍚",
    available: true,
  },
  {
    id: 6,
    name: "Dal Makhani",
    category: "Main Course",
    price: 240,
    rating: 4.7,
    reviews: 76,
    dietary: "Vegetarian",
    spice: "Mild",
    popular: false,
    description: "Slow-cooked black lentils prepared with a creamy tomato gravy.",
    ingredients: ["Black lentils", "Tomatoes", "Cream", "Butter"],
    image: "🥣",
    available: true,
  },
  {
    id: 7,
    name: "Garden Fresh Salad",
    category: "Healthy",
    price: 180,
    rating: 4.4,
    reviews: 53,
    dietary: "Vegan",
    spice: "Mild",
    popular: false,
    description: "A refreshing bowl of seasonal vegetables with lemon dressing.",
    ingredients: ["Lettuce", "Cucumber", "Tomatoes", "Lemon"],
    image: "🥗",
    available: true,
  },
  {
    id: 8,
    name: "Grilled Fish",
    category: "Main Course",
    price: 420,
    rating: 4.8,
    reviews: 91,
    dietary: "Non-Vegetarian",
    spice: "Medium",
    popular: false,
    description: "Grilled fish fillet seasoned with herbs and lemon.",
    ingredients: ["Fish fillet", "Lemon", "Herbs", "Olive oil"],
    image: "🐟",
    available: true,
  },
  {
    id: 9,
    name: "Chocolate Brownie",
    category: "Desserts",
    price: 160,
    rating: 4.7,
    reviews: 113,
    dietary: "Vegetarian",
    spice: "Mild",
    popular: true,
    description: "Rich chocolate brownie with a soft, fudgy centre.",
    ingredients: ["Chocolate", "Flour", "Butter", "Sugar"],
    image: "🍫",
    available: true,
  },
  {
    id: 10,
    name: "Fresh Lime Soda",
    category: "Beverages",
    price: 90,
    rating: 4.3,
    reviews: 64,
    dietary: "Vegan",
    spice: "Mild",
    popular: false,
    description: "A refreshing lime drink served sweet, salted, or plain.",
    ingredients: ["Lime", "Soda water", "Sugar or salt"],
    image: "🍋",
    available: true,
  },
  {
    id: 11,
    name: "Butter Chicken",
    category: "Main Course",
    price: 380,
    rating: 4.8,
    reviews: 135,
    dietary: "Non-Vegetarian",
    spice: "Medium",
    popular: true,
    description: "Chicken simmered in a rich tomato and butter-based gravy.",
    ingredients: ["Chicken", "Tomatoes", "Butter", "Cream", "Spices"],
    image: "🍛",
    available: true,
  },
  {
    id: 12,
    name: "Fruit Bowl",
    category: "Healthy",
    price: 150,
    rating: 4.5,
    reviews: 42,
    dietary: "Vegan",
    spice: "Mild",
    popular: false,
    description: "A colourful selection of seasonal fresh fruits.",
    ingredients: ["Seasonal fruits"],
    image: "🍓",
    available: true,
  },
];

const currency = (amount) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);

function FoodRecommendations() {
  const [dishes] = useState(initialDishes);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [dietary, setDietary] = useState("All");
  const [sortBy, setSortBy] = useState("recommended");
  const [maxPrice, setMaxPrice] = useState(500);
  const [budget, setBudget] = useState("300");
  const [showPopularOnly, setShowPopularOnly] = useState(false);
  const [selectedDish, setSelectedDish] = useState(null);
  const [recommendationMode, setRecommendationMode] = useState(false);

  const categories = [
    "All",
    "Starters",
    "Main Course",
    "Healthy",
    "Desserts",
    "Beverages",
  ];

  const filteredDishes = useMemo(() => {
    const query = search.trim().toLowerCase();

    const result = dishes.filter((dish) => {
      const matchesSearch =
        dish.name.toLowerCase().includes(query) ||
        dish.description.toLowerCase().includes(query) ||
        dish.ingredients.some((ingredient) =>
          ingredient.toLowerCase().includes(query)
        );

      const matchesCategory =
        category === "All" || dish.category === category;

      const matchesDietary =
        dietary === "All" || dish.dietary === dietary;

      const matchesPrice = dish.price <= maxPrice;

      const matchesPopularity = !showPopularOnly || dish.popular;

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
      result.sort((a, b) => a.price - b.price);
    } else if (sortBy === "price-high") {
      result.sort((a, b) => b.price - a.price);
    } else if (sortBy === "rating") {
      result.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === "popular") {
      result.sort(
        (a, b) => Number(b.popular) - Number(a.popular) || b.rating - a.rating
      );
    } else {
      result.sort(
        (a, b) =>
          Number(b.popular) - Number(a.popular) || b.rating - a.rating
      );
    }

    return result;
  }, [dishes, search, category, dietary, maxPrice, showPopularOnly, sortBy]);

  const recommendations = useMemo(() => {
    const amount = Number(budget);

    if (!Number.isFinite(amount) || amount <= 0) {
      return [];
    }

    return [...dishes]
      .filter(
        (dish) =>
          dish.available &&
          dish.price <= amount &&
          (dietary === "All" || dish.dietary === dietary)
      )
      .sort(
        (a, b) =>
          Number(b.popular) - Number(a.popular) || b.rating - a.rating
      )
      .slice(0, 4);
  }, [dishes, budget, dietary]);

  const resetFilters = () => {
    setSearch("");
    setCategory("All");
    setDietary("All");
    setSortBy("recommended");
    setMaxPrice(500);
    setShowPopularOnly(false);
    setRecommendationMode(false);
  };

  return (
    <main className="food-page">
      <header className="food-header">
        <div>
          <p className="food-eyebrow">RESTAURANT OPERATIONS</p>
          <h1>Food Recommendations</h1>
          <p className="food-subtitle">
            Discover popular dishes and suggest the right meal for every guest.
          </p>
        </div>

        <button
          type="button"
          className="food-recommend-button"
          onClick={() => setRecommendationMode((current) => !current)}
        >
          <span aria-hidden="true">✦</span>
          {recommendationMode ? "Browse Menu" : "Find Recommendations"}
        </button>
      </header>

      <section className="food-overview">
        <article className="food-overview-card">
          <div className="food-overview-icon">🍽</div>
          <div>
            <span>Available Dishes</span>
            <strong>{dishes.filter((dish) => dish.available).length}</strong>
          </div>
        </article>

        <article className="food-overview-card">
          <div className="food-overview-icon">★</div>
          <div>
            <span>Popular Choices</span>
            <strong>{dishes.filter((dish) => dish.popular).length}</strong>
          </div>
        </article>

        <article className="food-overview-card">
          <div className="food-overview-icon">♧</div>
          <div>
            <span>Dietary Options</span>
            <strong>3</strong>
          </div>
        </article>

        <article className="food-overview-card">
          <div className="food-overview-icon">₹</div>
          <div>
            <span>Starting Price</span>
            <strong>{currency(Math.min(...dishes.map((dish) => dish.price)))}</strong>
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

          {recommendations.length > 0 ? (
            <div className="food-recommendation-list">
              {recommendations.map((dish) => (
                <button
                  type="button"
                  className="food-recommendation-item"
                  key={dish.id}
                  onClick={() => setSelectedDish(dish)}
                >
                  <span className="food-recommendation-emoji">
                    {dish.image}
                  </span>
                  <span className="food-recommendation-info">
                    <strong>{dish.name}</strong>
                    <small>
                      {dish.dietary} · ★ {dish.rating}
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
              No dishes match this budget and dietary preference. Try adjusting
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
            <span aria-hidden="true">⌕</span>
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
                <option value="recommended">Recommended</option>
                <option value="popular">Most Popular</option>
                <option value="rating">Highest Rated</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
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
              min="100"
              max="500"
              step="10"
              value={maxPrice}
              onChange={(event) => setMaxPrice(Number(event.target.value))}
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
          <div className="food-dish-grid">
            {filteredDishes.map((dish) => (
              <article className="food-dish-card" key={dish.id}>
                <div className="food-dish-visual">
                  <span className="food-dish-emoji" aria-hidden="true">
                    {dish.image}
                  </span>

                  {dish.popular && (
                    <span className="food-popular-badge">Popular choice</span>
                  )}

                  <span className="food-dietary-badge">
                    <span
                      className={`food-dietary-dot food-dietary-${dish.dietary
                        .toLowerCase()
                        .replace(/[^a-z]+/g, "-")}`}
                    />
                    {dish.dietary}
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
                      ★ {dish.rating}
                      <small>({dish.reviews})</small>
                    </span>
                    <span>{dish.category}</span>
                  </div>

                  <div className="food-dish-footer">
                    <span className="food-spice-level">
                      <span aria-hidden="true">♨</span>
                      {dish.spice}
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
        ) : (
          <div className="food-empty-state">
            <span aria-hidden="true">⌕</span>
            <h3>No matching dishes</h3>
            <p>Try a different search term or adjust your filters.</p>
            <button type="button" onClick={resetFilters}>
              Clear filters
            </button>
          </div>
        )}
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
              <div className="food-modal-visual">{selectedDish.image}</div>
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
                <span>★ {selectedDish.rating}</span>
                <span>{selectedDish.reviews} reviews</span>
                <span>{selectedDish.spice} spice</span>
              </div>

              <p className="food-modal-description">
                {selectedDish.description}
              </p>

              <div className="food-modal-diet">
                <span
                  className={`food-dietary-dot food-dietary-${selectedDish.dietary
                    .toLowerCase()
                    .replace(/[^a-z]+/g, "-")}`}
                />
                {selectedDish.dietary}
              </div>

              <div className="food-ingredients-section">
                <h3>Ingredients</h3>
                <div className="food-ingredient-list">
                  {selectedDish.ingredients.map((ingredient) => (
                    <span key={ingredient}>{ingredient}</span>
                  ))}
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