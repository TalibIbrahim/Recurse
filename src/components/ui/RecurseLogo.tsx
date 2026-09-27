import React from 'react';

export interface RecurseLogoProps {
  size?: number;
  showWordmark?: boolean;
  className?: string;
}

export const RecurseLogo: React.FC<RecurseLogoProps> = ({
  size = 20,
  showWordmark = true,
  className = '',
}) => {
  return (
    <div className={`inline-flex items-center gap-2 select-none ${className}`}>
      {/* Geometric Recursion Logomark */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0 text-accent-blue transition-transform duration-200 active:scale-95"
        aria-hidden="true"
      >
        <path
          d="M 4.5 19.5 L 4.5 4.5 L 19.5 4.5 L 19.5 15.5 L 9.5 15.5 L 9.5 10 L 14.5 10"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {/* Understated Apple-style Wordmark */}
      {showWordmark && (
        <span className="font-semibold text-[15px] tracking-[-0.03em] text-label-primary leading-none">
          Recurse
        </span>
      )}
    </div>
  );
};

export default RecurseLogo;
