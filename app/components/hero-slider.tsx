"use client";

import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";

export type HeroSlide = {
  eyebrow: string;
  title: string;
  description: string;
  image: string;
  alt: string;
};

export function HeroSlider({ slides }: { slides: HeroSlide[] }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slides.length);
    }, 6000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) return null;

  const activeSlide = slides[activeIndex];
  const changeSlide = (direction: number) => {
    setActiveIndex((current) => (current + direction + slides.length) % slides.length);
  };

  return (
    <section className="hero" aria-label="Featured products" aria-roledescription="carousel">
      <div className="hero-image" key={activeSlide.image}>
        <Image
          src={activeSlide.image}
          alt={activeSlide.alt}
          fill
          priority={activeIndex === 0}
          sizes="100vw"
        />
      </div>
      <div className="hero-copy" key={activeSlide.title} aria-live="polite">
        <p className="eyebrow">{activeSlide.eyebrow}</p>
        <h1>{activeSlide.title}</h1>
        <p>{activeSlide.description}</p>
        <a className="button button-light" href="#shop">
          Shop the collection
        </a>
      </div>
      {slides.length > 1 && (
        <>
          <button
            className="hero-arrow hero-arrow-previous"
            onClick={() => changeSlide(-1)}
            aria-label="Previous featured product"
          >
            <ChevronLeft size={19} strokeWidth={1.5} />
          </button>
          <button
            className="hero-arrow hero-arrow-next"
            onClick={() => changeSlide(1)}
            aria-label="Next featured product"
          >
            <ChevronRight size={19} strokeWidth={1.5} />
          </button>
          <div className="hero-dots" aria-label="Choose featured product">
            {slides.map((slide, index) => (
              <button
                key={slide.title}
                className={index === activeIndex ? "is-active" : ""}
                onClick={() => setActiveIndex(index)}
                aria-label={`Show slide ${index + 1}: ${slide.title}`}
                aria-current={index === activeIndex ? "true" : undefined}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
