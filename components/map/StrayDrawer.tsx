"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { Stray, StrayReview } from '../../types/stray';
import {
  Heart,
  Droplets,
  AlertTriangle,
  Clock,
  MapPin,
  X,
  CheckCircle2,
  Star,
  MessageSquare,
  Send,
  Info,
  Camera,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { notify } from '../../components/pwa/ServiceWorkerRegistrar';

interface StrayDrawerProps {
  stray: Stray | null;
  onClose: () => void;
  onActionSuccess?: (updatedStray?: Stray) => void;
  onOpenAuth: () => void;
}

const COOLDOWN_MS = 5 * 60 * 60 * 1000;

/** Human wait time for the fed cooldown, e.g. "4h 12m". */
function waitLabel(msLeft: number) {
  const mins = Math.max(1, Math.ceil(msLeft / 60000));
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

/**
 * Pet details.
 * Mobile: bottom sheet. Desktop: a card floating beside the map, never covering it.
 */
export default function StrayDrawer({ stray, onClose, onActionSuccess, onOpenAuth }: StrayDrawerProps) {
  const { user } = useAuth();

  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [cooldownNotice, setCooldownNotice] = useState<string | null>(null);
  const [fedCooldownUntil, setFedCooldownUntil] = useState<number | null>(null);
  const [activePhotoIdx, setActivePhotoIdx] = useState(0);

  const [reviews, setReviews] = useState<StrayReview[]>([]);
  const [newRating, setNewRating] = useState<number>(5);
  const [newComment, setNewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  const strayId = stray?.id;

  const allPhotos = useMemo(() => {
    if (!stray) return [] as string[];
    const list: string[] = [];
    if (stray.identifier_photo_url) list.push(stray.identifier_photo_url);
    if (stray.gallery_photos && Array.isArray(stray.gallery_photos)) {
      stray.gallery_photos.forEach((p) => {
        if (p && !list.includes(p)) list.push(p);
      });
    }
    return list.slice(0, 4);
  }, [stray]);

  // Reset local state and pull the latest reviews each time a buddy is opened.
  useEffect(() => {
    if (!strayId) return;
    setActivePhotoIdx(0);
    setCooldownNotice(null);
    setSuccessMessage(null);
    setReviews([]);
    try {
      const raw = localStorage.getItem(`straybuddy_fed_${strayId}_${user?.id || 'guest'}`);
      const at = raw ? Number(raw) : 0;
      setFedCooldownUntil(at ? at + COOLDOWN_MS : null);
    } catch {
      setFedCooldownUntil(null);
    }
    let cancelled = false;
    fetch(`/api/reviews?stray_id=${strayId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && Array.isArray(data)) setReviews(data);
      })
      .catch((err) => console.warn('Failed to load reviews', err));
    return () => {
      cancelled = true;
    };
  }, [strayId, user?.id]);

  // Escape closes the sheet.
  useEffect(() => {
    if (!stray) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [stray, onClose]);

  if (!stray) return null;

  const formatTimeAgo = (dateStr: string | null) => {
    if (!dateStr) return { label: 'Never fed yet', isRecent: false };
    const diffMinutes = Math.floor((Date.now() - new Date(dateStr).getTime()) / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffMinutes < 60) return { label: `Fed ${diffMinutes}m ago`, isRecent: diffMinutes < 240 };
    if (diffHours < 24) return { label: `Fed ${diffHours}h ago`, isRecent: diffHours < 4 };
    return { label: `Last fed ${Math.floor(diffHours / 24)}d ago`, isRecent: false };
  };

  const feedingStatus = formatTimeAgo(stray.last_fed_at);
  const cooldownLeftMs = fedCooldownUntil ? fedCooldownUntil - Date.now() : 0;
  const onCooldown = cooldownLeftMs > 0;

  const handleFedClick = async () => {
    // Feeding is a signed-in gesture: the counter has to mean something.
    if (!user) {
      setCooldownNotice('Sign in first so the community fed count stays honest.');
      onOpenAuth();
      return;
    }
    try {
      setLoadingAction('fed');
      const res = await fetch('/api/care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stray_id: stray.id,
          user_id: user.id,
          username: user.username,
          action_type: 'fed',
          notes: 'Fed with food & loving care',
        }),
      });

      const data = await res.json();

      // The server asks for a sign-in when it cannot see a guardian id.
      if (res.status === 401 && data?.needsSignIn) {
        setCooldownNotice(data.message || 'Sign in to record a meal.');
        onOpenAuth();
        return;
      }
      // 5-hour community-fed cooldown: one honest tap per guardian per buddy.
      if (res.status === 429 && data?.cooldown) {
        setFedCooldownUntil(Date.now() + (data.minutesLeft || 1) * 60 * 1000);
        setSuccessMessage(null);
        setCooldownNotice(data.message || 'You tapped this buddy today. Come back later.');
        return;
      }

      if (!res.ok) throw new Error(data.error || 'Failed to log feeding');

      setCooldownNotice(null);
      setFedCooldownUntil(Date.now() + COOLDOWN_MS);
      try {
        localStorage.setItem(`straybuddy_fed_${stray.id}_${user?.id || 'guest'}`, String(Date.now()));
      } catch {
        /* storage full or blocked — the server cooldown still protects the counter */
      }
      setSuccessMessage('Meal recorded — the FED tally went up by one (+10 XP).');
      notify({
        title: 'Meal logged',
        body: `${stray.name || 'A buddy'} was fed. The fed counter is now honest.`,
        url: '/',
        tag: `fed-${stray.id}`,
      });
      if (data.stray) onActionSuccess?.(data.stray);
      else onActionSuccess?.();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setCooldownNotice(`Could not save the meal: ${err?.message || 'please try again.'}`);
    } finally {
      setLoadingAction(null);
    }
  };

  const handleQuickAction = async (action: 'water' | 'medical_alert') => {
    // Water refills need a signed-in guardian too; urgent alerts stay open to
    // anyone, because a stray in danger should never wait on a login screen.
    if (action === 'water' && !user) {
      setCooldownNotice('Sign in first so the water refills can be trusted.');
      onOpenAuth();
      return;
    }
    try {
      setLoadingAction(action);
      const res = await fetch('/api/care', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stray_id: stray.id,
          user_id: user?.id,
          username: user?.username || 'Guest Guardian',
          action_type: action,
          notes: action === 'water' ? 'Refilled clean water bowl' : 'Reported urgent / injured',
        }),
      });

      const data = await res.json();
      if (res.status === 401 && data?.needsSignIn) {
        setCooldownNotice(data.message || 'Sign in to record that.');
        onOpenAuth();
        return;
      }
      if (!res.ok) throw new Error(data.error || 'Action failed');

      setSuccessMessage(
        action === 'water' ? 'Fresh water refill logged (+10 XP).' : 'Urgent report sent to nearby rescuers.'
      );
      notify({
        title: action === 'water' ? 'Water refilled' : 'Urgent case reported',
        body:
          action === 'water'
            ? `${stray.name || 'A buddy'} has fresh water now.`
            : `Rescuers were alerted about ${stray.name || 'a buddy'}.`,
        url: '/',
        tag: `${action}-${stray.id}`,
      });
      if (data.stray) onActionSuccess?.(data.stray);
      else onActionSuccess?.();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error(err);
      setCooldownNotice(`Could not save that action: ${err?.message || 'please try again.'}`);
    } finally {
      setLoadingAction(null);
    }
  };

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
        setSuccessMessage('Thanks for the rating and the note.');
        setTimeout(() => setSuccessMessage(null), 3000);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const averageRating = reviews.length
    ? (reviews.reduce((acc, r) => acc + Number(r.rating || 5), 0) / reviews.length).toFixed(1)
    : '5.0';

  const statusTone =
    stray.health_status === 'injured'
      ? 'border-red-500/40 bg-red-500/15 text-red-300'
      : stray.health_status === 'needs_food'
        ? 'border-amber-500/40 bg-amber-500/15 text-amber-200'
        : 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300';

  return (
    <>
      {/* Tap-away layer, mobile only */}
      <button
        aria-label="Close pet details"
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-slate-950/40 backdrop-blur-[1px] sm:hidden"
      />

      <div className="pointer-events-none fixed inset-0 z-[70] flex items-end justify-center sm:items-center sm:justify-end">
        <section
          role="dialog"
          aria-modal="true"
          aria-label={`${stray.name || 'Stray'} details`}
          className="pointer-events-auto flex max-h-[86dvh] w-full flex-col overflow-hidden rounded-t-[26px] border border-white/10 bg-[color:var(--sb-surface)]/98 text-[color:var(--sb-text)] shadow-[var(--sb-shadow-lg)] backdrop-blur-xl animate-slide-up sm:mr-4 sm:max-h-[calc(100dvh-7rem)] sm:w-[380px] sm:rounded-[22px] sm:animate-pop-in"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 pb-3 pt-3.5">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="truncate text-lg font-black tracking-tight text-white">
                  {stray.name || 'Unnamed buddy'}
                </h2>
                {stray.is_tnr && (
                  <span className="shrink-0 rounded-full border border-teal-400/40 bg-teal-500/20 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-teal-300">
                    TNR
                  </span>
                )}
              </div>
              <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-semibold text-slate-400">
                <span className="capitalize text-slate-300">{stray.species}</span>
                <span className="opacity-40">·</span>
                <MapPin className="h-3 w-3 text-[color:var(--sb-accent-2)]" />
                <span className="truncate">{stray.city}</span>
              </div>
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-300 transition hover:text-white active:scale-95"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Body */}
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3">
            {/* Notices */}
            {successMessage && (
              <div className="mb-3 flex items-center gap-2 rounded-xl border border-emerald-500/40 bg-emerald-500/15 px-3 py-2 text-[12px] font-semibold text-emerald-200 animate-fade-in">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                <span>{successMessage}</span>
              </div>
            )}
            {cooldownNotice && (
              <div className="mb-3 flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-[12px] font-semibold text-amber-200 animate-fade-in">
                <Clock className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span>{cooldownNotice}</span>
              </div>
            )}

            {/* Photo */}
            <div className="relative h-52 w-full overflow-hidden rounded-2xl border border-white/10 bg-slate-950">
              {allPhotos.length > 0 ? (
                <img src={allPhotos[activePhotoIdx]} alt={stray.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-slate-500">
                  <Camera className="h-8 w-8" />
                  <span className="text-[11px]">No photos yet</span>
                </div>
              )}

              <span className={`absolute left-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${statusTone}`}>
                {stray.health_status.replace('_', ' ')}
              </span>

              {allPhotos.length > 1 && (
                <>
                  <button
                    onClick={() => setActivePhotoIdx((p) => (p === 0 ? allPhotos.length - 1 : p - 1))}
                    aria-label="Previous photo"
                    className="absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => setActivePhotoIdx((p) => (p === allPhotos.length - 1 ? 0 : p + 1))}
                    aria-label="Next photo"
                    className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur transition hover:bg-black/80"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <div className="absolute inset-x-0 bottom-2 flex justify-center gap-1.5">
                    {allPhotos.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActivePhotoIdx(idx)}
                        aria-label={`Photo ${idx + 1}`}
                        className={`h-1.5 rounded-full transition-all ${
                          activePhotoIdx === idx ? 'w-5 bg-emerald-400' : 'w-1.5 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Two key numbers */}
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                onClick={handleFedClick}
                disabled={loadingAction === 'fed' || onCooldown}
                className="flex flex-col items-start rounded-2xl border border-emerald-600/40 bg-emerald-500/10 p-3 text-left transition active:scale-[0.98] hover:border-emerald-400/70 disabled:opacity-90"
              >
                <div className="flex w-full items-center justify-between text-[11px] font-bold text-emerald-300">
                  <span className="flex items-center gap-1">
                    <Heart className="h-3.5 w-3.5 fill-emerald-400" /> Community fed
                  </span>
                  <span className="rounded-full border border-emerald-500/40 bg-emerald-500/20 px-1.5 py-0.5 text-[9px] font-black text-emerald-100">
                    {onCooldown ? 'Tapped' : '+1'}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-1.5">
                  <span className="text-2xl font-black leading-none text-white">{stray.fed_count || 0}</span>
                  <span className="text-[11px] font-semibold text-slate-300">meals</span>
                </div>
                <span className="mt-1 text-[11px] font-semibold leading-snug text-emerald-200/90">
                  {onCooldown ? `You tapped today — come back in ${waitLabel(cooldownLeftMs)}` : feedingStatus.label}
                </span>
              </button>

              <div className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex w-full items-center justify-between text-[11px] font-bold text-slate-300">
                  <span>Guardian rating</span>
                  <span className="flex items-center gap-1 text-amber-300">
                    <Star className="h-3.5 w-3.5 fill-amber-300" />
                    <span className="font-black text-white">{averageRating}</span>
                  </span>
                </div>
                <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-snug text-slate-300">
                  {stray.coat_description || 'Community stray'}
                </p>
                <span className="mt-1 text-[11px] font-semibold text-slate-400">
                  {reviews.length} review{reviews.length === 1 ? '' : 's'}
                </span>
              </div>
            </div>

            {/* Feeding state strip */}
            <div
              className={`mt-2.5 flex items-center gap-2 rounded-xl border px-3 py-2 ${
                feedingStatus.isRecent
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200'
                  : 'border-amber-500/40 bg-amber-500/10 text-amber-200'
              }`}
            >
              <Clock className="h-4 w-4 shrink-0" />
              <div className="flex-1">
                <span className="block text-[12px] font-black leading-tight">
                  {feedingStatus.isRecent ? 'Well fed and cared for' : 'Hungry — needs a meal soon'}
                </span>
                <span className="text-[11px] opacity-85">{feedingStatus.label}</span>
              </div>
            </div>

            {/* Quick care actions */}
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => handleQuickAction('water')}
                disabled={loadingAction === 'water'}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-sky-500/40 bg-sky-500/15 py-2.5 text-[12px] font-bold text-sky-200 transition active:scale-95 disabled:opacity-50"
              >
                <Droplets className="h-4 w-4" />
                {loadingAction === 'water' ? 'Saving…' : 'Refilled water'}
              </button>
              <button
                onClick={() => handleQuickAction('medical_alert')}
                disabled={loadingAction === 'medical_alert'}
                className="flex items-center justify-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/15 py-2.5 text-[12px] font-bold text-red-200 transition active:scale-95 disabled:opacity-50"
              >
                <AlertTriangle className="h-4 w-4" />
                {loadingAction === 'medical_alert' ? 'Sending…' : 'Report urgent'}
              </button>
            </div>

            {/* Safety note */}
            <div className="mt-2.5 flex items-start gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[11px] leading-snug text-slate-300">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-[color:var(--sb-accent-2)]" />
              <span>
                The pin is shifted about 150 m for the animal's safety. Community Fed counts one tap per guardian
                every 5 hours, so the tally stays honest.
              </span>
            </div>

            {/* Comments */}
            <div className="mt-4 space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-slate-200">
                  <MessageSquare className="h-3.5 w-3.5 text-[color:var(--sb-accent-2)]" />
                  Guardian notes
                </h3>
                <span className="text-[11px] font-semibold text-slate-400">{reviews.length} total</span>
              </div>

              <form onSubmit={handleReviewSubmit} className="space-y-2 rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-300">Rate this buddy</span>
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setNewRating(star)}
                        aria-label={`${star} star`}
                        className="p-0.5 transition-transform hover:scale-110"
                      >
                        <Star
                          className={`h-4 w-4 ${star <= newRating ? 'fill-amber-300 text-amber-300' : 'text-slate-600'}`}
                        />
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    placeholder={user ? 'Leave a note — loves chin scratches, very shy…' : 'Sign in to leave a note'}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/25 py-2.5 pl-3 pr-10 text-[12px] text-white placeholder-slate-500 focus:border-emerald-500/70 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={isSubmittingReview || !newComment.trim()}
                    aria-label="Send note"
                    className="absolute right-1.5 top-1.5 rounded-lg bg-emerald-500 p-1.5 text-slate-950 transition hover:bg-emerald-400 disabled:opacity-40"
                  >
                    <Send className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>

              <div className="max-h-52 space-y-2 overflow-y-auto pr-1">
                {reviews.length === 0 && (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-center text-[11px] text-slate-400">
                    No notes yet. Be the first guardian to check in.
                  </p>
                )}
                {reviews.map((r) => (
                  <div key={r.id} className="space-y-1 rounded-xl border border-white/10 bg-white/5 p-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-black text-white">@{r.username}</span>
                        <span className="text-[9px] text-slate-500">
                          {new Date(r.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: Number(r.rating) || 5 }).map((_, i) => (
                          <Star key={i} className="h-3 w-3 fill-amber-300 text-amber-300" />
                        ))}
                      </div>
                    </div>
                    <p className="text-[12px] leading-relaxed text-slate-200">{r.comment}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
