import React, { useId } from 'react';

interface BrandMarkProps {
  className?: string;
  iconClassName?: string;
}

const BrandMark: React.FC<BrandMarkProps> = ({ className = '', iconClassName = '' }) => {
  const gradientId = useId().replace(/:/g, '');

  return (
    <div
      className={`relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-black via-stone-950 to-stone-800 shadow-lg ${className}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_20%,rgba(251,191,36,0.42),transparent_46%)]" />
      <svg
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        className={`relative w-[68%] h-[68%] ${iconClassName}`}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="100%" stopColor="#FDE68A" />
          </linearGradient>
        </defs>

        <path
          d="M13 46C18 37 24 32 31 30C36 29 41 27 46 23"
          stroke={`url(#${gradientId})`}
          strokeWidth="4"
          strokeLinecap="round"
        />
        <circle cx="13" cy="46" r="3.2" fill="#FFFFFF" />
        <circle cx="31" cy="30" r="3.2" fill="#FFFFFF" />
        <circle cx="46" cy="23" r="3.2" fill="#FCD34D" />

        <path
          d="M45.5 7.2L48.1 13.1L54.2 14.1L49.7 18.4L50.8 24.5L45.5 21.3L40.2 24.5L41.3 18.4L36.8 14.1L42.9 13.1L45.5 7.2Z"
          fill="#F59E0B"
          stroke="#FFFFFF"
          strokeWidth="1.4"
          strokeLinejoin="round"
        />

        <path
          d="M54.5 26.5L55.5 28.8L58 29.2L56.2 30.9L56.6 33.4L54.5 32.1L52.4 33.4L52.8 30.9L51 29.2L53.5 28.8L54.5 26.5Z"
          fill="#FFFFFF"
          opacity="0.9"
        />
      </svg>
    </div>
  );
};

export default BrandMark;
