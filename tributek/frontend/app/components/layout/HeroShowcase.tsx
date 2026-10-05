"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";

const slides = [
  {
    id: "dashboard",
    title: "Profesionales trabajando en equipo",
    label: "Equipo contable",
    image: "https://images.unsplash.com/photo-1551836022-d5d88e9218df?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "documentos",
    title: "Revisión de documentos financieros",
    label: "Gestión financiera",
    image: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?auto=format&fit=crop&w=1200&q=85",
  },
  {
    id: "obligaciones",
    title: "Reunión de trabajo",
    label: "Asesoría cercana",
    image: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1200&q=85",
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
    <div className="relative isolate w-full">
      <div aria-hidden="true" className="hero-showcase-plaque absolute inset-x-3 top-3 bottom-7 z-0 translate-x-3 translate-y-3 rounded-2xl" />
      <div ref={emblaRef} className="hero-showcase-shadow relative z-10 overflow-hidden">
        <div className="flex">
          {slides.map((slide) => (
            <div key={slide.id} className="min-w-0 flex-[0_0_100%]">
              <div className="hero-showcase-frame aspect-[4/3] w-full">
                <div className="relative h-full w-full overflow-hidden rounded-xl">
                  <Image
                    src={slide.image}
                    alt={slide.title}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                  <div className="hero-showcase-caption absolute inset-x-0 bottom-0 flex items-center justify-between gap-3 px-4 py-3">
                    <span className="text-sm font-semibold text-white">{slide.label}</span>
                    <span className="text-[10px] font-medium uppercase tracking-wider text-white/75">Imagen ilustrativa</span>
                  </div>
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