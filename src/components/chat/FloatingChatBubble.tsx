import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle,
  X,
  Maximize2,
  Minimize2,
  Send,
  Users,
  ChevronRight,
  Smile,
  CheckCheck,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { ChatRoom, ChatMessage, FamilyMember } from '../../types';
import { Avatar } from '../common/Avatar';
import { familyService } from '../../services/familyService';

interface FloatingChatBubbleProps {
  rooms: ChatRoom[];
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onOpenFullChat: (roomId?: string) => void;
  hidden?: boolean; // Ẩn khi đang ở Map, Full Chat hoặc modal toàn màn hình
}

export const FloatingChatBubble: React.FC<FloatingChatBubbleProps> = ({
  rooms,
  currentMember,
  allMembers,
  activeRoomId,
  onSelectRoom,
  onOpenFullChat,
  hidden = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string>(activeRoomId || 'room-all');
  const [quickMessageText, setQuickMessageText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const bubbleRef = useRef<HTMLDivElement>(null);

  // Tính tổng số tin nhắn chưa đọc
  const totalUnreadCount = rooms.reduce((acc, r) => acc + (r.unreadCount || 0), 0);

  const activeRoom = rooms.find((r) => r.id === selectedRoomId) || rooms[0] || {
    id: 'room-all',
    name: 'Đại Gia Đình Sum Vầy',
    memberIds: [],
  };

  const messages = familyService.getMessages(activeRoom.id);
  const recentMessages = messages.slice(-15); // Lấy 15 tin nhắn mới nhất để hiển thị nhanh

  const getMember = (memberId: string) => {
    return allMembers.find((m) => m.id === memberId);
  };

  const handleSendQuickMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickMessageText.trim() || isSending) return;

    setIsSending(true);
    familyService.sendMessage(activeRoom.id, {
      senderId: currentMember.id,
      text: quickMessageText.trim(),
    });

    setQuickMessageText('');
    setIsSending(false);
  };

  // Nếu thuộc tính hidden được kích hoạt (ví dụ đang ở Bản đồ hoặc màn hình Chat), ẩn hoàn toàn
  if (hidden) return null;

  return (
    <>
      {/* 1. FLOATING CHAT BUBBLE (DRAGGABLE & COMPACT) */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            ref={bubbleRef}
            drag
            dragMomentum={false}
            dragConstraints={{ left: -300, right: 20, top: -500, bottom: 20 }}
            initial={{ scale: 0, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0, opacity: 0, y: 20 }}
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => setIsOpen(true)}
            className="fixed z-40 bottom-24 right-4 cursor-pointer touch-none select-none"
            style={{ filter: 'drop-shadow(0 10px 20px rgba(249, 115, 22, 0.35))' }}
            title="Trò chuyện gia đình nhanh"
          >
            <div className="relative group">
              {/* Outer Glow & Gradient Bubble */}
              <div className="w-14 h-14 rounded-full bg-linear-to-tr from-orange-600 via-amber-500 to-orange-400 p-0.5 shadow-xl flex items-center justify-center text-white ring-4 ring-white/90 transition-transform">
                <div className="w-full h-full rounded-full bg-linear-to-tr from-orange-600 to-amber-500 flex items-center justify-center">
                  <MessageCircle className="w-7 h-7 fill-white/20 text-white transition-transform group-hover:scale-110" />
                </div>
              </div>

              {/* Unread Counter Badge */}
              {totalUnreadCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-white shadow-md animate-bounce">
                  {totalUnreadCount > 9 ? '9+' : totalUnreadCount}
                </span>
              )}

              {/* Mini Active Pulse Dot */}
              <span className="absolute bottom-0 right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full shadow-xs" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. FLOATING QUICK CHAT WINDOW (COMPACT POPUP OVERLAY) */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 40 }}
            transition={{ type: 'spring', damping: 25, stiffness: 350 }}
            className="fixed z-50 bottom-20 right-3 w-[340px] max-w-[calc(100vw-24px)] h-[480px] max-h-[75vh] bg-white rounded-3xl shadow-2xl border border-stone-200/90 flex flex-col overflow-hidden text-stone-900"
          >
            {/* Window Header */}
            <div className="px-3.5 py-2.5 bg-linear-to-r from-orange-600 to-amber-600 text-white flex items-center justify-between shrink-0 shadow-xs">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                  <MessageCircle className="w-4 h-4 text-white fill-white/20" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-black truncate">{activeRoom.name}</h4>
                  <p className="text-[10px] text-orange-100 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{activeRoom.memberIds?.length || 0} thành viên</span>
                  </p>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    onOpenFullChat(activeRoom.id);
                  }}
                  className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition active:scale-95"
                  title="Mở toàn màn hình"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-white/90 hover:text-white hover:bg-white/20 rounded-lg transition active:scale-95"
                  title="Thu nhỏ bong bóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Room Selector Pills */}
            <div className="px-2.5 py-1.5 bg-stone-50 border-b border-stone-200/70 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {rooms.map((room) => {
                const isCurrent = room.id === activeRoom.id;
                return (
                  <button
                    key={room.id}
                    onClick={() => {
                      setSelectedRoomId(room.id);
                      onSelectRoom(room.id);
                    }}
                    className={`px-2.5 py-1 rounded-xl text-[10px] font-bold shrink-0 transition flex items-center gap-1 border whitespace-nowrap ${
                      isCurrent
                        ? 'bg-orange-600 text-white border-orange-600 shadow-2xs'
                        : 'bg-white text-stone-700 hover:bg-stone-100 border-stone-200'
                    }`}
                  >
                    <span>{room.name}</span>
                    {room.unreadCount > 0 && !isCurrent && (
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Messages Mini Stream */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2 bg-[#FFFBF7] overscroll-contain text-xs">
              {recentMessages.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-4 text-stone-400 space-y-1">
                  <Users className="w-8 h-8 text-stone-300" />
                  <p className="text-[11px] font-medium">Chưa có tin nhắn trong phòng này</p>
                  <p className="text-[10px]">Gửi lời chào đầu tiên tới gia đình nhé!</p>
                </div>
              ) : (
                recentMessages.map((msg) => {
                  const isMe = msg.senderId === currentMember.id;
                  const sender = getMember(msg.senderId);

                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      {!isMe && (
                        <Avatar
                          src={sender?.avatar || ''}
                          name={sender?.name || 'Thành viên'}
                          size="xs"
                          className="shrink-0 mb-0.5"
                        />
                      )}

                      <div className="max-w-[78%] space-y-0.5">
                        {!isMe && (
                          <span className="text-[9px] font-bold text-stone-500 block pl-1">
                            {sender?.name}
                          </span>
                        )}

                        <div
                          className={`rounded-2xl px-2.5 py-1.5 text-xs shadow-2xs ${
                            msg.priority
                              ? 'bg-rose-50 border border-rose-300 text-rose-950 font-medium'
                              : isMe
                              ? 'bg-orange-600 text-white rounded-br-xs font-normal'
                              : 'bg-white text-stone-900 border border-stone-200/80 rounded-bl-xs'
                          }`}
                        >
                          {msg.mediaUrl && (
                            <img
                              src={msg.mediaUrl}
                              alt="media"
                              className="rounded-lg mb-1 max-h-28 w-full object-cover"
                            />
                          )}
                          <p className="break-words leading-relaxed">{msg.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={handleSendQuickMessage}
              className="p-2 bg-white border-t border-stone-200/80 flex items-center gap-1.5 shrink-0"
            >
              <input
                type="text"
                value={quickMessageText}
                onChange={(e) => setQuickMessageText(e.target.value)}
                placeholder="Nhập tin nhắn..."
                className="flex-1 px-3 py-2 bg-stone-100 border border-stone-200 rounded-2xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:bg-white transition"
              />

              <button
                type="submit"
                disabled={!quickMessageText.trim() || isSending}
                className="w-8 h-8 rounded-full bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white flex items-center justify-center shrink-0 transition active:scale-95 shadow-xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
