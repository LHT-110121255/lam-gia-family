import React from 'react';

interface AvatarProps {
  src: string;
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  online?: boolean;
  className?: string;
  relationship?: string;
}

const sizeClasses = {
  xs: 'w-7 h-7 text-[10px]',
  sm: 'w-9 h-9 text-xs',
  md: 'w-11 h-11 text-sm',
  lg: 'w-14 h-14 text-base',
  xl: 'w-20 h-20 text-xl',
};

const dotClasses = {
  xs: 'w-2 h-2 bottom-0 right-0 border',
  sm: 'w-2.5 h-2.5 bottom-0 right-0 border-[1.5px]',
  md: 'w-3 h-3 bottom-0.5 right-0.5 border-2',
  lg: 'w-3.5 h-3.5 bottom-1 right-1 border-2',
  xl: 'w-5 h-5 bottom-1 right-1 border-2',
};

export const Avatar: React.FC<AvatarProps> = ({
  src,
  name,
  size = 'md',
  online,
  className = '',
  relationship,
}) => {
  const [hasError, setHasError] = React.useState(false);

  const getInitials = (n: string) => {
    const parts = n.trim().split(' ');
    if (parts.length >= 2) {
      return (parts[parts.length - 2][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div className={`relative inline-block shrink-0 ${className}`}>
      <div
        className={`${sizeClasses[size]} rounded-full overflow-hidden bg-stone-200 ring-2 ring-white/80 shadow-xs flex items-center justify-center font-semibold text-stone-700 select-none`}
      >
        {!hasError && src ? (
          <img
            src={src}
            alt={name}
            className="w-full h-full object-cover"
            onError={() => setHasError(true)}
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <span>{getInitials(name)}</span>
        )}
      </div>

      {online !== undefined && (
        <span
          className={`absolute rounded-full border-white ${dotClasses[size]} ${
            online ? 'bg-emerald-500' : 'bg-stone-300'
          }`}
          title={online ? 'Đang hoạt động' : 'Ngoại tuyến'}
        />
      )}

      {relationship && size === 'xl' && (
        <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-stone-900 text-stone-100 text-[10px] font-medium px-2 py-0.5 rounded-full shadow-sm">
          {relationship}
        </span>
      )}
    </div>
  );
};
