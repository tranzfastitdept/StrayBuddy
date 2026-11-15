"use client";

import React, { useState } from 'react';
import { X, Lock, User, Mail, Sparkles, Loader2, LogIn, UserPlus } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: 'login' | 'signup';
}

export default function AuthModal({ isOpen, onClose, defaultMode = 'login' }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>(defaultMode);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { login } = useAuth();

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/signup';
      const body =
        mode === 'login'
          ? { username, password }
          : { username, name, email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      login(data.user);
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Unable to authenticate. Try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const fillSuperAdmin = () => {
    setMode('login');
    setUsername('');
    setPassword('');
  };

  return (
    <div className="fixed inset-0 z-[970] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl p-6 text-slate-100 relative">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Icon */}
        <div className="flex flex-col items-center text-center mb-5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center font-extrabold text-2xl shadow-lg shadow-emerald-500/20 mb-2">
            🐾
          </div>
          <h2 className="text-xl font-black tracking-tight text-white">
            {mode === 'login' ? 'Welcome Back!' : 'Join StrayBuddy'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {mode === 'login' ? 'Spot, pin, and feed neighborhood buddies' : 'Create your guardian account in seconds'}
          </p>
        </div>

        {/* Superadmin credentials are never shown to regular users. */}

        {/* Error notification */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 text-red-300 rounded-xl text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Auth Mode Toggle Tabs */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-800 rounded-xl mb-4 text-xs font-bold">
          <button
            type="button"
            onClick={() => { setMode('login'); setErrorMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'login' ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => { setMode('signup'); setErrorMsg(''); }}
            className={`py-2 rounded-lg transition-all ${
              mode === 'signup' ? 'bg-slate-900 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          
          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name</label>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan Dela Cruz"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Username</label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. catguardian"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          {mode === 'signup' && (
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">Email</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="guardian@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
            <div className="relative">
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-9 pr-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
            ) : mode === 'login' ? (
              <>
                <LogIn className="w-4 h-4" />
                <span>Log In</span>
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4" />
                <span>Sign Up & Start Tagging</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}
