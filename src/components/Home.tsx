import React from 'react';
import { motion } from 'motion/react';
import { AppScreen } from '../types';
import { AccessibleButton } from './AccessibleButton';
import { Camera, Sparkles, Shirt, MapPin, Settings, User, ChevronRight, Link } from 'lucide-react';
import { speechService } from '../lib/speech';

interface HomeProps {
  onNavigate: (screen: AppScreen) => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const menuItems = [
    { id: AppScreen.ANALYSIS, label: '감각 번역', hint: '의상 분석 및 감각 피드백', icon: <Camera className="w-8 h-8" />, color: 'bg-synk-blue' },
    { id: AppScreen.BEAUTY, label: '뷰티 분석', hint: '얼굴 대칭 및 메이크업 솔루션', icon: <Sparkles className="w-8 h-8" />, color: 'bg-synk-cyan' },
    { id: AppScreen.CLOSET, label: '내 옷장', hint: '저장된 의류 코디네이터', icon: <Shirt className="w-8 h-8" />, color: 'bg-synk-navy' },
    { id: AppScreen.STORE, label: '매장 모드', hint: '스캔 및 실시간 제품 안내', icon: <MapPin className="w-8 h-8" />, color: 'bg-synk-grey' },
  ];

  React.useEffect(() => {
    speechService.speak('메인 화면입니다. 분석을 시작하거나 옷장을 확인하려면 버튼을 선택하세요.');
  }, []);

  return (
    <div className="h-full flex flex-col overflow-hidden bg-synk-offwhite select-none">
      <div className="flex-1 flex flex-col justify-between px-5 pb-24 pt-3 overflow-hidden">
        {/* Header - Squeezed for optimal viewport fit */}
        <header className="py-2.5 flex justify-between items-center text-synk-navy">
          <div className="flex flex-col">
            <h1 className="text-3xl font-display font-black tracking-tight leading-none">SYNK.</h1>
            <span className="text-xs opacity-60 font-medium">부드러운 감각의 연결</span>
          </div>
          <button 
            onClick={() => onNavigate(AppScreen.SETTINGS)}
            className="p-3 rounded-xl bg-white shadow-sm hover:shadow-md active:scale-95 transition-all border border-synk-navy/5"
            aria-label="설정"
            onFocus={() => speechService.speak('설정 단추입니다')}
          >
            <Settings className="w-5 h-5 text-synk-navy" />
          </button>
        </header>

        {/* Compressed Status Card */}
        <div className="bg-synk-blue rounded-3xl p-5 text-white relative overflow-hidden shadow-xl shadow-synk-blue/15 my-2">
          <div className="relative z-10">
            <h2 className="text-xs font-bold opacity-80 mb-0.5">반가워요!</h2>
            <p className="text-xl md:text-2xl font-black mb-3 leading-tight">오늘 당신만의<br/>스타일을 찾아보세요.</p>
            
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-xl px-3 py-1 inline-flex">
              <div className="w-2 h-2 bg-white rounded-full shadow-[0_0_8px_white]" />
              <span className="text-[10px] font-black uppercase tracking-wider">SYNK AI READY</span>
            </div>
          </div>
          
          <div className="absolute right-[-10px] bottom-[-10px] w-28 h-28 opacity-10 transform rotate-12">
            <Sparkles className="w-full h-full" />
          </div>
        </div>

        {/* Major Functions Section - Compact Grid Layout */}
        <div className="flex-1 flex flex-col justify-center min-h-[220px]">
          <h3 className="text-lg font-black text-synk-navy mb-2 px-1">주요 기능</h3>
          <div className="grid grid-cols-2 gap-3.5">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  speechService.speak(`${item.label}. ${item.hint}`);
                  onNavigate(item.id);
                }}
                className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white shadow-sm border-2 border-transparent hover:border-synk-blue/20 active:scale-95 transition-all group h-[105px]"
              >
                <div className={`mb-1.5 p-2 rounded-xl ${item.color} text-white shadow-sm group-hover:scale-105 transition-transform`}>
                  {item.icon}
                </div>
                <span className="text-base font-black text-synk-navy text-center leading-none">{item.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
