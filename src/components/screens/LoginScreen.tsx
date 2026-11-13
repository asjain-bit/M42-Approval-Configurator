'use client'

import React, { useEffect, useState } from 'react'
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

/** Five generic stage cards (no real stage names) */
const PIPELINE = [0, 1, 2, 3, 4]
const CARD = { w: 96, h: 62 }
/** Card positions along a gentle wave, left to right across the panel */
const SPOTS = [
  { x: 2, y: 128 },
  { x: 109, y: 96 },
  { x: 216, y: 128 },
  { x: 323, y: 96 },
  { x: 430, y: 128 },
]
const centre = (i: number) => ({ x: SPOTS[i].x + CARD.w / 2, y: SPOTS[i].y + CARD.h / 2 })

/** Which stage is being processed: steps through each card in turn, then starts over */
function usePipelineStep() {
  const [step, setStep] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return setStep(PIPELINE.length)
    const t = setTimeout(() => setStep((s) => (s >= PIPELINE.length ? 0 : s + 1)), step >= PIPELINE.length ? 2200 : 1500)
    return () => clearTimeout(t)
  }, [step])
  return step
}

const StageCard: React.FC<{ index: number; status: 'done' | 'active' | 'pending' }> = ({ index, status }) => {
  const { x, y } = SPOTS[index]
  return (
    <g transform={`translate(${x} ${y})`} className="login-card" data-status={status}>
      <rect width={CARD.w} height={CARD.h} rx="12" fill="#ffffff" stroke={status === 'active' ? '#36c0c9' : '#e2e8f0'} strokeWidth={status === 'active' ? 1.5 : 1} />
      <rect x="12" y="11" width="16" height="16" rx="5" fill={status === 'pending' ? '#f1f5f9' : '#ddf7f9'} />
      <rect x="16.5" y="15.5" width="7" height="7" rx="1.5" stroke={status === 'pending' ? '#cbd5e1' : '#36c0c9'} strokeWidth="1.4" />
      <rect x="34" y="13" width={[44, 36, 40, 30, 42][index]} height="5" rx="2.5" fill={status === 'active' ? 'url(#lg-shimmer)' : status === 'pending' ? '#e2e8f0' : '#7fd6dc'} />
      <rect x="34" y="22" width={[28, 34, 24, 32, 26][index]} height="4" rx="2" fill={status === 'active' ? 'url(#lg-shimmer)' : '#eef2f6'} />
      {/* Status */}
      <g transform="translate(12 42)">
        {status === 'done' && (
          <>
            <circle cx="6" cy="6" r="6" fill="#22c55e" />
            <path d="M3.4 6.2l1.8 1.8 3.6-3.6" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            <rect x="16" y="4" width="34" height="4" rx="2" fill="#bbf7d0" />
          </>
        )}
        {status === 'active' && (
          <>
            <circle cx="6" cy="6" r="6" fill="url(#lg-shimmer)" />
            <rect x="16" y="4" width="56" height="4" rx="2" fill="url(#lg-shimmer)" />
          </>
        )}
        {status === 'pending' && (
          <>
            <circle cx="6" cy="6" r="5" fill="#facc15" />
            <rect x="16" y="4" width="34" height="4" rx="2" fill="#fef08a" />
          </>
        )}
      </g>
    </g>
  )
}

