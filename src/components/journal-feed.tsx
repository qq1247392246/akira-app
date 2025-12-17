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
  type DbJournalPost,
  type DbComment,
} from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Heart, MessageSquare, Send, Loader2, Trash2, Pencil, X, Check, ImagePlus, Upload } from "lucide-react";
import { cn } from "@/lib/utils";

type LightboxImage = { url: string; alt?: string };

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
    if (mediaUrls.length >= 8) {
      setMediaError("最多添加 8 张图片");
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
    if (mediaUrls.length >= 8) {
      setMediaError("最多添加 8 张图片");
      return;
    }
    fileInputRef.current?.click();
  };

  const handleLocalFilesSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const remainingSlots = 8 - mediaUrls.length;
    if (remainingSlots <= 0) {
      setMediaError("最多添加 8 张图片");
      event.target.value = "";
      return;
    }

    const selectedFiles = Array.from(files).slice(0, remainingSlots);
    setUploadingMedia(true);
    setMediaError(null);

    try {
      for (const file of selectedFiles) {
        const { url } = await uploadMedia(file);
        setMediaUrls((prev) => [...prev, url]);
      }
    } catch (error) {
      console.error("Failed to upload media:", error);
      setMediaError("上传失败，请稍后重试");
    } finally {
      setUploadingMedia(false);
      event.target.value = "";
    }
  };

  return (
    <div className="flex h-full flex-col space-y-6">
      {/* 发布区域 */}
      {sessionUser ? (
        <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
          <div className="flex gap-3">
            <Avatar className="h-8 w-8 border border-white/20">
              <AvatarImage src={sessionUser.avatarUrl || undefined} />
              <AvatarFallback>{sessionUser.displayName.slice(0, 2)}</AvatarFallback>
            </Avatar>
            <Textarea
              placeholder="分享你的想法..."
              value={newPostContent}
              onChange={(e) => setNewPostContent(e.target.value)}
              className="min-h-[80px] resize-none border-white/10 bg-black/20 text-sm text-white placeholder:text-white/40 focus-visible:ring-cyan-500/50"
            />
          </div>
          <div className="space-y-3 rounded-xl border border-dashed border-white/15 bg-black/10 p-3">
            <div className="flex flex-col gap-2 sm:flex-row">
              <Input
                type="url"
                placeholder="粘贴图片链接（例如来自 Gitee 图床）"
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                className="border-white/20 bg-black/20 text-sm text-white placeholder:text-white/30"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 border-white/30 text-white hover:bg-white/10"
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
                className="border border-white/20 bg-white/10 text-white hover:bg-white/20"
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
              <p className="text-xs text-white/50">支持 png / jpg / webp，将上传至 Gitee 图床并写入数据库。</p>
            </div>
            {mediaError && <p className="text-xs text-red-400">{mediaError}</p>}
            {mediaUrls.length > 0 && (
              <div className="grid gap-3 sm:grid-cols-2">
                {mediaUrls.map((url, index) => (
                  <div
                    key={`${url}-${index}`}
                    className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5"
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
                      className="w-full max-h-[24rem] rounded-2xl object-contain transition duration-300 group-hover:scale-[1.01]"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveMediaUrl(index)}
                      className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white/80 transition hover:bg-black/80"
                      onMouseDown={(event) => event.stopPropagation()}
                      onClickCapture={(event) => event.stopPropagation()}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-white/40">最多 8 张图片，支持外链或本地上传。</p>
          </div>
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={handleCreatePost}
              disabled={isPosting || !newPostContent.trim()}
              className="bg-cyan-500/80 text-white hover:bg-cyan-500"
            >
              {isPosting ? (
                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
              ) : (
                <Send className="mr-2 h-3 w-3" />
              )}
              发布
            </Button>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-center text-sm text-white/60">
          登录后即可发布日记
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
}: {
  post: DbJournalPost;
  currentUserId?: string;
  currentUserRole?: number;
  onUpdate?: (post: DbJournalPost) => void;
  onDelete?: (postId: string) => void;
  onImagePreview?: (url: string, alt?: string) => void;
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

  const renderComment = (comment: DbComment, depth = 0) => (
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
        <Avatar className="h-8 w-8 border border-white/15">
          <AvatarImage src={comment.author?.avatar_url || undefined} />
          <AvatarFallback className="text-[10px]">
            {comment.author?.display_name?.slice(0, 2) || "访客"}
          </AvatarFallback>
        </Avatar>
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

  return (
    <Card className="group relative border-white/10 bg-white/5 p-4 transition-colors hover:bg-white/[0.07]">
      <div className="flex gap-3">
        <Avatar className="h-10 w-10 border border-white/20">
          <AvatarImage src={post.author?.avatar_url || undefined} />
          <AvatarFallback>{post.author?.display_name?.slice(0, 2) || "游客"}</AvatarFallback>
        </Avatar>
        <div className="flex-1 space-y-1">
          <div className="flex items-center justify-between">
            <p className="font-medium text-white">{post.author?.display_name || "Unknown"}</p>
            <div className="flex items-center gap-2">
              <span className="text-xs text-white/40">
                {new Date(post.created_at).toLocaleString()}
              </span>
              {isAuthor && !isEditing && (
                <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white/40 hover:bg-white/10 hover:text-white"
                    onClick={() => setIsEditing(true)}
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 text-white/40 hover:bg-red-500/10 hover:text-red-400"
                    onClick={handleDeletePost}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          {isEditing ? (
            <div className="space-y-2 pt-1">
              <Textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="min-h-[100px] border-white/10 bg-black/20 text-sm text-white focus-visible:ring-cyan-500/50"
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setIsEditing(false);
                    setEditContent(post.content);
                  }}
                  className="h-7 text-xs text-white/60 hover:text-white"
                >
                  <X className="mr-1 h-3 w-3" />
                  取消
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveEdit}
                  disabled={isSaving || !editContent.trim()}
                  className="h-7 bg-cyan-500/20 text-xs text-cyan-300 hover:bg-cyan-500/30"
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
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-white/80">{post.content}</p>
          )}

          {post.media && post.media.length > 0 && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {post.media.map((media) => (
                <button
                  key={media.id}
                  type="button"
                  onClick={() => onImagePreview?.(media.url, "日记图片")}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 outline-none transition focus-visible:ring-2 focus-visible:ring-cyan-500/60"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={media.url}
                    alt="日记图片"
                    className="w-full max-h-[28rem] rounded-2xl object-contain transition duration-300 group-hover:scale-[1.01]"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4 pt-2">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-8 gap-1.5 px-2 text-xs hover:bg-white/10",
                liked ? "text-pink-500 hover:text-pink-400" : "text-white/60 hover:text-white"
              )}
              onClick={handleLike}
              disabled={!currentUserId}
            >
              <Heart className={cn("h-3.5 w-3.5", liked && "fill-current")} />
              {likeCount > 0 && likeCount}
            </Button>
            <div className="flex items-center gap-2 rounded-full border border-white/15 px-3 py-1 text-xs text-white/60">
              <MessageSquare className="h-3.5 w-3.5" />
              {totalComments} 条评论
            </div>
          </div>

          <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
            {loadingComments ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin text-white/40" />
              </div>
            ) : comments.length > 0 ? (
              <div className="space-y-3">{comments.map((comment) => renderComment(comment))}</div>
            ) : (
              <p className="text-center text-xs text-white/40">暂无评论</p>
            )}

            {currentUserId ? (
              <div className="space-y-2">
                {replyTarget && (
                  <div className="flex items-center justify-between rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                    <span>正在回复 {replyTarget.targetName}</span>
                    <button
                      onClick={() => setReplyTarget(null)}
                      className="text-cyan-200 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Textarea
                    value={commentContent}
                    onChange={(e) => setCommentContent(e.target.value)}
                    placeholder={commentPlaceholder}
                    className="min-h-[36px] flex-1 resize-none border-white/10 bg-black/20 py-2 text-xs text-white placeholder:text-white/30 focus-visible:ring-cyan-500/50"
                  />
                  <Button
                    size="icon"
                    className="h-9 w-9 shrink-0 bg-white/10 hover:bg-white/20"
                    onClick={handlePostComment}
                    disabled={submittingComment || !commentContent.trim()}
                  >
                    {submittingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-white/50">登录后即可参与评论</p>
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
