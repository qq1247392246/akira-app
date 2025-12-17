"use client";

import { useEffect, useRef, useState, type ChangeEvent, type PointerEvent as ReactPointerEvent } from "react";
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
          className="w-full border-white/10 bg-[#040814]/95 p-0 text-white sm:max-w-md"
        >
          <SheetHeader className="items-start border-b border-white/10 px-6 py-4 text-left">
            <SheetTitle>个人设置</SheetTitle>
            <SheetDescription className="text-white/60">
              修改昵称、头像和签名，随时保持个人形象。
            </SheetDescription>
          </SheetHeader>
          <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="relative">
                <button
                  type="button"
                  onClick={handleAvatarClick}
                  className="group relative flex h-20 w-20 items-center justify-center rounded-full"
                  disabled={!isEditable || avatarSaving}
                >
                  <Avatar className="h-20 w-20 border border-white/10 transition group-hover:ring-2 group-hover:ring-cyan-400/60">
                    <AvatarImage src={sessionUser?.avatarUrl ?? user.avatarUrl} />
                    <AvatarFallback>{user.displayName.slice(0, 2)}</AvatarFallback>
                  </Avatar>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/70 text-xs text-white opacity-0 transition group-hover:opacity-100">
                    <Pencil className="h-4 w-4" />
                    <span className="mt-1 text-[10px] tracking-[0.3em]">更换头像</span>
                  </div>
                  {avatarSaving && (
                    <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/70">
                      <Loader2 className="h-5 w-5 animate-spin" />
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
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  {editingName ? (
                    <div className="flex w-full items-center gap-2">
                      <Input
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        autoFocus
                        maxLength={20}
                        className="border-white/20 bg-black/40 text-white placeholder:text-white/40"
                        disabled={nameSaving}
                      />
                      <Button
                        size="icon"
                        className="h-9 w-9 bg-cyan-500/80 text-white hover:bg-cyan-500"
                        onClick={handleSaveName}
                        disabled={nameSaving || !draftName.trim()}
                      >
                        {nameSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 text-white/60 hover:text-white"
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
                      <p className="text-lg font-semibold">{sessionUser?.displayName ?? user.displayName}</p>
                      {isEditable && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-white/60 hover:text-white"
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
                <p className="text-sm text-white/60">@{sessionUser?.username ?? user.username}</p>
                <Badge className="bg-black/50 text-xs uppercase tracking-[0.3em] text-white/60">
                  {user.role === "admin" ? "管理员" : "普通用户"}
                </Badge>
              </div>
            </div>

            {profileError && (
              <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                {profileError}
              </div>
            )}

            <div className="space-y-3 rounded-2xl border border-white/10 bg-black/30 p-4">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.4em] text-white/40">
                <span>签名</span>
                {signatureSaving && <Loader2 className="h-3.5 w-3.5 animate-spin text-white/50" />}
              </div>
              <Textarea
                value={signatureDraft}
                onChange={(event) => setSignatureDraft(event.target.value)}
                onFocus={() => isEditable && setSignatureEditing(true)}
                onBlur={handleSignatureBlur}
                readOnly={!isEditable}
                placeholder="写下一句心情或座右铭..."
                className="min-h-[90px] resize-none border-white/10 bg-black/40 text-sm text-white placeholder:text-white/40 focus-visible:ring-cyan-500/50"
              />
              {!isEditable && <p className="text-xs text-white/40">登录后即可编辑签名。</p>}
              {signatureEditing && isEditable && (
                <p className="text-xs text-white/50">点击其他区域会自动保存签名。</p>
              )}
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

      {avatarDraft && (
        <AvatarEditorDialog
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

  const clampOffset = (value: number) => Math.max(-100, Math.min(100, value));

  const updateOffsetFromPointer = (event: PointerEvent | ReactPointerEvent) => {
    if (!previewRef.current) return;
    const rect = previewRef.current.getBoundingClientRect();
    const relativeX = ((event.clientX - rect.left) / rect.width - 0.5) * 200;
    const relativeY = ((event.clientY - rect.top) / rect.height - 0.5) * 200;
    setOffsetX(clampOffset(relativeX));
    setOffsetY(clampOffset(relativeY));
  };

  const handlePointerMove = (event: PointerEvent) => {
    if (!draggingRef.current) return;
    event.preventDefault();
    updateOffsetFromPointer(event);
  };

  const handlePointerUp = () => {
    draggingRef.current = false;
    window.removeEventListener("pointermove", handlePointerMove);
    window.removeEventListener("pointerup", handlePointerUp);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    draggingRef.current = true;
    updateOffsetFromPointer(event);
    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  useEffect(() => {
    setOffsetX(0);
    setOffsetY(0);
  }, [draft.file]);

  useEffect(() => {
    return () => {
      draggingRef.current = false;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/70 px-4 py-6 text-white backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-white/10 bg-[#050814]/95 p-6 shadow-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">调整头像</h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-white/60 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mt-1 text-sm text-white/60">拖动滑块微调位置，系统会自动裁剪为正方形。</p>
        <div className="mt-5 flex items-center justify-center">
          <div
            ref={previewRef}
            className="relative h-56 w-56 cursor-grab select-none overflow-hidden rounded-full border border-white/20 bg-black/60"
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
        <div className="mt-6 space-y-4 text-sm">
          <label className="flex flex-col gap-2">
            <span>水平位置</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={offsetX}
              onChange={(event) => setOffsetX(Number(event.target.value))}
              className="h-1 w-full cursor-pointer rounded-full bg-white/20 accent-cyan-400"
            />
          </label>
          <label className="flex flex-col gap-2">
            <span>垂直位置</span>
            <input
              type="range"
              min={-100}
              max={100}
              value={offsetY}
              onChange={(event) => setOffsetY(Number(event.target.value))}
              className="h-1 w-full cursor-pointer rounded-full bg-white/20 accent-cyan-400"
            />
          </label>
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="ghost" className="text-white/70 hover:text-white" onClick={onCancel}>
            取消
          </Button>
          <Button
            className="bg-cyan-500/80 text-white hover:bg-cyan-500"
            onClick={() => onConfirm(offsetX, offsetY)}
          >
            确认
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
