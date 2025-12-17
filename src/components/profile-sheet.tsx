"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { PortalUser } from "@/data/mock";

type ProfileSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PortalUser;
  isAuthenticated: boolean;
  sessionLoading: boolean;
  onRequestAuth: () => void;
  onLogout: () => void;
};

export function ProfileSheet({
  open,
  onOpenChange,
  user,
  isAuthenticated,
  sessionLoading,
  onRequestAuth,
  onLogout,
}: ProfileSheetProps) {
  const handlePrimary = () => {
    if (isAuthenticated) {
      onLogout();
    } else {
      onRequestAuth();
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full border-white/10 bg-[#040814]/95 p-0 text-white sm:max-w-md"
      >
        <SheetHeader className="items-start border-b border-white/10 px-6 py-4 text-left">
          <SheetTitle>个人设置</SheetTitle>
          <SheetDescription className="text-white/60">
            查看当前身份、签名与快捷操作入口。
          </SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
          <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <Avatar className="h-16 w-16 border border-white/10">
              <AvatarImage src={user.avatarUrl} />
              <AvatarFallback>{user.displayName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="space-y-1">
              <p className="text-lg font-semibold">{user.displayName}</p>
              <p className="text-sm text-white/60">@{user.username}</p>
              <Badge className="bg-black/50 text-xs uppercase tracking-[0.3em] text-white/60">
                {user.role === "admin" ? "管理员" : "普通用户"}
              </Badge>
            </div>
          </div>

          <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
            <p className="text-xs uppercase tracking-[0.4em] text-white/40">签名</p>
            <p className="text-sm leading-relaxed text-white/80">{user.signature}</p>
          </div>

          <div className="grid gap-3 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
            <div className="flex items-center justify-between">
              <span>日记数量</span>
              <span className="font-semibold text-white">{user.metricSummary.entries}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>系统 Uptime</span>
              <span className="font-semibold text-white">{user.metricSummary.uptime}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>邀请名额</span>
              <span className="font-semibold text-white">{user.metricSummary.invites}</span>
            </div>
          </div>
        </div>
        <SheetFooter className="border-t border-white/10 px-6 py-4">
          <Button
            className="w-full bg-white/10 text-white hover:bg-white/20"
            onClick={handlePrimary}
            disabled={sessionLoading}
          >
            {isAuthenticated ? "退出登录" : "立即登录"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