/** Decorative workflow: the workflow builder processes each connected stage card in turn, marking each one complete */
const FlowIllustration: React.FC = () => {
  const step = usePipelineStep()

  return (
    <svg viewBox="0 0 528 300" className="w-full max-w-[560px] h-auto select-none" aria-hidden="true" fill="none">
      <defs>
        {/* Loader shimmer: a soft highlight sweeping across the card being processed */}
        <linearGradient id="lg-shimmer" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#e3f4f6" />
          <stop offset="0.5" stopColor="#9fe0e5" />
          <stop offset="1" stopColor="#e3f4f6" />
          <animateTransform attributeName="gradientTransform" type="translate" values="-1 0; 1 0" dur="1.1s" repeatCount="indefinite" />
        </linearGradient>
      </defs>

      {/* The workflow builder connects to every stage card */}
      {SPOTS.map((_, i) => {
        const c = centre(i)
        const top = c.y - CARD.h / 2
        const status = i < step ? 'done' : i === step ? 'active' : 'pending'
        return (
          <path
            key={i}
            d={`M264 76 C 264 ${76 + 26}, ${c.x} ${top - 26}, ${c.x} ${top}`}
            stroke={status === 'pending' ? '#d9eef1' : '#36c0c9'}
            strokeWidth={status === 'active' ? 2 : 1.5}
            strokeLinecap="round"
            style={{ transition: 'stroke 0.4s ease' }}
          />
        )
      })}

      {/* Workflow builder hub */}
      <g transform="translate(264 44)">
        <circle r="32" fill="#ffffff" fillOpacity="0.6" stroke="#ffffff" />
        <circle r="25" fill="#36c0c9" fillOpacity="0.18" stroke="#ffffff" strokeWidth="1.5" className="login-breathe" />
        {/* A small flow: start node branching to two steps that merge into one; each part lights up in turn */}
        <g strokeLinecap="round" strokeLinejoin="round">
          <path d="M0 -8 C 0 -3, -8 -4, -8 1" stroke="#0f8a93" strokeWidth="1.6" pathLength={1} className="login-edge login-edge-1" />
          <path d="M0 -8 C 0 -3, 8 -4, 8 1" stroke="#0f8a93" strokeWidth="1.6" pathLength={1} className="login-edge login-edge-1" />
          <path d="M-8 7 C -8 11, 0 10, 0 13" stroke="#0f8a93" strokeWidth="1.6" pathLength={1} className="login-edge login-edge-2" />
          <path d="M8 7 C 8 11, 0 10, 0 13" stroke="#0f8a93" strokeWidth="1.6" pathLength={1} className="login-edge login-edge-2" />
          <rect x="-5" y="-15" width="10" height="7" rx="2.5" fill="#0f8a93" />
          <rect x="-12.5" y="1" width="9" height="6" rx="2" fill="#ffffff" stroke="#0f8a93" strokeWidth="1.4" className="login-node login-node-1" />
          <rect x="3.5" y="1" width="9" height="6" rx="2" fill="#ffffff" stroke="#0f8a93" strokeWidth="1.4" className="login-node login-node-1" />
          <circle cx="0" cy="16" r="3.5" fill="#ffffff" stroke="#0f8a93" strokeWidth="1.4" className="login-node login-node-2" />
        </g>
      </g>

      {SPOTS.map((_, i) => (
        <StageCard key={i} index={i} status={i < step ? 'done' : i === step ? 'active' : 'pending'} />
      ))}

      {/* Reviewers */}
      <g transform="translate(176 232)">
        <rect width="176" height="40" rx="20" fill="#ffffff" stroke="#e2e8f0" />
        {PORTRAITS.map((src, i) => (
          <Avatar key={src} id={String(i)} x={22 + i * 22} y={20} src={src} />
        ))}
        <text x="96" y="18" fontSize="9.5" fontWeight="600" fill="#0f8a93">Reviewers</text>
        <text x="96" y="30" fontSize="8.5" fill="#64748b">notified by email</text>
      </g>
    </svg>
  )
}

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
        @keyframes login-node-pulse { 0%,100% { opacity: 1 } 50% { opacity: .45 } }
        .login-node-pulse { animation: login-node-pulse 1.6s ease-in-out infinite }
        .login-twinkle { animation: login-twinkle 2.8s ease-in-out infinite }
        .login-twinkle-late { animation: login-twinkle 2.8s ease-in-out 1.4s infinite }
        @keyframes login-spinner { to { transform: rotate(360deg) } }
        .login-spinner { transform-box: fill-box; transform-origin: center; animation: login-spinner 0.9s linear infinite }
        .login-edge { stroke-dasharray: 1; stroke-dashoffset: 1; animation: login-draw 2.8s ease-in-out infinite }
        .login-edge-2 { animation-delay: .7s }
        @keyframes login-draw { 0% { stroke-dashoffset: 1 } 25%,75% { stroke-dashoffset: 0 } 100% { stroke-dashoffset: 1 } }
        .login-node { animation: login-light 2.8s ease-in-out infinite }
        .login-node-1 { animation-delay: .35s }
        .login-node-2 { animation-delay: 1.05s }
        @keyframes login-light { 0%,100% { fill: #ffffff } 30%,65% { fill: #36c0c9 } }
        @keyframes login-pop { from { opacity: .6; transform: translateY(2px) } to { opacity: 1; transform: none } }
        .login-card > g { animation: login-pop .35s ease-out }
        @media (prefers-reduced-motion: reduce) {
          .login-float, .login-float-slow, .login-dash, .login-spin, .login-breathe, .login-sparkle, .login-twinkle, .login-twinkle-late, .login-node-pulse, .login-node { animation: none }
          .login-edge { animation: none; stroke-dashoffset: 0 }
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
