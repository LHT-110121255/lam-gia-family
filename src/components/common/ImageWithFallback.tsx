import React, { useState } from 'react';
import { Image as ImageIcon, Camera } from 'lucide-react';

interface ImageWithFallbackProps {
  src: string;
  alt: string;
  className?: string;
  onClick?: () => void;
  loading?: 'lazy' | 'eager';
}

export const ImageWithFallback: React.FC<ImageWithFallbackProps> = ({
  src,
  alt,
  className = '',
  onClick,
  loading = 'lazy',
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  if (isError || !src) {
    return (
      <div
        onClick={onClick}
        className={`bg-stone-100 border border-stone-200/80 rounded-2xl flex flex-col items-center justify-center text-stone-400 p-4 text-center select-none ${
          onClick ? 'cursor-pointer hover:bg-stone-200/60' : ''
        } ${className}`}
      >
        <div className="w-10 h-10 rounded-full bg-stone-200/80 flex items-center justify-center mb-1.5 text-stone-400">
          <Camera className="w-5 h-5" />
        </div>
        <span className="text-[11px] font-bold text-stone-500">Ảnh không khả dụng</span>
        <span className="text-[9px] text-stone-400">Khoảnh khắc gia đình</span>
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Pulse Skeleton placeholder while loading */}
      {isLoading && (
        <div className="absolute inset-0 bg-stone-200 animate-pulse rounded-2xl flex items-center justify-center">
          <ImageIcon className="w-6 h-6 text-stone-300 animate-bounce" />
        </div>
      )}

      <img
        src={src}
        alt={alt}
        loading={loading}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setIsError(true);
        }}
        onClick={onClick}
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isLoading ? 'opacity-0' : 'opacity-100'
        } ${onClick ? 'cursor-pointer hover:scale-105 transition duration-300' : ''}`}
      />
    </div>
  );
};
