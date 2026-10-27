import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import Badge from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';

const MyTransactions = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const type = searchParams.get('type') || 'all';

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const params = {};
      if (type !== 'all') params.type = type;
      const res = await api.get('/client/my-transactions', { params });
      setTransactions(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchTransactions(); }, [type]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Transactions</h1>
        <p className="text-gray-500 text-sm">Your purchase & sale history</p>
      </div>

      <div className="flex gap-2">
        {[
          { label: 'All', value: 'all' },
          { label: 'My Purchases', value: 'purchases' },
          { label: 'My Sales', value: 'sales' }
        ].map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSearchParams(tab.value === 'all' ? {} : { type: tab.value })}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              type === tab.value ? 'bg-navy text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Plot</th>
              <th className="text-left px-4 py-3">Type</th>
              <th className="text-left px-4 py-3">Amount</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : transactions.length === 0 ? (
              <tr><td colSpan="5" className="text-center py-10 text-gray-400">No transactions found</td></tr>
            ) : (
              transactions.map((tx) => (
                <tr key={tx.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{tx.plot?.title}</div>
                    <div className="text-xs font-mono text-blue-600 font-semibold">{tx.transaction_ref || `#${tx.id}`}</div>
                  </td>
                  <td className="px-4 py-3 text-gray-500">
                    {tx.buyer_id === user?.id ? 'Purchase' : 'Sale'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-navy">₹{Number(tx.amount).toLocaleString('en-IN')}</td>
                  <td className="px-4 py-3 text-gray-500">{new Date(tx.deal_date || tx.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="px-4 py-3"><Badge status={tx.status} /></td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyTransactions;
