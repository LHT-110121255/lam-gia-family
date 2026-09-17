import React, { useState } from "react";
import {
  FamilyPost,
  MemoryMilestone,
  MemoryAlbum,
  OnThisDayItem,
  FamilyMember,
} from "../../types";
import { Avatar } from "../common/Avatar";
import { ImageWithFallback } from "../common/ImageWithFallback";
import {
  Heart,
  MessageCircle,
  Share2,
  Sparkles,
  MapPin,
  Calendar,
  Image as ImageIcon,
  Plus,
  Send,
  MoreVertical,
  X,
  Clock,
  Pin,
  Smile,
  Newspaper,
  History,
  Images,
  Edit3,
  Globe,
  Shield,
  Lock,
  Users,
  Loader2,
  Upload,
  Trash2,
} from "lucide-react";
import { Modal } from "../common/Modal";
import { BottomSheet } from "../common/BottomSheet";
import { api } from "../../services/api";

interface MemoriesScreenProps {
  posts: FamilyPost[];
  milestones: MemoryMilestone[];
  albums: MemoryAlbum[];
  onThisDay?: OnThisDayItem | null;
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  onAddComment: (postId: string, content: string) => void;
  onEditComment?: (postId: string, commentId: string, content: string) => void;
  onDeleteComment?: (postId: string, commentId: string) => void;
  onDeletePost: (postId: string) => void;
  onEditPost?: (post: FamilyPost) => void;
  onOpenCreatePost: () => void;
  onOpenMemberProfile: (memberId: string) => void;
  onCreateAlbum?: (album: {
    title: string;
    category: MemoryAlbum["category"];
    coverUrl: string;
  }) => void;
  onDeleteAlbum?: (albumId: string) => void;
  onAddPhotoToAlbum?: (
    albumId: string,
    photo: {
      url: string;
      caption?: string;
      date: string;
      taggedMemberIds: string[];
    },
  ) => void;
  onDeletePhotoFromAlbum?: (albumId: string, photoId: string) => void;
  onAddMilestone?: (milestone: Omit<MemoryMilestone, "id">) => void;
  onDeleteMilestone?: (milestoneId: string) => void;
}

