import { NextResponse } from "next/server";
import { fetchFriendsFromDb } from "@/server/friends-service";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const viewerId = searchParams.get("viewerId") || undefined;
    const items = await fetchFriendsFromDb(viewerId);
    return NextResponse.json({ items });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "加载朋友信息失败" },
      { status: 500 }
    );
  }
}
