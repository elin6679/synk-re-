import React, { useState, useEffect, useRef } from 'react';
import { ClothingItem, AppScreen } from '../types';
import { AccessibleButton } from './AccessibleButton';
import { speechService } from '../lib/speech';
import { hapticService, HapticPattern } from '../lib/haptics';
import { Shirt, ChevronLeft, Plus, Trash2, Camera, X, Info, Sparkles, Thermometer, Coins, Eye, Check, Calendar, Sun, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ClosetProps {
  onNavigate: (screen: AppScreen) => void;
}

interface ClosetAnalysisResult {
  laundry_and_care: {
    material_detected: string;
    washing_tip: string;
    care_caution: string;
  };
  weather_material_coordination: {
    weather_suitability: string;
    recommended_styling: string;
    text_match_tip?: string; // Support both names in schema
    texture_match_tip?: string;
  };
  closet_efficiency_stats: {
    cost_per_wear: number;
    efficiency_grade: string;
    rescue_challenge: {
      is_dormant: boolean;
      challenge_message: string;
    };
  };
}

const MATERIAL_MAP = {
  silk: { label: '실크', pattern: HapticPattern.SILK },
  knit: { label: '니트', pattern: HapticPattern.KNIT },
  denim: { label: '데님', pattern: HapticPattern.DENIM },
  leather: { label: '가죽', pattern: HapticPattern.LEATHER },
  fur: { label: '퍼/털', pattern: HapticPattern.FUR },
  cotton: { label: '면', pattern: HapticPattern.COTTON },
  linen: { label: '린넨', pattern: HapticPattern.LINEN },
};

const generateSvgFallback = (mainColor: string, subColor: string, style: string) => {
  const colorMap: Record<string, string> = {
    '남색': '#1e293b', 
    '초록': '#064e3b', 
    '분홍': '#f472b6', 
    '상아': '#fafaf9', 
    '쥐색': '#44403c',
    '차골': '#374151',
    '겨자': '#d97706'
  };
  
  let mainHex = '#0f172a';
  Object.keys(colorMap).forEach(k => {
    if (mainColor.includes(k)) mainHex = colorMap[k];
  });

  let subHex = '#3b82f6';
  Object.keys(colorMap).forEach(k => {
    if (subColor.includes(k)) subHex = colorMap[k];
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 800" width="100%" height="100%">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="${mainHex}"/>
        <stop offset="100%" stop-color="#090d16"/>
      </linearGradient>
    </defs>
    <rect width="640" height="800" fill="url(#bgGrad)"/>
    <circle cx="320" cy="360" r="160" fill="white" fill-opacity="0.08"/>
    <path d="M320,300 C320,250 360,250 345,225" stroke="${subHex}" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M200,380 L320,300 L440,380 Z" stroke="${subHex}" stroke-width="8" stroke-linejoin="round" stroke-linecap="round" fill="none"/>
    <text x="320" y="540" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="900" font-size="36" text-anchor="middle" letter-spacing="2">SYNK CLOSET</text>
    <text x="320" y="585" fill="#ffffff" fill-opacity="0.6" font-family="monospace" font-size="18" text-anchor="middle">SERIAL #S${Math.floor(Math.random() * 90000 + 10000)}</text>
    <text x="320" y="710" fill="#ffffff" font-family="system-ui, sans-serif" font-weight="bold" font-size="22" text-anchor="middle">${style.split(' (')[0]} 스타일</text>
    <circle cx="280" cy="640" r="24" fill="${mainHex}" stroke="white" stroke-width="3"/>
    <circle cx="360" cy="640" r="24" fill="${subHex}" stroke="white" stroke-width="3"/>
  </svg>`;
  
  try {
    return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
  } catch (e) {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }
};

const getItemImageUrl = (item: ClothingItem) => {
  if (item.imageUrl && item.imageUrl.trim() !== '') {
    return item.imageUrl;
  }
  const materialLabel = item.material ? MATERIAL_MAP[item.material].label : '코튼';
  return generateSvgFallback(item.color || '쥐색', item.texture || '초록', materialLabel || '어반 캐주얼');
};

export const Closet: React.FC<ClosetProps> = ({ onNavigate }) => {
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ClothingItem | null>(null);

  // Manual creation state
  const [newItem, setNewItem] = useState<Partial<ClothingItem>>({
    material: 'cotton',
    name: '',
    description: '',
    price: 59000,
    wearCount: 2,
    daysSinceLastWorn: 45,
  });

  // Selected item custom styling setup state
  const [currentTemp, setCurrentTemp] = useState('28도, 맑음');
  const [selectedPrice, setSelectedPrice] = useState(59000);
  const [selectedWearCount, setSelectedWearCount] = useState(2);
  const [selectedDaysSince, setSelectedDaysSince] = useState(45);

  // Analysis result state
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [scanningStatus, setScanningStatus] = useState('');
  const [analysisResult, setAnalysisResult] = useState<ClosetAnalysisResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem('synk_touch_closet');
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error('Failed to load closet', e);
      }
    }
  }, []);

  const saveToStorage = (newItems: ClothingItem[]) => {
    localStorage.setItem('synk_touch_closet', JSON.stringify(newItems));
    setItems(newItems);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewItem(prev => ({ ...prev, imageUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = () => {
    if (!newItem.name || !newItem.imageUrl) {
      speechService.speak('이름과 사진을 입력해주세요.');
      return;
    }
    const item: ClothingItem = {
      id: Date.now().toString(),
      name: newItem.name,
      description: newItem.description || '',
      material: newItem.material as any,
      price: Number(newItem.price) || 59000,
      wearCount: Number(newItem.wearCount) || 2,
      daysSinceLastWorn: Number(newItem.daysSinceLastWorn) || 45,
      imageUrl: newItem.imageUrl,
      category: 'Top', // default
      color: 'Default',
      texture: 'Default',
      createdAt: Date.now(),
    };
    const updated = [item, ...items];
    saveToStorage(updated);
    setIsUploading(false);
    setNewItem({ 
      material: 'cotton', 
      name: '', 
      description: '',
      price: 59000,
      wearCount: 2,
      daysSinceLastWorn: 45,
    });
    speechService.speak(`${item.name}이 옷장에 완료 저장되었습니다.`);
  };

  const deleteItem = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = items.filter(i => i.id !== id);
    saveToStorage(updated);
    speechService.speak('삭제 완료되었습니다.');
  };

  const handlePointerMove = (item: ClothingItem) => {
    if (item.material && MATERIAL_MAP[item.material]) {
      hapticService.vibrate(MATERIAL_MAP[item.material].pattern);
    }
  };

  // Launch real server-side analysis
  const analyzeClosetItem = async (item: ClothingItem) => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setAnalysisResult(null);
    hapticService.tap();
    speechService.speak('등록된 옷 정보와 오늘 날씨 융합 분석을 구동합니다.');

    const statuses = [
      '소재 텍스처 밀도 연산 중...',
      '세탁 가이드라인 매칭 중...',
      '기온 데이터 시너지 감지 중...',
      '비쥬얼 코디 추천 레이아웃 구성 중...',
      '소비가치 CPW 가성비 연산 중...',
      '리스타일링 구출 미션 분석 완료!'
    ];

    // Read profile name for customized speech
    const savedProfile = localStorage.getItem('synk_profile');
    const profile = savedProfile ? JSON.parse(savedProfile) : null;
    const userName = profile?.name || '사용자';

    for (let i = 0; i <= 100; i += 5) {
      await new Promise(r => setTimeout(r, 55));
      setAnalysisProgress(i);
      
      const statusIdx = Math.min(Math.floor((i / 100) * statuses.length), statuses.length - 1);
      setScanningStatus(statuses[statusIdx]);

      if (i % 20 === 0) {
        hapticService.vibrate(HapticPattern.DENIM);
      }
    }

    try {
      const response = await fetch('/api/closet-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_name: userName,
          current_temperature: currentTemp,
          clothes_name: item.name,
          clothes_material: item.material ? MATERIAL_MAP[item.material].label : ' cotton 100%',
          clothes_price: selectedPrice,
          wear_count: selectedWearCount,
          days_since_last_worn: selectedDaysSince,
        }),
      });

      const data = await response.json();
      setAnalysisResult(data);

      hapticService.success();

      // Read a friendly summary aloud
      const summaryMsg = `가성비 등급은 ${data.closet_efficiency_stats?.efficiency_grade}입니다. 1회 착용당 비용은 ${data.closet_efficiency_stats?.cost_per_wear}원입니다. 구출 미션을 확인해보세요.`;
      speechService.speak(summaryMsg);

    } catch (err) {
      console.error(err);
      speechService.speak('진단 중 상태가 원활하지 않습니다. 다시 시도해 주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Pre-fill selection variables when an item is selected
  const handleSelectItem = (item: ClothingItem) => {
    setSelectedItem(item);
    setSelectedPrice(item.price ?? 59000);
    setSelectedWearCount(item.wearCount ?? 2);
    setSelectedDaysSince(item.daysSinceLastWorn ?? 45);
    setAnalysisResult(null);
  };

  const hapticSupported = hapticService.isSupported();

  return (
    <div className="h-full flex flex-col bg-synk-offwhite overflow-hidden text-left">
      <header className="px-6 py-8 pb-4 flex items-center justify-between text-synk-navy bg-white/80 backdrop-blur-md sticky top-0 z-20 shadow-sm">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => onNavigate(AppScreen.HOME)}
            className="p-4 rounded-3xl bg-synk-offwhite text-synk-navy hover:bg-synk-blue/10 active:scale-95 transition-all"
            aria-label="로비로 가기"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>
          <h1 className="text-4xl font-display font-black tracking-tighter uppercase leading-none">Touch Closet</h1>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => onNavigate(AppScreen.ANALYSIS)}
            className="p-4 rounded-3xl bg-synk-cyan text-white shadow-xl shadow-synk-cyan/20 active:scale-95 transition-all"
            aria-label="AI 실시간 의류 분석 카메라"
          >
            <Camera className="w-8 h-8" />
          </button>
          <button 
            onClick={() => setIsUploading(true)}
            className="p-4 rounded-3xl bg-synk-blue text-white shadow-xl shadow-synk-blue/20 active:scale-95 transition-all"
            aria-label="신규 옷 수동 등록"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto px-6 pb-40 custom-scrollbar bg-white">
        {/* Info banners */}
        <div className="mb-8 mt-4 p-5 bg-synk-offwhite rounded-3xl space-y-4">
          <p className="text-sm font-bold text-synk-navy leading-relaxed">
            "등록하신 옷 정보와 날씨 정보를 융합 진단하여 맞춤형 세탁 방법, 기온 최적화 코디, 그리고 Cost Per Wear(가성비) 수치 및 깜짝 구출 챌린지를 선사합니다."
          </p>
          <div className="flex flex-col gap-2 p-4 bg-amber-50 rounded-2xl border border-amber-500/10">
            <div className="flex items-start gap-2">
              <Info className="w-5 h-5 text-amber-800 mt-0.5 flex-shrink-0" />
              <div className="space-y-1 text-left">
                <p className="text-xs font-black text-amber-800">💡 촉각(햅틱) 감각 체험법</p>
                <p className="text-[10px] font-bold text-amber-700 leading-normal">
                  저장된 옷을 누르고 <strong>메인 이미지 위를 손가락으로 가볍게 문지르면</strong> 직물 짜임새에 따라 커스텀 진동이 방사됩니다. 진동 모드에서 고품질 성능을 냅니다.
                </p>
              </div>
            </div>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="py-24 flex flex-col items-center justify-center text-synk-grey/40 text-center gap-6">
            <Shirt className="w-24 h-24 stroke-[1px] animate-pulse text-synk-blue" />
            <p className="text-xl font-bold">등록된 옷이 존재하지 않습니다.<br/>상단 우측 + 버튼으로 등록해 주세요!</p>
          </div>
        ) : (
          <div className="columns-2 gap-4 space-y-4">
            {items.map((item) => (
              <motion.div 
                key={item.id}
                onClick={() => handleSelectItem(item)}
                className="break-inside-avoid bg-white rounded-3xl overflow-hidden shadow-md border border-synk-navy/5 relative group cursor-pointer active:scale-95 transition-transform"
              >
                <img src={getItemImageUrl(item)} alt={item.description} className="w-full h-auto object-cover" />
                <div className="p-4 bg-white text-left">
                  <h3 className="font-black text-sm text-synk-navy truncate mb-1">{item.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className="text-[9px] font-black text-synk-blue bg-synk-blue/5 px-2.5 py-1 rounded-full uppercase">
                      {item.material ? MATERIAL_MAP[item.material].label : '면'}
                    </span>
                    <button 
                      onClick={(e) => deleteItem(item.id, e)}
                      className="p-1.5 text-synk-grey hover:text-red-500 transition-colors"
                      aria-label="의류 삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Upload Modal with extra fields */}
      <AnimatePresence>
        {isUploading && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-synk-navy/80 backdrop-blur-sm p-6 flex items-center justify-center text-left"
          >
            <motion.div 
              initial={{ y: 50, scale: 0.9 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 50, scale: 0.9 }}
              className="bg-white w-full max-w-md rounded-[3rem] p-8 space-y-6 overflow-y-auto max-h-[90vh] custom-scrollbar"
            >
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-black text-synk-navy">내 옷 등록 설정</h2>
                <button onClick={() => setIsUploading(false)} className="p-2 bg-synk-offwhite rounded-full text-synk-grey active:scale-90 transition-transform">
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div 
                onClick={() => fileInputRef.current?.click()}
                className="aspect-square bg-synk-offwhite rounded-[2rem] border-4 border-dashed border-synk-navy/10 flex flex-col items-center justify-center gap-4 cursor-pointer overflow-hidden relative active:scale-98 transition-transform"
              >
                {newItem.imageUrl ? (
                  <>
                    <img src={newItem.imageUrl} className="w-full h-full object-cover" alt="Preview" />
                    <div className="absolute inset-0 bg-black/25 flex items-center justify-center text-white font-bold backdrop-blur-[2px]">
                      사진 재등록하기
                    </div>
                  </>
                ) : (
                  <>
                    <Camera className="w-12 h-12 text-synk-blue" />
                    <span className="font-bold text-synk-grey text-sm">의류 실사 또는 견본 사진 업로드</span>
                  </>
                )}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  placeholder="옷 명칭 (예: 린넨 오버핏 셔츠)" 
                  value={newItem.name}
                  onChange={e => setNewItem(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full h-14 px-6 bg-synk-offwhite rounded-2xl font-bold border-2 border-transparent focus:border-synk-blue outline-none transition-all text-sm"
                />
                
                <textarea 
                  placeholder="설명 또는 느낌 코멘트 (예: 통기성 좋고 상큼한 카멜 캐주얼)" 
                  value={newItem.description}
                  onChange={e => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full h-24 p-5 bg-synk-offwhite rounded-2xl font-bold border-2 border-transparent focus:border-synk-blue outline-none transition-all resize-none text-sm"
                />

                {/* Material Select */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-synk-grey uppercase px-2">직물 소재</label>
                  <div className="grid grid-cols-4 gap-2">
                    {(Object.keys(MATERIAL_MAP) as Array<keyof typeof MATERIAL_MAP>).map(key => (
                      <button
                        key={key}
                        onClick={() => setNewItem(prev => ({ ...prev, material: key }))}
                        className={`py-2 rounded-xl font-bold text-xs border transition-all ${
                          newItem.material === key 
                            ? 'bg-synk-blue text-white border-synk-blue shadow-md' 
                            : 'bg-synk-offwhite text-synk-navy border-transparent hover:bg-neutral-200'
                        }`}
                      >
                        {MATERIAL_MAP[key].label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Additional Inputs for AI Core */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black text-synk-grey px-1">구매 가격 (원)</label>
                    <input 
                      type="number"
                      value={newItem.price}
                      onChange={e => setNewItem(prev => ({ ...prev, price: Number(e.target.value) }))}
                      className="w-full h-12 px-4 bg-synk-offwhite rounded-xl font-bold text-xs"
                      min="0"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black text-synk-grey px-1">착용 회수 (회)</label>
                    <input 
                      type="number"
                      value={newItem.wearCount}
                      onChange={e => setNewItem(prev => ({ ...prev, wearCount: Number(e.target.value) }))}
                      className="w-full h-12 px-4 bg-synk-offwhite rounded-xl font-bold text-xs"
                      min="0"
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-synk-grey px-1">마지막 착용 후 경과일 (일)</label>
                  <input 
                    type="number"
                    value={newItem.daysSinceLastWorn}
                    onChange={e => setNewItem(prev => ({ ...prev, daysSinceLastWorn: Number(e.target.value) }))}
                    className="w-full h-12 px-4 bg-synk-offwhite rounded-xl font-bold text-xs"
                    min="0"
                  />
                </div>
              </div>

              <AccessibleButton 
                label="옷장에 등록 저장하기"
                variant="primary"
                onClick={addItem}
                className="h-16 text-lg font-black rounded-2xl"
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal with real Gemini closet parsing layout */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-white p-6 flex flex-col text-left"
          >
            <header className="flex items-center justify-between mb-6">
              <button 
                onClick={() => {
                  setSelectedItem(null);
                  setAnalysisResult(null);
                }}
                className="p-4 rounded-3xl bg-synk-offwhite text-synk-navy active:scale-95 transition-all"
              >
                <ChevronLeft className="w-8 h-8" />
              </button>
              <h2 className="text-xl font-black text-synk-navy uppercase tracking-tighter">Clothing Analysis</h2>
              <div className="w-16" />
            </header>

            <div className="flex-1 flex flex-col gap-6 overflow-y-auto custom-scrollbar pb-16">
              
              {/* Image Touch Experience section */}
              <div className="relative group w-full h-[300px] sm:h-[350px] shrink-0 bg-synk-offwhite rounded-[2.5rem] overflow-hidden shadow-xl">
                <img 
                  src={getItemImageUrl(selectedItem)} 
                  alt={selectedItem.description}
                  className="w-full h-full object-cover select-none pointer-events-none"
                />
                
                {/* Haptic Interaction Zone */}
                <div 
                  className="absolute inset-0 cursor-crosshair touch-none"
                  onPointerDown={() => hapticService.tap()}
                  onPointerMove={() => handlePointerMove(selectedItem)}
                  onPointerUp={() => hapticService.stop()}
                  onPointerLeave={() => hapticService.stop()}
                >
                  <div className="absolute inset-0 bg-synk-blue/5 opacity-0 group-active:opacity-100 transition-opacity flex items-center justify-center">
                    <div className="bg-white/25 backdrop-blur-md rounded-full p-6 border border-white/30">
                      <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Informational description */}
              <div className="bg-synk-offwhite rounded-3xl p-6 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-2xl font-black text-synk-navy leading-none">{selectedItem.name}</h3>
                  <span className="px-3 py-1 bg-synk-blue text-white rounded-full text-[10px] font-black uppercase tracking-widest">
                    {selectedItem.material ? MATERIAL_MAP[selectedItem.material].label : 'cotton'}
                  </span>
                </div>
                <p className="text-sm font-semibold text-synk-navy/70 leading-relaxed">
                  {selectedItem.description || "등록된 코멘트가 없습니다."}
                </p>
                <p className="text-[10px] font-black text-synk-blue italic text-center pt-2 border-t border-synk-navy/5">
                  👉 "위 이미지 영역을 슥슥 손가락으로 문지르면 소재별 햅틱 질감이 뿜어집니다."
                </p>
              </div>

              {/* Dynamic parameters for Wardrobe Engine tests */}
              {!isAnalyzing && (
                <div className="bg-white border-2 border-synk-offwhite rounded-3xl p-6 space-y-5">
                  <div className="flex items-center gap-2 border-b border-synk-offwhite pb-3">
                    <Sparkles className="w-5 h-5 text-synk-blue" />
                    <h4 className="text-sm font-black text-synk-navy">스마트 진단 융합 변수</h4>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Temperature custom setting */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-synk-grey flex items-center gap-1">
                        <Sun className="w-3" /> 매칭 날씨 기온
                      </label>
                      <select 
                        value={currentTemp} 
                        onChange={e => setCurrentTemp(e.target.value)}
                        className="w-full py-2 bg-synk-offwhite rounded-xl text-xs font-bold font-mono px-2"
                      >
                        <option value="28도, 무더운 맑음">28도, 맑음 (한여름)</option>
                        <option value="21도, 선선하고 쾌적함">21도, 선선함 (늦봄/초가을)</option>
                        <option value="12도, 산들 가을바람">12도, 쌀쌀함 (늦가을)</option>
                        <option value="3도, 차가운 한파">3도, 추움 (겨울)</option>
                      </select>
                    </div>

                    {/* Price custom setting */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-synk-grey flex items-center gap-1">
                        <Coins className="w-3" /> 옷 구매 가격 (₩)
                      </label>
                      <input 
                        type="number" 
                        value={selectedPrice}
                        onChange={e => setSelectedPrice(Number(e.target.value))}
                        className="w-full py-2 bg-synk-offwhite rounded-xl text-xs font-bold font-mono px-3"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    {/* Wear count customized counter */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-synk-grey">총 착용 횟수 (CPW 영향)</label>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setSelectedWearCount(prev => Math.max(0, prev - 1))}
                          className="w-8 h-8 rounded-lg bg-synk-offwhite hover:bg-neutral-200 font-bold active:scale-90 transition-transform"
                        >
                          -
                        </button>
                        <span className="flex-1 text-center font-bold font-mono text-sm">{selectedWearCount}회</span>
                        <button 
                          onClick={() => setSelectedWearCount(prev => prev + 1)}
                          className="w-8 h-8 rounded-lg bg-synk-offwhite hover:bg-neutral-200 font-bold active:scale-90 transition-transform"
                        >
                          +
                        </button>
                      </div>
                    </div>

                    {/* Days since last worn custom slider */}
                    <div className="space-y-1.5 text-left">
                      <label className="text-[10px] font-black text-synk-grey">미착용 방치 일수 ({selectedDaysSince}일)</label>
                      <input 
                        type="range"
                        min="1"
                        max="120"
                        value={selectedDaysSince}
                        onChange={e => setSelectedDaysSince(Number(e.target.value))}
                        className="w-full h-2 bg-synk-offwhite rounded-lg appearance-none cursor-pointer accent-synk-blue mt-3"
                      />
                    </div>
                  </div>

                  <AccessibleButton 
                    label="AI 스마트 스타일 기온 진단"
                    onClick={() => analyzeClosetItem(selectedItem)}
                    className="w-full h-14 bg-synk-blue text-white rounded-2xl flex items-center justify-center gap-2.5 font-black flex-row shadow-lg shadow-synk-blue/20"
                    icon={<Sparkles className="w-4 h-4" />}
                  />
                </div>
              )}

              {/* Loader percentage panel */}
              {isAnalyzing && (
                <div className="bg-synk-blue/5 rounded-3xl p-8 border border-synk-blue/10 flex flex-col items-center justify-center gap-4 py-12">
                  <div className="w-16 h-16 rounded-full border-4 border-synk-blue/20 border-t-synk-blue animate-spin" />
                  <div className="text-xl font-black text-synk-blue font-mono">{analysisProgress}%</div>
                  <p className="text-xs font-black text-synk-navy/60 uppercase tracking-widest animate-pulse">{scanningStatus}</p>
                </div>
              )}

              {/* Show Rich Gemini JSON responses */}
              {analysisResult && !isAnalyzing && (
                <motion.div 
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-6"
                >
                  {/* Category 1: Laundry Care Tips */}
                  <div className="bg-white rounded-3xl p-6 border-l-4 border-l-cyan-400 border border-neutral-100 shadow-md text-left space-y-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-cyan-50 text-cyan-500 rounded-full flex items-center justify-center font-bold">🧼</div>
                      <h4 className="text-sm font-black text-synk-navy">소재 맞춤 세탁 가이드 ({analysisResult.laundry_and_care?.material_detected})</h4>
                    </div>
                    <div className="space-y-2">
                      <p className="text-xs font-bold text-synk-navy/80 leading-relaxed bg-cyan-50/30 p-3 rounded-xl border border-cyan-400/5">
                        💡 <strong>세탁 팁:</strong> {analysisResult.laundry_and_care?.washing_tip}
                      </p>
                      <p className="text-xs font-bold text-amber-700 leading-relaxed bg-amber-50/50 p-3 rounded-xl border border-amber-400/5">
                        ⚠️ <strong>관리 주의:</strong> {analysisResult.laundry_and_care?.care_caution}
                      </p>
                    </div>
                  </div>

                  {/* Category 2: Weather & Styling coordination */}
                  <div className="bg-white rounded-3xl p-6 border-l-4 border-l-synk-cyan border border-neutral-100 shadow-md text-left space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-teal-50 text-teal-500 rounded-full flex items-center justify-center font-bold">⛅</div>
                      <h4 className="text-sm font-black text-synk-navy">오늘 날씨 기온 & 코디 추천</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-neutral-50 rounded-xl">
                        <p className="text-[10px] font-black text-synk-grey mb-1 uppercase tracking-wider">날씨 및 소재 매치도</p>
                        <p className="text-xs font-bold text-synk-navy/80 leading-relaxed">
                          {analysisResult.weather_material_coordination?.weather_suitability}
                        </p>
                      </div>

                      <div className="p-3 bg-synk-cyan/5 rounded-xl border border-synk-cyan/10">
                        <p className="text-[10px] font-black text-synk-cyan mb-1 uppercase tracking-wider">추천 레이어드 코디제안</p>
                        <p className="text-xs font-bold text-synk-navy/90 leading-relaxed">
                          {analysisResult.weather_material_coordination?.recommended_styling}
                        </p>
                      </div>

                      {(analysisResult.weather_material_coordination?.texture_match_tip || analysisResult.weather_material_coordination?.text_match_tip) && (
                        <div className="p-3 bg-neutral-50 rounded-xl">
                          <p className="text-[10px] font-black text-synk-grey mb-1 uppercase tracking-wider">촉감 감각 추천 촉감 매칭</p>
                          <p className="text-xs font-bold text-synk-navy/70 leading-relaxed">
                            {analysisResult.weather_material_coordination?.texture_match_tip || analysisResult.weather_material_coordination?.text_match_tip}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Category 3: Financial CPW stats & Rescue challenge */}
                  <div className="bg-white rounded-3xl p-6 border-l-4 border-l-synk-blue border border-neutral-100 shadow-md text-left space-y-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 bg-indigo-50 text-indigo-500 rounded-full flex items-center justify-center font-bold">📈</div>
                      <h4 className="text-sm font-black text-synk-navy font-display">CLOSET EFFICIENCY (CPW)</h4>
                    </div>

                    <div className="grid grid-cols-2 gap-4 border-b border-synk-offwhite pb-4">
                      <div className="p-3 bg-indigo-50/20 rounded-xl">
                        <p className="text-[9px] font-black text-synk-grey uppercase tracking-widest">착용당 비용 (CPW)</p>
                        <p className="text-base font-black text-synk-blue font-mono">
                          {analysisResult.closet_efficiency_stats?.cost_per_wear?.toLocaleString()}원
                        </p>
                      </div>
                      <div className="p-3 bg-indigo-50/20 rounded-xl">
                        <p className="text-[9px] font-black text-synk-grey uppercase tracking-widest">옷장 효율 가성비 등급</p>
                        <p className="text-xs font-black text-synk-navy leading-normal pt-1">
                          {analysisResult.closet_efficiency_stats?.efficiency_grade}
                        </p>
                      </div>
                    </div>

                    {/* Restyling rescue challenge message */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-black text-synk-navy">
                        {analysisResult.closet_efficiency_stats?.rescue_challenge?.is_dormant ? (
                          <span className="text-amber-500 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded-md">
                            <AlertTriangle className="w-3.5" /> 잠든 옷 발견!
                          </span>
                        ) : (
                          <span className="text-synk-cyan flex items-center gap-0.5 bg-synk-cyan/5 px-2 py-0.5 rounded-md">
                            🎯 슬기로운 옷생활 가이드
                          </span>
                        )}
                      </div>
                      <div className="p-4 bg-indigo-50/50 rounded-2xl border border-synk-blue/5 leading-relaxed text-xs font-bold text-synk-navy/80">
                        {analysisResult.closet_efficiency_stats?.rescue_challenge?.challenge_message}
                      </div>
                    </div>
                  </div>

                </motion.div>
              )}

            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
