import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Crown,
  ShieldCheck,
  Mail,
  Lock,
  ArrowRight,
  Loader2,
  CheckCircle2,
  User as UserIcon,
  ShieldAlert,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

type AuthMode = 'login' | 'register' | 'forgot_password';

interface FieldErrors {
  name?: string;
  email?: string;
  password?: string;
}

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    user,
    loginWithEmail,
    registerWithEmail,
    sendPasswordReset,
    signInWithGoogle,
    logout,
    language,
    t,
  } = useApp();

  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Form Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  // Status & Feedback
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [errorSignInMethods, setErrorSignInMethods] = useState<string[]>([]);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // Attempt token prevents stale async completions from updating form state after tab switch/close
  const attemptTokenRef = useRef(0);

  const clearValidationAndErrors = () => {
    setErrorMessage(null);
    setErrorCode(null);
    setErrorSignInMethods([]);
    setFieldErrors({});
    setResetSent(false);
  };

  const resetAllFormState = (nextMode: AuthMode = 'login') => {
    attemptTokenRef.current += 1;
    setAuthMode(nextMode);
    setName('');
    setEmail('');
    setPassword('');
    setIsLoading(false);
    clearValidationAndErrors();
  };

  const switchAuthMode = (nextMode: AuthMode, options?: { preserveEmail?: boolean }) => {
    attemptTokenRef.current += 1;
    setAuthMode(nextMode);
    setIsLoading(false);
    clearValidationAndErrors();
    if (!options?.preserveEmail) {
      setEmail('');
    }
    setPassword('');
  };

  useEffect(() => {
    if (isAuthModalOpen) {
      attemptTokenRef.current += 1;
      setIsLoading(false);
      clearValidationAndErrors();
    } else {
      // Clear lingering state whenever modal closes
      resetAllFormState('login');
    }
  }, [isAuthModalOpen]);

  useEffect(() => {
    if (user) {
      setIsLoading(false);
      clearValidationAndErrors();
      setName('');
      setPassword('');
    }
  }, [user]);

  if (!isAuthModalOpen) return null;

  const mapAuthError = (err: any): { message: string; code: string | null; signInMethods: string[] } => {
    const code = err?.code || null;
    const signInMethods: string[] = Array.isArray(err?.signInMethods) ? err.signInMethods : [];

    switch (code) {
      case 'auth/wrong-password':
        return {
          code,
          signInMethods,
          message:
            language === 'bn'
              ? 'ভুল পাসওয়ার্ড দিয়েছেন। আবার চেষ্টা করুন অথবা পাসওয়ার্ড রিসেট করুন।'
              : 'Incorrect password. Please try again or use Forgot password below.',
        };
      case 'auth/user-not-found':
        return {
          code,
          signInMethods,
          message:
            language === 'bn'
              ? 'এই ইমেইল দিয়ে কোনো অ্যাকাউন্ট পাওয়া যায়নি। নতুন অ্যাকাউন্ট তৈরি করতে "নতুন অ্যাকাউন্ট" ট্যাবে যান।'
              : 'No account found with this email. Switch to Sign Up to create a new account.',
        };
      case 'auth/invalid-credential':
        return {
          code,
          signInMethods,
          message:
            language === 'bn'
              ? 'ভুল ইমেইল অথবা পাসওয়ার্ড। পাসওয়ার্ড ভুলে গেলে নিচে রিসেট অপশন ব্যবহার করুন।'
              : 'Invalid email or password. Double-check your credentials or reset your password.',
        };
      case 'auth/email-already-in-use': {
        const isGoogleOnly =
          signInMethods.includes('google.com') && !signInMethods.includes('password');
        return {
          code,
          signInMethods,
          message: isGoogleOnly
            ? language === 'bn'
              ? 'এই ইমেইল দিয়ে ইতিপূর্বে একটি Google অ্যাকাউন্ট খোলা আছে। দয়া করে "গুগল দিয়ে প্রবেশ করুন" ব্যবহার করে লগইন করুন অথবা অন্য ইমেল ব্যবহার করুন।'
              : 'An account with this email already exists via Google Sign-In. Please click "Continue with Google" to log in or use a different email.'
            : language === 'bn'
            ? 'এই ইমেইল দিয়ে ইতিপূর্বে একটি অ্যাকাউন্ট খোলা আছে। দয়া করে লগইন করুন অথবা অন্য ইমেল ব্যবহার করুন।'
            : 'An account with this email already exists. Please log in or use a different email.',
        };
      }
      case 'auth/invalid-email':
        return {
          code,
          signInMethods,
          message:
            language === 'bn'
              ? 'অনুগ্রহ করে একটি সঠিক ইমেইল ঠিকানা লিখুন।'
              : 'Please enter a valid email address.',
        };
      case 'auth/weak-password':
        return {
          code,
          signInMethods,
          message:
            language === 'bn'
              ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
              : 'Password must be at least 6 characters long.',
        };
      case 'auth/too-many-requests':
        return {
          code,
          signInMethods,
          message:
            language === 'bn'
              ? 'অনেকবার ভুল চেষ্টা করা হয়েছে। কিছুক্ষণ অপেক্ষা করুন অথবা পাসওয়ার্ড রিসেট করুন।'
              : 'Too many failed attempts. Please wait a few minutes or reset your password.',
        };
      case 'auth/network-request-failed':
        return {
          code,
          signInMethods,
          message:
            language === 'bn'
              ? 'ইন্টারনেট সংযোগে সমস্যা হচ্ছে। নেটওয়ার্ক চেক করে আবার চেষ্টা করুন।'
              : 'Network error. Please check your connection and try again.',
        };
      case 'auth/operation-not-allowed':
        return {
          code,
          signInMethods,
          message:
            language === 'bn'
              ? 'Firebase Console-এ Email/Password বা Google Sign-In সক্রিয় করা নেই।'
              : 'This sign-in provider is not enabled in Firebase Authentication settings.',
        };
      default:
        return {
          code,
          signInMethods,
          message:
            err?.message ||
            (language === 'bn' ? 'অ্যাকাউন্ট প্রবেশ ব্যর্থ হয়েছে। আবার চেষ্টা করুন।' : 'Authentication failed. Please try again.'),
        };
    }
  };

  const validateFields = (): boolean => {
    const errors: FieldErrors = {};
    const trimmedEmail = email.trim();
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (authMode === 'register' && !name.trim()) {
      errors.name =
        language === 'bn' ? 'দয়া করে আপনার পূর্ণ নাম লিখুন।' : 'Please enter your full name.';
    }

    if (!trimmedEmail) {
      errors.email =
        language === 'bn' ? 'ইমেইল ঠিকানা লিখুন।' : 'Please enter your email address.';
    } else if (!emailPattern.test(trimmedEmail)) {
      errors.email =
        language === 'bn' ? 'একটি সঠিক ইমেইল ঠিকানা লিখুন।' : 'Please enter a valid email address.';
    }

    if (authMode !== 'forgot_password') {
      if (!password) {
        errors.password =
          language === 'bn' ? 'পাসওয়ার্ড লিখুন।' : 'Please enter your password.';
      } else if (authMode === 'register' && password.length < 6) {
        errors.password =
          language === 'bn'
            ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।'
            : 'Password must be at least 6 characters long.';
      }
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // 1. Email/Password Submit Handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMessage(null);
    setErrorCode(null);
    setErrorSignInMethods([]);
    setResetSent(false);

    if (!validateFields()) {
      return;
    }

    const token = ++attemptTokenRef.current;
    setIsLoading(true);

    try {
      if (authMode === 'forgot_password') {
        await sendPasswordReset(email.trim());
        if (attemptTokenRef.current === token) {
          setResetSent(true);
        }
        return;
      }

      if (authMode === 'login') {
        await loginWithEmail(email.trim(), password);
      } else {
        await registerWithEmail(name.trim(), email.trim(), password);
      }

      if (attemptTokenRef.current === token) {
        resetAllFormState('login');
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      if (attemptTokenRef.current === token) {
        const mapped = mapAuthError(err);
        setErrorMessage(mapped.message);
        setErrorCode(mapped.code);
        setErrorSignInMethods(mapped.signInMethods);
      }
    } finally {
      if (attemptTokenRef.current === token) {
        setIsLoading(false);
      }
    }
  };

  // 2. Google Sign In Handler
  const handleGoogleSignIn = async () => {
    if (isLoading) return;
    const token = ++attemptTokenRef.current;
    clearValidationAndErrors();
    setIsLoading(true);

    try {
      await signInWithGoogle();
      if (attemptTokenRef.current === token) {
        resetAllFormState('login');
      }
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (attemptTokenRef.current !== token) return;

      if (err?.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setErrorCode('auth/unauthorized-domain');
        setErrorMessage(
          language === 'bn'
            ? `ডোমেইন অনুমোদন প্রয়োজন: "${host}" ডোমেইনটি Firebase Console -> Authorized Domains তালিকায় যোগ করুন অথবা নিচে ইমেইল ও পাসওয়ার্ড দিয়ে প্রবেশ করুন।`
            : `Domain not authorized: Add "${host}" to Firebase Console -> Authentication -> Settings -> Authorized Domains, or sign in using Email & Password below.`
        );
      } else if (err?.code !== 'auth/popup-closed-by-user' && err?.code !== 'auth/cancelled-popup-request') {
        const mapped = mapAuthError(err);
        setErrorMessage(mapped.message);
        setErrorCode(mapped.code);
        setErrorSignInMethods(mapped.signInMethods);
      }
    } finally {
      if (attemptTokenRef.current === token) {
        setIsLoading(false);
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto max-w-full overflow-x-clip">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsAuthModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        />

        <div className="min-h-full flex items-start sm:items-center justify-center p-3 sm:p-4 max-w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="my-auto w-full max-w-md card-bg border border-[#1E1E24] rounded-3xl p-5 sm:p-8 text-left shadow-2xl relative overflow-hidden text-[#F3F4F6]"
          >
            {/* Top gold accent line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#1E1E24]" />

            {/* Close Button */}
            <button
              type="button"
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-3.5 right-3.5 min-w-[44px] min-h-[44px] flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            {user ? (
              /* --- LOGGED IN USER PROFILE VIEW --- */
              <div className="space-y-6">
                <div className="text-center pb-4 border-b border-[#1E1E24]">
                  <div className="w-16 h-16 rounded-2xl slate-bg border border-white/10 flex items-center justify-center mx-auto mb-3 gold-text shadow-lg">
                    {user.role === 'admin' ? (
                      <Crown className="w-8 h-8 text-[#D4AF37]" />
                    ) : (
                      <UserIcon className="w-8 h-8 text-[#D4AF37]" />
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-white font-sans">{user.name}</h3>
                  <div className="flex items-center justify-center gap-2 mt-1">
                    <span className="px-2.5 py-0.5 rounded-md bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] uppercase font-bold tracking-wider">
                      {user.membershipTier} Tier
                    </span>
                    {user.role === 'admin' && (
                      <span className="px-2.5 py-0.5 rounded-md bg-red-950 text-red-400 border border-red-800/40 text-[10px] uppercase font-bold tracking-wider">
                        ADMIN
                      </span>
                    )}
                  </div>
                </div>

                <div className="slate-bg border border-white/5 p-4 rounded-2xl space-y-2.5 text-xs text-gray-300">
                  {user.email && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-500">Email</span>
                      <span className="font-mono text-white text-[11px] truncate">{user.email}</span>
                    </div>
                  )}
                  {user.phoneNumber && (
                    <div className="flex justify-between items-center gap-2">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-mono text-white text-[11px]">{user.phoneNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-500">Loyalty Points</span>
                    <span className="font-mono font-bold gold-text text-xs tabular-nums">
                      {user.points.toLocaleString()} PTS
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-gray-500">Saved Address</span>
                    <span className="text-[11px] text-emerald-400 font-medium">
                      {user.defaultDeliveryInfo
                        ? (language === 'bn' ? 'সংরক্ষিত আছে' : 'Saved for 1-Click Checkout')
                        : (language === 'bn' ? 'প্রথম অর্ডারে যুক্ত হবে' : 'Saves on 1st Order')}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsAuthModalOpen(false)}
                    className="w-full min-h-[44px] slate-bg border border-white/10 hover:border-white/20 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer"
                  >
                    {language === 'bn' ? 'শপিং ব্যাগে ফিরে যান' : 'Continue Shopping'}
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="w-full min-h-[44px] bg-red-950/40 border border-red-900/40 hover:bg-red-900/40 py-2.5 px-4 rounded-xl text-xs font-semibold text-red-300 transition-all cursor-pointer"
                  >
                    {t('signOut')}
                  </button>
                </div>
              </div>
            ) : (
              /* --- GOOGLE & EMAIL/PASSWORD AUTH ONLY --- */
              <div>
                {/* Header Title */}
                <div className="flex items-center gap-2 mb-1.5">
                  <Crown className="w-4 h-4 gold-text" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold gold-text">
                    LUXORA BD ACCOUNT
                  </span>
                </div>

                <h3 className="text-xl font-bold font-luxury text-white mb-1">
                  {authMode === 'forgot_password'
                    ? (language === 'bn' ? 'পাসওয়ার্ড পুনরুদ্ধার করুন' : 'Reset Your Password')
                    : authMode === 'login'
                    ? t('authTitle')
                    : (language === 'bn' ? 'নতুন অ্যাকাউন্ট খুলুন' : 'Create Luxora Account')}
                </h3>
                <p className="text-xs text-gray-400 leading-relaxed mb-5 font-sans">
                  {authMode === 'forgot_password'
                    ? (language === 'bn'
                        ? 'আপনার অ্যাকাউন্টের ইমেইল দিন। আমরা একটি পাসওয়ার্ড রিসেট লিংক পাঠাবো।'
                        : 'Enter your registered email address to receive password reset instructions.')
                    : (language === 'bn'
                        ? 'দ্রুত অর্ডার ও অটো-সেভ ঠিকানার সুবিধা পেতে গুগল বা ইমেইল দিয়ে প্রবেশ করুন।'
                        : 'Sign in with Google or Email & Password to auto-save your address for repeat orders.')}
                </p>

                {/* Primary Google Sign-In Button (Visible on Login & Register) */}
                {authMode !== 'forgot_password' && (
                  <>
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleGoogleSignIn}
                      className="w-full min-h-[46px] bg-white hover:bg-gray-100 text-black font-bold text-xs py-3 px-4 rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                        <path
                          fill="#EA4335"
                          d="M12 5c1.6 0 3 .6 4.1 1.7l3.1-3.1C17.3 1.8 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3 0-.8.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.3 0 15.1s.7 5.4 1.9 7.8l3.7-2.9z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23.5c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16.5C3.7 20.2 7.5 23.5 12 23.5z"
                        />
                      </svg>
                      <span>{language === 'bn' ? 'গুগল দিয়ে প্রবেশ করুন' : 'Continue with Google'}</span>
                    </button>

                    <div className="relative my-5">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#1E1E24]" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase tracking-widest">
                        <span className="bg-[#121216] px-3 text-gray-500">
                          {language === 'bn' ? 'অথবা ইমেইল ও পাসওয়ার্ড' : 'OR WITH EMAIL & PASSWORD'}
                        </span>
                      </div>
                    </div>

                    {/* Clean 2-Mode Segmented Control: Sign In | Sign Up */}
                    <div className="flex rounded-xl bg-black/50 p-1 border border-white/5 mb-4">
                      <button
                        type="button"
                        onClick={() => switchAuthMode('login', { preserveEmail: true })}
                        className={`flex-1 min-h-[40px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          authMode === 'login'
                            ? 'slate-bg gold-text border border-white/10 shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <Mail className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'লগইন / সাইন ইন' : 'Sign In'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => switchAuthMode('register', { preserveEmail: true })}
                        className={`flex-1 min-h-[40px] flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                          authMode === 'register'
                            ? 'slate-bg gold-text border border-white/10 shadow-sm'
                            : 'text-gray-400 hover:text-white'
                        }`}
                      >
                        <UserIcon className="w-3.5 h-3.5" />
                        <span>{language === 'bn' ? 'নতুন অ্যাকাউন্ট' : 'Sign Up'}</span>
                      </button>
                    </div>
                  </>
                )}

                {/* Reset Link Success Banner */}
                {resetSent && (
                  <div className="mb-4 p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/50 flex items-start gap-2 text-xs text-emerald-200">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <span>
                      {language === 'bn'
                        ? 'পাসওয়ার্ড রিসেট লিংক আপনার ইমেইলে পাঠানো হয়েছে। ইনবক্স অথবা স্প্যাম ফোল্ডার চেক করুন।'
                        : 'A password reset link has been sent to your email. Please check your inbox or spam folder.'}
                    </span>
                  </div>
                )}

                {/* Error Alert Banner */}
                {errorMessage && (
                  <div
                    role="alert"
                    className="mb-4 p-3.5 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-2.5 text-xs text-red-200"
                  >
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1 space-y-2">
                      <p className="leading-relaxed">{errorMessage}</p>

                      {errorCode === 'auth/email-already-in-use' && (
                        <div className="flex flex-wrap items-center gap-3 pt-0.5">
                          <button
                            type="button"
                            onClick={() => switchAuthMode('login', { preserveEmail: true })}
                            className="inline-flex items-center gap-1 text-xs gold-text underline font-semibold hover:brightness-125 cursor-pointer py-1"
                          >
                            {language === 'bn' ? '→ লগইন ট্যাবে যান' : '→ Switch to Login'}
                          </button>

                          {errorSignInMethods.includes('google.com') &&
                            !errorSignInMethods.includes('password') && (
                              <button
                                type="button"
                                onClick={handleGoogleSignIn}
                                className="inline-flex items-center gap-1 text-xs text-white underline font-semibold hover:text-[#D4AF37] cursor-pointer py-1"
                              >
                                {language === 'bn' ? '→ গুগল দিয়ে লগইন করুন' : '→ Sign in with Google'}
                              </button>
                            )}
                        </div>
                      )}

                      {errorCode === 'auth/user-not-found' && (
                        <button
                          type="button"
                          onClick={() => switchAuthMode('register', { preserveEmail: true })}
                          className="block text-xs gold-text underline font-semibold hover:brightness-125 cursor-pointer py-1"
                        >
                          {language === 'bn' ? '→ নতুন অ্যাকাউন্ট খুলুন' : '→ Switch to Sign Up'}
                        </button>
                      )}

                      {(errorCode === 'auth/wrong-password' || errorCode === 'auth/invalid-credential') && (
                        <button
                          type="button"
                          onClick={() => switchAuthMode('forgot_password', { preserveEmail: true })}
                          className="block text-xs gold-text underline font-semibold hover:brightness-125 cursor-pointer py-1"
                        >
                          {language === 'bn' ? '→ পাসওয়ার্ড রিসেট করুন' : '→ Reset Password'}
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {/* Email & Password Form */}
                <form noValidate onSubmit={handleEmailSubmit} className="space-y-3.5">
                  {authMode === 'register' && (
                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
                        {language === 'bn' ? 'আপনার পূর্ণ নাম *' : 'Full Name *'}
                      </label>
                      <input
                        type="text"
                        value={name}
                        onChange={(e) => {
                          setName(e.target.value);
                          if (fieldErrors.name) {
                            setFieldErrors((prev) => ({ ...prev, name: undefined }));
                          }
                          if (errorMessage) {
                            setErrorMessage(null);
                            setErrorCode(null);
                          }
                        }}
                        placeholder={language === 'bn' ? 'উদা: তানভীর আহমেদ' : 'e.g. Tanvir Ahmed'}
                        className={`w-full min-h-[44px] bg-[#0A0A0C] border rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder:text-gray-600 outline-none transition-colors ${
                          fieldErrors.name
                            ? 'border-red-500/80 focus:border-red-400'
                            : 'border-[#1E1E24] focus:border-[#D4AF37]'
                        }`}
                      />
                      {fieldErrors.name && (
                        <p className="mt-1 text-[11px] text-red-400">{fieldErrors.name}</p>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
                      {language === 'bn' ? 'ইমেইল ঠিকানা *' : 'Email Address *'}
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (fieldErrors.email) {
                          setFieldErrors((prev) => ({ ...prev, email: undefined }));
                        }
                        if (errorMessage) {
                          setErrorMessage(null);
                          setErrorCode(null);
                          setErrorSignInMethods([]);
                        }
                      }}
                      placeholder="you@example.com"
                      className={`w-full min-h-[44px] bg-[#0A0A0C] border rounded-xl px-3.5 py-2.5 text-base sm:text-xs text-white placeholder:text-gray-600 outline-none transition-colors ${
                        fieldErrors.email
                          ? 'border-red-500/80 focus:border-red-400'
                          : 'border-[#1E1E24] focus:border-[#D4AF37]'
                      }`}
                    />
                    {fieldErrors.email && (
                      <p className="mt-1 text-[11px] text-red-400">{fieldErrors.email}</p>
                    )}
                  </div>

                  {authMode !== 'forgot_password' && (
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                          {language === 'bn' ? 'পাসওয়ার্ড *' : 'Password *'}
                        </label>
                        {authMode === 'login' && (
                          <button
                            type="button"
                            onClick={() => switchAuthMode('forgot_password', { preserveEmail: true })}
                            className="text-[11px] text-gray-400 hover:text-[#D4AF37] transition-colors cursor-pointer py-1"
                          >
                            {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-gray-500 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (fieldErrors.password) {
                              setFieldErrors((prev) => ({ ...prev, password: undefined }));
                            }
                            if (errorMessage) {
                              setErrorMessage(null);
                              setErrorCode(null);
                            }
                          }}
                          placeholder="••••••••"
                          className={`w-full min-h-[44px] bg-[#0A0A0C] border rounded-xl pl-9 pr-3.5 py-2.5 text-base sm:text-xs text-white placeholder:text-gray-600 outline-none transition-colors ${
                            fieldErrors.password
                              ? 'border-red-500/80 focus:border-red-400'
                              : 'border-[#1E1E24] focus:border-[#D4AF37]'
                          }`}
                        />
                      </div>
                      {fieldErrors.password && (
                        <p className="mt-1 text-[11px] text-red-400">{fieldErrors.password}</p>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full min-h-[46px] gold-bg hover:bg-[#E5C158] text-black font-bold uppercase tracking-widest text-xs py-3 px-4 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin text-black" />
                    ) : (
                      <>
                        <span>
                          {authMode === 'forgot_password'
                            ? (language === 'bn' ? 'রিসেট লিংক পাঠান' : 'Send Reset Link')
                            : authMode === 'login'
                            ? t('continueBtn')
                            : (language === 'bn' ? 'অ্যাকাউন্ট তৈরি করুন' : 'Create Account')}
                        </span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>

                  {authMode === 'forgot_password' && (
                    <div className="text-center pt-2">
                      <button
                        type="button"
                        onClick={() => switchAuthMode('login', { preserveEmail: true })}
                        className="min-h-[40px] text-xs text-gray-400 hover:text-[#D4AF37] transition-colors cursor-pointer"
                      >
                        {language === 'bn' ? '← সাইন ইন পেজে ফিরে যান' : '← Back to Sign In'}
                      </button>
                    </div>
                  )}
                </form>

                {/* Footer security badge */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-gray-500 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 gold-text" />
                  <span>GOOGLE & EMAIL SECURED FIREBASE AUTH</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
