'use client'

import React, { useState } from 'react'
import { ArrowRight, Fingerprint, Loader2, Lock } from 'lucide-react'
import { APP_NAME } from '@/lib/session'

interface LoginScreenProps {
  onLogin: () => void
}

/** One reviewer: a portrait photo in a white ring */
const Avatar: React.FC<{ x: number; y: number; src: string; id: string }> = ({ x, y, src, id }) => (
  <g transform={`translate(${x} ${y})`}>
    <clipPath id={`lg-av-${id}`}>
      <circle r="13" />
    </clipPath>
    <circle r="14.5" fill="#ffffff" />
    <image href={src} x="-13" y="-13" width="26" height="26" preserveAspectRatio="xMidYMid slice" clipPath={`url(#lg-av-${id})`} />
  </g>
)

const PORTRAITS = [
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=96&h=96&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=96&h=96&auto=format&fit=crop&q=80',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=96&h=96&auto=format&fit=crop&q=80',
]

/** Decorative workflow: a request travels from the form, through the AI agent, to the reviewers and is approved */
const FlowIllustration: React.FC = () => (
  <svg viewBox="0 0 440 300" className="w-full max-w-[420px] h-auto select-none" aria-hidden="true" fill="none">
    {/* Orbit rings */}
    <circle cx="220" cy="140" r="122" stroke="#cfe9ec" strokeDasharray="2 6" />
    <circle cx="220" cy="140" r="84" stroke="#d9eef1" />

    {/* Connectors */}
    <path d="M100 76 C 150 76, 150 140, 186 140" stroke="#7fd6dc" strokeWidth="1.75" className="login-dash" />
    <path d="M254 140 C 292 140, 296 86, 330 82" stroke="#7fd6dc" strokeWidth="1.75" className="login-dash" />
    <path d="M254 140 C 292 140, 296 196, 330 200" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="3 5" />
    <circle r="3.5" fill="#0f8a93">
      <animateMotion dur="4s" repeatCount="indefinite" keyPoints="0;1" keyTimes="0;1" calcMode="spline" keySplines="0.45 0 0.55 1" path="M100 76 C 150 76, 150 140, 186 140 L 254 140 C 292 140, 296 86, 330 82" />
    </circle>

    {/* Form card */}
    <g className="login-float">
      <rect x="18" y="46" width="86" height="62" rx="12" fill="#ffffff" stroke="#e2e8f0" />
      <rect x="30" y="58" width="18" height="18" rx="5" fill="#ddf7f9" />
      <path d="M35 65h8M35 69.5h5" stroke="#0f8a93" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="54" y="60" width="38" height="5" rx="2.5" fill="#36c0c9" />
      <rect x="54" y="70" width="26" height="4" rx="2" fill="#cfe9ec" />
      <rect x="30" y="86" width="62" height="4" rx="2" fill="#eef2f6" />
      <rect x="30" y="95" width="42" height="4" rx="2" fill="#eef2f6" />
    </g>

    {/* AI agent */}
    <g>
      <circle cx="220" cy="140" r="34" fill="#ffffff" fillOpacity="0.55" stroke="#ffffff" strokeOpacity="0.9" />
      <circle cx="220" cy="140" r="27" fill="#36c0c9" fillOpacity="0.22" stroke="#ffffff" strokeWidth="1.5" className="login-breathe" />
      <ellipse cx="212" cy="128" rx="13" ry="6" fill="#ffffff" fillOpacity="0.6" />
      <circle cx="220" cy="140" r="34" stroke="#36c0c9" strokeWidth="1.5" strokeDasharray="10 14" strokeLinecap="round" className="login-spin" />
      <g className="login-sparkle">
        <path d="M220 126 l3.6 8.4 8.4 3.6 -8.4 3.6 -3.6 8.4 -3.6 -8.4 -8.4 -3.6 8.4 -3.6z" fill="#0f8a93" />
      </g>
      <path d="M233 125 l1.4 3.1 3.1 1.4 -3.1 1.4 -1.4 3.1 -1.4 -3.1 -3.1 -1.4 3.1 -1.4z" fill="#36c0c9" className="login-twinkle" />
    </g>

    {/* Approved */}
    <g className="login-float-slow">
      <rect x="330" y="58" width="92" height="48" rx="12" fill="#ffffff" stroke="#b5e7eb" />
      <circle cx="350" cy="82" r="10" fill="#36c0c9" />
      <path d="M345.5 82l3 3 6-6" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <rect x="366" y="76" width="42" height="5" rx="2.5" fill="#0f8a93" />
      <rect x="366" y="86" width="28" height="4" rx="2" fill="#cfe9ec" />
    </g>

    {/* Waiting */}
    <g>
      <rect x="330" y="178" width="92" height="44" rx="12" fill="#f8fafc" stroke="#e2e8f0" strokeDasharray="3 4" />
      <circle cx="350" cy="200" r="8" stroke="#94a3b8" strokeWidth="1.6" />
      <path d="M350 195.5v4.5l3 2" stroke="#94a3b8" strokeWidth="1.6" strokeLinecap="round" />
      <rect x="366" y="197" width="34" height="5" rx="2.5" fill="#e2e8f0" />
    </g>

    {/* Reviewers */}
    <g className="login-float">
      <rect x="138" y="226" width="164" height="40" rx="20" fill="#ffffff" stroke="#e2e8f0" />
      {PORTRAITS.map((src, i) => (
        <Avatar key={src} id={String(i)} x={160 + i * 22} y={246} src={src} />
      ))}
      <rect x="226" y="239" width="56" height="5" rx="2.5" fill="#0f8a93" />
      <rect x="226" y="249" width="38" height="4" rx="2" fill="#cfe9ec" />
    </g>

    {/* Sparkles */}
    <path d="M300 30 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#36c0c9" className="login-twinkle" />
    <path d="M56 196 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6z" fill="#7fd6dc" className="login-twinkle-late" />
    <circle cx="404" cy="140" r="2.5" fill="#7fd6dc" />
    <circle cx="36" cy="140" r="2" fill="#cfe9ec" />
  </svg>
)

