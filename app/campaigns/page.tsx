// app/campaigns/page.tsx
"use client";

import React, { useMemo, useState } from "react";
import { Gift, Heart, Megaphone, PawPrint, Plus, Sparkles, X } from "lucide-react";
import { Campaign } from "@/types/stray";
import { useAuth } from "@/context/AuthContext";
import AuthModal from "@/components/auth/AuthModal";
import { PageShell } from "@/components/layout/AppNav";
import { useCampaigns } from "@/lib/hooks/useCampaigns";

/** Charity campaigns live here — and only charity campaigns. */
export default function CampaignsPage() {
  const { campaigns, loading, react, create, refresh } = useCampaigns();
  const { isSuperAdmin, user } = useAuth();

  const [isPostingModal, setIsPostingModal] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [bannerUrl, setBannerUrl] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [isPopup, setIsPopup] = useState(true);

  const totals = useMemo(() => {
    return campaigns.reduce(
      (acc, c) => {
        const r = c.reactions || { heart: 0, paws: 0, clap: 0 };
        acc.heart += r.heart || 0;
        acc.paws += r.paws || 0;
        acc.clap += r.clap || 0;
        return acc;
      },
      { heart: 0, paws: 0, clap: 0 }
    );
  }, [campaigns]);

  async function handleReact(campaignId: string, type: "heart" | "paws" | "clap") {
    if (!user) {
      setNotice("Please sign in or create an account to react and support charity drives! 🐾");
      setIsAuthModalOpen(true);
      return;
    }
    const result = await react(campaignId, type, user.id, user.username);
    if (result.ok === false) setNotice(result.error || "Could not save that reaction.");
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !description) return;
    setIsSubmitting(true);
    const saved = await create({
      title,
      description,
      banner_photo_url: bannerUrl.trim(),
      target_amount: targetAmount.trim() || null,
      is_popup: isPopup,
      created_by: user?.id,
    });
    setIsSubmitting(false);
    if (saved) {
      setIsPostingModal(false);
      setTitle("");
      setDescription("");
      setBannerUrl("");
      setTargetAmount("");
      refresh();
    } else {
      setNotice("That campaign could not be published. Please try again.");
    }
  }

  return (
    <PageShell
      title="Community"
      subtitle="Charity drives and rescue events"
      actions={
        isSuperAdmin ? (
          <button
            onClick={() => setIsPostingModal(true)}
            className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-2 text-[11px] font-black text-slate-950 shadow-lg shadow-amber-500/20 transition hover:brightness-110 active:scale-95"
          >
            <Plus className="h-4 w-4 stroke-[3]" />
            <span>Post event</span>
          </button>
        ) : null
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="rounded-full border border-amber-500/30 bg-amber-500/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em] text-amber-300">
          Official drives
        </span>

        {/* Reaction totals in one small row, so the page has a real summary */}
        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-rose-300">
            ❤️ {totals.heart}
          </span>
          <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-emerald-300">
            🐾 {totals.paws}
          </span>
          <span className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1.5 text-amber-300">
            👏 {totals.clap}
          </span>
        </div>
      </div>

      {/* Notice banner */}
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3.5 text-xs text-slate-300">
        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400">
          <Megaphone className="h-4 w-4" />
        </div>
        <div>
          <p className="font-bold text-white">Direct community sponsorships</p>
          <p className="text-[11px] text-slate-400">
            Sign in to send encouragement reactions (love, paw, clap). Comments stay off to keep spam out.
          </p>
        </div>
      </div>

      {notice && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-2.5 text-[12px] text-amber-200">
          <span>{notice}</span>
          <button onClick={() => setNotice(null)} aria-label="Dismiss" className="text-amber-300 hover:text-white">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {loading && <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-[12px] text-slate-400">
        Loading campaigns…
      </div>}

      {!loading && campaigns.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-white/10 bg-white/5 p-10 text-center">
          <PawPrint className="h-7 w-7 text-slate-600" />
          <p className="text-sm font-bold text-white">No campaigns yet</p>
          <p className="text-xs text-slate-400">A superadmin can publish the first drive from here.</p>
        </div>
      )}

      <div className="space-y-5 xl:grid xl:grid-cols-2 xl:gap-5 xl:space-y-0">
        {campaigns.map((camp) => {
          const reactions = camp.reactions || { heart: 0, paws: 0, clap: 0 };
          return (
            <article
              key={camp.id}
              className="overflow-hidden rounded-3xl border border-white/10 bg-white/5 shadow-[var(--sb-shadow)] transition-all duration-200 hover:border-white/20 hover:shadow-[var(--sb-shadow-lg)]"
            >
              <div className="relative h-52 w-full bg-slate-800">
                <img
                  src={camp.banner_photo_url || "/icon.svg"}
                  alt={camp.title}
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-black/25" />
                {camp.target_amount && (
                  <div className="absolute bottom-3 left-4 flex items-center gap-1.5 rounded-xl border border-amber-300 bg-amber-500 px-3 py-1 text-xs font-black text-slate-950 shadow-lg">
                    <Gift className="h-3.5 w-3.5" />
                    <span>{camp.target_amount}</span>
                  </div>
                )}
              </div>

              <div className="space-y-3 p-5">
                <h2 className="text-xl font-black leading-snug tracking-tight text-white">{camp.title}</h2>
                <p className="whitespace-pre-line text-xs leading-relaxed text-slate-300">{camp.description}</p>

                <div className="flex flex-col gap-2 border-t border-white/10 pt-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Community reactions:
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        ["heart", "❤️", reactions.heart],
                        ["paws", "🐾", reactions.paws],
                        ["clap", "👏", reactions.clap],
                      ] as const
                    ).map(([type, emoji, count]) => (
                      <button
                        key={type}
                        onClick={() => handleReact(camp.id, type)}
                        className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-bold transition-all hover:bg-white/10 active:scale-95"
                        title={!user ? "Sign in to react" : `Send ${type}`}
                      >
                        <span>{emoji}</span>
                        <span className="text-slate-200">{count}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <AuthModal isOpen={isAuthModalOpen} onClose={() => setIsAuthModalOpen(false)} />

      {isPostingModal && (
        <div className="fixed inset-0 z-[960] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md animate-pop-in rounded-3xl border border-white/10 bg-[color:var(--sb-surface)] p-6 text-slate-100 shadow-[var(--sb-shadow-lg)]">
            <button
              onClick={() => setIsPostingModal(false)}
              aria-label="Close"
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-slate-800 text-slate-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <h3 className="mb-1 flex items-center gap-2 text-lg font-black text-white">
              <Sparkles className="h-5 w-5 text-amber-400" />
              <span>Post New Charity Campaign</span>
            </h3>
            <p className="mb-4 text-xs text-slate-400">Superadmin Official Announcement Broadcast</p>

            <form onSubmit={handleCreate} className="space-y-3.5">
              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">Campaign Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Metro Manila Free Spay & Neuter"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold text-slate-300">Description & Charity Goals</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain event details, beneficiary animal groups, how donations are used..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3.5 py-2.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-300">Target Amount</label>
                  <input
                    type="text"
                    placeholder="₱50,000 Target"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-[11px] font-semibold text-slate-300">Banner Image URL</label>
                  <input
                    type="text"
                    placeholder="https://images.unsplash.com/..."
                    value={bannerUrl}
                    onChange={(e) => setBannerUrl(e.target.value)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-700/60 bg-slate-800/60 p-3">
                <input
                  type="checkbox"
                  checked={isPopup}
                  onChange={(e) => setIsPopup(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-amber-500 focus:ring-0"
                />
                <div className="text-xs">
                  <span className="font-semibold text-slate-200">Show as Pop-up on App Open</span>
                  <p className="text-[10px] text-slate-400">Triggers the campaign dialog when someone opens the radar.</p>
                </div>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 py-3 text-xs font-black text-slate-950 shadow-lg transition-all hover:brightness-110 disabled:opacity-60"
              >
                {isSubmitting ? "Publishing..." : "Publish Official Campaign"}
              </button>
            </form>
          </div>
        </div>
      )}
    </PageShell>
  );
}
