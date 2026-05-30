/**
 * SpeechService handles text-to-speech feedback for SYNK.
 * It provides a simple queue-based or interruption-based speech interface.
 * Custom-tuned for a bright, smiling, and friendly female/cute-character tone.
 */

class SpeechService {
  private lastUtterance: SpeechSynthesisUtterance | null = null;
  private voice: SpeechSynthesisVoice | null = null;
  private enabled: boolean = true;
  private settings = {
    rate: 0.95, // Default leisure pacing (0.95 speed as requested)
    pitch: 1.05, // Lowered from 1.25 to prevent speech stuttering and choppy audio, staying natural and warm
    volume: 1.0,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('synk_speech_enabled');
        if (saved !== null) {
          this.enabled = saved === 'true';
        }
      } catch (e) {}
    }
    this.initVoice();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = () => this.initVoice();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('synk_speech_enabled', enabled ? 'true' : 'false');
      }
    } catch (e) {}
    if (!enabled) {
      this.stop();
    }
  }

  private initVoice() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const voices = window.speechSynthesis.getVoices();
    
    // Filter Korean voices
    const koVoices = voices.filter(v => v.lang.startsWith('ko') || v.lang.startsWith('KO'));
    
    // Sort and prioritize high-quality natural female voices (e.g. Google, Yuna, Microsoft Heami/Sun-Hi)
    this.voice = koVoices.find(v => v.name.includes('Google') || v.name.includes('google')) ||
                 koVoices.find(v => v.name.includes('Yuna') || v.name.includes('yuna')) ||
                 koVoices.find(v => v.name.includes('Seoyeon') || v.name.includes('seoyeon')) ||
                 koVoices.find(v => v.name.includes('Heami') || v.name.includes('heami')) ||
                 koVoices.find(v => v.name.includes('Sun-Hi') || v.name.includes('sun-hi')) ||
                 koVoices.find(v => v.name.includes('Natural') || v.name.includes('natural')) ||
                 koVoices[0] ||
                 voices.find(v => v.lang.startsWith('ko')) ||
                 voices[0];
  }

  /**
   * Transforms mechanical guidance speech into a calm, neat, and highly professional
   * voice tone. Overly playful expressions, "헤헤", cutesy suffixes, and wavy tildes "~" 
   * are cleaned up to ensure a clean and dignified user experience.
   */
  private transformToFriendlyTone(text: string): string {
    const trimmed = text.trim();
    
    // 1. Pristine pre-curated map for accurate, clean, and polite Korean guidance
    const exactFriendlyMap: Record<string, string> = {
      '간단 모드가 선택되었습니다.': '간단 모드가 선택되었습니다. 가장 핵심적인 자극 주파수를 중심으로 실시간 오디오 피드백을 전달합니다.',
      '상세 모드가 선택되었습니다.': '상세 모드가 선택되었습니다. 흐릿하거나 미약한 주파수 성분까지 명확하고 풍부한 소리로 복원합니다.',
      '이름과 사진을 입력해주세요.': '옷의 이름과 사진을 입력해 주시기 바랍니다.',
      '삭제되었습니다.': '선택 항목이 정상적으로 삭제되었습니다.',
      '스캔용 카메라 하드웨어 준비 중입니다. 시뮬레이션 모드를 시작합니다.':
        '스캔용 카메라 장치를 활성화하는 중입니다. 안전한 연습을 위한 시뮬레이션 모드 안내를 시작하겠습니다.',
      '매장용 카메라가 활성화되었습니다.': '매장 스캔 카메라가 작동합니다. 소지하고 계시는 패션 물품이나 잡화를 카메라 정면에 가깝게 비춰 주십시오.',
      'QR 코드를 스캔하고 있습니다.': '택에 표기된 큐알 코드를 스캔하고 있습니다. 잠시만 대기해 주십시오.',
      '정밀 뷰티 분석을 시작합니다. 잠시만 가만히 계셔주세요.':
        '종합 뷰티 정밀 스캔을 개시합니다. 양측의 대칭과 톤 인식을 위해 카메라 중앙을 바라보고 가만히 멈춰 주시기 바랍니다.',
      '뷰티 카메라 하드웨어가 준비 중입니다. 시뮬레이션 모드를 시작합니다.':
        '뷰티 카메라 장치를 준비하는 중입니다. 시뮬레이션 분석 기법을 통하여 과정을 안내해 드리겠습니다.',
      '뷰티 카메라가 활성화되었습니다.': '뷰티 진단 카메라 장치가 준비되었습니다. 가이드라인에 얼굴 위치를 맞춰 주시기 바랍니다.',
      '뷰티 진단 카메라가 활성화되었습니다. 얼굴을 가이드 라인에 맞춰주세요.':
        '뷰티 진단 카메라가 실행되었습니다. 얼굴을 정중앙 동그란 가이드 라인 내부에 평온하게 정렬해 주십시오.',
      '진단 중 오류가 발생했습니다. 다시 시도해주세요.':
        '인식 분석 도중 일시적인 불안정 상태를 경험했습니다. 조명이 선명한 장소로 비춘 후 한 차례만 더 촬영을 시도해 주십시오.',
      '로그인 페이지입니다. 구글 로그인 버튼을 누르거나, 음성 로그인 버튼을 누른 뒤 이메일 주소를 말씀해 주세요. 마이크 차단 시 하단 입력창을 지원합니다.':
        '로그인 화면입니다. 구글 로그인 단추를 누르거나, 마이크 버튼을 통해 이메일을 차분하게 말씀해 주십시오. 마이크 인식 장치를 허용하지 못할 경우 하단 텍스트 입력기를 지원합니다.',
      '이 브라우저에서는 음성 인식을 지원하지 않습니다. 텍스트 입력을 실행해 주세요.':
        '안타깝게도 해당 브라우저는 시스템 마이크 감지 기능을 정밀하게 돕지 못합니다. 아래 단독 텍스트 입력창에서 메일 주소를 입력하십시오.',
      '구글 계정 이메일 주소를 말씀해 주세요.':
        '구글 이메일 연동 주소를 마이크 장치에 가만히 차분하게 흘려 말씀해 주시기 바랍니다.',
      '음성 마이크를 작동할 수 없습니다. 텍스트 직접 입력 모드를 사용해 주세요.':
        '시스템의 마이크 장치 연결에 실패하였습니다. 하단의 기입 양식기를 직접 사용하여 입력하십시오.',
      '음성 및 구글 로그인 화면으로 변경했습니다.':
        '구글 소셜 연동과 음성 기재 방식이 마련된 보안 로그인 화면으로 전개하였습니다.',
      '이메일 직접 입력 및 데모 계정 로그인 화면으로 변경했습니다.':
        '키패드를 이용하여 수동으로 계정을 기입하실 수 있는 체험 모드로 화면을 연동 변경했습니다.',
      '이메일 주소 직접 입력 주소창입니다. 키패드로 주소를 입력하세요.':
        '이메일 입력 공간입니다. 아래의 자판 자판을 활용하셔서 주소를 바르고 차분하게 작성해 주시기 바랍니다.',
      '입력한 이메일로 로그인하기 단추': '가입하신 이메일 확인을 통한 접속 테스트 프로세스를 시작하겠습니다.',
      '등록된 사용자 정보 메일을 선택했습니다. 로그인 단추를 눌러 진행해 주세요.':
        '등록 사용자 메일 주소를 인식하였습니다. 오른쪽의 확인 단추를 클릭하여 주시기 바랍니다.',
      '등록된 사용자 정보 메일을 선택했습니다. 오른쪽 로그인 단추를 클릭하세요.':
        '소중한 연결 상태를 감지하였습니다. 우측 편에 자리 잡은 확인 버튼을 클릭하고 잠시 기다리십시오.',
      '일반 게스트 메일을 탑승했습니다.': '게스트 공통 가입 주소를 선택하였습니다. 본 가이드 로비로 여정을 시작하겠습니다.',
      '게스트 전용 이메일을 선택했습니다.': '간편 점검용 게스트 메일 주소 선택을 완료하였습니다.',
      '유효한 이메일 주소를 입력해 주세요.': '유효한 이메일 양식 형태에 맞지 않습니다. 이메일을 정확한 형태로 재작성하십시오.',
      '카메라 하드웨어 준비 중입니다. 시뮬레이션 모드를 시작합니다.':
        '스마트 의류 인식 렌즈를 활성화하는 중입니다. 시스템 가상 시뮬레이션을 통하여 우선 체험을 안내합니다.',
      '카메라가 활성화되었습니다.': '의상 분석용 스마트 비전 장치가 정상 실행되었습니다. 분석 대상을 카메라 렌즈 상단에 근접해 주십시오.',
      '스타일 스캔 카메라가 활성화되었습니다. 옷이나 소품을 화면 중앙에 위치시켜주세요.':
        '스타일 진단 장비가 활성화되었습니다. 판별하려는 의류나 패션 소품을 정면 한가운데 정렬하여 제공해주십시오.',
      '패턴과 스타일을 정밀 분석하고 있습니다. 잠시만 기다려주세요.':
        '의류의 감각적 패턴 두께와 가닥 무늬 배열 상태를 정밀 연산하는 중입니다. 대기해 주십시오.',
      '분석 중 오류가 발생했습니다. 다시 시도해주세요.':
        '스타일 데이터 마찰 분석 도중 예기치 못한 상태를 인지했습니다. 옷의 주름을 고르게 정돈하고 조명 아래서 다시 촬영해 보십시오.',
      '옷장에 저장되었습니다. 이제 옷장에서 직접 만져보실 수 있습니다.':
        '내 스마트 스타일 옷장에 정상적으로 저장을 마쳤습니다. 옷장 리스트 목록에서 손끝 햅틱 질감을 터치해 보십시오.',
      '저장 중 오류가 발생했습니다.': '시스템 데이터 저장 도중 예외 통계가 잡혔습니다. 잠시 후 마우스를 통해 수동 전송해 보십시오.',
      '분석 결과가 옷장에 저장되었습니다.': '판독을 마친 의상 소재 감각 카드가 내 옷장 DB에 융합 완료되었습니다.',
      '구글 로그인을 시작합니다. 잠시만 기다려 주세요.':
        '구글 소셜 계정을 인증하기 위해 안전한 보안 모듈을 연동하고 있습니다. 잠시만 변경 없이 유지하십시오.',
      '음성 인증 처리를 시작합니다.': '녹음된 음향 고유 성문 시료를 기반으로 신원을 확인하는 연산을 진행합니다.',
      '음성 로그인 처리 중 오류가 발생했습니다.': '성문 주파수 파형이 등록 값과 불일치합니다. 조용하고 차분한 음성으로 다시 한 번 조작해 보십시오.',
      '로그아웃되었습니다.': '시스템 보안 수칙에 따라 세션 연동 차단을 말끔하게 정지하고 로그아웃 조치를 완료했습니다.',
      '로그아웃 중 오류가 발생했습니다.': '반환 중 메모리 캐시 정지에 오류를 받았습니다. 새로고침을 진행해 주시기 바랍니다.',
      '설정 단추입니다': '음성 제어 상태 조율 및 실시간 진동 자격 수치를 관리하실 수 있는 세부 제어 바입니다.',
    };

    if (exactFriendlyMap[trimmed]) {
      return exactFriendlyMap[trimmed];
    }

    // 2. Fallbacks with general plain, neat, professional rules (no text distortions, no "~" punctuation)
    let temp = trimmed;

    // Convert dynamic login success phrasing
    if (temp.includes('반갑습니다') && temp.includes('로그인이 완료되었습니다')) {
      const match = temp.match(/반갑습니다,\s*(.+?)님\.\s*로그인이 완료되었습니다\./);
      if (match) {
        return `반갑습니다, ${match[1]}님. 로그인이 정상적으로 완료되었습니다.`;
      }
    }

    // Convert dynamic auth success phrasing
    if (temp.includes('인증 성공') && temp.includes('로그인이 완료되었습니다')) {
      const match = temp.match(/인증 성공\.\s*(.+?)\s*님으로 로그인이 완료되었습니다\./);
      if (match) {
        return `인증에 성공하였습니다. ${match[1]}님으로 안전하게 로그인이 완료되었습니다.`;
      }
    }

    // Replace wavy tildes and playful cutesy tone indicators with a clean and flat voice
    temp = temp
      .replace(/헤헤/g, '')
      .replace(/~/g, '.')
      .replace(/쨘!/g, '')
      .replace(/얍!/g, '')
      .replace(/아쿵!/g, '')
      .replace(/어머나/g, '')
      .replace(/에구\.\.\./g, '')
      .replace(/귀염둥이/g, '의류')
      .replace(/이쁜/g, '알맞은')
      .replace(/예쁜/g, '알맞은')
      .replace(/사랑스러운/g, '')
      .replace(/나긋나긋/g, '차분하게')
      .replace(/입술로 나빌레라 가볍게/g, '차분하게')
      .replace(/살강살강/g, '차분하게')
      .replace(/조물조물/g, '차분히')
      .replace(/단숨에/g, '정상적으로')
      .replace(/사뿐히/g, '가볍게')
      .replace(/살그머니/g, '정상적으로')
      .replace(/알뜰하게/g, '올바르게')
      .replace(/초롱초롱하게/g, '정맥 감지하여')
      .replace(/사르르/g, '정상적으로')
      .replace(/우리의 비밀/g, '사용자 정보의')
      .replace(/보석 상자/g, '')
      .replace(/보물처럼/g, '안전하게')
      .replace(/기쁘게/g, '정상적으로')
      .replace(/설레여요/g, '분석 중입니다')
      .replace(/멋진/g, '')
      .replace(/귀를 쫑긋 세우고 있을게요!/g, '대기하고 있습니다.')
      .replace(/귀여운 준비를 다 끝냈어용!/g, '모든 안내 준비가 완료되었습니다.')
      .replace(/해용!/g, '합니다.')
      .replace(/있어용!/g, '있습니다.')
      .replace(/있답니다/g, '있습니다')
      .replace(/되었답니다/g, '되었습니다')
      .replace(/했답니다/g, '했습니다')
      .replace(/인식해서용/g, '인식해서')
      .replace(/했어용/g, '했습니다')
      .replace(/있어용/g, '있습니다')
      .replace(/나만의 피팅룸으로 오셔서 살랑살랑 소리를 입어 보셔요/g, '편안하게 가이드를 청취하십시오');

    // Clean up excessive/duplicate punctuation that can stutter the synthesizer
    temp = temp.replace(/\.\.+/g, '.').replace(/\s+/g, ' ');

    return temp;
  }

  setSettings(rate: number, volume: number) {
    // 0.95 factor applied over target rate to fulfill the relaxing, pacing request safely in real-time
    this.settings.rate = rate * 0.95;
    this.settings.volume = volume;
  }

  speak(text: string, interrupt = true, onEnd?: () => void) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    if (!this.enabled) return;

    if (interrupt && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }

    const friendlyText = this.transformToFriendlyTone(text);
    const utterance = new SpeechSynthesisUtterance(friendlyText);
    
    if (this.voice) {
      utterance.voice = this.voice;
    }
    
    utterance.rate = this.settings.rate;
    utterance.pitch = this.settings.pitch;
    utterance.volume = this.settings.volume;
    utterance.lang = 'ko-KR';

    if (onEnd) {
      utterance.onend = onEnd;
    }

    this.lastUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  stop() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }
}

export const speechService = new SpeechService();
