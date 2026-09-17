import React, { useState, useEffect } from "react";
import { BottomSheet } from "./BottomSheet";
import { FamilyMember, FamilyPost, PostPrivacy } from "../../types";
import { Avatar } from "./Avatar";
import {
  Camera,
  MapPin,
  Smile,
  Image as ImageIcon,
  Send,
  Sparkles,
  X,
  Loader2,
  Globe,
  Users,
  Shield,
  Lock,
  Edit3,
} from "lucide-react";
import { api } from "../../services/api";
import { LocationInput } from "./LocationInput";

interface CreatePostSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentMember: FamilyMember;
  editingPost?: FamilyPost | null;
  onPublishPost: (post: {
    content: string;
    feeling?: string;
    location?: string;
    mediaUrls: string[];
    privacy?: PostPrivacy;
  }) => void;
  onUpdatePost?: (postId: string, updates: Partial<FamilyPost>) => void;
}

const FEELINGS = [
  "Ấm áp 💖",
  "Hạnh phúc 😊",
  "Biết ơn 🙏",
  "Vui vẻ 🎉",
  "Nhớ cả nhà 🏡",
  "Tự hào 🌟",
];

const PRIVACY_OPTIONS: {
  id: PostPrivacy;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    id: "all",
    label: "Cả gia đình",
    desc: "Tất cả thành viên trong nhà đều xem được",
    icon: Globe,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    id: "parents",
    label: "Chỉ Tỉa Mẹ",
    desc: "Chỉ Tỉa & Mẹ và người đăng xem được",
    icon: Shield,
    color: "text-purple-600 bg-purple-50 border-purple-200",
  },
  {
    id: "siblings",
    label: "Anh Chị Em",
    desc: "Chỉ các con / anh chị em trong nhà",
    icon: Users,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    id: "private",
    label: "Chỉ mình tôi",
    desc: "Chế độ nhật ký cá nhân bí mật",
    icon: Lock,
    color: "text-stone-600 bg-stone-100 border-stone-200",
  },
];

