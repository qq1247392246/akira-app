"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeft,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  Save,
  Shield,
  Trash2,
} from "lucide-react";
import { PortalCard } from "@/data/mock";
import { useSession } from "@/components/session-provider";
import { createCard, deleteCard, fetchCards, updateCard } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    slug: "",
    title: "",
    description: "",
    isAdminOnly: false,
    orderIndex: 0,
  });

  const loadCards = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchCards();
      setCards(data);
    } catch (err) {
      console.error("Failed to load cards:", err);
      setError("卡片列表加载失败，请稍后重试。");
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
    setSelectedCard(null);
    setError(null);
    setView("create");
  };

  const handleEditClick = (card: PortalCard) => {
    setSelectedCard(card);
    setFormData({
      slug: card.id,
      title: card.title,
      description: card.description,
      isAdminOnly: card.adminOnly || false,
      orderIndex: 0,
    });
    setError(null);
    setView("edit");
  };

  const handleBack = () => {
    setView("list");
    setSelectedCard(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!sessionUser) return;

    try {
      setSubmitting(true);
      setError(null);

      if (view === "create") {
        await createCard({
          slug: formData.slug,
          title: formData.title,
          description: formData.description,
          is_admin_only: formData.isAdminOnly,
          order_index: formData.orderIndex,
          authorId: sessionUser.id,
        });
      } else if (selectedCard) {
        await updateCard(selectedCard.id, {
          title: formData.title,
          description: formData.description,
          is_admin_only: formData.isAdminOnly,
          order_index: formData.orderIndex,
          authorId: sessionUser.id,
        });
      }

      await loadCards();
      onUpdate?.();
      setView("list");
    } catch (err: unknown) {
      console.error("Operation failed:", err);
      setError(err instanceof Error ? err.message : "保存失败，请稍后重试。");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (card: PortalCard) => {
    if (!sessionUser || !confirm(`确定删除卡片“${card.title}”吗？此操作不可撤销。`)) return;

    try {
      setLoading(true);
      await deleteCard(card.id, sessionUser.id);
      await loadCards();
      onUpdate?.();
    } catch (err: unknown) {
      console.error("Delete failed:", err);
      const errorMessage = err instanceof Error ? err.message : "未知错误";
      alert(`删除失败：${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  if (loading && view === "list" && cards.length === 0) {
    return (
      <div className="flex h-full items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[rgb(var(--ink-muted-rgb))]" />
      </div>
    );
  }

  if (view === "list") {
    return (
      <div className="flex h-full flex-col space-y-6">
        <section className="sketch-surface sketch-wash paper-texture space-y-3 p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="font-display text-xs uppercase tracking-[0.35em] text-[rgb(var(--ink-muted-rgb))]">
                Card Registry
              </p>
              <h3 className="font-display text-3xl text-foreground">卡片管理</h3>
              <p className="max-w-2xl text-sm leading-7 text-[rgb(var(--ink-muted-rgb))]">
                维护首页卡片的标题与说明，保持入口信息清楚，不扩散到更复杂的后台配置。
              </p>
            </div>
            <Button size="sm" className="gap-2 rounded-full px-4" onClick={handleCreateClick}>
              <Plus className="h-4 w-4" />
              新建卡片
            </Button>
          </div>
        </section>

        {error ? (
          <div className="rounded-[1.4rem] border-2 border-[rgb(var(--accent-coral-rgb)/0.3)] bg-[rgb(var(--accent-coral-rgb)/0.12)] px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        ) : null}

        <ScrollArea className="flex-1 -mr-4 pr-4">
          <div className="space-y-4 pb-4">
            {cards.map((card) => (
              <Card
                key={card.id}
                className="group sketch-surface paper-texture border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.9)] p-5"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-lg font-semibold text-foreground">{card.title}</h4>
                      {card.adminOnly ? (
                        <Badge
                          variant="outline"
                          className="rounded-full border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--accent-butter-rgb)/0.18)] text-[10px] uppercase tracking-[0.2em] text-foreground"
                        >
                          Admin
                        </Badge>
                      ) : null}
                    </div>
                    <p className="sketch-pill inline-flex px-3 py-1 font-mono text-xs text-[rgb(var(--ink-muted-rgb))]">
                      {card.id}
                    </p>
                    <p className="max-w-2xl text-sm leading-7 text-[rgb(var(--ink-muted-rgb))]">
                      {card.description}
                    </p>
                  </div>

                  <div className="flex gap-2 opacity-100 transition md:opacity-0 md:group-hover:opacity-100">
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-full"
                      onClick={() => handleEditClick(card)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="outline"
                      className="rounded-full border-[rgb(var(--accent-coral-rgb)/0.3)] text-[rgb(var(--accent-coral-rgb))] hover:bg-[rgb(var(--accent-coral-rgb)/0.12)]"
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

  return (
    <div className="flex h-full flex-col space-y-6">
      <div className="flex items-center gap-3 border-b border-[rgb(var(--ink-rgb)/0.1)] pb-4">
        <Button variant="outline" size="icon" className="rounded-full" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <p className="font-display text-2xl text-foreground">
            {view === "create" ? "新建卡片" : "编辑卡片"}
          </p>
          <p className="text-sm text-[rgb(var(--ink-muted-rgb))]">
            只修改标题、描述与权限信息，保持现有卡片行为不变。
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 space-y-6 overflow-y-auto pr-2">
        <div className="sketch-surface paper-texture space-y-5 p-5">
          <div className="space-y-2">
            <Label htmlFor="slug">卡片标识</Label>
            <Input
              id="slug"
              value={formData.slug}
              onChange={(event) => setFormData((prev) => ({ ...prev, slug: event.target.value }))}
              disabled={view === "edit"}
              placeholder="my-new-card"
              required
              pattern="[a-z0-9-]+"
              title="仅允许小写字母、数字和连字符"
            />
            {view === "create" ? (
              <p className="text-xs text-[rgb(var(--ink-muted-rgb))]">
                创建后该标识会作为固定键值使用，不建议再改动。
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="title">标题</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(event) => setFormData((prev) => ({ ...prev, title: event.target.value }))}
              placeholder="卡片标题"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">描述</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
              placeholder="简短描述这个卡片的作用"
              className="min-h-[120px] resize-none"
              required
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <button
              type="button"
              className={cn(
                "rounded-[1.4rem] border-2 p-5 text-left transition",
                formData.isAdminOnly
                  ? "border-[rgb(var(--accent-butter-rgb)/0.5)] bg-[rgb(var(--accent-butter-rgb)/0.18)]"
                  : "border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.82)]"
              )}
              onClick={() =>
                setFormData((prev) => ({ ...prev, isAdminOnly: !prev.isAdminOnly }))
              }
            >
              <div className="flex items-center gap-4">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border-2",
                    formData.isAdminOnly
                      ? "border-[rgb(var(--accent-butter-rgb)/0.6)] bg-[rgb(var(--accent-butter-rgb)/0.22)]"
                      : "border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-card-rgb)/0.84)]"
                  )}
                >
                  <Shield className="h-5 w-5 text-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">仅管理员可见</p>
                  <p className="text-xs text-[rgb(var(--ink-muted-rgb))]">
                    用于审核、系统设置等内部入口。
                  </p>
                </div>
              </div>
            </button>

            <div className="rounded-[1.4rem] border-2 border-dashed border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.76)] p-5 opacity-80">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-card-rgb)/0.84)]">
                  <LayoutGrid className="h-5 w-5 text-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">布局参数</p>
                  <p className="text-xs text-[rgb(var(--ink-muted-rgb))]">
                    当前版本不开放卡片布局自定义，避免破坏首页节奏。
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <div className="rounded-[1.2rem] border-2 border-[rgb(var(--accent-coral-rgb)/0.32)] bg-[rgb(var(--accent-coral-rgb)/0.12)] px-4 py-3 text-sm text-foreground">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-3 border-t border-[rgb(var(--ink-rgb)/0.1)] pt-5">
          <Button type="button" variant="outline" onClick={handleBack} disabled={submitting}>
            取消
          </Button>
          <Button type="submit" className="gap-2" disabled={submitting}>
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            保存
          </Button>
        </div>
      </form>
    </div>
  );
}
