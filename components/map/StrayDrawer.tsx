"use client";

import React, { useState, useEffect } from 'react';
import { Stray, StrayReview } from '../../types/stray';
import { 
  Heart, 
  Droplets, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  MapPin, 
  X, 
  CheckCircle2, 
  Star, 
  MessageSquare, 
  Send, 
  Info,
  Sparkles,
  Camera,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface StrayDrawerProps {
  stray: Stray | null;
  onClose: () => void;
  onActionSuccess?: (updatedStray?: Stray) => void;
  onOpenAuth: () => void;
}

export default function StrayDrawer({ stray, onClose, onActionSuccess, onOpenAuth }: StrayDrawerProps) {
  const { user } = useAuth();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  // Reviews state
  const [reviews, setReviews] = useState<StrayReview[]>([]);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  // Combine identifier photo with up to 3 gallery photos (max 4 total)
  const allPhotos = React.useMemo(() => {
    if (!stray) return [];
    const list: string[] = [];
    if (stray.identifier_photo_url) list.push(stray.identifier_photo_url);
    if (stray.gallery_photos && Array.isArray(stray.gallery_photos)) {
      stray.gallery_photos.forEach((p) => {
        if (p && !list.includes(p)) list.push(p);
      });
    }
    return list.slice(0, 4);
  }, [stray]);

  // Load reviews when stray opens
  useEffect(() => {
    if (!stray?.id) return;
    setActivePhotoIdx(0);
    fetch(`/api/reviews?stray_id=${stray.id}`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setReviews(data);
      })
      .catch((err) => console.warn('Failed to load reviews', err));
  }, [stray?.id]);

  if (!stray) return null;

  // Format last fed time ago
  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return { label: 'Never fed yet', isRecent: false };
    const date = new Date(dateStr);
    const diffMs = Date.now() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);

    if (diffMinutes < 60) {
      return { label: `Fed ${diffMinutes}m ago`, isRecent: diffMinutes < 240 };
    } else if (diffHours < 24) {
      return { label: `Fed ${diffHours}h ago`, isRecent: diffHours < 4 };
    } else {
      const days = Math.floor(diffHours / 24);
      return { label: `Last fed ${days}d ago`, isRecent: false };
    }
  };

  const feedingStatus = formatTimeAgo(stray.last_fed_at);

  // Interactive FED reaction click
  const handleFedClick = async () => {
    try {
      setLoadingAction('fed');
      const res = await fetch('/api/care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stray_id: stray.id,
          user_id: user?.id,
          username: user?.username || 'Guest Feeder',
          action_type: 'fed',
          notes: 'Fed with food & loving care',
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to log feeding');

      setSuccessMessage('🐾 Meal recorded! "FED" count incremented (+10 XP)');
      if (data.stray) {
        onActionSuccess?.(data.stray);
      } else {
        onActionSuccess?.();
      }
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      alert('Unable to log feeding. Check connection.');
    } finally {
      setLoadingAction(null);
    }
  };

  // Submit comment & rating
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    if (!user) {
      onOpenAuth();
      return;
    }

    try {
      setIsSubmittingReview(true);
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stray_id: stray.id,
          user_id: user.id,
          username: user.username,
          rating: newRating,
          comment: newComment.trim(),
        }),
      });

      const saved = await res.json();
      if (res.ok) {
        setReviews((prev) => [saved, ...prev]);
        setNewComment('');
        setSuccessMessage('⭐ Thanks for leaving a rating and comment!');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  // Average rating calculation
  const averageRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / reviews.length).toFixed(1)
    : '5.0';

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 flex justify-center pointer-events-none">
      <div className="w-full max-w-lg bg-slate-900/98 backdrop-blur-2xl border-t border-slate-700/80 rounded-t-[32px] shadow-2xl p-4 sm:p-6 pointer-events-auto animate-slide-up text-slate-100 max-h-[88vh] overflow-y-auto pb-[calc(2rem+env(safe-area-inset-bottom))]">
        
        {/* Handlebar for bottom-to-top sheet expansion */}
        <div className="flex justify-center mb-2">
          <div className="w-12 h-1.5 bg-slate-700 rounded-full" />
        </div>

        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-white tracking-tight">{stray.name || 'Unnamed Buddy'}</h2>
              {stray.is_tnr && (
                <span className="bg-teal-500/20 text-teal-400 border border-teal-500/30 text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                  TNR Verified
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
              <span className="capitalize font-semibold text-slate-300">{stray.species}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-sky-400" />
                {stray.city} (~150m Safety Fuzzed)
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-full bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Notification toast */}
        {successMessage && (
          <div className="my-3 p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-xl flex items-center gap-2 text-xs font-semibold animate-pulse">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Photo Gallery Carousel (1 Identifier + up to 3 Additional Photos = 4 Photos Max) */}
        <div className="mt-3 relative w-full h-56 rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 group shadow-lg">
          {allPhotos.length > 0 ? (
            <img
              src={allPhotos[activePhotoIdx]}
              alt={stray.name}
              className="w-full h-full object-cover transition-opacity duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-slate-600">
              <Camera className="w-8 h-8 mb-1" />
              <span className="text-xs">No photos uploaded</span>
            </div>
          )}

          {/* Carousel Next/Prev Controls if multiple photos */}
          {allPhotos.length > 1 && (
            <>
              <button
                onClick={() => setActivePhotoIdx((p) => (p === 0 ? allPhotos.length - 1 : p - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setActivePhotoIdx((p) => (p === allPhotos.length - 1 ? 0 : p + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/60 backdrop-blur-md text-white flex items-center justify-center hover:bg-black/80"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Photo Pagination Dots */}
          <div className="absolute bottom-2 inset-x-0 flex justify-center gap-1.5">
            {allPhotos.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActivePhotoIdx(idx)}
                className={`w-2 h-2 rounded-full transition-all ${
                  activePhotoIdx === idx ? 'bg-emerald-400 w-5' : 'bg-white/50'
                }`}
              />
            ))}
          </div>

          {/* Active Photo Badge */}
          <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-md text-[10px] font-bold text-white border border-white/20">
            {activePhotoIdx === 0 ? 'Map Identifier' : `Photo ${activePhotoIdx + 1} of ${allPhotos.length}`}
          </div>
        </div>

        {/* Life360 Profile Summary Card: Fed Count & Rating */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          
          {/* Interactive FED Counter Card (Like / Reaction) */}
          <button
            onClick={handleFedClick}
            disabled={loadingAction === 'fed'}
            className="p-3.5 rounded-2xl bg-gradient-to-tr from-emerald-950/80 to-slate-900 border border-emerald-800/60 flex flex-col justify-between text-left group active:scale-[0.98] transition-all hover:border-emerald-500/80 shadow-lg"
          >
            <div className="flex items-center justify-between text-xs text-emerald-400">
              <span className="font-bold flex items-center gap-1">
                <Heart className="w-3.5 h-3.5 fill-emerald-400" />
                Community Fed
              </span>
              <span className="text-[10px] bg-emerald-500/20 px-1.5 py-0.2 rounded-full border border-emerald-500/30">
                +1 Tap
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-black text-white group-hover:scale-105 transition-transform">
                {stray.fed_count || 0}
              </span>
              <span className="text-xs text-slate-400 font-semibold">Meals Logged</span>
            </div>
            <span className="text-[10px] text-emerald-300 mt-1 block">
              {feedingStatus.label}
            </span>
          </button>

          {/* Community Rating & Health Card */}
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col justify-between shadow-lg">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="font-bold">Guardian Rating</span>
              <div className="flex items-center gap-1 text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span className="font-black text-white">{averageRating}</span>
              </div>
            </div>
            <div className="mt-2">
              <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                stray.health_status === 'injured'
                  ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : stray.health_status === 'needs_food'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              }`}>
                {stray.health_status.replace('_', ' ')}
              </span>
              <span className="text-[10px] text-slate-400 block mt-1 truncate">
                {stray.coat_description || 'Community Stray'}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {reviews.length} guardian reviews
            </span>
          </div>

        </div>

        {/* Animal Safety Coordinates Offset Disclaimer */}
        <div className="mt-3 px-3 py-2 bg-slate-800/40 border border-slate-700/50 rounded-xl flex items-center gap-2 text-[11px] text-slate-400">
          <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>Coordinates are jittered ~150m for safety. Tap FED to increment the meal tally and refresh cooldown!</span>
        </div>

        {/* Ratings & Comments Section */}
        <div className="mt-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
              <span>Guardian Comments & Ratings</span>
            </h3>
            <span className="text-[11px] text-slate-400">{reviews.length} Total</span>
          </div>

          {/* New Review Input Form */}
          <form onSubmit={handleReviewSubmit} className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-300">Rate Buddy:</span>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setNewRating(star)}
                    className="p-1 hover:scale-110 transition-transform"
                  >
                    <Star
                      className={`w-4 h-4 ${
                        star <= newRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative">
              <input
                type="text"
                placeholder={user ? "Leave a note (e.g. loves chin scratches, very shy)..." : "Sign in to leave a comment & rating"}
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                className="w-full pl-3 pr-10 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
              <button
                type="submit"
                disabled={isSubmittingReview || !newComment.trim()}
                className="absolute right-2 top-2 p-1.5 rounded-lg bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 disabled:opacity-40 transition-colors"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>

          {/* Review List */}
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {reviews.map((r) => (
              <div key={r.id} className="p-3 bg-slate-800/40 border border-slate-800 rounded-xl text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-white text-[11px]">@{r.username}</span>
                    <span className="text-[9px] text-slate-500">
                      {new Date(r.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="flex gap-0.5">
                    {Array.from({ length: r.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 text-amber-400 fill-amber-400" />
                    ))}
                  </div>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">{r.comment}</p>
              </div>
            ))}
          </div>

        </div>

      </div>
    </div>
  );
}
