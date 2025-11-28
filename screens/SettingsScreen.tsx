import React from 'react';
import { useApp } from '../App';
import { Language, Theme } from '../types';
import { Moon, Sun, Monitor, Globe } from 'lucide-react';

const SettingsScreen: React.FC = () => {
  const { t, theme, setTheme, language, setLanguage } = useApp();

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <h2 className="text-2xl font-bold mb-6">{t('settings')}</h2>

      {/* Language Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Globe size={20} />
            {t('language')}
        </h3>
        <div className="grid grid-cols-2 gap-4">
            <button 
                onClick={() => setLanguage(Language.ENGLISH)}
                className={`p-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${language === Language.ENGLISH ? 'bg-blue-50 border-blue-500 text-blue-600' : 'hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700'}`}
            >
                <span className="font-bold">English</span>
            </button>
            <button 
                onClick={() => setLanguage(Language.URDU)}
                className={`p-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${language === Language.URDU ? 'bg-blue-50 border-blue-500 text-blue-600' : 'hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700'}`}
            >
                <span className="font-bold font-nastaliq text-lg">اردو</span>
            </button>
        </div>
      </div>

      {/* Theme Section */}
      <div className="bg-white dark:bg-slate-900 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-slate-800">
        <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Sun size={20} />
            {t('theme')}
        </h3>
        <div className="grid grid-cols-3 gap-4">
            {[
                { val: Theme.LIGHT, icon: Sun, label: t('light') },
                { val: Theme.DARK, icon: Moon, label: t('dark') },
                { val: Theme.SYSTEM, icon: Monitor, label: t('system') }
            ].map(opt => (
                <button 
                    key={opt.val}
                    onClick={() => setTheme(opt.val)}
                    className={`p-4 rounded-lg border flex flex-col items-center justify-center gap-2 transition-all ${theme === opt.val ? 'bg-blue-50 border-blue-500 text-blue-600' : 'hover:bg-gray-50 dark:hover:bg-slate-800 dark:border-slate-700'}`}
                >
                    <opt.icon size={24} />
                    <span className="text-sm font-medium">{opt.label}</span>
                </button>
            ))}
        </div>
      </div>
    </div>
  );
};

export default SettingsScreen;