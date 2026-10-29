'use client'

import React, { useState } from 'react'
import { Fingerprint, Loader2, ShieldCheck, Users, PieChart, Lock } from 'lucide-react'
import { APP_NAME } from '@/lib/session'

interface LoginScreenProps {
  onLogin: () => void
}

/**
 * LoginScreen — Screen
 * Split-panel brand login with a single "Sign in with SSO" action.
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
      <div className="fixed inset-0 bg-[#f8f9fc] flex items-center justify-center z-50 animate-in fade-in duration-200">
        <div className="flex flex-col items-center text-center max-w-sm px-4">
          <div className="text-[#0d212c] mb-4">
            <Loader2 className="w-12 h-12 animate-spin text-[#0d212c]" />
          </div>
          <h2 className="text-[20px] font-medium text-[#0d212c] mb-2">
            Setting up your workspace...
          </h2>
          <p className="text-[14px] text-slate-500">
            Preparing the {APP_NAME} environment for{' '}
            <strong className="text-[#0d212c]">Admin</strong>.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex flex-col md:flex-row bg-[#f8f9fc] font-sans antialiased text-[#0d212c]">
      {/* Left Side — Information Panel */}
      <div className="flex-1 p-8 lg:p-16 flex flex-col justify-center relative bg-[#D9E6EB] border-r border-[#e2e8f0]">
        <div className="max-w-md mx-auto w-full flex flex-col gap-8">
          <div className="flex items-center gap-3">
            <img
              src="/dark-logo.png"
              alt="M42 logo"
              className="h-8 w-auto object-contain shrink-0"
            />
            <h1 className="font-medium text-xl text-[#0d212c] tracking-tight">{APP_NAME}</h1>
          </div>

          <div>
            <h2 className="text-[24px] font-semibold text-[#0d212c] tracking-tight leading-snug">
              One secure workspace for your team.
            </h2>
          </div>

          {/* Feature points */}
          <div className="space-y-6 pt-2">
            <div className="flex items-start gap-3.5">
              <ShieldCheck className="w-6 h-6 text-[#36c0c9] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#0d212c] text-sm">Enterprise security</h3>
                <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                  Access is governed by your organisation&apos;s Single Sign-On and role policies.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <Users className="w-6 h-6 text-[#36c0c9] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#0d212c] text-sm">Built for collaboration</h3>
                <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                  Bring the right people together and keep work moving in one place.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3.5">
              <PieChart className="w-6 h-6 text-[#36c0c9] shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-[#0d212c] text-sm">End-to-end visibility</h3>
                <p className="text-slate-600 text-xs mt-0.5 leading-relaxed">
                  Track progress and decisions from a single centralised dashboard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side — SSO Sign-in Panel */}
      <div className="flex-1 bg-white p-6 lg:p-12 flex items-center justify-center overflow-y-auto">
        <div className="w-full max-w-md bg-white rounded-2xl border border-gray-100 p-8 sm:p-12 text-center shadow-xs flex flex-col items-center">
          <h2 className="text-2xl font-semibold text-[#0d212c] mb-2 tracking-tight">Welcome</h2>
          <p className="text-slate-500 text-sm mb-8 leading-relaxed max-w-sm mx-auto">
            Sign in with your organisational account
          </p>

          <button
            onClick={handleSso}
            className="w-full flex items-start gap-3 bg-white border border-gray-200 rounded-xl px-4 py-4 text-left shadow-xs hover:shadow-md hover:border-[#36c0c9]/30 transition-all group cursor-pointer mb-6"
          >
            <div className="mt-0.5 bg-gray-50 p-2 rounded-lg group-hover:bg-[#36c0c9]/10 transition-colors">
              <Fingerprint className="w-5 h-5 text-gray-500 group-hover:text-[#36c0c9] transition-colors" />
            </div>
            <div className="mt-1">
              <div className="font-medium text-[15px] text-[#0d212c] group-hover:text-[#36c0c9] transition-colors">
                Sign in with SSO
              </div>
              <div className="text-[13px] text-gray-500 mt-0.5">
                Authenticate via your enterprise network
              </div>
            </div>
          </button>

          <div className="flex items-start justify-center gap-2 text-xs text-slate-500 text-left sm:text-center w-full">
            <Lock className="w-3.5 h-3.5 shrink-0 text-slate-400 mt-0.5" />
            <span>
              Protected by your organization&apos;s Single Sign-On.{' '}
              <span className="block sm:inline">
                Need help?{' '}
                <a
                  href="mailto:support@m42.ae"
                  className="text-[#36c0c9] font-medium hover:underline inline-block"
                >
                  Contact your administrator.
                </a>
              </span>
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
