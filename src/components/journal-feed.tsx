"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import {
  Check,
  Heart,
  ImagePlus,
  Loader2,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useSession } from "@/components/session-provider";
import {
  createComment,
  createJournal,
  deleteComment,
  deleteJournal,
  fetchComments,
  fetchFriends,
  fetchJournal,
  likeJournal,
  unlikeJournal,
  updateJournal,
  uploadMedia,
  type DbComment,
  type DbJournalPost,
} from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UserHoverCard } from "@/components/user-hover-card";
import type { FriendEntry } from "@/data/friends";
import { cn } from "@/lib/utils";

type LightboxImage = { url: string; alt?: string };

const MAX_UPLOAD_DIMENSION = 1600;
const MAX_UPLOAD_BYTES = 1.2 * 1024 * 1024;
const MAX_PARALLEL_UPLOADS = 2;
const MAX_UPLOAD_RETRIES = 3;
const MAX_MEDIA_ITEMS = 9;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function createOptimizedImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/") || file.size <= MAX_UPLOAD_BYTES) {
    return file;
  }

  const dataUrl = await readFileAsDataURL(file);
  const image = await loadImage(dataUrl);
  const maxDimension = Math.max(image.width, image.height);
  const scale = Math.min(1, MAX_UPLOAD_DIMENSION / maxDimension);

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);

  const blob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (result) => {
        if (result) resolve(result);
        else reject(new Error("图片压缩失败"));
      },
      file.type === "image/png" ? "image/png" : "image/jpeg",
      0.85
    );
  });

  if (blob.size >= file.size) {
    return file;
  }

  return new File([blob], file.name.replace(/\.(\w+)$/, "-optimized.$1"), {
    type: blob.type,
  });
}

