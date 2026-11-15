// lib/hooks/useCampaigns.ts
"use client";

/**
 * One shared loader for charity campaigns.
 * Used by the /campaigns page and the pop-up that opens on the map, so both
 * read the same cached response instead of fetching twice.
 */
import { useCallback, useEffect, useState } from "react";
import { Campaign } from "@/types/stray";

type NewCampaign = {
  title: string;
  description: string;
  banner_photo_url?: string;
  target_amount?: string | null;
  is_popup?: boolean;
  created_by?: string | null;
};

let memoryCache: { list: Campaign[]; at: number } | null = null;
const FRESH_MS = 15_000;

export function useCampaigns() {
  const [campaigns, setCampaigns] = useState<Campaign[]>(memoryCache?.list ?? []);
  const [loading, setLoading] = useState(!memoryCache);

  const refresh = useCallback(async (force = false) => {
    if (!force && memoryCache && Date.now() - memoryCache.at < FRESH_MS) {
      setCampaigns(memoryCache.list);
      setLoading(false);
      return memoryCache.list;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/campaigns", { cache: "no-store" });
      if (res.ok) {
        const list: Campaign[] = await res.json();
        memoryCache = { list, at: Date.now() };
        setCampaigns(list);
        return list;
      }
    } catch (err) {
      console.warn("Failed to load campaigns", err);
    } finally {
      setLoading(false);
    }
    return [] as Campaign[];
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Optimistic reaction: the count moves first, the server catches up. */
  const react = useCallback(
    async (campaignId: string, type: "heart" | "paws" | "clap", userId?: string, username?: string) => {
      setCampaigns((prev) =>
        prev.map((c) => {
          if (c.id !== campaignId) return c;
          const current = c.reactions || { heart: 0, paws: 0, clap: 0 };
          return { ...c, reactions: { ...current, [type]: (current[type] || 0) + 1 } };
        })
      );

      try {
        const res = await fetch("/api/campaigns", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "react",
            campaign_id: campaignId,
            reaction_type: type,
            user_id: userId,
            username,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          return { ok: false as const, error: err.error as string | undefined };
        }
        return { ok: true as const };
      } catch (err: any) {
        return { ok: false as const, error: err?.message as string | undefined };
      }
    },
    []
  );

  const create = useCallback(async (input: NewCampaign) => {
    try {
      const res = await fetch("/api/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...input,
          banner_photo_url:
            input.banner_photo_url?.trim() ||
            "https://images.unsplash.com/photo-1548767797-d8c844163c4c?w=800&auto=format&fit=crop&q=80",
          created_by: input.created_by || undefined,
        }),
      });
      if (!res.ok) return null;
      const saved: Campaign = await res.json();
      memoryCache = null;
      return saved;
    } catch (err) {
      console.warn("Failed to create campaign", err);
      return null;
    }
  }, []);

  return { campaigns, loading, refresh, react, create };
}
