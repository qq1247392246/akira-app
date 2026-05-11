"use client";

import { useCallback, useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Check, Loader2, Pencil, X } from "lucide-react";
import type { PortalUser } from "@/data/mock";
import { uploadMedia, updateProfile } from "@/lib/api";
import { useSession } from "@/components/session-provider";

type ProfileSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: PortalUser;
  isAuthenticated: boolean;
  sessionLoading: boolean;
  onRequestAuth: () => void;
  onLogout: () => void;
};

type AvatarDraft = {
  file: File;
  previewUrl: string;
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
  const { user: sessionUser, setUser: setSessionUser } = useSession();
  const [draftName, setDraftName] = useState(user.displayName);
  const [editingName, setEditingName] = useState(false);
  const [nameSaving, setNameSaving] = useState(false);
  const [signatureDraft, setSignatureDraft] = useState(user.signature ?? "");
  const [signatureSaving, setSignatureSaving] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [avatarDraft, setAvatarDraft] = useState<AvatarDraft | null>(null);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [signatureEditing, setSignatureEditing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDraftName(user.displayName);
    setSignatureDraft(user.signature ?? "");
  }, [user.displayName, user.signature]);

  const isEditable = isAuthenticated && Boolean(sessionUser);

  const handlePrimary = () => {
    if (isAuthenticated) {
      onLogout();
    } else {
      onRequestAuth();
    }
  };

  const ensureAuth = () => {
    if (!sessionUser) {
      onRequestAuth();
      return false;
    }
    return true;
  };

  const syncSession = (updated: {
    username: string;
    role: number;
    display_name: string;
    avatar_url: string | null;
    signature: string | null;
  }) => {
    if (!sessionUser) return;
    setSessionUser({
      ...sessionUser,
      username: updated.username,
      role: updated.role,
      displayName: updated.display_name,
      avatarUrl: updated.avatar_url ?? undefined,
      signature: updated.signature ?? undefined,
    });
  };

  const handleSaveName = async () => {
    if (!ensureAuth()) return;
    const trimmed = draftName.trim();
    if (!trimmed || trimmed === sessionUser?.displayName) {
      setEditingName(false);
      setDraftName(sessionUser?.displayName ?? user.displayName);
      return;
    }
    setNameSaving(true);
    setProfileError(null);
    try {
      const updated = await updateProfile({ userId: sessionUser!.id, displayName: trimmed });
      syncSession(updated);
      setEditingName(false);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "昵称更新失败");
    } finally {
      setNameSaving(false);
    }
  };

  const handleSignatureBlur = async () => {
    if (!ensureAuth()) return;
    setSignatureEditing(false);
    const trimmed = signatureDraft.trim();
    if (trimmed === (sessionUser?.signature ?? "")) return;
    setSignatureSaving(true);
    setProfileError(null);
    try {
      const updated = await updateProfile({ userId: sessionUser!.id, signature: trimmed });
      syncSession(updated);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "签名更新失败");
      setSignatureDraft(sessionUser?.signature ?? "");
    } finally {
      setSignatureSaving(false);
    }
  };

  const handleAvatarClick = () => {
    if (!ensureAuth()) return;
    fileInputRef.current?.click();
  };

  const handleAvatarSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setProfileError("请选择图片文件");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setAvatarDraft({ file, previewUrl });
  };

  const closeAvatarDraft = () => {
    if (avatarDraft?.previewUrl) {
      URL.revokeObjectURL(avatarDraft.previewUrl);
    }
    setAvatarDraft(null);
  };

  const handleAvatarConfirm = async (offsetX: number, offsetY: number) => {
    if (!sessionUser || !avatarDraft) return;
    setAvatarSaving(true);
    setProfileError(null);
    try {
      let uploadFile: File = avatarDraft.file;
      try {
        uploadFile = await cropAvatarFile(avatarDraft.file, offsetX, offsetY);
      } catch (cropError) {
        console.error("头像裁剪失败，改用原图上传", cropError);
        setProfileError("头像裁剪失败，已直接上传原图");
      }
      const { url } = await uploadMedia(uploadFile);
      const updated = await updateProfile({ userId: sessionUser.id, avatarUrl: url });
      syncSession(updated);
    } catch (error) {
      setProfileError(error instanceof Error ? error.message : "头像更新失败");
    } finally {
      closeAvatarDraft();
      setAvatarSaving(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="sketch-sheet-scope w-full border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-card-rgb)/0.96)] p-0 text-foreground shadow-[0_18px_32px_rgb(var(--ink-rgb)/0.12)] sm:max-w-md"
        >
          <SheetHeader className="items-start border-b-2 border-[rgb(var(--ink-rgb)/0.1)] px-6 py-5 text-left">
            <SheetTitle className="text-2xl font-semibold">个人设置</SheetTitle>
            <SheetDescription className="text-sm leading-6 text-muted-foreground">
              修改昵称、头像和签名，随时保持个人形象。
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
            <div className="flex items-center gap-5 rounded-[1.6rem] border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.82)] p-5 shadow-[0_5px_0_rgb(var(--ink-rgb)/0.04)]">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="group relative flex h-24 w-24 items-center justify-center rounded-[1.7rem] shadow-sm"
                  disabled={!isEditable || avatarSaving}
                >
                  <Avatar className="h-24 w-24 rounded-[1.7rem] border-2 border-[rgb(var(--ink-rgb)/0.14)] transition group-hover:ring-4 group-hover:ring-[rgb(var(--accent-coral-rgb)/0.18)]">
                    <AvatarImage src={(sessionUser?.avatarUrl ?? user.avatarUrl) || undefined} />
                    <AvatarFallback className="bg-[rgb(var(--accent-butter-rgb)/0.28)] text-xl font-semibold text-foreground">{user.displayName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-[1.7rem] bg-[rgb(var(--ink-rgb)/0.58)] text-xs text-[rgb(var(--paper-soft-rgb))] opacity-0 transition backdrop-blur-sm group-hover:opacity-100">
                    <Pencil className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-semibold tracking-widest">更换</span>
                  </div>
                  {avatarSaving && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-[1.7rem] bg-[rgb(var(--ink-rgb)/0.58)] backdrop-blur-sm">
                      <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--paper-soft-rgb))]" />
                    </div>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarSelected}
                />
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-center gap-2">
                  {editingName ? (
                    <div className="flex w-full items-center gap-2">
                      <Input
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        autoFocus
                        maxLength={20}
                        className="font-medium"
                        disabled={nameSaving}
                      />
                      <Button
                        size="icon"
                        className="h-9 w-9"
                        onClick={handleSaveName}
                        disabled={nameSaving || !draftName.trim()}
                      >
                        {nameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
                        onClick={() => {
                          setEditingName(false);
                          setDraftName(sessionUser?.displayName ?? user.displayName);
                        }}
                        disabled={nameSaving}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <p className="text-xl font-semibold">{sessionUser?.displayName ?? user.displayName}</p>
                      {isEditable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
                          onClick={() => {
                            setEditingName(true);
                            setDraftName(sessionUser?.displayName ?? user.displayName);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <p className="text-sm font-medium text-muted-foreground">@{sessionUser?.username ?? user.username}</p>
                <Badge className="border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--accent-butter-rgb)/0.2)] text-xs uppercase tracking-[0.16em] text-foreground shadow-none">
                  {user.role === "admin" ? "管理员" : "普通用户"}
                </Badge>
              </div>
            </div>

            {profileError && (
              <div className="rounded-[1.2rem] border-2 border-[rgb(var(--accent-coral-rgb)/0.32)] bg-[rgb(var(--accent-coral-rgb)/0.12)] px-4 py-3 text-sm font-medium text-foreground shadow-sm">
                {profileError}
              </div>
            )}

            <div className="space-y-3 rounded-[1.6rem] border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.78)] p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.24em] text-[rgb(var(--ink-muted-rgb))]">
                <span>签名</span>
                {signatureSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-[rgb(var(--accent-coral-rgb))]" />}
              </div>
              <Textarea
                value={signatureDraft}
                onChange={(event) => setSignatureDraft(event.target.value)}
                onFocus={() => isEditable && setSignatureEditing(true)}
                onBlur={handleSignatureBlur}
                readOnly={!isEditable}
                placeholder="写下一句心情或座右铭..."
                className="min-h-[100px] resize-none text-sm font-medium leading-relaxed"
              />
              {!isEditable && <p className="text-xs font-medium text-muted-foreground">登录后即可编辑签名。</p>}
              {signatureEditing && isEditable && (
                <p className="text-xs font-medium text-[rgb(var(--accent-coral-rgb))]">点击其他区域会自动保存签名。</p>
              )}
            </div>

            <div className="grid gap-4 rounded-[1.6rem] border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.78)] p-5 text-sm text-muted-foreground shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium">日记数量</span>
                <span className="text-lg font-semibold text-foreground">{user.metricSummary.entries}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">系统 Uptime</span>
                <span className="text-lg font-semibold text-foreground">{user.metricSummary.uptime}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-medium">邀请名额</span>
                <span className="text-lg font-semibold text-foreground">{user.metricSummary.invites}</span>
              </div>
            </div>
          </div>
          <SheetFooter className="border-t-2 border-[rgb(var(--ink-rgb)/0.1)] px-6 py-5">
            <Button
              className="h-11 w-full text-base font-semibold"
              onClick={handlePrimary}
              disabled={sessionLoading}
            >
              {isAuthenticated ? "退出登录" : "立即登录"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {avatarDraft && (
        <AvatarEditorDialog
          key={avatarDraft.previewUrl}
          draft={avatarDraft}
          onCancel={closeAvatarDraft}
          onConfirm={handleAvatarConfirm}
        />
      )}
    </>
  );
}

function AvatarEditorDialog({
  draft,
  onCancel,
  onConfirm,
}: {
  draft: AvatarDraft;
  onCancel: () => void;
  onConfirm: (offsetX: number, offsetY: number) => void;
}) {
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const clampOffset = useCallback((value: number) => Math.max(-100, Math.min(100, value)), []);

  const updateOffsetFromPointer = useCallback((event: PointerEvent | ReactPointerEvent) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width - 0.5) * 200;
    const relativeY = ((event.clientY - rect.top) / rect.height - 0.5) * 200;
    setOffsetX(clampOffset(relativeX));
    setOffsetY(clampOffset(relativeY));
  }, [clampOffset]);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!draggingRef.current) return;
    event.preventDefault();
    updateOffsetFromPointer(event);
  }, [updateOffsetFromPointer]);

  const handlePointerUp = useCallback(() => {
    draggingRef.current = false;
    window.removeEventListener("pointermove", handlePointerMove);
  }, [handlePointerMove]);

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    updateOffsetFromPointer(event);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp, { once: true });
  }, [handlePointerMove, handlePointerUp, updateOffsetFromPointer]);

  useEffect(() => {
    return () => {
      draggingRef.current = false;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [handlePointerMove, handlePointerUp]);

  return (
    <div className="sketch-sheet-scope fixed inset-0 z-[1200] flex items-center justify-center bg-[rgb(var(--ink-rgb)/0.14)] px-4 py-6 text-foreground backdrop-blur-sm">
      <div className="paper-texture w-full max-w-md rounded-[1.8rem] border-2 border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-card-rgb)/0.97)] p-6 shadow-[0_18px_36px_rgb(var(--ink-rgb)/0.14)] sm:p-8">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">调整头像</h3>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full p-1 text-[rgb(var(--ink-muted-rgb))] transition-colors hover:bg-[rgb(var(--paper-soft-rgb)/0.8)] hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        <p className="mt-2 text-sm font-medium text-muted-foreground">拖动滑块微调位置，系统会自动裁剪为正方形。</p>
        <div className="mt-8 flex items-center justify-center">
          <div
            ref={previewRef}
            className="relative h-64 w-64 cursor-grab select-none overflow-hidden rounded-[2rem] border-4 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-soft-rgb)/0.84)] shadow-inner"
            style={{ touchAction: "none" }}
            onPointerDown={handlePointerDown}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={draft.previewUrl}
              alt="头像预览"
              className="h-full w-full object-cover transition"
              style={{
                objectPosition: `${50 + offsetX * 0.4}% ${50 + offsetY * 0.4}%`,
              }}
            />
          </div>
        </div>
        <div className="mt-8 space-y-6 text-sm font-medium text-muted-foreground">
          <label className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink-muted-rgb))]">水平位置</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={offsetX}
              onChange={(event) => setOffsetX(Number(event.target.value))}
              className="h-2 w-full cursor-pointer rounded-full bg-[rgb(var(--ink-rgb)/0.1)] accent-[rgb(var(--accent-coral-rgb))] transition-colors hover:bg-[rgb(var(--ink-rgb)/0.16)]"
            />
          </label>
          <label className="flex flex-col gap-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[rgb(var(--ink-muted-rgb))]">垂直位置</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={offsetY}
              onChange={(event) => setOffsetY(Number(event.target.value))}
              className="h-2 w-full cursor-pointer rounded-full bg-[rgb(var(--ink-rgb)/0.1)] accent-[rgb(var(--accent-coral-rgb))] transition-colors hover:bg-[rgb(var(--ink-rgb)/0.16)]"
            />
          </label>
        </div>
        <div className="mt-8 flex justify-end gap-4">
          <Button variant="ghost" className="font-semibold text-[rgb(var(--ink-muted-rgb))] hover:text-foreground" onClick={onCancel}>
            取消
          </Button>
          <Button
            className="px-6 font-semibold"
            onClick={() => onConfirm(offsetX, offsetY)}
          >
            确认裁剪
          </Button>
        </div>
      </div>
    </div>
  );
}

async function cropAvatarFile(file: File, offsetX: number, offsetY: number): Promise<File> {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const size = Math.min(image.width, image.height);
  const extraX = image.width - size;
  const extraY = image.height - size;
  const normalizedX = (offsetX + 100) / 200;
  const normalizedY = (offsetY + 100) / 200;
  const startX = extraX * normalizedX;
  const startY = extraY * normalizedY;

  const canvas = document.createElement("canvas");
  const targetSize = 512;
  canvas.width = targetSize;
  canvas.height = targetSize;

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("无法创建画布上下文");
  }

  ctx.drawImage(image, startX, startY, size, size, 0, 0, targetSize, targetSize);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) {
        resolve(result);
      } else {
        reject(new Error("裁剪失败"));
      }
    }, "image/jpeg", 0.95);
  });

  return new File([blob], `avatar-${Date.now()}.jpg`, { type: blob.type });
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("无法读取文件"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("无法加载图片"));
    image.src = src;
  });
}
