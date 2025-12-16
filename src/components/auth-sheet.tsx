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
        setMessage(data.error ?? "操作失败，请稍后重试");
        setMessageTone("error");
        return;
      }

      if (isLoginMode && data.user) {
        setUser(data.user);
        setMessage("登录成功");
        setMessageTone("success");
        setTimeout(() => {
          onOpenChange(false);
        }, 500);
      } else {
        setMessage(data.message ?? "注册申请已提交，等待管理员审批");
        setMessageTone("success");
        setForm((current) => ({ ...current, password: "" }));
      }
    } catch (error) {
      console.error(error);
      setMessage("请求异常，请检查网络");
      setMessageTone("error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full max-w-md bg-[#050916] text-white">
        <SheetHeader className="text-left">
          <SheetTitle className="text-2xl">{isLoginMode ? "登录" : "申请注册"}</SheetTitle>
          <SheetDescription className="text-white/70">
            {isLoginMode ? "输入用户名与密码进入主控台" : "填写基本信息，提交后等待管理员审核"}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={handleSubmit} className="space-y-4 p-4 pt-0">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-white/80">
              用户名
            </Label>
            <Input
              id="username"
              name="username"
              value={form.username}
              onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
              placeholder="请输入用户名"
              className="bg-white/10 text-white placeholder:text-white/40"
              required
            />
          </div>
          {!isLoginMode && (
            <div className="space-y-2">
              <Label htmlFor="displayName" className="text-white/80">
                昵称
              </Label>
              <Input
                id="displayName"
                name="displayName"
                value={form.displayName}
                onChange={(event) => setForm((prev) => ({ ...prev, displayName: event.target.value }))}
                placeholder="用于展示的名字"
                className="bg-white/10 text-white placeholder:text-white/40"
                required
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="password" className="text-white/80">
              密码
            </Label>
            <Input
              id="password"
              name="password"
              type="password"
              value={form.password}
              onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
              placeholder="请输入密码"
              className="bg-white/10 text-white placeholder:text-white/40"
              required
            />
          </div>
          {!isLoginMode && (
            <div className="space-y-2">
              <Label htmlFor="signature" className="text-white/80">
                个性签名（可选）
              </Label>
              <Input
                id="signature"
                name="signature"
                value={form.signature}
                onChange={(event) => setForm((prev) => ({ ...prev, signature: event.target.value }))}
                placeholder="展示在主控台顶部"
                className="bg-white/10 text-white placeholder:text-white/40"
              />
            </div>
          )}
          <Button type="submit" className="w-full bg-white/20 text-white hover:bg-white/30" disabled={submitting}>
            {submitting ? "处理中..." : actionLabel}
          </Button>
          {message && (
            <p className={messageTone === "error" ? "text-red-400" : "text-emerald-300"}>{message}</p>
          )}
        </form>
        <Separator className="border-white/10" />
        <div className="p-4 pt-0 text-sm text-white/70">
          {isLoginMode ? "还没有账号？" : "已经提交申请？"}
          <button
            type="button"
            className="ml-2 underline"
            onClick={() => setMode(isLoginMode ? "register" : "login")}
          >
            {isLoginMode ? "申请注册" : "切换到登录"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}




