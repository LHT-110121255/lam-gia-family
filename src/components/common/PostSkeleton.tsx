import React from 'react';

export const PostSkeleton: React.FC = () => {
  return (
    <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-full bg-stone-200 shrink-0" />
          <div className="space-y-1.5">
            <div className="w-28 h-3.5 bg-stone-200 rounded-md" />
            <div className="w-20 h-2.5 bg-stone-150 rounded-md" />
          </div>
        </div>
        <div className="w-16 h-5 bg-stone-150 rounded-full" />
      </div>

      {/* Text Skeleton */}
      <div className="space-y-1.5 pt-1">
        <div className="w-full h-3 bg-stone-200 rounded-md" />
        <div className="w-3/4 h-3 bg-stone-200 rounded-md" />
      </div>

      {/* Media Skeleton */}
      <div className="w-full h-48 bg-stone-200 rounded-2xl" />

      {/* Footer Skeleton */}
      <div className="pt-2 border-t border-stone-100 flex items-center justify-between">
        <div className="w-20 h-4 bg-stone-200 rounded-md" />
        <div className="w-20 h-4 bg-stone-200 rounded-md" />
      </div>
    </div>
  );
};
