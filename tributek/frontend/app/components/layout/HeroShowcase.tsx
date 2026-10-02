"use client";

import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";

const slides = [
  {
    id: "dashboard",
    title: "Dashboard imagen 1 ",
  },
  {
    id: "documentos",
    title: "Documentos imagen 1",
  },
  {
    id: "obligaciones",
    title: "Obligaciones imagen 1",
  },
];

export default function HeroShowcase() {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const resumeTimeoutRef = useRef<number | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel(
    {
      loop: true,
    },
    [
      Autoplay({
        delay: 5500,
        stopOnInteraction: false,
      }),
      Fade(),
    ],
  );

  const stopAutoplay = () => {
    const autoplay = emblaApi?.plugins().autoplay;
    if (!autoplay) return;

    autoplay.stop();
    setIsPlaying(false);
  };

  const scheduleResumeAutoplay = () => {
    const autoplay = emblaApi?.plugins().autoplay;
    if (!autoplay) return;

    if (resumeTimeoutRef.current) {
      window.clearTimeout(resumeTimeoutRef.current);
    }

    resumeTimeoutRef.current = window.setTimeout(() => {
      autoplay.play();
      setIsPlaying(true);
    }, 1200);
  };

  useEffect(() => {
    if (!emblaApi) return;

    const syncAutoplayState = () => {
      const autoplay = emblaApi.plugins().autoplay;
      setIsPlaying(autoplay ? autoplay.isPlaying() : false);
    };

    const onSelect = () => {
      setSelectedIndex(emblaApi.selectedScrollSnap());
      syncAutoplayState();
    };

    onSelect();

    const container = emblaApi.containerNode();
    const resumeOnMouseLeave = () => scheduleResumeAutoplay();

    emblaApi.on("select", onSelect);
    emblaApi.on("pointerDown", stopAutoplay);
    emblaApi.on("pointerUp", scheduleResumeAutoplay);
    container.addEventListener("mouseleave", resumeOnMouseLeave);

    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("pointerDown", stopAutoplay);
      emblaApi.off("pointerUp", scheduleResumeAutoplay);
      container.removeEventListener("mouseleave", resumeOnMouseLeave);

      if (resumeTimeoutRef.current) {
        window.clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, [emblaApi]);

  const handleDotClick = (index: number) => {
    emblaApi?.scrollTo(index);
    stopAutoplay();
    scheduleResumeAutoplay();
  };

  return (
    <div className="w-full">
      <div ref={emblaRef} className="overflow-hidden">
        <div className="flex">
          {slides.map((slide) => (
            <div key={slide.id} className="min-w-0 flex-[0_0_100%]">
              <div className="aspect-[4/3] w-full rounded-2xl border border-border ">
                <div className="flex h-full items-center justify-center">
                  <span className="text-xl font-semibold">{slide.title}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
       

        <div className="flex items-center gap-2">
          {slides.map((slide, index) => (
            <button
              key={slide.id}
              type="button"
              aria-label={`Mostrar ${slide.title}`}
              aria-current={selectedIndex === index}
              onClick={() => handleDotClick(index)}
              className={`h-2 rounded-full transition-all duration-300 ${
                selectedIndex === index ? "w-8 bg-primary" : "w-2 bg-border"
              }`}
            />
          ))}
        </div>
      
      </div>
    </div>
  );
}