"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/components/session-provider";
import {
  fetchCards,
  createCard,
  updateCard,
  deleteCard,
} from "@/lib/api";
import { PortalCard } from "@/data/mock";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  Plus,
  Pencil,
  Trash2,
  ArrowLeft,
  Save,
  Shield,
  LayoutGrid
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemSettingsPanelProps {
  onUpdate?: () => void;
}

type ViewState = "list" | "edit" | "create";

export function SystemSettingsPanel({ onUpdate }: SystemSettingsPanelProps) {
  const { user: sessionUser } = useSession();
  const [view, setView] = useState<ViewState>("list");
  const [cards, setCards] = useState<PortalCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCard, setSelectedCard] = useState<PortalCard | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    description: "",
    isAdminOnly: false,
    orderIndex: 0,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchCards();
      // 按 order_index 排序 (如果 API 没排的话，这里简单按 title 或其他逻辑排，或者假设 API 已排)
      // 目前 PortalCard 类型没有 orderIndex，但 API 返回的 DB 数据有。
      // fetchCards 转换时丢失了 orderIndex，我们需要在 api.ts 里补上吗？
      // 暂时先直接展示，后续优化。
      setCards(data);
    } catch (err) {
      console.error("Failed to load cards:", err);
      setError("加载卡片列表失败");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCards();
  }, [loadCards]);

  const handleCreateClick = () => {
    setFormData({
      slug: "",
      title: "",
      description: "",
      isAdminOnly: false,
      orderIndex: cards.length + 1,
    });
    setError(null);
    setView("create");
  };

  const handleEditClick = (card: PortalCard) => {
    setSelectedCard(card);
    setFormData({
      slug: card.id, // id is slug
      title: card.title,
      description: card.description,
      isAdminOnly: card.adminOnly || false,
      orderIndex: 0, // 暂时无法获取当前 order，设为 0 或需要 API 支持
    });
    setError(null);
    setView("edit");
  };

  const handleBack = () => {
    setView("list");
    setSelectedCard(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sessionUser) return;

    setSubmitting(true);
    setError(null);

    try {
      if (view === "create") {
        await createCard({
          slug: formData.slug,
          title: formData.title,
          description: formData.description,
          is_admin_only: formData.isAdminOnly,
          order_index: formData.orderIndex,
          authorId: sessionUser.id,
        });
      } else if (view === "edit" && selectedCard) {
        await updateCard(selectedCard.id, {
          title: formData.title,
          description: formData.description,
          is_admin_only: formData.isAdminOnly,
          order_index: formData.orderIndex,
          authorId: sessionUser.id,
        });
      }

      await loadCards();
      if (onUpdate) onUpdate();
      setView("list");
    } catch (err: unknown) {
      console.error("Operation failed:", err);
      const errorMessage = err instanceof Error ? err.message : "操作失败，请重试";
      setError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (card: PortalCard) => {
    if (!sessionUser || !confirm(`确定要删除卡片 "${card.title}" 吗？此操作不可恢复。`)) return;

    try {
      setLoading(true);
      await deleteCard(card.id, sessionUser.id);
      await loadCards();
      if (onUpdate) onUpdate();
    } catch (err: unknown) {
      console.error("Delete failed:", err);
      const errorMessage = err instanceof Error ? err.message : "未知错误";
      alert("删除失败: " + errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (loading && view === "list" && cards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white/40" />
      </div>
    );
  }

  // --- List View ---
  if (view === "list") {
    return (
      <div className="flex h-full flex-col space-y-6">
        <div className="flex items-center justify-between px-1">
          <h3 className="text-sm font-bold uppercase tracking-wider text-white/60">卡片管理 ({cards.length})</h3>
          <Button
            size="sm"
            onClick={handleCreateClick}
            className="h-9 gap-2 bg-gradient-to-r from-cyan-500/80 to-blue-500/80 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/20 border-none rounded-xl transition-all"
          >
            <Plus className="h-4 w-4" />
            新建
          </Button>
        </div>

        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-4 pb-4">
            {cards.map((card) => (
              <Card
                key={card.id}
                className="group relative border-white/20 bg-white/10 p-5 transition-all hover:bg-white/15 hover:shadow-lg hover:shadow-white/5 backdrop-blur-md rounded-2xl"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                      <h4 className="text-lg font-bold text-white drop-shadow-sm">{card.title}</h4>
                      {card.adminOnly && (
                        <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-[10px] text-amber-400 uppercase tracking-wider shadow-sm">
                          Admin Only
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs font-mono text-white/30 bg-black/20 px-2 py-0.5 rounded w-fit">ID: {card.id}</p>
                    <p className="text-sm text-white/80 line-clamp-2 font-medium leading-relaxed">{card.description}</p>
                  </div>

                  <div className="flex flex-col gap-2 opacity-0 transition-all duration-300 group-hover:opacity-100 translate-x-2 group-hover:translate-x-0">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-white/60 hover:bg-white/10 hover:text-white rounded-xl"
                      onClick={() => handleEditClick(card)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-9 w-9 text-white/60 hover:bg-rose-500/20 hover:text-rose-400 rounded-xl"
                      onClick={() => handleDelete(card)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>
      </div>
    );
  }

  // --- Edit / Create View ---
  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex items-center gap-3 border-b border-white/10 pb-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="h-9 w-9 -ml-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h3 className="text-xl font-bold text-white drop-shadow-sm">
          {view === "create" ? "新建卡片" : "编辑卡片"}
        </h3>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto pr-2 custom-scrollbar">
        <div className="space-y-5">
          {/* Slug / ID */}
          <div className="space-y-2">
            <Label htmlFor="slug" className="text-white/80 font-medium">
              卡片标识 (Slug)
            </Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
              disabled={view === "edit"}
              placeholder="e.g., my-new-card"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/20 focus:border-cyan-400/50 focus:ring-cyan-400/50 rounded-xl h-11"
              required
              pattern="[a-z0-9-]+"
              title="仅允许小写字母、数字和连字符"
            />
            {view === "create" && (
              <p className="text-xs text-white/40 pl-1">
                唯一标识符，创建后不可修改。用于 URL 和数据库索引。
              </p>
            )}
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-white/80 font-medium">标题</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="卡片显示标题"
              className="bg-white/5 border-white/20 text-white placeholder:text-white/20 focus:border-cyan-400/50 focus:ring-cyan-400/50 rounded-xl h-11"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description" className="text-white/80 font-medium">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="简短描述该模块的功能..."
              className="bg-white/5 border-white/20 text-white placeholder:text-white/20 focus:border-cyan-400/50 focus:ring-cyan-400/50 min-h-[120px] rounded-xl resize-none"
              required
            />
          </div>

          {/* Options */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div
              className={cn(
                "cursor-pointer rounded-2xl border p-5 transition-all hover:shadow-lg",
                formData.isAdminOnly
                  ? "border-amber-500/50 bg-amber-500/10 shadow-amber-500/10"
                  : "border-white/20 bg-white/5 hover:border-white/30 hover:bg-white/10"
              )}
              onClick={() => setFormData(prev => ({ ...prev, isAdminOnly: !prev.isAdminOnly }))}
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full transition-colors",
                  formData.isAdminOnly ? "bg-amber-500/20 text-amber-400" : "bg-white/10 text-white/40"
                )}>
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className={cn("text-sm font-bold", formData.isAdminOnly ? "text-amber-400" : "text-white/90")}>
                    管理员专用
                  </p>
                  <p className="text-xs text-white/50 mt-0.5">仅 Admin 角色可见</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 opacity-50 cursor-not-allowed">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white/40">
                  <LayoutGrid className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold text-white/80">UI 配置</p>
                  <p className="text-xs text-white/40 mt-0.5">暂不支持自定义</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-rose-500/10 p-4 text-sm text-rose-300 border border-rose-500/20 flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-rose-400 animate-pulse" />
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-4 pt-6 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            onClick={handleBack}
            className="text-white/60 hover:text-white hover:bg-white/10 rounded-xl h-10 px-4"
            disabled={submitting}
          >
            取消
          </Button>
          <Button
            type="submit"
            className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 shadow-lg shadow-cyan-500/20 border-none rounded-xl h-10 px-6"
            disabled={submitting}
          >
            {submitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            保存更改
          </Button>
        </div>
      </form>
    </div>
  );
}
