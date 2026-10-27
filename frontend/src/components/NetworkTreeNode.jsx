import React, { useState, useEffect } from 'react';
import { ChevronDown, ChevronRight, Hash, Printer, Eye, UserCheck, Shield } from 'lucide-react';
import './NetworkTreeNode.css';

/**
 * NetworkTreeNode — renders a single associate node in the tree.
 * Renders in a horizontal org-chart layout with circular avatar,
 * name, login ID, and responsive connector lines.
 * Supports search highlighting, expanding/collapsing, and details view.
 */
const NetworkTreeNode = ({
  node,
  depth = 0,
  serial = { current: 1 },
  onPrint,
  onViewDetails,
  onEditSponsor,
  searchTerm = '',
  forceExpandAll = null
}) => {
  const [expanded, setExpanded] = useState(depth < 2);

  // Only Admin and Associates are allowed in the network hierarchy (Clients strictly excluded)
  const isAssociateOrAdmin = (u) => {
    if (!u) return false;
    const r = String(u.role || '').toLowerCase();
    return r === 'associate' || r === 'admin';
  };

  const validChildren = (node?.children || []).filter(isAssociateOrAdmin);
  const hasChildren = validChildren.length > 0;
  const countAll = (list) => (list || []).reduce((t, c) => {
    const subs = (c?.children || []).filter(isAssociateOrAdmin);
    return t + 1 + countAll(subs);
  }, 0);
  const directCount = validChildren.length;
  const totalCount = countAll(validChildren);
  const mySerial = serial.current++;

  // Auto-expand if search matches this node or its children
  const isMatch = searchTerm && (
    (node?.name && node.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (node?.login_id && node.login_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (node?.phone && node.phone.includes(searchTerm))
  );

  useEffect(() => {
    if (forceExpandAll !== null) {
      setExpanded(forceExpandAll);
    } else if (isMatch) {
      setExpanded(true);
    }
  }, [forceExpandAll, isMatch]);

  // Distinct avatar gradients for tree levels
  const avatarColors = [
    'from-amber-400 to-amber-600 text-slate-900', // Root level
    'from-blue-500 to-indigo-600 text-white',
    'from-cyan-500 to-blue-600 text-white',
    'from-indigo-500 to-purple-600 text-white',
    'from-teal-500 to-cyan-600 text-white',
    'from-emerald-500 to-teal-600 text-white',
  ];
  const avatarColor = avatarColors[depth % avatarColors.length];

  return (
    <div className="org-tree-wrapper">
      {/* Node Card */}
      <div 
        className={`group relative bg-[#131f3e] border ${
          isMatch
            ? 'border-gold ring-4 ring-gold/40 shadow-gold/30'
            : 'border-[#1e2f5a] hover:border-gold/60'
        } rounded-2xl p-3 shadow-lg flex flex-col items-center gap-2 cursor-pointer transition-all duration-300 hover:-translate-y-1 w-52 z-10 select-none`}
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        {/* Avatar Circle */}
        <div className={`w-14 h-14 rounded-full bg-gradient-to-b ${avatarColor} flex items-center justify-center text-xl font-bold border-4 border-[#0a1628] shadow-md -mt-8`}>
           {node?.name?.charAt(0)?.toUpperCase() || '?'}
        </div>

        <div className="text-center w-full">
          <p className="text-sm font-bold text-white truncate px-1" title={node?.name}>
            {node?.name || 'Associate'}
          </p>

          {node?.login_id && (
            <div className="flex items-center justify-center gap-1.5 mt-0.5">
              <span className="text-[11px] font-mono text-gold font-bold bg-gold/10 px-2 py-0.5 rounded border border-gold/20 flex items-center gap-1">
                <Hash size={10} /> {node.login_id}
              </span>
            </div>
          )}

          <p className="text-[10px] text-slate-400 mt-1">
            {node?.phone ? `📞 ${node.phone}` : (node?.createdAt ? `Join: ${new Date(node.createdAt).toLocaleDateString('en-IN')}` : '')}
          </p>

          <div className="mt-2 text-[10px] text-slate-400 bg-[#0a1628] rounded-md py-1 px-2 border border-[#1e2f5a] flex items-center justify-between">
            <span className="text-slate-500 font-mono">#{mySerial}</span>
            <span className="text-gold font-semibold uppercase text-[9px] tracking-wide">
              {node?.role === 'admin' ? 'Company Head' : `${node?.commission_percent || node?.referral_commission_percent || 5}% Comm`}
            </span>
          </div>

          <div className="mt-1.5 text-[10px] text-slate-300 flex items-center justify-between px-1" title="Direct associates / total downline">
            <span>Direct: <b className="text-white">{directCount}</b></span>
            <span>Total: <b className="text-white">{totalCount}</b></span>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-center gap-1.5 mt-2 pt-2 border-t border-[#1e2f5a]/60">
            {onViewDetails && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); onViewDetails(node); }}
                className="p-1 rounded-lg bg-blue-900/40 hover:bg-blue-800 text-blue-300 hover:text-white transition text-[10px] flex items-center gap-1 px-2"
                title="View Associate Details"
              >
                <Eye size={11} /> Details
              </button>
            )}

            {onPrint && (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onPrint(node); }}
                className="p-1 rounded-lg bg-emerald-900/40 hover:bg-emerald-800 text-emerald-300 hover:text-white transition text-[10px] flex items-center gap-1 px-2"
                title="Print Downline Report"
              >
                <Printer size={11} /> Print
              </button>
            )}

            {onEditSponsor && node?.id !== 1 && (
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onEditSponsor(node); }}
                className="p-1 rounded-lg bg-amber-900/40 hover:bg-amber-800 text-amber-300 hover:text-white transition text-[10px] flex items-center gap-1 px-2"
                title="Change Sponsor / Placement"
              >
                <UserCheck size={11} /> Sponsor
              </button>
            )}
          </div>
        </div>

        {hasChildren && (
          <div className="absolute -bottom-3 bg-[#0d1d47] border border-[#1e2f5a] rounded-full p-1 shadow-md text-gold hover:text-gold-light transition-colors z-20">
            {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </div>
        )}
      </div>

      {/* Children Tree */}
      {hasChildren && expanded && (
        <div className="org-tree-children">
          {validChildren.map((child) => (
            <div key={child.id} className="org-tree-node-col">
              <NetworkTreeNode
                node={child}
                depth={depth + 1}
                serial={serial}
                onPrint={onPrint}
                onViewDetails={onViewDetails}
                onEditSponsor={onEditSponsor}
                searchTerm={searchTerm}
                forceExpandAll={forceExpandAll}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default NetworkTreeNode;
