"use client";

import { useState } from "react";
import { ProductCard } from "@/app/components/product-card";
import type { Product } from "@/lib/catalog";

const filters = [
  "All pieces",
  "Plush blankets",
  "Tote bags",
  "Gym mats",
  "Personal essentials",
  "Gym bags",
  "Dolphin bags",
];

export function ShopSection({ products }: { products: Product[] }) {
  const [activeFilter, setActiveFilter] = useState("All pieces");
  const shownProducts =
    activeFilter === "All pieces"
      ? products
      : products.filter((product) => product.category === activeFilter);
  return (
    <section className="section" id="shop">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Comfort, collected</p>
          <h2>Find your everyday.</h2>
        </div>
        <p>Little things that make a big difference.</p>
      </div>
      <div className="product-filters" aria-label="Filter products">
        {filters.map((filter) => (
          <button
            className="filter-button"
            type="button"
            key={filter}
            aria-pressed={activeFilter === filter}
            onClick={() => setActiveFilter(filter)}
          >
            {filter}
          </button>
        ))}
      </div>
      <div className="product-grid">
        {shownProducts.length ? (
          shownProducts.map((product) => <ProductCard key={product.id} product={product} />)
        ) : (
          <p className="empty-products">New pieces are on their way.</p>
        )}
      </div>
    </section>
  );
}
