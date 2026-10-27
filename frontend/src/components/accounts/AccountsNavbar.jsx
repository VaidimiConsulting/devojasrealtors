import React, { useState, useEffect, useRef } from 'react';
import { Menu, Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';

const AccountsNavbar = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();
  const [showProfile, setShowProfile] = useState(false);
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const profileRef = useRef();
  const notifRef = useRef();

  const fetchNotifications = async () => {
    try {
      const res = await api.get('/accounts/notifications');
      setNotifications(res.data.data);
      setUnreadCount(res.data.unreadCount);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) setShowProfile(false);
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 print:hidden">
      <div className="flex items-center gap-4">
        <button onClick={onToggleSidebar} className="p-2 hover:bg-gray-100 rounded-lg text-gray-600">
          <Menu size={20} />
        </button>
        <span className="text-sm text-gray-400 hidden sm:block">Accounts Panel</span>
      </div>

      <div className="flex items-center gap-3">
        <div className="relative" ref={notifRef}>
          <button onClick={() => setShowNotifs(!showNotifs)} className="relative p-2 hover:bg-gray-100 rounded-lg text-gray-600">
            <Bell size={20} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-bold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>
          {showNotifs && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 max-h-96 overflow-y-auto">
              <div className="p-3 border-b font-semibold text-sm">Notifications</div>
              {notifications.length === 0 ? (
                <p className="text-sm text-gray-400 p-4 text-center">No notifications yet</p>
              ) : (
                notifications.map((n) => (
                  <div key={n.id} className={`p-3 border-b hover:bg-gray-50 text-sm ${!n.is_read ? 'bg-blue-50/50' : ''}`}>
                    <p className="font-medium text-gray-800">{n.title}</p>
                    <p className="text-gray-500 text-xs mt-0.5">{n.message}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="relative" ref={profileRef}>
          <button onClick={() => setShowProfile(!showProfile)} className="flex items-center gap-2 pl-2 pr-1 py-1 hover:bg-gray-100 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-gold text-white flex items-center justify-center text-sm font-semibold overflow-hidden border border-slate-200">
              {user?.profile_image ? (
                <img src={user.profile_image} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.name?.charAt(0).toUpperCase() || 'F'
              )}
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">{user?.name}</span>
            <ChevronDown size={16} className="text-gray-400" />
          </button>
          {showProfile && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1">
              <div className="px-4 py-2 border-b">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-gray-400">{user?.email}</p>
              </div>
              <button onClick={logout} className="w-full text-left px-4 py-2 text-sm text-red-500 hover:bg-red-50">Logout</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default AccountsNavbar;
