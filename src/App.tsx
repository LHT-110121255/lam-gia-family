/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { familyService } from './services/familyService';
import { locationSyncService } from './services/locationSyncService';
import { MainTab, BottomNavigation } from './components/common/BottomNavigation';
import { TopBar } from './components/common/TopBar';
import { PWAInstallBanner } from './components/common/PWAInstallBanner';
import { OfflineIndicator } from './components/common/OfflineIndicator';
import { QuickActionSheet } from './components/common/QuickActionSheet';
import { CreatePostSheet } from './components/common/CreatePostSheet';
import { Toast, ToastMessage } from './components/common/Toast';
import { ConfirmDialog, ConfirmDialogOptions } from './components/common/ConfirmDialog';
import { SOSAlertModal, SOSAlertData } from './components/common/SOSAlertModal';

// Screens
import { HomeScreen } from './components/screens/HomeScreen';
import { FamilyScreen } from './components/screens/FamilyScreen';
import { MemoriesScreen } from './components/screens/MemoriesScreen';
import { CalendarScreen } from './components/screens/CalendarScreen';
import { MoreHubScreen, SubScreen } from './components/screens/MoreHubScreen';
import { TasksScreen } from './components/screens/TasksScreen';
import { PollsScreen } from './components/screens/PollsScreen';
import { ChatScreen } from './components/screens/ChatScreen';
import { FamilyMapScreen } from './components/screens/FamilyMapScreen';
import { FinanceScreen } from './components/screens/FinanceScreen';
import { NotificationsScreen } from './components/screens/NotificationsScreen';
import { SettingsScreen } from './components/screens/SettingsScreen';
import { AuthScreen } from './components/auth/AuthScreen';
import { ProfileManagementScreen } from './components/profile/ProfileManagementScreen';
import { AccountManagementScreen } from './components/screens/AccountManagementScreen';
import { FloatingChatBubble } from './components/chat/FloatingChatBubble';

import { CalendarEvent, ChatMessage, FinanceTransaction, SharedTaskList, FamilyMember, FamilyPost, ChatRoom, PostPrivacy } from './types';
import { ChevronLeft } from 'lucide-react';

const MAIN_TABS: MainTab[] = ['home', 'map', 'chat', 'more'];