export const CreatePostSheet: React.FC<CreatePostSheetProps> = ({
  isOpen,
  onClose,
  currentMember,
  editingPost,
  onPublishPost,
  onUpdatePost,
}) => {
  const [content, setContent] = useState("");
  const [feeling, setFeeling] = useState("Hạnh phúc 😊");
  const [location, setLocation] = useState("Nhà (Tiểu Cần, Vĩnh Long)");
  const [mediaUrls, setMediaUrls] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<PostPrivacy>("all");
  const [isUploading, setIsUploading] = useState(false);

  // Sync state with editingPost if provided, or reset
  useEffect(() => {
    if (editingPost) {
      setContent(editingPost.content || "");
      setFeeling(editingPost.feeling || "Hạnh phúc 😊");
      setLocation(editingPost.location || "");
      setMediaUrls(editingPost.mediaUrls || []);
      setPrivacy(editingPost.privacy || "all");
    } else {
      setContent("");
      setFeeling("Hạnh phúc 😊");
      setLocation("Nhà (Tiểu Cần, Vĩnh Long)");
      setMediaUrls([]);
      setPrivacy("all");
    }
  }, [editingPost, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() && mediaUrls.length === 0) return;

    if (editingPost && onUpdatePost) {
      onUpdatePost(editingPost.id, {
        content: content.trim(),
        feeling: feeling || undefined,
        location: location || undefined,
        mediaUrls,
        privacy,
      });
    } else {
      onPublishPost({
        content: content.trim(),
        feeling: feeling || undefined,
        location: location || undefined,
        mediaUrls,
        privacy,
      });
    }

    setContent("");
    setMediaUrls([]);
    onClose();
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file) =>
        api.uploadFile(file),
      );
      const uploadedUrls = await Promise.all(uploadPromises);
      setMediaUrls((prev) => [...uploadedUrls, ...prev]);
    } catch (err) {
      console.error("Upload file error:", err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemovePhoto = (urlToRemove: string) => {
    setMediaUrls((prev) => prev.filter((url) => url !== urlToRemove));
  };

  const isEditMode = !!editingPost;

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditMode
          ? "Chỉnh sửa bài viết & Kỷ niệm"
          : "Chia sẻ khoảnh khắc gia đình"
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Author Header */}
        <div className="flex items-center gap-2.5 bg-stone-50 p-2.5 rounded-2xl border border-stone-200/60">
          <Avatar
            src={currentMember.avatar}
            name={currentMember.name}
            size="sm"
          />
          <div className="flex-1">
            <span className="font-bold text-stone-900 block">
              {currentMember.name}
            </span>
            <span className="text-[10px] text-stone-500">
              {isEditMode
                ? "Đang cập nhật bài viết"
                : "Đăng lên bảng tin gia đình"}
            </span>
          </div>
          {isEditMode && (
            <span className="px-2.5 py-1 bg-amber-100 text-amber-900 font-bold rounded-lg text-[10px] flex items-center gap-1">
              <Edit3 className="w-3 h-3 text-amber-700" /> Sửa bài
            </span>
          )}
        </div>

        {/* Content text */}
        <textarea
          required
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Viết đôi lời nhắn gửi, tin vui hoặc kỷ niệm tới cả gia đình..."
          className="w-full p-3 bg-stone-50 border border-stone-200 rounded-2xl text-stone-900 text-xs focus:bg-white focus:border-orange-500 shadow-2xs"
        />

        {/* Privacy Selector */}
        <div className="space-y-1.5">
          <label className="font-bold text-stone-800 block">
            Quyền riêng tư bài viết:
          </label>
          <div className="grid grid-cols-2 gap-2">
            {PRIVACY_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isSelected = privacy === opt.id;
              return (
                <button
                  type="button"
                  key={opt.id}
                  onClick={() => setPrivacy(opt.id)}
                  className={`p-2 rounded-xl text-left border transition flex items-start gap-2 ${
                    isSelected
                      ? "bg-orange-50/90 border-orange-400 text-orange-950 shadow-2xs"
                      : "bg-stone-50/70 border-stone-200 text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <div
                    className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                      isSelected
                        ? "bg-orange-600 text-white"
                        : "bg-stone-200 text-stone-600"
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="font-bold text-[11px] block leading-tight truncate">
                      {opt.label}
                    </span>
                    <span className="text-[9px] text-stone-500 line-clamp-1">
                      {opt.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Feelings selector */}
        <div>
          <label className="font-bold text-stone-800 block mb-1">
            Cảm xúc hiện tại:
          </label>
          <div className="flex flex-wrap gap-1.5">
            {FEELINGS.map((f) => (
              <button
                type="button"
                key={f}
                onClick={() => setFeeling(f)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition ${
                  feeling === f
                    ? "bg-orange-600 text-white shadow-xs"
                    : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* Real File Upload & Review / Preview */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="font-bold text-stone-800 block">
              Hình ảnh đính kèm:
            </label>
            <span className="text-[10px] text-stone-500">
              {mediaUrls.length > 0
                ? `Đã chọn ${mediaUrls.length} ảnh`
                : "Chưa chọn ảnh"}
            </span>
          </div>

          <div className="flex items-center gap-2 mb-2">
            <label className="flex items-center gap-1.5 px-3.5 py-2.5 bg-orange-50 hover:bg-orange-100 border border-dashed border-orange-300 rounded-2xl cursor-pointer text-orange-700 font-bold transition active:scale-95 shadow-2xs">
              {isUploading ? (
                <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
              ) : (
                <Camera className="w-4 h-4 text-orange-600" />
              )}
              <span className="text-xs">
                {isUploading ? "Đang tải ảnh lên..." : "Tải ảnh từ thiết bị"}
              </span>
              <input
                type="file"
                accept="image/*"
                multiple
                disabled={isUploading}
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
              />
            </label>
          </div>

          {/* LIVE IMAGE PREVIEW GRID */}
          {mediaUrls.length > 0 && (
            <div className="space-y-1 mt-2">
              <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" /> Xem trước ảnh đính kèm:
              </span>
              <div className="grid grid-cols-3 gap-2 p-2 bg-stone-100/70 rounded-2xl border border-stone-200/80 max-h-48 overflow-y-auto">
                {mediaUrls.map((url, i) => (
                  <div
                    key={i}
                    className="relative group rounded-xl overflow-hidden border border-stone-300 bg-stone-200 aspect-square shadow-2xs"
                  >
                    <img
                      src={url}
                      alt={`Review ${i + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemovePhoto(url)}
                      className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 text-white flex items-center justify-center transition shadow-xs"
                      title="Xóa ảnh này"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded-md font-mono">
                      #{i + 1}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Location input with Map & Autocomplete */}
        <LocationInput
          label="Địa điểm:"
          value={location}
          onChange={(val) => setLocation(val)}
          placeholder="VD: Nhà (Tiểu Cần, Vĩnh Long)..."
        />

        <button
          type="submit"
          disabled={isUploading}
          className="w-full py-3 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl shadow-md shadow-orange-600/20 transition active:scale-95 flex items-center justify-center gap-2"
        >
          {isEditMode ? (
            <>
              <Edit3 className="w-4 h-4" />
              <span>Cập nhật bài viết</span>
            </>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Đăng khoảnh khắc lên bảng tin gia đình</span>
            </>
          )}
        </button>
      </form>
    </BottomSheet>
  );
};
