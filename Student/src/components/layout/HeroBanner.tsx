import React from 'react';

interface HeroBannerProps {
  image: string;
  title: string;
  subtitle?: string;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({ image, title, subtitle }) => {
  return (
    <div className="relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen h-[240px] sm:h-[320px] md:h-[380px] overflow-hidden mb-8 no-print -mt-4 sm:-mt-6 lg:-mt-8 shadow-xl">
      <img 
        src={image} 
        alt={title} 
        className="w-full h-full object-cover brightness-[0.45] contrast-105"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent flex flex-col justify-end">
        <div className="max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-10 py-6 sm:py-8">
          <span className="text-[10px] sm:text-xs text-amber-400 font-black tracking-widest uppercase block mb-1">OM SAI PG</span>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-black text-white tracking-tight uppercase leading-tight drop-shadow-md">
            {title}
          </h1>
          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-200 mt-1.5 font-semibold tracking-wide uppercase">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
