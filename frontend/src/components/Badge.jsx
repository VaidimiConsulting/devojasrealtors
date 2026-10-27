import React from 'react';

const styles = {
  active: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  approved: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  available: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  completed: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  credited: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  paid: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  verified: 'bg-emerald-100 text-emerald-700 border border-emerald-200',

  pending: 'bg-amber-100 text-amber-700 border border-amber-200',
  partial: 'bg-amber-100 text-amber-700 border border-amber-200',
  under_negotiation: 'bg-amber-100 text-amber-700 border border-amber-200',
  not_submitted: 'bg-gray-100 text-gray-600 border border-gray-200',

  unpaid: 'bg-red-100 text-red-700 border border-red-200',
  blocked: 'bg-red-100 text-red-700 border border-red-200',
  rejected: 'bg-red-100 text-red-700 border border-red-200',
  cancelled: 'bg-red-100 text-red-700 border border-red-200',
  overdue: 'bg-red-100 text-red-700 border border-red-200',

  confirmed: 'bg-blue-100 text-blue-700 border border-blue-200',
  booked: 'bg-blue-100 text-blue-700 border border-blue-200',
  sold: 'bg-blue-100 text-blue-700 border border-blue-200',
};

const variantStyles = {
  success: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
  warning: 'bg-amber-100 text-amber-700 border border-amber-200',
  danger: 'bg-red-100 text-red-700 border border-red-200',
  info: 'bg-blue-100 text-blue-700 border border-blue-200',
  neutral: 'bg-gray-100 text-gray-600 border border-gray-200',
};

const Badge = ({ status, children, variant, className = '' }) => {
  const textValue = (status !== undefined && status !== null)
    ? String(status)
    : (typeof children === 'string' ? children : '');

  const key = textValue.toLowerCase().trim();
  const cls = (variant && variantStyles[variant]) || styles[key] || 'bg-gray-100 text-gray-600 border border-gray-200';
  const displayText = children || (textValue ? textValue.replace(/_/g, ' ') : '—');

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${cls} ${className}`}>
      {displayText}
    </span>
  );
};

export default Badge;
