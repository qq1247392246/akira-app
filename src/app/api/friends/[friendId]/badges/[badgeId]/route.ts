import { NextRequest, NextResponse } from "next/server";
import { removeFriendBadge } from "@/server/friends-service";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ friendId: string; badgeId: string }> }
) {
  try {
    const { friendId, badgeId } = await params;
    const body = await request.json().catch(() => ({}));
    const { actorRole, viewerId } = body ?? {};
    if (actorRole !== 1) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    const friend = await removeFriendBadge(friendId, badgeId, viewerId);
    if (!friend) {
      return NextResponse.json({ error: "朋友或徽章不存在" }, { status: 404 });
    }
    return NextResponse.json(friend);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "删除徽章失败" },
      { status: 500 }
    );
  }
}

