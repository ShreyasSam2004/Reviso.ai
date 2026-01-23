import { NavLink } from 'react-router-dom';
import { BookOpen, Layers, ClipboardList, Calendar, BarChart3, GraduationCap, Library, PenTool, Star, Sparkles } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const navItems = [
  { path: '/', icon: BookOpen, label: 'Summaries', color: 'from-blue-500 to-cyan-500' },
  { path: '/flashcards', icon: Layers, label: 'Flashcards', color: 'from-purple-500 to-pink-500' },
  { path: '/tests', icon: ClipboardList, label: 'Mock Tests', color: 'from-orange-500 to-red-500' },
  { path: '/practice', icon: PenTool, label: 'Practice', color: 'from-indigo-500 to-purple-500' },
  { path: '/glossary', icon: Library, label: 'Key Terms', color: 'from-emerald-500 to-teal-500' },
  { path: '/favorites', icon: Star, label: 'Favorites', color: 'from-yellow-500 to-orange-500' },
  { path: '/schedule', icon: Calendar, label: 'Schedule', color: 'from-pink-500 to-rose-500' },
  { path: '/reports', icon: BarChart3, label: 'Reports', color: 'from-cyan-500 to-blue-500' },
];

export function Sidebar() {
  const { user } = useAuth();

  // Get user initials from username
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="w-72 bg-gradient-sidebar text-white min-h-screen flex flex-col relative overflow-hidden">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-purple-500/10 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-24 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>

      {/* Logo Section */}
      <div className="relative p-6 border-b border-white/10">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl blur-lg opacity-50" />
            <div className="relative p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
              <GraduationCap className="w-7 h-7 text-white" />
            </div>
          </div>
          <div>
            <h1 className="font-bold text-xl tracking-tight">Reviso</h1>
            <p className="text-xs text-indigo-200/70 font-medium">Smart Exam Preparation</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="relative flex-1 p-4 overflow-y-auto">
        <p className="px-4 mb-3 text-xs font-semibold text-indigo-300/60 uppercase tracking-wider">
          Main Menu
        </p>
        <ul className="space-y-1.5">
          {navItems.map(({ path, icon: Icon, label, color }) => (
            <li key={path}>
              <NavLink
                to={path}
                className={({ isActive }) =>
                  `group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                    isActive
                      ? 'bg-white/15 shadow-lg backdrop-blur-sm'
                      : 'hover:bg-white/10'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div
                      className={`p-2 rounded-lg transition-all duration-200 ${
                        isActive
                          ? `bg-gradient-to-br ${color} shadow-lg`
                          : 'bg-white/10 group-hover:bg-white/20'
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-indigo-200'}`} />
                    </div>
                    <span className={`font-medium transition-colors ${isActive ? 'text-white' : 'text-indigo-100/80 group-hover:text-white'}`}>
                      {label}
                    </span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      {/* Bottom Section */}
      <div className="relative p-4 space-y-4">
        {/* Pro tip card */}
        <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600/40 to-purple-600/40 backdrop-blur-sm border border-white/10 p-4">
          <div className="absolute -right-6 -top-6 w-16 h-16 bg-white/5 rounded-full" />
          <div className="absolute -right-3 -bottom-3 w-12 h-12 bg-white/5 rounded-full" />
          <div className="relative">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <p className="text-xs font-semibold text-indigo-200 uppercase tracking-wide">Study Tip</p>
            </div>
            <p className="text-sm text-white/90 leading-relaxed">
              Regular spaced repetition can improve retention by up to 200%
            </p>
          </div>
        </div>

        {/* User section */}
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center text-white font-semibold text-sm shadow-lg">
            {user ? getInitials(user.username) : 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">{user?.username || 'Student'}</p>
            <p className="text-xs text-indigo-300/60">Free Plan</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
