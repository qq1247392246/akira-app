export type FriendTag = {
  id: string;
  label: string;
  likes: number;
  createdBy: string;
  createdAt: string;
  likedByMe?: boolean;
};

export type FriendBadge = {
  id?: string;
  label: string;
  color: string;
};

export type FriendEntry = {
  id: string;
  username: string;
  displayName: string;
  alias?: string;
  isAdmin?: boolean;
  avatarUrl: string;
  signature: string;
  location: string;
  badges: FriendBadge[];
  stats: {
    activityScore: number;
    likes: number;
    comments: number;
    tags: number;
    orbit: string;
    companionshipDays: number;
  };
  accent: string;
  neon: string;
  tags: FriendTag[];
  story: string;
  customAreaTitle: string;
  customAreaHighlight: string;
};
