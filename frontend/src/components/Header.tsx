import React from 'react';
import { useAuth } from '../context/AuthContext';
import { slackApi } from '../services/api';
import { LogOut, Activity, Slack, CheckCircle, ExternalLink } from 'lucide-react';

export const Header: React.FC = () => {
  const { user, logout, refetchUser } = useAuth();

  const handleSlackConnect = () => {
    window.location.href = 'http://localhost:5000/api/slack/connect';
  };

  const handleSlackDisconnect = async () => {
    if (confirm('Disconnect Slack integration?')) {
      await slackApi.disconnect();
      await refetchUser();
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-blue-500/20">
            ✉️
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">Email Scheduler</h1>
            <p className="text-xs text-slate-400">Distributed Dispatch Engine</p>
          </div>
        </div>

        {/* User Actions & Profile */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Slack Connection */}
          {user?.slackConnected ? (
            <button
              onClick={handleSlackDisconnect}
              title="Click to disconnect Slack"
              className="hidden sm:inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-800/50 text-xs font-medium hover:bg-rose-950/40 hover:text-rose-400 hover:border-rose-800/50 transition-colors"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Slack: {user.slackTeamName || 'Connected'}</span>
            </button>
          ) : (
            <button
              onClick={handleSlackConnect}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-600/10 text-purple-400 border border-purple-500/20 text-xs font-medium hover:bg-purple-600/20 transition-colors"
            >
              <Slack className="w-3.5 h-3.5" />
              <span>Connect Slack</span>
            </button>
          )}

          {/* Bull Board Queues Quick Link */}
          <a
            href="http://localhost:5000/admin/queues"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-700 text-xs font-medium hover:text-white hover:bg-slate-700 transition-colors"
          >
            <Activity className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden md:inline">Bull Board</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>

          {/* User Profile Card */}
          {user && (
            <div className="flex items-center gap-3 pl-2 border-l border-slate-800">
              <img
                src={user.avatarUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                alt={user.name}
                className="w-9 h-9 rounded-full border border-slate-700 bg-slate-800"
              />
              <div className="hidden lg:block text-left">
                <p className="text-xs font-semibold text-slate-200">{user.name}</p>
                <p className="text-[10px] text-slate-400 truncate max-w-[140px]">{user.email}</p>
              </div>

              {/* Logout Button */}
              <button
                onClick={logout}
                title="Logout"
                className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
