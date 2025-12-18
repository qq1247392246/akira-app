import { NextRequest, NextResponse } from "next/server";
import { fetchFriendsFromDb, updateFriendProfile } from "@/server/friends-service";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const { friendId } = await params;
    const body = await request.json().catch(() => ({}));
    const { alias, isAdmin, actorRole, viewerId } = body ?? {};
    if (actorRole !== 1) {
      return NextResponse.json({ error: "需要管理员权限" }, { status: 403 });
    }
    const normalizedAlias =
      typeof alias === "string" ? alias.trim() : undefined;
    await updateFriendProfile(friendId, {
      alias:
        typeof normalizedAlias === "undefined"
          ? undefined
          : normalizedAlias || null,
      isAdmin: typeof isAdmin === "boolean" ? isAdmin : undefined,
    });

    const [friend] = await fetchFriendsFromDb(viewerId, friendId);
    if (!friend) {
      return NextResponse.json({ error: "未找到朋友资料" }, { status: 404 });
    }
    return NextResponse.json(friend);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "更新朋友信息失败" },
      { status: 500 }
    );
  }
}