export function JournalFeed({ onLightboxOpenChange }: { onLightboxOpenChange?: (open: boolean) => void } = {}) {
  const { user: sessionUser } = useSession();
  const [posts, setPosts] = useState<DbJournalPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [newPostContent, setNewPostContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [mediaUrlInput, setMediaUrlInput] = useState("");
  const [mediaError, setMediaError] = useState<string | null>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<LightboxImage | null>(null);
  const [friendLookup, setFriendLookup] = useState<Record<string, FriendEntry>>({});
  const observerTarget = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      onLightboxOpenChange?.(false);
    };
  }, [onLightboxOpenChange]);

  const openLightbox = useCallback(
    (image: LightboxImage) => {
      onLightboxOpenChange?.(true);
      setLightboxImage(image);
    },
    [onLightboxOpenChange]
  );

  const closeLightbox = useCallback(() => {
    setLightboxImage(null);
    onLightboxOpenChange?.(false);
  }, [onLightboxOpenChange]);

  const loadPosts = useCallback(async (cursor?: string) => {
    try {
      setLoading(true);
      const res = await fetchJournal({ limit: 10, cursor });
      if (cursor) {
        setPosts((prev) => {
          const existingIds = new Set(prev.map((post) => post.id));
          const newItems = res.items.filter((post) => !existingIds.has(post.id));
          return [...prev, ...newItems];
        });
      } else {
        setPosts(res.items);
      }
      setNextCursor(res.nextCursor);
    } catch (error) {
      console.error("Failed to load journal posts:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    let cancelled = false;

    const loadFriends = async () => {
      try {
        const items = await fetchFriends(sessionUser?.id ? { viewerId: sessionUser.id } : {});
        if (cancelled) return;
        const lookup = items.reduce<Record<string, FriendEntry>>((acc, friend) => {
          acc[friend.id] = friend;
          return acc;
        }, {});
        setFriendLookup(lookup);
      } catch (error) {
        console.error("Failed to load friend profiles:", error);
      }
    };

    loadFriends();
    return () => {
      cancelled = true;
    };
  }, [sessionUser?.id]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && nextCursor && !loading) {
          loadPosts(nextCursor);
        }
      },
      { threshold: 0.1 }
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [nextCursor, loading, loadPosts]);

  const handleCreatePost = async () => {
    if (!sessionUser || !newPostContent.trim()) return;

    try {
      setIsPosting(true);
      const newPost = await createJournal({
        authorId: sessionUser.id,
        content: newPostContent,
        visibility: "public",
        mediaUrls,
      });

      const postWithAuthor: DbJournalPost = {
        ...newPost,
        author: {
          id: sessionUser.id,
          username: sessionUser.username,
          display_name: sessionUser.displayName,
          avatar_url: sessionUser.avatarUrl ?? null,
        },
        likes: newPost.likes ?? { count: 0, user_ids: [] },
        comments_count: newPost.comments_count ?? 0,
        media:
          newPost.media ??
          mediaUrls.map((url, index) => ({
            id: `${newPost.id}-${index}`,
            url,
            position: index,
          })),
      };

      setPosts((prev) => [postWithAuthor, ...prev]);
      setNewPostContent("");
      setMediaUrls([]);
      setMediaUrlInput("");
      setMediaError(null);
    } catch (error) {
      console.error("Failed to create post:", error);
    } finally {
      setIsPosting(false);
    }
  };

  const handlePostUpdate = (updatedPost: DbJournalPost) => {
    setPosts((prev) => prev.map((post) => (post.id === updatedPost.id ? updatedPost : post)));
  };

  const handlePostDelete = (postId: string) => {
    setPosts((prev) => prev.filter((post) => post.id !== postId));
  };

  const handleAddMediaUrl = () => {
    const value = mediaUrlInput.trim();
    if (!value) return;

    try {
      const parsed = new URL(value);
      if (!parsed.protocol.startsWith("http")) {
        throw new Error("invalid");
      }
    } catch {
      setMediaError("请输入有效的图片链接");
      return;
    }

    if (mediaUrls.length >= MAX_MEDIA_ITEMS) {
      setMediaError(`最多添加 ${MAX_MEDIA_ITEMS} 张图片`);
      return;
    }

    setMediaUrls((prev) => [...prev, value]);
    setMediaUrlInput("");
    setMediaError(null);
  };

  const handleRemoveMediaUrl = (index: number) => {
    setMediaUrls((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePickLocalFiles = () => {
    if (mediaUrls.length >= MAX_MEDIA_ITEMS) {
      setMediaError(`最多添加 ${MAX_MEDIA_ITEMS} 张图片`);
      return;
    }
    fileInputRef.current?.click();
  };

  const handleLocalFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const inputEl = event.currentTarget;
    const files = inputEl.files;
    if (!files || files.length === 0) return;

    const remainingSlots = MAX_MEDIA_ITEMS - mediaUrls.length;
    if (remainingSlots <= 0) {
      setMediaError(`最多添加 ${MAX_MEDIA_ITEMS} 张图片`);
      inputEl.value = "";
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    setUploadingMedia(true);
    setMediaError(null);

    try {
      const optimizedFiles = await Promise.all(selectedFiles.map((file) => createOptimizedImage(file)));
      let currentIndex = 0;
      const failedFiles: string[] = [];

      const uploadWithRetry = async (displayName: string, file: File) => {
        let lastError: unknown = null;
        for (let attempt = 0; attempt < MAX_UPLOAD_RETRIES; attempt += 1) {
          try {
            const { url } = await uploadMedia(file);
            setMediaUrls((prev) => [...prev, url]);
            return;
          } catch (uploadError) {
            lastError = uploadError;
            if (attempt === MAX_UPLOAD_RETRIES - 1) {
              console.error(`Failed to upload ${displayName}:`, uploadError);
              throw uploadError;
            }
            await sleep(600 * (attempt + 1));
          }
        }
        throw lastError instanceof Error ? lastError : new Error("未知上传错误");
      };

      const worker = async () => {
        while (true) {
          const fileIndex = currentIndex++;
          if (fileIndex >= optimizedFiles.length) break;

          const file = optimizedFiles[fileIndex];
          const originalName = selectedFiles[fileIndex].name;
          try {
            await uploadWithRetry(originalName, file);
          } catch {
            failedFiles.push(originalName);
          }
        }
      };

      const concurrency = Math.min(MAX_PARALLEL_UPLOADS, optimizedFiles.length);
      await Promise.all(Array.from({ length: concurrency }, () => worker()));

      if (failedFiles.length > 0) {
        setMediaError(`以下文件上传失败：${failedFiles.join("、")}`);
      }
    } catch (error) {
      console.error("Failed to upload media:", error);
      setMediaError("上传失败，请稍后重试");
    } finally {
      setUploadingMedia(false);
      inputEl.value = "";
    }
  };

  const viewerFriend = sessionUser?.id ? friendLookup[sessionUser.id] : undefined;

  return (
    <div className="flex h-full flex-col space-y-6">
      {sessionUser ? (
        <div className="sketch-surface sketch-wash paper-texture space-y-4 p-6">
          <div className="flex gap-4">
            <UserHoverCard
              friend={viewerFriend}
              author={{
                id: sessionUser.id,
                username: sessionUser.username,
                display_name: sessionUser.displayName,
                avatar_url: sessionUser.avatarUrl ?? null,
                signature: sessionUser.signature ?? null,
              }}
            >
              <Avatar className="h-10 w-10 border-2 border-[rgb(var(--ink-rgb)/0.12)]">
                <AvatarImage src={sessionUser.avatarUrl || undefined} />
                <AvatarFallback>{sessionUser.displayName.slice(0, 2)}</AvatarFallback>
              </Avatar>
            </UserHoverCard>

            <div className="flex-1 space-y-4">
              <Textarea
                placeholder="写下一条近况、念头或今天想留住的片段"
                value={newPostContent}
                onChange={(event) => setNewPostContent(event.target.value)}
                className="min-h-[100px] resize-none rounded-2xl text-sm"
              />

              <div className="space-y-3 rounded-2xl border-2 border-dashed border-[rgb(var(--ink-rgb)/0.16)] bg-[rgb(var(--paper-soft-rgb)/0.82)] p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    type="url"
                    placeholder="粘贴图片链接"
                    value={mediaUrlInput}
                    onChange={(event) => setMediaUrlInput(event.target.value)}
                    className="rounded-xl text-sm"
                  />
                  <Button type="button" variant="outline" className="shrink-0 rounded-xl" onClick={handleAddMediaUrl}>
                    <ImagePlus className="mr-2 h-4 w-4" />
                    添加链接
                  </Button>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleLocalFilesSelected}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    className="rounded-xl border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-card-rgb)/0.85)] text-foreground hover:bg-[rgb(var(--paper-card-rgb)/0.95)]"
                    onClick={handlePickLocalFiles}
                    disabled={uploadingMedia}
                  >
                    {uploadingMedia ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="mr-2 h-4 w-4" />
                    )}
                    {uploadingMedia ? "上传中…" : "上传本地图片"}
                  </Button>
                  <p className="text-xs text-[rgb(var(--ink-muted-rgb))]">支持 png / jpg / webp</p>
                </div>

                {mediaError ? (
                  <p className="text-xs text-[rgb(var(--accent-coral-rgb))]">{mediaError}</p>
                ) : null}

                {mediaUrls.length > 0 ? (
                  <div className="grid grid-cols-3 gap-3 pt-2 sm:grid-cols-4">
                    {mediaUrls.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="group relative aspect-square overflow-hidden rounded-xl border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-card-rgb)/0.84)] shadow-sm"
                        onClick={() => openLightbox({ url, alt: `图片预览 ${index + 1}` })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            openLightbox({ url, alt: `图片预览 ${index + 1}` });
                          }
                        }}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={url}
                          alt={`图片预览 ${index + 1}`}
                          className="h-full w-full object-cover transition duration-500 group-hover:scale-110"
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation();
                            handleRemoveMediaUrl(index);
                          }}
                          className="absolute right-2 top-2 rounded-full bg-[rgb(var(--paper-soft-rgb)/0.94)] p-1.5 text-foreground opacity-0 transition hover:bg-[rgb(var(--accent-coral-rgb)/0.85)] hover:text-[rgb(var(--paper-soft-rgb))] group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="flex justify-end pt-2">
                <Button size="lg" onClick={handleCreatePost} disabled={isPosting || !newPostContent.trim()} className="rounded-xl px-5">
                  {isPosting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                  发布日记
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="sketch-surface p-8 text-center">
          <p className="text-[rgb(var(--ink-muted-rgb))]">登录后即可发布日记</p>
        </div>
      )}

      <div className="flex-1 space-y-4 pb-4">
        {posts.map((post) => (
          <JournalItem
            key={post.id}
            post={post}
            currentUserId={sessionUser?.id}
            currentUserRole={sessionUser?.role}
            onUpdate={handlePostUpdate}
            onDelete={handlePostDelete}
            onImagePreview={(url, alt) => openLightbox({ url, alt })}
            friendLookup={friendLookup}
          />
        ))}

        <div ref={observerTarget} className="h-4 w-full" />

        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-[rgb(var(--ink-muted-rgb))]" />
          </div>
        ) : null}

        {!loading && !nextCursor && posts.length > 0 ? (
          <div className="py-4 text-center text-xs text-[rgb(var(--ink-muted-rgb))]">已经看到最后一条了</div>
        ) : null}

        {!loading && posts.length === 0 ? (
          <div className="sketch-surface py-10 text-center text-[rgb(var(--ink-muted-rgb))]">暂时还没有日记</div>
        ) : null}
      </div>

      {lightboxImage ? <ImageLightbox image={lightboxImage} onClose={closeLightbox} /> : null}
    </div>
  );
}

