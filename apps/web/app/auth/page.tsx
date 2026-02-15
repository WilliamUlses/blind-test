/**
 * Page Auth - Connexion / Inscription avec OAuth
 * Glassmorphism dark theme matching the rest of the app
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2, Mail, Lock, User, Eye, EyeOff } from 'lucide-react';
import { useAuthStore } from '../../hooks/useAuth';

type Tab = 'login' | 'register';

const API_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

export default function AuthPage() {
  const router = useRouter();
  const { login, register, isAuthenticated, isLoading, error, clearError } = useAuthStore();

  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pseudo, setPseudo] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Clear errors when switching tabs
  useEffect(() => {
    clearError();
  }, [tab, clearError]);

  const handleSubmit = useCallback(async () => {
    if (submitting) return;
    setSubmitting(true);

    let success = false;
    if (tab === 'login') {
      success = await login(email, password);
    } else {
      success = await register(email, password, pseudo);
    }

    setSubmitting(false);
    if (success) {
      router.push('/');
    }
  }, [tab, email, password, pseudo, submitting, login, register, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleSubmit();
    },
    [handleSubmit]
  );

  const canSubmit =
    tab === 'login'
      ? email.trim() && password
      : email.trim() && password && pseudo.trim();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-primary/20 rounded-full blur-[120px] animate-pulse-slow" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-secondary/20 rounded-full blur-[120px] animate-pulse-slow delay-700" />
      </div>

      <div className="w-full max-w-md z-10 relative">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 text-white/40 hover:text-white transition-colors text-sm font-bold uppercase tracking-wider"
          >
            <ArrowLeft className="w-4 h-4" />
            Retour
          </button>
        </motion.div>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8 text-center"
        >
          <h1 className="font-display text-4xl md:text-5xl font-black mb-2 tracking-tighter">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Mon Compte
            </span>
          </h1>
          <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
            Sauvegarde tes stats et ton historique
          </p>
        </motion.div>

        {/* Glass panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel rounded-3xl p-6 md:p-8 backdrop-blur-2xl"
          onKeyDown={handleKeyDown}
        >
          {/* Tabs */}
          <div className="flex gap-1 p-1 bg-white/5 rounded-2xl mb-6">
            {(['login', 'register'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`
                  flex-1 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all duration-300
                  ${tab === t
                    ? 'bg-gradient-to-r from-primary to-secondary text-white shadow-lg'
                    : 'text-white/40 hover:text-white/60'
                  }
                `}
              >
                {t === 'login' ? 'Connexion' : 'Inscription'}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, x: tab === 'login' ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: tab === 'login' ? 20 : -20 }}
              transition={{ duration: 0.2 }}
              className="space-y-4"
            >
              {/* Pseudo (register only) */}
              {tab === 'register' && (
                <div>
                  <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 ml-4">
                    Pseudo
                  </label>
                  <div className="relative">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                    <input
                      type="text"
                      value={pseudo}
                      onChange={(e) => setPseudo(e.target.value)}
                      placeholder="Ton pseudo"
                      className="w-full pl-11 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all"
                      maxLength={20}
                      autoFocus={tab === 'register'}
                      disabled={submitting}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 ml-4">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ton@email.com"
                    className="w-full pl-11 pr-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all"
                    autoFocus={tab === 'login'}
                    disabled={submitting}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2 ml-4">
                  Mot de passe
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={tab === 'register' ? '6 caractères minimum' : 'Mot de passe'}
                    className="w-full pl-11 pr-12 py-4 bg-white/5 border border-white/10 rounded-2xl text-white text-sm font-bold placeholder:text-white/20 focus:outline-none focus:bg-white/10 focus:border-primary/50 transition-all"
                    disabled={submitting}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/50 transition-colors"
                    aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                className="w-full px-8 py-4 bg-gradient-to-r from-primary to-secondary rounded-2xl text-white text-sm font-black uppercase tracking-wider hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-primary/20 flex items-center justify-center gap-3"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {tab === 'login' ? 'Connexion...' : 'Inscription...'}
                  </>
                ) : (
                  tab === 'login' ? 'Se connecter' : "S'inscrire"
                )}
              </button>
            </motion.div>
          </AnimatePresence>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-red-400 text-xs text-center font-bold"
              >
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-white/20 text-[10px] font-bold uppercase tracking-widest">ou</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* OAuth buttons */}
          <div className="space-y-3">
            <a
              href={`${API_URL}/api/auth/google`}
              className="w-full px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white font-bold hover:bg-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-3 text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Continuer avec Google
            </a>

            <a
              href={`${API_URL}/api/auth/discord`}
              className="w-full px-6 py-4 bg-[#5865F2]/10 border border-[#5865F2]/20 rounded-2xl text-white font-bold hover:bg-[#5865F2]/20 hover:border-[#5865F2]/30 transition-all flex items-center justify-center gap-3 text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="#5865F2">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
              </svg>
              Continuer avec Discord
            </a>
          </div>
        </motion.div>

        {/* Footer note */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-6 text-center text-white/15 text-[10px] font-medium tracking-wide"
        >
          Tu peux aussi jouer sans compte depuis l&apos;accueil
        </motion.p>
      </div>
    </div>
  );
}
