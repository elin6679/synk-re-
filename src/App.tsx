import React, { useState, useEffect } from 'react';
import { AppScreen, UserProfile } from './types.ts';
import { Onboarding } from './components/Onboarding';
import { Login } from './components/Login';
import { Home } from './components/Home';
import { Analysis } from './components/Analysis';
import { BeautyAnalysis } from './components/BeautyAnalysis';
import { Closet } from './components/Closet';
import { Settings } from './components/Settings';
import { StoreMode } from './components/StoreMode';
import { motion, AnimatePresence } from 'motion/react';
import { speechService } from './lib/speech';

import { Navigation } from './components/Navigation';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<AppScreen>(AppScreen.LOGIN);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if there is a logged in user first via 'currentUser' key (the single source of truth!)
    const savedUser = localStorage.getItem('currentUser');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setProfile(parsed);
        
        // Check if onboarding is completed
        if (parsed.measurements && parsed.measurements.shoulder) {
          setCurrentScreen(AppScreen.HOME);
        } else {
          setCurrentScreen(AppScreen.ONBOARDING);
        }
        setIsInitialized(true);
        return;
      } catch (e) {
        localStorage.removeItem('currentUser');
      }
    }

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        // Fetch Firestore Profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists() && userDoc.data()?.measurements) {
          const userProfile = userDoc.data() as UserProfile;
          setProfile(userProfile);
          localStorage.setItem('currentUser', JSON.stringify({ ...userProfile, uid: user.uid }));
          setCurrentScreen(AppScreen.HOME);
        } else {
          setCurrentScreen(AppScreen.ONBOARDING);
        }
      } else {
        if (!localStorage.getItem('currentUser')) {
          setCurrentScreen(AppScreen.LOGIN);
          setProfile(null);
        }
      }
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []);

  const handleOnboardingComplete = (newProfile: UserProfile) => {
    const currentUserStr = localStorage.getItem('currentUser');
    let fullUser: any = {};
    if (currentUserStr) {
      try {
        fullUser = JSON.parse(currentUserStr);
      } catch (e) {}
    }
    const updatedUser = {
      ...fullUser,
      measurements: newProfile.measurements,
      settings: newProfile.settings,
      name: newProfile.name || fullUser.name || '사용자',
      skinTone: newProfile.skinTone || fullUser.skinTone
    };

    setProfile(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    localStorage.setItem('synk_simulated_auth', JSON.stringify(updatedUser));
    localStorage.setItem('synk_profile', JSON.stringify(updatedUser));
    
    // Also update in the 'users' array so the change is persisted!
    const usersStr = localStorage.getItem('users');
    if (usersStr) {
      try {
        const users = JSON.parse(usersStr);
        const idx = users.findIndex((u: any) => u.email.trim().toLowerCase() === updatedUser.email.trim().toLowerCase());
        if (idx !== -1) {
          users[idx] = { ...users[idx], ...updatedUser };
          localStorage.setItem('users', JSON.stringify(users));
        }
      } catch (e) {}
    }
    setCurrentScreen(AppScreen.HOME);
  };

  const handleProfileUpdate = (updatedProfile: UserProfile) => {
    const currentUserStr = localStorage.getItem('currentUser');
    let fullUser: any = {};
    if (currentUserStr) {
      try {
        fullUser = JSON.parse(currentUserStr);
      } catch (e) {}
    }
    const updatedUser = {
      ...fullUser,
      measurements: updatedProfile.measurements,
      settings: updatedProfile.settings,
      name: updatedProfile.name || fullUser.name || '사용자',
      skinTone: updatedProfile.skinTone || fullUser.skinTone
    };

    setProfile(updatedUser);
    localStorage.setItem('currentUser', JSON.stringify(updatedUser));
    localStorage.setItem('synk_simulated_auth', JSON.stringify(updatedUser));
    localStorage.setItem('synk_profile', JSON.stringify(updatedUser));
    
    // Also update in the 'users' array!
    const usersStr = localStorage.getItem('users');
    if (usersStr) {
      try {
        const users = JSON.parse(usersStr);
        const idx = users.findIndex((u: any) => u.email.trim().toLowerCase() === updatedUser.email.trim().toLowerCase());
        if (idx !== -1) {
          users[idx] = { ...users[idx], ...updatedUser };
          localStorage.setItem('users', JSON.stringify(users));
        }
      } catch (e) {}
    }
  };

  const navigateTo = (screen: AppScreen) => {
    setCurrentScreen(screen);
  };

  if (!isInitialized) {
    return <div className="h-screen bg-white flex items-center justify-center text-synk-blue text-4xl font-black italic tracking-tighter">SYNK.</div>;
  }

  return (
    <div className="h-screen w-full bg-white font-sans text-synk-navy selection:bg-synk-blue/10">
      <div className="max-w-md mx-auto h-full bg-white relative overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="h-full w-full"
          >
            {currentScreen === AppScreen.LOGIN && (
              <Login onSuccess={() => {
                const loggedInUserStr = localStorage.getItem('currentUser');
                if (loggedInUserStr) {
                  try {
                    const parsed = JSON.parse(loggedInUserStr);
                    setProfile(parsed);
                    if (parsed.measurements && parsed.measurements.shoulder) {
                      setCurrentScreen(AppScreen.HOME);
                    } else {
                      setCurrentScreen(AppScreen.ONBOARDING);
                    }
                  } catch (e) {
                    setCurrentScreen(AppScreen.ONBOARDING);
                  }
                } else {
                  setCurrentScreen(AppScreen.ONBOARDING);
                }
              }} />
            )}
            {currentScreen === AppScreen.ONBOARDING && (
              <Onboarding onComplete={handleOnboardingComplete} />
            )}
            {currentScreen === AppScreen.HOME && (
              <Home onNavigate={navigateTo} />
            )}
            {currentScreen === AppScreen.ANALYSIS && (
              <Analysis onNavigate={navigateTo} profile={profile} />
            )}
            {currentScreen === AppScreen.BEAUTY && (
              <BeautyAnalysis onNavigate={navigateTo} profile={profile} />
            )}
            {currentScreen === AppScreen.CLOSET && (
              <Closet onNavigate={navigateTo} />
            )}
            {currentScreen === AppScreen.SETTINGS && (
              <Settings 
                onNavigate={navigateTo} 
                profile={profile} 
                onUpdateProfile={handleProfileUpdate} 
                onLogout={() => {
                  setProfile(null);
                  localStorage.removeItem('currentUser');
                  localStorage.removeItem('synk_simulated_auth');
                  navigateTo(AppScreen.LOGIN);
                }}
              />
            )}
            {currentScreen === AppScreen.STORE && (
              <StoreMode onNavigate={navigateTo} />
            )}
            {/* Placeholder for other screens */}
            {![AppScreen.ONBOARDING, AppScreen.HOME, AppScreen.ANALYSIS, AppScreen.BEAUTY, AppScreen.CLOSET, AppScreen.SETTINGS, AppScreen.STORE].includes(currentScreen) && (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center gap-8">
                <h1 className="text-4xl font-bold">{currentScreen} 기능은 준비 중입니다.</h1>
                <AccessibleButton 
                  label="홈으로 돌아가기" 
                  onClick={() => navigateTo(AppScreen.HOME)} 
                />
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        
        <Navigation currentScreen={currentScreen} onNavigate={navigateTo} />
      </div>
    </div>
  );
}

// Internal component for the placeholder back button
import { AccessibleButton } from './components/AccessibleButton';

