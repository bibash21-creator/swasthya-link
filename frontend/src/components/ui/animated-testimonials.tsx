"use client";

import { IconArrowLeft, IconArrowRight } from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type Testimonial = {
  quote: string;
  name: string;
  designation: string;
  src: string;
};

export const AnimatedTestimonials = ({
  testimonials,
  autoplay = false,
  className,
}: {
  testimonials: Testimonial[];
  autoplay?: boolean;
  className?: string;
}) => {
  const [active, setActive] = useState(0);

  const handleNext = () => {
    setActive((prev) => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setActive((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  const isActive = (index: number) => {
    return index === active;
  };

  useEffect(() => {
    if (autoplay) {
      const interval = setInterval(handleNext, 5000);
      return () => clearInterval(interval);
    }
  }, [autoplay]);

  const randomRotateY = () => {
    return Math.floor(Math.random() * 21) - 10;
  };

  return (
    <div className={cn("max-w-6xl mx-auto px-4 md:px-8 lg:px-12 py-32", className)}>
      <div className="relative grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
        <div className="relative">
          {/* Background Colorful Card Effect */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-primary/20 via-violet-500/10 to-transparent blur-3xl opacity-30 -z-10 rounded-[4rem]" />
          
          <div className="relative h-[500px] w-full group">
            <AnimatePresence mode="popLayout">
              {testimonials.map((testimonial, index) => (
                <motion.div
                  key={testimonial.src}
                  initial={{
                    opacity: 0,
                    scale: 0.8,
                    z: -100,
                    rotate: randomRotateY(),
                  }}
                  animate={{
                    opacity: isActive(index) ? 1 : 0.4,
                    scale: isActive(index) ? 1 : 0.85,
                    z: isActive(index) ? 0 : -100,
                    rotate: isActive(index) ? 0 : randomRotateY(),
                    zIndex: isActive(index)
                      ? 999
                      : testimonials.length + 2 - index,
                    y: isActive(index) ? [0, -40, 0] : 0,
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.8,
                    z: 100,
                    rotate: randomRotateY(),
                  }}
                  transition={{
                    duration: 0.6,
                    ease: [0.23, 1, 0.32, 1],
                  }}
                  className="absolute inset-0 origin-bottom"
                >
                  <div className="relative h-full w-full rounded-[3rem] overflow-hidden shadow-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
                    <Image
                      src={testimonial.src}
                      alt={testimonial.name}
                      fill
                      draggable={false}
                      className="object-cover object-center"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
        <div className="flex justify-between flex-col py-8">
          <motion.div
            key={active}
            initial={{
              y: 40,
              opacity: 0,
              filter: "blur(10px)"
            }}
            animate={{
              y: 0,
              opacity: 1,
              filter: "blur(0px)"
            }}
            exit={{
              y: -40,
              opacity: 0,
              filter: "blur(10px)"
            }}
            transition={{
              duration: 0.5,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            <h3 className="text-4xl font-black text-foreground tracking-tighter uppercase italic">
              {testimonials[active].name}
            </h3>
            <p className="text-base text-primary font-mono uppercase tracking-[0.3em] mt-2">
              {testimonials[active].designation}
            </p>
            <motion.p className="text-2xl text-muted-foreground mt-12 leading-relaxed font-medium">
              {testimonials[active].quote.split(" ").map((word, index) => (
                <motion.span
                  key={index}
                  initial={{
                    filter: "blur(10px)",
                    opacity: 0,
                    y: 10,
                  }}
                  animate={{
                    filter: "blur(0px)",
                    opacity: 1,
                    y: 0,
                  }}
                  transition={{
                    duration: 0.3,
                    ease: "easeOut",
                    delay: 0.015 * index,
                  }}
                  className="inline-block"
                >
                  {word}&nbsp;
                </motion.span>
              ))}
            </motion.p>
          </motion.div>
          
          {/* Navigation */}
          <div className="flex gap-6 pt-20">
            <motion.button
              whileHover={{ scale: 1.1, x: -5 }}
              whileTap={{ scale: 0.9 }}
              onClick={handlePrev}
              className="h-14 w-14 rounded-2xl bg-secondary border border-border flex items-center justify-center group/button hover:bg-primary transition-all duration-300"
            >
              <IconArrowLeft className="h-6 w-6 text-foreground group-hover/button:text-primary-foreground group-hover/button:rotate-12 transition-all" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1, x: 5 }}
              whileTap={{ scale: 0.9 }}
              onClick={handleNext}
              className="h-14 w-14 rounded-2xl bg-secondary border border-border flex items-center justify-center group/button hover:bg-primary transition-all duration-300"
            >
              <IconArrowRight className="h-6 w-6 text-foreground group-hover/button:text-primary-foreground group-hover/button:-rotate-12 transition-all" />
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
};
