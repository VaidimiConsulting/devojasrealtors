import React from 'react';
import { Network } from 'lucide-react';
import CommissionLedgerTable from '../../components/CommissionLedgerTable';

const DownlineCommissions = () => {
  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
          <Network size={24} className="text-blue-600" />
          Downline Commission Management
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Differential overrides earned exclusively from your authorized downline team sales.
        </p>
      </div>

      <CommissionLedgerTable 
        title="Downline Team Sales & Differential Commission" 
        scope="downline" 
        showBeneficiary={false} 
      />
    </div>
  );
};

export default DownlineCommissions;
