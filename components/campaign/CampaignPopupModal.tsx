"use client";

import React, { useState, useEffect } from 'react';
import { X, Heart, Sparkles, ChevronRight, Gift, LogIn } from 'lucide-react';
import { Campaign } from '../../types/stray';
import { useAuth } from '../../context/AuthContext';

interface CampaignPopupModalProps {
  onClose: () => void;
  onOpenAnnouncements: () => void;
  onOpenAuth?: () => void;
}

export default function CampaignPopupModal({ onClose, onOpenAnnouncements, onOpenAuth }: CampaignPopupModalProps) {
  const { user } = useAuth();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [hasReacted, setHasReacted] = useState(false);
  const [reactions, setReactions] = useState<{ heart: number; paws: number; clap: number }>({
    heart: 48,
    paws: 92,
    clap: 35,
  });

  useEffect(() => {
    async function loadActiveCampaign() {
      try {
        const res = await fetch('/api/campaigns');
        if (res.ok) {
          const list: Campaign[] = await res.json();
          const popup = list.find((c) => c.is_popup && c.is_active);
          if (popup) {
            setCampaign(popup);
            if (popup.reactions) {
              setReactions(popup.reactions);
            }
          }
        }
      } catch (err) {
        console.warn('Failed to fetch campaign popup', err);
      }
    }
    loadActiveCampaign();
  }, []);

  if (!campaign) return null;

  const handleReact = async (type: 'heart' | 'paws' | 'clap') => {
    // ENFORCE SIGN IN BEFORE REACTING
    if (!user) {
      onClose();
      onOpenAuth?.();
      return;
    }

    setReactions((prev) => ({ ...prev, [type]: prev[type] + 1 }));
    setHasReacted(true);

    try {
      await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'react',
          campaign_id: campaign.id,
          reaction_type: type,
          user_id: user.id,
          username: user.username,
        }),
      });
    } catch (e) {
      console.warn('Failed to sync reaction', e);
    }
  };

  return (
    <div className="fixed inset-0 z-[970] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fade-in select-none">
      <div className="w-full max-w-sm bg-gradient-to-b from-slate-900 to-slate-950 border border-amber-500/40 rounded-3xl shadow-2xl overflow-hidden relative text-slate-100 animate-slide-up">
        
        {/* Shopee-style Orange/Amber Flash Ribbon */}
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 py-1.5 px-4 text-center text-[10px] font-black uppercase tracking-widest text-slate-950 flex items-center justify-center gap-1.5 shadow">
          <Sparkles className="w-3.5 h-3.5 fill-slate-950" />
          <span>Special Community Charity Event</span>
        </div>

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close Announcement"
          className="absolute top-4 right-3 w-8 h-8 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition-colors z-20 border border-slate-700 shadow"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Campaign Banner Image */}
        <div className="relative w-full h-44 bg-slate-800">
          <img
            src={
              campaign.banner_photo_url ||
              'https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80'
            }
            alt={campaign.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/30" />
          
          {campaign.target_amount && (
            <div className="absolute bottom-2 left-3 px-2.5 py-1 bg-amber-500 text-slate-950 font-black text-xs rounded-xl shadow-lg border border-amber-300 flex items-center gap-1">
              <Gift className="w-3.5 h-3.5" />
              <span>{campaign.target_amount}</span>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 space-y-3">
          <h3 className="text-lg font-black text-white leading-snug tracking-tight">
            {campaign.title}
          </h3>

          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
            {campaign.description}
          </p>

          {/* Quick Reaction Bar (Enforces Sign in) */}
          <div className="pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              <span>Send Community Support:</span>
              {!user && (
                <span className="text-amber-400 font-semibold normal-case flex items-center gap-1">
                  <LogIn className="w-3 h-3" /> Sign in to react
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => handleReact('heart')}
                className="py-2 px-1 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-xs font-bold transition-all active:scale-95"
              >
                <span className="text-base">❤️</span>
                <span className="text-[10px] text-slate-300 mt-0.5">{reactions.heart}</span>
              </button>
              <button
                onClick={() => handleReact('paws')}
                className="py-2 px-1 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-xs font-bold transition-all active:scale-95"
              >
                <span className="text-base">🐾</span>
                <span className="text-[10px] text-slate-300 mt-0.5">{reactions.paws}</span>
              </button>
              <button
                onClick={() => handleReact('clap')}
                className="py-2 px-1 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700 flex flex-col items-center justify-center text-xs font-bold transition-all active:scale-95"
              >
                <span className="text-base">👏</span>
                <span className="text-[10px] text-slate-300 mt-0.5">{reactions.clap}</span>
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="pt-2 flex gap-2">
            <button
              onClick={() => {
                onClose();
                onOpenAnnouncements();
              }}
              className="flex-1 py-3 px-4 bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:brightness-110 text-slate-950 font-black text-xs rounded-2xl shadow-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <span>View Charity Board</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-2xl transition-colors"
            >
              Dismiss
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
