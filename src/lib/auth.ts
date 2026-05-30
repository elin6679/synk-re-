import { 
  GoogleAuthProvider, 
  signInWithPopup, 
  User,
  signOut,
  signInAnonymously
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  serverTimestamp, 
  getDoc 
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { speechService } from './speech';

/**
 * Normalizes email strings (including vocal inputs) by:
 * - Removing all whitespaces
 * - Replacing common Korean speech patterns
 * - Normalizing to lowercase
 */
export function normalizeEmail(email: string): string {
  if (!email) return '';
  let cleaned = email.trim().replace(/\s+/g, '');
  
  // Normalize to lowercase first for English words
  cleaned = cleaned.toLowerCase();
  
  // "골뱅이", "앳", "at" -> @
  cleaned = cleaned.replace(/골뱅이/g, '@');
  cleaned = cleaned.replace(/앳/g, '@');
  cleaned = cleaned.replace(/at/g, '@');
  
  // "닷", "점", "dot" -> .
  cleaned = cleaned.replace(/닷/g, '.');
  cleaned = cleaned.replace(/점/g, '.');
  cleaned = cleaned.replace(/dot/g, '.');
  
  // "지메일", "gmail" -> gmail
  cleaned = cleaned.replace(/지메일/g, 'gmail');
  cleaned = cleaned.replace(/gmail/g, 'gmail');

  // Helper patterns to fix common end-domains for standard email format
  cleaned = cleaned.replace(/닷컴|점컴/g, '.com');
  cleaned = cleaned.replace(/컴$/g, 'com');
  cleaned = cleaned.replace(/넷$/g, 'net');
  cleaned = cleaned.replace(/네이버/g, 'naver');
  cleaned = cleaned.replace(/다음/g, 'daum');

  // Remove potential double dots
  cleaned = cleaned.replace(/\.\./g, '.');

  return cleaned;
}

/**
 * Normalizes password strings by applying trim()
 */
export function normalizePassword(password: string): string {
  if (!password) return '';
  return password.trim();
}

/**
 * Helper to fetch registered users list from local storage
 */
export function getUserList(): any[] {
  const usersStr = localStorage.getItem('users');
  try {
    return usersStr ? JSON.parse(usersStr) : [];
  } catch (e) {
    return [];
  }
}

/**
 * Helper to save registered users list to local storage
 */
export function saveUserList(users: any[]): void {
  localStorage.setItem('users', JSON.stringify(users));
}

/**
 * Shared Registration validation and registration logic
 */
export function registerUser(
  nameInput: string,
  emailInput: string,
  passwordInput: string,
  additional: any = {}
): { success: boolean; message: string; user?: any } {
  const name = nameInput.trim();
  const email = normalizeEmail(emailInput);
  const password = normalizePassword(passwordInput);

  if (!name) {
    return { success: false, message: '성함을 입력해 주세요.' };
  }
  if (!email || !email.includes('@')) {
    return { success: false, message: '올바른 형식의 이메일 주소를 입력해 주세요.' };
  }
  if (!password) {
    return { success: false, message: '비밀번호를 입력해 주세요.' };
  }

  const users = getUserList();
  const alreadyExists = users.some((u: any) => normalizeEmail(u.email) === email);

  if (alreadyExists) {
    return { success: false, message: '이미 가입된 이메일입니다.' };
  }

  const newUser = {
    uid: 'user_' + Math.random().toString(36).substr(2, 9),
    name,
    email,
    password,
    profileImageUrl: null,
    measurements: { shoulder: 42, chest: 96, waist: 82 },
    settings: {
      speechRate: 1.0,
      speechVolume: 1.0,
      hapticIntensity: 1.0,
      detailMode: 'detailed'
    },
    ...additional
  };

  users.push(newUser);
  saveUserList(users);

  return { success: true, message: '회원가입이 완료되었습니다.', user: newUser };
}

/**
 * Shared Login validation and login verification logic.
 * Supports both manual (email + password) and voice/google (email only) matching.
 */
export function loginUser(
  emailInput: string,
  passwordInput: string,
  isVoiceInput: boolean = false
): { success: boolean; message: string; user?: any } {
  const email = normalizeEmail(emailInput);
  const password = normalizePassword(passwordInput);

  if (!email) {
    return { success: false, message: '이메일을 입력해 주세요.' };
  }
  if (!isVoiceInput && !password) {
    return { success: false, message: '비밀번호를 입력해 주세요.' };
  }

  const users = getUserList();
  if (users.length === 0) {
    // Make sure we clear currentUser if login verification fails
    localStorage.removeItem('currentUser');
    localStorage.removeItem('synk_simulated_auth');
    return { success: false, message: '가입된 회원 정보가 없습니다. 먼저 회원가입을 해주세요.' };
  }

  const matchedUser = users.find((u: any) => normalizeEmail(u.email) === email);

  if (!matchedUser) {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('synk_simulated_auth');
    return { success: false, message: '이메일 또는 비밀번호가 일치하지 않습니다.' };
  }

  // If this is manual login, password must match exactly
  if (!isVoiceInput) {
    if (normalizePassword(matchedUser.password || '') !== password) {
      localStorage.removeItem('currentUser');
      localStorage.removeItem('synk_simulated_auth');
      return { success: false, message: '이메일 또는 비밀번호가 일치하지 않습니다.' };
    }
  }

  // Login successful
  localStorage.setItem('currentUser', JSON.stringify(matchedUser));
  localStorage.setItem('synk_simulated_auth', JSON.stringify(matchedUser));

  return { success: true, message: '로그인에 성공했습니다.', user: matchedUser };
}

/**
 * Syncs user data to Firestore after successful authentication (optional cloud sync)
 */
export async function syncUserToFirestore(user: User | any, customEmail?: string) {
  const userDocRef = doc(db, 'users', user.uid);
  
  try {
    const userDoc = await getDoc(userDocRef);
    const emailToUse = customEmail || user.email || 'guest@synk.internal';
    const nameToUse = user.displayName || emailToUse.split('@')[0] || '사용자';
    const photoToUse = user.photoURL || null;

    const userData = {
      email: emailToUse,
      name: nameToUse,
      profileImageUrl: photoToUse,
      lastLoginAt: serverTimestamp(),
      role: 'user',
    };

    if (!userDoc.exists()) {
      await setDoc(userDocRef, {
        ...userData,
        createdAt: serverTimestamp(),
      });
      console.log('New user created in Firestore');
    } else {
      await setDoc(userDocRef, userData, { merge: true });
      console.log('Existing user login updated in Firestore');
    }
    return { ...userData, uid: user.uid };
  } catch (error) {
    console.warn('Firestore sync failed, proceeding locally:', error);
    return {
      email: customEmail || user.email || 'guest@synk.internal',
      name: user.displayName || (customEmail || user.email || '').split('@')[0] || '사용자',
      profileImageUrl: user.photoURL || null,
      lastLoginAt: new Date().toISOString(),
      role: 'user',
      uid: user.uid
    };
  }
}

/**
 * Triggers standard Google Sign-In via Popup
 */
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  try {
    speechService.speak('구글 로그인을 시작합니다. 잠시만 기다려 주세요.');
    const result = await signInWithPopup(auth, provider);
    const firestoreUser = await syncUserToFirestore(result.user);

    // Save/Sync Google user inside our standard local storage 'users' list as well
    const users = getUserList();
    const normalizedEmail = normalizeEmail(result.user.email || 'google_user@synk.com');
    let existing = users.find((u: any) => normalizeEmail(u.email) === normalizedEmail);

    if (!existing) {
      existing = {
        uid: result.user.uid,
        email: normalizedEmail,
        name: result.user.displayName || '구글 사용자',
        password: 'google_pass',
        profileImageUrl: result.user.photoURL || null,
        measurements: { shoulder: 42, chest: 96, waist: 82 },
        settings: {
          speechRate: 1.0,
          speechVolume: 1.0,
          hapticIntensity: 1.0,
          detailMode: 'detailed'
        }
      };
      users.push(existing);
      saveUserList(users);
    }

    // Save to currentUser
    localStorage.setItem('currentUser', JSON.stringify(existing));
    localStorage.setItem('synk_simulated_auth', JSON.stringify(existing));

    speechService.speak(`반갑습니다, ${existing.name}님. 로그인이 완료되었습니다.`);
    return result.user;
  } catch (error: any) {
    console.error('Google Auth Error:', error);
    let errorMessage = '구글 로그인 팝업이 차단되었거나 실패했습니다.';
    if (error.code === 'auth/popup-blocked' || error.name === 'NotAllowedError') {
      errorMessage = '로그인 팝업창이 차단되었습니다. 화면 우측 상단의 새 탭 열기 버튼을 눌러 이용하시거나 음성 로그인을 시도해 주세요.';
    }
    speechService.speak(errorMessage);
    throw error;
  }
}

/**
 * Voice input sign in utilizing standard Firebase Anonymous Auth or simulated fallback.
 */
export async function loginWithVoiceEmail(email: string) {
  try {
    speechService.speak('음성 인증 처리를 시작합니다.');
    
    // Normalize speaking email
    const emailCandidate = normalizeEmail(email);

    // Verify using our strict, shared verification logic!
    const loginResult = loginUser(emailCandidate, 'voice_pass', true);

    if (!loginResult.success) {
      speechService.speak(loginResult.message);
      throw new Error(loginResult.message);
    }

    const matchedUser = loginResult.user;
    speechService.speak(`인증 성공. ${matchedUser.name} 님으로 로그인이 완료되었습니다.`);
    return matchedUser;
  } catch (error: any) {
    console.error('Voice login processing error:', error);
    throw error;
  }
}

/**
 * Triggers logout and provides feedback
 */
export async function logout() {
  try {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('synk_simulated_auth');
    await signOut(auth);
    speechService.speak('로그아웃되었습니다.');
  } catch (error) {
    console.error('Logout error:', error);
    speechService.speak('로그아웃 중 오류가 발생했습니다.');
  }
}
