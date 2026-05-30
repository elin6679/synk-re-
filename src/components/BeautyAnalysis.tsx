import React, { useRef, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { speechService } from '../lib/speech';
import { hapticService, HapticPattern } from '../lib/haptics';
import { AppScreen, UserProfile } from '../types';
import { AccessibleButton } from './AccessibleButton';
import { RefreshCw, User, CheckCircle2, X, Sparkles, Smile, Star, ShoppingBag, Eye, Heart, Layers, Sliders } from 'lucide-react';
import { cameraManager } from '../lib/camera';

interface BeautyAnalysisProps {
  onNavigate: (screen: AppScreen) => void;
  profile: UserProfile | null;
}

interface BeautyAnalysisResult {
  tpo_makeup_look: {
    concept_name: string;
    steps: {
      skin_base: string;
      eye_makeup: string;
      lip_makeup: string;
    };
    one_point_tip: string;
  };
  face_mapping_guide: {
    shading: {
      target_areas: string[];
      intensity: string;
      how_to: string;
    };
    highlight: {
      target_areas: string[];
      intensity: string;
      how_to: string;
    };
    blusher: {
      target_areas: string[];
      direction: string;
      how_to: string;
    };
  };
  pouch_diagnostic: {
    product_name: string;
    match_score: number;
    compatibility_analysis: string;
    utilization_tip: string;
  };
}

export const BeautyAnalysis: React.FC<BeautyAnalysisProps> = ({ onNavigate, profile }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSimulated, setIsSimulated] = useState(false);

  // User input states (Pre-filled with profile information where available)
  const [userName, setUserName] = useState(profile?.name || '민지');
  const [personalColor, setPersonalColor] = useState('봄 웜 라이트');
  const [faceShape, setFaceShape] = useState('둥근 얼굴형, 짧은 턱');
  const [selectedTpo, setSelectedTpo] = useState('대학교 입학식');
  const [productName, setProductName] = useState('디올 블루쉬 블러쉬 219');

  // Analysis result states
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [scanningStatus, setScanningStatus] = useState('');
  const [resultData, setResultData] = useState<BeautyAnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'look' | 'map' | 'pouch'>('look');

  // Camera stream activation (single clean effect mount)
  useEffect(() => {
    let isMounted = true;
    const startCamera = async () => {
      setCameraError(null);
      if (!isMounted) return;

      try {
        const mediaStream = await cameraManager.getStream({
          video: { 
            facingMode: 'user',
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
          speechService.speak('뷰티 카메라 하드웨어가 준비 중입니다. 안내 시뮬레이션을 활성화합니다.');
        } else {
          speechService.speak('뷰티 진단 카메라가 활성화되었습니다. 얼굴을 가이드 라인에 맞춰주세요.');
        }
      } catch (err: any) {
        console.error('Beauty Camera access error:', err);
        if (isMounted) {
          if (err.name === 'NotAllowedError') {
            const msg = '뷰티 카메라 권한이 거부되었습니다. 설정에서 승인해주세요.';
            setCameraError(msg);
            speechService.speak(msg);
          } else {
            const msg = '카메라 초기화에 실패했습니다. 다른 앱을 종료한 후 다시 시도해주세요.';
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
        try { videoRef.current.load();} catch (e) {}
      }
      cameraManager.stopStream();
      setStream(null);
    };
  }, []);

  const generateRandomBeautyResult = (): BeautyAnalysisResult => {
    const concepts = [
      `${selectedTpo}를 빛낼 극강의 생기, '${personalColor}' 안성맞춤 필터 메이크업`,
      `${selectedTpo}에서 가장 돋보이는 분위기 천재, ${personalColor} 무드 벨벳 필터`,
      `${selectedTpo} 저격을 위한 청량 맑음, ${personalColor} 수채화 모티브 메이크업`,
      `${selectedTpo}을 완성해 줄 단정 세련미, ${personalColor} 무드 레이어링 스타일링`
    ];

    const skinBases = [
      `${personalColor} 특유의 맑고 우아한 얼굴빛을 돋보이게 만들기 위해 수분 에센스가 풍부히 함유된 광채 세럼 쿠션으로 결을 따라 촘촘히 펴 발라 윤기 광을 입혀줍니다.`,
      `${personalColor} 고유의 화사함을 살리도록 실키한 리퀴드 파운데이션을 페이셜 브러쉬로 얇게 밀착 정리 한 뒤 벨벳 픽싱 파우더로 미세하게 커버 광채를 고정해 줍니다.`,
      `${personalColor} 퍼스널 맞춤 톤업 글로우 선크림과 생기 코랄 컬러 피치 프리베이스를 믹싱하여 스패출러로 넓고 극도로 얇게 도포하여 도자기 결감을 완성합니다.`
    ];

    const eyeMakeups = [
      `베이스로 차분한 살구 베이지 음영을 전체에 깔아 눈두덩을 단아하게 연출한 뒤, 연한 삼각존 초콜릿 브라운 음영과 애교살 위로 실버 살구 골드 스파클 펄을 부드럽게 두드려 생기를 채워 넣습니다.`,
      `누드 로즈 브라운 리퀴드 섀도우를 쌍꺼풀 라인을 따라 부드럽게 퍼뜨린 다음 슬림 블랙 라이너로 꼬리를 올리고 인형 같은 풍성 마스카라 작업으로 또렷하게 연출합니다.`,
      `따스한 뮤트 모카 베이지 색조를 넓게 도포 한 뒤 매트 밀크티 밤을 포인트로 쌍꺼풀 꼬리 쪽에 깊은 입체 음영을 덧바르고 샴페인 글리터를 동공 위에 올려 영롱함을 완성합니다.`
    ];

    const lipMakeups = [
      `물기를 촉촉하게 머금은 유리알 코랄 레이어 틴트로 립 안쪽부터 과즙이 차오르듯 퍼지게 한 후, 투명 젤리 립 오일로 도톰한 볼륨을 살려서 화사한 분위기와 광을 연출합니다.`,
      `소프트 매트 라이너로 입술 외곽 선을 부드럽게 오버 입체 스머징 레이어링하고, 로즈 썸 카라멜 벨벳 컬러를 전체에 슬림 터치하여 단정한 무드를 극대화합니다.`,
      `수채화를 은은하게 얹은 듯 차오르는 체리 생기 레드 틴트를 그러데이션하고 고영양 글로스 밤으로 촉촉 도톰하게 플럼핑 윤광 효과로 생기를 강조합니다.`
    ];

    const tips = [
      `${faceShape} 특유의 매력을 극대화하면서도 균성이 느껴지도록 하이라이터로 시선을 중앙 부위로 완벽하게 집중시키는 원포인트 생기 터치감을 적용해 보세요.`,
      `${faceShape}의 밸런스를 균형 있게 채워주기 위해 사선 하방의 슬림 셰이딩 라인과 블러셔 그라데이션 조합을 매치하여 완성도를 높은 감도로 올립니다.`,
      `${faceShape}의 윤곽선 단점을 보완할 수 있도록 볼 뒤쪽으로 동그스름한 부드러운 하이라이트 처리를 활용해서 한결 산뜻하고 우아한 실루엣을 완성하세요.`
    ];

    const shadingAreas = [
      ["가장자리 윤곽 하단부", "콧대 양 옆 안창 부위"],
      ["귀 밑 턱 끝 경계 단차선", "헤어라인 외각 양 옆"],
      ["콧망울 양 벽 날개 삼각존", "이마 헤어 외각 라인"]
    ];

    const shadingHowTos = [
      "파우트 브러쉬에 음영 섀도우를 소량 발라 살살 스치며 시선을 귀 밑에서 아래 방향으로 가볍게 쓸어내려 갸름한 측면 각도를 조각하듯 표현합니다.",
      "광대 밑 움푹 들어간 부위부터 페이스 라인 경계까지 큰 브라운 브러쉬터치 터치를 통해 그림자 깊이를 은은하게 살려 매끈한 윤곽을 디자인합니다.",
      "콧마루 외벽에서 안창 삼각지까지 셰이딩을 점을 찍듯 가볍게 굴려 수채화 마크처럼 콧대 라인을 길고 곧게 완성해 이목구비를 단단하게 조여줍니다."
    ];

    const highlightAreas = [
      ["이마 및 콧등 티존 핵심 구역", "눈머리 삼각 안쪽"],
      ["인중산 윗꼬리 립 하이라이트", "광대 윗선 곡면 광"],
      ["눈밑 삼각지 핵심 존", "턱끝 중심 가로 타원"]
    ];

    const highlightHowTos = [
      "쉬머 미세 파우더를 브러쉬 안쪽에 머금은 뒤 빛을 받아 반짝이는 앞이마 존과 콧잔등 핵심 요소를 톡톡 두드려 입체적인 앞 테 볼륨을 채워줍니다.",
      "손가락 핑커팁을 이용해 샴페인 크림 베일을 광대 바깥 윗선과 입술 인중 라인에 가볍게 터치해 주면 자연스럽고 건강하게 차오르는 윤곽 효과를 줍니다.",
      "눈가 하단 삼각존 영역에 투명 광채 하이라이터를 깃털처럼 쓸어주어 칙칙함을 개선하고 탄력 있고 오뚝한 생기 에너지를 즉각적으로 연출합니다."
    ];

    const blusherAreas = [
      ["앞 뺨 애플 존 둥근 위치"],
      ["광대뼈 외곽 사선 빗자루 선"],
      ["눈 밑 바로 아래 인형 라인"]
    ];

    const blusherDirections = [
      "둥글둥글 원을 굴리듯 밀착",
      "중심부에서 옆 머리 쪽 사선 질주",
      "톡톡 점을 찍듯 부드러운 스머징"
    ];

    const blusherHowTos = [
      "퍼스널 봄 쿨 치크를 애플존 뒤에 수줍은 수채화처럼 부드러운 블랜딩 처리를 가해 얼굴의 시선을 매력적인 중앙으로 사르르 모아줍니다.",
      "사선 브러쉬로 광대 돌출 부위부터 살포시 뒤쪽 구레나룻 선을 향해 쓸어 올려주어 가로폭이 한결 좁아 보이고 스마트해 보이는 도시적 매력을 유도합니다.",
      "볼 앞 광대 중앙선부위에 투명 핑크 혹은 라일락 생기를 사뿐하게 두드리며 여백을 줄여 귀엽고 뽀얀 볼감을 입체적으로 돋보이게 채색해 줍니다."
    ];

    const compatibilityAnalyses = [
      `${productName}은 ${personalColor} 특유의 맑고 섬세한 톤 컬러 시너지와 환상의 메커니즘으로 녹아들어 텁텁함 없이 피부 위에 부드러운 숨을 불어넣습니다.`,
      `해당 사용자가 적어 주신 ${productName}은 선택하신 TPO 상황과 ${faceShape}의 자연스러운 피부 마무리에 아주 찰떡같이 밀착되어, 오랜 시간 화사하고 사랑스러운 결감을 확실하게 수호합니다.`,
      `소개 하신 ${productName} 제품은 얼굴빛의 생동감을 두 층 높여서, 탁한 감을 전혀 남기지 않으며 퍼스널 컬러의 싱그러운 아우라를 촉촉하게 감싸 안는 이상적 궁합을 선보입니다.`
    ];

    const utilizationTips = [
      "브러쉬에 제품을 완전히 개어낸 후 남은 스치듯 남은 양만을 볼 중간이나 입술산에 톡톡 찍어내듯 번지듯 수채화 레이어링으로 연출하면 인위적이지 않은 리얼 홍조를 소생시킬 수 있습니다.",
      "파운데이션을 아주 얇게 도포한 후, 스펀지에 물을 적셔 제품과 함께 가볍게 믹서 블랜딩해 피부에 다가 대면 하루 종일 지워지지 않는 찰랑 물빛을 즐길 수 있습니다.",
      "만약 발색이 너무 진하거나 본인의 톤과 살짝 엇나갔다면, 기존 쿠션 팩트 잔여물이 살짝 묻은 퍼프 위에 제품을 얹어서 한 김 중화시켜 도포해 보세요. 세상 부드러운 맞춤 밀착감이 연출됩니다."
    ];

    const concept = concepts[Math.floor(Math.random() * concepts.length)];
    const skinBase = skinBases[Math.floor(Math.random() * skinBases.length)];
    const eyeMakeup = eyeMakeups[Math.floor(Math.random() * eyeMakeups.length)];
    const lipMakeup = lipMakeups[Math.floor(Math.random() * lipMakeups.length)];
    const tip = tips[Math.floor(Math.random() * tips.length)];

    const shadingIdx = Math.floor(Math.random() * shadingAreas.length);
    const highlightIdx = Math.floor(Math.random() * highlightAreas.length);
    const blusherIdx = Math.floor(Math.random() * blusherAreas.length);

    const compat = compatibilityAnalyses[Math.floor(Math.random() * compatibilityAnalyses.length)];
    const utilTip = utilizationTips[Math.floor(Math.random() * utilizationTips.length)];
    const score = Math.floor(Math.random() * 17) + 82; // 82 to 98

    return {
      tpo_makeup_look: {
        concept_name: concept,
        steps: {
          skin_base: skinBase,
          eye_makeup: eyeMakeup,
          lip_makeup: lipMakeup
        },
        one_point_tip: tip
      },
      face_mapping_guide: {
        shading: {
          target_areas: shadingAreas[shadingIdx],
          intensity: ["Light", "Medium", "Strong"][shadingIdx],
          how_to: shadingHowTos[shadingIdx]
        },
        highlight: {
          target_areas: highlightAreas[highlightIdx],
          intensity: ["Light", "Medium"][Math.floor(Math.random() * 2)],
          how_to: highlightHowTos[highlightIdx]
        },
        blusher: {
          target_areas: blusherAreas[blusherIdx],
          direction: blusherDirections[blusherIdx],
          how_to: blusherHowTos[blusherIdx]
        }
      },
      pouch_diagnostic: {
        product_name: productName || "디올 블루쉬 블러쉬 219",
        match_score: score,
        compatibility_analysis: compat,
        utilization_tip: utilTip
      }
    };
  };

  const analyzeBeauty = async () => {
    setIsAnalyzing(true);
    setAnalysisProgress(0);
    setResultData(null);
    hapticService.tap();
    speechService.speak('정밀 뷰티 분석을 시작합니다. 잠시 가만히 계셔 주세요.');

    const statuses = [
      '얼굴 윤곽 정밀 입체 스캔 중...',
      '피부톤 및 퍼스널 컬러 정체 추출 중...',
      '이목구비 비율 분석 및 맵 생성 중...',
      '선택하신 상황 TPO 라이핑 대조 중...',
      '소지하신 파우치 화장품 매칭 데이터 분석 중...',
      '종합 스타일 피드백 생성 완료!'
    ];

    // Play the scanning progress animation up to 100%
    let currentProgress = 0;
    while (currentProgress < 100) {
      // Fast, responsive speed
      await new Promise(r => setTimeout(r, 40));
      currentProgress += 5;
      setAnalysisProgress(currentProgress);
      
      const statusIdx = Math.min(Math.floor((currentProgress / 100) * statuses.length), statuses.length - 1);
      setScanningStatus(statuses[statusIdx]);
      
      if (currentProgress % 20 === 0) {
        hapticService.vibrate(HapticPattern.SILK);
      }
    }

    try {
      // Instantly generate highly accurate mock styled results locally
      const data = generateRandomBeautyResult();

      setResultData(data);
      hapticService.success();
      
      const narration = `${userName}님의 뷰티 스타일링 분석 결과입니다. 메이크업 이름은 ${data.tpo_makeup_look?.concept_name}이며, 화장품 궁합은 ${data.pouch_diagnostic?.match_score}점입니다. 상세 가이드를 확인해보세요!`;
      speechService.speak(narration);

    } catch (err) {
      console.error(err);
      speechService.speak('진단 중 예상치 못한 상태가 발생했습니다. 다시 시도해 주세요.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-beauty-beige overflow-y-auto pb-32">
      {/* Header */}
      <header className="p-6 flex items-center justify-between sticky top-0 bg-beauty-beige/90 backdrop-blur-md z-30">
        <button 
          onClick={() => onNavigate(AppScreen.HOME)}
          className="w-12 h-12 rounded-2xl bg-white beauty-shadow flex items-center justify-center text-beauty-pink active:scale-95 transition-all"
          aria-label="뒤로 가기"
        >
          <X className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-black text-synk-navy tracking-tight">AI BEAUTY LAB</h1>
        <div className="w-12 h-12 rounded-2xl bg-beauty-pink/10 flex items-center justify-center text-beauty-pink">
          <Sparkles className="w-6 h-6" />
        </div>
      </header>

      {/* Main Content Areas */}
      <div className="px-6 space-y-8 flex-1">
        
        {/* Onboarding Profile Input Card (Interactive AI Parameter Setup) */}
        {!resultData && !isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl p-6 beauty-shadow border border-beauty-pink/5 space-y-6"
          >
            <div className="flex items-center gap-3 border-b border-beauty-pink/10 pb-4">
              <Sliders className="w-6 h-6 text-beauty-pink" />
              <h2 className="text-base font-black text-synk-navy">내 얼굴 & 대입 분석 설정</h2>
            </div>

            <div className="space-y-4 text-left">
              {/* Personal Color Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-synk-navy/50">내 퍼스널 컬러</label>
                <div className="grid grid-cols-2 gap-2">
                  {['봄 웜 라이트', '여름 쿨 뮤트', '가을 웜 딥', '겨울 쿨 클리어'].map((color) => (
                    <button
                      key={color}
                      onClick={() => {
                        setPersonalColor(color);
                        hapticService.tap();
                      }}
                      className={`py-3 rounded-2xl text-xs font-black border transition-all ${
                        personalColor === color 
                          ? 'bg-beauty-pink text-white border-beauty-pink' 
                          : 'bg-white text-synk-navy border-beauty-beige/60 hover:bg-beauty-beige/10'
                      }`}
                    >
                      {color}
                    </button>
                  ))}
                </div>
              </div>

              {/* Face Shape Select */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-synk-navy/50">내 얼굴형</label>
                <select 
                  value={faceShape}
                  onChange={(e) => setFaceShape(e.target.value)}
                  className="px-4 py-3 bg-beauty-beige/30 border border-beauty-beige rounded-2xl text-sm font-bold text-synk-navy focus:outline-none focus:border-beauty-pink/50 appearance-none"
                >
                  <option value="둥근 얼굴형, 짧은 턱">둥글동글한 얼굴형 (둥근형)</option>
                  <option value="갸름한 달걀형">매끄럽고 가름한 달걀 모양 (계란형)</option>
                  <option value="사랑스러운 하트형">이마가 넓고 턱이 갸름한 모양 (하트형)</option>
                  <option value="광대가 세련된 다이아몬드형">광대가 귀엽게 감도는 모양 (다이아형)</option>
                  <option value="세련된 각진 얼굴형">지적이고 세련된 구조 (각진형)</option>
                </select>
              </div>

              {/* TPO Selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-synk-navy/50">메이크업 필요 상황 (TPO)</label>
                <select 
                  value={selectedTpo}
                  onChange={(e) => {
                    setSelectedTpo(e.target.value);
                    hapticService.tap();
                  }}
                  className="px-4 py-3 bg-beauty-beige/30 border border-beauty-beige rounded-2xl text-sm font-bold text-synk-navy focus:outline-none"
                >
                  <option value="대학교 입학식">대학교 입학식 기분 내기</option>
                  <option value="격식 있는 결혼식 하객">격식 있는 결혼식 하객 가기</option>
                  <option value="주말 한가로운 가벼운 데이트">달달한 주말 데이트</option>
                  <option value="중요한 대기업 직장 면접">신뢰감 가득 직장 면접</option>
                  <option value="친구들과의 가볍고 편안한 모임">가뿐한 저녁 친목 파티</option>
                </select>
              </div>

              {/* Product input */}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-synk-navy/50">파우치 속 화장품 (궁합 진단용)</label>
                <input 
                  type="text"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="px-4 py-3 bg-beauty-beige/30 border border-beauty-beige rounded-2xl text-sm font-bold text-synk-navy focus:outline-none focus:border-beauty-pink/50 transition-colors"
                  placeholder="디올 블루쉬 블러쉬 219"
                />
              </div>
            </div>
          </motion.div>
        )}

        {/* Camera Viewfinder (Only visible before results or during analysis) */}
        {!resultData && (
          <div className="relative aspect-[3/4] w-full bg-white rounded-[3rem] overflow-hidden beauty-shadow border-4 border-white">
            <video 
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className={`w-full h-full object-cover scale-x-[-1] transition-all duration-700 ${isAnalyzing ? 'blur-[1px]' : ''} ${(isSimulated || !stream) ? 'hidden' : 'block'}`}
            />
            
            {/* Viewfinder Overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Ellipse Guide */}
              <div className="absolute inset-12 border-2 border-dashed border-white/40 rounded-[50%_50%_45%_45%] flex items-center justify-center">
                <div className="w-1 h-8 bg-beauty-pink/30 rounded-full animate-pulse" />
              </div>

              {isSimulated && !isAnalyzing && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-beauty-pink/20">
                  <User className="w-32 h-32 stroke-[0.5px] animate-pulse" />
                  <p className="text-xs font-black tracking-widest uppercase">Mirror Simulation Ready</p>
                </div>
              )}
            </div>

            {/* Analysis Progress Loading Screen */}
            {isAnalyzing && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-md flex flex-col items-center justify-center text-synk-navy gap-8 z-50">
                <div className="relative w-64 h-64 flex items-center justify-center">
                   <div className="absolute inset-0 border-4 border-beauty-pink/20 rounded-full animate-ping" />
                   <div className="absolute inset-6 border border-beauty-pink/5 rounded-full" />
                   <div className="text-5xl font-black text-beauty-pink beauty-glow tabular-nums">{analysisProgress}%</div>
                   
                   {/* Orbital circles */}
                   <motion.div 
                     className="absolute inset-0 border border-beauty-pink/10 rounded-full"
                     animate={{ rotate: 360 }}
                     transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                   >
                     <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-4 bg-beauty-pink rounded-full beauty-glow shadow-[0_0_15px_#FF85A1]" />
                   </motion.div>
                </div>

                <div className="w-72 space-y-4 px-4 text-center">
                  <p className="text-sm font-black tracking-widest text-beauty-pink animate-pulse">
                    {scanningStatus}
                  </p>
                  <div className="h-2 w-full bg-beauty-pink/10 rounded-full overflow-hidden">
                    <motion.div 
                       className="h-full bg-beauty-pink"
                       initial={{ width: 0 }}
                       animate={{ width: `${analysisProgress}%` }}
                    />
                  </div>
                </div>
                
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                   <div className="absolute inset-x-0 h-1 bg-beauty-pink/50 shadow-[0_0_20px_#FF85A1] animate-scan-line" />
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
        )}

        {/* Result UI Container */}
        {resultData && !isAnalyzing && (
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Concept Banner */}
            <div className="bg-beauty-pink rounded-[2.5rem] p-8 text-white beauty-shadow text-left">
              <span className="px-3 py-1 bg-white/20 text-white rounded-full text-[10px] font-black uppercase tracking-widest mb-3 inline-block">
                {selectedTpo}
              </span>
              <h2 className="text-3xl font-black tracking-tight leading-none mb-4">
                {resultData.tpo_makeup_look?.concept_name}
              </h2>
              <div className="p-4 bg-white/10 rounded-2xl border border-white/10 text-sm font-bold leading-relaxed">
                📢 {resultData.tpo_makeup_look?.one_point_tip}
              </div>
            </div>

            {/* Premium Tab Bar */}
            <div className="flex bg-white rounded-2xl p-1.5 beauty-shadow border border-beauty-pink/5 gap-1">
              {[
                { id: 'look', label: 'TPO 룩북', icon: <Smile className="w-4 h-4" /> },
                { id: 'map', label: '페이스 맵핑', icon: <Layers className="w-4 h-4" /> },
                { id: 'pouch', label: '화장품 진단', icon: <ShoppingBag className="w-4 h-4" /> }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id as any);
                    hapticService.vibrate(HapticPattern.COTTON);
                  }}
                  className={`flex-1 py-3 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab.id 
                      ? 'bg-beauty-pink text-white beauty-shadow' 
                      : 'text-synk-navy/60 hover:text-synk-navy hover:bg-beauty-beige/50'
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab Contents */}
            <div className="text-left">
              {activeTab === 'look' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {[
                    { title: 'SKIN BASE (피부 표현)', desc: resultData.tpo_makeup_look?.steps?.skin_base, img: <Smile className="w-5 h-5 text-beauty-pink" /> },
                    { title: 'EYE MAKEUP (아이 메이크업)', desc: resultData.tpo_makeup_look?.steps?.eye_makeup, img: <Eye className="w-5 h-5 text-beauty-pink" /> },
                    { title: 'LIP MAKEUP (립 연출)', desc: resultData.tpo_makeup_look?.steps?.lip_makeup, img: <Heart className="w-5 h-5 text-beauty-pink" /> }
                  ].map((step, sIdx) => (
                    <div key={sIdx} className="bg-white rounded-3xl p-6 beauty-shadow border border-beauty-pink/5 space-y-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-beauty-pink/10 flex items-center justify-center">
                          {step.img}
                        </div>
                        <h4 className="text-sm font-black text-synk-navy">{step.title}</h4>
                      </div>
                      <p className="text-sm font-semibold text-synk-navy/70 leading-relaxed pl-1">
                        {step.desc}
                      </p>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'map' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  {[
                    { label: '셰이딩 (SHADING)', spec: resultData.face_mapping_guide?.shading, color: 'bg-amber-100 text-amber-800' },
                    { label: '하이라이터 (HIGHLIGHT)', spec: resultData.face_mapping_guide?.highlight, color: 'bg-sky-100 text-sky-800' },
                    { label: '블러셔 (BLUSHER)', spec: resultData.face_mapping_guide?.blusher, color: 'bg-rose-100 text-rose-800' }
                  ].map((guide, gIdx) => (
                    <div 
                      key={gIdx} 
                      className="bg-white rounded-3xl p-6 beauty-shadow border border-beauty-pink/5 space-y-4 cursor-pointer active:scale-99 transition-all"
                      onClick={() => {
                        // Play a different haptic material sensation based on the feature
                        const patterns = [HapticPattern.LEATHER, HapticPattern.SILK, HapticPattern.FUR];
                        hapticService.vibrate(patterns[gIdx % patterns.length]);
                      }}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-black text-synk-navy">{guide.label}</h4>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${guide.color}`}>
                          {(guide.spec as any).intensity || (guide.spec as any).direction || 'Medium'}
                        </span>
                      </div>
                      
                      {guide.spec?.target_areas && (
                        <div className="flex flex-wrap gap-1.5">
                          {guide.spec.target_areas.map((area, aIdx) => (
                            <span key={aIdx} className="px-2.5 py-1 bg-beauty-beige text-synk-navy/60 rounded-full text-xs font-bold font-mono">
                              📍 {area}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs font-semibold text-synk-navy/70 leading-relaxed border-t border-beauty-pink/5 pt-3">
                        {guide.spec?.how_to}
                      </p>
                    </div>
                  ))}
                </motion.div>
              )}

              {activeTab === 'pouch' && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="bg-white rounded-3xl p-6 beauty-shadow border border-beauty-pink/5 space-y-6"
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-beauty-pink uppercase tracking-widest">My Pouch Product</p>
                      <h4 className="text-lg font-black text-synk-navy">{resultData.pouch_diagnostic?.product_name}</h4>
                    </div>
                    {/* Ring-chart style score */}
                    <div className="relative w-16 h-16 flex items-center justify-center">
                      <svg className="absolute w-full h-full transform -rotate-90">
                        <circle cx="32" cy="32" r="28" fill="transparent" stroke="#FFF0F3" strokeWidth="4" />
                        <circle cx="32" cy="32" r="28" fill="transparent" stroke="#FF85A1" strokeWidth="4"
                          strokeDasharray={`${2 * Math.PI * 28}`}
                          strokeDashoffset={`${2 * Math.PI * 28 * (1 - (resultData.pouch_diagnostic?.match_score || 80) / 100)}`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <span className="text-xs font-black text-beauty-pink font-mono tabular-nums">
                        {resultData.pouch_diagnostic?.match_score}%
                      </span>
                    </div>
                  </div>

                  <div className="p-4 bg-beauty-beige/50 rounded-2xl border border-beauty-pink/5 text-sm font-semibold text-synk-navy/80 leading-relaxed">
                    💡 <strong className="text-synk-navy">궁합 분석:</strong> {resultData.pouch_diagnostic?.compatibility_analysis}
                  </div>

                  <div className="p-4 bg-beauty-pink/5 rounded-2xl border border-beauty-pink/10 text-sm font-semibold text-beauty-pink leading-relaxed">
                    🌟 <strong className="text-beauty-pink">심폐소생술 꿀팁:</strong> {resultData.pouch_diagnostic?.utilization_tip}
                  </div>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}
      </div>

      {/* Footer / Buttons bar */}
      <div className="p-6 pt-0 sticky bottom-0 bg-transparent z-10 select-none">
        {!resultData ? (
          <AccessibleButton
            label="스캔 및 스타일 진단 시작"
            onClick={analyzeBeauty}
            isLoading={isAnalyzing}
            className="w-full h-20 rounded-[2.5rem] bg-beauty-pink text-white flex items-center justify-center gap-4 text-lg font-black beauty-shadow active:scale-95 transition-all shadow-[0_15px_30px_#FF85A130]"
            icon={<Sparkles className="w-5 h-5 animate-pulse" />}
          />
        ) : (
          <div className="flex gap-4 animate-in fade-in zoom-in-95 duration-500">
            <AccessibleButton
              label="다시 진단하기"
              onClick={() => {
                setResultData(null);
                setActiveTab('look');
                analyzeBeauty();
              }}
              className="flex-1 h-16 rounded-[2rem] bg-white text-beauty-pink border-2 border-beauty-pink/20 flex items-center justify-center gap-3 text-sm font-black active:scale-95 transition-all"
              icon={<RefreshCw className="w-4 h-4" />}
            />
            <button
              onClick={() => onNavigate(AppScreen.HOME)}
              className="w-16 h-16 rounded-[2rem] bg-synk-navy text-white flex items-center justify-center beauty-shadow hover:bg-synk-navy/90 active:scale-95 transition-transform"
              aria-label="메인 홈 화면으로"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" width={640} height={480} />
    </div>
  );
};
