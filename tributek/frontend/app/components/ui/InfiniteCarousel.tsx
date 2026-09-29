"use client";
/*Se implementa el carrusel: npm install embla-carousel-react */
import useEmblaCarousel from "embla-carousel-react";

/*Se implementa el movimiento automatico: npm install embla-carousel-autoplay*/
import Autoplay from "embla-carousel-autoplay";

const items = [
    "IMG 1 ",
    "IMG 2 ",
    "IMG 3 ",
    "IMG 4 ",
    "IMG 5 ",
    "IMG 6 ",
    "IMG 7 ",
    "IMG 8 ",
    "IMG 9 ",
    "IMG 10 ",
    "IMG 11 ",

];

export default function InfiniteCarousel() {
    const autoplay = Autoplay({
    delay: 3000,
    stopOnInteraction: false,
  });

  const [emblaRef] = useEmblaCarousel(
    {
      loop: true,
      align: "start",
    },
    [autoplay]
  );


    return (
        <div className="w-full overflow-hidden">
            <div ref={emblaRef} className="overflow-hidden ">
                <div className="flex">
                    {items.map((item) => (
                        <div
                            key={item}
                            className="mx-auto min-w-0   flex-[0_0_80%] px-2 sm:flex-[0_0_40%] md:flex-[0_0_12%]"
                        >
                            <div className="flex  h-40 items-center justify-center rounded-full border border-border bg-surface">
                                <span className="font-display   text-lg">
                                    {item}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}