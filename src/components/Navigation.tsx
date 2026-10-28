import React, { useState } from 'react';
import { User, NotificationItem } from '../types';
import {
  Compass,
  Users,
  UserCheck,
  History,
  GraduationCap,
  Bell,
  LogOut,
  Radio,
  User as UserIcon,
  Check
} from 'lucide-react';

interface NavigationProps {
  user: User;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  onLogout: () => void;
  notifications: NotificationItem[];
  unreadNotificationsCount: number;
  onReadNotification: (id: string) => void;
  onReadAllNotifications: () => void;
  activeRegionName?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  user,
  activeTab,
  onSelectTab,
  onLogout,
  notifications,
  unreadNotificationsCount,
  onReadNotification,
  onReadAllNotifications,
  activeRegionName,
}) => {
  const [showNotifications, setShowNotifications] = useState(false);

  const navItems = [
    { id: 'bot-game', label: 'Play vs Bot', icon: Compass },
    { id: 'multiplayer', label: 'Multiplayer', icon: Radio },
    { id: 'oop-lab', label: 'OOP Lab & Viva', icon: GraduationCap },
    { id: 'community', label: 'Community', icon: Users },
    { id: 'friends', label: 'Friends', icon: UserCheck },
    { id: 'history', label: 'Match History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#080D16]/85 border-b border-[#293748]/70 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        
        {/* Zone 1: Brand Wordmark (Single Element in Editorial Serif) */}
        <div 
          onClick={() => onSelectTab('bot-game')}
          className="flex items-center space-x-3 cursor-pointer group select-none shrink-0"
        >
          <div className="w-8 h-8 rounded-lg bg-[#111B2A] border border-[#293748] flex items-center justify-center shadow-inner group-hover:border-[#D99A4E]/60 transition-colors">
            <svg viewBox="0 0 24 24" fill="none" className="w-4 h-4 text-[#D99A4E]">
              <path
                d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8A9.04 9.04 0 0 0 12 3z"
                fill="currentColor"
              />
            </svg>
          </div>
          <div className="flex flex-col">
            <span className="font-serif tracking-[0.18em] text-lg font-bold text-[#DCE8F5] group-hover:text-white transition-colors">
              AFTERLIGHT
            </span>
          </div>
        </div>

        {/* Zone 2: Navigation Links (Single-Line, Whitespace-Nowrap) */}
        <nav className="hidden lg:flex items-center space-x-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-sans font-medium tracking-wide transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-[#172231] text-[#DCE8F5] border border-[#293748] shadow-sm'
                    : 'text-[#8795A7] hover:text-[#DCE8F5] hover:bg-[#111B2A]/60'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#D99A4E]' : 'text-[#8795A7]'}`} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & Profile Cluster */}
        <div className="flex items-center space-x-3 shrink-0">
          
          {/* Active Wilderness Region Indicator */}
          {activeRegionName && (
            <div className="hidden xl:flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-[#111B2A]/70 border border-[#293748]/60 text-[11px] font-mono text-[#91B7CE]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D99A4E]" />
              <span className="text-[#8795A7]">Region:</span>
              <span className="text-[#DCE8F5]">{activeRegionName}</span>
            </div>
          )}

          {/* Notifications Popover */}
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 rounded-lg bg-[#111B2A]/80 border border-[#293748] text-[#8795A7] hover:text-[#DCE8F5] hover:bg-[#172231] transition-colors relative cursor-pointer"
              title="Chamber Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#D99A4E] text-[#080D16] text-[10px] font-mono font-bold rounded-full flex items-center justify-center">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Dropdown */}
            {showNotifications && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-[#0B101B] border border-[#293748] shadow-2xl p-4 z-50 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-3 border-b border-[#293748]">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-serif font-bold text-[#DCE8F5]">
                      Midnight Whispers
                    </span>
                    {unreadNotificationsCount > 0 && (
                      <span className="text-[10px] font-mono text-[#D99A4E]">
                        ({unreadNotificationsCount} unread)
                      </span>
                    )}
                  </div>
                  {unreadNotificationsCount > 0 && (
                    <button
                      onClick={onReadAllNotifications}
                      className="text-[10px] font-mono text-[#91B7CE] hover:text-[#DCE8F5] flex items-center space-x-1 cursor-pointer"
                    >
                      <Check className="w-3 h-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#293748]/50 my-2">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#8795A7] font-mono">
                      No notifications in the chamber.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => onReadNotification(n.id)}
                        className={`py-3 px-2 flex items-start justify-between cursor-pointer transition-colors rounded ${
                          !n.isRead ? 'bg-[#172231]/40 hover:bg-[#172231]/70' : 'hover:bg-[#111B2A]/40'
                        }`}
                      >
                        <div className="space-y-1 pr-2">
                          <p className="text-xs text-[#DCE8F5] leading-snug">
                            {n.message}
                          </p>
                          <p className="text-[10px] font-mono text-[#8795A7]">
                            {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        {!n.isRead && (
                          <span className="w-1.5 h-1.5 rounded-full bg-[#D99A4E] shrink-0 mt-1.5" />
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Pill */}
          <button
            onClick={() => onSelectTab('profile')}
            className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg border transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'bg-[#172231] border-[#D99A4E]/60 text-[#DCE8F5]'
                : 'bg-[#111B2A]/70 border-[#293748] text-[#8795A7] hover:text-[#DCE8F5]'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-[#172231] border border-[#293748] flex items-center justify-center text-[10px] font-mono text-[#D99A4E]">
              {user.avatar ? (
                <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full object-cover" />
              ) : (
                <UserIcon className="w-3 h-3 text-[#D99A4E]" />
              )}
            </div>
            <span className="text-xs font-mono font-medium text-[#DCE8F5] max-w-[100px] truncate">
              {user.displayName || user.username}
            </span>
            <span className="text-[10px] font-mono text-[#91B7CE] tabular-nums hidden sm:inline">
              {user.rating ?? 1200}
            </span>
          </button>

          {/* Logout Action */}
          <button
            onClick={onLogout}
            className="p-2 rounded-lg bg-[#111B2A]/80 border border-[#293748] text-[#8795A7] hover:text-[#F16D78] hover:bg-[#203445] transition-colors cursor-pointer"
            title="Leave Wilderness (Sign Out)"
          >
            <LogOut className="w-4 h-4" />
          </button>

        </div>

      </div>

      {/* Mobile Secondary Navigation Strip */}
      <div className="lg:hidden flex items-center justify-around px-2 py-2 bg-[#0B101B] border-t border-[#293748] overflow-x-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`flex flex-col items-center justify-center px-3 py-1.5 rounded text-[11px] font-sans transition-colors whitespace-nowrap min-w-[56px] min-h-[44px] cursor-pointer ${
                isActive
                  ? 'text-[#D99A4E] font-semibold'
                  : 'text-[#8795A7] hover:text-[#DCE8F5]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5" />
              <span>{item.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
