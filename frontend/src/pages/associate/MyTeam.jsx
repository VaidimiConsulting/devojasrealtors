import React, { useEffect, useState } from 'react';
import { Users } from 'lucide-react';
import api from '../../api/axios';
import Badge from '../../components/Badge';
import { useAuth } from '../../context/AuthContext';

const MyTeam = () => {
  const { user } = useAuth();
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/associate/my-team')
      .then((res) => setTeam(res.data.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">My Team / Network</h1>
        <p className="text-gray-500 text-sm">People you've directly referred to the platform</p>
      </div>

      <div className="card overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Associate ID</th>
              <th className="text-left px-4 py-3">Name</th>
              <th className="text-left px-4 py-3">Role</th>
              <th className="text-left px-4 py-3">Referred By ID</th>
              <th className="text-left px-4 py-3">Contact</th>
              <th className="text-left px-4 py-3">Status</th>
              <th className="text-left px-4 py-3">Joined</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="text-center py-10 text-gray-400">Loading...</td></tr>
            ) : team.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-14 text-gray-400">
                  <Users size={32} className="mx-auto mb-2 text-gray-300" />
                  Koi bhi team member nahi hai abhi. Apna referral code share karke naye members jodo!
                </td>
              </tr>
            ) : (
              team.map((t) => (
                <tr key={t.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono font-bold text-navy">{t.login_id || '—'}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{t.name}</td>
                  <td className="px-4 py-3 capitalize text-gray-500">{t.role}</td>
                  <td className="px-4 py-3 font-mono font-semibold text-slate-700">{t.referrer?.login_id || user?.login_id || '—'}</td>
                  <td className="px-4 py-3 text-gray-500">{t.phone}</td>
                  <td className="px-4 py-3"><Badge status={t.status} /></td>
                  <td className="px-4 py-3 text-gray-400">{new Date(t.createdAt).toLocaleDateString('en-IN')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MyTeam;
