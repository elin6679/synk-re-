import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LogIn, 
  Mic, 
  Chrome, 
  AlertCircle, 
  Loader2, 
  UserPlus, 
  Mail, 
  Lock, 
  User, 
  Volume2, 
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  VolumeX
} from 'lucide-react';
import { speechService } from '../lib/speech';
import { loginWithGoogle, registerUser, loginUser, normalizeEmail, normalizePassword } from '../lib/auth';
import { AccessibleButton } from './AccessibleButton';
import { hapticService } from '../lib/haptics';

interface LoginProps {
  onSuccess: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  // Main view system representing diagram layout & interactive states
  const [view, setView] = useState<'WELCOME' | 'LOGIN' | 'SIGNUP' | 'VOICE_LOGIN' | 'VOICE_SIGNUP'>('WELCOME');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Email form login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // SignUp Form States
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpName, setSignUpName] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [signUpTtsSpeed, setSignUpTtsSpeed] = useState('1.0');
  const [signUpVoiceGender, setSignUpVoiceGender] = useState<'male' | 'female'>('female');

  // Voice engine states
  const [isListening, setIsListening] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const [recognition, setRecognition] = useState<any>(null);
  const [isCapturingEmail, setIsCapturingEmail] = useState(false);

  // Voice Interactive Sign-Up workflow states
  const [voiceSignupStep, setVoiceSignupStep] = useState<'IDLE' | 'ASK_NAME' | 'ASK_EMAIL' | 'PROCESSING'>('IDLE');
  const [voiceCapturedName, setVoiceCapturedName] = useState('');
  const [voiceCapturedEmail, setVoiceCapturedEmail] = useState('');

  // Speak on mount
  useEffect(() => {
    speechService.speak('에스 와이 엔 케이 홈입니다. 네 가지 옵션인 로그인, 회원 가입, 음성 로그인, 음성 회원 가입 버튼이 세로로 나열되어 있습니다.');

    // Initialize Web Speech API Recognition
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'ko-KR';
      rec.interimResults = true;
      rec.continuous = false;
      rec.maxAlternatives = 1;
      setRecognition(rec);
    }
  }, []);

  // Sync recognition callbacks based on current sub-interaction
  useEffect(() => {
    if (!recognition) return;

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const activeText = finalTranscript || interimTranscript;
      if (activeText) {
        setSpokenText(activeText);
      }

      if (finalTranscript) {
        // Handle voice-input according to the active view state
        if (isCapturingEmail) {
          const emailCandidate = normalizeEmail(finalTranscript);
          setLoginEmail(emailCandidate);
          speechService.speak(`입력된 이메일: ${emailCandidate}`);
          setIsCapturingEmail(false);
          setIsListening(false);
        } else if (view === 'VOICE_LOGIN') {
          setTimeout(() => {
            handleProcessVoiceLogin(finalTranscript);
          }, 1000);
        } else if (view === 'VOICE_SIGNUP') {
          setTimeout(() => {
            handleProcessVoiceSignupStep(finalTranscript);
          }, 1000);
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
      setIsCapturingEmail(false);
      if (event.error === 'not-allowed') {
        setError('마이크 권한 거부됨: 브라우저 마이크 접근 승인이 요구됩니다.');
        speechService.speak('마이크 설정을 허용한 후 다시 작동해 주세요.');
      } else {
        speechService.speak('목소리가 작거나 명확하지 않습니다. 다시 한번 시도해 주세요.');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      setIsCapturingEmail(false);
    };
  }, [recognition, view, voiceSignupStep, isCapturingEmail]);

  // Google OAuth Login Action
  const handleGoogleLogin = async () => {
    setIsProcessing(true);
    setError(null);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err: any) {
      setError('구글 로그인 중 오류가 생겼습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Standard Email Login Action
  const handleDirectEmailLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const emailInput = loginEmail.trim();
    const passwordInput = loginPassword.trim();

    if (!emailInput || !passwordInput) {
      const msg = '이메일과 비밀번호를 모두 입력해 주세요.';
      setError(msg);
      speechService.speak(msg);
      return;
    }

    setIsProcessing(true);

    const loginResult = loginUser(emailInput, passwordInput);

    if (loginResult.success && loginResult.user) {
      hapticService.success();
      speechService.speak(`${loginResult.user.name}님으로 로그인이 완료되었습니다.`);
      setTimeout(() => {
        setIsProcessing(false);
        onSuccess();
      }, 1000);
    } else {
      setError(loginResult.message);
      speechService.speak(loginResult.message);
      setIsProcessing(false);
    }
  };

  // Standard Manual SignUp Action
  const handleManualSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const nameInput = signUpName.trim();
    const emailInput = signUpEmail.trim();
    const passwordInput = signUpPassword.trim();

    if (!nameInput || !emailInput || !passwordInput) {
      const msg = '이름, 이메일, 비밀번호를 모두 입력해 주세요.';
      setError(msg);
      speechService.speak(msg);
      return;
    }

    if (nameInput.length < 2) {
      setError('이름은 2자 이상 입력해야 합니다.');
      speechService.speak('이름을 두 글자 이상 입력해 주세요.');
      return;
    }
    if (!emailInput.includes('@')) {
      setError('올바른 회원 이메일 주소를 적어주세요.');
      speechService.speak('이메일 주소의 형식을 확인해 주세요.');
      return;
    }
    if (passwordInput.length < 4) {
      setError('비밀번호를 최소 4자 이상 입력해 주세요.');
      speechService.speak('비밀번호는 네 글자 이상이 필요합니다.');
      return;
    }
    if (signUpPassword !== signUpConfirmPassword) {
      setError('비밀번호 확인이 불일치합니다.');
      speechService.speak('비밀번호 확인이 다릅니다. 다시 입력해 주세요.');
      return;
    }

    setIsProcessing(true);

    const registerResult = registerUser(nameInput, emailInput, passwordInput, {
      settings: {
        speechRate: parseFloat(signUpTtsSpeed),
        speechVolume: 1.0,
        hapticIntensity: 1.0,
        detailMode: 'detailed'
      }
    });

    if (registerResult.success) {
      hapticService.success();
      speechService.speak('회원가입이 완료되었습니다.');
      setTimeout(() => {
        setIsProcessing(false);
        setView('LOGIN');
        setLoginEmail(normalizeEmail(emailInput));
        setSignUpName('');
        setSignUpEmail('');
        setSignUpPassword('');
        setSignUpConfirmPassword('');
      }, 1200);
    } else {
      setError(registerResult.message);
      speechService.speak(registerResult.message);
      setIsProcessing(false);
    }
  };

  // Trigger Voice Input Mode
  const startVoiceCapture = (promptText: string) => {
    if (!recognition) {
      speechService.speak('마이크 인식 도구가 로드되지 않았습니다.');
      setError('브라우저가 Web Speech API를 완벽하게 지원하지 못해 텍스트 쓰기를 요청합니다.');
      return;
    }
    setError(null);
    setSpokenText('');
    setIsListening(true);
    speechService.speak(promptText);
    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start exception, resetting state:', e);
      setIsListening(false);
    }
  };

  // Trigger Email Voice Input specifically for Login screen input mapping
  const triggerEmailVoiceInput = () => {
    if (!recognition) {
      speechService.speak('마이크 인식 도구가 로드되지 않았습니다.');
      setError('브라우저가 Web Speech API를 전면 장착하지 못했습니다.');
      return;
    }
    setError(null);
    setSpokenText('');

    if (isListening) {
      try {
        recognition.stop();
      } catch (e) {}
      setIsListening(false);
      setIsCapturingEmail(false);
      return;
    }

    setIsCapturingEmail(true);
    setIsListening(true);
    speechService.speak('이메일을 골뱅이를 포함하여 또박또박 말씀해 주세요.');
    try {
      recognition.start();
    } catch (e) {
      console.warn('Recognition start exception:', e);
      setIsListening(false);
      setIsCapturingEmail(false);
    }
  };

  // Process Voice-captured Email Login
  const handleProcessVoiceLogin = async (transcript: string) => {
    setIsProcessing(true);
    setError(null);

    const emailCandidate = normalizeEmail(transcript);

    speechService.speak(`${emailCandidate} 주소 인식을 마쳤습니다. 보안 검증을 수행합니다.`);

    const loginResult = loginUser(emailCandidate, 'voice_pass', true);

    if (loginResult.success && loginResult.user) {
      hapticService.success();
      speechService.speak(`${loginResult.user.name}님으로 로그인이 완료되었습니다.`);
      setTimeout(() => {
        setIsProcessing(false);
        onSuccess();
      }, 1200);
    } else {
      setError(loginResult.message);
      speechService.speak(loginResult.message);
      setIsProcessing(false);
    }
  };

  // Launch sequence of Step-by-Step Voice Signed-Up Wizard
  const startVoiceSignupWizard = () => {
    setView('VOICE_SIGNUP');
    setVoiceSignupStep('ASK_NAME');
    setVoiceCapturedName('');
    setVoiceCapturedEmail('');
    setSpokenText('');
    
    setTimeout(() => {
      startVoiceCapture('회원가입 성함을 삐소리 이후 말씀해 주세요.');
    }, 1200);
  };

  // Handle successive states of Interactive Voice Signup
  const handleProcessVoiceSignupStep = (transcript: string) => {
    if (voiceSignupStep === 'ASK_NAME') {
      const sanitizedName = transcript.replace(/\s+/g, '');
      if (sanitizedName.length < 1) {
        startVoiceCapture('성함 인식이 누락되었습니다. 이름을 다시 한 번 또박또박 말씀해주세요.');
        return;
      }
      setVoiceCapturedName(sanitizedName);
      setVoiceSignupStep('ASK_EMAIL');
      setSpokenText('');

      setTimeout(() => {
        startVoiceCapture(`고객님의 성함을 ${sanitizedName} 님으로 등록했습니다. 이어서 구글이나 네이버 이메일 계정을 골뱅이와 함께 발음해 주세요.`);
      }, 1500);

    } else if (voiceSignupStep === 'ASK_EMAIL') {
      const parsedEmail = normalizeEmail(transcript);

      if (!parsedEmail.includes('@')) {
        startVoiceCapture('올바른 지메일 주소가 아닙니다. 골뱅이를 포함해 다시 음성으로 녹음해주세요.');
        return;
      }

      setVoiceCapturedEmail(parsedEmail);
      setVoiceSignupStep('PROCESSING');
      speechService.speak('음성 정보를 완벽하게 채택했습니다. 스마트 데이터 시스템 계정을 신규 구축합니다.');

      // Finalize setup using the shared registerUser function
      setTimeout(() => {
        const registerResult = registerUser(voiceCapturedName, parsedEmail, 'voice_pass', {
          uid: 'registered_voice_' + Math.random().toString(36).substr(2, 9)
        });

        if (registerResult.success) {
          hapticService.success();
          speechService.speak('회원가입이 완료되었습니다.');
          setTimeout(() => {
            setView('LOGIN');
            setLoginEmail(normalizeEmail(parsedEmail));
            setVoiceSignupStep('IDLE');
          }, 1200);
        } else {
          setError(registerResult.message);
          speechService.speak(registerResult.message);
          setVoiceSignupStep('ASK_EMAIL');
          setIsListening(false);
        }
      }, 1800);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-black overflow-y-auto select-none custom-scrollbar">
      <div className="w-full max-w-sm flex flex-col justify-center min-h-[560px] text-center space-y-6">
        
        {/* VIEW 1: WELCOME GATE (Matches User Diagram Perfectly) */}
        {view === 'WELCOME' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-8 py-4"
          >
            {/* Diagram Representation Top: Logo Icon & Name SYNK */}
            <div className="space-y-2">
              <div className="w-16 h-16 bg-synk-blue rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-synk-blue/20">
                <LogIn className="w-9 h-9 text-black" />
              </div>
              <h1 className="text-4xl font-extrabold tracking-widest text-synk-blue font-mono">SYNK</h1>
              <p className="text-xs font-bold text-synk-grey max-w-[280px] mx-auto leading-relaxed">
                시각장애인을 위한 목소리 기반 의상 및 메이크업 스타일링
              </p>
            </div>

            {/* Diagram Representation Middle: 4 Pill/Oval-shaped Stacked Buttons */}
            <div className="flex flex-col gap-4 max-w-xs mx-auto pt-2">
              {/* Button 1: 로그인 */}
              <button
                onClick={() => {
                  hapticService.tap();
                  setView('LOGIN');
                  speechService.speak('입력창 기반의 로그인 모드로 이동합니다.');
                }}
                className="w-full py-4 text-lg font-black text-white rounded-full bg-transparent border-4 border-synk-blue active:bg-synk-blue active:text-black transition-all duration-300 hover:scale-105 shadow-md flex items-center justify-center gap-2"
                onFocus={() => speechService.speak('첫번째 단추, 로그인입니다.')}
              >
                <LogIn className="w-5 h-5 text-synk-blue" />
                로그인
              </button>

              {/* Button 2: 회원가입 */}
              <button
                onClick={() => {
                  hapticService.tap();
                  setView('SIGNUP');
                  speechService.speak('회원가입 정보 기록 모드로 이동합니다.');
                }}
                className="w-full py-4 text-lg font-black text-white rounded-full bg-transparent border-4 border-synk-yellow active:bg-synk-yellow active:text-black transition-all duration-300 hover:scale-105 shadow-md flex items-center justify-center gap-2"
                onFocus={() => speechService.speak('두번째 단추, 회원 가입입니다.')}
              >
                <UserPlus className="w-5 h-5 text-synk-yellow" />
                회원가입
              </button>

              {/* Button 3: 음성로그인 */}
              <button
                onClick={() => {
                  hapticService.tap();
                  setView('LOGIN');
                  speechService.speak('로그인 화면으로 이동합니다. 이메일 주소 음성인식을 시작합니다.');
                  setTimeout(() => {
                    triggerEmailVoiceInput();
                  }, 1200);
                }}
                className="w-full py-4 text-lg font-black text-white rounded-full bg-transparent border-4 border-beauty-pink active:bg-beauty-pink active:text-black transition-all duration-300 hover:scale-105 shadow-md flex items-center justify-center gap-2"
                onFocus={() => speechService.speak('세번째 단추, 음성 로그인입니다.')}
              >
                <Mic className="w-5 h-5 text-beauty-pink" />
                음성 로그인
              </button>

              {/* Button 4: 음성 회원가입 */}
              <button
                onClick={() => {
                  hapticService.tap();
                  startVoiceSignupWizard();
                }}
                className="w-full py-4 text-lg font-black text-white rounded-full bg-transparent border-4 border-synk-cyan active:bg-synk-cyan active:text-black transition-all duration-300 hover:scale-105 shadow-md flex items-center justify-center gap-2"
                onFocus={() => speechService.speak('네번째 단추, 음성 안내 가입 단추입니다.')}
              >
                <Mic className="w-5 h-5 text-synk-cyan" />
                음성 회원가입
              </button>
            </div>
          </motion.div>
        )}

        {/* VIEW 2: MANUAL LOGIN (Form & Demo Access) */}
        {view === 'LOGIN' && (
          <motion.div
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-5 text-left"
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button 
                onClick={() => { hapticService.tap(); setView('WELCOME'); setError(null); }}
                className="p-1 text-synk-grey hover:text-white"
                aria-label="Welcome 화면으로 가기"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-black text-white">로그인 정보 전송</h2>
            </div>

            <form onSubmit={handleDirectEmailLogin} className="space-y-4 bg-white/5 p-4 rounded-3xl border border-white/10">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-synk-grey/80 block flex justify-between items-center">
                  <span>이메일 주소 (우측 마이크 버튼으로 음성 입력 가능)</span>
                  {isListening && isCapturingEmail && (
                    <span className="text-[10px] font-bold text-beauty-pink animate-pulse flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-beauty-pink inline-block animate-ping" />
                      음성 인식 중...
                    </span>
                  )}
                </label>
                <div className="relative flex items-center">
                  <input 
                    type="email" 
                    required
                    placeholder="name@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-black border-2 border-synk-blue/40 focus:border-synk-blue rounded-xl pl-4 pr-12 h-12 text-white font-black text-sm focus:outline-none"
                    onFocus={() => speechService.speak('로그인에 쓸 이메일을 입력하거나 우측의 마이크 단추를 눌러 음성으로 입력하세요.')}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      hapticService.tap();
                      triggerEmailVoiceInput();
                    }}
                    className={`absolute right-2 p-2 rounded-lg transition-all ${
                      isListening && isCapturingEmail 
                        ? 'text-beauty-pink bg-beauty-pink/20 scale-110' 
                        : 'text-synk-blue hover:text-white hover:bg-white/5'
                    }`}
                    title="이메일 음성 입력"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-synk-grey/80 block">비밀번호 (데모 무관)</label>
                <input 
                  type="password" 
                  placeholder="필수 아님 (가입했을 경우만 필수)"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-black border-2 border-synk-blue/40 focus:border-synk-blue rounded-xl px-4 h-12 text-white font-black text-xs focus:outline-none"
                  onFocus={() => speechService.speak('비밀번호가 있으면 작성하세요.')}
                />
              </div>

              <AccessibleButton
                label="안전 로그인 완료"
                hint="입력한 내용으로 로그인을 시작합니다"
                type="submit"
                isLoading={isProcessing}
                variant="primary"
                className="w-full py-4 text-base font-black bg-synk-blue text-black"
              />
            </form>

            {/* Sub Quick Portal Integration */}
            <div className="space-y-2 bg-white/5 p-4 rounded-3xl border border-white/10 text-center">
              <span className="block text-xs font-black text-synk-yellow tracking-wider mb-2">구글 또는 관리용 모드 진입</span>
              
              <button
                onClick={handleGoogleLogin}
                className="w-full h-12 bg-white text-black font-black text-xs rounded-xl flex items-center justify-center gap-2 hover:brightness-105 active:scale-95 transition-all mb-2"
              >
                <Chrome className="w-5 h-5" /> 구글 간편 게스트 입장
              </button>

              <button
                onClick={() => {
                  setLoginEmail('gawoni0817@gmail.com');
                  speechService.speak('gawoni 메일을 입력창에 불러왔습니다. 로그인 버튼을 누르고 입장하면 됩니다.');
                }}
                className="w-full h-11 bg-beauty-pink/20 hover:bg-beauty-pink/30 text-beauty-pink border border-beauty-pink/40 font-black text-xs rounded-xl tracking-tight transition-all"
              >
                gawoni0817@gmail.com 개발자 세션 로드
              </button>
            </div>
          </motion.div>
        )}

        {/* VIEW 3: MANUAL SIGNUP (Manual Registration Form) */}
        {view === 'SIGNUP' && (
          <motion.form
            initial={{ opacity: 0, x: 15 }}
            animate={{ opacity: 1, x: 0 }}
            onSubmit={handleManualSignUp}
            className="space-y-4 text-left"
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-2">
              <button 
                type="button"
                onClick={() => { hapticService.tap(); setView('WELCOME'); setError(null); }}
                className="p-1 text-synk-grey hover:text-white"
                aria-label="Welcome 화면으로 가기"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-black text-white">신규 회원가입 정보</h2>
            </div>

            <div className="p-4 bg-white/5 rounded-3xl border border-white/10 space-y-3 max-h-[360px] overflow-y-auto">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-synk-grey block">성함 / 별명</label>
                <input 
                  type="text" 
                  required
                  placeholder="홍길동"
                  value={signUpName}
                  onChange={(e) => setSignUpName(e.target.value)}
                  className="w-full bg-black border-2 border-synk-yellow/40 focus:border-synk-yellow rounded-xl px-3 h-10 text-white font-black text-xs focus:outline-none"
                  onFocus={() => speechService.speak('이름을 작성해 주세요.')}
                />
              </div>

              {/* Email */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-synk-grey block">이메일 계정</label>
                <input 
                  type="email" 
                  required
                  placeholder="test@synk.com"
                  value={signUpEmail}
                  onChange={(e) => setSignUpEmail(e.target.value)}
                  className="w-full bg-black border-2 border-synk-yellow/40 focus:border-synk-yellow rounded-xl px-3 h-10 text-white font-black text-xs focus:outline-none"
                  onFocus={() => speechService.speak('이메일 주소를 입력해 주세요.')}
                />
              </div>

              {/* Password */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-synk-grey block">암호 수립</label>
                  <input 
                    type="password" 
                    required
                    placeholder="4자 이상"
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    className="w-full bg-black border-2 border-synk-yellow/40 focus:border-synk-yellow rounded-xl px-3 h-10 text-white font-black text-xs focus:outline-none"
                    onFocus={() => speechService.speak('비밀번호를 네 글자 이상 기입하세요.')}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-synk-grey block">비밀번호 확인</label>
                  <input 
                    type="password" 
                    required
                    placeholder="재확인"
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    className="w-full bg-black border-2 border-synk-yellow/40 focus:border-synk-yellow rounded-xl px-3 h-10 text-white font-black text-xs focus:outline-none"
                    onFocus={() => speechService.speak('동일한 비밀번호를 전송에 맞춰 적어주세요.')}
                  />
                </div>
              </div>

              {/* Pitch Control Settings */}
              <div className="pt-2 border-t border-white/10 space-y-2">
                <span className="block text-xs font-black text-synk-yellow flex items-center gap-1">
                  <Volume2 className="w-4 h-4" /> 어시스턴트 사전 지정
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-[10px] text-synk-grey block">음성 성별</label>
                    <div className="flex bg-black p-0.5 rounded-lg border border-white/10">
                      <button
                        type="button"
                        onClick={() => { setSignUpVoiceGender('female'); speechService.speak('여성음을 탑재합니다.'); }}
                        className={`flex-1 py-1 text-[10px] font-bold rounded ${signUpVoiceGender === 'female' ? 'bg-synk-yellow text-black' : 'text-synk-grey'}`}
                      >
                        여성음
                      </button>
                      <button
                        type="button"
                        onClick={() => { setSignUpVoiceGender('male'); speechService.speak('남성음을 사용합니다.'); }}
                        className={`flex-1 py-1 text-[10px] font-bold rounded ${signUpVoiceGender === 'male' ? 'bg-synk-yellow text-black' : 'text-synk-grey'}`}
                      >
                        남성음
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-synk-grey block">읽기 속도</label>
                    <select
                      value={signUpTtsSpeed}
                      onChange={(e) => {
                        setSignUpTtsSpeed(e.target.value);
                        speechService.speak(`${e.target.value}배속입니다.`);
                      }}
                      className="w-full bg-black text-[10px] text-white border border-white/10 h-7 rounded px-1"
                    >
                      <option value="0.8">0.8 배속 (천천히)</option>
                      <option value="1.0">1.0 배속 (기본)</option>
                      <option value="1.2">1.2 배속 (약간 빠름)</option>
                      <option value="1.5">1.5 배속 (빠른 리딩)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <AccessibleButton
              label="회원가입 완료 및 로그인 실행"
              hint="신규 가입 양식을 전송하여 즉각 접속 조치합니다"
              type="submit"
              isLoading={isProcessing}
              variant="primary"
              className="w-full py-4 text-base font-black bg-synk-yellow text-black"
            />
          </motion.form>
        )}

        {/* VIEW 4: VOICE_LOGIN SCREEN */}
        {view === 'VOICE_LOGIN' && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="space-y-6 pt-4"
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-left">
              <button 
                onClick={() => { hapticService.tap(); setView('WELCOME'); setError(null); if (recognition) recognition.stop(); }}
                className="p-1 text-synk-grey hover:text-white"
                aria-label="Welcome 화면으로 가기"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-black text-white">음성 서명 로그인</h2>
            </div>

            {/* Ripple recording container */}
            <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
              <AnimatePresence>
                {isListening && (
                  <>
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0.6 }}
                      animate={{ scale: 1.5, opacity: 0 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "easeOut" }}
                      className="absolute w-full h-full bg-beauty-pink/20 rounded-full"
                    />
                    <motion.div 
                      initial={{ scale: 0.8, opacity: 0.4 }}
                      animate={{ scale: 1.8, opacity: 0 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      transition={{ repeat: Infinity, duration: 2, ease: "easeOut", delay: 0.5 }}
                      className="absolute w-full h-full bg-beauty-pink/10 rounded-full"
                    />
                  </>
                )}
              </AnimatePresence>

              <button
                onClick={() => startVoiceCapture('가입하신 이메일 주소를 골뱅이와 함께 또박또박 말씀하십시오.')}
                className={`w-32 h-32 rounded-full flex flex-col items-center justify-center z-10 transition-all ${
                  isListening 
                    ? 'bg-beauty-pink scale-105 shadow-lg shadow-beauty-pink/30' 
                    : 'bg-white/5 border-4 border-beauty-pink/60 hover:bg-white/10'
                }`}
              >
                <Mic className={`w-10 h-10 ${isListening ? 'text-black animate-pulse' : 'text-beauty-pink'}`} />
                <span className={`text-[11px] font-black mt-2 uppercase ${isListening ? 'text-black' : 'text-synk-grey'}`}>
                  {isListening ? '녹음 중' : '터치하여 시작'}
                </span>
              </button>
            </div>

            {/* Dynamic visual transcript */}
            <div className="bg-white/5 border border-white/10 p-5 rounded-3xl text-center space-y-2">
              <span className="text-[10px] font-black uppercase text-beauty-pink tracking-widest block">음성 번역 패널</span>
              <div className="p-3 bg-black rounded-xl border border-white/5 min-h-[4rem] flex items-center justify-center">
                <p className="text-lg font-black text-white leading-snug">
                  {spokenText || '귀가 열려 있습니다. 이메일을 편하게 말씀해 보세요.'}
                </p>
              </div>
            </div>

            <p className="text-xs text-synk-grey font-bold leading-relaxed px-4">
              "gawoni0817 골뱅이 지메일 점컴" 식으로 주소 단어를 또박또박 말씀해 주시면, 마이크 분석에 이어 자동 로그인 처리됩니다.
            </p>
          </motion.div>
        )}

        {/* VIEW 5: STEP BY STEP INTERACTIVE VOICE SIGNUP WIZARD */}
        {view === 'VOICE_SIGNUP' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6 pt-4"
          >
            <div className="flex items-center gap-2 border-b border-white/10 pb-2 text-left">
              <button 
                onClick={() => { hapticService.tap(); setView('WELCOME'); setError(null); if (recognition) recognition.stop(); }}
                className="p-1 text-synk-grey hover:text-white"
                aria-label="Welcome 화면으로 가기"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h2 className="text-xl font-black text-white">음성 안내 가입 서비스</h2>
            </div>

            {/* Dynamic Status Title */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-1.5 text-center">
              <span className="text-xs font-black text-synk-cyan uppercase tracking-widest block">스마트 어시스턴트 진행 상태</span>
              <h3 className="text-base font-black text-white">
                {voiceSignupStep === 'ASK_NAME' && '단계 1: 사용자의 이름 확인'}
                {voiceSignupStep === 'ASK_EMAIL' && '단계 2: 사용자의 계정 이메일 연결'}
                {voiceSignupStep === 'PROCESSING' && '단계 3: 신규 가상 데이터 구축 중...'}
              </h3>
            </div>

            {/* Micro Pulsing Area */}
            <div className="relative w-36 h-36 mx-auto flex items-center justify-center">
              <AnimatePresence>
                {isListening && (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0.7 }}
                    animate={{ scale: 1.4, opacity: 0 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ repeat: Infinity, duration: 1.3, ease: 'easeOut' }}
                    className="absolute w-full h-full bg-synk-cyan/30 rounded-full"
                  />
                )}
              </AnimatePresence>
              <div className={`w-28 h-28 rounded-full flex flex-col items-center justify-center border-4 ${isListening ? 'bg-synk-cyan border-white' : 'bg-white/5 border-synk-cyan/40'} transition-all`}>
                <Mic className={`w-8 h-8 ${isListening ? 'text-black animate-bounce' : 'text-synk-cyan'}`} />
                <span className={`text-[10px] font-black mt-1 ${isListening ? 'text-black' : 'text-synk-grey'}`}>
                  {isListening ? '경청하고 있음' : '대기 상태'}
                </span>
              </div>
            </div>

            {/* Collected status boards */}
            <div className="bg-white/5 p-4 rounded-3xl border border-white/10 space-y-2 text-left">
              <div className="flex justify-between items-center text-xs border-b border-white/5 pb-1.5">
                <span className="text-synk-grey font-black">1. 성명 정보:</span>
                <span className="text-synk-cyan font-black">{voiceCapturedName || (voiceSignupStep === 'ASK_NAME' ? '청취 대기...' : '미기재')}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-synk-grey font-black">2. 이메일 계정:</span>
                <span className="text-synk-cyan font-black truncate max-w-[180px] text-right">
                  {voiceCapturedEmail || (voiceSignupStep === 'ASK_EMAIL' ? '청취 대기...' : '미기재')}
                </span>
              </div>

              {spokenText && (
                <div className="pt-2.5 border-t border-white/5">
                  <span className="text-[9px] font-black tracking-widest uppercase text-synk-grey">실시간 음성 감지:</span>
                  <div className="p-2 bg-black rounded-lg mt-1 text-center font-bold text-xs text-white">
                    {spokenText}
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={() => {
                if (voiceSignupStep === 'ASK_NAME') {
                  startVoiceCapture('회원가입 이름을 입으로 또박또박 대답해주세요.');
                } else if (voiceSignupStep === 'ASK_EMAIL') {
                  startVoiceCapture('회원가입 이메일을 골뱅이 포함하여 또박또박 말씀해주세요.');
                }
              }}
              className="w-full py-4 bg-transparent border-2 border-synk-cyan text-synk-cyan text-sm font-black rounded-xl hover:bg-synk-cyan/10 transition-all"
            >
              마이크 수동 다시 활성화
            </button>
          </motion.div>
        )}

        {/* Global error drawer inside panels */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 p-3.5 bg-red-500/20 text-red-400 font-bold text-xs rounded-2xl border border-red-500/40 text-left"
          >
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <p>{error}</p>
          </motion.div>
        )}

        {/* Dynamic accessibility helper banner */}
        <p className="text-[10px] text-synk-grey font-bold tracking-widest uppercase py-3 border-t border-white/10 mt-auto select-none">
          SYNK SENSORY SUITE v5.2 (ACCURACY ACTIVATED)
        </p>

      </div>
    </div>
  );
};
