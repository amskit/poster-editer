import React from 'react';
import { useApp } from '../App';
import { User, MapPin, Phone, Code } from 'lucide-react';

const AboutScreen: React.FC = () => {
  const { t } = useApp();

  return (
    <div className="p-6 max-w-2xl mx-auto">
       <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 h-32 flex items-center justify-center">
              <h1 className="text-3xl font-bold text-white tracking-wide">Muawiya Toolkit</h1>
          </div>
          
          <div className="p-8">
              <div className="flex flex-col items-center -mt-16 mb-8">
                  <div className="w-24 h-24 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center shadow-lg border-4 border-white dark:border-slate-800 text-blue-600">
                      <User size={40} />
                  </div>
                  <h2 className="text-xl font-bold mt-4">Ameer Muawiya</h2>
                  <p className="text-blue-500 font-medium">Android & Web Developer</p>
              </div>

              <div className="space-y-4 max-w-md mx-auto">
                  <InfoRow icon={MapPin} label="Location" value="Chiniot, Pakistan" />
                  <InfoRow icon={Phone} label="WhatsApp" value="+92 370 5266466" />
                  <InfoRow icon={Code} label="Tech Stack" value="React, TypeScript, Tailwind, Gemini AI" />
              </div>

              <div className="mt-8 text-center pt-8 border-t border-gray-100 dark:border-slate-800">
                  <p className="text-sm text-gray-500">© {new Date().getFullYear()} Muawiya Editing Toolkit. All rights reserved.</p>
              </div>
          </div>
       </div>
    </div>
  );
};

const InfoRow: React.FC<{icon: any, label: string, value: string}> = ({ icon: Icon, label, value }) => (
    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-slate-800 rounded-lg">
        <div className="text-gray-500 dark:text-gray-400">
            <Icon size={20} />
        </div>
        <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
            <p className="font-semibold text-gray-800 dark:text-white">{value}</p>
        </div>
    </div>
);

export default AboutScreen;