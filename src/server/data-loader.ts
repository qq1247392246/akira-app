import "server-only";

import { cache } from "react";
import { cookies } from "next/headers";
import { getSupabaseAdmin } from "@/lib/supabase";
import { portalCards, type PortalCard } from "@/data/mock";
import type { FriendEntry } from "@/data/friends";
import type { Database } from "@/types/database";
import { fetchFriendsFromDb as fetchFriendsFromDbRaw } from "@/server/friends-service";

type SessionUser = {
  id: string;
  username: string;
  displayName: string;
  role: number;
  avatarUrl?: string | null;
  signature?: string | null;
};

type DbCardRow = Database["public"]["Tables"]["cards"]["Row"];

const CARD_UI_CONFIG: Record<string, Partial<PortalCard>> = {
  "life-journal": {
    accent: "from-cyan-400/70 via-blue-500/50 to-fuchsia-500/50",
    glow: "shadow-[0_0_40px_rgba(34,211,238,0.45)]",
    badge: "alpha",
  },
  friends: {
    accent: "from-rose-400/70 via-orange-500/60 to-amber-400/50",
    glow: "shadow-[0_0_40px_rgba(251,113,133,0.35)]",
  },
  playground: {
    accent: "from-emerald-400/70 via-teal-500/60 to-cyan-400/50",
    glow: "shadow-[0_0_40px_rgba(16,185,129,0.45)]",
  },
  approvals: {
    accent: "from-purple-400/70 via-indigo-500/60 to-blue-500/40",
    glow: "shadow-[0_0_40px_rgba(168,85,247,0.45)]",
  },
  "system-settings": {
    accent: "from-slate-300/50 via-slate-500/40 to-slate-800/40",
    glow: "shadow-[0_0_40px_rgba(148,163,184,0.35)]",
  },
  stack: {
    accent: "from-sky-400/70 via-blue-500/50 to-cyan-500/50",
    glow: "shadow-[0_0_40px_rgba(56,189,248,0.35)]",
  },
};

const FALLBACK_STYLE: Pick<PortalCard, "accent" | "glow"> = {
  accent: "from-gray-400/70 via-gray-500/50 to-gray-600/50",
  glow: "shadow-[0_0_40px_rgba(156,163,175,0.45)]",
};

const mockById = new Map(portalCards.map((card) => [card.id, card]));

function mapCardRow(card: DbCardRow): PortalCard {
  const mock = mockById.get(card.slug);
  const uiConfig = CARD_UI_CONFIG[card.slug] ?? FALLBACK_STYLE;
  return {
    id: card.slug,
    title: card.title,
    description: card.description ?? mock?.description ?? "",
    type: (card.type ?? "internal") as PortalCard["type"],
    targetUrl: card.target_url ?? mock?.targetUrl,
    adminOnly: card.is_admin_only ?? mock?.adminOnly ?? false,
    metrics: mock?.metrics ?? [],
    badge: mock?.badge ?? uiConfig.badge,
    accent: uiConfig.accent ?? FALLBACK_STYLE.accent,
    glow: uiConfig.glow ?? FALLBACK_STYLE.glow,
  };
}

async function readSessionUserId(): Promise<string | null> {
  const store = await cookies();
  const rawSession = store.get("akira_session")?.value;
  if (rawSession) {
    try {
      const decoded = decodeURIComponent(rawSession);
      const parsed = JSON.parse(decoded) as { id?: string };
      if (parsed?.id) {
        return parsed.id;
      }
    } catch {
      // Ignore
    }
  }
  return store.get("akira_user_id")?.value ?? null;
}

export const fetchCardsFromDb = cache(async (): Promise<PortalCard[]> => {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("cards")
    .select("*")
    .order("order_index", { ascending: true });

  if (error) {
    throw new Error(`Failed to load cards: ${error.message}`);
  }

  return (data ?? []).map(mapCardRow);
});

export const fetchSessionUserFromDb = cache(async (): Promise<SessionUser | null> => {
  const userId = await readSessionUserId();
  if (!userId) {
    return null;
  }

  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("users")
    .select("id, username, display_name, role, avatar_url, signature, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (error || !data || data.is_active === false) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    role: data.role,
    avatarUrl: data.avatar_url,
    signature: data.signature,
  };
});

export const fetchFriendsFromDb = cache(async (viewerId?: string): Promise<FriendEntry[]> => {
  return fetchFriendsFromDbRaw(viewerId);
});
