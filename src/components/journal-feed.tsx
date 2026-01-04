"use client";

import { useCallback, useEffect, useState, useRef, ChangeEvent, useMemo } from "react";
import { useSession } from "@/components/session-provider";
import {
  createJournal,
  fetchJournal,
  updateJournal,
  deleteJournal,
  likeJournal,
  unlikeJournal,
  fetchComments,
  createComment,
  deleteComment,
  uploadMedia,
  fetchFriends,
  type DbJournalPost,
  type DbComment,
} from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserHoverCard } from "@/components/user-hover-card";
import type { FriendEntry } from "@/data/friends";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Heart, MessageSquare, Send, Loader2, Trash2, Pencil, X, Check, ImagePlus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type LightboxImage = { url: string; alt?: string };
const MAX_UPLOAD_DIMENSION = 1600;
const MAX_UPLOAD_BYTES = 1.2 * 1024 * 1024; // 1.2MB
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
  if (!file.type.startsWith("image/")) {
    return file;
  }
  if (file.size <= MAX_UPLOAD_BYTES) {
    return file;
  }

  const dataUrl = await readFileAsDataURL(file);
  const image = await loadImage(dataUrl);
  const maxDimension = Math.max(image.width, image.height);
  const scale = Math.min(1, MAX_UPLOAD_DIMENSION / maxDimension);

  if (scale >= 1 && file.size <= MAX_UPLOAD_BYTES) {
    return file;
  }

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    return file;
  }
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

