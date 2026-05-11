"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, X } from "lucide-react";
import { useSession } from "@/components/session-provider";
import {
  fetchApprovals,
  reviewApproval,
  type DbRegistrationRequest,
} from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      onUpdate?.();
    } catch (error) {
      console.error(`Failed to ${action} request:`, error);
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--ink-muted-rgb))]" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="sketch-surface sketch-wash paper-texture flex h-full flex-col items-center justify-center space-y-4 p-8 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--accent-sage-rgb)/0.18)]">
          <Check className="h-8 w-8 text-foreground" />
        </div>
        <div className="space-y-2">
          <p className="font-display text-2xl text-foreground">暂时没有待审核申请</p>
          <p className="text-sm leading-6 text-[rgb(var(--ink-muted-rgb))]">
            当前申请队列已经清空，新的注册请求到来后会显示在这里。
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-4">
      <section className="sketch-surface sketch-wash paper-texture space-y-3 p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <p className="font-display text-xs uppercase tracking-[0.35em] text-[rgb(var(--ink-muted-rgb))]">
              Approval Desk
            </p>
            <h3 className="font-display text-3xl text-foreground">注册审核</h3>
            <p className="max-w-2xl text-sm leading-7 text-[rgb(var(--ink-muted-rgb))]">
              保持入口克制，只展示待处理申请，避免审核视图变成复杂后台。
            </p>
          </div>
          <div className="sketch-pill px-4 py-2 text-xs text-[rgb(var(--ink-muted-rgb))]">
            待处理 {requests.length} 条
          </div>
        </div>
      </section>

      <div className="space-y-4">
        {requests.map((req) => {
          const isBusy = processingId === req.id;
          return (
            <Card
              key={req.id}
              className="sketch-surface paper-texture border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.92)] p-5"
            >
              <div className="flex flex-col gap-5 md:flex-row">
                <Avatar className="h-14 w-14 border-2 border-[rgb(var(--ink-rgb)/0.14)]">
                  <AvatarImage src={req.avatar_url || undefined} />
                  <AvatarFallback className="bg-[rgb(var(--accent-butter-rgb)/0.26)] text-foreground">
                    {req.display_name?.slice(0, 2) || "访客"}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1 space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <h4 className="text-lg font-semibold text-foreground">
                          {req.display_name || "未命名用户"}
                        </h4>
                        <Badge
                          variant="outline"
                          className="rounded-full border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--accent-rose-rgb)/0.18)] text-[10px] uppercase tracking-[0.2em] text-foreground"
                        >
                          待审核
                        </Badge>
                      </div>
                      <p className="text-sm text-[rgb(var(--ink-muted-rgb))]">@{req.username}</p>
                    </div>
                    <div className="sketch-pill px-3 py-1 text-xs text-[rgb(var(--ink-muted-rgb))]">
                      {new Date(req.created_at).toLocaleDateString()}
                    </div>
                  </div>

                  {req.signature ? (
                    <div className="rounded-[1.2rem] border-2 border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-card-rgb)/0.85)] px-4 py-3">
                      <p className="mb-1 text-[11px] uppercase tracking-[0.25em] text-[rgb(var(--ink-muted-rgb))]">
                        留言
                      </p>
                      <p className="text-sm leading-7 text-foreground">{req.signature}</p>
                    </div>
                  ) : null}

                  <div className="flex flex-wrap justify-end gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-full px-4"
                      onClick={() => handleReview(req.id, "reject")}
                      disabled={!!processingId}
                    >
                      {isBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="mr-1 h-4 w-4" />}
                      拒绝
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-full px-4"
                      onClick={() => handleReview(req.id, "approve")}
                      disabled={!!processingId}
                    >
                      {isBusy ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-1 h-4 w-4" />
                      )}
                      通过
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