export const MemoriesScreen: React.FC<MemoriesScreenProps> = ({
  posts,
  milestones,
  albums,
  onThisDay,
  currentMember,
  allMembers,
  onToggleLike,
  onAddComment,
  onEditComment,
  onDeleteComment,
  onDeletePost,
  onEditPost,
  onOpenCreatePost,
  onOpenMemberProfile,
  onCreateAlbum,
  onDeleteAlbum,
  onAddPhotoToAlbum,
  onDeletePhotoFromAlbum,
  onAddMilestone,
  onDeleteMilestone,
}) => {
  const [activeTab, setActiveTab] = useState<"feed" | "timeline" | "albums">(
    "feed",
  );
  const [selectedAlbum, setSelectedAlbum] = useState<MemoryAlbum | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Modals for creating Album & Milestone & Adding Photo
  const [showCreateAlbumModal, setShowCreateAlbumModal] = useState(false);
  const [newAlbumTitle, setNewAlbumTitle] = useState("");
  const [newAlbumCategory, setNewAlbumCategory] =
    useState<MemoryAlbum["category"]>("Gia đình");
  const [newAlbumCover, setNewAlbumCover] = useState("");
  const [isUploadingAlbumCover, setIsUploadingAlbumCover] = useState(false);

  const [showAddMilestoneModal, setShowAddMilestoneModal] = useState(false);
  const [newMilestoneYear, setNewMilestoneYear] = useState<number>(
    new Date().getFullYear(),
  );
  const [newMilestoneTitle, setNewMilestoneTitle] = useState("");
  const [newMilestoneLocation, setNewMilestoneLocation] = useState("");
  const [newMilestoneDesc, setNewMilestoneDesc] = useState("");
  const [newMilestonePhotos, setNewMilestonePhotos] = useState<string[]>([]);
  const [newMilestoneTagged, setNewMilestoneTagged] = useState<string[]>([]);
  const [isUploadingMilestonePhoto, setIsUploadingMilestonePhoto] =
    useState(false);

  const [isUploadingPhotoToAlbum, setIsUploadingPhotoToAlbum] = useState(false);

  // Filter posts based on privacy permissions
  const isPostVisible = (post: FamilyPost) => {
    if (post.authorId === currentMember.id) return true;
    if (!post.privacy || post.privacy === "all") return true;
    if (post.privacy === "private") return post.authorId === currentMember.id;
    if (post.privacy === "parents") {
      const isParent =
        currentMember.role === "elder" ||
        currentMember.relationship.toLowerCase().includes("bố") ||
        currentMember.relationship.toLowerCase().includes("mẹ") ||
        currentMember.relationship.toLowerCase().includes("ông") ||
        currentMember.relationship.toLowerCase().includes("bà");
      return isParent;
    }
    if (post.privacy === "siblings") {
      const isSibling =
        currentMember.role === "adult" ||
        currentMember.role === "teen" ||
        currentMember.role === "child" ||
        currentMember.relationship.toLowerCase().includes("con") ||
        currentMember.relationship.toLowerCase().includes("anh") ||
        currentMember.relationship.toLowerCase().includes("chị") ||
        currentMember.relationship.toLowerCase().includes("em");
      return isSibling;
    }
    return true;
  };

  const visiblePosts = posts.filter(isPostVisible);

  // Comment input per post state
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>(
    {},
  );
  const [activeCommentsPostId, setActiveCommentsPostId] = useState<
    string | null
  >(null);
  const [editingComment, setEditingComment] = useState<{
    postId: string;
    commentId: string;
    text: string;
  } | null>(null);

  const handleSendComment = (postId: string) => {
    const text = commentInputs[postId]?.trim();
    if (!text) return;
    onAddComment(postId, text);
    setCommentInputs((prev) => ({ ...prev, [postId]: "" }));
  };

  const handleSaveEditComment = () => {
    if (!editingComment || !editingComment.text.trim()) return;
    if (onEditComment) {
      onEditComment(
        editingComment.postId,
        editingComment.commentId,
        editingComment.text.trim(),
      );
    }
    setEditingComment(null);
  };

  const getMember = (id: string) =>
    allMembers.find(
      (m) =>
        m.id === id ||
        (m as any)._id === id ||
        m.username === id ||
        (m.username && id && m.username.toLowerCase() === id.toLowerCase()),
    );

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      {/* 1. Category Switcher: Bảng tin | Mốc thời gian | Album ảnh */}
      <div className="p-1.5 bg-stone-100/90 backdrop-blur-md rounded-2xl border border-stone-200/80 shadow-2xs flex items-center gap-1">
        <button
          type="button"
          onClick={() => setActiveTab("feed")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all duration-200 select-none ${
            activeTab === "feed"
              ? "bg-white text-orange-600 shadow-sm shadow-stone-200/50 scale-[1.02]"
              : "text-stone-500 hover:text-stone-800 hover:bg-white/50"
          }`}
        >
          <Newspaper
            className={`w-4 h-4 shrink-0 transition-transform ${activeTab === "feed" ? "text-orange-600 scale-110" : "text-stone-400"}`}
          />
          <span className="truncate">Bảng tin</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all duration-200 select-none ${
            activeTab === "timeline"
              ? "bg-white text-orange-600 shadow-sm shadow-stone-200/50 scale-[1.02]"
              : "text-stone-500 hover:text-stone-800 hover:bg-white/50"
          }`}
        >
          <History
            className={`w-4 h-4 shrink-0 transition-transform ${activeTab === "timeline" ? "text-orange-600 scale-110" : "text-stone-400"}`}
          />
          <span className="truncate">Dòng thời gian</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("albums")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 text-xs font-bold rounded-xl transition-all duration-200 select-none ${
            activeTab === "albums"
              ? "bg-white text-orange-600 shadow-sm shadow-stone-200/50 scale-[1.02]"
              : "text-stone-500 hover:text-stone-800 hover:bg-white/50"
          }`}
        >
          <Images
            className={`w-4 h-4 shrink-0 transition-transform ${activeTab === "albums" ? "text-orange-600 scale-110" : "text-stone-400"}`}
          />
          <span className="truncate">Album</span>
        </button>
      </div>

      {/* --- TAB 1: FAMILY FEED --- */}
      {activeTab === "feed" && (
        <div className="space-y-4">
          {/* Quick Post Prompt Bar */}
          <div
            onClick={onOpenCreatePost}
            className="p-3.5 bg-white rounded-2xl border border-stone-200/80 shadow-xs flex items-center gap-3 cursor-pointer hover:bg-stone-50 transition"
          >
            <Avatar
              src={currentMember.avatar}
              name={currentMember.name}
              size="sm"
            />
            <div className="flex-1 bg-stone-100 hover:bg-stone-200/70 text-stone-500 text-xs px-3.5 py-2.5 rounded-full">
              {currentMember.name.split(" ").slice(-1)[0]} ơi, gia đình hôm nay
              có gì vui không?
            </div>
            <button className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0">
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* "ON THIS DAY" Highlight Banner */}
          {onThisDay && (
            <div className="p-4 bg-linear-to-br from-amber-500/10 via-orange-500/10 to-stone-50 rounded-3xl border border-amber-200/90 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-900">
                  <Sparkles className="w-4 h-4 text-amber-600" />
                  Ký ức: Ngày này {onThisDay.yearsAgo} năm trước
                </span>
                <span className="text-[10px] text-stone-500 font-medium">
                  {onThisDay.originalDate.split("-").reverse().join("/")}
                </span>
              </div>
              <h4 className="text-sm font-bold text-stone-900">
                {onThisDay.title}
              </h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                {onThisDay.description}
              </p>
              <div className="grid grid-cols-2 gap-2 pt-1">
                {onThisDay.photos.map((photo, i) => (
                  <img
                    key={i}
                    src={photo}
                    alt={onThisDay.title}
                    onClick={() => setLightboxPhoto(photo)}
                    className="w-full h-28 object-cover rounded-xl cursor-pointer hover:opacity-95 transition"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            </div>
          )}

          {/* Posts List */}
          <div className="space-y-4">
            {visiblePosts.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-stone-200/70 text-center space-y-2">
                <p className="text-xs text-stone-500 font-medium">
                  Chưa có bài viết hoặc khoảnh khắc nào trong chế độ này.
                </p>
                <button
                  onClick={onOpenCreatePost}
                  className="px-4 py-2 bg-orange-50 text-orange-700 text-xs font-bold rounded-xl hover:bg-orange-100 transition"
                >
                  + Đăng bài viết đầu tiên
                </button>
              </div>
            ) : (
              visiblePosts.map((post) => {
                const author = getMember(post.authorId);
                const isLiked = post.likes.includes(currentMember.id);
                const isOwnPost = post.authorId === currentMember.id;

                return (
                  <article
                    key={post.id}
                    className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden"
                  >
                    {/* Post Header */}
                    <div className="p-4 pb-2.5 flex items-center justify-between">
                      <div
                        onClick={() => author && onOpenMemberProfile(author.id)}
                        className="flex items-center gap-2.5 cursor-pointer"
                      >
                        <Avatar
                          src={author?.avatar || ""}
                          name={author?.name || "Thành viên"}
                          size="sm"
                          online={author?.onlineStatus === "online"}
                        />
                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-xs font-bold text-stone-900">
                              {author?.name}
                            </h4>
                            <span className="text-[10px] bg-stone-100 text-stone-600 px-1.5 py-0.2 rounded-md font-medium">
                              {author?.relationship}
                            </span>

                            {/* Privacy Badge */}
                            {post.privacy === "parents" && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-purple-50 text-purple-700 border border-purple-200 px-1.5 py-0.2 rounded-md">
                                <Shield className="w-2.5 h-2.5" /> Tỉa Mẹ
                              </span>
                            )}
                            {post.privacy === "siblings" && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.2 rounded-md">
                                <Users className="w-2.5 h-2.5" /> Anh chị em
                              </span>
                            )}
                            {post.privacy === "private" && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-stone-100 text-stone-600 border border-stone-200 px-1.5 py-0.2 rounded-md">
                                <Lock className="w-2.5 h-2.5" /> Riêng tư
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5">
                            <span>
                              {new Date(post.createdAt).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            {post.location && (
                              <span className="flex items-center gap-0.5 truncate max-w-[140px]">
                                •{" "}
                                <MapPin className="w-2.5 h-2.5 text-stone-400" />
                                {post.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        {post.pinned && (
                          <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Pin className="w-2.5 h-2.5" /> Ghim
                          </span>
                        )}
                        {isOwnPost && (
                          <div className="flex items-center gap-0.5">
                            <button
                              onClick={() => onEditPost && onEditPost(post)}
                              className="p-1.5 text-stone-400 hover:text-orange-600 rounded-lg transition"
                              title="Chỉnh sửa bài viết"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => onDeletePost(post.id)}
                              className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition"
                              title="Xoá bài đăng của tôi"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Post Content */}
                    <div className="px-4 pb-3">
                      <p className="text-xs text-stone-800 leading-relaxed whitespace-pre-line font-medium">
                        {post.content}
                      </p>
                      {post.feeling && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full mt-2 font-medium">
                          <Smile className="w-3 h-3" /> Đang cảm thấy:{" "}
                          {post.feeling}
                        </span>
                      )}
                    </div>

                    {/* Media Grid */}
                    {post.mediaUrls.length > 0 && (
                      <div
                        className={`grid gap-1 px-4 pb-3 ${
                          post.mediaUrls.length === 1
                            ? "grid-cols-1"
                            : "grid-cols-2"
                        }`}
                      >
                        {post.mediaUrls.map((url, i) => (
                          <ImageWithFallback
                            key={i}
                            src={url}
                            alt="Ảnh gia đình"
                            onClick={() => setLightboxPhoto(url)}
                            className="w-full h-44 object-cover rounded-2xl cursor-pointer"
                          />
                        ))}
                      </div>
                    )}

                    {/* Reactions Bar */}
                    <div className="px-4 py-2 border-t border-stone-100 flex items-center justify-between text-xs text-stone-600">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => onToggleLike(post.id)}
                          className={`flex items-center gap-1.5 py-1 px-2.5 rounded-full transition ${
                            isLiked
                              ? "text-rose-600 bg-rose-50 font-bold"
                              : "hover:bg-stone-100 text-stone-600"
                          }`}
                        >
                          <Heart
                            className={`w-4 h-4 ${isLiked ? "fill-rose-600 text-rose-600" : ""}`}
                          />
                          <span>
                            {post.likes.length > 0
                              ? post.likes.length
                              : "Thả tim"}
                          </span>
                        </button>

                        <button
                          onClick={() =>
                            setActiveCommentsPostId(
                              activeCommentsPostId === post.id ? null : post.id,
                            )
                          }
                          className="flex items-center gap-1.5 py-1 px-2.5 rounded-full hover:bg-stone-100 transition"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>{post.comments.length} bình luận</span>
                        </button>
                      </div>
                    </div>

                    {/* Comments Section */}
                    <div className="bg-stone-50/70 p-4 border-t border-stone-100 space-y-2.5">
                      {post.comments.map((c) => {
                        const cAuthor = getMember(c.authorId);
                        const authorName =
                          c.authorName || cAuthor?.name || "Thành viên";
                        const authorAvatar =
                          c.authorAvatar || cAuthor?.avatar || "";
                        const isOwnComment =
                          c.authorId === currentMember.id ||
                          c.authorId === currentMember.username ||
                          (cAuthor && cAuthor.id === currentMember.id) ||
                          currentMember.isAdmin ||
                          currentMember.username === "lamhuetrung";
                        const isEditingThisComment =
                          editingComment?.postId === post.id &&
                          editingComment?.commentId === c.id;

                        return (
                          <div
                            key={c.id}
                            className="flex items-start gap-2.5 text-xs group/comment"
                          >
                            <Avatar
                              src={authorAvatar}
                              name={authorName}
                              size="xs"
                            />
                            <div className="bg-white p-2.5 rounded-2xl border border-stone-200/60 flex-1 shadow-2xs">
                              <div className="flex items-center justify-between gap-1">
                                <span className="font-bold text-stone-900">
                                  {authorName}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] text-stone-400">
                                    {new Date(c.createdAt).toLocaleTimeString(
                                      [],
                                      {
                                        hour: "2-digit",
                                        minute: "2-digit",
                                      },
                                    )}
                                  </span>
                                  {isOwnComment && !isEditingThisComment && (
                                    <div className="flex items-center gap-0.5 opacity-80 group-hover/comment:opacity-100 transition">
                                      {onEditComment && (
                                        <button
                                          onClick={() =>
                                            setEditingComment({
                                              postId: post.id,
                                              commentId: c.id,
                                              text: c.content,
                                            })
                                          }
                                          title="Chỉnh sửa bình luận"
                                          className="p-0.5 text-stone-400 hover:text-orange-600 rounded-md transition"
                                        >
                                          <Edit3 className="w-3 h-3" />
                                        </button>
                                      )}
                                      {onDeleteComment && (
                                        <button
                                          onClick={() => {
                                            if (
                                              window.confirm(
                                                "Bạn có chắc muốn xóa bình luận này?",
                                              )
                                            ) {
                                              onDeleteComment(post.id, c.id);
                                            }
                                          }}
                                          title="Xóa bình luận"
                                          className="p-0.5 text-stone-400 hover:text-rose-600 rounded-md transition"
                                        >
                                          <Trash2 className="w-3 h-3" />
                                        </button>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {isEditingThisComment ? (
                                <div className="mt-1.5 space-y-1.5">
                                  <input
                                    type="text"
                                    value={editingComment.text}
                                    onChange={(e) =>
                                      setEditingComment({
                                        ...editingComment,
                                        text: e.target.value,
                                      })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter")
                                        handleSaveEditComment();
                                      if (e.key === "Escape")
                                        setEditingComment(null);
                                    }}
                                    autoFocus
                                    className="w-full text-xs bg-stone-50 border border-orange-300 rounded-xl px-2.5 py-1.5 text-stone-900 focus:outline-hidden focus:ring-1 focus:ring-orange-500"
                                  />
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => setEditingComment(null)}
                                      className="px-2 py-0.5 text-[10px] text-stone-500 hover:bg-stone-100 rounded-md transition"
                                    >
                                      Hủy
                                    </button>
                                    <button
                                      onClick={handleSaveEditComment}
                                      className="px-2.5 py-0.5 text-[10px] bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-md transition"
                                    >
                                      Lưu
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <p className="text-stone-700 mt-0.5">
                                  {c.content}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Add Comment Input */}
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={commentInputs[post.id] || ""}
                          onChange={(e) =>
                            setCommentInputs({
                              ...commentInputs,
                              [post.id]: e.target.value,
                            })
                          }
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSendComment(post.id);
                          }}
                          placeholder="Viết lời nhắn cho bài đăng này..."
                          className="flex-1 text-xs bg-white border border-stone-200 rounded-full px-3.5 py-2 text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:border-orange-500"
                        />
                        <button
                          onClick={() => handleSendComment(post.id)}
                          className="w-8 h-8 rounded-full bg-orange-600 text-white flex items-center justify-center shrink-0 hover:bg-orange-700 transition active:scale-95"
                        >
                          <Send className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: TIMELINE MILESTONES (2020 - 2026) --- */}
      {activeTab === "timeline" && (
        <div className="space-y-4">
          <div className="p-3 bg-amber-50/80 rounded-2xl border border-amber-200/70 text-xs text-amber-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Dòng thời gian lưu giữ những mốc son đáng nhớ của các thế hệ.
              </span>
            </div>
            <button
              onClick={() => setShowAddMilestoneModal(true)}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 shrink-0 transition active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm mốc</span>
            </button>
          </div>

          <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-300">
            {milestones.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-stone-200/70 text-center space-y-2">
                <p className="text-xs text-stone-500 font-medium">
                  Chưa có mốc sự kiện nào trong dòng thời gian.
                </p>
                <button
                  onClick={() => setShowAddMilestoneModal(true)}
                  className="px-4 py-2 bg-orange-50 text-orange-700 text-xs font-bold rounded-xl hover:bg-orange-100 transition"
                >
                  + Thêm mốc kỷ niệm đầu tiên
                </button>
              </div>
            ) : (
              milestones.map((milestone) => (
                <div key={milestone.id} className="relative group">
                  {/* Timeline Dot */}
                  <div className="absolute -left-6 top-1.5 w-3.5 h-3.5 rounded-full bg-orange-600 ring-4 ring-[#FFFBF7]" />

                  <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                        Năm {milestone.year}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-stone-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-stone-400" />
                          {milestone.location}
                        </span>
                        {onDeleteMilestone && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (
                                window.confirm(
                                  `Bạn có chắc muốn xóa mốc sự kiện "${milestone.title}"?`,
                                )
                              ) {
                                onDeleteMilestone(milestone.id);
                              }
                            }}
                            title="Xóa sự kiện"
                            className="p-1 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm font-bold text-stone-900">
                      {milestone.title}
                    </h3>
                    <p className="text-xs text-stone-600 leading-relaxed">
                      {milestone.description}
                    </p>

                    {/* AI Memory Narrative */}
                    {milestone.aiStorySummary && (
                      <div className="p-2.5 bg-amber-50/60 rounded-xl border border-amber-100/80 text-[11px] text-stone-700 flex items-start gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="italic">{milestone.aiStorySummary}</p>
                      </div>
                    )}

                    {/* Milestone Photos */}
                    {milestone.photos && milestone.photos.length > 0 && (
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        {milestone.photos.map((photo, i) => (
                          <img
                            key={i}
                            src={photo}
                            alt={milestone.title}
                            onClick={() => setLightboxPhoto(photo)}
                            className="w-full h-32 object-cover rounded-xl cursor-pointer hover:opacity-95 transition"
                            loading="lazy"
                            referrerPolicy="no-referrer"
                          />
                        ))}
                      </div>
                    )}

                    {/* Tagged Members */}
                    {milestone.taggedMemberIds &&
                      milestone.taggedMemberIds.length > 0 && (
                        <div className="flex items-center gap-1 pt-1 overflow-x-auto no-scrollbar">
                          <span className="text-[10px] text-stone-400 mr-1">
                            Có mặt:
                          </span>
                          {milestone.taggedMemberIds.map((mId) => {
                            const m = getMember(mId);
                            return m ? (
                              <span
                                key={mId}
                                onClick={() => onOpenMemberProfile(mId)}
                                className="text-[10px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium shrink-0 cursor-pointer hover:bg-stone-200"
                              >
                                {m.name}
                              </span>
                            ) : null;
                          })}
                        </div>
                      )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* --- TAB 3: ALBUMS GRID --- */}
      {activeTab === "albums" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-stone-700 uppercase tracking-wider">
              Album Ảnh Gia Đình ({albums.length})
            </h3>
            <button
              onClick={() => setShowCreateAlbumModal(true)}
              className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs flex items-center gap-1 transition active:scale-95 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Tạo Album Mới</span>
            </button>
          </div>

          {albums.length === 0 ? (
            <div className="p-8 bg-white rounded-3xl border border-stone-200/70 text-center space-y-2">
              <p className="text-xs text-stone-500 font-medium">
                Chưa có album ảnh nào. Hãy tạo album lưu giữ kỷ niệm đầu tiên!
              </p>
              <button
                onClick={() => setShowCreateAlbumModal(true)}
                className="px-4 py-2 bg-orange-50 text-orange-700 text-xs font-bold rounded-xl hover:bg-orange-100 transition"
              >
                + Tạo Album Đầu Tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {albums.map((album) => (
                <div
                  key={album.id}
                  onClick={() => setSelectedAlbum(album)}
                  className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden cursor-pointer group active:scale-98 transition relative"
                >
                  <div className="relative h-36 overflow-hidden">
                    <img
                      src={album.coverUrl}
                      alt={album.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    <span className="absolute top-2 right-2 bg-stone-900/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-xs">
                      {album.photos?.length || album.photoCount || 0} ảnh
                    </span>
                    {onDeleteAlbum && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              `Bạn có chắc muốn xóa album "${album.title}"?`,
                            )
                          ) {
                            onDeleteAlbum(album.id);
                          }
                        }}
                        title="Xóa album"
                        className="absolute top-2 left-2 p-1.5 bg-stone-900/60 hover:bg-rose-600 text-white rounded-full backdrop-blur-xs transition"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                  <div className="p-3">
                    <span className="text-[10px] font-bold text-orange-600 uppercase tracking-wider">
                      {album.category}
                    </span>
                    <h4 className="text-xs font-bold text-stone-900 truncate mt-0.5">
                      {album.title}
                    </h4>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Album Detail Modal with Add Photos */}
      <Modal
        isOpen={!!selectedAlbum}
        onClose={() => setSelectedAlbum(null)}
        title={selectedAlbum?.title}
      >
        {selectedAlbum && (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-stone-500 pb-2 border-b border-stone-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span>Chủ đề: {selectedAlbum.category}</span>
                <span>•</span>
                <span>{selectedAlbum.photos?.length || 0} ảnh</span>
              </div>
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-2.5 py-1 bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold rounded-lg text-[11px] flex items-center gap-1 transition">
                  {isUploadingPhotoToAlbum ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Plus className="w-3 h-3" />
                  )}
                  <span>Thêm ảnh</span>
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    disabled={isUploadingPhotoToAlbum}
                    className="hidden"
                    onChange={async (e) => {
                      const files = e.target.files;
                      if (!files || files.length === 0) return;
                      setIsUploadingPhotoToAlbum(true);
                      try {
                        const uploadPromises = Array.from(files).map((file) =>
                          api.uploadFile(file),
                        );
                        const urls = await Promise.all(uploadPromises);
                        urls.forEach((url) => {
                          if (onAddPhotoToAlbum) {
                            onAddPhotoToAlbum(selectedAlbum.id, {
                              url,
                              caption: "Ảnh gia đình",
                              date: new Date().toISOString().split("T")[0],
                              taggedMemberIds: [currentMember.id],
                            });
                          }
                        });
                        // update locally in modal
                        setSelectedAlbum((prev) =>
                          prev
                            ? {
                                ...prev,
                                photos: [
                                  ...urls.map((u) => ({
                                    id: "p-" + Date.now() + Math.random(),
                                    url: u,
                                    date: new Date()
                                      .toISOString()
                                      .split("T")[0],
                                    taggedMemberIds: [currentMember.id],
                                  })),
                                  ...prev.photos,
                                ],
                              }
                            : null,
                        );
                      } catch (err) {
                        console.error("Lỗi upload ảnh album:", err);
                      } finally {
                        setIsUploadingPhotoToAlbum(false);
                      }
                    }}
                  />
                </label>

                {onDeleteAlbum && (
                  <button
                    onClick={() => {
                      if (
                        window.confirm(
                          `Bạn có chắc muốn xóa toàn bộ album "${selectedAlbum.title}"?`,
                        )
                      ) {
                        const id = selectedAlbum.id;
                        setSelectedAlbum(null);
                        onDeleteAlbum(id);
                      }
                    }}
                    className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold rounded-lg text-[11px] flex items-center gap-1 transition"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Xóa Album</span>
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto">
              {selectedAlbum.photos && selectedAlbum.photos.length > 0 ? (
                selectedAlbum.photos.map((photo) => (
                  <div
                    key={photo.id}
                    onClick={() => setLightboxPhoto(photo.url)}
                    className="cursor-pointer group relative rounded-xl overflow-hidden"
                  >
                    <img
                      src={photo.url}
                      alt={photo.caption || "Ảnh album"}
                      className="w-full h-32 object-cover group-hover:scale-105 transition"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                    {onDeletePhotoFromAlbum && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (
                            window.confirm(
                              "Bạn có chắc muốn xóa ảnh này khỏi album?",
                            )
                          ) {
                            onDeletePhotoFromAlbum(selectedAlbum.id, photo.id);
                            setSelectedAlbum((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    photos: prev.photos.filter(
                                      (p) => p.id !== photo.id,
                                    ),
                                  }
                                : null,
                            );
                          }
                        }}
                        title="Xóa ảnh"
                        className="absolute top-1.5 right-1.5 p-1 bg-stone-900/70 hover:bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100 transition shadow-xs"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {photo.caption && (
                      <div className="absolute inset-x-0 bottom-0 bg-stone-900/70 p-1 text-[10px] text-white truncate px-2">
                        {photo.caption}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="col-span-2 p-6 text-center text-xs text-stone-400">
                  Album này chưa có ảnh. Hãy bấm "Thêm ảnh" ở trên!
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Tạo Album Mới */}
      <BottomSheet
        isOpen={showCreateAlbumModal}
        onClose={() => setShowCreateAlbumModal(false)}
        title="Tạo Album Ảnh Mới"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newAlbumTitle.trim() || !newAlbumCover) return;
            if (onCreateAlbum) {
              onCreateAlbum({
                title: newAlbumTitle.trim(),
                category: newAlbumCategory,
                coverUrl: newAlbumCover,
              });
            }
            setNewAlbumTitle("");
            setNewAlbumCover("");
            setShowCreateAlbumModal(false);
          }}
          className="space-y-4 text-xs"
        >
          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Tên Album *
            </label>
            <input
              type="text"
              required
              value={newAlbumTitle}
              onChange={(e) => setNewAlbumTitle(e.target.value)}
              placeholder="VD: Họp mặt Tết 2026, Du lịch Phú Quốc..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:border-orange-500 focus:bg-white text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Chủ đề danh mục
            </label>
            <select
              value={newAlbumCategory}
              onChange={(e) =>
                setNewAlbumCategory(e.target.value as MemoryAlbum["category"])
              }
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs font-medium"
            >
              <option value="Gia đình">Gia đình</option>
              <option value="Tết">Tết & Lễ hội</option>
              <option value="Du lịch">Du lịch & Dã ngoại</option>
              <option value="Sinh nhật">Sinh nhật & Giỗ chạp</option>
              <option value="Em bé">Con cháu & Em bé</option>
              <option value="Kỷ niệm">Kỷ niệm xưa</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Ảnh bìa Album *
            </label>
            <div className="flex items-center gap-3">
              {newAlbumCover ? (
                <div className="relative w-24 h-24 rounded-2xl overflow-hidden border border-stone-200">
                  <img
                    src={newAlbumCover}
                    alt="Bìa album"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setNewAlbumCover("")}
                    className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <label className="flex-1 border-2 border-dashed border-stone-300 hover:border-orange-500 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-stone-50 hover:bg-orange-50/50">
                  {isUploadingAlbumCover ? (
                    <Loader2 className="w-6 h-6 text-orange-600 animate-spin" />
                  ) : (
                    <>
                      <ImageIcon className="w-6 h-6 text-stone-400 mb-1" />
                      <span className="text-[11px] font-bold text-stone-600">
                        Chọn ảnh làm bìa
                      </span>
                    </>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    disabled={isUploadingAlbumCover}
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      setIsUploadingAlbumCover(true);
                      try {
                        const url = await api.uploadFile(file);
                        setNewAlbumCover(url);
                      } catch (err) {
                        console.error("Upload error:", err);
                      } finally {
                        setIsUploadingAlbumCover(false);
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <button
            type="submit"
            disabled={!newAlbumTitle.trim() || !newAlbumCover}
            className="w-full py-3 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 text-white font-bold rounded-2xl text-xs transition disabled:opacity-50 shadow-md shadow-orange-600/20 active:scale-98"
          >
            Tạo Album Ngay
          </button>
        </form>
      </BottomSheet>

      {/* Modal: Thêm Mốc Kỷ Niệm (Timeline) */}
      <BottomSheet
        isOpen={showAddMilestoneModal}
        onClose={() => setShowAddMilestoneModal(false)}
        title="Thêm Mốc Kỷ Niệm Dòng Thời Gian"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newMilestoneTitle.trim()) return;
            if (onAddMilestone) {
              onAddMilestone({
                year: Number(newMilestoneYear),
                date: new Date().toLocaleDateString("vi-VN"),
                title: newMilestoneTitle.trim(),
                location: newMilestoneLocation.trim() || "Tiểu Cần, Trà Vinh",
                description:
                  newMilestoneDesc.trim() ||
                  "Kỷ niệm đáng nhớ của đại gia đình.",
                coverUrl:
                  newMilestonePhotos[0] ||
                  "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop&q=80",
                photos:
                  newMilestonePhotos.length > 0
                    ? newMilestonePhotos
                    : [
                        "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop&q=80",
                      ],
                taggedMemberIds:
                  newMilestoneTagged.length > 0
                    ? newMilestoneTagged
                    : [currentMember.id],
              });
            }
            setNewMilestoneTitle("");
            setNewMilestoneLocation("");
            setNewMilestoneDesc("");
            setNewMilestonePhotos([]);
            setShowAddMilestoneModal(false);
          }}
          className="space-y-3.5 text-xs"
        >
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="font-bold text-stone-800 block mb-1">
                Năm *
              </label>
              <input
                type="number"
                required
                value={newMilestoneYear}
                onChange={(e) => setNewMilestoneYear(Number(e.target.value))}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-xs"
              />
            </div>
            <div className="col-span-2">
              <label className="font-bold text-stone-800 block mb-1">
                Địa điểm
              </label>
              <input
                type="text"
                value={newMilestoneLocation}
                onChange={(e) => setNewMilestoneLocation(e.target.value)}
                placeholder="VD: Tiểu Cần, Cần Thơ..."
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-xs"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Tiêu đề sự kiện *
            </label>
            <input
              type="text"
              required
              value={newMilestoneTitle}
              onChange={(e) => setNewMilestoneTitle(e.target.value)}
              placeholder="VD: Mừng thọ Ông Bà, Xây nhà mới..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Mô tả chi tiết
            </label>
            <textarea
              rows={3}
              value={newMilestoneDesc}
              onChange={(e) => setNewMilestoneDesc(e.target.value)}
              placeholder="Chia sẻ câu chuyện và cảm xúc về cột mốc này..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Hình ảnh đính kèm
            </label>
            <div className="flex items-center gap-2 flex-wrap">
              {newMilestonePhotos.map((p, idx) => (
                <div
                  key={idx}
                  className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-200"
                >
                  <img
                    src={p}
                    alt="Ảnh mốc"
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setNewMilestonePhotos((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                    className="absolute top-0.5 right-0.5 p-0.5 bg-black/60 rounded-full text-white"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              <label className="w-16 h-16 rounded-xl border-2 border-dashed border-stone-300 hover:border-orange-500 flex flex-col items-center justify-center cursor-pointer bg-stone-50">
                {isUploadingMilestonePhoto ? (
                  <Loader2 className="w-4 h-4 text-orange-600 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 text-stone-400" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploadingMilestonePhoto}
                  className="hidden"
                  onChange={async (e) => {
                    const files = e.target.files;
                    if (!files || files.length === 0) return;
                    setIsUploadingMilestonePhoto(true);
                    try {
                      const uploadPromises = Array.from(files).map((file) =>
                        api.uploadFile(file),
                      );
                      const urls = await Promise.all(uploadPromises);
                      setNewMilestonePhotos((prev) => [...prev, ...urls]);
                    } catch (err) {
                      console.error("Upload milestone photo error:", err);
                    } finally {
                      setIsUploadingMilestonePhoto(false);
                    }
                  }}
                />
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={!newMilestoneTitle.trim()}
            className="w-full py-3 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 text-white font-bold rounded-2xl text-xs transition disabled:opacity-50 shadow-md shadow-orange-600/20 active:scale-98"
          >
            Lưu Vào Dòng Thời Gian
          </button>
        </form>
      </BottomSheet>

      {/* Lightbox Photo Viewer */}
      {lightboxPhoto && (
        <div className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4 animate-fade-in">
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 text-white p-2 rounded-full bg-white/20 hover:bg-white/30 transition"
            aria-label="Đóng ảnh"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxPhoto}
            alt="Xem ảnh lớn"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl"
          />
        </div>
      )}
    </div>
  );
};
