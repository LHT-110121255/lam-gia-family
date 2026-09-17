import React, { useState, useEffect } from 'react';
import {
  FamilyInfo,
  FamilyMember,
  CalendarEvent,
  SharedTaskList,
  FamilyPost,
  OnThisDayItem,
} from '../../types';
import { Avatar } from '../common/Avatar';
import { ImageWithFallback } from '../common/ImageWithFallback';
import { PostSkeleton } from '../common/PostSkeleton';
import {
  Calendar,
  Gift,
  CheckCircle2,
  Circle,
  Heart,
  Camera,
  MapPin,
  MessageCircle,
  Smile,
  ChevronDown,
  ChevronUp,
  Edit3,
  Trash2,
  Send,
  ThumbsUp,
} from 'lucide-react';

interface HomeScreenProps {
  familyInfo: FamilyInfo;
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  events: CalendarEvent[];
  tasks: SharedTaskList[];
  posts: FamilyPost[];
  onThisDay: OnThisDayItem;
  onNavigateTab: (tab: 'family' | 'memories' | 'calendar' | 'more') => void;
  onOpenMemberProfile: (memberId: string) => void;
  onOpenEventDetail: (event: CalendarEvent) => void;
  onToggleTaskItem: (listId: string, itemId: string) => void;
  onOpenCreatePost: () => void;
  onEditPost?: (post: FamilyPost) => void;
  onDeletePost?: (postId: string) => void;
  onToggleLike?: (postId: string) => void;
  onAddComment?: (postId: string, content: string) => void;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  familyInfo,
  currentMember,
  allMembers,
  events,
  tasks,
  posts,
  onThisDay,
  onNavigateTab,
  onOpenMemberProfile,
  onOpenEventDetail,
  onToggleTaskItem,
  onOpenCreatePost,
  onEditPost,
  onDeletePost,
  onToggleLike,
  onAddComment,
}) => {
  // Skeleton loading effect on initial screen render or state refresh
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Collapsible Widgets State (collapsed by default for clean home view, or openable)
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isTasksOpen, setIsTasksOpen] = useState(false);

  // Interactive Comments & Reactions State
  const [commentInputMap, setCommentInputMap] = useState<Record<string, string>>({});
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [activeReactionPickerPostId, setActiveReactionPickerPostId] = useState<string | null>(null);
  const [postReactionsMap, setPostReactionsMap] = useState<Record<string, string>>({});

  // Events logic
  const now = new Date();
  const todayDateStr = now.toISOString().split('T')[0];
  const todayEvents = events.filter((e) => e.date === todayDateStr);
  const upcomingEvents = events.filter((e) => e.date > todayDateStr).slice(0, 2);
  const birthdayEvent = events.find((e) => e.type === 'birthday');
  const totalEventsCount = todayEvents.length + upcomingEvents.length + (birthdayEvent ? 1 : 0);

  // Pending tasks summary
  const pendingTasksList: { listId: string; item: any }[] = [];
  tasks.forEach((list) => {
    list.items
      .filter((i) => !i.completed)
      .forEach((item) => {
        if (pendingTasksList.length < 4) {
          pendingTasksList.push({ listId: list.id, item });
        }
      });
  });

  const handleSendComment = (postId: string) => {
    const text = commentInputMap[postId]?.trim();
    if (!text) return;
    if (onAddComment) {
      onAddComment(postId, text);
    }
    setCommentInputMap((prev) => ({ ...prev, [postId]: '' }));
  };

  const handleSelectReaction = (postId: string, reactionType: string) => {
    setPostReactionsMap((prev) => ({
      ...prev,
      [postId]: prev[postId] === reactionType ? '' : reactionType,
    }));
    if (onToggleLike) {
      onToggleLike(postId);
    }
    setActiveReactionPickerPostId(null);
  };

  return (
    <div className="space-y-3 pb-20 w-full max-w-full px-3.5 pt-2">
      {/* 1. TOP COLLAPSIBLE WIDGETS (Lịch hôm nay & Việc chung gia đình) */}
      <div className="grid grid-cols-1 gap-2.5">
        {/* Widget 1: Today's Schedule & Events (Collapsible Accordion) */}
        <section className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden transition-all">
          <button
            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
            className="w-full p-3.5 flex items-center justify-between bg-white hover:bg-stone-50/80 transition text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-stone-900 tracking-tight">
                  Lịch hôm nay & Sắp tới
                </h3>
                <p className="text-[10px] text-stone-500 font-medium truncate">
                  {totalEventsCount > 0
                    ? `${totalEventsCount} lịch trình đang chờ`
                    : 'Không có lịch đột xuất'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded-full border border-orange-200/60">
                {todayEvents.length > 0 ? `${todayEvents.length} hôm nay` : 'Xem lịch'}
              </span>
              {isCalendarOpen ? (
                <ChevronUp className="w-4 h-4 text-stone-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone-400" />
              )}
            </div>
          </button>

          {isCalendarOpen && (
            <div className="p-3.5 pt-0 border-t border-stone-100 space-y-2.5 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  Chi tiết lịch trình
                </span>
                <button
                  onClick={() => onNavigateTab('calendar')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  Xem tất cả lịch
                </button>
              </div>

              {birthdayEvent && (
                <div
                  onClick={() => onOpenEventDetail(birthdayEvent)}
                  className="bg-linear-to-r from-rose-50 to-pink-50 border border-rose-200/80 rounded-2xl p-2.5 flex items-center justify-between cursor-pointer active:scale-98"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center shrink-0">
                      <Gift className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <span className="text-xs font-bold text-rose-950 truncate block">
                        Sắp đến: {birthdayEvent.title}
                      </span>
                      <span className="text-[10px] text-rose-700 truncate block">
                        Tổ chức tại Nhà hàng lúc 18:00
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-rose-200 text-rose-800 font-bold px-2 py-0.5 rounded-full shrink-0">
                    5 ngày nữa
                  </span>
                </div>
              )}

              <div className="space-y-1.5">
                {todayEvents.length > 0 ? (
                  todayEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => onOpenEventDetail(ev)}
                      className="p-2.5 rounded-2xl bg-orange-50/80 border border-orange-100 flex items-center justify-between cursor-pointer hover:bg-orange-100/70 transition"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-2 h-2 rounded-full bg-orange-600 shrink-0" />
                        <span className="text-xs font-bold text-stone-900 truncate">
                          {ev.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-bold text-orange-800 bg-orange-200/70 px-2 py-0.5 rounded-full shrink-0">
                        Hôm nay
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-500 italic py-1">
                    Hôm nay gia đình không có sự kiện phát sinh.
                  </p>
                )}

                {upcomingEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => onOpenEventDetail(ev)}
                    className="p-2 rounded-xl bg-stone-50 hover:bg-stone-100 border border-stone-200/60 flex items-center justify-between text-xs cursor-pointer transition"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                      <span className="font-medium text-stone-800 truncate">{ev.title}</span>
                    </div>
                    <span className="text-[11px] text-stone-500 shrink-0">
                      {ev.date.split('-').slice(1).reverse().join('/')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Widget 2: Family Tasks Checklists (Collapsible Accordion) */}
        <section className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden transition-all">
          <button
            onClick={() => setIsTasksOpen(!isTasksOpen)}
            className="w-full p-3.5 flex items-center justify-between bg-white hover:bg-stone-50/80 transition text-left"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-stone-900 tracking-tight">
                  Việc chung gia đình
                </h3>
                <p className="text-[10px] text-stone-500 font-medium truncate">
                  {pendingTasksList.length > 0
                    ? `${pendingTasksList.length} công việc cần thực hiện`
                    : 'Tất cả công việc đã hoàn thành!'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-200/60">
                {pendingTasksList.length} việc
              </span>
              {isTasksOpen ? (
                <ChevronUp className="w-4 h-4 text-stone-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-stone-400" />
              )}
            </div>
          </button>

          {isTasksOpen && (
            <div className="p-3.5 pt-0 border-t border-stone-100 space-y-2 animate-in fade-in slide-in-from-top-1">
              <div className="flex items-center justify-between pt-2">
                <span className="text-[10px] uppercase font-bold text-stone-400 tracking-wider">
                  Danh sách cần mua / chuẩn bị
                </span>
                <button
                  onClick={() => onNavigateTab('more')}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700"
                >
                  Tất cả công việc
                </button>
              </div>

              <div className="space-y-1.5">
                {pendingTasksList.length > 0 ? (
                  pendingTasksList.map(({ listId, item }) => (
                    <div
                      key={item.id}
                      onClick={() => onToggleTaskItem(listId, item.id)}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200/60 transition cursor-pointer active:scale-99"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        {item.completed ? (
                          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Circle className="w-4.5 h-4.5 text-stone-400 shrink-0" />
                        )}
                        <span
                          className={`text-xs ${
                            item.completed
                              ? 'line-through text-stone-400'
                              : 'font-semibold text-stone-800'
                          } truncate`}
                        >
                          {item.title}
                        </span>
                      </div>
                      {item.quantity && (
                        <span className="text-[10px] bg-stone-200/70 text-stone-700 font-bold px-2 py-0.5 rounded-full shrink-0">
                          {item.quantity}
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-stone-500 italic py-1">
                    Không có công việc nào đang chờ xử lý.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* 2. FACEBOOK-STYLE STATUS COMPOSER BOX */}
      <section className="bg-white rounded-3xl p-3.5 border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex items-center gap-3">
          <Avatar src={currentMember.avatar} name={currentMember.name} size="md" />
          <button
            onClick={onOpenCreatePost}
            className="flex-1 bg-stone-100 hover:bg-stone-200/70 text-stone-600 text-xs font-medium py-2.5 px-4 rounded-full text-left transition active:scale-99 border border-stone-200/50 truncate"
          >
            {currentMember.name.split(' ').slice(-1)[0]} ơi, hôm nay gia đình mình có gì mới?
          </button>
        </div>

        <div className="flex items-center justify-around pt-2.5 border-t border-stone-100 text-xs font-semibold text-stone-700">
          <button
            onClick={onOpenCreatePost}
            className="flex items-center gap-1.5 hover:text-orange-600 transition active:scale-95 py-1 px-2 rounded-xl hover:bg-stone-50"
          >
            <Camera className="w-4 h-4 text-emerald-500" />
            <span>Ảnh / Video</span>
          </button>
          <div className="w-[1px] h-4 bg-stone-200" />
          <button
            onClick={onOpenCreatePost}
            className="flex items-center gap-1.5 hover:text-orange-600 transition active:scale-95 py-1 px-2 rounded-xl hover:bg-stone-50"
          >
            <Smile className="w-4 h-4 text-amber-500" />
            <span>Cảm xúc</span>
          </button>
          <div className="w-[1px] h-4 bg-stone-200" />
          <button
            onClick={onOpenCreatePost}
            className="flex items-center gap-1.5 hover:text-orange-600 transition active:scale-95 py-1 px-2 rounded-xl hover:bg-stone-50"
          >
            <MapPin className="w-4 h-4 text-rose-500" />
            <span>Định vị</span>
          </button>
        </div>
      </section>

      {/* 3. RICH FACEBOOK FEED STREAM SECTION */}
      <section className="space-y-3 pt-1">
        {isLoading ? (
          /* SKELETON FEED CARDS */
          <div className="space-y-3">
            <PostSkeleton />
            <PostSkeleton />
          </div>
        ) : posts.length === 0 ? (
          <div className="bg-white rounded-3xl p-6 text-center border border-stone-200/70 space-y-2">
            <Camera className="w-8 h-8 text-stone-300 mx-auto" />
            <p className="text-xs text-stone-500 font-medium">Chưa có bài viết hay kỷ niệm nào.</p>
            <button
              onClick={onOpenCreatePost}
              className="px-4 py-2 bg-orange-600 text-white text-xs font-bold rounded-xl shadow-xs"
            >
              Chia sẻ khoảnh khắc đầu tiên
            </button>
          </div>
        ) : (
          posts.map((post) => {
            const author = allMembers.find((m) => m.id === post.authorId || m.username === post.authorId);
            const isOwnPost = post.authorId === currentMember.id;
            const currentPostReaction = postReactionsMap[post.id];
            const isLiked = (post.likes && post.likes.includes(currentMember.id)) || !!currentPostReaction;
            const mediaList = post.mediaUrls || (post.photos ? post.photos : []);

            return (
              <article key={post.id} className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3 relative overflow-hidden">
                {/* Author Info Header & Post Actions (Clean Fixed Layout) */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <Avatar
                      src={post.authorAvatar || author?.avatar || ''}
                      name={post.authorName || author?.name || 'Thành viên'}
                      size="md"
                      className="shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-xs font-bold text-stone-900 truncate max-w-[130px] sm:max-w-none">
                          {post.authorName || author?.name}
                        </h4>
                        {author?.relationship && (
                          <span className="text-[10px] bg-orange-100 text-orange-800 font-bold px-2 py-0.5 rounded-full leading-none shrink-0">
                            {author.relationship}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-stone-400 mt-0.5 flex-wrap">
                        <span className="shrink-0">
                          {post.createdAt ? new Date(post.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong'}
                        </span>
                        {post.feeling && (
                          <>
                            <span className="shrink-0">•</span>
                            <span className="text-amber-700 font-medium truncate max-w-[140px]">
                              đang cảm thấy {post.feeling}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Header Right Actions: Location & Edit/Delete Buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    {post.location && (
                      <span
                        className="text-[10px] text-stone-600 bg-stone-100 font-medium px-2 py-0.5 rounded-full flex items-center gap-1 max-w-[110px] truncate"
                        title={post.location}
                      >
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate">{post.location}</span>
                      </span>
                    )}

                    {(isOwnPost || onEditPost || onDeletePost) && (
                      <div className="flex items-center gap-0.5 shrink-0">
                        {onEditPost && (
                          <button
                            onClick={() => onEditPost(post)}
                            className="p-1.5 text-stone-400 hover:text-orange-600 rounded-xl hover:bg-stone-100 transition"
                            title="Chỉnh sửa bài viết"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {onDeletePost && (
                          <button
                            onClick={() => {
                              if (window.confirm('Bạn có chắc muốn xóa bài đăng này?')) {
                                onDeletePost(post.id);
                              }
                            }}
                            className="p-1.5 text-stone-400 hover:text-red-600 rounded-xl hover:bg-stone-100 transition"
                            title="Xóa bài viết"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Post Text Content */}
                {post.content && (
                  <p className="text-xs text-stone-800 leading-relaxed font-medium whitespace-pre-wrap">
                    {post.content}
                  </p>
                )}

                {/* Facebook Media Grid Display with ImageWithFallback */}
                {mediaList.length > 0 && (
                  <div
                    className={`grid gap-1.5 rounded-2xl overflow-hidden ${
                      mediaList.length === 1
                        ? 'grid-cols-1 max-h-80'
                        : mediaList.length === 2
                        ? 'grid-cols-2 max-h-64'
                        : 'grid-cols-2 max-h-72'
                    }`}
                  >
                    {mediaList.slice(0, 4).map((photoUrl, idx) => (
                      <div key={idx} className="relative w-full h-full min-h-[140px]">
                        <ImageWithFallback
                          src={photoUrl}
                          alt="Khoảnh khắc gia đình"
                          className="w-full h-full object-cover rounded-xl"
                        />
                        {idx === 3 && mediaList.length > 4 && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center text-white font-extrabold text-base rounded-xl pointer-events-none">
                            +{mediaList.length - 4}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Post Reaction & Interaction Bar */}
                <div className="pt-2 border-t border-stone-100 space-y-2">
                  <div className="flex items-center justify-between text-xs relative">
                    {/* Reaction Button with Popover */}
                    <div className="relative">
                      {/* Emojis Reaction Picker Popover */}
                      {activeReactionPickerPostId === post.id && (
                        <div className="absolute bottom-full left-0 mb-2 bg-white rounded-full p-1.5 shadow-xl border border-stone-200/80 flex items-center gap-2 z-30 animate-in fade-in zoom-in-95">
                          <button
                            onClick={() => handleSelectReaction(post.id, 'like')}
                            className="text-lg hover:scale-125 transition active:scale-90"
                            title="Thích"
                          >
                            👍
                          </button>
                          <button
                            onClick={() => handleSelectReaction(post.id, 'love')}
                            className="text-lg hover:scale-125 transition active:scale-90"
                            title="Yêu thích"
                          >
                            ❤️
                          </button>
                          <button
                            onClick={() => handleSelectReaction(post.id, 'haha')}
                            className="text-lg hover:scale-125 transition active:scale-90"
                            title="Haha"
                          >
                            😆
                          </button>
                          <button
                            onClick={() => handleSelectReaction(post.id, 'sad')}
                            className="text-lg hover:scale-125 transition active:scale-90"
                            title="Buồn"
                          >
                            😢
                          </button>
                          <button
                            onClick={() => handleSelectReaction(post.id, 'angry')}
                            className="text-lg hover:scale-125 transition active:scale-90"
                            title="Phẫn"
                          >
                            😡
                          </button>
                        </div>
                      )}

                      <button
                        onClick={() => {
                          if (onToggleLike) onToggleLike(post.id);
                        }}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          setActiveReactionPickerPostId(
                            activeReactionPickerPostId === post.id ? null : post.id
                          );
                        }}
                        className="flex items-center gap-1.5 text-stone-700 font-bold hover:text-rose-600 transition active:scale-95"
                      >
                        {currentPostReaction === 'love' || (!currentPostReaction && isLiked) ? (
                          <Heart className="w-4.5 h-4.5 fill-rose-500 text-rose-500" />
                        ) : currentPostReaction === 'haha' ? (
                          <span className="text-sm">😆</span>
                        ) : currentPostReaction === 'sad' ? (
                          <span className="text-sm">😢</span>
                        ) : currentPostReaction === 'angry' ? (
                          <span className="text-sm">😡</span>
                        ) : currentPostReaction === 'like' ? (
                          <ThumbsUp className="w-4.5 h-4.5 text-blue-600 fill-blue-600" />
                        ) : (
                          <Heart className="w-4.5 h-4.5 text-stone-400" />
                        )}
                        <span>
                          {currentPostReaction
                            ? currentPostReaction.toUpperCase()
                            : `${post.likes?.length || 0} cảm xúc`}
                        </span>
                      </button>
                    </div>

                    <button
                      onClick={() =>
                        setActiveCommentPostId(activeCommentPostId === post.id ? null : post.id)
                      }
                      className="flex items-center gap-1.5 text-stone-600 font-bold hover:text-orange-600 transition"
                    >
                      <MessageCircle className="w-4 h-4 text-stone-400" />
                      <span>{post.comments?.length || 0} bình luận</span>
                    </button>
                  </div>

                  {/* Inline Comments Drawer & Input Box */}
                  {(activeCommentPostId === post.id || (post.comments && post.comments.length > 0)) && (
                    <div className="bg-stone-50 rounded-2xl p-2.5 space-y-2 mt-2 border border-stone-100">
                      {post.comments && post.comments.length > 0 && (
                        <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                          {post.comments.map((c) => (
                            <div key={c.id} className="flex items-start gap-2 text-xs">
                              <Avatar src={c.authorAvatar} name={c.authorName} size="xs" />
                              <div className="bg-white rounded-2xl p-2 border border-stone-200/60 shadow-2xs flex-1">
                                <span className="font-bold text-stone-900 block text-[11px]">
                                  {c.authorName}
                                </span>
                                <p className="text-stone-700 text-xs font-medium mt-0.5">
                                  {c.content}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment Input Box */}
                      <div className="flex items-center gap-2 pt-1">
                        <Avatar src={currentMember.avatar} name={currentMember.name} size="xs" />
                        <div className="flex-1 flex items-center bg-white rounded-full border border-stone-200 px-3 py-1.5">
                          <input
                            type="text"
                            value={commentInputMap[post.id] || ''}
                            onChange={(e) =>
                              setCommentInputMap((prev) => ({ ...prev, [post.id]: e.target.value }))
                            }
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSendComment(post.id);
                            }}
                            placeholder="Viết bình luận gia đình..."
                            className="w-full text-xs text-stone-800 bg-transparent focus:outline-hidden"
                          />
                          <button
                            onClick={() => handleSendComment(post.id)}
                            className="text-orange-600 hover:text-orange-700 p-1"
                          >
                            <Send className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </section>
    </div>
  );
};
