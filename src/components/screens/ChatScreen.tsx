import React, { useState, useEffect, useRef } from 'react';
import { ChatRoom, ChatMessage, FamilyMember } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  Send,
  AlertTriangle,
  Mic,
  Play,
  Pause,
  Image as ImageIcon,
  ChevronLeft,
  Users,
  CheckCheck,
  Plus,
  Search,
  MoreVertical,
  Pin,
  Trash2,
  Edit3,
  UserPlus,
  UserMinus,
  X,
  Shield,
  MessageCircle,
  Copy,
  Smile,
  LogOut,
  Camera,
  Loader2,
} from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';
import { Modal } from '../common/Modal';
import { api } from '../../services/api';
import { familyService } from '../../services/familyService';
import { socketService } from '../../services/socket';

interface ChatScreenProps {
  rooms: ChatRoom[];
  messages: ChatMessage[];
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  activeRoomId: string;
  onSelectRoom: (roomId: string) => void;
  onSendMessage: (
    roomId: string,
    message: {
      text: string;
      priority?: boolean;
      type?: ChatMessage['type'];
      mediaUrl?: string;
      mediaUrls?: string[];
    }
  ) => void;
  onToggleReaction: (roomId: string, messageId: string, emoji: string) => void;
  onDeleteMessage?: (roomId: string, messageId: string) => void;
  onPinMessage?: (roomId: string, messageId: string, text: string) => void;
  onUnpinMessage?: (roomId: string) => void;
  onCreateRoom?: (room: {
    name: string;
    type: ChatRoom['type'];
    memberIds: string[];
    description?: string;
  }) => void;
  onUpdateRoom?: (roomId: string, updates: Partial<ChatRoom>) => void;
  onDeleteRoom?: (roomId: string) => void;
  onAddMembersToRoom?: (roomId: string, memberIds: string[]) => void;
  onRemoveMemberFromRoom?: (roomId: string, memberId: string) => void;
  onBackToRooms?: () => void;
}

const ELDER_QUICK_MESSAGES = [
  'Bố mẹ đã ăn cơm chưa ạ? 🍚',
  'Con đang trên đường về nhà rồi nhé! 🛵',
  'Hôm nay trời trở gió, cả nhà nhớ mặc ấm nhé! 🧣',
  'Cả nhà ơi tối nay có ăn cơm đông đủ không? 🍲',
  'Con đã mua thuốc cho Ông Bà rồi nhé! 💊',
];

const REACTION_EMOJIS = ['❤️', '👍', '😂', '😮', '😢', '🙏'];