function JournalItem({
  post,
  currentUserId,
  currentUserRole,
  onUpdate,
  onDelete,
  onImagePreview,
  friendLookup = {},
}: {
  post: DbJournalPost;
  currentUserId?: string;
  currentUserRole?: number;
  onUpdate?: (post: DbJournalPost) => void;
  onDelete?: (postId: string) => void;
  onImagePreview?: (url: string, alt?: string) => void;
  friendLookup?: Record<string, FriendEntry>;
}) {
  const [liked, setLiked] = useState(
    currentUserId ? post.likes?.user_ids?.includes(currentUserId) ?? false : false
  );
  const [likeCount, setLikeCount] = useState(post.likes?.count ?? 0);
  const [comments, setComments] = useState<DbComment[]>(post.comments ?? []);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentContent, setCommentContent] = useState("");
  const [replyTarget, setReplyTarget] = useState<{
    parentId: string;
    targetUserId?: string;
    targetName?: string;
  } | null>(null);
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [isSaving, setIsSaving] = useState(false);

  const authorFriend =
    (post.author_id && friendLookup[post.author_id]) ||
    (post.author?.id ? friendLookup[post.author.id] : undefined);

  const isAuthor = currentUserId === post.author_id;
  const totalComments = useMemo(() => countCommentsRecursive(comments), [comments]);

  const refreshComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const data = await fetchComments(post.id);
      setComments(data);
    } catch (error) {
      console.error("Failed to fetch comments:", error);
    } finally {
      setLoadingComments(false);
    }
  }, [post.id]);

  useEffect(() => {
    refreshComments();
  }, [refreshComments]);

  const handleLike = async () => {
    if (!currentUserId) return;

    const prevLiked = liked;
    const prevCount = likeCount;
    setLiked(!prevLiked);
    setLikeCount(prevLiked ? prevCount - 1 : prevCount + 1);

    try {
      if (prevLiked) {
        await unlikeJournal(post.id, currentUserId);
      } else {
        await likeJournal(post.id, currentUserId);
      }
    } catch (error) {
      setLiked(prevLiked);
      setLikeCount(prevCount);
      console.error("Like action failed:", error);
    }
  };

  const handleSaveEdit = async () => {
    if (!currentUserId || !editContent.trim()) return;

    try {
      setIsSaving(true);
      const updated = await updateJournal(post.id, {
        authorId: currentUserId,
        content: editContent,
      });
      onUpdate?.({ ...post, ...updated });
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to update post:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeletePost = async () => {
    if (!currentUserId || !confirm("确定要删除这条日记吗？")) return;

    try {
      await deleteJournal(post.id, { authorId: currentUserId });
      onDelete?.(post.id);
    } catch (error) {
      console.error("Failed to delete post:", error);
    }
  };

  const handleReplyClick = (comment: DbComment) => {
    if (!currentUserId || comment.deleted_at) return;
    const parentId = comment.parentId ?? comment.parent_comment_id ?? comment.id;
    setReplyTarget({
      parentId,
      targetUserId: comment.author_id,
      targetName: comment.author?.display_name ?? "该用户",
    });
  };

  const handlePostComment = async () => {
    if (!currentUserId || !commentContent.trim()) return;

    try {
      setSubmittingComment(true);
      await createComment(post.id, {
        authorId: currentUserId,
        content: commentContent,
        parentCommentId: replyTarget?.parentId,
        targetUserId: replyTarget?.targetUserId,
      });
      setCommentContent("");
      setReplyTarget(null);
      await refreshComments();
    } catch (error) {
      console.error("Failed to post comment:", error);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) return;
    const actorRole = typeof currentUserRole === "number" ? currentUserRole.toString() : undefined;
    try {
      await deleteComment(post.id, commentId, {
        actorId: currentUserId,
        actorRole,
      });
      await refreshComments();
    } catch (error) {
      console.error("Failed to delete comment:", error);
    }
  };

  const commentPlaceholder = replyTarget ? `回复 ${replyTarget.targetName}…` : "写下你的评论...";

  const renderComment = (comment: DbComment, depth = 0) => {
    const commentFriend =
      (comment.author_id && friendLookup[comment.author_id]) ||
      (comment.author?.id ? friendLookup[comment.author.id] : undefined);

    return (
      <div key={comment.id} className={cn("space-y-2", depth > 0 && "pl-6")}>
        <div
          role="button"
          tabIndex={0}
          onClick={() => handleReplyClick(comment)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleReplyClick(comment);
            }
          }}
          className={cn(
            "group/comment flex gap-3 rounded-2xl border-2 border-[rgb(var(--ink-rgb)/0.08)] bg-[rgb(var(--paper-card-rgb)/0.8)] p-3 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-coral-rgb)/0.35)]",
            depth > 0 && "bg-[rgb(var(--paper-soft-rgb)/0.82)]",
            currentUserId ? "cursor-pointer" : "cursor-default"
          )}
        >
          <UserHoverCard friend={commentFriend} author={comment.author}>
            <Avatar className="h-8 w-8 border-2 border-[rgb(var(--ink-rgb)/0.1)]">
              <AvatarImage src={comment.author?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {comment.author?.display_name?.slice(0, 2) || "访客"}
              </AvatarFallback>
            </Avatar>
          </UserHoverCard>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[rgb(var(--ink-muted-rgb))]">
                <span className="font-medium text-foreground">
                  {comment.author?.display_name || "匿名用户"}
                </span>
                {comment.targetUser ? (
                  <span>
                    回复 <span className="text-foreground">@{comment.targetUser.display_name}</span>
                  </span>
                ) : null}
                <span className="text-[10px] uppercase tracking-[0.2em]">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              {(currentUserId === comment.author_id || currentUserRole === 1) && !comment.deleted_at ? (
                <button
                  onClick={(event) => {
                    event.stopPropagation();
                    handleDeleteComment(comment.id);
                  }}
                  className="text-[rgb(var(--ink-muted-rgb))] transition hover:text-[rgb(var(--accent-coral-rgb))]"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
            <p className={cn("text-sm leading-7 text-foreground", comment.deleted_at && "italic text-[rgb(var(--ink-muted-rgb))]")}>
              {comment.deleted_at ? "这条评论已被删除" : comment.content}
            </p>
          </div>
        </div>
        {comment.replies?.length ? (
          <div className="space-y-2">{comment.replies.map((reply) => renderComment(reply, depth + 1))}</div>
        ) : null}
      </div>
    );
  };

  return (
    <Card className="sketch-surface paper-texture border-[rgb(var(--ink-rgb)/0.14)] bg-[rgb(var(--paper-soft-rgb)/0.92)] p-6">
      <div className="flex gap-4">
        <UserHoverCard friend={authorFriend} author={post.author}>
          <Avatar className="h-12 w-12 border-2 border-[rgb(var(--ink-rgb)/0.12)]">
            <AvatarImage src={post.author?.avatar_url || undefined} />
            <AvatarFallback>{post.author?.display_name?.slice(0, 2) || "访客"}</AvatarFallback>
          </Avatar>
        </UserHoverCard>

        <div className="flex-1 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-foreground">{post.author?.display_name || "Unknown"}</p>
              <p className="text-xs text-[rgb(var(--ink-muted-rgb))]">{new Date(post.created_at).toLocaleString()}</p>
            </div>
            {isAuthor && !isEditing ? (
              <div className="flex gap-2">
                <Button variant="outline" size="icon" className="rounded-full" onClick={() => setIsEditing(true)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="rounded-full border-[rgb(var(--accent-coral-rgb)/0.3)] text-[rgb(var(--accent-coral-rgb))] hover:bg-[rgb(var(--accent-coral-rgb)/0.1)]"
                  onClick={handleDeletePost}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ) : null}
          </div>

          {isEditing ? (
            <div className="space-y-3 pt-1">
              <Textarea value={editContent} onChange={(event) => setEditContent(event.target.value)} className="min-h-[120px] rounded-xl text-sm" />
              <div className="flex justify-end gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(post.content);
                  }}
                >
                  <X className="mr-1 h-3 w-3" />
                  取消
                </Button>
                <Button size="sm" onClick={handleSaveEdit} disabled={isSaving || !editContent.trim()}>
                  {isSaving ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : <Check className="mr-1 h-3 w-3" />}
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-base leading-8 text-foreground">{post.content}</p>
          )}

          {post.media && post.media.length > 0 ? (
            <div
              className={cn(
                "mt-4 grid gap-3",
                post.media.length === 1
                  ? "grid-cols-1 sm:max-w-[60%]"
                  : post.media.length === 2 || post.media.length === 4
                    ? "grid-cols-2 sm:max-w-[80%]"
                    : "grid-cols-3"
              )}
            >
              {post.media.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => onImagePreview?.(media.url, "日记图片")}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border-2 border-[rgb(var(--ink-rgb)/0.12)] bg-[rgb(var(--paper-card-rgb)/0.84)] outline-none transition focus-visible:ring-2 focus-visible:ring-[rgb(var(--accent-coral-rgb)/0.35)] shadow-sm",
                    post.media!.length > 1 ? "aspect-square" : "w-full"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.url}
                    alt="日记图片"
                    className={cn(
                      "h-full w-full transition duration-700 group-hover:scale-105",
                      post.media!.length === 1 ? "max-h-[500px] object-cover" : "object-cover"
                    )}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex items-center gap-4 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 gap-2 rounded-full border-2 px-3 transition",
                liked
                  ? "border-[rgb(var(--accent-coral-rgb)/0.25)] bg-[rgb(var(--accent-rose-rgb)/0.14)] text-[rgb(var(--accent-coral-rgb))]"
                  : "border-[rgb(var(--ink-rgb)/0.1)] bg-[rgb(var(--paper-card-rgb)/0.84)] text-[rgb(var(--ink-muted-rgb))] hover:text-foreground"
              )}
              onClick={handleLike}
              disabled={!currentUserId}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
              {likeCount > 0 ? likeCount : "点赞"}
            </Button>
            <div className="sketch-pill flex items-center gap-2 px-4 py-1.5 text-xs text-[rgb(var(--ink-muted-rgb))]">
              <MessageSquare className="h-3.5 w-3.5" />
              {totalComments} 条评论
            </div>
          </div>

          <div className="mt-6 space-y-4 border-t border-[rgb(var(--ink-rgb)/0.1)] pt-6">
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-[rgb(var(--ink-muted-rgb))]" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">{comments.map((comment) => renderComment(comment))}</div>
            ) : (
              <p className="text-center text-xs italic text-[rgb(var(--ink-muted-rgb))]">暂时没有评论，留下第一句吧。</p>
            )}

            {currentUserId ? (
              <div className="space-y-3 pt-2">
                {replyTarget ? (
                  <div className="flex items-center justify-between rounded-xl border-2 border-[rgb(var(--accent-coral-rgb)/0.25)] bg-[rgb(var(--accent-rose-rgb)/0.12)] px-4 py-2 text-xs text-foreground">
                    <span>
                      正在回复 <span className="font-semibold">{replyTarget.targetName}</span>
                    </span>
                    <button
                      onClick={() => setReplyTarget(null)}
                      className="rounded-full p-1 text-[rgb(var(--ink-muted-rgb))] transition hover:bg-[rgb(var(--paper-soft-rgb)/0.8)] hover:text-foreground"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : null}

                <div className="flex gap-3">
                  <Textarea
                    value={commentContent}
                    onChange={(event) => setCommentContent(event.target.value)}
                    placeholder={commentPlaceholder}
                    className="min-h-[44px] flex-1 resize-none rounded-xl py-3 text-xs"
                  />
                  <Button
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-xl"
                    onClick={handlePostComment}
                    disabled={submittingComment || !commentContent.trim()}
                  >
                    {submittingComment ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="py-2 text-center text-xs text-[rgb(var(--ink-muted-rgb))]">登录后即可参与评论</p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function countCommentsRecursive(nodes: DbComment[] = []): number {
  return nodes.reduce((total, node) => {
    const replies = node.replies ?? [];
    return total + 1 + countCommentsRecursive(replies);
  }, 0);
}

function ImageLightbox({ image, onClose }: { image: LightboxImage; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-[rgb(69_54_41/0.68)] p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full border-2 border-[rgb(var(--paper-soft-rgb)/0.6)] bg-[rgb(var(--paper-soft-rgb)/0.18)] p-2 text-[rgb(var(--paper-soft-rgb))] hover:bg-[rgb(var(--paper-soft-rgb)/0.28)]"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt || "图片预览"}
        className="max-h-[85vh] max-w-[90vw] rounded-[1.6rem] border-2 border-[rgb(var(--paper-soft-rgb)/0.4)] object-contain shadow-2xl"
        referrerPolicy="no-referrer"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
