import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Lock, 
  Database, 
  BrainCircuit, 
  ArrowRight, 
  Loader2 
} from 'lucide-react';
import { LandingVideoBackground } from './LandingVideoBackground';

interface LandingPageProps {
  onSignIn: () => void;
  isLoading: boolean;
  error?: string | null;
  onOpenSecurityModal: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  isLoading,
  error,
  onOpenSecurityModal
}) => {
  return (
    <LandingVideoBackground
      videoSrc="/video/ladywithbook.mp4"
      posterSrc="/images/autumn_forest_poster.jpg"
      fallbackColor="#FAF3E1"
    >
      <div className="min-h-screen flex flex-col justify-between text-[#111111] selection:bg-[#F5E7C6] selection:text-[#111111]">
        {/* Header Bar */}
        <header className="border-b border-[#DFCBA0] bg-[#FAF3E1]/95 backdrop-blur-md px-6 py-4 shadow-xs">
          <div className="mx-auto flex max-w-6xl items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FA8112] text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </div>
              <span className="text-lg font-serif font-bold tracking-tight text-[#111111]">
                Inner Sanctum
              </span>
            </div>

            <button
              id="btn-nav-security"
              onClick={onOpenSecurityModal}
              className="flex items-center gap-1.5 text-xs font-bold text-[#1F1B15] hover:text-[#FA8112] bg-[#F5E7C6] px-3 py-1.5 rounded-xl border border-[#DFCBA0] transition-colors cursor-pointer shadow-2xs"
            >
              <ShieldCheck className="h-4 w-4 text-[#FA8112]" />
              <span>Threat Model & Rules</span>
            </button>
          </div>
        </header>

        {/* Main Hero & Auth Section */}
        <main className="mx-auto my-auto flex w-full max-w-4xl flex-col items-center px-6 py-12 text-center">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#DFCBA0] bg-[#FAF3E1]/90 backdrop-blur-sm px-4 py-1 text-xs font-bold text-[#994500] shadow-xs">
            <BrainCircuit className="h-3.5 w-3.5 text-[#FA8112]" />
            <span>Socratic Inquiries with Gemini 3.6 Flash & Cloud Firestore</span>
          </div>

          {/* Hero Title with Full Name specifically for landing page */}
          <h1 className="max-w-3xl font-serif text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-[#111111] leading-[1.15] drop-shadow-xs">
            Inner Sanctum: A Reflection Record
          </h1>

          {/* Subtitle */}
          <p className="mt-5 max-w-2xl text-base sm:text-lg text-[#1A1A1A] font-medium leading-relaxed drop-shadow-xs">
            A quiet, private sanctuary for your thoughts & reflections. Unpack complex dilemmas, brainstorm creative avenues, and distill clarity through multi-turn Socratic dialogue with Gemini.
          </p>

          {/* Error message if any */}
          {error && (
            <div className="mt-6 w-full max-w-md rounded-xl border border-[#F5CACA] bg-[#FDF2F2] p-4 text-xs sm:text-sm text-[#9E3636] text-left">
              <p className="font-bold">Authentication notice:</p>
              <p className="mt-1 text-xs text-[#9E3636]">{error}</p>
            </div>
          )}

          {/* Primary Sign In Button */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <button
              id="btn-google-signin"
              onClick={onSignIn}
              disabled={isLoading}
              className="group flex h-13 items-center justify-center gap-3 rounded-xl border-2 border-[#DFCBA0] bg-[#FAF3E1]/95 px-8 text-sm font-bold text-[#111111] shadow-md hover:border-[#FA8112] hover:bg-[#F5E7C6] focus:outline-none focus:ring-2 focus:ring-[#FA8112]/30 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 transition-all cursor-pointer"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-[#FA8112]" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="h-4 w-4 text-[#111111] group-hover:translate-x-0.5 group-hover:text-[#FA8112] transition-all" />
                </>
              )}
            </button>

            <p className="text-xs text-[#1F1B15] font-semibold">
              Passwordless federated identity. No custom credentials stored.
            </p>
          </div>

          {/* Security & Architecture Badges */}
          <div className="mt-14 grid w-full max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3 text-left">
            <div className="rounded-2xl border border-[#DFCBA0] bg-[#FAF3E1]/85 backdrop-blur-md p-5 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E7C6] text-[#FA8112] mb-3">
                <Lock className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-serif font-bold text-[#111111]">
                Strict User Isolation
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#1A1A1A] font-medium">
                Database security rules enforce <code className="rounded bg-[#EBDAB3] px-1 py-0.5 text-[11px] font-bold text-[#111111]">request.auth.uid == userId</code> so reflections are strictly isolated.
              </p>
            </div>

            <div className="rounded-2xl border border-[#DFCBA0] bg-[#FAF3E1]/85 backdrop-blur-md p-5 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E7C6] text-[#FA8112] mb-3">
                <BrainCircuit className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-serif font-bold text-[#111111]">
                Multi-Turn Socratic AI
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#1A1A1A] font-medium">
                Gemini 3.6 Flash dynamically assists with reflective inquiry, structured brainstorming, and one-click key takeaways.
              </p>
            </div>

            <div className="rounded-2xl border border-[#DFCBA0] bg-[#FAF3E1]/85 backdrop-blur-md p-5 shadow-sm">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#F5E7C6] text-[#FA8112] mb-3">
                <Database className="h-4 w-4" />
              </div>
              <h3 className="text-sm font-serif font-bold text-[#111111]">
                Cloud Persistence
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-[#1A1A1A] font-medium">
                Real-time Firestore listeners automatically sync your reflections across devices with zero undefined payload crashes.
              </p>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#DFCBA0] bg-[#FAF3E1]/95 backdrop-blur-md px-6 py-4 text-center text-xs text-[#1F1B15] font-semibold shadow-xs">
          <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-2">
            <span>Enterprise-grade architecture built with Google Cloud Run & Firebase</span>
            <div className="flex items-center gap-4">
              <button 
                onClick={onOpenSecurityModal} 
                className="text-[#111111] hover:text-[#FA8112] underline underline-offset-2 transition-colors cursor-pointer font-bold"
              >
                Security Threat Model
              </button>
              <span>•</span>
              <span className="text-[#3D352A]">Gemini 3.6 Flash Resilient Ladder</span>
            </div>
          </div>
        </footer>
      </div>
    </LandingVideoBackground>
  );
};