/**
 * LoginScreen — Screen
 * Split card: brand panel with an animated workflow illustration, and a single "Sign in with SSO" action.
 * Used in: HomePage
 */
export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [isAuthenticating, setIsAuthenticating] = useState(false)

  const handleSso = () => {
    setIsAuthenticating(true)
    setTimeout(onLogin, 700)
  }

  if (isAuthenticating) {
    return (
      <div className="fixed inset-0 bg-[#f4f7fa] flex items-center justify-center z-50 animate-in fade-in duration-200">
        <div className="flex flex-col items-center text-center max-w-sm px-4">
          <Loader2 className="w-12 h-12 animate-spin text-[#36c0c9] mb-4" />
          <h2 className="text-[20px] font-medium text-[#0d212c] mb-2">Setting up your workspace...</h2>
          <p className="text-[14px] text-slate-500">
            Preparing the {APP_NAME} environment for <strong className="text-[#0d212c]">Admin</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full bg-[#f1f4f7] p-4 sm:p-8 lg:px-[8vw] lg:py-[7vh] flex items-center justify-center font-sans antialiased text-[#0d212c]">
      <style>{`
        @keyframes login-float { 0%,100% { transform: translateY(0) } 50% { transform: translateY(-4px) } }
        @keyframes login-dash { to { stroke-dashoffset: -24 } }
        @keyframes login-spin { to { transform: rotate(360deg) } }
        @keyframes login-breathe { 0%,100% { transform: scale(1) } 50% { transform: scale(1.06) } }
        @keyframes login-sparkle { 0%,100% { transform: rotate(0) scale(1) } 50% { transform: rotate(45deg) scale(.9) } }
        @keyframes login-twinkle { 0%,100% { opacity: .2; transform: scale(.8) } 50% { opacity: 1; transform: scale(1) } }
        .login-float { animation: login-float 6s ease-in-out infinite }
        .login-float-slow { animation: login-float 8s ease-in-out infinite }
        .login-dash { stroke-dasharray: 5 6; animation: login-dash 1.6s linear infinite }
        .login-spin, .login-breathe, .login-sparkle, .login-twinkle, .login-twinkle-late { transform-box: fill-box; transform-origin: center }
        .login-spin { animation: login-spin 14s linear infinite }
        .login-breathe { animation: login-breathe 3.2s ease-in-out infinite }
        .login-sparkle { animation: login-sparkle 3.2s ease-in-out infinite }
        .login-twinkle { animation: login-twinkle 2.8s ease-in-out infinite }
        .login-twinkle-late { animation: login-twinkle 2.8s ease-in-out 1.4s infinite }
        @media (prefers-reduced-motion: reduce) {
          .login-float, .login-float-slow, .login-dash, .login-spin, .login-breathe, .login-sparkle, .login-twinkle, .login-twinkle-late { animation: none }
        }
      `}</style>

      <div className="w-full max-w-[1500px] lg:min-h-[min(820px,86vh)] flex flex-col lg:flex-row gap-4 rounded-[28px] bg-white p-4 border border-[#e6ebf0]">
        {/* Brand panel */}
        <section className="relative flex-[1.45] overflow-hidden rounded-[22px] bg-[#eaf6f8] px-8 py-9 lg:px-14 lg:py-12 flex flex-col">
          <div
            className="absolute inset-0 opacity-60 [background-image:radial-gradient(#c7dde2_1px,transparent_1px)] [background-size:20px_20px]"
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-3">
            <img src="/dark-logo.png" alt="M42 logo" className="h-7 w-auto object-contain shrink-0" />
            <span className="h-5 w-px bg-[#0d212c]/15" />
            <span className="text-[14px] font-semibold tracking-tight">Workflow Configurator</span>
          </div>

          <div className="relative flex-1 flex flex-col justify-center gap-8 py-8">
            <div className="flex justify-center">
              <FlowIllustration />
            </div>
            <div className="max-w-md">
              <h1 className="text-[28px] leading-[1.2] font-semibold tracking-tight">
                Design approvals <span className="text-[#0f8a93]">that run themselves.</span>
              </h1>
              <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
                Build stages, steps and decisions visually, then publish a workflow everyone can follow.
              </p>
            </div>
          </div>
        </section>

        {/* Sign-in panel */}
        <section className="flex-1 rounded-[22px] border border-[#eef1f4] px-6 py-10 sm:px-12 flex flex-col">
          <div className="flex-1 flex flex-col justify-center w-full max-w-[400px] mx-auto">
            <h2 className="text-[26px] font-semibold tracking-tight">Welcome back</h2>
            <p className="mt-1.5 text-sm text-slate-500">Sign in with your organisational account to continue.</p>

            <button
              onClick={handleSso}
              className="group mt-8 w-full flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#36c0c9]/40 cursor-pointer"
            >
              <Fingerprint className="w-6 h-6 shrink-0 text-slate-400 transition-colors group-hover:text-[#36c0c9]" />
              <span className="flex-1">
                <span className="block text-[15px] font-semibold">Sign in with SSO</span>
                <span className="block text-[13px] text-slate-500 mt-0.5">Authenticate via your enterprise network</span>
              </span>
              <ArrowRight className="w-4 h-4 text-slate-300 transition-colors group-hover:text-[#36c0c9]" />
            </button>

            <div className="mt-6 flex items-start gap-2 text-xs text-slate-500">
              <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
              <span>
                Protected by your organisation&apos;s Single Sign-On. Need help?{' '}
                <a href="mailto:support@m42.ae" className="text-[#0f8a93] font-medium hover:underline">
                  Contact your administrator.
                </a>
              </span>
            </div>
          </div>

          <p className="text-center text-[11px] text-slate-400">© M42 · Admin access only</p>
        </section>
      </div>
    </div>
  )
}
