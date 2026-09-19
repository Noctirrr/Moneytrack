import React from 'react';

interface GoogleSignInButtonProps {
  onClick: () => void;
  lang?: 'th' | 'en';
  variant?: 'compact' | 'standard' | 'prominent';
  className?: string;
  id?: string;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onClick,
  lang = 'th',
  variant = 'compact',
  className = '',
  id = 'google-signin-btn',
}) => {
  const isCompact = variant === 'compact';
  const isProminent = variant === 'prominent';

  return (
    <button
      id={id}
      type="button"
      onClick={onClick}
      className={`group relative inline-flex items-center justify-center font-medium select-none transition-all duration-200 cursor-pointer active:scale-[0.98] ${
        isProminent
          ? 'gap-3 px-5 py-3 rounded-2xl bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border border-neutral-200/90 dark:border-neutral-700/80 shadow-sm hover:shadow-md hover:border-neutral-300 dark:hover:border-neutral-600 text-sm'
          : isCompact
          ? 'gap-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border border-neutral-200/90 dark:border-neutral-700 shadow-xs hover:shadow hover:border-neutral-300 dark:hover:border-neutral-600 text-xs sm:text-xs'
          : 'gap-2.5 px-4 py-2.5 rounded-xl bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-100 border border-neutral-200/90 dark:border-neutral-700 shadow-xs hover:shadow hover:border-neutral-300 dark:hover:border-neutral-600 text-xs sm:text-sm'
      } ${className}`}
      title={lang === 'th' ? 'เข้าสู่ระบบด้วย Google เพื่อบันทึกข้อมูลบน Cloud' : 'Sign in with Google to sync your data'}
    >
      {/* Official Google Vector Logo */}
      <div className={`relative flex items-center justify-center flex-shrink-0 transition-transform duration-200 group-hover:scale-105 ${
        isProminent ? 'w-5 h-5' : 'w-4 h-4 sm:w-4.5 sm:h-4.5'
      }`}>
        <svg 
          viewBox="0 0 24 24" 
          width="100%" 
          height="100%" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            fill="#EA4335"
          />
        </svg>
      </div>

      {/* Button Text */}
      <div className="flex items-center tracking-tight font-semibold text-neutral-800 dark:text-neutral-100 whitespace-nowrap">
        {isCompact ? (
          <>
            <span className="hidden sm:inline">
              {lang === 'th' ? 'เข้าสู่ระบบด้วย Google' : 'Sign in with Google'}
            </span>
            <span className="sm:hidden">
              {lang === 'th' ? 'เข้าสู่ระบบ' : 'Log in'}
            </span>
          </>
        ) : (
          <span>
            {lang === 'th' ? 'เข้าสู่ระบบด้วย Google' : 'Sign in with Google'}
          </span>
        )}
      </div>

      {/* Subtle indicator light dot */}
      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 opacity-60 group-hover:opacity-100 transition-opacity ml-0.5" />
    </button>
  );
};
