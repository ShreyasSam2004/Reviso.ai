import { useState, useRef, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sun, Moon, Search, Bell, Command, LogOut, User, ChevronDown, X, FileText, Brain, Sparkles, BookOpen, Clock, Shield, Mail, Calendar } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';

const pageInfo: Record<string, { title: string; subtitle: string }> = {
  '/': { title: 'Document Summaries', subtitle: 'AI-powered document analysis' },
  '/flashcards': { title: 'Flashcards', subtitle: 'Interactive study cards' },
  '/tests': { title: 'Mock Tests', subtitle: 'Practice with AI-generated quizzes' },
  '/practice': { title: 'Practice', subtitle: 'Fill-in-the-blank & matching exercises' },
  '/glossary': { title: 'Key Terms', subtitle: 'Important terminology glossary' },
  '/favorites': { title: 'Favorites', subtitle: 'Your saved items' },
  '/schedule': { title: 'Schedule', subtitle: 'Plan your study sessions' },
  '/reports': { title: 'Reports', subtitle: 'Track your progress' },
};

export function DashboardLayout() {
  const { isDark, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const location = useLocation();
  const currentPage = pageInfo[location.pathname] || { title: 'Reviso', subtitle: '' };

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Tips/notifications content
  const notifications = [
    { icon: <Sparkles className="w-4 h-4 text-purple-500" />, title: 'Generate Flashcards', description: 'Upload a PDF and create AI-powered flashcards instantly', time: 'Tip' },
    { icon: <Brain className="w-4 h-4 text-green-500" />, title: 'Mock Tests Available', description: 'Test your knowledge with AI-generated MCQ and True/False questions', time: 'Tip' },
    { icon: <BookOpen className="w-4 h-4 text-blue-500" />, title: 'Practice Mode', description: 'Try fill-in-the-blank and matching exercises', time: 'Tip' },
    { icon: <Calendar className="w-4 h-4 text-orange-500" />, title: 'Schedule Study Sessions', description: 'Plan recurring tests to stay on track', time: 'Tip' },
  ];

  const handleLogout = () => {
    setShowUserMenu(false);
    logout();
  };

  // Get user initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Enhanced Top Bar */}
        <header className="h-16 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md border-b border-gray-200/50 dark:border-gray-700/50 flex items-center justify-between px-6 sticky top-0 z-10">
          {/* Left side - Page info */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                {currentPage.title}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {currentPage.subtitle}
              </p>
            </div>
          </div>

          {/* Right side - Actions */}
          <div className="flex items-center gap-3">
            {/* Search bar */}
            <div className="relative hidden md:block">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="w-4 h-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search..."
                className="w-64 pl-10 pr-12 py-2 bg-gray-100 dark:bg-gray-700/50 border border-transparent hover:border-gray-200 dark:hover:border-gray-600 focus:border-indigo-500 dark:focus:border-indigo-400 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all"
              />
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-xs text-gray-400 bg-gray-200 dark:bg-gray-600 rounded-md font-mono">
                  <Command className="w-3 h-3" />K
                </kbd>
              </div>
            </div>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
                className="relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white dark:ring-gray-800" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Notifications</h3>
                    <button onClick={() => setShowNotifications(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notif, i) => (
                      <div key={i} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors border-b border-gray-100 dark:border-gray-700/50 last:border-0">
                        <div className="flex gap-3">
                          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center">
                            {notif.icon}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white">{notif.title}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.description}</p>
                          </div>
                          <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{notif.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <p className="text-xs text-center text-gray-400 dark:text-gray-500">You're all caught up</p>
                  </div>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              onClick={toggleTheme}
              className="relative p-2.5 rounded-xl bg-gray-100 dark:bg-gray-700/50 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all duration-300 overflow-hidden group"
              title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              <div className="relative w-5 h-5">
                <Sun
                  className={`w-5 h-5 absolute inset-0 transform transition-all duration-300 ${
                    isDark
                      ? 'rotate-0 scale-100 opacity-100'
                      : 'rotate-90 scale-0 opacity-0'
                  }`}
                />
                <Moon
                  className={`w-5 h-5 absolute inset-0 transform transition-all duration-300 ${
                    isDark
                      ? '-rotate-90 scale-0 opacity-0'
                      : 'rotate-0 scale-100 opacity-100'
                  }`}
                />
              </div>
            </button>

            {/* User menu */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-3 pl-3 border-l border-gray-200 dark:border-gray-700 hover:opacity-80 transition-opacity"
              >
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold text-sm shadow-lg shadow-indigo-500/25">
                  {user ? getInitials(user.username) : 'U'}
                </div>
                <div className="hidden md:block text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {user?.username || 'User'}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[120px]">
                    {user?.email || ''}
                  </p>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  {/* User info */}
                  <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user?.username}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {user?.email}
                    </p>
                  </div>

                  {/* Menu items */}
                  <div className="py-2">
                    <button
                      onClick={() => { setShowProfileModal(true); setShowUserMenu(false); }}
                      className="w-full px-4 py-2 flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <User className="w-4 h-4" />
                      Profile Settings
                    </button>
                  </div>

                  {/* Logout */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 flex items-center gap-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="page-transition">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Profile Settings Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowProfileModal(false)} />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4 overflow-hidden">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Profile Settings</h2>
              <button onClick={() => setShowProfileModal(false)} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Profile Content */}
            <div className="p-6 space-y-6">
              {/* Avatar and Name */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-indigo-500/25">
                  {user ? getInitials(user.username) : 'U'}
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{user?.username || 'User'}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{user?.email || ''}</p>
                </div>
              </div>

              {/* Account Info */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Account Information</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <User className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Username</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.username}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Shield className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Account Status</p>
                      <p className="text-sm font-medium text-green-600 dark:text-green-400">Active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <Clock className="w-4 h-4 text-gray-400" />
                    <div className="flex-1">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Member Since</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {user?.created_at ? new Date(user.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Preferences */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Preferences</h4>
                <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                  <div className="flex items-center gap-3">
                    {isDark ? <Moon className="w-4 h-4 text-gray-400" /> : <Sun className="w-4 h-4 text-gray-400" />}
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">Dark Mode</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{isDark ? 'Enabled' : 'Disabled'}</p>
                    </div>
                  </div>
                  <button
                    onClick={toggleTheme}
                    className={`relative w-11 h-6 rounded-full transition-colors ${isDark ? 'bg-indigo-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isDark ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
              <button
                onClick={() => setShowProfileModal(false)}
                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
