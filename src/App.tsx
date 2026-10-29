import React, { useState, useEffect } from 'react';
import { User, NotificationItem } from './types';
import { api, getStoredUser, setStoredUser } from './services/api';
import { AuthScreen } from './features/auth/AuthScreen';
import { Navigation } from './components/Navigation';
import { MoonlitAtmosphere } from './components/MoonlitAtmosphere';
import { getLandscapeForRoute } from './components/landscapeConfig';
import { BotGameView } from './features/game/BotGameView';
import { MultiplayerView } from './features/multiplayer/MultiplayerView';
import { CommunityView } from './features/social/CommunityView';
import { FriendsView } from './features/social/FriendsView';
import { MatchHistoryView } from './features/history/MatchHistoryView';
import { ProfileView } from './features/profile/ProfileView';
import { OopLabView } from './features/oop/OopLabView';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('bot-game');
  const [multiplayerSubState, setMultiplayerSubState] = useState<'create-join' | 'in-room'>('create-join');
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);

  // Load user session on mount
  useEffect(() => {
    const stored = getStoredUser();
    if (stored) {
      setUser(stored);
      // Refresh profile data
      api.getMe().then((res) => {
        if (res && res.user) {
          setUser(res.user);
          setStoredUser(res.user);
        }
      }).catch(console.error);
    }
    setLoadingInitial(false);
  }, []);

  // Poll notifications when logged in
  useEffect(() => {
    if (!user) return;

    const poll = async () => {
      try {
        const res = await api.getSocialOverview();
        if (res && res.notifications) {
          setNotifications(res.notifications);
        }
      } catch (e) {
        console.error(e);
      }
    };

    poll();
    const timer = setInterval(poll, 8000);
    return () => clearInterval(timer);
  }, [user]);

  const handleLogout = async () => {
    await api.logout();
    setStoredUser(null);
    setUser(null);
    setActiveTab('bot-game');
  };

  const handleReadNotification = async (id: string) => {
    try {
      await api.readNotification(id);
    } catch (e) {
      console.error(e);
      return;
    }
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const handleReadAllNotifications = async () => {
    try {
      await api.readAllNotifications();
    } catch (e) {
      console.error(e);
      return;
    }
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Active landscape config computed based on route and sub-state
  const currentLandscape = getLandscapeForRoute(
    activeTab,
    activeTab === 'multiplayer' ? multiplayerSubState : undefined
  );

  if (loadingInitial) {
    return (
      <div className="w-full h-screen bg-[#080D16] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-[#D99A4E] border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <AuthScreen onAuthenticated={(u) => setUser(u)} />;
  }

  return (
    <MoonlitAtmosphere customConfig={currentLandscape}>
      <div className="min-h-screen text-[#DCE8F5] flex flex-col selection:bg-[#D99A4E]/30 selection:text-[#DCE8F5]">
        
        {/* Navigation Header */}
        <Navigation
          user={user}
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          onLogout={handleLogout}
          notifications={notifications}
          unreadNotificationsCount={unreadCount}
          onReadNotification={handleReadNotification}
          onReadAllNotifications={handleReadAllNotifications}
          activeRegionName={currentLandscape.sceneName}
        />

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col">
          {activeTab === 'bot-game' && (
            <BotGameView user={user} />
          )}

          {activeTab === 'multiplayer' && (
            <MultiplayerView
              user={user}
              onSubStateChange={setMultiplayerSubState}
            />
          )}

          {activeTab === 'community' && (
            <CommunityView
              user={user}
              onInviteToMultiplayer={() => setActiveTab('multiplayer')}
            />
          )}

          {activeTab === 'friends' && (
            <FriendsView
              user={user}
              onInviteToRoom={() => setActiveTab('multiplayer')}
            />
          )}

          {activeTab === 'history' && (
            <MatchHistoryView user={user} />
          )}

          {activeTab === 'profile' && (
            <ProfileView user={user} onUserUpdated={setUser} />
          )}

          {activeTab === 'oop-lab' && (
            <OopLabView />
          )}
        </main>

        {/* Persistent Moonlit Footer */}
        <footer className="w-full border-t border-[#293748]/60 bg-[#080D16]/85 backdrop-blur-md py-3.5 px-6 text-center text-[11px] font-mono text-[#8795A7] flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <span className="font-serif font-bold text-[#DCE8F5]">AFTERLIGHT</span>
            <span>&bull;</span>
            <span className="text-[#91A3B5]">{currentLandscape.sceneName}</span>
            <span>&bull;</span>
            <span className="text-[#D99A4E]">Tactical Tic-Tac-Toe Arena</span>
          </div>
          <span className="text-[#8795A7]">
            Tactical Tic-Tac-Toe &bull; Real-Time Multiplayer
          </span>
        </footer>

      </div>
    </MoonlitAtmosphere>
  );
}
