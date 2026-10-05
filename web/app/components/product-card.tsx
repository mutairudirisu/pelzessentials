"use client";

import Image from "next/image";
import { ArrowUpRight, Plus, ShoppingBag, X } from "lucide-react";
import { useRef } from "react";
import { formatNaira, useShop } from "@/app/components/shop-provider";
import type { Product } from "@/lib/catalog";

export function ProductCard({ product }: { product: Product }) {
  const { addItem } = useShop();
  const detailsDialog = useRef<HTMLDialogElement>(null);

  function addToBag() {
    addItem(product.id);
    detailsDialog.current?.close();
  }

  return (
    <article className="product-card">
      <div className="product-image">
        <Image
          src={product.image_url}
          alt={product.name}
          fill
          sizes="(max-width: 640px) 44vw, (max-width: 900px) 28vw, 18vw"
        />
        {product.badge && <span className="product-badge">{product.badge}</span>}
        <div className="product-hover-overlay">
          <div className="product-hover-copy">
            <p className="product-hover-category">{product.category}</p>
            <p className="product-hover-description">{product.description}</p>
          </div>
          <button
            className="product-hover-details"
            type="button"
            onClick={() => detailsDialog.current?.showModal()}
            aria-label={`View details for ${product.name}`}
          >
            View details <ArrowUpRight size={15} strokeWidth={1.6} />
          </button>
        </div>
        <button
          className="quick-add"
          type="button"
          onClick={() => addItem(product.id)}
          aria-label={`Add ${product.name} to bag`}
        >
          <Plus size={17} strokeWidth={1.5} />
        </button>
      </div>
      <div className="product-info">
        <div className="product-info-heading">
          <div className="product-copy">
            <p className="product-category">{product.category}</p>
            <h3>{product.name}</h3>
          </div>
          <span className="product-price">{formatNaira(product.price)}</span>
        </div>
      </div>
      <dialog
        className="product-details-dialog"
        ref={detailsDialog}
        aria-labelledby={`product-title-${product.id}`}
        onClick={(event) => {
          if (event.target === detailsDialog.current) detailsDialog.current?.close();
        }}
      >
        <div className="product-dialog-content">
          <div className="product-dialog-image">
            <Image
              src={product.image_url}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 92vw, 420px"
            />
          </div>
          <div className="product-dialog-copy">
            <button
              className="product-dialog-close"
              type="button"
              onClick={() => detailsDialog.current?.close()}
              aria-label="Close product details"
              title="Close"
            >
              <X size={18} />
            </button>
            <p className="eyebrow">{product.category}</p>
            <h2 id={`product-title-${product.id}`}>{product.name}</h2>
            {product.badge && <p className="product-dialog-badge">{product.badge}</p>}
            <p className="product-dialog-description">{product.description}</p>
            <p className="product-dialog-price">{formatNaira(product.price)}</p>
            <button className="button product-dialog-add" type="button" onClick={addToBag}>
              <ShoppingBag size={16} strokeWidth={1.6} /> Add to bag
            </button>
          </div>
        </div>
      </dialog>
    </article>
  );
}
