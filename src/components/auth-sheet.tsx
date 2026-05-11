"use client";

import { useEffect, useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useSession, type SessionUser } from "@/components/session-provider";
import { Separator } from "@/components/ui/separator";

const initialForm = {
  username: "",
  password: "",
  displayName: "",
  signature: "",
};

type Mode = "login" | "register";

type AuthResponse = {
  user?: SessionUser | null;
  message?: string;
  error?: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function AuthSheet({ open, onOpenChange }: Props) {
  const { setUser } = useSession();
  const [mode, setMode] = useState<Mode>("login");
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"default" | "success" | "error">("default");

  useEffect(() => {
    if (!open) {
      setMode("login");
      setForm(initialForm);
      setMessage(null);
      setMessageTone("default");
    }
  }, [open]);

  const isLoginMode = mode === "login";
  const actionLabel = useMemo(() => (isLoginMode ? "登录" : "提交注册"), [isLoginMode]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setMessageTone("default");
    setSubmitting(true);

    try {
      const endpoint = isLoginMode ? "/api/auth/login" : "/api/auth/register";
      const payload = isLoginMode
        ? {
            username: form.username.trim(),
            password: form.password,
          }
        : {
            username: form.username.trim(),
            password: form.password,
            displayName: form.displayName.trim(),
            signature: form.signature.trim() || null,
          };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await response.json().catch(() => ({}))) as AuthResponse;

      if (!response.ok) {
        setMessage(data.error ?? "操作失败，请稍后重试。");
        setMessageTone("error");
        return;
      }

      if (isLoginMode && data.user) {
        setUser(data.user);
        setMessage("登录成功，正在回到主页。");
        setMessageTone("success");
        setTimeout(() => {
          onOpenChange(false);
        }, 500);
      } else {
        setMessage(data.message ?? "注册申请已提交，等待管理员审批。");
        setMessageTone("success");
        setForm((current) => ({ ...current, password: "" }));
      }
    } catch (error) {
      console.error(error);
      setMessage("请求异常，请检查网络连接。");
      setMessageTone("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sketch-sheet-scope w-full max-w-md border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-card-rgb)/0.96)] p-0 shadow-[0_18px_32px_rgb(var(--ink-rgb)/0.12)]"
      >
        <div className="paper-texture flex h-full flex-col">
          <SheetHeader className="border-b-2 border-[rgb(var(--ink-rgb)/0.12)] px-6 py-6 text-left">
            <div className="inline-flex w-fit rounded-full border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--accent-rose-rgb)/0.2)] px-3 py-1 text-[11px] uppercase tracking-[0.28em] text-foreground">
              {isLoginMode ? "账号登录" : "提交申请"}
            </div>
            <SheetTitle className="pt-3 text-3xl font-semibold">{isLoginMode ? "欢迎回来" : "申请加入"}</SheetTitle>
            <SheetDescription className="max-w-sm text-sm leading-7">
              {isLoginMode
                ? "输入用户名与密码即可进入你的手帐式入口台。"
                : "填写基础资料，提交后由管理员审核，审核通过后可进入完整编辑区。"}
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleSubmit} className="flex-1 space-y-5 px-6 py-6">
            <div className="space-y-2">
              <Label htmlFor="username">用户名</Label>
              <Input
                id="username"
                name="username"
                value={form.username}
                onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
                placeholder="请输入用户名"
                required
              />
            </div>

            {!isLoginMode && (
              <div className="space-y-2">
                <Label htmlFor="displayName">昵称</Label>
                <Input
                  id="displayName"
                  name="displayName"
                  value={form.displayName}
                  onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                  placeholder="用于展示的名字"
                  required
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
                placeholder="请输入密码"
                required
              />
            </div>

            {!isLoginMode && (
              <div className="space-y-2">
                <Label htmlFor="signature">个性签名（可选）</Label>
                <Input
                  id="signature"
                  name="signature"
                  value={form.signature}
                  onChange={(event) => setForm((prev) => ({ ...prev, signature: event.target.value }))}
                  placeholder="展示在主页顶部的小句子"
                />
              </div>
            )}

            <div className="rounded-[1.6rem] border-2 border-dashed border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.72)] px-4 py-4 text-sm leading-7 text-muted-foreground">
              {isLoginMode ? "游客也能浏览内容，但登录后才会同步个人头像、签名与管理入口。" : "当前注册是轻量审批流，仅需提交基础信息即可，审核通过后自动拥有普通用户权限。"}
            </div>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "处理中..." : actionLabel}
            </Button>

            {message && (
              <p
                className={
                  messageTone === "error"
                    ? "rounded-[1.2rem] border-2 border-[rgb(var(--accent-coral-rgb)/0.3)] bg-[rgb(var(--accent-coral-rgb)/0.12)] px-4 py-3 text-sm text-foreground"
                    : "rounded-[1.2rem] border-2 border-[rgb(var(--accent-sage-rgb)/0.36)] bg-[rgb(var(--accent-sage-rgb)/0.16)] px-4 py-3 text-sm text-foreground"
                }
              >
                {message}
              </p>
            )}
          </form>

          <Separator className="bg-[rgb(var(--ink-rgb)/0.12)]" />
          <div className="px-6 py-5 text-sm text-muted-foreground">
            {isLoginMode ? "还没有账号？" : "已经提交申请？"}
            <button
              type="button"
              className="ml-2 font-medium text-foreground underline-offset-4 hover:underline"
              onClick={() => setMode(isLoginMode ? "register" : "login")}
            >
              {isLoginMode ? "申请注册" : "切换到登录"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
