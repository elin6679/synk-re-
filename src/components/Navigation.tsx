import React, { useState } from 'react';
import { Home as HomeIcon, Sparkles, Shirt, User, Camera, ShoppingBag } from 'lucide-react';
import { AppScreen } from '../types';
import { hapticService } from '../lib/haptics';
import { motion, AnimatePresence } from 'motion/react';

interface NavigationProps {
  currentScreen: AppScreen;
  onNavigate: (screen: AppScreen) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ currentScreen, onNavigate }) => {
  const [showCameraMenu, setShowCameraMenu] = useState(false);

  if ([AppScreen.ONBOARDING, AppScreen.LOGIN].includes(currentScreen)) {
    return null;
  }

  const navItems = [
    { id: AppScreen.STORE, label: '매장모드', icon: <ShoppingBag className="w-5 h-5" /> },
    { id: 'camera_select', label: '카메라', icon: <Camera className="w-5 h-5" /> },
    { id: AppScreen.HOME, label: '홈화면', icon: <HomeIcon className="w-5 h-5" /> },
    { id: AppScreen.CLOSET, label: '옷장', icon: <Shirt className="w-5 h-5" /> },
    { id: AppScreen.SETTINGS, label: '설정', icon: <User className="w-5 h-5" /> },
  ];

  return (
    <>
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-synk-navy/5 p-3 pb-6 flex justify-around items-center rounded-t-[2.5rem] shadow-2xl z-40">
        {navItems.map((item) => {
          let isActive = false;
          if (item.id === 'camera_select') {
            isActive = [AppScreen.ANALYSIS, AppScreen.BEAUTY].includes(currentScreen);
          } else {
            isActive = currentScreen === item.id;
          }

          const handleClick = () => {
            hapticService.tap();
            if (item.id === 'camera_select') {
              setShowCameraMenu(true);
            } else {
              onNavigate(item.id as AppScreen);
            }
          };

          return (
            <button
              key={item.id}
              onClick={handleClick}
              className={`flex flex-col items-center gap-1 transition-colors flex-1 ${isActive ? 'text-synk-blue' : 'text-synk-navy/30'}`}
            >
              <div className={`p-2 rounded-2xl transition-all ${isActive ? 'bg-synk-blue/10 scale-105' : 'hover:bg-synk-navy/5'}`}>
                {item.icon}
              </div>
              <span className="text-[10px] font-black tracking-tighter">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Camera Analysis Mode Selector Overlay */}
      <AnimatePresence>
        {showCameraMenu && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-synk-navy/60 backdrop-blur-md z-50 flex items-end justify-center p-6"
            onClick={() => setShowCameraMenu(false)}
          >
            <motion.div
              initial={{ y: 80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 80, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-white rounded-[2.5rem] w-full max-w-sm p-6 space-y-6 shadow-2xl relative border border-synk-navy/5 mb-4"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center space-y-1.5">
                <h3 className="text-xl font-black text-synk-navy tracking-tight">정밀 분석 카메라</h3>
                <p className="text-xs font-bold text-synk-grey">진행하고 싶으신 스마트 스캔을 선택해 주세요.</p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <button
                  onClick={() => {
                    setShowCameraMenu(false);
                    onNavigate(AppScreen.ANALYSIS);
                    hapticService.success();
                  }}
                  className="flex items-center gap-4 p-4 rounded-3xl bg-synk-offwhite hover:bg-synk-blue/5 border border-synk-navy/5 text-left transition-all active:scale-98 group"
                >
                  <div className="p-3 bg-synk-blue/10 rounded-2xl text-synk-blue group-hover:scale-105 transition-transform">
                    <Shirt className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-synk-navy">스타일 분석 (의류 스캔)</p>
                    <p className="text-[11px] font-medium text-synk-grey mt-0.5">옷이나 패션 잡화의 소재와 패턴 정밀 스캔</p>
                  </div>
                </button>

                <button
                  onClick={() => {
                    setShowCameraMenu(false);
                    onNavigate(AppScreen.BEAUTY);
                    hapticService.success();
                  }}
                  className="flex items-center gap-4 p-4 rounded-3xl bg-synk-offwhite hover:bg-beauty-pink/5 border border-synk-navy/5 text-left transition-all active:scale-98 group"
                >
                  <div className="p-3 bg-beauty-pink/10 rounded-2xl text-beauty-pink group-hover:scale-105 transition-transform">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-synk-navy">뷰티 분석 (페이스 스캔)</p>
                    <p className="text-[11px] font-medium text-synk-grey mt-0.5">퍼스널 컬러 및 얼굴형 맞춤 화장 룩북 매치</p>
                  </div>
                </button>
              </div>

              <button
                onClick={() => {
                  setShowCameraMenu(false);
                  hapticService.tap();
                }}
                className="w-full py-3.5 rounded-2xl bg-synk-navy/5 text-synk-navy font-bold text-xs hover:bg-synk-navy/10 active:scale-95 transition-all text-center"
              >
                닫기
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

