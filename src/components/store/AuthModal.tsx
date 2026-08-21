import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Crown, 
  ShieldCheck, 
  Sparkles, 
  Phone, 
  Mail, 
  Lock, 
  ArrowRight, 
  Loader2, 
  CheckCircle2, 
  User as UserIcon,
  Smartphone,
  Globe,
  KeyRound,
  ShieldAlert
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { ConfirmationResult, RecaptchaVerifier } from 'firebase/auth';

type AuthTab = 'email' | 'phone' | 'social';
type AuthMode = 'login' | 'register' | 'forgot_password';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    setIsAuthModalOpen,
    user,
    loginWithEmail,
    registerWithEmail,
    sendPasswordReset,
    signInWithGoogle,
    setupRecaptcha,
    sendPhoneOtp,
    verifyPhoneOtp,
    signInAsGuest,
    logout,
    language,
    t,
    addToast
  } = useApp();

  // Tab & Mode State
  const [activeTab, setActiveTab] = useState<AuthTab>('email');
  const [authMode, setAuthMode] = useState<AuthMode>('login');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otpCode, setOtpCode] = useState('');

  // Status & Confirmation
  const [isLoading, setIsLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phoneStep, setPhoneStep] = useState<'input' | 'otp'>('input');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  // Clear state when modal closes/opens
  useEffect(() => {
    if (isAuthModalOpen) {
      setErrorMessage(null);
      setIsLoading(false);
      setResetSent(false);
    }
  }, [isAuthModalOpen]);

  if (!isAuthModalOpen) return null;

  // 1. Email/Password Submit Handler
  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      if (authMode === 'forgot_password') {
        if (!email.trim()) {
          throw new Error(language === 'bn' ? 'দয়া করে আপনার ইমেইল দিন' : 'Please enter your email');
        }
        await sendPasswordReset(email.trim());
        setResetSent(true);
        setIsLoading(false);
        return;
      }

      if (authMode === 'login') {
        await loginWithEmail(email, password);
      } else {
        if (!name.trim()) {
          throw new Error(language === 'bn' ? 'দয়া করে আপনার পূর্ণ নাম লিখুন' : 'Please enter your full name');
        }
        await registerWithEmail(name, email, password, phoneNumber);
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      let msg = err.message || 'Authentication failed';
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found') {
        msg = language === 'bn' ? 'ভুল ইমেইল অথবা পাসওয়ার্ড। পাসওয়ার্ড ভুলে গেলে নিচে রিসেট অপশন ব্যবহার করুন।' : 'Invalid email or password. You can reset your password below.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = language === 'bn' ? 'এই ইমেইলটি দিয়ে ইতিমধ্যে অ্যাকাউন্ট খোলা আছে। দয়া করে সাইন ইন করুন।' : 'This email is already registered. Please sign in instead.';
      } else if (err.code === 'auth/weak-password') {
        msg = language === 'bn' ? 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' : 'Password must be at least 6 characters';
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Phone OTP Request Handler
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanNum = phoneNumber.trim().replace(/[\s-]/g, '');
    if (!cleanNum || cleanNum.length < 10) {
      setErrorMessage(language === 'bn' ? 'সঠিক বাংলাদেশি মোবাইল নম্বর দিন (উদা: 017XXXXXXXX)' : 'Please enter a valid Bangladeshi phone number (e.g. 017XXXXXXXX)');
      return;
    }

    setIsLoading(true);

    try {
      if (!recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current = setupRecaptcha('recaptcha-container');
      }
      const confirmation = await sendPhoneOtp(cleanNum, recaptchaVerifierRef.current);
      setConfirmationResult(confirmation);
      setPhoneStep('otp');
      addToast({
        type: 'info',
        titleEn: 'SMS Verification Code Sent',
        titleBn: 'এসএমএস ওটিপি কোড পাঠানো হয়েছে',
        descriptionEn: `Enter the 6-digit code sent to ${cleanNum}`,
        descriptionBn: `${cleanNum} নম্বরে প্রেরিত ৬ ডিজিটের কোডটি দিন`,
      });
    } catch (err: any) {
      console.error('Phone OTP Error:', err);
      setErrorMessage(err.message || 'Failed to send SMS OTP. Please check phone number.');
      if (recaptchaVerifierRef.current) {
        recaptchaVerifierRef.current.clear();
        recaptchaVerifierRef.current = null;
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Phone OTP Verify Handler
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !otpCode.trim()) return;

    setErrorMessage(null);
    setIsLoading(true);

    try {
      await verifyPhoneOtp(confirmationResult, otpCode, name);
    } catch (err: any) {
      console.error('OTP Verification Error:', err);
      setErrorMessage(language === 'bn' ? 'ভুল ওটিপি কোড, আবার চেষ্টা করুন' : 'Invalid OTP code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Google Sign In Handler
  const handleGoogleSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        const host = typeof window !== 'undefined' ? window.location.hostname : '';
        setErrorMessage(
          language === 'bn'
            ? `ডোমেইন অনুমোদন প্রয়োজন: "${host}" ডোমেইনটি ফায়ারবেস কনসোলে (Authorized Domains) তালিকায় যোগ করুন অথবা নিচে ইমেইল/পাসওয়ার্ড দিয়ে প্রবেশ করুন।`
            : `Domain not authorized: Please add "${host}" to Firebase Console -> Authentication -> Settings -> Authorized Domains, or sign in using Email / Phone.`
        );
      } else if (err.code !== 'auth/popup-closed-by-user') {
        setErrorMessage(err.message || 'Google sign-in failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Guest Sign In Handler
  const handleGuestSignIn = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await signInAsGuest();
    } catch (err: any) {
      console.error('Guest Auth Error:', err);
      setErrorMessage(err.message || 'Guest login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto max-w-full overflow-x-hidden">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => setIsAuthModalOpen(false)}
          className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        />

        <div className="min-h-full flex items-center justify-center p-3 sm:p-4 max-w-full">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="w-full max-w-md card-bg border border-[#1E1E24] rounded-3xl p-5 sm:p-8 text-left shadow-2xl relative overflow-hidden text-[#F3F4F6]"
          >
            {/* Top gold accent line */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-[#D4AF37] via-[#E5C158] to-[#1E1E24]" />

            {/* Invisible Recaptcha Container */}
            <div id="recaptcha-container"></div>

            {/* Close Button */}
            <button
              onClick={() => setIsAuthModalOpen(false)}
              className="absolute top-5 right-5 p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer"
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
                    <span className="px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 text-[10px] uppercase font-bold tracking-wider">
                      {user.membershipTier} Tier
                    </span>
                    {user.role === 'admin' && (
                      <span className="px-2.5 py-0.5 rounded-full bg-red-950 text-red-400 border border-red-800/40 text-[10px] uppercase font-bold tracking-wider">
                        ADMIN
                      </span>
                    )}
                  </div>
                </div>

                <div className="slate-bg border border-white/5 p-4 rounded-2xl space-y-2.5 text-xs text-gray-300">
                  {user.email && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Email</span>
                      <span className="font-mono text-white text-[11px]">{user.email}</span>
                    </div>
                  )}
                  {user.phoneNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-gray-500">Phone</span>
                      <span className="font-mono text-white text-[11px]">{user.phoneNumber}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Loyalty Points</span>
                    <span className="font-mono font-bold gold-text text-xs">
                      {user.points.toLocaleString()} PTS
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-500">Database ID</span>
                    <span className="font-mono text-[10px] text-gray-400 truncate max-w-[180px]">
                      {user.id}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={() => setIsAuthModalOpen(false)}
                    className="w-full slate-bg border border-white/10 hover:border-white/20 py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider text-white transition-all cursor-pointer"
                  >
                    {language === 'bn' ? 'শপিং ব্যাগে ফিরে যান' : 'Continue Shopping'}
                  </button>

                  <button
                    onClick={logout}
                    className="w-full bg-red-950/40 border border-red-900/40 hover:bg-red-900/40 py-2.5 px-4 rounded-xl text-xs font-semibold text-red-300 transition-all cursor-pointer"
                  >
                    {t('signOut')}
                  </button>
                </div>
              </div>
            ) : (
              /* --- SIGN IN / REGISTER FORM --- */
              <div>
                {/* Header Title */}
                <div className="flex items-center gap-2 mb-1.5">
                  <Crown className="w-4 h-4 gold-text" />
                  <span className="text-[10px] uppercase tracking-[0.2em] font-bold gold-text">
                    LUXORA PRIVILEGE AUTH
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
                    ? (language === 'bn' ? 'আপনার অ্যাকাউন্টের ইমেইল দিন। আমরা একটি পাসওয়ার্ড রিসেট লিংক পাঠাবো।' : 'Enter your registered email address to receive password reset instructions.')
                    : authMode === 'login' 
                    ? t('authSubtitle') 
                    : (language === 'bn' ? 'বাংলাদেশের সবচেয়ে বিশ্বস্ত লাক্সারি গ্যাজেট মেম্বারশিপে যোগ দিন।' : 'Unlock priority concierge dispatch, rewards, and order tracking.')}
                </p>

                {/* Tab Selectors */}
                {authMode !== 'forgot_password' && (
                  <div className="flex rounded-xl bg-black/50 p-1 border border-white/5 mb-5">
                    <button
                      type="button"
                      onClick={() => { setActiveTab('email'); setErrorMessage(null); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'email'
                          ? 'slate-bg gold-text border border-white/10 shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Mail className="w-3.5 h-3.5" />
                      <span>Email</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('phone'); setErrorMessage(null); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'phone'
                          ? 'slate-bg gold-text border border-white/10 shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Phone OTP</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => { setActiveTab('social'); setErrorMessage(null); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        activeTab === 'social'
                          ? 'slate-bg gold-text border border-white/10 shadow-sm'
                          : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      <Globe className="w-3.5 h-3.5" />
                      <span>Social / Guest</span>
                    </button>
                  </div>
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

                {/* Error Banner */}
                {errorMessage && (
                  <div className="mb-4 p-3 rounded-xl bg-red-950/40 border border-red-800/50 flex items-start gap-2 text-xs text-red-200">
                    <ShieldAlert className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span>{errorMessage}</span>
                      {errorMessage.includes('ইতিমধ্যে') || errorMessage.includes('already registered') ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('login');
                            setActiveTab('email');
                            setErrorMessage(null);
                          }}
                          className="block mt-1.5 text-xs gold-text underline font-semibold hover:brightness-125 cursor-pointer"
                        >
                          {language === 'bn' ? '→ সাইন ইন ট্যাবে যান' : '→ Go to Sign In tab'}
                        </button>
                      ) : null}
                    </div>
                  </div>
                )}

                {/* 1. EMAIL & PASSWORD TAB */}
                {activeTab === 'email' && (
                  <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                    {authMode === 'register' && (
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
                          {language === 'bn' ? 'আপনার নাম' : 'Full Legal Name'}
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={language === 'bn' ? 'উদা: তানজির আহমেদ' : 'e.g. Tanzir Ahmed'}
                            className="w-full bg-[#0A0A0C] border border-[#1E1E24] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none transition-colors"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@luxoragroup.com"
                        className="w-full bg-[#0A0A0C] border border-[#1E1E24] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none transition-colors"
                      />
                    </div>

                    {authMode !== 'forgot_password' && (
                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400">
                            Password
                          </label>
                          {authMode === 'login' && (
                            <button
                              type="button"
                              onClick={() => {
                                setAuthMode('forgot_password');
                                setErrorMessage(null);
                                setResetSent(false);
                              }}
                              className="text-[10px] text-gray-400 hover:text-[#D4AF37] transition-colors cursor-pointer"
                            >
                              {language === 'bn' ? 'পাসওয়ার্ড ভুলে গেছেন?' : 'Forgot password?'}
                            </button>
                          )}
                        </div>
                        <input
                          type="password"
                          required
                          minLength={6}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          className="w-full bg-[#0A0A0C] border border-[#1E1E24] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none transition-colors"
                        />
                      </div>
                    )}

                    {authMode === 'register' && (
                      <div>
                        <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
                          {language === 'bn' ? 'মোবাইল নম্বর (ঐচ্ছিক)' : 'Bangladeshi Mobile (Optional)'}
                        </label>
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+880 17XXXXXXXX"
                          className="w-full bg-[#0A0A0C] border border-[#1E1E24] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none transition-colors font-mono"
                        />
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full gold-bg hover:bg-[#E5C158] text-black font-bold uppercase tracking-widest text-xs py-3 px-4 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 mt-2 disabled:opacity-50"
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
                              : (language === 'bn' ? 'অ্যাকাউন্ট রেজিস্টার করুন' : 'Register Profile')}
                          </span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>

                    <div className="text-center pt-2">
                      {authMode === 'forgot_password' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode('login');
                            setErrorMessage(null);
                            setResetSent(false);
                          }}
                          className="text-xs text-gray-400 hover:text-[#D4AF37] transition-colors cursor-pointer"
                        >
                          {language === 'bn' ? '← সাইন ইন পেজে ফিরে যান' : '← Back to Sign In'}
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setAuthMode(authMode === 'login' ? 'register' : 'login');
                            setErrorMessage(null);
                            setResetSent(false);
                          }}
                          className="text-xs text-gray-400 hover:text-[#D4AF37] transition-colors cursor-pointer"
                        >
                          {authMode === 'login' 
                            ? (language === 'bn' ? 'নতুন ব্যবহারকারী? এখানে সাইন আপ করুন' : "Don't have an account? Sign up")
                            : (language === 'bn' ? 'ইতিমধ্যে অ্যাকাউন্ট আছে? সাইন ইন করুন' : 'Already have an account? Sign in')}
                        </button>
                      )}
                    </div>
                  </form>
                )}

                {/* 2. PHONE OTP TAB */}
                {activeTab === 'phone' && (
                  <div>
                    {phoneStep === 'input' ? (
                      <form onSubmit={handleSendOtp} className="space-y-3.5">
                        <div>
                          <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
                            {language === 'bn' ? 'আপনার নাম (ঐচ্ছিক)' : 'Full Name (Optional)'}
                          </label>
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={language === 'bn' ? 'উদা: তানজির আহমেদ' : 'e.g. Tanzir Ahmed'}
                            className="w-full bg-[#0A0A0C] border border-[#1E1E24] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none transition-colors"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
                            {language === 'bn' ? 'বাংলাদেশি মোবাইল নম্বর' : 'Bangladeshi Mobile (+880)'}
                          </label>
                          <div className="relative">
                            <input
                              type="tel"
                              required
                              value={phoneNumber}
                              onChange={(e) => setPhoneNumber(e.target.value)}
                              placeholder="01711234567"
                              className="w-full bg-[#0A0A0C] border border-[#1E1E24] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-gray-600 outline-none transition-colors font-mono"
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 mt-1 block">
                            {language === 'bn' ? 'আমরা ৬ ডিজিটের ওটিপি ভেরিফিকেশন কোড পাঠাবো।' : 'We will send a 6-digit OTP verification code via SMS.'}
                          </span>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full gold-bg hover:bg-[#E5C158] text-black font-bold uppercase tracking-widest text-xs py-3 px-4 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                          ) : (
                            <>
                              <span>{language === 'bn' ? 'ওটিপি কোড পাঠান' : 'Send SMS Verification Code'}</span>
                              <ArrowRight className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </form>
                    ) : (
                      <form onSubmit={handleVerifyOtp} className="space-y-3.5">
                        <div className="p-3 rounded-xl slate-bg border border-white/5 text-center">
                          <span className="text-xs text-gray-300 block mb-1">
                            {language === 'bn' ? 'প্রেরিত ওটিপি কোডটি লিখুন:' : 'Enter 6-Digit SMS Code sent to:'}
                          </span>
                          <span className="text-sm font-mono font-bold text-white tracking-widest">
                            {phoneNumber}
                          </span>
                        </div>

                        <div>
                          <label className="block text-[11px] uppercase tracking-wider font-semibold text-gray-400 mb-1">
                            6-Digit OTP Code
                          </label>
                          <input
                            type="text"
                            maxLength={6}
                            required
                            value={otpCode}
                            onChange={(e) => setOtpCode(e.target.value)}
                            placeholder="123456"
                            className="w-full bg-[#0A0A0C] border border-[#1E1E24] focus:border-[#D4AF37] rounded-xl px-3.5 py-2.5 text-center text-lg tracking-[0.3em] font-mono text-white placeholder:text-gray-600 outline-none transition-colors"
                          />
                          <p className="text-[10px] text-gray-500 text-center mt-1">
                            {language === 'bn' ? 'টেস্টিং কোড: 123456 ব্যবহার করতে পারেন' : 'For quick testing in preview: 123456'}
                          </p>
                        </div>

                        <button
                          type="submit"
                          disabled={isLoading}
                          className="w-full gold-bg hover:bg-[#E5C158] text-black font-bold uppercase tracking-widest text-xs py-3 px-4 rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          {isLoading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-black" />
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{language === 'bn' ? 'ভেরিফাই ও প্রবেশ করুন' : 'Verify & Sign In'}</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => { setPhoneStep('input'); setErrorMessage(null); }}
                          className="w-full text-center text-xs text-gray-400 hover:text-white pt-2 cursor-pointer"
                        >
                          {language === 'bn' ? '← নম্বর পরিবর্তন করুন' : '← Change Phone Number'}
                        </button>
                      </form>
                    )}
                  </div>
                )}

                {/* 3. SOCIAL & GUEST TAB */}
                {activeTab === 'social' && (
                  <div className="space-y-3">
                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleGoogleSignIn}
                      className="w-full bg-white hover:bg-gray-100 text-black font-bold text-xs py-3 px-4 rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      <svg className="w-4 h-4" viewBox="0 0 24 24">
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

                    <div className="relative my-4">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-[#1E1E24]" />
                      </div>
                      <div className="relative flex justify-center text-[9px] uppercase tracking-widest">
                        <span className="bg-[#121212] px-2 text-gray-500">GUEST EXPLORER</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={isLoading}
                      onClick={handleGuestSignIn}
                      className="w-full slate-bg border border-white/10 hover:border-white/20 text-white font-semibold text-xs py-3 px-4 rounded-xl shadow transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <UserIcon className="w-4 h-4 gold-text" />
                      <span>{language === 'bn' ? 'গেস্ট হিসেবে চালিয়ে যান' : 'Continue as Guest Shopper'}</span>
                    </button>
                  </div>
                )}

                {/* Footer security badge */}
                <div className="mt-6 pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-gray-500 font-mono">
                  <ShieldCheck className="w-3.5 h-3.5 gold-text" />
                  <span>256-BIT ENCRYPTED FIREBASE AUTH ENGINE</span>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};
