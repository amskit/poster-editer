import React, { useState, useEffect } from 'react';
import { useApp } from '../App';
import * as Storage from '../services/storageService';
import { Key, ShieldCheck, AlertCircle, Trash2, Edit2, Eye, EyeOff } from 'lucide-react';

const ApiSetupScreen: React.FC = () => {
  const { t } = useApp();
  const [key, setKey] = useState('');
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    loadKey();
  }, []);

  const loadKey = () => {
    const stored = Storage.getApiKey();
    setSavedKey(stored);
    if (!stored) setIsEditing(true);
  };

  const handleSave = () => {
    if (!key.trim()) return;
    Storage.setApiKey(key.trim());
    setSavedKey(key.trim());
    setKey('');
    setIsEditing(false);
  };

  const handleDelete = () => {
      if(confirm('Are you sure you want to remove the API Key?')) {
          Storage.setApiKey('');
          setSavedKey(null);
          setIsEditing(true);
      }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">{t('apiSetup')}</h2>

      <div className="bg-white dark:bg-slate-900 rounded-xl p-8 shadow-sm border border-gray-100 dark:border-slate-800">
         <div className="flex items-start gap-4 mb-6">
             <div className="p-3 bg-blue-100 text-blue-600 rounded-full">
                 <Key size={24} />
             </div>
             <div>
                 <h3 className="font-bold text-lg mb-2">Google Gemini API</h3>
                 <p className="text-gray-600 dark:text-gray-400 leading-relaxed">{t('apiKeyInstructions')}</p>
                 <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline text-sm block mt-2">Get your API Key here</a>
             </div>
         </div>

         {!isEditing && savedKey ? (
             <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-6 text-center">
                 <div className="flex flex-col items-center gap-3">
                     <ShieldCheck size={40} className="text-green-600 dark:text-green-400" />
                     <h4 className="font-bold text-lg text-green-700 dark:text-green-300">{t('apiKeySaved')}</h4>
                     <p className="text-sm text-gray-500 mb-4">You are ready to use AI features.</p>
                     
                     <div className="flex gap-3">
                         <button 
                            onClick={() => { setKey(savedKey); setIsEditing(true); }}
                            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-800 border rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-slate-700"
                         >
                             <Edit2 size={16} /> {t('edit')}
                         </button>
                         <button 
                            onClick={handleDelete}
                            className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100"
                         >
                             <Trash2 size={16} /> {t('delete')}
                         </button>
                     </div>
                 </div>
             </div>
         ) : (
             <div className="space-y-4">
                 <div className="relative">
                    <input 
                        type={showKey ? "text" : "password"} 
                        value={key}
                        onChange={(e) => setKey(e.target.value)}
                        placeholder="AIzaSy..."
                        className="w-full p-4 pr-12 border rounded-lg bg-gray-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white font-mono"
                    />
                    <button 
                        onClick={() => setShowKey(!showKey)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                        {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                 </div>
                 
                 <div className="flex gap-2">
                     {savedKey && (
                         <button onClick={() => setIsEditing(false)} className="flex-1 py-4 text-gray-500 hover:bg-gray-100 rounded-lg">
                             Cancel
                         </button>
                     )}
                     <button 
                        onClick={handleSave}
                        className="flex-1 bg-blue-600 text-white py-4 rounded-lg font-bold hover:bg-blue-700 transition flex items-center justify-center gap-2"
                     >
                         <ShieldCheck size={18} />
                         {t('saveKey')}
                     </button>
                 </div>

                 <div className="flex items-center gap-2 text-xs text-amber-600 dark:text-amber-500 bg-amber-50 dark:bg-amber-900/20 p-3 rounded">
                    <AlertCircle size={16} />
                    <span>Your API key is stored locally in your browser. It is never sent to our servers.</span>
                 </div>
             </div>
         )}
      </div>
    </div>
  );
};

export default ApiSetupScreen;