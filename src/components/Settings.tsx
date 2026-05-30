import React, { useState } from 'react';
import { speechService } from '../lib/speech';
import { hapticService } from '../lib/haptics';
import { AppScreen, UserProfile } from '../types';
import { AccessibleButton } from './AccessibleButton';
import { ChevronLeft, Mic, BookOpen, Smartphone, User, LogOut, Plus, Minus } from 'lucide-react';

import { logout } from '../lib/auth';
import { auth, db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface SettingsProps {
  onNavigate: (screen: AppScreen) => void;
  profile: UserProfile | null;
  onUpdateProfile: (profile: UserProfile) => void;
  onLogout: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ onNavigate, profile, onUpdateProfile, onLogout }) => {
  const [localProfile, setLocalProfile] = useState<UserProfile>(() => {
    const baseProfile = profile || {
      name: '사용자',
      measurements: {},
    };
    return {
      ...baseProfile,
      settings: {
        speechRate: baseProfile.settings?.speechRate ?? 1.0,
        speechVolume: baseProfile.settings?.speechVolume ?? 1.0,
        hapticIntensity: baseProfile.settings?.hapticIntensity ?? 1.0,
        detailMode: baseProfile.settings?.detailMode ?? 'detailed',
      }
    };
  });

  const updateSettings = async (key: keyof typeof localProfile.settings, value: any) => {
    const newProfile = {
      ...localProfile,
      settings: { ...localProfile.settings, [key]: value }
    };
    setLocalProfile(newProfile);
    onUpdateProfile(newProfile);

    // Sync to Firestore if logged in
    if (auth.currentUser) {
      await setDoc(doc(db, 'users', auth.currentUser.uid), newProfile, { merge: true });
    }
    
    if (key === 'speechRate') {
      speechService.setSettings(value, localProfile.settings.speechVolume);
      speechService.speak(`${value.toFixed(1)} 배속으로 변경합니다.`, true);
    } else if (key === 'speechVolume') {
      speechService.setSettings(localProfile.settings.speechRate, value);
      speechService.speak(`볼륨을 변경합니다.`, true);
    }
    hapticService.tap();
  };

  return (
    <div className="h-full flex flex-col bg-white overflow-hidden">
      <header className="px-6 py-8 pb-4 flex items-center gap-6">
        <button 
          onClick={() => onNavigate(AppScreen.HOME)}
          className="p-4 rounded-3xl bg-synk-offwhite text-synk-navy hover:bg-synk-blue/10 active:scale-95 transition-all"
        >
          <ChevronLeft className="w-8 h-8" />
        </button>
        <h1 className="text-4xl font-display font-black tracking-tighter">SETTINGS</h1>
      </header>

      <div className="flex-1 px-6 pb-12 space-y-8 overflow-y-auto custom-scrollbar">
        {/* Voice Settings */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-synk-blue">
            <div className="p-2 rounded-xl bg-synk-blue/10">
              <Mic className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-synk-navy">음성 설정</h2>
          </div>
          
          <div className="bg-synk-offwhite p-6 rounded-[2.5rem] space-y-8 border-2 border-synk-navy/5">
            {/* Speech On/Off Toggle Button */}
            <div className="flex items-center justify-between border-b border-synk-navy/5 pb-6">
              <div className="text-left">
                <p className="text-lg font-black text-synk-navy">음성 안내 기능</p>
                <p className="text-xs text-synk-grey">앱의 모든 다정하고 상세한 음성안내를 켜거나 끕니다.</p>
              </div>
              <button 
                onClick={() => {
                  const newState = !speechService.isEnabled();
                  speechService.setEnabled(newState);
                  setLocalProfile({ ...localProfile }); // Trigger re-render to reflect state
                  hapticService.tap();
                  if (newState) {
                    speechService.speak('음성 안내가 활성화되었습니다.');
                  }
                }}
                className={`w-14 h-8 rounded-full transition-all relative flex-shrink-0 ${speechService.isEnabled() ? 'bg-synk-blue' : 'bg-synk-grey/30'}`}
                aria-label="음성 안내 토글"
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${speechService.isEnabled() ? 'right-1' : 'left-1 shadow-sm'}`} />
              </button>
            </div>

            {/* Speed Control with Buttons */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-lg font-black text-synk-navy">속도 (Speed)</span>
                <span className="text-2xl font-black text-synk-blue bg-synk-blue/10 px-4 py-1.5 rounded-2xl">{localProfile.settings.speechRate.toFixed(1)}배속</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const newRate = Math.max(0.5, Math.min(2.0, localProfile.settings.speechRate - 0.1));
                    updateSettings('speechRate', parseFloat(newRate.toFixed(1)));
                  }}
                  className="w-14 h-14 rounded-2xl bg-white border-2 border-synk-navy/5 text-synk-navy flex items-center justify-center hover:bg-synk-blue/5 active:scale-90 transition-all shadow-sm"
                  aria-label="속도 줄이기"
                >
                  <Minus className="w-7 h-7 text-synk-navy" />
                </button>
                <div className="flex-1">
                  <input 
                    type="range" min="0.5" max="2.0" step="0.1"
                    value={localProfile.settings.speechRate}
                    onChange={(e) => updateSettings('speechRate', parseFloat(e.target.value))}
                    className="w-full h-5 bg-white rounded-full appearance-none accent-synk-blue shadow-inner cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newRate = Math.max(0.5, Math.min(2.0, localProfile.settings.speechRate + 0.1));
                    updateSettings('speechRate', parseFloat(newRate.toFixed(1)));
                  }}
                  className="w-14 h-14 rounded-2xl bg-white border-2 border-synk-navy/5 text-synk-navy flex items-center justify-center hover:bg-synk-blue/5 active:scale-90 transition-all shadow-sm"
                  aria-label="속도 늘리기"
                >
                  <Plus className="w-7 h-7 text-synk-navy" />
                </button>
              </div>
            </div>

            {/* Volume Control with Buttons */}
            <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                <span className="text-lg font-black text-synk-navy">볼륨 (Volume)</span>
                <span className="text-2xl font-black text-synk-blue bg-synk-blue/10 px-4 py-1.5 rounded-2xl">{Math.round(localProfile.settings.speechVolume * 100)}%</span>
              </div>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const newVol = Math.max(0.0, Math.min(1.0, localProfile.settings.speechVolume - 0.1));
                    updateSettings('speechVolume', parseFloat(newVol.toFixed(1)));
                  }}
                  className="w-14 h-14 rounded-2xl bg-white border-2 border-synk-navy/5 text-synk-navy flex items-center justify-center hover:bg-synk-blue/5 active:scale-90 transition-all shadow-sm"
                  aria-label="볼륨 줄이기"
                >
                  <Minus className="w-7 h-7 text-synk-navy" />
                </button>
                <div className="flex-1">
                  <input 
                    type="range" min="0" max="1.0" step="0.1"
                    value={localProfile.settings.speechVolume}
                    onChange={(e) => updateSettings('speechVolume', parseFloat(e.target.value))}
                    className="w-full h-5 bg-white rounded-full appearance-none accent-synk-blue shadow-inner cursor-pointer"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const newVol = Math.max(0.0, Math.min(1.0, localProfile.settings.speechVolume + 0.1));
                    updateSettings('speechVolume', parseFloat(newVol.toFixed(1)));
                  }}
                  className="w-14 h-14 rounded-2xl bg-white border-2 border-synk-navy/5 text-synk-navy flex items-center justify-center hover:bg-synk-blue/5 active:scale-90 transition-all shadow-sm"
                  aria-label="볼륨 늘리기"
                >
                  <Plus className="w-7 h-7 text-synk-navy" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Description Mode */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-synk-blue">
            <div className="p-2 rounded-xl bg-synk-blue/10">
              <BookOpen className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-synk-navy">설명 모드</h2>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => updateSettings('detailMode', 'simple')}
              className={`p-6 rounded-3xl font-bold transition-all border-2 ${localProfile.settings.detailMode === 'simple' ? 'bg-synk-blue text-white border-transparent shadow-lg shadow-synk-blue/20' : 'bg-synk-offwhite text-synk-navy border-synk-navy/5'}`}
            >
              간단 모드
            </button>
            <button 
              onClick={() => updateSettings('detailMode', 'detailed')}
              className={`p-6 rounded-3xl font-bold transition-all border-2 ${localProfile.settings.detailMode === 'detailed' ? 'bg-synk-blue text-white border-transparent shadow-lg shadow-synk-blue/20' : 'bg-synk-offwhite text-synk-navy border-synk-navy/5'}`}
            >
              상세 모드
            </button>
          </div>
        </section>

        {/* Haptic Settings */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-synk-blue">
            <div className="p-2 rounded-xl bg-synk-blue/10">
              <Smartphone className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-synk-navy">햅틱 설정</h2>
          </div>
          
          <div className="bg-synk-offwhite p-6 rounded-[2.5rem] border-2 border-synk-navy/5 space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-bold text-synk-navy">햅틱(진동) 기능</p>
                <p className="text-xs text-synk-grey">소재 체험을 위한 진동을 켭니다.</p>
              </div>
              <button 
                onClick={() => {
                  const newState = !hapticService.isEnabled();
                  hapticService.setEnabled(newState);
                  setLocalProfile({ ...localProfile }); // Trigger re-render
                  hapticService.tap();
                  speechService.speak(`햅틱 기능이 ${newState ? '켜졌습니다' : '꺼졌습니다'}.`);
                }}
                className={`w-14 h-8 rounded-full transition-all relative ${hapticService.isEnabled() ? 'bg-synk-blue' : 'bg-synk-grey/30'}`}
                aria-label="햅틱 토글"
              >
                <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all ${hapticService.isEnabled() ? 'right-1' : 'left-1 shadow-sm'}`} />
              </button>
            </div>

            <AccessibleButton 
              label="진동 강도 테스트" 
              variant="secondary"
              className="w-full"
              icon={<Smartphone className="w-8 h-8" />}
              onClick={() => {
                if (hapticService.isSupported()) {
                  hapticService.success();
                  speechService.speak('진동이 느껴지시나요?');
                } else {
                  speechService.speak('이 기기에서는 햅틱 기능을 지원하지 않습니다.');
                }
              }}
            />

            <div className="p-5 bg-amber-50 rounded-[1.5rem] border-2 border-amber-500/10 space-y-1.5 text-left">
              <p className="text-sm font-black text-amber-800 flex items-center gap-1.5">
                <span>💡 햅틱(진동) 기능 설정 안내</span>
              </p>
              <p className="text-xs font-bold text-amber-700/90 leading-relaxed">
                옷감 소재 체험을 위한 햅틱 피드백은 <strong>삼성 갤럭시(안드로이드) 스마트폰</strong>에서 사용을 제한적으로 권장하며, 기기 상태가 무음이 아닌 <span className="underline decoration-2">진동 모드</span>일 때만 정상 동조되어 진동을 진동판으로 뿜어낼 수 있습니다. (애플 아이폰 및 데스크톱 브라우저는 미지원)
              </p>
            </div>
            
            {!hapticService.isSupported() && (
              <p className="text-xs text-red-500 font-bold text-center bg-red-50 p-4 rounded-[1.5rem] border border-red-500/10">
                * 현재 이 기기 및 브라우저 환경은 웹 진동 API(Vibration API)가 승인되지 않았거나 지원되지 않는 기기입니다.
              </p>
            )}
          </div>
        </section>

        {/* Body Data */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 text-synk-blue">
            <div className="p-2 rounded-xl bg-synk-blue/10">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-widest text-synk-navy">신체 데이터</h2>
          </div>
          
          <div className="bg-synk-offwhite p-5 rounded-[2rem] border-2 border-synk-navy/5 space-y-4">
            {[
              { key: 'height', label: '키' },
              { key: 'shoulder', label: '어깨너비' },
              { key: 'chest', label: '가슴둘레' },
              { key: 'waist', label: '허리둘레' }
            ].map(m => (
              <div key={m.key} className="space-y-2">
                <label className="text-[11px] font-black text-synk-grey uppercase px-2">{m.label} (CM)</label>
                <div className="flex items-center">
                  <input
                    type="number"
                    min="0"
                    value={localProfile.measurements[m.key as keyof typeof localProfile.measurements] || ''}
                    onChange={async (e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      const newProfile = { ...localProfile, measurements: { ...localProfile.measurements, [m.key]: val } };
                      setLocalProfile(newProfile);
                      onUpdateProfile(newProfile);
                      
                      if (auth.currentUser) {
                        await setDoc(doc(db, 'users', auth.currentUser.uid) , newProfile, { merge: true });
                      }
                    }}
                    onFocus={() => speechService.speak(`${m.label} 입력창입니다. 현재 ${localProfile.measurements[m.key as keyof typeof localProfile.measurements] || 0} 센티미터입니다.`)}
                    className="w-full bg-white h-11 rounded-xl text-center font-black text-lg shadow-inner border-2 border-synk-navy/5 outline-none focus:border-synk-blue/30 transition-colors"
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <div className="pt-8">
          <AccessibleButton 
            label="로그아웃" 
            variant="ghost" 
            className="w-full text-red-500 border-red-500/10 hover:bg-red-50"
            icon={<LogOut className="w-8 h-8" />}
            onClick={async () => {
              await logout();
              onLogout();
            }}
          />
        </div>
      </div>
    </div>
  );
};
