import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { speechService } from '../lib/speech';
import { hapticService, HapticPattern } from '../lib/haptics';
import { AppScreen, UserProfile } from '../types';
import { AccessibleButton } from './AccessibleButton';
import { Camera, X, RefreshCw, Info, Save, Sparkles, CheckCircle2 } from 'lucide-react';
import { db, auth, OperationType, handleFirestoreError } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

import { cameraManager } from '../lib/camera';

interface AnalysisProps {
  onNavigate: (screen: AppScreen) => void;
  profile: UserProfile | null;
}

export const Analysis: React.FC<AnalysisProps> = ({ onNavigate, profile }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const [isSimulated, setIsSimulated] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      setCameraError(null);
      if (!isMounted) return;

      try {
        const mediaStream = await cameraManager.getStream({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (!isMounted) {
          cameraManager.stopStream();
          return;
        }

        const isSim = (mediaStream as any).isSimulated;
        setIsSimulated(!!isSim);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          try { await videoRef.current.play(); } catch (e) {}
        }
        setStream(mediaStream);

        if (isSim) {
          speechService.speak('카메라 하드웨어 준비 중입니다. 시뮬레이션 모드를 시작합니다.');
        } else {
          speechService.speak('카메라가 활성화되었습니다.');
        }
      } catch (err: any) {
        console.error('Analysis Camera error:', err);
        if (isMounted) {
          if (err.name === 'NotAllowedError') {
            const msg = '카메라 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.';
            setCameraError(msg);
            speechService.speak(msg);
          } else {
            const msg = '카메라를 시작할 수 없습니다. 다른 앱에서 카메라를 사용 중인지 확인해주세요.';
            setCameraError(msg);
            speechService.speak(msg);
          }
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        try { videoRef.current.load(); } catch (e) {}
      }
      cameraManager.stopStream();
      setStream(null);
    };
  }, []);

  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [scanningStatus, setScanningStatus] = useState('');
  const [detailedResults, setDetailedResults] = useState<{
    mainColor: string;
    subColor: string;
    style: string;
    occasion: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;

    const startCamera = async () => {
      setCameraError(null);
      if (!isMounted) return;

      try {
        const mediaStream = await cameraManager.getStream({
          video: { 
            facingMode: 'environment',
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        });
        
        if (!isMounted) {
          cameraManager.stopStream();
          return;
        }

        const isSim = (mediaStream as any).isSimulated;
        setIsSimulated(!!isSim);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          try { await videoRef.current.play(); } catch (e) {}
        }
        setStream(mediaStream);

        if (isSim) {
          speechService.speak('카메라 하드웨어 준비 중입니다. 시뮬레이션 모드를 시작합니다.');
        } else {
          speechService.speak('스타일 스캔 카메라가 활성화되었습니다. 옷이나 소품을 화면 중앙에 위치시켜주세요.');
        }
      } catch (err: any) {
        console.error('Analysis Camera error:', err);
        if (isMounted) {
          if (err.name === 'NotAllowedError') {
            const msg = '카메라 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.';
            setCameraError(msg);
            speechService.speak(msg);
          } else {
            const msg = '카메라를 시작할 수 없습니다. 다른 앱에서 카메라를 사용 중인지 확인해주세요.';
            setCameraError(msg);
            speechService.speak(msg);
          }
        }
      }
    };

    startCamera();

    return () => {
      isMounted = false;
      if (videoRef.current) {
        videoRef.current.srcObject = null;
        try { videoRef.current.load(); } catch (e) {}
      }
      cameraManager.stopStream();
      setStream(null);
    };
  }, []);

  const captureAndAnalyze = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setResult('');
    setDetailedResults(null);
    hapticService.tap();
    speechService.speak('패턴과 스타일을 정밀 분석하고 있습니다. 잠시만 기다려주세요.');

    const statuses = [
      '이미지 패턴 추출 중...',
      '컬러 팔레트 분석 중...',
      '소재 텍스처 감지 중...',
      '실루엣 및 핏 계산 중...',
      '시즌 트렌드 데이터 매칭 중...',
      '최적의 코디 제안 생성 완료'
    ];

    for (let i = 0; i <= 100; i += 2) {
      await new Promise(r => setTimeout(r, 45));
      setAnalysisProgress(i);
      
      const statusIdx = Math.min(Math.floor((i / 100) * statuses.length), statuses.length - 1);
      setScanningStatus(statuses[statusIdx]);
      
      if (i % 20 === 0) hapticService.vibrate(HapticPattern.DENIM);
    }

    try {
      const colors = [
        '어두운 남색 (미드나잇 블루)', 
        '짙은 초록색 (포레스트 그린)', 
        '차분한 분홍색 (뮤트 핑크)', 
        '부드러운 상아색 (아이보리 화이트)', 
        '진한 쥐색 (차콜 그레이)', 
        '따뜻한 겨자색 (머스타드 옐로우)'
      ];
      const styles = [
        '도시적이고 편안한 일상 스타일 (어반 캐주얼)', 
        '단정하면서 세련된 스타일 (프렌치 시크)', 
        '단정하고 격식 있는 신사 정장 느낌 (젠틀 포멀)', 
        '꾸밈없이 자연스럽고 편안한 스타일 (내추럴 룩)', 
        '따뜻하고 친근하며 정감 가는 옛 감성 스타일 (모던 빈티지)'
      ];
      const occasions = [
        '중요한 면접이나 공적인 회의', 
        '주말에 한가롭게 즐기는 가벼운 데이트', 
        '정장을 입는 격식 있는 결혼식 하객 참석', 
        '친구들과 즐기는 격식 없고 편안한 친목 모임'
      ];

      const res = {
        mainColor: colors[Math.floor(Math.random() * colors.length)],
        subColor: colors[Math.floor(Math.random() * colors.length)],
        style: styles[Math.floor(Math.random() * styles.length)],
        occasion: occasions[Math.floor(Math.random() * occasions.length)]
      };

      setDetailedResults(res);
      const summary = `스타일 분석 완료. 메인 컬러는 ${res.mainColor}이며, 전체적으로 ${res.style} 분위기를 줍니다. 이 아이템은 ${res.occasion}에 가장 잘 어울립니다.`;
      setResult(summary);
      speechService.speak(summary);
      hapticService.success();
    } catch (err) {
      console.error(err);
      speechService.speak('분석 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const parseResult = (text: string) => {
    const materialMatch = text.match(/\[MATERIAL:(.*?)\]/);
    const material = materialMatch ? materialMatch[1].toLowerCase() : 'cotton';
    
    let cleanText = text.replace(/\[MATERIAL:.*?\]/, '').trim();
    
    // Improved parsing for Simple vs Detailed sections
    let simple = '';
    let detailed = '';

    if (cleanText.includes('[간단 버전]') && cleanText.includes('[상세 버전]')) {
      const parts = cleanText.split('[상세 버전]');
      simple = parts[0].replace('[간단 버전]', '').trim();
      detailed = parts[1].trim();
    } else {
      // Fallback if formatting is slightly off
      simple = cleanText.split('\n')[0];
      detailed = cleanText;
    }

    return { simple, detailed, material };
  };

  // Rubbing screen interaction
  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!result) return;
    
    // Extract material for real-time haptic feedback
    const materialMatch = result.match(/\[MATERIAL:(.*?)\]/);
    const material = materialMatch ? materialMatch[1].toLowerCase() : 'cotton';
    
    const pattern = (MATERIAL_MAP as any)[material]?.pattern || HapticPattern.COTTON;
    hapticService.vibrate(pattern);
  };

  const saveToCloset = async () => {
    if (!result) return;

    try {
      hapticService.tap();
      
      // Extract material
      const materialMatch = result.match(/\[MATERIAL:(.*?)\]/);
      const materialKey = materialMatch ? materialMatch[1].toLowerCase() : 'cotton';
      const cleanDescription = result.replace(/\[MATERIAL:.*?\]/, '').trim();

      const newItem = {
        id: Date.now().toString(),
        name: 'AI 감각 번역 의류',
        category: 'AI Analysis',
        color: 'Auto',
        texture: 'Auto',
        material: materialKey as any,
        description: cleanDescription,
        imageUrl: canvasRef.current?.toDataURL('image/jpeg'),
        createdAt: Date.now()
      };

      const saved = localStorage.getItem('synk_touch_closet');
      const items = saved ? JSON.parse(saved) : [];
      localStorage.setItem('synk_touch_closet', JSON.stringify([newItem, ...items]));
      
      hapticService.success();
      speechService.speak('옷장에 저장되었습니다. 이제 옷장에서 직접 만져보실 수 있습니다.');
      onNavigate(AppScreen.CLOSET);
    } catch (error) {
      console.error('Save error:', error);
      speechService.speak('저장 중 오류가 발생했습니다.');
    }
  };

  const MATERIAL_MAP = {
    silk: { pattern: HapticPattern.SILK },
    knit: { pattern: HapticPattern.KNIT },
    denim: { pattern: HapticPattern.DENIM },
    leather: { pattern: HapticPattern.LEATHER },
    fur: { pattern: HapticPattern.FUR },
    cotton: { pattern: HapticPattern.COTTON },
    linen: { pattern: HapticPattern.LINEN },
  };

  return (
    <div className="h-full flex flex-col bg-beauty-beige overflow-y-auto pb-24">
      {/* Header */}
      <header className="p-6 flex items-center justify-between">
        <button 
          onClick={() => onNavigate(AppScreen.HOME)}
          className="w-12 h-12 rounded-2xl bg-white beauty-shadow flex items-center justify-center text-beauty-pink"
        >
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black text-synk-navy tracking-tight">STYLE SCANNER</h1>
        <div className="w-12 h-12 rounded-2xl bg-synk-navy flex items-center justify-center text-white">
          <Camera className="w-6 h-6" />
        </div>
      </header>

      {/* Viewfinder */}
      <div className="flex-1 px-6 pb-6 mt-4">
        <div className="relative aspect-[3/4] w-full bg-white rounded-[3.5rem] overflow-hidden beauty-shadow border-8 border-white">
          <video 
            ref={videoRef}
            autoPlay 
            playsInline 
            muted
            className={`w-full h-full object-cover transition-all duration-700 ${isAnalyzing ? 'scale-110 blur-[2px]' : 'scale-100'} ${(isSimulated || !stream) ? 'hidden' : 'block'}`}
          />
          
          {/* Guide Graphics */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Corner brackets */}
            <div className="absolute top-12 left-12 w-12 h-12 border-t-4 border-l-4 border-beauty-pink rounded-tl-3xl opacity-60" />
            <div className="absolute top-12 right-12 w-12 h-12 border-t-4 border-r-4 border-beauty-pink rounded-tr-3xl opacity-60" />
            <div className="absolute bottom-12 left-12 w-12 h-12 border-b-4 border-l-4 border-beauty-pink rounded-bl-3xl opacity-60" />
            <div className="absolute bottom-12 right-12 w-12 h-12 border-b-4 border-r-4 border-beauty-pink rounded-br-3xl opacity-60" />

            {/* Central Crosshair */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 text-beauty-pink opacity-40">
              <RefreshCw className="w-full h-full" />
            </div>
          </div>

          {isAnalyzing && (
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-synk-navy gap-8 z-50">
               <div className="text-7xl font-black text-beauty-pink beauty-glow tabular-nums">
                 {analysisProgress}%
               </div>
               <div className="w-64 space-y-3">
                 <p className="text-center text-sm font-black tracking-widest text-synk-navy/60 animate-pulse">
                   {scanningStatus}
                 </p>
                 <div className="h-1.5 w-full bg-synk-navy/5 rounded-full overflow-hidden">
                    <motion.div 
                       className="h-full bg-beauty-pink"
                       initial={{ width: 0 }}
                       animate={{ width: `${analysisProgress}%` }}
                    />
                 </div>
               </div>
               <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <div className="absolute inset-x-0 h-1 bg-beauty-pink shadow-[0_0_20px_#FF85A1] animate-scan-line" />
               </div>
            </div>
          )}

          {cameraError && (
             <div className="absolute inset-0 bg-synk-navy flex flex-col items-center justify-center p-12 text-center text-white">
                <X className="w-16 h-16 text-synk-peach mb-4" />
                <p className="font-bold">{cameraError}</p>
             </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="p-6 pt-0">
        {!result ? (
          <AccessibleButton
            label="스캔 및 스타일 분석 시작"
            onClick={captureAndAnalyze}
            isLoading={isAnalyzing}
            className="w-full h-24 rounded-[3rem] bg-synk-navy text-white flex items-center justify-center gap-4 text-xl font-black beauty-shadow active:scale-95 transition-all"
            icon={<Sparkles className="w-6 h-6 text-beauty-pink" />}
          />
        ) : (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-6 duration-700">
            <div className="bg-white rounded-[3.5rem] p-10 beauty-shadow">
               <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 rounded-full bg-beauty-beige flex items-center justify-center text-beauty-pink">
                    <CheckCircle2 className="w-8 h-8" />
                  </div>
                  <h3 className="font-black text-2xl text-synk-navy">스타일 분석 결과</h3>
               </div>

               <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: '메인 컬러', value: detailedResults?.mainColor },
                    { label: '서브 컬러', value: detailedResults?.subColor },
                    { label: '추천 스타일', value: detailedResults?.style },
                    { label: '추천 상황', value: detailedResults?.occasion },
                  ].map((item, idx) => (
                    <div key={idx} className="p-5 rounded-3xl bg-beauty-beige/40">
                      <p className="text-[10px] font-black uppercase tracking-widest text-beauty-pink/60 mb-1">{item.label}</p>
                      <p className="text-base font-bold text-synk-navy leading-tight">{item.value}</p>
                    </div>
                  ))}
               </div>
            </div>

            <div className="flex gap-4">
              <AccessibleButton
                 label="다시 스캔"
                 onClick={() => {
                   setResult('');
                   setDetailedResults(null);
                   captureAndAnalyze();
                 }}
                 className="flex-1 h-20 rounded-[2.5rem] bg-white text-synk-navy border-2 border-synk-navy/10 flex items-center justify-center gap-3 text-lg font-black"
                 icon={<RefreshCw className="w-5 h-5" />}
              />
              <AccessibleButton
                 label="저장"
                 onClick={() => {
                  speechService.speak('분석 결과가 옷장에 저장되었습니다.');
                  onNavigate(AppScreen.CLOSET);
                 }}
                 className="flex-1 h-20 rounded-[2.5rem] bg-beauty-pink text-white flex items-center justify-center gap-3 text-lg font-black beauty-shadow"
                 icon={<Save className="w-5 h-5" />}
              />
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" width={640} height={480} />
    </div>
  );
};
