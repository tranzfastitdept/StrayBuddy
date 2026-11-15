"use client";

import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  Sparkles, 
  Plus, 
  X, 
  Gift, 
  Megaphone, 
  Heart, 
  CheckCircle2, 
  Lock,
  Share2,
  LogIn
} from 'lucide-react';
import Link from 'next/link';
import { Campaign } from '@/types/stray';
import { useAuth } from '@/context/AuthContext';
import AuthModal from '@/components/auth/AuthModal';

export default function AnnouncementsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [isPostingModal, setIsPostingModal] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authBannerNotice, setAuthBannerNotice] = useState<string | null>(null);

  // New Campaign Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [bannerUrl, setBannerUrl] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [isPopup, setIsPopup] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { isSuperAdmin, user } = useAuth();

  useEffect(() => {
    loadCampaigns();
  }, []);

  async function loadCampaigns() {
    try {
      const res = await fetch('/api/campaigns');
      if (res.ok) {
        const list = await res.json();
        setCampaigns(list);
      }
    } catch (e) {
      console.warn('Failed to load campaigns', e);
    }
  }

  // Handle reaction with strict Sign-in validation
  const handleReact = async (campaignId: string, type: 'heart' | 'paws' | 'clap') => {
    if (!user) {
      setAuthBannerNotice('Please sign in or create an account to react and support charity drives! 🐾');
      setIsAuthModalOpen(true);
      return;
    }

    // Optimistic UI update
    setCampaigns((prev) =>
      prev.map((c) => {
        if (c.id === campaignId) {
          const current = c.reactions || { heart: 0, paws: 0, clap: 0 };
          return {
            ...c,
            reactions: { ...current, [type]: (current[type] || 0) + 1 },
          };
        }
        return c;
      })
    );

    try {
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'react',
          campaign_id: campaignId,
          reaction_type: type,
          user_id: user.id,
          username: user.username,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to submit reaction');
      }
    } catch (e) {
      console.warn(e);
    }
  };

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !description) return;

    try {
      setIsSubmitting(true);
      const res = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          banner_photo_url:
            bannerUrl.trim() ||
            'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80',
          target_amount: targetAmount.trim() || null,
          is_popup: isPopup,
          created_by: user?.id,
        }),
      });

      if (res.ok) {
        setIsPostingModal(false);
        setTitle('');
        setDescription('');
        setBannerUrl('');
        setTargetAmount('');
        loadCampaigns();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-full w-full min-h-screen bg-slate-950 text-slate-100 overflow-y-auto">
      
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 shadow-md">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-white flex items-center gap-2">
                <span>Charity & Events</span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                  Official
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">Community campaigns & rescue drives</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!user ? (
              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs flex items-center gap-1 border border-slate-700"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
            ) : isSuperAdmin ? (
              <button
                onClick={() => setIsPostingModal(true)}
                className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                <span>Post Event</span>
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {/* Main Campaign Cards List — Fully scrollable */}
      <main className="max-w-xl mx-auto px-4 py-6 space-y-6 pb-28">
        
        {/* Notice Header */}
        <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-2xl flex items-center gap-3 text-xs text-slate-300">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <p className="font-bold text-white">Direct Community Sponsorships</p>
            <p className="text-[11px] text-slate-400">
              Sign in to send encouragement reactions (❤️, 🐾, 👏). (Comments are disabled to prevent spam).
            </p>
          </div>
        </div>

        {/* Campaign List */}
        {campaigns.map((camp) => {
          const reactions = camp.reactions || { heart: 0, paws: 0, clap: 0 };
          return (
            <article
              key={camp.id}
              className="bg-slate-900 border border-slate-800/90 rounded-3xl overflow-hidden shadow-2xl transition-transform"
            >
              {/* Banner Image */}
              <div className="relative w-full h-52 bg-slate-800">
                <img
                  src={camp.banner_photo_url}
                  alt={camp.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/25" />
                
                {camp.target_amount && (
                  <div className="absolute bottom-3 left-4 px-3 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg border border-amber-300 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5" />
                    <span>{camp.target_amount}</span>
                  </div>
                )}
              </div>

              {/* Text Body */}
              <div className="p-5 space-y-3">
                <h2 className="text-xl font-black text-white tracking-tight leading-snug">
                  {camp.title}
                </h2>
                <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-line">
                  {camp.description}
                </p>

                {/* Reactions Section (Sign-in required) */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Community Reactions:
                  </span>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReact(camp.id, 'heart')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                      title={!user ? "Sign in to react" : "Send love"}
                    >
                      <span>❤️</span>
                      <span className="text-slate-200">{reactions.heart}</span>
                    </button>
                    <button
                      onClick={() => handleReact(camp.id, 'paws')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                      title={!user ? "Sign in to react" : "Send paws"}
                    >
                      <span>🐾</span>
                      <span className="text-slate-200">{reactions.paws}</span>
                    </button>
                    <button
                      onClick={() => handleReact(camp.id, 'clap')}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold flex items-center gap-1.5 active:scale-95 transition-all"
                      title={!user ? "Sign in to react" : "Send applause"}
                    >
                      <span>👏</span>
                      <span className="text-slate-200">{reactions.clap}</span>
                    </button>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

      </main>

      {/* Auth Modal for Unauthenticated Users */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Superadmin New Campaign Modal */}
      {isPostingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-slate-100 shadow-2xl relative">
            <button
              onClick={() => setIsPostingModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center"
            >
              <X className="w-4 h-4" />
            </button>

            <h3 className="text-lg font-black text-white mb-1 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Post New Charity Campaign</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">Superadmin Official Announcement Broadcast</p>

            <form onSubmit={handleCreateCampaign} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metro Manila Free Spay & Neuter"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Description & Charity Goals</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain event details, beneficiary animal groups, how donations are used..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Target Amount (Optional)</label>
                  <input
                    type="text"
                    placeholder="₱50,000 Target"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Banner Image URL</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/60 border border-slate-700/60 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isPopup}
                  onChange={(e) => setIsPopup(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700 focus:ring-0"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200">Show as Pop-up Announcement on App Open</span>
                  <p className="text-[10px] text-slate-400">Triggers the Shopee-style campaign dialog for users opening the radar.</p>
                </div>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs shadow-lg transition-all"
              >
                {isSubmitting ? 'Publishing...' : 'Publish Official Campaign'}
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
