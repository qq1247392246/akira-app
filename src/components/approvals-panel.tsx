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
        <div className="rounded-full bg-white/5 p-4">
          <Check className="h-8 w-8" />
        </div>
        <p>暂无待审核请求</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 pb-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-white/80">待审核列表 ({requests.length})</h3>
      </div>
      
      <div className="space-y-3">
        {requests.map((req) => (
          <Card 
            key={req.id} 
            className="border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/[0.07]"
          >
            <div className="flex gap-4">
              <Avatar className="h-12 w-12 border border-white/20">
                <AvatarImage src={req.avatar_url || undefined} />
                <AvatarFallback>{req.display_name?.slice(0, 2) || "??"}</AvatarFallback>
              </Avatar>
              
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-white">
                        {req.display_name || "Unknown User"}
                      </span>
                      <Badge variant="outline" className="border-white/20 text-[10px] text-white/60">
                        注册申请
                      </Badge>
                    </div>
                    <p className="text-xs text-white/40">@{req.username}</p>
                  </div>
                  <span className="text-xs text-white/40">
                    {new Date(req.created_at).toLocaleDateString()}
                  </span>
                </div>

                {req.signature && (
                  <div className="rounded bg-black/20 p-2 text-sm text-white/80">
                    <p className="text-xs text-white/40 mb-1">签名：</p>
                    {req.signature}
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 border border-white/10 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    onClick={() => handleReview(req.id, "reject")}
                    disabled={!!processingId}
                  >
                    {processingId === req.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <X className="mr-1.5 h-3.5 w-3.5" />
                        拒绝
                      </>
                    )}
                  </Button>
                  <Button
                    size="sm"
                    className="h-8 bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 hover:text-cyan-200"
                    onClick={() => handleReview(req.id, "approve")}
                    disabled={!!processingId}
                  >
                    {processingId === req.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Check className="mr-1.5 h-3.5 w-3.5" />
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
