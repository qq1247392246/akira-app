"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/session-provider";
import {
  fetchApprovals,
  reviewApproval,
  type DbRegistrationRequest,
} from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ApprovalsPanelProps {
  onUpdate?: () => void;
}

export function ApprovalsPanel({ onUpdate }: ApprovalsPanelProps) {
  const { user: sessionUser } = useSession();
  const [requests, setRequests] = useState<DbRegistrationRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const loadRequests = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchApprovals({ status: "pending" });
      setRequests(data);
    } catch (error) {
      console.error("Failed to load approval requests:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  const handleReview = async (requestId: string, action: "approve" | "reject") => {
    if (!sessionUser) return;

    try {
      setProcessingId(requestId);
      await reviewApproval(requestId, {
        reviewerId: sessionUser.id,
        action,
        rejectionReason: action === "reject" ? "Admin rejected" : undefined,
      });

      // 从列表中移除已处理的请求
      setRequests((prev) => prev.filter((req) => req.id !== requestId));

      // 通知父组件更新（例如刷新红点）
      if (onUpdate) {
        onUpdate();
      }
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center space-y-4 text-white/40">
        <div className="rounded-full bg-white/5 p-6 backdrop-blur-sm border border-white/10 shadow-inner">
          <Check className="h-10 w-10 text-emerald-400/50" />
        </div>
        <p className="text-sm font-medium">暂无待审核请求</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">待审核列表 ({requests.length})</h3>
      </div>

      <div className="space-y-4">
        {requests.map((req) => (
          <Card
            key={req.id}
            className="border-white/20 bg-white/10 p-5 transition-all hover:bg-white/15 hover:shadow-lg hover:shadow-white/5 backdrop-blur-md rounded-2xl"
          >
            <div className="flex gap-5">
              <Avatar className="h-14 w-14 border-2 border-white/20 shadow-sm">
                <AvatarImage src={req.avatar_url || undefined} />
                <AvatarFallback className="bg-white/10 text-white/60">{req.display_name?.slice(0, 2) || "??"}</AvatarFallback>
              </Avatar>

              <div className="flex-1 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-3">
                      <span className="text-lg font-bold text-white drop-shadow-sm">
                        {req.display_name || "Unknown User"}
                      </span>
                      <Badge variant="outline" className="border-cyan-400/30 bg-cyan-400/10 text-[10px] text-cyan-300 uppercase tracking-wider shadow-sm">
                        注册申请
                      </Badge>
                    </div>
                    <p className="text-xs font-medium text-white/50 mt-0.5">@{req.username}</p>
                  </div>
                  <span className="text-xs font-medium text-white/40 bg-white/5 px-2 py-1 rounded-full">
                    {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </div>

                {req.signature && (
                  <div className="rounded-xl bg-black/20 p-3 text-sm text-white/90 border border-white/5">
                    <p className="text-[10px] uppercase tracking-wider text-white/40 mb-1.5 font-bold">签名</p>
                    <p className="leading-relaxed font-medium">{req.signature}</p>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-9 px-4 rounded-xl border border-white/10 text-rose-300 hover:bg-rose-500/10 hover:text-rose-200 hover:border-rose-500/30 transition-all"
                    onClick={() => handleReview(req.id, "reject")}
                    disabled={!!processingId}
                  >
                    {processingId === req.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="mr-1.5 h-4 w-4" />
                        拒绝
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="h-9 px-4 rounded-xl bg-gradient-to-r from-cyan-500/80 to-blue-500/80 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/20 border-none transition-all"
                    onClick={() => handleReview(req.id, "approve")}
                    disabled={!!processingId}
                  >
                    {processingId === req.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="mr-1.5 h-4 w-4" />
                        批准
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
