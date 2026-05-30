import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speechService } from '../lib/speech';
import { hapticService } from '../lib/haptics';
import { AppScreen, UserProfile } from '../types';
import { AccessibleButton } from '../components/AccessibleButton';
import { ChevronRight, Mic, BookOpen, Smartphone, User, Plus, Minus } from 'lucide-react';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
}

const STEPS = [
  { id: 'welcome', label: '환영합니다', hint: 'SYNK는 시각 정보를 감각으로 번역합니다. 로그인을 진행해 주세요. 아래로 스와이프하면 로그인 버튼이 있습니다.' },
  { id: 'voice_setup', label: '음성 설정', hint: '안내 음성의 속도와 크기를 조절합니다.', icon: <Mic /> },
  { id: 'description_mode', label: '설명 모드', hint: '분석 결과의 정보량을 선택합니다. 간단 모드는 핵심만, 상세 모드는 풍부한 설명을 제공합니다.', icon: <BookOpen /> },
  { id: 'haptic_test', label: '촉각 확인', hint: '진동 강도를 확인합니다. 버튼을 누르면 진동이 느껴집니다.', icon: <Smartphone /> },
  { id: 'measurements', label: '신체 데이터', hint: '정확한 핏 분석을 위해 키와 치수를 입력합니다.', icon: <User /> },
  { id: 'skin_tone', label: '피부톤 분석', hint: '카메라로 피부톤을 분석하여 개인화된 추천을 제공합니다.', icon: <ChevronRight /> }
];

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isVoiceLoggingIn, setIsVoiceLoggingIn] = useState(false);
  const [voiceLoginStep, setVoiceLoginStep] = useState<'email' | 'password' | 'done'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isDetailModeSet, setIsDetailModeSet] = useState(false);
  const [profile, setProfile] = useState<UserProfile>({
    name: '사용자',
    measurements: {},
    settings: {
      speechRate: 1.0,
      speechVolume: 1.0,
      hapticIntensity: 1.0,
      detailMode: 'detailed',
    }
  });

  const isMeasurementsSet = Object.values(profile.measurements).some(v => typeof v === 'number' && v > 0);

  useEffect(() => {
    const step = STEPS[currentStep];
    if (step.id === 'welcome') {
      speechService.speak('로그인 화면입니다. 아래로 스와이프하면 로그인 버튼이 있습니다. 버튼을 누르면 음성으로 로그인을 진행할 수 있습니다.');
    } else {
      speechService.speak(`${step.label}. ${step.hint}`);
    }
  }, [currentStep]);

  const startVoiceRecognition = (mode: 'email' | 'password') => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      speechService.speak('이 브라우저는 음성 인식을 지원하지 않습니다.');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'ko-KR';
    recognition.interimResults = false;

    recognition.onstart = () => {
      hapticService.vibrate(50);
    };

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (mode === 'email') {
        const cleanedEmail = transcript.replace(/\s/g, '').toLowerCase();
        setEmail(cleanedEmail);
        speechService.speak(`입력된 이메일은 ${cleanedEmail.split('').join(' ')} 입니다. 비밀번호를 말해주세요.`, true, () => {
          setVoiceLoginStep('password');
          startVoiceRecognition('password');
        });
      } else {
        setPassword(transcript);
        speechService.speak('비밀번호가 입력되었습니다. 로그인을 시도합니다.', true, () => {
          setVoiceLoginStep('done');
          handleNext();
        });
      }
    };

    recognition.onerror = () => {
      speechService.speak('음성 인식에 실패했습니다. 다시 말씀해 주세요.');
    };

    recognition.start();
  };

  const handleNext = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      hapticService.success();
      speechService.speak('모든 설정이 완료되었습니다. 메인 화면으로 이동합니다.');
      
      // Sync to Firestore
      if (auth.currentUser) {
        try {
          await setDoc(doc(db, 'users', auth.currentUser.uid), profile, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${auth.currentUser.uid}`);
        }
      }
      
      onComplete(profile);
    }
  };

  const step = STEPS[currentStep];

  return (
    <div className="h-full flex flex-col px-6 py-8 pb-16 bg-white text-synk-navy overflow-y-auto">
      <div className="flex-1 flex flex-col justify-center items-center gap-12 text-center py-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={step.id}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            className="flex flex-col items-center gap-10"
          >
            <div className="w-64 h-64 rounded-[4.5rem] flex items-center justify-center -rotate-2 bg-synk-blue shadow-2xl shadow-synk-blue/30 relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
              {step.id === 'welcome' ? (
                <div className="font-display font-black text-white text-9xl tracking-tighter text-balloon pt-4 relative z-10">
                  SYNK
                </div>
              ) : (
                <div className="text-white relative z-10 scale-[2.5]">
                  {step.icon}
                </div>
              )}
            </div>
            <div>
              <h1 className="text-6xl font-display font-black mb-6 tracking-tighter leading-none text-synk-navy">{step.label}</h1>
              <p className="text-2xl font-bold text-synk-grey leading-tight max-w-sm mx-auto">
                {step.hint}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="space-y-6">
        {step.id === 'voice_setup' && (
          <div className="bg-white p-8 rounded-[3rem] shadow-2xl space-y-10 border-t-8 border-synk-blue/20">
            {/* Speed Control with Buttons */}
            <div className="space-y-4">
              <label className="text-xl font-black text-synk-navy flex justify-between items-center">
                <span>음성 속도</span>
                <span className="text-2xl font-black text-synk-blue bg-synk-blue/10 px-4 py-1.5 rounded-2xl">{profile.settings.speechRate.toFixed(1)}배속</span>
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const rate = Math.max(0.5, Math.min(2.0, profile.settings.speechRate - 0.1));
                    const roundedRate = parseFloat(rate.toFixed(1));
                    setProfile(prev => ({ ...prev, settings: { ...prev.settings, speechRate: roundedRate } }));
                    speechService.setSettings(roundedRate, profile.settings.speechVolume);
                    speechService.speak(`속도를 조절합니다. 현재 ${roundedRate.toFixed(1)} 배속입니다.`, true);
                  }}
                  className="w-14 h-14 rounded-2xl bg-synk-offwhite text-synk-navy flex items-center justify-center hover:bg-synk-blue/10 active:scale-90 transition-all shadow-sm"
                  aria-label="속도 줄이기"
                >
                  <Minus className="w-7 h-7 text-synk-navy" />
                </button>
                <div className="flex-1">
                  <input 
                    type="range" 
                    min="0.5" max="2.0" step="0.1"
                    value={profile.settings.speechRate}
                    onChange={(e) => {
                      const rate = parseFloat(parseFloat(e.target.value).toFixed(1));
                      setProfile(prev => ({ ...prev, settings: { ...prev.settings, speechRate: rate } }));
                      speechService.setSettings(rate, profile.settings.speechVolume);
                      speechService.speak(`속도를 조절합니다. 현재 ${rate.toFixed(1)} 배속입니다.`, true);
                    }}
                    className="w-full h-5 bg-synk-offwhite rounded-full appearance-none cursor-pointer accent-synk-blue shadow-inner"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const rate = Math.max(0.5, Math.min(2.0, profile.settings.speechRate + 0.1));
                    const roundedRate = parseFloat(rate.toFixed(1));
                    setProfile(prev => ({ ...prev, settings: { ...prev.settings, speechRate: roundedRate } }));
                    speechService.setSettings(roundedRate, profile.settings.speechVolume);
                    speechService.speak(`속도를 조절합니다. 현재 ${roundedRate.toFixed(1)} 배속입니다.`, true);
                  }}
                  className="w-14 h-14 rounded-2xl bg-synk-offwhite text-synk-navy flex items-center justify-center hover:bg-synk-blue/10 active:scale-90 transition-all shadow-sm"
                  aria-label="속도 늘리기"
                >
                  <Plus className="w-7 h-7 text-synk-navy" />
                </button>
              </div>
            </div>

            {/* Volume Control with Buttons */}
            <div className="space-y-4">
              <label className="text-xl font-black text-synk-navy flex justify-between items-center">
                <span>음성 크기</span>
                <span className="text-2xl font-black text-synk-blue bg-synk-blue/10 px-4 py-1.5 rounded-2xl">{Math.round(profile.settings.speechVolume * 100)}%</span>
              </label>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => {
                    const vol = Math.max(0.0, Math.min(1.0, profile.settings.speechVolume - 0.1));
                    const roundedVol = parseFloat(vol.toFixed(1));
                    setProfile(prev => ({ ...prev, settings: { ...prev.settings, speechVolume: roundedVol } }));
                    speechService.setSettings(profile.settings.speechRate, roundedVol);
                    speechService.speak(`볼륨을 조절합니다. 현재 ${Math.round(roundedVol * 100)} 퍼센트입니다.`, true);
                  }}
                  className="w-14 h-14 rounded-2xl bg-synk-offwhite text-synk-navy flex items-center justify-center hover:bg-synk-blue/10 active:scale-90 transition-all shadow-sm"
                  aria-label="볼륨 줄이기"
                >
                  <Minus className="w-7 h-7 text-synk-navy" />
                </button>
                <div className="flex-1">
                  <input 
                    type="range" 
                    min="0" max="1.0" step="0.1"
                    value={profile.settings.speechVolume}
                    onChange={(e) => {
                      const vol = parseFloat(parseFloat(e.target.value).toFixed(1));
                      setProfile(prev => ({ ...prev, settings: { ...prev.settings, speechVolume: vol } }));
                      speechService.setSettings(profile.settings.speechRate, vol);
                      speechService.speak(`볼륨을 조절합니다. 현재 ${Math.round(vol * 100)} 퍼센트입니다.`, true);
                    }}
                    className="w-full h-5 bg-synk-offwhite rounded-full appearance-none cursor-pointer accent-synk-blue shadow-inner"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const vol = Math.max(0.0, Math.min(1.0, profile.settings.speechVolume + 0.1));
                    const roundedVol = parseFloat(vol.toFixed(1));
                    setProfile(prev => ({ ...prev, settings: { ...prev.settings, speechVolume: roundedVol } }));
                    speechService.setSettings(profile.settings.speechRate, roundedVol);
                    speechService.speak(`볼륨을 조절합니다. 현재 ${Math.round(roundedVol * 100)} 퍼센트입니다.`, true);
                  }}
                  className="w-14 h-14 rounded-2xl bg-synk-offwhite text-synk-navy flex items-center justify-center hover:bg-synk-blue/10 active:scale-90 transition-all shadow-sm"
                  aria-label="볼륨 늘리기"
                >
                  <Plus className="w-7 h-7 text-synk-navy" />
                </button>
              </div>
            </div>
          </div>
        )}

        {step.id === 'welcome' && (
          <div className="flex flex-col gap-4">
            <AccessibleButton
              label="온보딩 시작하기"
              variant="primary"
              icon={<ChevronRight className="w-10 h-10" />}
              onClick={handleNext}
            />
          </div>
        )}

        {/* Removed deprecated Voice Login simulation */}
        
        {step.id === 'description_mode' && (
          <div className="flex flex-col gap-4">
            <AccessibleButton
              label="간단 모드 (Short)"
              variant={profile.settings.detailMode === 'simple' ? 'secondary' : 'ghost'}
              className={profile.settings.detailMode === 'simple' ? '' : 'text-synk-navy border-synk-navy/5 bg-synk-offwhite'}
              onClick={() => {
                setProfile(prev => ({ ...prev, settings: { ...prev.settings, detailMode: 'simple' } }));
                setIsDetailModeSet(true);
                speechService.speak('간단 모드가 선택되었습니다.');
              }}
            />
            <AccessibleButton
              label="상세 모드 (Detailed)"
              variant={profile.settings.detailMode === 'detailed' ? 'secondary' : 'ghost'}
              className={profile.settings.detailMode === 'detailed' ? '' : 'text-synk-navy border-synk-navy/5 bg-synk-offwhite'}
              onClick={() => {
                setProfile(prev => ({ ...prev, settings: { ...prev.settings, detailMode: 'detailed' } }));
                setIsDetailModeSet(true);
                speechService.speak('상세 모드가 선택되었습니다.');
              }}
            />
          </div>
        )}
        
        {step.id === 'haptic_test' && (
          <div className="space-y-6 w-full max-w-sm">
            <AccessibleButton
              label="진동 피드백 테스트"
              variant="secondary"
              className="w-full"
              onClick={() => hapticService.vibrate([100, 50, 100])}
            />
            <div className="p-5 bg-amber-50 rounded-[1.5rem] border-2 border-amber-500/10 space-y-1.5 text-left shadow-md">
              <p className="text-sm font-black text-amber-800 flex items-center gap-1.5">
                <span>💡 햅틱(진동) 기능 안내</span>
              </p>
              <p className="text-xs font-bold text-amber-700/90 leading-relaxed">
                옷감 소재 촉감 체험을 생성하는 햅틱 기술은 <strong>삼성 갤럭시(안드로이드) 기기</strong>에서만 제한적으로 제공됩니다. 또한 스마트폰 볼륨이 무음이 아닌 <span className="underline decoration-2">진동 모드</span>에 맞추어져 있어야 물리 진동이 발생할 수 있습니다.
              </p>
            </div>
          </div>
        )}

        {step.id === 'measurements' && (
          <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl space-y-5 border-t-8 border-synk-blue/20 w-full max-w-sm">
            {[
              { key: 'height', label: '나의 키' },
              { key: 'shoulder', label: '어깨너비' },
              { key: 'chest', label: '가슴둘레' },
              { key: 'waist', label: '허리둘레' }
            ].map((m) => (
              <div key={m.key} className="flex flex-col gap-2">
                <label className="text-lg font-bold text-synk-navy ml-2 flex items-center justify-between">
                  {m.label}
                  <span className="text-[10px] font-black opacity-30 uppercase tracking-widest">cm</span>
                </label>
                <div className="flex items-center w-full">
                  <input
                    type="number"
                    min="0"
                    value={profile.measurements[m.key as keyof typeof profile.measurements] || ''}
                    onChange={(e) => {
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setProfile(prev => ({
                        ...prev,
                        measurements: { ...prev.measurements, [m.key]: val }
                      }));
                    }}
                    onFocus={() => speechService.speak(`${m.label} 입력창입니다. 현재 ${profile.measurements[m.key as keyof typeof profile.measurements] || 0} 센티미터입니다.`)}
                    className="w-full h-14 bg-synk-offwhite rounded-2xl text-center text-2xl font-black border-2 border-synk-navy/5 outline-none text-synk-navy focus:border-synk-blue/30 transition-colors"
                    placeholder="0"
                  />
                </div>
              </div>
            ))}
          </div>
        )}
        
        {(!isVoiceLoggingIn || step.id !== 'welcome') && (
          <div className="pt-10 flex items-center justify-between mt-auto">
            <div className="text-2xl font-black text-synk-navy/30 tracking-tighter">
              {currentStep + 1} <span className="opacity-50">/</span> {STEPS.length}
            </div>
            
            <div className="flex items-center gap-4">
              {currentStep > 0 && (
                <button 
                  onClick={() => setCurrentStep(prev => prev - 1)}
                  className="px-6 py-3 font-black text-synk-navy/40 uppercase tracking-widest text-sm hover:text-synk-navy transition-colors"
                >
                  Back
                </button>
              )}
              <button
                onClick={handleNext}
                className="bg-gradient-to-r from-synk-blue to-synk-cyan text-white px-8 py-4 rounded-full font-black text-xl shadow-xl shadow-synk-blue/20 flex items-center gap-2 active:scale-95 transition-all min-w-[160px] justify-center"
              >
                {currentStep === STEPS.length - 1 
                  ? '시작하기' 
                  : (step.id === 'description_mode' && !isDetailModeSet) || (step.id === 'measurements' && !isMeasurementsSet)
                    ? '나중에 설정하기'
                    : '다음'
                }
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
