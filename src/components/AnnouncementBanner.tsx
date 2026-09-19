import React, { useState } from 'react';
import { Info, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { SystemAnnouncement } from '../types';

interface AnnouncementBannerProps {
  announcement: SystemAnnouncement | null;
}

export const AnnouncementBanner: React.FC<AnnouncementBannerProps> = ({ announcement }) => {
  const [dismissed, setDismissed] = useState(false);

  if (!announcement || !announcement.isActive || dismissed || !announcement.message) {
    return null;
  }

  const typeConfig = {
    info: {
      bg: 'bg-sky-50 dark:bg-sky-950/40 border-sky-200 dark:border-sky-800/60',
      text: 'text-sky-900 dark:text-sky-200',
      icon: <Info size={16} className="text-sky-600 dark:text-sky-400 flex-shrink-0 mt-0.5" />,
    },
    warning: {
      bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
      text: 'text-amber-900 dark:text-amber-200',
      icon: <AlertTriangle size={16} className="text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />,
    },
    success: {
      bg: 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
      text: 'text-emerald-900 dark:text-emerald-200',
      icon: <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />,
    },
  }[announcement.type || 'info'];

  return (
    <div
      id="system-announcement-banner"
      className={`mb-6 p-4 rounded-xl border ${typeConfig.bg} ${typeConfig.text} shadow-sm transition-all animate-in fade-in slide-in-from-top-2`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          {typeConfig.icon}
          <div>
            {announcement.title && (
              <h4 className="text-xs font-bold uppercase tracking-wider mb-0.5">
                {announcement.title}
              </h4>
            )}
            <p className="text-xs sm:text-sm font-medium leading-relaxed">
              {announcement.message}
            </p>
          </div>
        </div>
        <button
          id="dismiss-announcement-btn"
          onClick={() => setDismissed(true)}
          className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-current transition-colors"
          title="Dismiss / ปิดประกาศ"
        >
          <X size={15} />
        </button>
      </div>
    </div>
  );
};
