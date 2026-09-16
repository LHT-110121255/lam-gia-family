import React, { useState, useEffect } from 'react';
import { Type, Eye } from 'lucide-react';

export const SeniorModeToggle: React.FC = () => {
  const [isSeniorMode, setIsSeniorMode] = useState(() => {
    return localStorage.getItem('senior_mode') === 'true';
  });

  useEffect(() => {
    if (isSeniorMode) {
      document.documentElement.classList.add('senior-mode');
      localStorage.setItem('senior_mode', 'true');
    } else {
      document.documentElement.classList.remove('senior-mode');
      localStorage.setItem('senior_mode', 'false');
    }
  }, [isSeniorMode]);

  return (
    <button
      onClick={() => setIsSeniorMode(!isSeniorMode)}
      className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition flex items-center gap-1 shadow-xs border ${
        isSeniorMode
          ? 'bg-orange-600 text-white border-orange-700 ring-2 ring-orange-300'
          : 'bg-stone-100 text-stone-700 hover:bg-stone-200 border-stone-300'
      }`}
      title="Bật/Tắt Chế độ chữ to cho người lớn tuổi"
    >
      <Type className="w-3.5 h-3.5" />
      <span>{isSeniorMode ? 'Chữ To: BẬT' : 'Chữ To'}</span>
    </button>
  );
};