export const ChatScreen: React.FC<ChatScreenProps> = ({
  rooms,
  messages,
  currentMember,
  allMembers,
  activeRoomId,
  onSelectRoom,
  onSendMessage,
  onToggleReaction,
  onDeleteMessage,
  onPinMessage,
  onUnpinMessage,
  onCreateRoom,
  onUpdateRoom,
  onDeleteRoom,
  onAddMembersToRoom,
  onRemoveMemberFromRoom,
  onBackToRooms,
}) => {
  // Navigation State: 'list' (Rooms Hub) or 'room' (Inside specific Chat Room)
  const [viewMode, setViewMode] = useState<'list' | 'room'>('room');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'group' | 'direct'>('all');

  // Chat Input State
  const [inputText, setInputText] = useState('');
  const [isPriority, setIsPriority] = useState(false);
  const [uploadingImages, setUploadingImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [playingVoiceId, setPlayingVoiceId] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<string | null>(null);

  // Modals & BottomSheets State
  const [showCreateRoomModal, setShowCreateRoomModal] = useState(false);
  const [showRoomSettingsSheet, setShowRoomSettingsSheet] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);
  const [activeMessageMenuId, setActiveMessageMenuId] = useState<string | null>(null);

  // Create Room Form State
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomType, setNewRoomType] = useState<ChatRoom['type']>('custom');
  const [newRoomSelectedMembers, setNewRoomSelectedMembers] = useState<string[]>([]);
  const [newRoomDesc, setNewRoomDesc] = useState('');

  // Edit Room Form State
  const [editRoomName, setEditRoomName] = useState('');
  const [editRoomDesc, setEditRoomDesc] = useState('');
  const [isEditingRoomInfo, setIsEditingRoomInfo] = useState(false);

  // Selected Members to Add State
  const [selectedMembersToAdd, setSelectedMembersToAdd] = useState<string[]>([]);

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || rooms[0] || {
    id: 'room-all',
    name: 'Đại Gia Đình Họ Lâm',
    type: 'all' as const,
    memberIds: allMembers.map((m) => m.id),
    unreadCount: 0,
  };

  // Typing state
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const typingTimeoutRef = useRef<any>(null);

  // Connect socket and listen for typing events
  useEffect(() => {
    socketService.connect(currentMember.id);

    const unsubTyping = socketService.onUserTyping(({ roomId, userId, name }) => {
      if (roomId === activeRoom.id && userId !== currentMember.id) {
        setTypingUsers((prev) => ({ ...prev, [userId]: name }));
      }
    });

    const unsubStopTyping = socketService.onUserStopTyping(({ roomId, userId }) => {
      if (roomId === activeRoom.id) {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[userId];
          return next;
        });
      }
    });

    return () => {
      unsubTyping();
      unsubStopTyping();
    };
  }, [activeRoom.id, currentMember.id]);

  // Scroll to bottom and mark room as read when messages change
  useEffect(() => {
    if (viewMode === 'room') {
      socketService.joinRoom(activeRoom.id);
      familyService.markRoomAsRead(activeRoom.id);
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    }
  }, [messages, activeRoomId, viewMode, activeRoom.id]);

  // Sync active room name for editing
  useEffect(() => {
    if (activeRoom) {
      setEditRoomName(activeRoom.name);
      setEditRoomDesc(activeRoom.description || '');
    }
  }, [activeRoom]);

  const getMember = (id: string) => allMembers.find((m) => m.id === id);

  // Handle Input Change with typing indicator
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setInputText(val);

    if (val.trim()) {
      socketService.sendTyping(activeRoom.id, {
        userId: currentMember.id,
        name: currentMember.name,
      });
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      typingTimeoutRef.current = setTimeout(() => {
        socketService.sendStopTyping(activeRoom.id, currentMember.id);
      }, 2500);
    } else {
      socketService.sendStopTyping(activeRoom.id, currentMember.id);
    }
  };

  // Handle Send Message
  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && uploadingImages.length === 0) return;

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    socketService.sendStopTyping(activeRoom.id, currentMember.id);

    onSendMessage(activeRoom.id, {
      text: inputText.trim(),
      priority: isPriority,
      type: isPriority ? 'priority' : uploadingImages.length > 0 ? 'image' : 'text',
      mediaUrls: uploadingImages.length > 0 ? uploadingImages : undefined,
    });

    setInputText('');
    setUploadingImages([]);
    setIsPriority(false);
  };

  // Handle Image Upload
  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file) => api.uploadFile(file));
      const urls = await Promise.all(uploadPromises);
      setUploadingImages((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error('Lỗi tải ảnh chat:', err);
    } finally {
      setIsUploading(false);
    }
  };

  // Voice Simulation
  const handleSendVoiceSim = () => {
    onSendMessage(activeRoom.id, {
      text: 'Tin nhắn thoại (0:14s)',
      type: 'voice',
    });
  };

  // Handle Create Room
  const handleCreateRoomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim() || newRoomSelectedMembers.length === 0) return;

    if (onCreateRoom) {
      onCreateRoom({
        name: newRoomName.trim(),
        type: newRoomType,
        memberIds: newRoomSelectedMembers,
        description: newRoomDesc.trim() || undefined,
      });
    }

    setShowCreateRoomModal(false);
    setNewRoomName('');
    setNewRoomSelectedMembers([]);
    setNewRoomDesc('');
  };

  // Filtered Rooms
  const filteredRooms = rooms.filter((r) => {
    const matchSearch =
      !searchQuery.trim() ||
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (r.lastMessage && r.lastMessage.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchSearch) return false;

    if (filterType === 'group') return r.type !== 'direct';
    if (filterType === 'direct') return r.type === 'direct';
    return true;
  });

  return (
    <div className="flex flex-col h-full flex-1 w-full max-w-full pb-safe min-h-0 bg-[#FFFBF7] overflow-hidden select-none">
      {/* =========================================================================
          VIEW 1: ROOMS HUB & MANAGEMENT LIST
      ========================================================================= */}
      {viewMode === 'list' ? (
        <div className="flex flex-col h-full flex-1 min-h-0 bg-stone-50 overflow-hidden">
          {/* Header */}
          <div className="p-3 bg-white border-b border-stone-200/80 space-y-2.5 shrink-0 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {onBackToRooms && (
                  <button
                    onClick={onBackToRooms}
                    className="p-1.5 rounded-xl hover:bg-stone-100 text-stone-700 transition"
                    title="Quay lại tiện ích"
                  >
                    <ChevronLeft className="w-5 h-5 text-orange-600" />
                  </button>
                )}
                <div>
                  <h2 className="text-base font-bold text-stone-900 leading-tight">
                    Trò chuyện gia đình
                  </h2>
                  <p className="text-[11px] text-stone-500">
                    {rooms.length} phòng chat • Kết nối tức thì
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowCreateRoomModal(true)}
                className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-95 flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo phòng chat</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative bg-stone-100 rounded-xl flex items-center px-3 py-1.5 border border-stone-200/70">
              <Search className="w-4 h-4 text-stone-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm phòng chat, người thân, tin nhắn..."
                className="w-full bg-transparent text-xs text-stone-900 focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-0.5 text-stone-400 hover:text-stone-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 pt-0.5">
              <button
                onClick={() => setFilterType('all')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  filterType === 'all'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                Tất cả ({rooms.length})
              </button>
              <button
                onClick={() => setFilterType('group')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  filterType === 'group'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                Nhóm gia đình
              </button>
              <button
                onClick={() => setFilterType('direct')}
                className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                  filterType === 'direct'
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                }`}
              >
                Chat 1-1
              </button>
            </div>
          </div>

          {/* Rooms List Stream */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 overscroll-contain">
            {filteredRooms.length === 0 ? (
              <div className="p-8 bg-white rounded-3xl border border-stone-200/80 text-center space-y-2 mt-4">
                <MessageCircle className="w-8 h-8 text-stone-400 mx-auto" />
                <p className="text-xs text-stone-500 font-medium">
                  Không tìm thấy phòng trò chuyện nào phù hợp.
                </p>
                <button
                  onClick={() => setShowCreateRoomModal(true)}
                  className="px-4 py-2 bg-orange-50 text-orange-700 text-xs font-bold rounded-xl hover:bg-orange-100"
                >
                  + Tạo phòng trò chuyện mới
                </button>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isSelected = room.id === activeRoom.id;
                const membersInRoom = room.memberIds.map(getMember).filter(Boolean);

                return (
                  <div
                    key={room.id}
                    onClick={() => {
                      onSelectRoom(room.id);
                      setViewMode('room');
                    }}
                    className={`p-3 bg-white hover:bg-orange-50/50 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 shadow-2xs ${
                      isSelected
                        ? 'border-orange-300 ring-2 ring-orange-500/20'
                        : 'border-stone-200/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      {/* Room Avatar */}
                      <div className="relative shrink-0">
                        {room.avatar ? (
                          <img
                            src={room.avatar}
                            alt={room.name}
                            className="w-12 h-12 rounded-2xl object-cover border border-stone-200 shadow-2xs"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-2xl bg-linear-to-br from-orange-400 to-amber-600 flex items-center justify-center text-white font-bold text-base shadow-2xs">
                            {room.name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        {room.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center ring-2 ring-white">
                            {room.unreadCount}
                          </span>
                        )}
                      </div>

                      {/* Room Details */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="text-xs font-bold text-stone-900 truncate">
                            {room.name}
                          </h4>
                          <span className="text-[10px] text-stone-400 shrink-0 font-mono">
                            {room.lastMessageTime || ''}
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 truncate mt-0.5">
                          {room.lastMessage || 'Chưa có tin nhắn nào'}
                        </p>
                        <div className="flex items-center gap-1.5 mt-1 text-[10px] text-stone-400">
                          <Users className="w-3 h-3 text-stone-400" />
                          <span>{room.memberIds.length} thành viên</span>
                          {room.pinnedMessageText && (
                            <span className="flex items-center gap-0.5 text-amber-600 font-medium">
                              • <Pin className="w-2.5 h-2.5" /> Có ghim
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ) : (
        /* =========================================================================
            VIEW 2: ACTIVE CHAT ROOM (ZALO STYLE MESSAGING)
        ========================================================================= */
        <div className="flex flex-col h-full flex-1 min-h-0 bg-[#FFFBF7] overflow-hidden">
          {/* 1. Header with Room Switcher & Room Settings */}
          <div className="px-3 py-2.5 bg-white border-b border-stone-200/80 flex items-center justify-between shrink-0 gap-2 shadow-2xs">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button
                onClick={() => setViewMode('list')}
                className="p-1 text-stone-700 hover:text-orange-600 rounded-xl hover:bg-orange-50 active:scale-95 transition shrink-0 flex items-center gap-0.5 font-bold text-xs"
                title="Danh sách phòng"
              >
                <ChevronLeft className="w-5 h-5 text-orange-600 shrink-0" />
                <span className="hidden sm:inline">Phòng chat</span>
              </button>

              <div
                onClick={() => setShowRoomSettingsSheet(true)}
                className="min-w-0 flex-1 cursor-pointer hover:opacity-80 transition"
              >
                <h3 className="text-xs font-bold text-stone-900 truncate flex items-center gap-1.5">
                  <span>{activeRoom.name}</span>
                </h3>
                <p className="text-[10px] text-stone-500 flex items-center gap-1 truncate">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block shrink-0" />
                  <span>{activeRoom.memberIds.length} thành viên • Bấm xem cài đặt</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* Manage / Settings Button */}
              <button
                onClick={() => setShowRoomSettingsSheet(true)}
                className="p-2 text-stone-600 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition active:scale-95"
                title="Cài đặt & Quản lý phòng"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 3. Pinned Message Bar (If any) */}
          {activeRoom.pinnedMessageText && (
            <div className="px-3 py-1.5 bg-amber-50/90 border-b border-amber-200/80 flex items-center justify-between text-xs text-amber-950 shrink-0">
              <div className="flex items-center gap-1.5 truncate flex-1 mr-2">
                <Pin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-bold text-[10px] text-amber-800 shrink-0">Đã ghim:</span>
                <span className="truncate text-[11px] font-medium">{activeRoom.pinnedMessageText}</span>
              </div>
              {onUnpinMessage && (
                <button
                  onClick={() => onUnpinMessage(activeRoom.id)}
                  className="text-[10px] text-stone-400 hover:text-red-600 font-bold shrink-0 px-1"
                  title="Bỏ ghim"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          )}

          {/* 4. Messages Stream */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 overscroll-contain"
          >
            {messages.length === 0 ? (
              <div className="p-8 text-center space-y-2 my-auto">
                <p className="text-xs text-stone-400 font-medium">
                  Hãy gửi lời chào đầu tiên tới phòng "{activeRoom.name}"!
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentMember.id;
                const sender = getMember(msg.senderId);

                if (msg.type === 'system') {
                  return (
                    <div key={msg.id} className="flex justify-center my-2">
                      <span className="px-3 py-1 bg-stone-200/70 text-stone-600 text-[10px] rounded-full font-medium shadow-2xs">
                        {msg.text}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 group ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    {!isMe && (
                      <Avatar
                        src={sender?.avatar || ''}
                        name={sender?.name || 'Thành viên'}
                        size="xs"
                        className="mb-1 shrink-0"
                      />
                    )}

                    <div className="max-w-[80%] space-y-1">
                      {/* Sender Name for incoming messages */}
                      {!isMe && (
                        <span className="text-[10px] font-bold block text-stone-500 pl-1">
                          {sender?.name} ({sender?.relationship})
                        </span>
                      )}

                      <div
                        className={`rounded-2xl p-3 shadow-2xs relative space-y-1.5 ${
                          msg.priority
                            ? 'bg-rose-50 border-2 border-rose-400 text-rose-950'
                            : isMe
                            ? 'bg-orange-600 text-white rounded-br-xs'
                            : 'bg-white text-stone-900 border border-stone-200/80 rounded-bl-xs'
                        } ${msg.isDeleted ? 'opacity-60 italic' : ''}`}
                      >
                        {/* Priority Badge */}
                        {msg.priority && !msg.isDeleted && (
                          <div className="flex items-center gap-1 text-[10px] font-bold text-rose-600 uppercase tracking-wider pb-0.5">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Tin nhắn khẩn cấp</span>
                          </div>
                        )}

                        {/* Image Attachments */}
                        {msg.mediaUrls && msg.mediaUrls.length > 0 && !msg.isDeleted && (
                          <div
                            className={`grid gap-1.5 rounded-xl overflow-hidden ${
                              msg.mediaUrls.length === 1 ? 'grid-cols-1' : 'grid-cols-2'
                            }`}
                          >
                            {msg.mediaUrls.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt="Ảnh gửi"
                                onClick={() => setLightboxPhoto(url)}
                                className="w-full max-h-48 object-cover rounded-xl cursor-pointer hover:opacity-95 transition"
                                loading="lazy"
                              />
                            ))}
                          </div>
                        )}

                        {/* Message Text */}
                        {msg.text && (
                          <p className="text-xs leading-relaxed whitespace-pre-wrap font-medium">
                            {msg.text}
                          </p>
                        )}

                        {/* Audio Voice simulation */}
                        {msg.type === 'voice' && !msg.isDeleted && (
                          <div className="flex items-center gap-2 py-1">
                            <button
                              type="button"
                              onClick={() =>
                                setPlayingVoiceId(playingVoiceId === msg.id ? null : msg.id)
                              }
                              className={`w-7 h-7 rounded-full flex items-center justify-center transition shrink-0 ${
                                isMe ? 'bg-white/20 text-white' : 'bg-orange-100 text-orange-600'
                              }`}
                            >
                              {playingVoiceId === msg.id ? (
                                <Pause className="w-3.5 h-3.5 fill-current" />
                              ) : (
                                <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
                              )}
                            </button>
                            <span className="text-[10px] opacity-80">
                              {playingVoiceId === msg.id ? 'Đang phát...' : 'Ghi âm 0:14s'}
                            </span>
                          </div>
                        )}

                        {/* Timestamp & Status */}
                        <div
                          className={`flex items-center justify-end gap-1 text-[9px] ${
                            isMe ? 'text-white/75' : 'text-stone-400'
                          }`}
                        >
                          <span>{msg.timestamp}</span>
                          {isMe && <CheckCheck className="w-3 h-3 text-white/90" />}
                        </div>

                        {/* Message Reactions Display */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-0.5">
                            {msg.reactions.map((r, i) => (
                              <span
                                key={i}
                                className={`text-[11px] px-1.5 py-0.2 rounded-full ${
                                  isMe ? 'bg-black/20 text-white' : 'bg-stone-100 text-stone-800'
                                }`}
                              >
                                {r.emoji}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Floating Message Actions Bar (Zalo Style on hover/touch) */}
                      {!msg.isDeleted && (
                        <div
                          className={`flex items-center gap-1 text-[10px] pt-0.5 ${
                            isMe ? 'justify-end' : 'justify-start'
                          }`}
                        >
                          {/* Quick Reactions */}
                          {REACTION_EMOJIS.slice(0, 3).map((emoji) => (
                            <button
                              key={emoji}
                              onClick={() => onToggleReaction(activeRoom.id, msg.id, emoji)}
                              className="p-0.5 hover:scale-125 transition"
                            >
                              {emoji}
                            </button>
                          ))}

                          {/* Pin Message */}
                          {onPinMessage && (
                            <button
                              onClick={() => onPinMessage(activeRoom.id, msg.id, msg.text || '📷 Hình ảnh')}
                              className="p-1 text-stone-400 hover:text-amber-600 rounded-md"
                              title="Ghim tin nhắn"
                            >
                              <Pin className="w-3 h-3" />
                            </button>
                          )}

                          {/* Delete/Recall message for own */}
                          {isMe && onDeleteMessage && (
                            <button
                              onClick={() => onDeleteMessage(activeRoom.id, msg.id)}
                              className="p-1 text-stone-400 hover:text-red-600 rounded-md"
                              title="Thu hồi tin nhắn"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Typing Indicator */}
            {Object.keys(typingUsers).length > 0 && (
              <div className="flex items-center gap-2 px-4 py-1.5 text-stone-500 text-[11px] italic font-medium bg-[#FFFBF7]/80 animate-pulse">
                <div className="flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce" />
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.2s]" />
                  <span className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-bounce [animation-delay:0.4s]" />
                </div>
                <span>{Object.values(typingUsers).join(', ')} đang soạn tin...</span>
              </div>
            )}
          </div>

          {/* 5. Image Preview before sending */}
          {uploadingImages.length > 0 && (
            <div className="px-3 py-1.5 bg-stone-100 border-t border-stone-200 flex gap-2 overflow-x-auto shrink-0">
              {uploadingImages.map((imgUrl, i) => (
                <div key={i} className="relative w-16 h-16 rounded-xl overflow-hidden border border-stone-300 shrink-0">
                  <img src={imgUrl} alt="Preview" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setUploadingImages((prev) => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/70 text-white flex items-center justify-center text-[10px]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* 6. Quick Canned Messages for Seniors / Quick Replies */}
          <div className="px-3 py-1.5 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0 bg-[#FFFBF7]">
            {ELDER_QUICK_MESSAGES.map((msg, i) => (
              <button
                key={i}
                onClick={() => setInputText(msg)}
                className="text-[11px] bg-white hover:bg-orange-50 hover:text-orange-700 text-stone-700 px-3 py-1.5 rounded-full shrink-0 border border-stone-200/80 shadow-2xs transition active:scale-95 whitespace-nowrap leading-none font-medium"
              >
                {msg}
              </button>
            ))}
          </div>

          {/* 7. Input Bar (Zalo Style) */}
          <form onSubmit={handleSend} className="px-3 pb-2 pt-1 shrink-0 bg-white border-t border-stone-100">
            <div className="bg-stone-50 rounded-2xl border border-stone-200/90 p-1.5 flex items-center gap-1.5 shadow-2xs">
              {/* Attach Image Button */}
              <label className="p-2 text-stone-500 hover:text-orange-600 rounded-xl hover:bg-stone-100 cursor-pointer transition shrink-0">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-orange-600" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-stone-600" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={isUploading}
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </label>

              {/* Priority Toggle Button */}
              <button
                type="button"
                onClick={() => setIsPriority(!isPriority)}
                className={`p-2 rounded-xl transition shrink-0 ${
                  isPriority
                    ? 'bg-red-500 text-white shadow-2xs'
                    : 'text-stone-500 hover:text-red-500 hover:bg-stone-100'
                }`}
                title="Đánh dấu tin nhắn khẩn cấp"
              >
                <AlertTriangle className="w-4 h-4" />
              </button>

              {/* Text Input */}
              <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                placeholder={
                  isPriority
                    ? 'Gõ tin nhắn khẩn cấp cho cả phòng...'
                    : `Nhắn tin cho ${activeRoom.name}...`
                }
                className="flex-1 min-w-0 text-xs bg-transparent focus:outline-hidden text-stone-900 placeholder:text-stone-400"
              />

              {/* Voice simulation button */}
              <button
                type="button"
                onClick={handleSendVoiceSim}
                className="p-2 text-stone-500 hover:text-orange-600 rounded-xl hover:bg-stone-100 transition shrink-0"
                title="Gửi tin nhắn thoại ngắn"
              >
                <Mic className="w-4 h-4" />
              </button>

              {/* Send Button */}
              <button
                type="submit"
                disabled={!inputText.trim() && uploadingImages.length === 0}
                className="w-8 h-8 rounded-xl bg-orange-600 disabled:opacity-40 text-white flex items-center justify-center shrink-0 hover:bg-orange-700 transition active:scale-95 shadow-2xs"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =========================================================================
          MODAL 1: TẠO PHÒNG CHAT MỚI
      ========================================================================= */}
      <BottomSheet
        isOpen={showCreateRoomModal}
        onClose={() => setShowCreateRoomModal(false)}
        title="Tạo phòng trò chuyện mới"
      >
        <form onSubmit={handleCreateRoomSubmit} className="space-y-4 text-xs">
          <div>
            <label className="font-bold text-stone-800 block mb-1">Tên phòng chat *</label>
            <input
              type="text"
              required
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="VD: Gia đình Bố Mẹ & Các Con, Anh Chị Em,..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl focus:border-orange-500 focus:bg-white text-stone-900 text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Loại phòng</label>
            <select
              value={newRoomType}
              onChange={(e) => setNewRoomType(e.target.value as ChatRoom['type'])}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs"
            >
              <option value="custom">Nhóm tùy chỉnh</option>
              <option value="parents">Nhóm Bố Mẹ / Phụ huynh</option>
              <option value="siblings">Nhóm Anh Chị Em</option>
              <option value="direct">Trò chuyện riêng 1-1</option>
            </select>
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">
              Chọn thành viên tham gia ({newRoomSelectedMembers.length} đã chọn) *
            </label>
            <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-stone-50 rounded-2xl border border-stone-200">
              {allMembers.map((m) => {
                const isSelected = newRoomSelectedMembers.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      if (isSelected) {
                        setNewRoomSelectedMembers((prev) => prev.filter((id) => id !== m.id));
                      } else {
                        setNewRoomSelectedMembers((prev) => [...prev, m.id]);
                      }
                    }}
                    className={`p-2 rounded-xl border flex items-center gap-2 transition text-left ${
                      isSelected
                        ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold'
                        : 'bg-white border-stone-200 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Avatar src={m.avatar} name={m.name} size="xs" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] block truncate">{m.name}</span>
                      <span className="text-[9px] text-stone-400 block">{m.relationship}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Mô tả phòng (tùy chọn)</label>
            <input
              type="text"
              value={newRoomDesc}
              onChange={(e) => setNewRoomDesc(e.target.value)}
              placeholder="VD: Phòng thảo luận công việc gia đình cuối tuần..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-xs"
            />
          </div>

          <button
            type="submit"
            disabled={!newRoomName.trim() || newRoomSelectedMembers.length === 0}
            className="w-full py-3 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-bold rounded-2xl shadow-md shadow-orange-600/20 transition active:scale-95 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo phòng trò chuyện</span>
          </button>
        </form>
      </BottomSheet>

      {/* =========================================================================
          BOTTOMSHEET: CÀI ĐẶT & QUẢN LÝ PHÒNG CHAT
      ========================================================================= */}
      <BottomSheet
        isOpen={showRoomSettingsSheet}
        onClose={() => {
          setShowRoomSettingsSheet(false);
          setIsEditingRoomInfo(false);
        }}
        title="Quản lý phòng trò chuyện"
      >
        <div className="space-y-4 text-xs pb-4">
          {/* Room Summary Header */}
          <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200/80 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-600 text-white font-bold flex items-center justify-center text-base shadow-xs">
                {activeRoom.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="font-bold text-stone-900 text-sm">{activeRoom.name}</h3>
                <p className="text-[10px] text-stone-500">
                  {activeRoom.memberIds.length} thành viên • {activeRoom.description || 'Phòng chat nội bộ'}
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsEditingRoomInfo(!isEditingRoomInfo)}
              className="p-2 text-stone-600 hover:text-orange-600 rounded-xl hover:bg-white transition"
              title="Đổi tên phòng"
            >
              <Edit3 className="w-4 h-4" />
            </button>
          </div>

          {/* Inline Edit Room Info */}
          {isEditingRoomInfo && onUpdateRoom && (
            <div className="p-3 bg-orange-50/70 rounded-2xl border border-orange-200 space-y-2">
              <div>
                <label className="font-bold text-stone-800 block mb-1">Đổi tên phòng</label>
                <input
                  type="text"
                  value={editRoomName}
                  onChange={(e) => setEditRoomName(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs"
                />
              </div>
              <div>
                <label className="font-bold text-stone-800 block mb-1">Mô tả phòng</label>
                <input
                  type="text"
                  value={editRoomDesc}
                  onChange={(e) => setEditRoomDesc(e.target.value)}
                  className="w-full p-2 bg-white border border-stone-200 rounded-xl text-xs"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  onUpdateRoom(activeRoom.id, {
                    name: editRoomName.trim(),
                    description: editRoomDesc.trim(),
                  });
                  setIsEditingRoomInfo(false);
                }}
                className="w-full py-2 bg-orange-600 text-white font-bold rounded-xl text-xs"
              >
                Lưu thay đổi
              </button>
            </div>
          )}

          {/* Members in Room List */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-stone-800 block">
                Thành viên trong phòng ({activeRoom.memberIds.length})
              </span>
              {onAddMembersToRoom && (
                <button
                  type="button"
                  onClick={() => setShowAddMembersModal(true)}
                  className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>+ Thêm thành viên</span>
                </button>
              )}
            </div>

            <div className="divide-y divide-stone-100 bg-stone-50 rounded-2xl border border-stone-200/80 max-h-48 overflow-y-auto">
              {activeRoom.memberIds.map((mId) => {
                const member = getMember(mId);
                if (!member) return null;
                const isMe = member.id === currentMember.id;
                const isAdmin = activeRoom.adminIds?.includes(mId) || activeRoom.createdById === mId;

                return (
                  <div
                    key={mId}
                    className="p-2.5 flex items-center justify-between gap-2 hover:bg-white transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar src={member.avatar} name={member.name} size="xs" />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-900 text-xs">{member.name}</span>
                          {isMe && (
                            <span className="text-[9px] bg-orange-100 text-orange-800 px-1.5 py-0.2 rounded-md font-bold">
                              Bạn
                            </span>
                          )}
                          {isAdmin && (
                            <span className="text-[9px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded-md font-bold">
                              Trưởng nhóm
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-500">{member.relationship}</span>
                      </div>
                    </div>

                    {/* Remove Member Button (If not main all-family room) */}
                    {activeRoom.id !== 'room-all' && !isMe && onRemoveMemberFromRoom && (
                      <button
                        type="button"
                        onClick={() => onRemoveMemberFromRoom(activeRoom.id, mId)}
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg transition"
                        title="Xóa khỏi phòng"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delete Room Action */}
          {activeRoom.id !== 'room-all' && onDeleteRoom && (
            <div className="pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`Bạn có chắc chắn muốn xóa phòng chat "${activeRoom.name}"?`)) {
                    onDeleteRoom(activeRoom.id);
                    setShowRoomSettingsSheet(false);
                    setViewMode('list');
                  }
                }}
                className="w-full py-2.5 px-3 bg-red-50 hover:bg-red-100 border border-red-200 text-red-600 font-bold rounded-xl text-xs transition flex items-center justify-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Giải tán / Xóa phòng chat này</span>
              </button>
            </div>
          )}
        </div>
      </BottomSheet>

      {/* =========================================================================
          MODAL 2: THÊM THÀNH VIÊN VÀO PHÒNG
      ========================================================================= */}
      <BottomSheet
        isOpen={showAddMembersModal}
        onClose={() => {
          setShowAddMembersModal(false);
          setSelectedMembersToAdd([]);
        }}
        title="Thêm thành viên vào phòng"
      >
        <div className="space-y-4 text-xs">
          <p className="text-stone-500">
            Chọn thành viên trong gia đình để thêm vào phòng "{activeRoom.name}":
          </p>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 bg-stone-50 rounded-2xl border border-stone-200">
            {allMembers
              .filter((m) => !activeRoom.memberIds.includes(m.id))
              .map((m) => {
                const isSelected = selectedMembersToAdd.includes(m.id);
                return (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedMembersToAdd((prev) => prev.filter((id) => id !== m.id));
                      } else {
                        setSelectedMembersToAdd((prev) => [...prev, m.id]);
                      }
                    }}
                    className={`p-2 rounded-xl border flex items-center gap-2 transition text-left ${
                      isSelected
                        ? 'bg-orange-50 border-orange-500 text-orange-950 font-bold'
                        : 'bg-white border-stone-200 hover:bg-stone-100 text-stone-700'
                    }`}
                  >
                    <Avatar src={m.avatar} name={m.name} size="xs" />
                    <div className="min-w-0 flex-1">
                      <span className="text-[11px] block truncate">{m.name}</span>
                      <span className="text-[9px] text-stone-400 block">{m.relationship}</span>
                    </div>
                  </button>
                );
              })}
          </div>

          <button
            type="button"
            disabled={selectedMembersToAdd.length === 0}
            onClick={() => {
              if (onAddMembersToRoom && selectedMembersToAdd.length > 0) {
                onAddMembersToRoom(activeRoom.id, selectedMembersToAdd);
                setShowAddMembersModal(false);
                setSelectedMembersToAdd([]);
              }
            }}
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-40 text-white font-bold rounded-xl text-xs shadow-xs transition"
          >
            Thêm {selectedMembersToAdd.length} thành viên vào phòng
          </button>
        </div>
      </BottomSheet>

      {/* Lightbox Photo Preview */}
      {lightboxPhoto && (
        <div
          onClick={() => setLightboxPhoto(null)}
          className="fixed inset-0 z-[1100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
        >
          <button
            onClick={() => setLightboxPhoto(null)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/40 transition"
          >
            <X className="w-6 h-6" />
          </button>
          <img
            src={lightboxPhoto}
            alt="Enlarged"
            className="max-w-full max-h-[85vh] object-contain rounded-2xl"
          />
        </div>
      )}
    </div>
  );
};
