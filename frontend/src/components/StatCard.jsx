import React from 'react';

const colorMap = {
  navy: 'bg-blue-50 text-blue-700 border border-blue-100',
  gold: 'bg-sky-50 text-sky-600 border border-sky-100',
  blue: 'bg-blue-600 text-white shadow-md shadow-blue-500/20',
  green: 'bg-emerald-50 text-emerald-700 border border-emerald-100',
  red: 'bg-rose-50 text-rose-700 border border-rose-100',
};

const StatCard = ({ title, value, icon: Icon, color = 'navy', subtitle }) => {
  const strVal = String(value ?? '');
  const len = strVal.length;

  // Adaptive typography:
  // Short values (<= 7 chars): keep original text-2xl sm:text-3xl font size.
  // Medium values (8-10 chars): clamp(1.3rem, 1.8vw, 1.75rem).
  // Long values (11-14 chars, e.g. ₹1,57,50,000): clamp(1.15rem, 1.45vw, 1.5rem) with tight line-height.
  // Extra-long values (15+ chars): clamp(1rem, 1.25vw, 1.3rem).
  const isShort = len <= 7;
  const isMedium = len > 7 && len <= 10;
  const isLong = len > 10 && len <= 14;
  const isExtraLong = len > 14;

  const dynamicStyle = {
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    lineHeight: isShort ? 1.25 : 1.2,
    ...(isMedium ? { fontSize: 'clamp(1.3rem, 1.8vw, 1.75rem)' } : {}),
    ...(isLong ? { fontSize: 'clamp(1.15rem, 1.45vw, 1.5rem)' } : {}),
    ...(isExtraLong ? { fontSize: 'clamp(1rem, 1.25vw, 1.3rem)' } : {}),
  };

  return (
    <div className="card flex items-center gap-3.5 sm:gap-4 p-4.5 sm:p-5 lg:p-6 hover:shadow-md transition-all min-w-0 max-w-full box-border">
      <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 ${colorMap[color] || colorMap.navy}`}>
        <Icon size={24} className="sm:w-[26px] sm:h-[26px]" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs sm:text-sm font-medium text-slate-500 leading-snug break-words">
          {title}
        </p>
        <p
          className={`font-extrabold text-slate-900 tracking-tight mt-0.5 break-words ${isShort ? 'text-2xl sm:text-3xl' : ''}`}
          style={dynamicStyle}
        >
          {value}
        </p>
        {subtitle && (
          <p className="text-[11px] sm:text-xs text-slate-400 mt-1 font-medium leading-tight break-words">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};

export default StatCard;
