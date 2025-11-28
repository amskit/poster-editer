import React, { useState, useEffect, createContext, useContext } from 'react';
import { HashRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Menu, Home as HomeIcon, Layout, Settings as SettingsIcon, Key, Info, X } from 'lucide-react';
import { Language, Theme } from './types';
import { TRANSLATIONS } from './constants';
import * as Storage from './services/storageService';

// Screens
import HomeScreen from './screens/HomeScreen';
import EditorScreen from './screens/EditorScreen';
import SettingsScreen from './screens/SettingsScreen';
import ApiSetupScreen from './screens/ApiSetupScreen';
import AboutScreen from './screens/AboutScreen';

// --- Contexts ---
interface AppContextType {
  language: Language;
  setLanguage: (l: Language) => void;
  theme: Theme;
  setTheme: (t: Theme) => void;
  t: (key: string) => string;
  isDrawerOpen: boolean;
  setIsDrawerOpen: (o: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error("useApp must be used within AppProvider");
  return context;
};

const AppContent: React.FC = () => {
  const { theme, isDrawerOpen, setIsDrawerOpen, t, language } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  // Close drawer on route change on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      setIsDrawerOpen(false);
    }
  }, [location, setIsDrawerOpen]);

  const navItems = [
    { icon: HomeIcon, label: t('home'), path: '/' },
    { icon: Layout, label: t('editor'), path: '/editor' },
    { icon: SettingsIcon, label: t('settings'), path: '/settings' },
    { icon: Key, label: t('apiSetup'), path: '/api-setup' },
    { icon: Info, label: t('about'), path: '/about' },
  ];

  const handleNavClick = (path: string) => {
      navigate(path);
      if (window.innerWidth < 1024) setIsDrawerOpen(false);
  };

  return (
    <div className={`flex h-screen w-screen overflow-hidden ${theme === Theme.DARK ? 'dark' : ''} ${language === Language.URDU ? 'font-nastaliq' : 'font-sans'}`} dir={language === Language.URDU ? 'rtl' : 'ltr'}>
      {/* Drawer Overlay */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Drawer */}
      <aside 
        className={`fixed lg:relative z-50 h-full w-64 bg-white dark:bg-slate-900 border-r border-gray-200 dark:border-slate-800 transform transition-transform duration-300 ease-in-out ${
          isDrawerOpen ? 'translate-x-0' : (language === Language.URDU ? 'translate-x-full lg:translate-x-0' : '-translate-x-full lg:translate-x-0')
        }`}
      >
        <div className="p-4 flex items-center justify-between border-b border-gray-100 dark:border-slate-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Muawiya Toolkit
          </h1>
          <button onClick={() => setIsDrawerOpen(false)} className="lg:hidden p-1 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          {navItems.map((item) => (
            <button
              key={item.path}
              onClick={() => handleNavClick(item.path)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                location.pathname === item.path 
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' 
                  : 'text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-slate-800'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 h-full overflow-hidden bg-gray-50 dark:bg-slate-950 flex flex-col relative">
        {/* Mobile Header */}
        <header className="h-14 lg:hidden bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 flex items-center px-4 justify-between shrink-0">
          <button onClick={() => setIsDrawerOpen(true)} className="p-2 -ml-2 rounded-md hover:bg-gray-100 dark:hover:bg-slate-800">
            <Menu size={24} className="text-gray-600 dark:text-gray-300" />
          </button>
          <span className="font-semibold text-gray-800 dark:text-white">{t('appTitle')}</span>
          <div className="w-8" /> {/* Spacer */}
        </header>

        <div className="flex-1 overflow-auto relative">
          <Routes>
            <Route path="/" element={<HomeScreen />} />
            <Route path="/editor" element={<EditorScreen />} />
            <Route path="/settings" element={<SettingsScreen />} />
            <Route path="/api-setup" element={<ApiSetupScreen />} />
            <Route path="/about" element={<AboutScreen />} />
          </Routes>
        </div>
      </main>
    </div>
  );
};

export default function App() {
  const [language, setLanguage] = useState<Language>(Language.ENGLISH);
  const [theme, setTheme] = useState<Theme>(Storage.getStoredTheme());
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    Storage.setStoredTheme(theme);
    
    const applyTheme = () => {
      const root = window.document.documentElement;
      const isDark = 
        theme === Theme.DARK || 
        (theme === Theme.SYSTEM && window.matchMedia('(prefers-color-scheme: dark)').matches);
        
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    };

    applyTheme();

    // Listen for system changes if in system mode
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (theme === Theme.SYSTEM) applyTheme();
    };
    
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);

  }, [theme]);

  const t = (key: string) => {
    return TRANSLATIONS[key]?.[language] || key;
  };

  return (
    <AppContext.Provider value={{ language, setLanguage, theme, setTheme, t, isDrawerOpen, setIsDrawerOpen }}>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AppContext.Provider>
  );
}