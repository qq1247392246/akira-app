import { NextRequest, NextResponse } from "next/server";
import { fetchFriendsFromDb, updateFriendProfile } from "@/server/friends-service";

function normalizeNullableString(value: unknown): string | null | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : null;
  }
  if (value === null) {
    return null;
  }
  return undefined;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ friendId: string }> }
) {
  try {
    const { friendId } = await params;
    const body = await request.json().catch(() => ({}));
    const {
      alias,
      isAdmin: targetIsAdmin,
      location,
      story,
      customAreaTitle,
      customAreaHighlight,
      accentClass,
      neonClass,
      signature,
      actorRole,
      actorId,
      viewerId,
    } = body ?? {};

    const isAdminActor = actorRole === 1;
    const isSelfActor = actorId && actorId === friendId;
    if (!isAdminActor && !isSelfActor) {
      return NextResponse.json({ error: "无权限修改该卡片" }, { status: 403 });
    }

    const payload = {
      alias: normalizeNullableString(alias),
      location: normalizeNullableString(location),
      story: normalizeNullableString(story),
      customAreaTitle: normalizeNullableString(customAreaTitle),
      customAreaHighlight: normalizeNullableString(customAreaHighlight),
      accentClass:
        typeof accentClass === "string"
          ? accentClass
          : accentClass === null
            ? null
            : undefined,
      neonClass:
        typeof neonClass === "string"
          ? neonClass
          : neonClass === null
            ? null
            : undefined,
      signature: normalizeNullableString(signature),
      isAdmin: isAdminActor && typeof targetIsAdmin === "boolean" ? targetIsAdmin : undefined,
    };

    await updateFriendProfile(friendId, payload);

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