export function JournalFeed() {
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

  // 无限滚动观察器
  const observerTarget = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadPosts = useCallback(async (cursor?: string) => {
    try {
      setLoading(true);
      const res = await fetchJournal({ limit: 10, cursor });
      if (cursor) {
        setPosts((prev) => {
          // 简单的去重逻辑，防止重复 key
          const existingIds = new Set(prev.map(p => p.id));
          const newItems = res.items.filter(p => !existingIds.has(p.id));
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

  // 初始加载
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
        console.error("加载朋友资料失败", error);
      }
    };
    loadFriends();
    return () => {
      cancelled = true;
    };
  }, [sessionUser?.id]);

  // 监听滚动到底部
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
        media: newPost.media ?? mediaUrls.map((url, index) => ({
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
    setPosts(prev => prev.map(p => p.id === updatedPost.id ? updatedPost : p));
  };

  const handlePostDelete = (postId: string) => {
    setPosts(prev => prev.filter(p => p.id !== postId));
  };

  const handleAddMediaUrl = () => {
    if (!mediaUrlInput.trim()) return;
    try {
      const parsed = new URL(mediaUrlInput.trim());
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
    setMediaUrls((prev) => [...prev, mediaUrlInput.trim()]);
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
            console.warn(`Retrying upload for ${displayName} (attempt ${attempt + 2}/${MAX_UPLOAD_RETRIES})`);
            await sleep(600 * (attempt + 1));
          }
        }
        throw lastError instanceof Error ? lastError : new Error("未知上传错误");
      };

      const worker = async () => {
        while (true) {
          const fileIndex = currentIndex++;
          if (fileIndex >= optimizedFiles.length) {
            break;
          }
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
      {/* 发布区域 */}
      {sessionUser ? (
        <div className="space-y-4 rounded-3xl border border-white/20 bg-white/10 p-6 backdrop-blur-md shadow-sm">
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
              <Avatar className="h-10 w-10 border border-white/30 shadow-sm">
                <AvatarImage src={sessionUser.avatarUrl || undefined} />
                <AvatarFallback>{sessionUser.displayName.slice(0, 2)}</AvatarFallback>
              </Avatar>
            </UserHoverCard>
            <div className="flex-1 space-y-4">
              <Textarea
                placeholder="分享你的想法..."
                value={newPostContent}
                onChange={(e) => setNewPostContent(e.target.value)}
                className="min-h-[100px] resize-none rounded-2xl border-white/20 bg-white/5 text-sm text-white placeholder:text-white/40 focus-visible:ring-cyan-400/50 focus-visible:border-cyan-400/50 transition-all"
              />

              <div className="space-y-3 rounded-2xl border border-dashed border-white/20 bg-white/5 p-4">
                <div className="flex flex-col gap-3 sm:flex-row">
                  <Input
                    type="url"
                    placeholder="粘贴图片链接"
                    value={mediaUrlInput}
                    onChange={(e) => setMediaUrlInput(e.target.value)}
                    className="border-white/20 bg-white/5 text-sm text-white placeholder:text-white/30 rounded-xl focus-visible:ring-cyan-400/50"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    className="shrink-0 border-white/30 bg-white/10 text-white hover:bg-white/20 rounded-xl"
                    onClick={handleAddMediaUrl}
                  >
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
                    className="border border-white/20 bg-white/10 text-white hover:bg-white/20 rounded-xl"
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
                  <p className="text-xs text-white/50">支持 png / jpg / webp</p>
                </div>

                {mediaError && <p className="text-xs text-rose-300">{mediaError}</p>}

                {mediaUrls.length > 0 && (
                  <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 pt-2">
                    {mediaUrls.map((url, index) => (
                      <div
                        key={`${url}-${index}`}
                        className="group relative aspect-square overflow-hidden rounded-xl border border-white/20 bg-white/5 shadow-sm"
                        onClick={() => setLightboxImage({ url, alt: `图片预览 ${index + 1}` })}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            setLightboxImage({ url, alt: `图片预览 ${index + 1}` });
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemoveMediaUrl(index);
                          }}
                          className="absolute right-2 top-2 rounded-full bg-black/40 p-1.5 text-white/90 opacity-0 backdrop-blur-md transition hover:bg-rose-500 group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  size="lg"
                  onClick={handleCreatePost}
                  disabled={isPosting || !newPostContent.trim()}
                  className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white hover:from-cyan-400 hover:to-blue-400 rounded-xl shadow-lg shadow-cyan-500/20 border-none"
                >
                  {isPosting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="mr-2 h-4 w-4" />
                  )}
                  发布日记
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/20 bg-white/10 p-8 text-center backdrop-blur-md">
          <p className="text-white/60">登录后即可发布日记</p>
        </div>
      )}

      {/* 列表区域 */}
      <div className="flex-1 space-y-4 pb-4">
        {posts.map((post) => (
          <JournalItem
            key={post.id}
            post={post}
            currentUserId={sessionUser?.id}
            currentUserRole={sessionUser?.role}
            onUpdate={handlePostUpdate}
            onDelete={handlePostDelete}
            onImagePreview={(url, alt) => setLightboxImage({ url, alt })}
            friendLookup={friendLookup}
          />
        ))}

        {/* 无限滚动观察哨 */}
        <div ref={observerTarget} className="h-4 w-full" />

        {loading && (
          <div className="flex justify-center py-4">
            <Loader2 className="h-6 w-6 animate-spin text-white/40" />
          </div>
        )}

        {!loading && !nextCursor && posts.length > 0 && (
          <div className="py-4 text-center text-xs text-white/30">
            已经到底啦
          </div>
        )}

        {!loading && posts.length === 0 && (
          <div className="py-10 text-center text-white/40">暂无日记</div>
        )}
      </div>
      {lightboxImage && (
        <ImageLightbox
          image={lightboxImage}
          onClose={() => setLightboxImage(null)}
        />
      )}
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
  const [replyTarget, setReplyTarget] = useState<{ parentId: string; targetUserId?: string; targetName?: string } | null>(null);
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

    setIsSaving(true);
    try {
      const updated = await updateJournal(post.id, {
        authorId: currentUserId,
        content: editContent,
      });

      const fullPost = { ...post, ...updated };
      onUpdate?.(fullPost);
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

    setSubmittingComment(true);
    try {
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
    const actorRole =
      typeof currentUserRole === "number" ? currentUserRole.toString() : undefined;
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

  const commentPlaceholder = replyTarget
    ? `回复 ${replyTarget.targetName} ...`
    : "写下你的评论...";

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
            "group/comment flex gap-3 rounded-2xl border border-white/5 bg-black/15 p-3 transition hover:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/40",
            depth > 0 && "bg-black/10",
            currentUserId ? "cursor-pointer" : "cursor-default"
          )}
        >
          <UserHoverCard friend={commentFriend} author={comment.author}>
            <Avatar className="h-8 w-8 border border-white/15">
              <AvatarImage src={comment.author?.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">
                {comment.author?.display_name?.slice(0, 2) || "访客"}
              </AvatarFallback>
            </Avatar>
          </UserHoverCard>
          <div className="flex-1 space-y-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/70">
                <span className="font-medium text-white">
                  {comment.author?.display_name || "匿名用户"}
                </span>
                {comment.targetUser && (
                  <span className="text-white/50">
                    回复 <span className="text-white/80">@{comment.targetUser.display_name}</span>
                  </span>
                )}
                <span className="text-[10px] uppercase tracking-[0.2em] text-white/30">
                  {new Date(comment.created_at).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center gap-2 opacity-0 transition group-hover/comment:opacity-100">
                {(currentUserId === comment.author_id || currentUserRole === 1) && (
                  <button
                    onClick={(event) => {
                      event.stopPropagation();
                      handleDeleteComment(comment.id);
                    }}
                    className="text-white/30 hover:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
            <p
              className={cn(
                "text-sm leading-relaxed text-white/80",
                comment.deleted_at && "italic text-white/40"
              )}
            >
              {comment.deleted_at ? "该评论已被删除" : comment.content}
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
    <Card className="group relative border-white/20 bg-white/10 p-6 transition-all hover:bg-white/15 hover:shadow-lg hover:shadow-white/5 backdrop-blur-md rounded-3xl">
      <div className="flex gap-4">
        <UserHoverCard friend={authorFriend} author={post.author}>
          <Avatar className="h-12 w-12 border border-white/30 shadow-sm">
            <AvatarImage src={post.author?.avatar_url || undefined} />
            <AvatarFallback>{post.author?.display_name?.slice(0, 2) || "游客"}</AvatarFallback>
          </Avatar>
        </UserHoverCard>
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-white text-lg drop-shadow-sm">{post.author?.display_name || "Unknown"}</p>
              <p className="text-xs text-white/50 font-medium">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
            {isAuthor && !isEditing && (
              <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/40 hover:bg-white/10 hover:text-white rounded-full"
                  onClick={() => setIsEditing(true)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-white/40 hover:bg-rose-500/20 hover:text-rose-400 rounded-full"
                  onClick={handleDeletePost}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-3 pt-2">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[120px] rounded-xl border-white/20 bg-white/5 text-sm text-white focus-visible:ring-cyan-400/50"
              />
              <div className="flex justify-end gap-3">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(post.content);
                  }}
                  className="h-8 text-xs text-white/60 hover:text-white rounded-lg"
                >
                  <X className="mr-1 h-3 w-3" />
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editContent.trim()}
                  className="h-8 bg-cyan-500/20 text-xs text-cyan-300 hover:bg-cyan-500/30 rounded-lg border border-cyan-500/30"
                >
                  {isSaving ? (
                    <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                  ) : (
                    <Check className="mr-1 h-3 w-3" />
                  )}
                  保存
                </Button>
              </div>
            </div>
          ) : (
            <p className="whitespace-pre-wrap text-base leading-relaxed text-white/90 font-medium">{post.content}</p>
          )}

          {post.media && post.media.length > 0 && (
            <div className={cn(
              "mt-4 grid gap-3",
              post.media.length === 1 ? "grid-cols-1 sm:max-w-[60%]" :
                post.media.length === 2 || post.media.length === 4 ? "grid-cols-2 sm:max-w-[80%]" :
                  "grid-cols-3"
            )}>
              {post.media.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => onImagePreview?.(media.url, "日记图片")}
                  className={cn(
                    "group relative overflow-hidden rounded-2xl border border-white/20 bg-white/5 outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-400/60 shadow-sm",
                    post.media!.length > 1 ? "aspect-square" : "w-full"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.url}
                    alt="日记图片"
                    className={cn(
                      "h-full w-full transition duration-700 group-hover:scale-110",
                      post.media!.length === 1 ? "max-h-[500px] object-cover" : "object-cover"
                    )}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-4">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-9 gap-2 px-3 text-xs rounded-full border border-transparent hover:border-white/20 hover:bg-white/10 transition-all",
                liked ? "text-rose-400 bg-rose-500/10 border-rose-500/20" : "text-white/60 hover:text-white"
              )}
              onClick={handleLike}
              disabled={!currentUserId}
            >
              <Heart className={cn("h-4 w-4", liked && "fill-current")} />
              {likeCount > 0 ? likeCount : "点赞"}
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-white/60">
              <MessageSquare className="h-3.5 w-3.5" />
              {totalComments} 条评论
            </div>
          </div>

          <div className="mt-6 space-y-4 border-t border-white/10 pt-6">
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-4">{comments.map((comment) => renderComment(comment))}</div>
            ) : (
              <p className="text-center text-xs text-white/30 italic">暂无评论，快来抢沙发吧~</p>
            )}

            {currentUserId ? (
              <div className="space-y-3 pt-2">
                {replyTarget && (
                  <div className="flex items-center justify-between rounded-xl border border-cyan-500/30 bg-cyan-500/10 px-4 py-2 text-xs text-cyan-100 backdrop-blur-sm">
                    <span>正在回复 <span className="font-bold">{replyTarget.targetName}</span></span>
                    <button
                      onClick={() => setReplyTarget(null)}
                      className="text-cyan-200 hover:text-white p-1 hover:bg-cyan-500/20 rounded-full transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex gap-3">
                  <Textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder={commentPlaceholder}
                    className="min-h-[44px] flex-1 resize-none rounded-xl border-white/20 bg-white/5 py-3 text-xs text-white placeholder:text-white/30 focus-visible:ring-cyan-400/50 transition-all"
                  />
                  <Button
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-xl bg-white/10 hover:bg-cyan-500 hover:text-white border border-white/10 transition-all shadow-sm"
                    onClick={handlePostComment}
                    disabled={submittingComment || !commentContent.trim()}
                  >
                    {submittingComment ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-center text-xs text-white/40 py-2">登录后即可参与评论</p>
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
  if (!image) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 rounded-full border border-white/20 bg-black/60 p-2 text-white hover:bg-black/80"
      >
        <X className="h-5 w-5" />
      </button>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.url}
        alt={image.alt || "图片预览"}
        className="max-h-[85vh] max-w-[90vw] rounded-2xl border border-white/10 object-contain shadow-2xl"
        referrerPolicy="no-referrer"
        onClick={(event) => event.stopPropagation()}
      />
    </div>
  );
}