export default function App() {
  // --- SERVICE SUBSCRIPTION & REACTIVE STATE ---
  const [, setRevision] = useState(0);

  useEffect(() => {
    familyService.requestNotificationPermission();
    familyService.syncAllInitialData();
    familyService.initChatSocket();
    locationSyncService.init();
    const unsubscribe = familyService.subscribe(() => {
      setRevision((r) => r + 1);
    });
    return unsubscribe;
  }, []);

  const familyInfo = familyService.getFamilyInfo();
  const members = familyService.getMembers();
  const currentMember = familyService.getCurrentMember();
  const settings = familyService.getSettings();
  const posts = familyService.getPosts();
  const milestones = familyService.getMilestones();
  const albums = familyService.getAlbums();
  const onThisDay = familyService.getOnThisDay();
  const events = familyService.getEvents();
  const tasks = familyService.getTaskLists();
  const polls = familyService.getPolls();
  const chatRooms = familyService.getChatRooms();
  const checkIns = familyService.getCheckIns();
  const locationShare = familyService.getLocationShareState();
  const wallet = familyService.getWallet();
  const notifications = familyService.getNotifications();

  // --- NAVIGATION & SWIPE STATE ---
  const [mainTab, setMainTab] = useState<MainTab>('home');
  const [subScreen, setSubScreen] = useState<SubScreen>('hub');
  const [activeChatRoomId, setActiveChatRoomId] = useState<string>('room-all');
  const [slideDirection, setSlideDirection] = useState<'next' | 'prev'>('next');

  // --- MODAL / OVERLAY STATES ---
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isCreatePostOpen, setIsCreatePostOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<FamilyPost | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [openedDirectEvent, setOpenedDirectEvent] = useState<CalendarEvent | null>(null);
  const [selectedMemberProfileId, setSelectedMemberProfileId] = useState<string | null>(null);

  // --- RICH TOAST & ALERT SYSTEM ---
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmOptions, setConfirmOptions] = useState<ConfirmDialogOptions | null>(null);
  const [sosAlertData, setSOSAlertData] = useState<SOSAlertData | null>(null);

  const addToast = useCallback((input: string | Omit<ToastMessage, 'id'>, defaultType: ToastMessage['type'] = 'success') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    const toastObj: ToastMessage =
      typeof input === 'string'
        ? { id, text: input, type: defaultType }
        : { id, type: input.type || defaultType, ...input };

    setToasts((prev) => {
      const isDuplicate = prev.some((t) => t.text === toastObj.text && t.type === toastObj.type);
      if (isDuplicate) return prev;
      return [...prev, toastObj];
    });

    const duration = toastObj.duration || (toastObj.type === 'sos' ? 8000 : 4000);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  useEffect(() => {
    const handleToastEvent = (e: any) => {
      if (e.detail) {
        const toastItem: ToastMessage = e.detail;
        setToasts((prev) => {
          const isDuplicate = prev.some((t) => t.text === toastItem.text && t.type === toastItem.type);
          if (isDuplicate) return prev;
          return [...prev, toastItem];
        });
        const duration = toastItem.duration || (toastItem.type === 'sos' ? 8000 : 4000);
        setTimeout(() => {
          setToasts((prev) => prev.filter((t) => t.id !== toastItem.id));
        }, duration);
      }
    };

    const handleConfirmEvent = (e: any) => {
      if (e.detail) {
        setConfirmOptions(e.detail);
      }
    };

    const handleSOSEvent = (e: any) => {
      if (e.detail) {
        setSOSAlertData(e.detail);
      }
    };

    window.addEventListener('family_toast_show', handleToastEvent);
    window.addEventListener('family_confirm_show', handleConfirmEvent);
    window.addEventListener('family_sos_modal_show', handleSOSEvent);

    return () => {
      window.removeEventListener('family_toast_show', handleToastEvent);
      window.removeEventListener('family_confirm_show', handleConfirmEvent);
      window.removeEventListener('family_sos_modal_show', handleSOSEvent);
    };
  }, []);

  // Switch Tab with Direction Detection
  const handleTabChange = useCallback((newTab: MainTab) => {
    const currentIndex = MAIN_TABS.indexOf(mainTab);
    const newIndex = MAIN_TABS.indexOf(newTab);
    if (newIndex !== -1 && currentIndex !== -1) {
      setSlideDirection(newIndex >= currentIndex ? 'next' : 'prev');
    }
    setMainTab(newTab);
    if (newTab === 'more' && subScreen === 'notifications') {
      setSubScreen('hub');
    }
  }, [mainTab, subScreen]);

  // Touch Swipe Handlers for Smooth Tab Flipping
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const mainScrollRef = useRef<HTMLElement>(null);

  // Scroll to top when switching tab or sub-screen
  useEffect(() => {
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTop = 0;
    }
  }, [mainTab, subScreen]);

  const handleTouchStart = (e: React.TouchEvent) => {
    // Only handle single touch gestures and when not inside chat room
    if (e.touches.length === 1 && !(mainTab === 'more' && subScreen === 'chat')) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = Date.now() - touchStartRef.current.time;
    touchStartRef.current = null;

    // Must be predominantly horizontal gesture (> 50px, ratio > 1.4, time < 350ms)
    if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.4 && deltaTime < 350) {
      const currentIndex = MAIN_TABS.indexOf(mainTab);
      if (currentIndex === -1) return;

      if (deltaX < 0) {
        // Swiped Left -> Next tab
        if (currentIndex < MAIN_TABS.length - 1) {
          setSlideDirection('next');
          handleTabChange(MAIN_TABS[currentIndex + 1]);
        }
      } else {
        // Swiped Right -> Previous tab
        if (currentIndex > 0) {
          setSlideDirection('prev');
          handleTabChange(MAIN_TABS[currentIndex - 1]);
        }
      }
    }
  };

  // --- ACTIONS HANDLERS ---
  const handleToggleTaskItem = (listId: string, itemId: string) => {
    familyService.toggleTaskItem(listId, itemId, currentMember.name);
    addToast('Đã cập nhật trạng thái việc chung', 'success');
  };

  const handleAddTaskItem = (listId: string, title: string, qty?: string, assigneeId?: string) => {
    familyService.addTaskItem(listId, title, qty, assigneeId);
    addToast('Đã thêm việc mới vào danh sách', 'success');
  };

  const handleCreateTaskList = (title: string, category: SharedTaskList['category']) => {
    familyService.createTaskList(title, category, currentMember.id);
    addToast('Đã tạo danh sách việc mới', 'success');
  };

  const handleVotePoll = (pollId: string, optionId: string) => {
    familyService.votePoll(pollId, optionId, currentMember.id);
    addToast('Đã ghi nhận phiếu bình chọn của bạn', 'success');
  };

  const handleCreatePoll = (question: string, options: string[]) => {
    familyService.createPoll(question, options, currentMember.id);
    addToast('Đã tạo cuộc bình chọn gia đình', 'success');
  };

  const handleSendMessage = (
    roomId: string,
    msg: {
      text: string;
      priority?: boolean;
      type?: ChatMessage['type'];
      mediaUrl?: string;
      mediaUrls?: string[];
    }
  ) => {
    familyService.sendMessage(roomId, {
      senderId: currentMember.id,
      text: msg.text,
      priority: msg.priority,
      type: msg.type,
      mediaUrl: msg.mediaUrl,
      mediaUrls: msg.mediaUrls,
    });
  };

  const handleCreateChatRoom = (room: {
    name: string;
    type: ChatRoom['type'];
    memberIds: string[];
    description?: string;
  }) => {
    const newRoom = familyService.createChatRoom({
      name: room.name,
      type: room.type,
      memberIds: room.memberIds,
      description: room.description,
      createdById: currentMember.id,
    });
    setActiveChatRoomId(newRoom.id);
    addToast(`Đã tạo phòng trò chuyện "${newRoom.name}"`, 'success');
  };

  const handleUpdateChatRoom = (roomId: string, updates: Partial<ChatRoom>) => {
    familyService.updateChatRoom(roomId, updates);
    addToast('Đã cập nhật thông tin phòng trò chuyện', 'success');
  };

  const handleDeleteChatRoom = (roomId: string) => {
    familyService.deleteChatRoom(roomId);
    setActiveChatRoomId('room-all');
    addToast('Đã xóa phòng trò chuyện', 'info');
  };

  const handleAddMembersToRoom = (roomId: string, memberIds: string[]) => {
    familyService.addMembersToRoom(roomId, memberIds);
    addToast(`Đã thêm ${memberIds.length} thành viên vào phòng`, 'success');
  };

  const handleRemoveMemberFromRoom = (roomId: string, memberId: string) => {
    familyService.removeMemberFromRoom(roomId, memberId);
    addToast('Đã cập nhật danh sách thành viên', 'info');
  };

  const handleDeleteMessage = (roomId: string, messageId: string) => {
    familyService.deleteMessage(roomId, messageId);
    addToast('Đã thu hồi tin nhắn', 'info');
  };

  const handlePinMessage = (roomId: string, messageId: string, text: string) => {
    familyService.pinMessage(roomId, messageId, text);
    addToast('Đã ghim tin nhắn lên đầu phòng', 'success');
  };

  const handleUnpinMessage = (roomId: string) => {
    familyService.unpinMessage(roomId);
    addToast('Đã bỏ ghim tin nhắn', 'info');
  };

  const handleToggleChatReaction = (roomId: string, messageId: string, emoji: string) => {
    familyService.toggleMessageReaction(roomId, messageId, emoji, currentMember.id);
  };

  const handleCheckIn = (zoneName: string, message: string) => {
    familyService.addCheckIn(currentMember.id, zoneName, message, 'manual');
    addToast(`Đã báo an toàn: "${message}"`, 'success');
  };

  const handleStartLocationShare = (durationMinutes: number) => {
    familyService.startLocationSharing(durationMinutes);
    addToast(`Bắt đầu chia sẻ vị trí trong ${durationMinutes} phút`, 'info');
  };

  const handleStopLocationShare = () => {
    familyService.stopLocationSharing();
    addToast('Đã dừng chia sẻ vị trí', 'info');
  };

  const handleTriggerSOS = () => {
    familyService.addCheckIn(currentMember.id, '128 Đội Cấn', 'PHÁT TÍN HIỆU SOS KHẨN CẤP!', 'sos');
    familyService.sendMessage('room-all', {
      senderId: currentMember.id,
      text: '🚨 SOS KHẨN CẤP: Tôi đang cần giúp đỡ ngay lập tức tại 128 Đội Cấn!',
      priority: true,
      type: 'priority',
    });
    addToast('Tín hiệu SOS đã được gửi tới toàn bộ gia đình!', 'error');
  };

  const handleAddTransaction = (tx: Omit<FinanceTransaction, 'id' | 'date'>) => {
    familyService.addTransaction(tx);
    addToast('Đã ghi nhận giao dịch vào sổ quỹ', 'success');
  };

  const handleToggleSplitPaid = (billId: string, memberId: string) => {
    familyService.markSplitPaid(billId, memberId);
    addToast('Đã cập nhật trạng thái nộp tiền', 'success');
  };

  const handlePublishPost = (post: {
    content: string;
    feeling?: string;
    location?: string;
    mediaUrls: string[];
    privacy?: PostPrivacy;
  }) => {
    familyService.addPost({
      authorId: currentMember.id,
      content: post.content,
      feeling: post.feeling,
      location: post.location,
      mediaUrls: post.mediaUrls,
      privacy: post.privacy,
    });
    addToast('Đã đăng khoảnh khắc mới lên bảng tin', 'success');
  };

  const handleUpdatePost = (postId: string, updates: Partial<FamilyPost>) => {
    familyService.updatePost(postId, updates);
    addToast('Đã cập nhật bài viết thành công!', 'success');
  };

  const handleQuickAction = (
    action: 'new_post' | 'new_event' | 'new_task' | 'check_in' | 'new_expense' | 'new_poll'
  ) => {
    switch (action) {
      case 'new_post':
        setIsCreatePostOpen(true);
        break;
      case 'new_event':
        handleTabChange('more');
        setSubScreen('calendar');
        break;
      case 'new_task':
        handleTabChange('more');
        setSubScreen('tasks');
        break;
      case 'check_in':
        handleTabChange('map');
        break;
      case 'new_expense':
        handleTabChange('more');
        setSubScreen('finance');
        break;
      case 'new_poll':
        handleTabChange('more');
        setSubScreen('polls');
        break;
    }
  };

  const handleLoginSuccess = (member: FamilyMember) => {
    familyService.setCurrentUser(member.id);
    setIsAuthModalOpen(false);
    addToast(`Chào mừng ${member.name} (${member.relationship}) trở về nhà!`, 'success');
  };

  const handleRegisterSuccess = (newMember: FamilyMember) => {
    familyService.setCurrentUser(newMember.id);
    setIsAuthModalOpen(false);
    addToast(`Chào mừng thành viên mới: ${newMember.name}!`, 'success');
  };

  // Chat unread count calculation
  const totalChatUnread = chatRooms.reduce((acc, r) => acc + (r.unreadCount || 0), 0);
  const pendingTasksCount = tasks.reduce(
    (sum, list) => sum + list.items.filter((i) => !i.completed).length,
    0
  );

  // Navigation bar & header visibility scoping
  const isInsideChat = mainTab === 'chat' || (mainTab === 'more' && subScreen === 'chat');
  const isInsideMap = mainTab === 'map' || (mainTab === 'more' && subScreen === 'map');
  const hideTopBar = isInsideChat || isInsideMap;
  const hideBottomNav = isInsideChat;
  const isFullScreenView = isInsideChat || isInsideMap;

  // If user is logged out, show the AuthScreen as primary view
  if (settings.isLoggedIn === false) {
    return (
      <div className="flex justify-center bg-[#F7F4F0] min-h-[100dvh] w-full text-stone-900 font-sans">
        <div className="w-full max-w-md bg-[#FFFBF7] min-h-[100dvh] h-[100dvh] flex flex-col shadow-2xl relative border-x border-stone-200/60 overflow-y-auto overscroll-contain">
          <OfflineIndicator />
          <Toast toasts={toasts} onDismiss={dismissToast} />
          <AuthScreen
            allMembers={members}
            familyName={familyInfo.name}
            onLoginSuccess={handleLoginSuccess}
            onRegisterSuccess={handleRegisterSuccess}
            isModal={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      className={`fixed inset-0 h-full h-[100dvh] w-full bg-[#FDF8F3] text-stone-900 transition-colors flex justify-center overflow-hidden ${
        settings.textMode === 'large' ? 'large-text' : ''
      }`}
    >
      <OfflineIndicator />
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Main Container - Mobile Centered Frame */}
      <div className="w-full max-w-md mx-auto h-full h-[100dvh] bg-[#FFFBF7] shadow-xl border-x border-stone-200/60 relative flex flex-col overflow-hidden">
        {/* Top Bar Header (Hidden in chat and map for maximum view) */}
        {!hideTopBar && (
          <div className="shrink-0 w-full">
            <TopBar
              familyInfo={familyInfo}
              currentMember={currentMember}
              allMembers={members}
              notifications={notifications}
              onOpenNotifications={() => {
                handleTabChange('more');
                setSubScreen('notifications');
              }}
              onNavigateHome={() => {
                handleTabChange('home');
                setSubScreen('hub');
              }}
              onOpenProfile={() => {
                handleTabChange('more');
                setSubScreen('profile');
              }}
              onOpenAuth={() => setIsAuthModalOpen(true)}
            />
            <PWAInstallBanner />
          </div>
        )}

        {/* SubScreen Breadcrumb Back Bar */}
        {mainTab === 'more' && subScreen !== 'hub' && subScreen !== 'chat' && subScreen !== 'map' && (
          <div className="px-4 py-2 border-b border-stone-100 flex items-center gap-2 bg-[#FFFBF7] shrink-0">
            <button
              onClick={() => setSubScreen('hub')}
              className="flex items-center gap-1 text-xs font-bold text-orange-600 hover:text-orange-700 active:scale-95 transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Tiện ích</span>
            </button>
            <span className="text-stone-300">/</span>
            <span className="text-xs font-bold text-stone-800">
              {subScreen === 'family' && 'Cây gia phả & Thành viên'}
              {subScreen === 'profile' && 'Hồ sơ cá nhân & Y tế'}
              {subScreen === 'chat' && 'Trò chuyện gia đình'}
              {subScreen === 'tasks' && 'Việc chung & Mua sắm'}
              {subScreen === 'map' && 'Bản đồ & Vị trí Gia Đình'}
              {subScreen === 'finance' && 'Quỹ & Chi tiêu'}
              {subScreen === 'polls' && 'Bình chọn gia đình'}
              {subScreen === 'settings' && 'Cài đặt & Trợ năng'}
              {subScreen === 'notifications' && 'Thông báo gia đình'}
              {subScreen === 'accounts' && 'Quản lý tài khoản & Phê duyệt'}
              {subScreen === 'calendar' && 'Lịch & Sự kiện gia đình'}
              {subScreen === 'memories' && 'Kỷ niệm & Album gia đình'}
            </span>
          </div>
        )}

        {/* Main Content Area with Touch Gesture listeners */}
        <main
          ref={mainScrollRef}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className={`flex-1 w-full min-h-0 overflow-x-hidden ${
            isFullScreenView
              ? 'flex flex-col overflow-y-hidden pb-0'
              : 'overflow-y-auto pb-6 overscroll-y-contain'
          }`}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={mainTab + (mainTab === 'more' ? '-' + subScreen : '')}
              initial={{
                opacity: 0,
                x: slideDirection === 'next' ? 20 : -20,
              }}
              animate={{ opacity: 1, x: 0 }}
              exit={{
                opacity: 0,
                x: slideDirection === 'next' ? -20 : 20,
              }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              className={
                isFullScreenView
                  ? 'flex-1 flex flex-col min-h-0 w-full overflow-hidden'
                  : 'w-full min-h-full flex flex-col'
              }
            >
              {/* TAB 1: HOME (Trang chủ & Kỷ niệm) */}
              {mainTab === 'home' && (
                <HomeScreen
                  familyInfo={familyInfo}
                  currentMember={currentMember}
                  allMembers={members}
                  events={events}
                  tasks={tasks}
                  posts={posts}
                  onThisDay={onThisDay}
                  onNavigateTab={(tab) => {
                    if (tab === 'family') {
                      handleTabChange('more');
                      setSubScreen('family');
                    } else if (tab === 'memories') {
                      handleTabChange('more');
                      setSubScreen('memories');
                    } else if (tab === 'calendar') {
                      handleTabChange('more');
                      setSubScreen('calendar');
                    } else {
                      handleTabChange(tab as MainTab);
                      if (tab === 'more') setSubScreen('hub');
                    }
                  }}
                  onOpenMemberProfile={(mId) => {
                    handleTabChange('more');
                    setSubScreen('family');
                    setSelectedMemberProfileId(mId);
                  }}
                  onOpenEventDetail={(ev) => {
                    handleTabChange('more');
                    setSubScreen('calendar');
                    setOpenedDirectEvent(ev);
                  }}
                  onToggleTaskItem={handleToggleTaskItem}
                  onOpenCreatePost={() => {
                    setEditingPost(null);
                    setIsCreatePostOpen(true);
                  }}
                  onEditPost={(post) => {
                    setEditingPost(post);
                    setIsCreatePostOpen(true);
                  }}
                  onDeletePost={(postId) => familyService.deletePost(postId)}
                  onToggleLike={(postId) => familyService.toggleLikePost(postId, currentMember.id)}
                  onAddComment={(postId, text) => familyService.addComment(postId, currentMember.id, text)}
                />
              )}

              {/* TAB 2: MAP (Dedicated Full-Screen Location & Safety Tab) */}
              {mainTab === 'map' && (
                <FamilyMapScreen
                  allMembers={members}
                  currentMember={currentMember}
                />
              )}

              {/* TAB 3: CHAT (Realtime Chat Tab) */}
              {mainTab === 'chat' && (
                <ChatScreen
                  rooms={chatRooms}
                  messages={familyService.getMessages(activeChatRoomId)}
                  currentMember={currentMember}
                  allMembers={members}
                  activeRoomId={activeChatRoomId}
                  onSelectRoom={(rId) => {
                    familyService.enterRoom(rId);
                    setActiveChatRoomId(rId);
                  }}
                  onSendMessage={handleSendMessage}
                  onToggleReaction={handleToggleChatReaction}
                  onDeleteMessage={handleDeleteMessage}
                  onPinMessage={handlePinMessage}
                  onUnpinMessage={handleUnpinMessage}
                  onCreateRoom={handleCreateChatRoom}
                  onUpdateRoom={handleUpdateChatRoom}
                  onDeleteRoom={handleDeleteChatRoom}
                  onAddMembersToRoom={handleAddMembersToRoom}
                  onRemoveMemberFromRoom={handleRemoveMemberFromRoom}
                  onBackToRooms={() => handleTabChange('home')}
                />
              )}

              {/* TAB 4: MORE / SUB-SCREENS */}
              {mainTab === 'more' && (
                <>
                  {subScreen === 'hub' && (
                    <MoreHubScreen
                      onNavigateSubScreen={(sub) => setSubScreen(sub)}
                      chatUnreadCount={totalChatUnread}
                      pendingTasksCount={pendingTasksCount}
                      activePollsCount={polls.length}
                      isAdmin={!!currentMember.isAdmin || currentMember.username === 'lamhuetrung' || currentMember.id === 'member-trung'}
                      pendingAccountsCount={familyService.getPendingMembers().length}
                    />
                  )}

                  {subScreen === 'accounts' && (
                    <AccountManagementScreen
                      currentMember={currentMember}
                      onBack={() => setSubScreen('hub')}
                      onShowToast={addToast}
                    />
                  )}

                  {subScreen === 'family' && (
                    <FamilyScreen
                      familyInfo={familyInfo}
                      members={members}
                      albums={albums}
                      selectedMemberId={selectedMemberProfileId}
                      onSelectMember={(mId) => setSelectedMemberProfileId(mId)}
                      onStartChatWith={(mId) => {
                        const targetMember = members.find((m) => m.id === mId);
                        if (!targetMember) return;
                        let directRoom = chatRooms.find(
                          (r) =>
                            r.type === 'direct' &&
                            r.memberIds &&
                            r.memberIds.length === 2 &&
                            r.memberIds.includes(currentMember.id) &&
                            r.memberIds.includes(mId)
                        );
                        if (!directRoom) {
                          directRoom = familyService.createChatRoom({
                            name: targetMember.name,
                            type: 'direct',
                            memberIds: [currentMember.id, mId],
                            avatar: targetMember.avatar,
                            description: `Trò chuyện riêng với ${targetMember.name}`,
                          });
                        }
                        if (directRoom) {
                          familyService.enterRoom(directRoom.id);
                          setActiveChatRoomId(directRoom.id);
                        }
                        setSelectedMemberProfileId(null);
                        handleTabChange('chat');
                      }}
                      onUpdateFamilyInfo={(updatedInfo) => {
                        familyService.updateFamilyInfo(updatedInfo);
                        addToast('Đã cập nhật thông tin gia đình thành công!', 'success');
                      }}
                    />
                  )}

                  {subScreen === 'calendar' && (
                    <CalendarScreen
                      events={events}
                      allMembers={members}
                      currentMember={currentMember}
                      onAddEvent={(ev) => {
                        familyService.addEvent(ev);
                        addToast('Đã thêm sự kiện vào lịch', 'success');
                      }}
                      onDeleteEvent={(evId) => {
                        familyService.deleteEvent(evId);
                        addToast('Đã xoá sự kiện', 'info');
                      }}
                      onOpenEventDetailDirect={openedDirectEvent}
                      onCloseEventDetailDirect={() => setOpenedDirectEvent(null)}
                    />
                  )}

                  {subScreen === 'memories' && (
                    <MemoriesScreen
                      posts={posts}
                      milestones={milestones}
                      albums={albums}
                      onThisDay={onThisDay}
                      currentMember={currentMember}
                      allMembers={members}
                      onToggleLike={(postId) => familyService.toggleLikePost(postId, currentMember.id)}
                      onAddComment={(postId, text) => {
                        familyService.addComment(postId, currentMember.id, text);
                        addToast('Đã gửi bình luận', 'success');
                      }}
                      onEditComment={(postId, commentId, text) => {
                        familyService.editComment(postId, commentId, text);
                        addToast('Đã cập nhật bình luận', 'success');
                      }}
                      onDeleteComment={(postId, commentId) => {
                        familyService.deleteComment(postId, commentId);
                        addToast('Đã xoá bình luận', 'info');
                      }}
                      onDeletePost={(postId) => {
                        familyService.deletePost(postId);
                        addToast('Đã xoá bài đăng', 'info');
                      }}
                      onEditPost={(post) => {
                        setEditingPost(post);
                        setIsCreatePostOpen(true);
                      }}
                      onOpenCreatePost={() => {
                        setEditingPost(null);
                        setIsCreatePostOpen(true);
                      }}
                      onOpenMemberProfile={(mId) => {
                        handleTabChange('more');
                        setSubScreen('family');
                        setSelectedMemberProfileId(mId);
                      }}
                      onCreateAlbum={(album) => {
                        familyService.createAlbum(album);
                        addToast('Đã tạo album mới', 'success');
                      }}
                      onDeleteAlbum={(albumId) => {
                        familyService.deleteAlbum(albumId);
                        addToast('Đã xoá album thành công', 'info');
                      }}
                      onAddPhotoToAlbum={(albumId, photo) => {
                        familyService.addPhotoToAlbum(albumId, photo);
                        addToast('Đã thêm ảnh vào album', 'success');
                      }}
                      onDeletePhotoFromAlbum={(albumId, photoId) => {
                        familyService.deletePhotoFromAlbum(albumId, photoId);
                        addToast('Đã xoá ảnh khỏi album', 'info');
                      }}
                      onAddMilestone={(milestone) => {
                        familyService.addMilestone(milestone);
                        addToast('Đã thêm sự kiện dòng thời gian', 'success');
                      }}
                      onDeleteMilestone={(milestoneId) => {
                        familyService.deleteMilestone(milestoneId);
                        addToast('Đã xoá mốc sự kiện', 'info');
                      }}
                    />
                  )}

                  {subScreen === 'chat' && (
                    <ChatScreen
                      rooms={chatRooms}
                      messages={familyService.getMessages(activeChatRoomId)}
                      currentMember={currentMember}
                      allMembers={members}
                      activeRoomId={activeChatRoomId}
                      onSelectRoom={(rId) => {
                        familyService.enterRoom(rId);
                        setActiveChatRoomId(rId);
                      }}
                      onSendMessage={handleSendMessage}
                      onToggleReaction={handleToggleChatReaction}
                      onDeleteMessage={handleDeleteMessage}
                      onPinMessage={handlePinMessage}
                      onUnpinMessage={handleUnpinMessage}
                      onCreateRoom={handleCreateChatRoom}
                      onUpdateRoom={handleUpdateChatRoom}
                      onDeleteRoom={handleDeleteChatRoom}
                      onAddMembersToRoom={handleAddMembersToRoom}
                      onRemoveMemberFromRoom={handleRemoveMemberFromRoom}
                      onBackToRooms={() => setSubScreen('hub')}
                    />
                  )}

                  {subScreen === 'tasks' && (
                    <TasksScreen
                      taskLists={tasks}
                      currentMember={currentMember}
                      allMembers={members}
                      onToggleItem={handleToggleTaskItem}
                      onAddItem={handleAddTaskItem}
                      onCreateList={handleCreateTaskList}
                    />
                  )}

                  {subScreen === 'map' && (
                    <FamilyMapScreen
                      allMembers={members}
                      currentMember={currentMember}
                    />
                  )}

                  {subScreen === 'finance' && (
                    <FinanceScreen
                      wallet={wallet}
                      currentMember={currentMember}
                      allMembers={members}
                      onAddTransaction={handleAddTransaction}
                      onToggleSplitPaid={handleToggleSplitPaid}
                    />
                  )}

                  {subScreen === 'polls' && (
                    <PollsScreen
                      polls={polls}
                      currentMember={currentMember}
                      allMembers={members}
                      onVote={handleVotePoll}
                      onCreatePoll={handleCreatePoll}
                    />
                  )}

                  {subScreen === 'settings' && (
                    <SettingsScreen
                      settings={settings}
                      familyInfo={familyInfo}
                      currentMember={currentMember}
                      allMembers={members}
                      onUpdateSettings={(newSettings) => familyService.updateSettings(newSettings)}
                      onResetData={() => {
                        familyService.resetToDefault();
                        addToast('Đã khôi phục toàn bộ dữ liệu mẫu', 'info');
                      }}
                      onOpenProfile={() => setSubScreen('profile')}
                      onOpenAuth={() => setIsAuthModalOpen(true)}
                      onNavigateAccounts={() => setSubScreen('accounts')}
                      pendingAccountsCount={familyService.getPendingMembers().length}
                      onLogout={() => {
                        familyService.logout();
                        addToast('Đã đăng xuất tài khoản', 'info');
                      }}
                      onUpdateFamilyInfo={(updatedInfo) => {
                        familyService.updateFamilyInfo(updatedInfo);
                        addToast('Đã cập nhật thông tin gia đình thành công!', 'success');
                      }}
                    />
                  )}

                  {subScreen === 'profile' && (
                    <ProfileManagementScreen
                      member={currentMember}
                      allMembers={members}
                      familyName={familyInfo.name}
                      onSaveMember={(updated) => {
                        familyService.updateMember(currentMember.id, updated);
                        addToast('Đã lưu thông tin cá nhân thành công!', 'success');
                      }}
                      onLogout={() => {
                        familyService.logout();
                        addToast('Đã đăng xuất tài khoản', 'info');
                      }}
                      onBack={() => setSubScreen('hub')}
                    />
                  )}

                  {subScreen === 'notifications' && (
                    <NotificationsScreen
                      notifications={notifications}
                      onMarkAsRead={(id) => familyService.markNotificationAsRead(id)}
                      onMarkAllAsRead={() => familyService.markAllNotificationsAsRead()}
                      onNavigateTo={(type) => {
                        if (type === 'event') {
                          handleTabChange('more');
                          setSubScreen('calendar');
                        } else if (type === 'message') {
                          handleTabChange('chat');
                        } else if (type === 'task') {
                          handleTabChange('more');
                          setSubScreen('tasks');
                        } else if (type === 'safety' || type === 'map') {
                          handleTabChange('map');
                        } else if (type === 'family') {
                          handleTabChange('more');
                          setSubScreen('memories');
                        }
                      }}
                    />
                  )}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </main>

        {/* Floating Chat Bubble (Intelligent Auto-Hide when in Chat, Map, or Fullscreen Modals to prevent occlusion) */}
        <FloatingChatBubble
          rooms={chatRooms}
          messages={familyService.getMessages(activeChatRoomId)}
          currentMember={currentMember}
          allMembers={members}
          activeRoomId={activeChatRoomId}
          onSelectRoom={(rId) => {
            familyService.enterRoom(rId);
            setActiveChatRoomId(rId);
          }}
          onOpenFullChat={(rId) => {
            if (rId) {
              familyService.enterRoom(rId);
              setActiveChatRoomId(rId);
            }
            handleTabChange('chat');
          }}
          hidden={
            isFullScreenView ||
            mainTab === 'chat' ||
            (mainTab === 'more' && (subScreen === 'chat' || subScreen === 'map')) ||
            isQuickActionOpen ||
            isCreatePostOpen ||
            isAuthModalOpen ||
            openedDirectEvent !== null ||
            selectedMemberProfileId !== null
          }
        />

        {/* Global Bottom Navigation (HIDDEN only when inside Chat room) */}
        <BottomNavigation
          currentTab={mainTab}
          onTabChange={handleTabChange}
          onOpenQuickAction={() => setIsQuickActionOpen(true)}
          chatUnreadCount={totalChatUnread}
          hidden={hideBottomNav}
        />

        {/* Quick Action Floating Bottom Sheet */}
        <QuickActionSheet
          isOpen={isQuickActionOpen}
          onClose={() => setIsQuickActionOpen(false)}
          onSelectAction={handleQuickAction}
        />

        {/* Create / Edit Post Modal */}
        <CreatePostSheet
          isOpen={isCreatePostOpen}
          onClose={() => {
            setIsCreatePostOpen(false);
            setEditingPost(null);
          }}
          currentMember={currentMember}
          editingPost={editingPost}
          onPublishPost={handlePublishPost}
          onUpdatePost={handleUpdatePost}
        />

        {/* Dedicated Mobile Auth Modal (When user wants to switch accounts or register without logging out) */}
        {isAuthModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-0">
            <div className="w-full max-w-md h-[100dvh] bg-[#FFFBF7] overflow-y-auto shadow-2xl flex flex-col">
              <AuthScreen
                allMembers={members}
                familyName={familyInfo.name}
                isModal={true}
                onClose={() => setIsAuthModalOpen(false)}
                onLoginSuccess={handleLoginSuccess}
                onRegisterSuccess={handleRegisterSuccess}
              />
            </div>
          </div>
        )}

        {/* Global Beautiful Confirmation Dialog */}
        <ConfirmDialog
          isOpen={!!confirmOptions}
          options={confirmOptions}
          onClose={() => setConfirmOptions(null)}
        />

        {/* Global Striking SOS Emergency Modal */}
        <SOSAlertModal
          isOpen={!!sosAlertData}
          alertData={sosAlertData}
          onClose={() => setSOSAlertData(null)}
          onOpenMap={() => {
            handleTabChange('map');
            setSubScreen('hub');
          }}
        />
      </div>
    </div>
  );
}
