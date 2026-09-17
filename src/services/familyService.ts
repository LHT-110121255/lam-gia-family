import {
  FamilyMember,
  FamilyInfo,
  FamilyPost,
  MemoryMilestone,
  MemoryAlbum,
  OnThisDayItem,
  CalendarEvent,
  SharedTaskList,
  FamilyPoll,
  ChatRoom,
  ChatMessage,
  SafetyCheckIn,
  FamilyWallet,
  AppNotification,
  AppSettings,
  LocationShareState,
  FinanceTransaction,
  SplitBill,
  FamilyPlace,
  AlbumPhoto,
} from '../types';

import {
  INITIAL_FAMILY_INFO,
  INITIAL_MEMBERS,
  INITIAL_POSTS,
  INITIAL_MILESTONES,
  INITIAL_ALBUMS,
  INITIAL_ON_THIS_DAY,
  INITIAL_EVENTS,
  INITIAL_TASKS,
  INITIAL_POLLS,
  INITIAL_CHAT_ROOMS,
  INITIAL_MESSAGES,
  INITIAL_CHECKINS,
  INITIAL_WALLET,
  INITIAL_NOTIFICATIONS,
  INITIAL_SETTINGS,
} from '../mock/initialData';
import { socketService } from './socket';

const STORAGE_PREFIX = 'family_hub_';

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, data: T): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

type Listener = () => void;

class FamilyService {
  private listeners: Set<Listener> = new Set();
  private initialized = false;
  private storageStatsCache: { data: any; timestamp: number } | null = null;

  constructor() {
    this.checkAppVersion();
    this.initRealtimeSync();
  }

  private checkAppVersion() {
    try {
      const currentVersion = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0';
      const storedVersion = localStorage.getItem('family_hub_app_version');
      if (!storedVersion) {
        localStorage.setItem('family_hub_app_version', currentVersion);
        console.log(`🚀 [Lâm Gia Hub] Khởi chạy phiên bản v${currentVersion}`);
      } else if (storedVersion !== currentVersion) {
        console.log(`✨ [Lâm Gia Hub] Đã nâng cấp từ v${storedVersion} lên v${currentVersion}`);
        localStorage.setItem('family_hub_app_version', currentVersion);
      }
    } catch {
      // Ignored if local storage unavailable
    }
  }

  private initRealtimeSync() {
    if (this.initialized) return;
    this.initialized = true;

    // 1. Kết nối Socket & lắng nghe thay đổi thông tin thành viên từ backend
    socketService.connect();
    socketService.onMemberUpdated((remoteUser) => {
      if (!remoteUser) return;
      const members = this.getAllMembers();
      const id = remoteUser._id || remoteUser.id;
      const idx = members.findIndex(
        (m) => m.id === id || (remoteUser.username && m.username === remoteUser.username)
      );
      if (idx >= 0) {
        members[idx] = {
          ...members[idx],
          ...remoteUser,
          id: members[idx].id,
          avatar: remoteUser.avatar || members[idx].avatar,
          name: remoteUser.name || members[idx].name,
        };
        save('members', members);
        this.notify();
      }
    });

    // 2. Lắng nghe thay đổi địa điểm trên bản đồ Realtime
    socketService.onNewPlace((place) => {
      if (!place) return;
      const list = this.getPlaces();
      const id = place._id || place.id;
      if (!list.some((p) => p.id === id)) {
        const formatted: FamilyPlace = {
          id,
          name: place.name,
          address: place.address,
          latitude: place.latitude,
          longitude: place.longitude,
          category: place.category || 'Nhà riêng',
          imageUrl: place.imageUrl,
          notes: place.notes,
          createdById: place.createdById,
          createdByName: place.createdByName,
          createdByAvatar: place.createdByAvatar,
          createdAt: place.createdAt || new Date().toISOString(),
        };
        save('places', [formatted, ...list]);
        this.notify();
      }
    });

    socketService.onUpdatePlace((place) => {
      if (!place) return;
      const list = this.getPlaces();
      const id = place._id || place.id;
      const next = list.map((p) => (p.id === id ? { ...p, ...place, id } : p));
      save('places', next);
      this.notify();
    });

    socketService.onDeletePlace((placeId) => {
      if (!placeId) return;
      const list = this.getPlaces().filter((p) => p.id !== placeId);
      save('places', list);
      this.notify();
    });

    // 3. Lắng nghe Sự kiện Lịch gia đình
    socketService.onNewEvent((event) => {
      if (!event) return;
      const list = this.getEvents();
      const id = event._id || event.id;
      if (!list.some((e) => e.id === id)) {
        save('events', [{ ...event, id }, ...list]);
        this.notify();
      }
    });
    socketService.onUpdateEvent((event) => {
      if (!event) return;
      const list = this.getEvents();
      const id = event._id || event.id;
      save('events', list.map((e) => (e.id === id ? { ...e, ...event, id } : e)));
      this.notify();
    });
    socketService.onDeleteEvent(({ eventId }) => {
      if (!eventId) return;
      save('events', this.getEvents().filter((e) => e.id !== eventId));
      this.notify();
    });

    // 4. Lắng nghe Việc chung & Mua sắm (Checklists)
    socketService.onNewChecklist((chk) => {
      if (!chk) return;
      const list = this.getTaskLists();
      const id = chk._id || chk.id;
      if (!list.some((t) => t.id === id)) {
        save('tasks', [{ ...chk, id }, ...list]);
        this.notify();
      }
    });
    socketService.onUpdateChecklist((chk) => {
      if (!chk) return;
      const list = this.getTaskLists();
      const id = chk._id || chk.id;
      save('tasks', list.map((t) => (t.id === id ? { ...t, ...chk, id } : t)));
      this.notify();
    });
    socketService.onDeleteChecklist(({ checklistId }) => {
      if (!checklistId) return;
      save('tasks', this.getTaskLists().filter((t) => t.id !== checklistId));
      this.notify();
    });

    // 5. Lắng nghe Quỹ & Thu chi / Chia tiền
    socketService.onNewTransaction((tx) => {
      if (!tx) return;
      const wallet = this.getWallet();
      const id = tx._id || tx.id;
      if (!wallet.transactions.some((t) => t.id === id)) {
        const newBalance = tx.type === 'in' ? wallet.balance + tx.amount : wallet.balance - tx.amount;
        const newTotalIn = tx.type === 'in' ? wallet.totalIn + tx.amount : wallet.totalIn;
        const newTotalOut = tx.type === 'out' ? wallet.totalOut + tx.amount : wallet.totalOut;
        save('wallet', {
          ...wallet,
          balance: newBalance,
          totalIn: newTotalIn,
          totalOut: newTotalOut,
          transactions: [{ ...tx, id }, ...wallet.transactions],
        });
        this.notify();
      }
    });
    socketService.onDeleteTransaction(({ transactionId }) => {
      if (!transactionId) return;
      const wallet = this.getWallet();
      const tx = wallet.transactions.find((t) => t.id === transactionId);
      if (tx) {
        const newBalance = tx.type === 'in' ? wallet.balance - tx.amount : wallet.balance + tx.amount;
        const newTotalIn = tx.type === 'in' ? wallet.totalIn - tx.amount : wallet.totalIn;
        const newTotalOut = tx.type === 'out' ? wallet.totalOut - tx.amount : wallet.totalOut;
        save('wallet', {
          ...wallet,
          balance: newBalance,
          totalIn: newTotalIn,
          totalOut: newTotalOut,
          transactions: wallet.transactions.filter((t) => t.id !== transactionId),
        });
        this.notify();
      }
    });
    socketService.onNewSplitBill((bill) => {
      if (!bill) return;
      const wallet = this.getWallet();
      const id = bill._id || bill.id;
      if (!wallet.splitBills.some((b) => b.id === id)) {
        save('wallet', { ...wallet, splitBills: [{ ...bill, id }, ...wallet.splitBills] });
        this.notify();
      }
    });
    socketService.onUpdateSplitBill((bill) => {
      if (!bill) return;
      const wallet = this.getWallet();
      const id = bill._id || bill.id;
      save('wallet', {
        ...wallet,
        splitBills: wallet.splitBills.map((b) => (b.id === id ? { ...b, ...bill, id } : b)),
      });
      this.notify();
    });
    socketService.onDeleteSplitBill(({ splitBillId }) => {
      if (!splitBillId) return;
      const wallet = this.getWallet();
      save('wallet', { ...wallet, splitBills: wallet.splitBills.filter((b) => b.id !== splitBillId) });
      this.notify();
    });

    // 6. Lắng nghe Album & Kỷ niệm
    socketService.onNewAlbum((album) => {
      if (!album) return;
      const list = this.getAlbums();
      const id = album._id || album.id;
      if (!list.some((a) => a.id === id)) {
        save('albums', [{ ...album, id }, ...list]);
        this.notify();
      }
    });
    socketService.onUpdateAlbum((album) => {
      if (!album) return;
      const list = this.getAlbums();
      const id = album._id || album.id;
      save('albums', list.map((a) => (a.id === id ? { ...a, ...album, id } : a)));
      this.notify();
    });
    socketService.onDeleteAlbum(({ albumId }) => {
      if (!albumId) return;
      save('albums', this.getAlbums().filter((a) => a.id !== albumId));
      this.notify();
    });
    socketService.onNewMilestone((mile) => {
      if (!mile) return;
      const list = this.getMilestones();
      const id = mile._id || mile.id;
      if (!list.some((m) => m.id === id)) {
        save('milestones', [{ ...mile, id }, ...list]);
        this.notify();
      }
    });
    socketService.onDeleteMilestone(({ milestoneId }) => {
      if (!milestoneId) return;
      save('milestones', this.getMilestones().filter((m) => m.id !== milestoneId));
      this.notify();
    });

    // 7. Lắng nghe Bình chọn (Polls)
    socketService.onNewPoll((poll) => {
      if (!poll) return;
      const list = this.getPolls();
      const id = poll._id || poll.id;
      if (!list.some((p) => p.id === id)) {
        save('polls', [{ ...poll, id }, ...list]);
        this.notify();
      }
    });
    socketService.onUpdatePoll((poll) => {
      if (!poll) return;
      const list = this.getPolls();
      const id = poll._id || poll.id;
      save('polls', list.map((p) => (p.id === id ? { ...p, ...poll, id } : p)));
      this.notify();
    });
    socketService.onDeletePoll(({ pollId }) => {
      if (!pollId) return;
      save('polls', this.getPolls().filter((p) => p.id !== pollId));
      this.notify();
    });

    // 8. Lắng nghe Thông tin Gia Đình
    socketService.onUpdateFamilyInfo((info) => {
      if (!info) return;
      save('info', { ...this.getFamilyInfo(), ...info });
      this.notify();
    });

    // 9. Lắng nghe Bài Viết, Thả Tym, Bình Luận (Posts Realtime)
    socketService.onNewPost((post) => {
      if (!post) return;
      const list = this.getPosts();
      const id = post._id || post.id;
      if (!list.some((p) => p.id === id)) {
        save('posts', [{ ...post, id }, ...list]);
        this.notify();
      }
    });

    socketService.onPostUpdated((post) => {
      if (!post) return;
      const list = this.getPosts();
      const id = post._id || post.id;
      const next = list.map((p) => (p.id === id ? { ...p, ...post, id } : p));
      save('posts', next);
      this.notify();
    });

    socketService.onPostDeleted(({ postId }) => {
      if (!postId) return;
      const list = this.getPosts().filter((p) => p.id !== postId);
      save('posts', list);
      this.notify();
    });

    // 10. Lắng nghe Tin Nhắn Realtime (Chat Messages)
    socketService.onReceiveMessage((msg) => {
      if (!msg) return;
      const roomId = msg.roomId || 'room-all';
      const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
      const messages = all[roomId] || [];
      const id = msg._id || msg.id;

      const tempId = msg.clientTempId;
      const existsIndex = messages.findIndex((m) => m.id === id || (tempId && m.id === tempId));

      let updatedMessages: ChatMessage[];
      if (existsIndex >= 0) {
        updatedMessages = [...messages];
        updatedMessages[existsIndex] = {
          ...updatedMessages[existsIndex],
          ...msg,
          id,
        };
      } else {
        updatedMessages = [...messages, { ...msg, id }];
      }

      all[roomId] = updatedMessages;
      save('chatMessages', all);

      const rooms = this.getChatRooms();
      const rIdx = rooms.findIndex((r) => r.id === roomId);
      if (rIdx >= 0) {
        rooms[rIdx] = {
          ...rooms[rIdx],
          lastMessage: msg.text || (msg.mediaUrl ? '[Hình ảnh]' : 'Tin nhắn mới'),
          lastMessageTime: msg.timestamp || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
        };
        save('chat_rooms', rooms);
      }

      this.notify();
    });

    socketService.onMessageDeleted(({ roomId, messageId }) => {
      if (!messageId) return;
      const rId = roomId || 'room-all';
      const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
      if (all[rId]) {
        all[rId] = all[rId].map((m) =>
          m.id === messageId ? { ...m, isDeleted: true, text: 'Tin nhắn đã được thu hồi' } : m
        );
        save('chatMessages', all);
        this.notify();
      }
    });

    socketService.onMessageReadUpdated(({ roomId, messageId, readBy }) => {
      if (!messageId || !readBy) return;
      const rId = roomId || 'room-all';
      const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
      if (all[rId]) {
        all[rId] = all[rId].map((m) =>
          m.id === messageId ? { ...m, readBy } : m
        );
        save('chatMessages', all);
        this.notify();
      }
    });

    // 11. Lắng nghe Phòng Chat Realtime (Rooms Realtime)
    socketService.onNewRoom((room) => {
      if (!room) return;
      const rooms = this.getChatRooms();
      const id = room._id || room.id;
      if (!rooms.some((r) => r.id === id)) {
        const formatted: ChatRoom = {
          id,
          name: room.name,
          type: room.type || 'custom',
          memberIds: room.memberIds || [],
          adminIds: [room.createdById || ''],
          createdById: room.createdById || '',
          avatar: room.avatar || '',
          description: room.description || '',
          unreadCount: 0,
          lastMessage: room.lastMessage || 'Đã tạo phòng trò chuyện mới',
          lastMessageTime: room.lastMessageTime || 'Vừa xong',
          createdAt: room.createdAt || new Date().toISOString(),
        };
        save('chatRooms', [formatted, ...rooms]);
        this.notify();
      }
    });

    socketService.onUpdateRoom((room) => {
      if (!room) return;
      const rooms = this.getChatRooms();
      const id = room._id || room.id;
      const next = rooms.map((r) => (r.id === id ? { ...r, ...room, id } : r));
      save('chatRooms', next);
      this.notify();
    });

    socketService.onDeleteRoom(({ roomId }) => {
      if (!roomId) return;
      const rooms = this.getChatRooms().filter((r) => r.id !== roomId);
      save('chatRooms', rooms);
      this.notify();
    });

    socketService.onUserStatusChanged(({ userId, online, lastSeen }) => {
      if (!userId) return;
      const members = this.getAllMembers();
      const idx = members.findIndex((m) => m.id === userId || m.username === userId);
      if (idx >= 0) {
        members[idx] = {
          ...members[idx],
          onlineStatus: online ? 'online' : 'offline',
          lastSeen: lastSeen || (online ? 'Vừa xong' : 'Ngoại tuyến'),
        };
        save('members', members);
        this.notify();
      }
    });

    // 12. Lắng nghe Cảm xúc tin nhắn (Reactions) & Ghim tin nhắn (Pinned message)
    socketService.onMessageReactionUpdated(({ roomId, messageId, reactions }) => {
      if (!roomId || !messageId) return;
      const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
      const roomMsgs = all[roomId] || [];
      const updated = roomMsgs.map((m) => (m.id === messageId ? { ...m, reactions: reactions || [] } : m));
      all[roomId] = updated;
      save('chatMessages', all);
      this.notify();
    });

    socketService.onRoomPinnedMessage(({ roomId, pinnedMessageId, pinnedMessageText }) => {
      if (!roomId) return;
      const rooms = this.getChatRooms().map((r) => {
        if (r.id !== roomId) return r;
        return {
          ...r,
          pinnedMessageId: pinnedMessageId || undefined,
          pinnedMessageText: pinnedMessageText || undefined,
        };
      });
      save('chatRooms', rooms);
      this.notify();
    });

    // 13. Lắng nghe Cảnh báo Khẩn cấp (SOS Alert)
    socketService.onSOSAlert((alert) => {
      if (!alert) return;
      const currentMember = this.getCurrentMember();
      const currentUserId = currentMember?.id || (currentMember as any)?._id;

      // Không tự hiển thị lại cảnh báo do chính mình kích hoạt
      if (alert.userId && (alert.userId === currentUserId || alert.userId === (currentMember as any)?.username)) {
        return;
      }

      const notifications = this.getNotifications();
      const isDup = notifications.some((n) => n.type === 'sos' && n.content.includes(alert.userName));
      if (isDup) return;

      this.createNotification({
        title: '🚨 CẢNH BÁO SOS KHẨN CẤP!',
        content: `${alert.userName || 'Thành viên gia đình'} vừa kích hoạt nút SOS khẩn cấp!`,
        type: 'sos',
        category: 'sos',
        targetTab: 'map',
      });
    });

    // 14. Lắng nghe Thông báo gia đình Realtime (In-App Notifications)
    socketService.onNewNotification((notif) => {
      if (!notif) return;
      const currentMember = this.getCurrentMember();
      const currentUserId = currentMember?.id || (currentMember as any)?._id;

      // Không hiển thị lại thông báo do chính mình vừa tạo (đã khởi tạo ở clientSender)
      if (notif.senderId && (notif.senderId === currentUserId || notif.senderId === (currentMember as any)?.username)) {
        return;
      }

      const notifications = this.getNotifications();
      const id = notif._id || notif.id;

      // Lọc trùng theo ID hoặc theo Tiêu đề + Nội dung
      const isDuplicate = notifications.some(
        (n) => (id && n.id === id) || (n.title === notif.title && n.content === notif.content)
      );

      if (!isDuplicate) {
        const newNotif: AppNotification = {
          id: id || ('notif-' + Date.now()),
          title: notif.title,
          content: notif.content,
          type: notif.type || 'family',
          category: (notif.type as any) || 'family',
          time: 'Vừa xong',
          timestamp: notif.createdAt ? new Date(notif.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong',
          read: notif.read || false,
          targetTab: notif.targetTab || 'home',
          targetSubId: notif.targetId,
          senderName: notif.senderName,
          senderAvatar: notif.senderAvatar,
        };
        save('notifications', [newNotif, ...notifications]);
        this.notify();

        // Push OS popup
        const settings = this.getSettings();
        if (settings.pushNotifications) {
          this.triggerSystemNotification(notif.title, {
            body: notif.content,
            tag: id || notif.title,
          });
        }
      }
    });

    // 15. Lắng nghe thay đổi storage từ các tab khác trong cùng trình duyệt
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e) => {
        if (e.key?.startsWith(STORAGE_PREFIX)) {
          this.notify();
        }
      });
    }

    // 16. Khởi chạy đồng bộ toàn bộ dữ liệu từ Backend theo mẻ (Single Batch)
    this.syncAllInitialData();
  }

  public async syncAllInitialData(): Promise<void> {
    try {
      const { api, tokenStorage } = await import('./api');
      const currentMember = this.getCurrentMember();
      const user = tokenStorage.getUser();
      const userId = user?._id || user?.id || currentMember?.id;

      const results = await Promise.allSettled([
        api.getFamilyInfo(),
        api.getAdminUsers(),
        api.getRooms(),
        api.getPosts(),
        api.getPlaces(),
        api.getEvents(),
        api.getChecklists(),
        api.getTransactions(),
        api.getSplitBills(),
        api.getAlbums(),
        api.getMilestones(),
        api.getPolls(),
        api.getNotifications(userId),
        api.getOnThisDay(),
      ]);

      const [
        resFamilyInfo,
        resUsers,
        resRooms,
        resPosts,
        resPlaces,
        resEvents,
        resChecklists,
        resTxs,
        resBills,
        resAlbums,
        resMilestones,
        resPolls,
        resNotifs,
        resOtd,
      ] = results;

      // 1. Family Info
      if (resFamilyInfo.status === 'fulfilled' && resFamilyInfo.value?.name) {
        save('info', { ...this.getFamilyInfo(), ...resFamilyInfo.value });
      }

      // 2. Users / Members
      if (resUsers.status === 'fulfilled' && Array.isArray(resUsers.value) && resUsers.value.length > 0) {
        const localMembers = this.getAllMembers();
        const remoteMap = new Map();
        resUsers.value.forEach((u: any) => {
          const mapped: FamilyMember = {
            id: u._id || u.id,
            username: u.username,
            name: u.name,
            relationship: u.relationship || 'Thành viên',
            role: u.role || 'adult',
            generation: u.generation || 2,
            avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
            birthDate: u.birthDate || '',
            phone: u.phone || '',
            email: u.email || '',
            onlineStatus: 'online',
            jobTitle: u.jobTitle || '',
            locationAddress: u.location?.address || u.address || '',
            latitude: u.location?.latitude || u.latitude,
            longitude: u.location?.longitude || u.longitude,
            approvalStatus: u.approvalStatus || (u.isAdmin ? 'approved' : 'pending'),
            isAdmin: !!u.isAdmin || u.username === 'lamhuetrung',
            isActive: u.isActive !== false,
            createdAt: u.createdAt || new Date().toISOString(),
          };
          remoteMap.set(mapped.id, mapped);
          if (u.username) remoteMap.set(u.username, mapped);
        });

        const merged: FamilyMember[] = [...localMembers];
        remoteMap.forEach((rMember) => {
          const idx = merged.findIndex((m) => m.id === rMember.id || (m.username && m.username === rMember.username));
          if (idx >= 0) {
            merged[idx] = {
              ...merged[idx],
              ...rMember,
              id: merged[idx].id,
              avatar: rMember.avatar && !rMember.avatar.includes('photo-1535713875002') ? rMember.avatar : (merged[idx].avatar || rMember.avatar),
              name: rMember.name || merged[idx].name,
              latitude: merged[idx].latitude || rMember.latitude,
              longitude: merged[idx].longitude || rMember.longitude,
              locationAddress: merged[idx].locationAddress || rMember.locationAddress,
            };
          } else {
            merged.push(rMember);
          }
        });
        save('members', merged);
      }

      // 3. Rooms
      if (resRooms.status === 'fulfilled' && Array.isArray(resRooms.value) && resRooms.value.length > 0) {
        const localRooms = this.getChatRooms();
        const mappedRemote: ChatRoom[] = resRooms.value.map((r: any) => ({
          id: r._id || r.id,
          name: r.name,
          type: r.type || 'custom',
          memberIds: r.memberIds || [],
          adminIds: [r.createdById || ''],
          createdById: r.createdById || '',
          avatar: r.avatar || '',
          description: r.description || '',
          unreadCount: 0,
          pinnedMessageId: r.pinnedMessageId,
          pinnedMessageText: r.pinnedMessageText,
          lastMessage: r.lastMessage || 'Phòng trò chuyện',
          lastMessageTime: r.lastMessageTime || 'Vừa xong',
          createdAt: r.createdAt || new Date().toISOString(),
        }));

        const mergedRooms = [...localRooms];
        mappedRemote.forEach((rem) => {
          const idx = mergedRooms.findIndex((lr) => lr.id === rem.id);
          if (idx >= 0) {
            mergedRooms[idx] = { ...mergedRooms[idx], ...rem };
          } else {
            mergedRooms.push(rem);
          }
        });
        save('chatRooms', mergedRooms);
      }

      // 4. Posts
      if (resPosts.status === 'fulfilled' && Array.isArray(resPosts.value)) {
        const remoteMapped: FamilyPost[] = resPosts.value.map((p: any) => ({
          id: p._id || p.id,
          authorId: p.authorId || 'member-trung',
          authorName: p.authorName,
          authorAvatar: p.authorAvatar,
          content: p.content,
          mediaUrls: p.mediaUrls || [],
          createdAt: p.createdAt || new Date().toISOString(),
          location: p.location,
          feeling: p.feeling,
          likes: Array.isArray(p.likes) ? p.likes : [],
          comments: (p.comments || []).map((c: any) => ({
            id: c._id || c.id || 'c-' + Math.random(),
            authorId: c.authorId,
            authorName: c.authorName,
            authorAvatar: c.authorAvatar,
            content: c.content,
            createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
          })),
          pinned: p.pinned,
          privacy: p.privacy,
        }));
        save('posts', remoteMapped);
      }

      // 5. Places
      if (resPlaces.status === 'fulfilled' && Array.isArray(resPlaces.value)) {
        const mappedPlaces: FamilyPlace[] = resPlaces.value.map((p: any) => ({
          id: p._id || p.id,
          name: p.name,
          address: p.address,
          latitude: p.latitude,
          longitude: p.longitude,
          category: p.category || 'Nhà riêng',
          imageUrl: p.imageUrl,
          notes: p.notes,
          createdById: p.createdById,
          createdByName: p.createdByName,
          createdByAvatar: p.createdByAvatar,
          createdAt: p.createdAt || new Date().toISOString(),
        }));
        save('places', mappedPlaces);
      }

      // 6. Events
      if (resEvents.status === 'fulfilled' && Array.isArray(resEvents.value)) {
        const mappedEvents: CalendarEvent[] = resEvents.value.map((e: any) => ({
          id: e._id || e.id,
          title: e.title,
          type: e.type || 'other',
          date: e.date,
          lunarDateText: e.lunarDateText || '',
          time: e.time || '',
          location: e.location || '',
          participantIds: e.participantIds || [],
          reminderMinutes: e.reminderMinutes || 60,
          note: e.note || '',
          isLunarRecurring: e.isLunarRecurring || false,
          isAnnualRecurring: e.isAnnualRecurring || false,
          createdById: e.createdById,
          createdByName: e.createdByName,
          createdByAvatar: e.createdByAvatar,
        }));
        save('events', mappedEvents);
      }

      // 7. Checklists
      if (resChecklists.status === 'fulfilled' && Array.isArray(resChecklists.value)) {
        const mappedTasks: SharedTaskList[] = resChecklists.value.map((t: any) => ({
          id: t._id || t.id,
          title: t.title,
          category: t.category || 'shopping',
          createdById: t.createdById,
          createdAt: t.createdAt || new Date().toISOString(),
          items: (t.items || []).map((i: any) => ({
            id: i._id || i.id,
            title: i.title,
            completed: !!i.completed,
            completedBy: i.completedBy,
            completedAt: i.completedAt,
            quantity: i.quantity,
          })),
        }));
        save('tasks', mappedTasks);
      }

      // 8. Finance (Txs & Bills)
      let newTransactions: FinanceTransaction[] = [];
      let newSplitBills: SplitBill[] = [];
      if (resTxs.status === 'fulfilled' && Array.isArray(resTxs.value)) {
        newTransactions = resTxs.value.map((t: any) => ({
          id: t._id || t.id,
          title: t.title,
          type: t.type,
          amount: t.amount,
          category: t.category || 'Sinh hoạt',
          memberId: t.memberId,
          payerMemberId: t.payerMemberId,
          date: t.date || new Date().toISOString().split('T')[0],
          note: t.note,
          description: t.description,
          receiptUrl: t.receiptUrl,
        }));
      }
      if (resBills.status === 'fulfilled' && Array.isArray(resBills.value)) {
        newSplitBills = resBills.value.map((b: any) => ({
          id: b._id || b.id,
          title: b.title,
          totalAmount: b.totalAmount,
          date: b.date || new Date().toISOString().split('T')[0],
          payerId: b.payerId,
          createdBy: b.createdBy,
          splits: (b.splits || []).map((s: any) => ({
            memberId: s.memberId,
            amount: s.amount,
            paid: s.paid || false,
            paidAt: s.paidAt,
          })),
        }));
      }
      let totalIn = 0;
      let totalOut = 0;
      newTransactions.forEach((t) => {
        if (t.type === 'in') totalIn += t.amount;
        else if (t.type === 'out') totalOut += t.amount;
      });
      const wallet = this.getWallet();
      save('wallet', {
        ...wallet,
        transactions: newTransactions,
        splitBills: newSplitBills,
        totalIn,
        totalOut,
        balance: totalIn - totalOut,
      });

      // 9. Albums
      if (resAlbums.status === 'fulfilled' && Array.isArray(resAlbums.value)) {
        const mappedAlbums: MemoryAlbum[] = resAlbums.value.map((a: any) => ({
          id: a._id || a.id,
          title: a.title,
          category: a.category || 'Kỷ niệm',
          coverUrl: a.coverUrl || '',
          photoCount: a.photoCount || a.photos?.length || 0,
          photos: (a.photos || []).map((p: any) => ({
            id: p._id || p.id,
            url: p.url,
            caption: p.caption,
            date: p.date,
            taggedMemberIds: p.taggedMemberIds || [],
          })),
        }));
        save('albums', mappedAlbums);
      }

      // 10. Milestones
      if (resMilestones.status === 'fulfilled' && Array.isArray(resMilestones.value)) {
        const mappedMilestones: MemoryMilestone[] = resMilestones.value.map((m: any) => ({
          id: m._id || m.id,
          year: m.year,
          date: m.date,
          title: m.title,
          location: m.location || '',
          description: m.description || '',
          coverUrl: m.coverUrl || '',
          photos: m.photos || [],
          taggedMemberIds: m.taggedMemberIds || [],
          aiStorySummary: m.aiStorySummary,
        }));
        save('milestones', mappedMilestones);
      }

      // 11. Polls
      if (resPolls.status === 'fulfilled' && Array.isArray(resPolls.value)) {
        const mappedPolls: FamilyPoll[] = resPolls.value.map((p: any) => ({
          id: p._id || p.id,
          question: p.question,
          createdById: p.createdById,
          allowMultiple: !!p.allowMultiple,
          closed: !!p.closed,
          createdAt: p.createdAt || new Date().toISOString(),
          options: (p.options || []).map((o: any) => ({
            id: o._id || o.id,
            text: o.text,
            voterIds: o.voterIds || [],
          })),
        }));
        save('polls', mappedPolls);
      }

      // 12. Notifications
      if (resNotifs.status === 'fulfilled' && Array.isArray(resNotifs.value)) {
        const mappedNotifs: AppNotification[] = resNotifs.value.map((n: any) => ({
          id: n._id || n.id,
          title: n.title,
          content: n.content,
          type: n.type || 'family',
          category: (n.type as any) || 'family',
          time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
          timestamp: n.createdAt ? new Date(n.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong',
          read: n.read || false,
          targetTab: n.targetTab || 'home',
          targetSubId: n.targetId,
          senderName: n.senderName,
          senderAvatar: n.senderAvatar,
        }));
        save('notifications', mappedNotifs);
      }

      // 13. On This Day
      if (resOtd.status === 'fulfilled' && resOtd.value) {
        save('onThisDay', resOtd.value);
      }

      // Single notification trigger after complete initial batch sync
      this.notify();
    } catch (err) {
      console.warn('Initial batch sync warning:', err);
      this.notify();
    }
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // --- FAMILY INFO & MEMBERS ---
  public getFamilyInfo(): FamilyInfo {
    return load('info', INITIAL_FAMILY_INFO);
  }

  public syncFamilyInfoFromBackend(): void {
    import('./api').then(({ api }) => {
      api.getFamilyInfo().then((info) => {
        if (info && info.name) {
          save('info', { ...this.getFamilyInfo(), ...info });
          this.notify();
        }
      }).catch((err) => console.warn('Sync family info note:', err));
    });
  }

  public updateFamilyInfo(info: Partial<FamilyInfo>): void {
    const current = this.getFamilyInfo();
    const updated = { ...current, ...info };
    save('info', updated);
    this.notify();

    import('./api').then(({ api }) => {
      api.updateFamilyInfo(updated).catch((err) => console.warn('Update family info remote note:', err));
    });
  }

  public syncMembersFromBackend(): void {
    import('./api').then(({ api }) => {
      api.getUsers().then((remoteUsers) => {
        if (Array.isArray(remoteUsers) && remoteUsers.length > 0) {
          const localMembers = this.getAllMembers();
          const merged = [...localMembers];

          remoteUsers.forEach((ru: any) => {
            const idx = merged.findIndex(
              (m) =>
                m.id === ru._id ||
                m.id === ru.id ||
                (ru.username && m.username && m.username.toLowerCase() === ru.username.toLowerCase())
            );
            const formatted: FamilyMember = {
              id: ru._id || ru.id || (ru.username ? `member-${ru.username}` : 'member-' + Date.now()),
              username: ru.username,
              name: ru.name || ru.username,
              relationship: ru.relationship || 'Thành viên',
              role: ru.role || 'adult',
              generation: ru.generation || 2,
              avatar: ru.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
              birthDate: ru.birthDate || '',
              phone: ru.phone || '',
              email: ru.email || '',
              onlineStatus: ru.onlineStatus || 'online',
              lastSeen: ru.lastSeen || 'Vừa xong',
              batteryLevel: typeof ru.batteryLevel === 'number' ? ru.batteryLevel : 90,
              currentZone: ru.currentZone || '',
              locationAddress: ru.locationAddress || ru.address || '',
              latitude: typeof ru.latitude === 'number' ? ru.latitude : undefined,
              longitude: typeof ru.longitude === 'number' ? ru.longitude : undefined,
              jobTitle: ru.jobTitle || '',
              approvalStatus: ru.approvalStatus || 'approved',
              isAdmin: !!ru.isAdmin || ru.username === 'lamhuetrung',
              isActive: ru.isActive !== false,
            };
            if (idx >= 0) {
              const existing = merged[idx];
              const ruAvatar = (ru.avatar && ru.avatar.trim() && !ru.avatar.includes('photo-1535713875002')) ? ru.avatar : null;
              const existingAvatar = (existing.avatar && existing.avatar.trim() && !existing.avatar.includes('photo-1535713875002')) ? existing.avatar : null;
              const finalAvatar = ruAvatar || existingAvatar || formatted.avatar;

              merged[idx] = {
                ...formatted,
                ...existing,
                name: ru.name || existing.name || formatted.name,
                avatar: finalAvatar,
                phone: ru.phone || existing.phone || formatted.phone,
                email: ru.email || existing.email || formatted.email,
                relationship: ru.relationship || existing.relationship || formatted.relationship,
                role: ru.role || existing.role || formatted.role,
                jobTitle: ru.jobTitle || existing.jobTitle || formatted.jobTitle,
                birthDate: ru.birthDate || existing.birthDate || formatted.birthDate,
                bloodType: ru.bloodType || existing.bloodType,
                allergies: ru.allergies || existing.allergies,
                medicalNotes: ru.medicalNotes || existing.medicalNotes,
                hobbies: ru.hobbies || existing.hobbies,
                id: existing.id || formatted.id,
              };
            } else {
              merged.push(formatted);
            }
          });

          save('members', merged);
          this.notify();
        }
      }).catch((err) => console.warn('Sync members remote note:', err));
    });
  }

  public getAllMembers(): FamilyMember[] {
    return load('members', INITIAL_MEMBERS);
  }

  public getMembers(): FamilyMember[] {
    const all = this.getAllMembers();
    // Trả về các thành viên đã duyệt (hoặc không có trường pending/rejected)
    return all.filter((m) => m.approvalStatus !== 'pending' && m.approvalStatus !== 'rejected');
  }

  public getPendingMembers(): FamilyMember[] {
    const all = this.getAllMembers();
    return all.filter((m) => m.approvalStatus === 'pending');
  }

  public getApprovedMembers(): FamilyMember[] {
    const all = this.getAllMembers();
    return all.filter((m) => m.approvalStatus === 'approved' || (!m.approvalStatus && m.id));
  }

  public getRejectedMembers(): FamilyMember[] {
    const all = this.getAllMembers();
    return all.filter((m) => m.approvalStatus === 'rejected' || m.isActive === false);
  }

  public getMemberById(id: string): FamilyMember | undefined {
    if (!id) return undefined;
    const clean = id.trim().toLowerCase();
    return this.getAllMembers().find((m) => {
      const mId = (m.id || '').toLowerCase();
      const mMongoId = ((m as any)._id || '').toLowerCase();
      const mUsername = (m.username || '').toLowerCase();
      const mPhone = (m.phone || '').replace(/\s+/g, '');
      const mEmail = (m.email || '').toLowerCase();
      return (
        mId === clean ||
        mMongoId === clean ||
        mUsername === clean ||
        (mPhone && mPhone === clean) ||
        (mEmail && mEmail === clean) ||
        (clean === 'member-trung' && (mUsername === 'lamhuetrung' || mId === 'member-trung')) ||
        (clean === 'member-thuc' && (mUsername === 'lamhuethuc' || mId === 'member-thuc')) ||
        (clean === 'member-tri' && (mUsername === 'lamhuetri' || mId === 'member-tri')) ||
        (clean === 'member-gam' && (mUsername === 'honggam' || mId === 'member-gam'))
      );
    });
  }

  public getCurrentMember(): FamilyMember {
    // 1. Ưu tiên cao nhất: Lấy từ auth_user session thực tế đang đăng nhập
    if (typeof localStorage !== 'undefined') {
      try {
        const rawAuthUser = localStorage.getItem('family_hub_auth_user');
        if (rawAuthUser) {
          const authUser = JSON.parse(rawAuthUser);
          if (authUser) {
            const member = this.getMemberById(authUser.username || authUser._id || authUser.id);
            if (member) return member;
            return {
              id: authUser._id || authUser.id || (authUser.username ? `member-${authUser.username}` : 'member-' + Date.now()),
              username: authUser.username,
              name: authUser.name || authUser.username,
              relationship: authUser.relationship || 'Thành viên',
              role: authUser.role || 'adult',
              generation: authUser.generation || 2,
              avatar: authUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
              birthDate: authUser.birthDate || '',
              phone: authUser.phone || '',
              email: authUser.email || '',
              onlineStatus: 'online',
              jobTitle: authUser.jobTitle || '',
              locationAddress: authUser.address || '',
              approvalStatus: authUser.approvalStatus || 'approved',
              isAdmin: !!authUser.isAdmin || authUser.username === 'lamhuetrung',
            };
          }
        }
      } catch {}
    }

    const settings = this.getSettings();
    let member = this.getMemberById(settings.currentUserId);
    if (member) return member;

    return this.getApprovedMembers()[0] || this.getAllMembers()[0];
  }

  public setCurrentUser(memberId: string): void {
    const found = this.getMemberById(memberId);
    const finalId = found ? found.id : memberId;
    this.updateSettings({ currentUserId: finalId, isLoggedIn: true });
  }

  private remoteUpdateTimers: Map<string, any> = new Map();
  private pendingRemoteUpdates: Map<string, Partial<FamilyMember>> = new Map();
  private lastRemoteCallTime: Map<string, number> = new Map();

  private scheduleRemoteUpdate(apiUserId: string, updates: Partial<FamilyMember>) {
    const HIGH_FREQ_KEYS = new Set(['latitude', 'longitude', 'locationAddress', 'lastLocationUpdated', 'lastSeen', 'onlineStatus', 'batteryLevel']);
    const isHighFreqOnly = Object.keys(updates).every((key) => HIGH_FREQ_KEYS.has(key));

    if (!isHighFreqOnly) {
      // Dữ liệu profile quan trọng -> Gửi ngay lập tức
      import('./api').then(({ api }) => {
        api.updateUser(apiUserId, updates).catch((err) => console.warn('Update user remote note:', err));
      });
      return;
    }

    // Dữ liệu vị trí/trạng thái tần suất cao -> Throttle tối đa 1 lần mỗi 30 giây
    const pending = this.pendingRemoteUpdates.get(apiUserId) || {};
    this.pendingRemoteUpdates.set(apiUserId, { ...pending, ...updates });

    const now = Date.now();
    const lastTime = this.lastRemoteCallTime.get(apiUserId) || 0;
    const THROTTLE_MS = 30000; // 30s

    if (this.remoteUpdateTimers.has(apiUserId)) {
      return;
    }

    const delay = Math.max(0, THROTTLE_MS - (now - lastTime));
    const timer = setTimeout(() => {
      this.remoteUpdateTimers.delete(apiUserId);
      const toSend = this.pendingRemoteUpdates.get(apiUserId);
      if (toSend && Object.keys(toSend).length > 0) {
        this.pendingRemoteUpdates.delete(apiUserId);
        this.lastRemoteCallTime.set(apiUserId, Date.now());
        import('./api').then(({ api }) => {
          api.updateUser(apiUserId, toSend).catch((err) => console.warn('Update user remote note:', err));
        });
      }
    }, delay);

    this.remoteUpdateTimers.set(apiUserId, timer);
  }

  public updateMember(id: string, updates: Partial<FamilyMember>, options?: { skipRemoteApi?: boolean }): FamilyMember | undefined {
    const members = this.getAllMembers();
    let updatedMember: FamilyMember | undefined;
    const target = this.getMemberById(id);

    const nextMembers = members.map((m) => {
      if (m.id === id || (target && m.id === target.id) || (target && m.username && m.username === target.username)) {
        updatedMember = { ...m, ...updates };
        return updatedMember;
      }
      return m;
    });
    save('members', nextMembers);

    // Cập nhật auth_user session trong localStorage nếu thành viên được sửa là người dùng đang đăng nhập
    if (updatedMember && typeof localStorage !== 'undefined') {
      try {
        const rawAuthUser = localStorage.getItem('family_hub_auth_user');
        if (rawAuthUser) {
          const authUser = JSON.parse(rawAuthUser);
          if (
            authUser &&
            (authUser.username === updatedMember.username ||
              authUser._id === updatedMember.id ||
              authUser.id === updatedMember.id ||
              id === authUser._id ||
              id === authUser.id)
          ) {
            const nextAuthUser = { ...authUser, ...updatedMember };
            localStorage.setItem('family_hub_auth_user', JSON.stringify(nextAuthUser));
          }
        }
      } catch (err) {
        console.warn('Sync auth user storage note:', err);
      }
    }

    this.notify();

    // Gửi cập nhật lên backend MongoDB Atlas (Throttled nếu là GPS/Trạng thái, Skip nếu là socket echo)
    if (!options?.skipRemoteApi) {
      const apiUserId = target ? ((target as any)._id || target.username || target.id) : id;
      this.scheduleRemoteUpdate(apiUserId, updates);
    }

    return updatedMember;
  }

  public addMember(memberData: Omit<FamilyMember, 'id'>): FamilyMember {
    const members = this.getAllMembers();
    const newMember: FamilyMember = {
      ...memberData,
      id: 'member-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    save('members', [...members, newMember]);
    this.notify();
    return newMember;
  }

  // --- ADMIN ACCOUNT MANAGEMENT ACTIONS ---
  public approveMember(memberId: string): void {
    this.updateMember(memberId, {
      approvalStatus: 'approved',
      isActive: true,
    });
    import('./api').then(({ api }) => {
      api.approveUser(memberId).catch((err) => console.warn('Approve user remote api note:', err));
    });
  }

  public rejectMember(memberId: string): void {
    this.updateMember(memberId, {
      approvalStatus: 'rejected',
    });
    import('./api').then(({ api }) => {
      api.rejectUser(memberId).catch((err) => console.warn('Reject user remote api note:', err));
    });
  }

  public toggleMemberActive(memberId: string, isActive: boolean): void {
    this.updateMember(memberId, { isActive });
    import('./api').then(({ api }) => {
      api.updateUserStatus(memberId, { isActive }).catch((err) => console.warn('Update user status remote api note:', err));
    });
  }

  public deleteMemberAccount(memberId: string): void {
    const members = this.getAllMembers().filter((m) => m.id !== memberId);
    save('members', members);
    this.notify();
    import('./api').then(({ api }) => {
      api.deleteUser(memberId).catch((err) => console.warn('Delete user remote api note:', err));
    });
  }

  public syncUsersFromBackend(): void {
    import('./api').then(({ api }) => {
      api.getAdminUsers().then((remoteUsers) => {
        if (remoteUsers && Array.isArray(remoteUsers) && remoteUsers.length > 0) {
          const localMembers = this.getAllMembers();
          const remoteMap = new Map();
          remoteUsers.forEach((u: any) => {
            const mapped: FamilyMember = {
              id: u._id || u.id,
              username: u.username,
              name: u.name,
              relationship: u.relationship || 'Thành viên',
              role: u.role || 'adult',
              generation: u.generation || 2,
              avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
              birthDate: u.birthDate || '',
              phone: u.phone || '',
              email: u.email || '',
              onlineStatus: 'online',
              jobTitle: u.jobTitle || '',
              locationAddress: u.location?.address || u.address || '',
              latitude: u.location?.latitude || u.latitude,
              longitude: u.location?.longitude || u.longitude,
              approvalStatus: u.approvalStatus || (u.isAdmin ? 'approved' : 'pending'),
              isAdmin: !!u.isAdmin || u.username === 'lamhuetrung',
              isActive: u.isActive !== false,
              createdAt: u.createdAt || new Date().toISOString(),
            };
            remoteMap.set(mapped.id, mapped);
            if (u.username) remoteMap.set(u.username, mapped);
          });

          // Merge local & remote một cách an toàn
          const merged: FamilyMember[] = [...localMembers];
          remoteMap.forEach((rMember) => {
            const idx = merged.findIndex((m) => m.id === rMember.id || (m.username && m.username === rMember.username));
            if (idx >= 0) {
              merged[idx] = {
                ...merged[idx],
                ...rMember,
                id: merged[idx].id,
                // Ưu tiên avatar và name không bị rỗng
                avatar: rMember.avatar && !rMember.avatar.includes('photo-1535713875002') ? rMember.avatar : (merged[idx].avatar || rMember.avatar),
                name: rMember.name || merged[idx].name,
                latitude: merged[idx].latitude || rMember.latitude,
                longitude: merged[idx].longitude || rMember.longitude,
                locationAddress: merged[idx].locationAddress || rMember.locationAddress,
              };
            } else {
              merged.push(rMember);
            }
          });

          save('members', merged);
          this.notify();
        }
      }).catch((err) => console.warn('Sync users from backend note:', err));
    });
  }

  public login(identifier: string, password?: string): { success: boolean; isPending?: boolean; member?: FamilyMember; message?: string } {
    const cleanId = identifier.trim().toLowerCase().replace(/\s+/g, '');
    const members = this.getAllMembers();

    // Map username mặc định
    const USERNAME_MAP: Record<string, string> = {
      lamhuetrung: 'member-trung',
      lamhuethuc: 'member-thuc',
      lamhuetri: 'member-tri',
      honggam: 'member-gam',
      ngocha: 'member-ha',
    };

    const targetId = USERNAME_MAP[cleanId];
    if (targetId) {
      const member = members.find((m) => m.id === targetId);
      if (member) {
        if (member.approvalStatus === 'pending') {
          return {
            success: false,
            isPending: true,
            message: 'Tài khoản của bạn đang chờ Admin Lâm Huệ Trung phê duyệt.',
          };
        }
        if (member.approvalStatus === 'rejected') {
          return {
            success: false,
            message: 'Tài khoản của bạn đã bị từ chối tham gia gia đình.',
          };
        }
        this.updateSettings({ currentUserId: member.id, isLoggedIn: true });
        return { success: true, member };
      }
    }

    // Tìm kiếm theo phone, email, username, tên không dấu, tên có dấu hoặc ID
    const found = members.find((m) => {
      const phoneClean = m.phone.replace(/\s+/g, '');
      const emailClean = (m.email || '').toLowerCase().trim();
      const usernameClean = (m.username || '').toLowerCase().trim();
      const nameClean = m.name.toLowerCase().replace(/\s+/g, '');
      const nameNoAccent = m.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/đ/g, 'd');
      const idClean = m.id.toLowerCase();

      return (
        usernameClean === cleanId ||
        phoneClean === cleanId ||
        emailClean === cleanId ||
        nameClean === cleanId ||
        nameNoAccent === cleanId ||
        idClean === cleanId ||
        idClean.includes(cleanId) ||
        cleanId.includes(idClean.replace('member-', ''))
      );
    });

    if (found) {
      if (found.approvalStatus === 'pending') {
        return {
          success: false,
          isPending: true,
          message: 'Tài khoản của bạn đang chờ Admin Lâm Huệ Trung phê duyệt.',
        };
      }
      if (found.approvalStatus === 'rejected') {
        return {
          success: false,
          message: 'Tài khoản của bạn đã bị từ chối tham gia gia đình.',
        };
      }
      if (found.isActive === false) {
        return {
          success: false,
          message: 'Tài khoản của bạn đã bị khóa. Vui lòng liên hệ Admin gia đình.',
        };
      }

      this.updateSettings({ currentUserId: found.id, isLoggedIn: true });
      return { success: true, member: found };
    }

    // Fallback cho tài khoản mẫu
    if (members.length > 0 && (cleanId === 'admin' || cleanId === 'user')) {
      const first = members[0];
      this.updateSettings({ currentUserId: first.id, isLoggedIn: true });
      return { success: true, member: first };
    }

    return {
      success: false,
      message: 'Không tìm thấy thông tin tài khoản. Vui lòng kiểm tra lại Tên tài khoản hoặc SĐT.',
    };
  }

  public register(data: {
    username?: string;
    name: string;
    relationship: string;
    phone: string;
    email?: string;
    role?: FamilyMember['role'];
    birthDate?: string;
    avatar?: string;
    hobbies?: string[];
    notes?: string;
    bloodType?: string;
    allergies?: string;
    medicalNotes?: string;
    jobTitle?: string;
  }): { success: boolean; pendingApproval: boolean; member: FamilyMember; message: string } {
    const role = data.role || 'adult';
    let generation = 2;
    if (role === 'elder') generation = 1;
    else if (role === 'child' || role === 'teen') generation = 3;

    const defaultAvatar = data.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80';

    const newMember = this.addMember({
      username: data.username?.trim().toLowerCase(),
      name: data.name.trim(),
      relationship: data.relationship.trim() || 'Thành viên',
      role,
      generation,
      avatar: defaultAvatar,
      birthDate: data.birthDate || '1995-01-01',
      phone: data.phone.trim(),
      email: data.email?.trim(),
      onlineStatus: 'offline',
      lastSeen: 'Vừa xong',
      batteryLevel: 99,
      currentZone: 'Nhà chính',
      locationAddress: this.getFamilyInfo().homeAddress,
      isEmergencyContact: false,
      hobbies: data.hobbies || ['Gia đình', 'Nấu ăn', 'Du lịch'],
      notes: data.notes || '',
      bloodType: data.bloodType || 'O+',
      allergies: data.allergies || '',
      medicalNotes: data.medicalNotes || '',
      jobTitle: data.jobTitle || '',
      approvalStatus: 'pending', // Mặc định chờ duyệt
      isAdmin: false,
      isActive: true,
      createdAt: new Date().toISOString(),
    });

    // KHÔNG tự động đăng nhập khi đang chờ duyệt
    return {
      success: true,
      pendingApproval: true,
      member: newMember,
      message: 'Đăng ký thành công! Tài khoản của bạn đang chờ Admin Lâm Huệ Trung phê duyệt.',
    };
  }

  public logout(): void {
    import('./api').then(({ api, tokenStorage }) => {
      api.logout().catch((err) => console.error('API logout error:', err));
      tokenStorage.clearTokens();
    });

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('family_hub_access_token');
      localStorage.removeItem('family_hub_refresh_token');
      localStorage.removeItem('family_hub_auth_user');
    }
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.clear();
    }

    this.updateSettings({ currentUserId: '', isLoggedIn: false });
  }

  // --- SETTINGS ---
  public getSettings(): AppSettings {
    const s = load('settings', INITIAL_SETTINGS);
    if (typeof localStorage !== 'undefined') {
      try {
        const authUserRaw = localStorage.getItem('family_hub_auth_user');
        const token = localStorage.getItem('family_hub_access_token');
        if (authUserRaw) {
          const authUser = JSON.parse(authUserRaw);
          if (authUser?.settings) {
            return { ...s, ...authUser.settings };
          }
        } else if (!token) {
          return { ...s, isLoggedIn: false, currentUserId: '' };
        }
      } catch {}
    }
    return s;
  }

  public updateSettings(newSettings: Partial<AppSettings>): void {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    save('settings', updated);
    this.notify();

    // Đồng bộ lên User model trong MongoDB Atlas
    const currentMember = this.getCurrentMember();
    if (currentMember && currentMember.id) {
      import('./api').then(({ api }) => {
        api.updateUser(currentMember.id, { settings: updated }).catch((err) =>
          console.warn('Update user settings note:', err)
        );
      });
    }
  }

  // --- POSTS / FEED ---
  public getPosts(): FamilyPost[] {
    const raw = load('posts', INITIAL_POSTS);
    const seen = new Set<string>();
    return raw.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }

  public syncPostsFromBackend(): void {
    import('./api').then(({ api }) => {
      api.getPosts().then((remotePosts) => {
        if (remotePosts && Array.isArray(remotePosts)) {
          const remoteMapped: FamilyPost[] = remotePosts.map((p: any) => ({
            id: p._id || p.id,
            authorId: p.authorId || 'member-trung',
            authorName: p.authorName,
            authorAvatar: p.authorAvatar,
            content: p.content,
            mediaUrls: p.mediaUrls || [],
            createdAt: p.createdAt || new Date().toISOString(),
            location: p.location,
            feeling: p.feeling,
            likes: Array.isArray(p.likes) ? p.likes : [],
            comments: (p.comments || []).map((c: any) => ({
              id: c._id || c.id || 'c-' + Math.random(),
              authorId: c.authorId,
              authorName: c.authorName,
              authorAvatar: c.authorAvatar,
              content: c.content,
              createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
            })),
            pinned: p.pinned,
            privacy: p.privacy,
          }));

          save('posts', remoteMapped);
          this.notify();
        }
      }).catch(err => console.error('Sync posts error:', err));
    });
  }

  public addPost(post: Omit<FamilyPost, 'id' | 'createdAt' | 'likes' | 'comments'>): FamilyPost {
    const posts = this.getPosts();
    const currentMember = this.getCurrentMember();
    const tempId = 'temp-post-' + Date.now();
    const newPost: FamilyPost = {
      ...post,
      id: tempId,
      createdAt: new Date().toISOString(),
      likes: [],
      comments: [],
    };
    const nextPosts = [newPost, ...posts];
    save('posts', nextPosts);
    this.notify();

    this.createNotification({
      title: 'Bài viết gia đình mới 📸',
      content: `${currentMember.name || 'Thành viên'} vừa chia sẻ bài viết: "${(post.content || 'Khoảnh khắc mới').slice(0, 40)}..."`,
      type: 'family',
      targetTab: 'home',
    });

    // Async sync to Mongo API backend
    import('./api').then(({ api }) => {
      api.createPost({
        authorId: currentMember.id,
        authorName: currentMember.name,
        authorAvatar: currentMember.avatar,
        content: post.content,
        feeling: post.feeling,
        location: post.location,
        mediaUrls: post.mediaUrls,
      }).then((remotePost) => {
        if (remotePost && (remotePost._id || remotePost.id)) {
          const realId = remotePost._id || remotePost.id;
          const currentPosts = this.getPosts();
          const filtered = currentPosts.filter((p) => p.id !== realId && p.id !== tempId);
          const mappedRemote: FamilyPost = {
            id: realId,
            authorId: remotePost.authorId || currentMember.id,
            authorName: remotePost.authorName || currentMember.name,
            authorAvatar: remotePost.authorAvatar || currentMember.avatar,
            content: remotePost.content,
            mediaUrls: remotePost.mediaUrls || [],
            createdAt: remotePost.createdAt || new Date().toISOString(),
            location: remotePost.location,
            feeling: remotePost.feeling,
            likes: remotePost.likes || [],
            comments: remotePost.comments || [],
            pinned: remotePost.pinned,
            privacy: remotePost.privacy,
          };
          save('posts', [mappedRemote, ...filtered]);
          this.notify();
        }
      }).catch((err) => console.error('Failed to publish post to MongoDB backend:', err));
    });

    return newPost;
  }

  public toggleLikePost(postId: string, memberId: string): void {
    const posts = this.getPosts().map((p) => {
      if (p.id !== postId) return p;
      const hasLiked = (p.likes || []).includes(memberId);
      const likes = hasLiked ? p.likes.filter((id) => id !== memberId) : [...(p.likes || []), memberId];
      return { ...p, likes };
    });
    save('posts', posts);
    this.notify();

    const currentMember = this.getMemberById(memberId) || this.getCurrentMember();
    this.createNotification({
      title: 'Cảm xúc mới ❤️',
      content: `${currentMember.name || 'Thành viên'} vừa tương tác với bài viết trên bảng tin.`,
      type: 'family',
      targetTab: 'home',
    });

    // Async sync to backend
    import('./api').then(({ api }) => {
      api.likePost(postId, memberId).catch((err) => console.error('API like error:', err));
    });
  }

  public addComment(postId: string, authorId: string, content: string): void {
    const currentMember = this.getMemberById(authorId) || this.getCurrentMember();
    const newComment = {
      id: 'c-' + Date.now(),
      authorId,
      authorName: currentMember.name,
      authorAvatar: currentMember.avatar,
      content,
      createdAt: new Date().toISOString(),
    };
    const posts = this.getPosts().map((p) => {
      if (p.id !== postId) return p;
      return { ...p, comments: [...(p.comments || []), newComment] };
    });
    save('posts', posts);
    this.notify();

    this.createNotification({
      title: 'Bình luận mới 💬',
      content: `${currentMember.name || 'Thành viên'} vừa bình luận: "${content.slice(0, 40)}..."`,
      type: 'family',
      targetTab: 'home',
    });

    // Async sync to backend
    import('./api').then(({ api }) => {
      api.commentPost(postId, {
        authorId,
        authorName: currentMember.name,
        authorAvatar: currentMember.avatar,
        content,
      }).catch((err) => console.error('API comment error:', err));
    });
  }

  public editComment(postId: string, commentId: string, newContent: string): void {
    const posts = this.getPosts().map((p) => {
      if (p.id !== postId) return p;
      const comments = (p.comments || []).map((c) => {
        if (c.id === commentId) {
          return { ...c, content: newContent.trim() };
        }
        return c;
      });
      return { ...p, comments };
    });
    save('posts', posts);
    this.notify();

    import('./api').then(({ api }) => {
      api.editComment(postId, commentId, newContent).catch((err) => console.error('API edit comment error:', err));
    });
  }

  public deleteComment(postId: string, commentId: string): void {
    const posts = this.getPosts().map((p) => {
      if (p.id !== postId) return p;
      const comments = (p.comments || []).filter((c) => c.id !== commentId);
      return { ...p, comments };
    });
    save('posts', posts);
    this.notify();

    import('./api').then(({ api }) => {
      api.deleteComment(postId, commentId).catch((err) => console.error('API delete comment error:', err));
    });
  }

  public updatePost(postId: string, updates: Partial<FamilyPost>): FamilyPost | undefined {
    let updatedPost: FamilyPost | undefined;
    const posts = this.getPosts().map((p) => {
      if (p.id !== postId) return p;
      updatedPost = { ...p, ...updates };
      return updatedPost;
    });
    save('posts', posts);
    this.notify();
    return updatedPost;
  }

  public deletePost(postId: string): void {
    const posts = this.getPosts().filter((p) => p.id !== postId);
    save('posts', posts);
    this.notify();

    import('./api').then(({ api }) => {
      api.deletePost(postId).catch((err) => console.error('API delete post error:', err));
    });
  }

  // --- MEMORIES ---
  public getMilestones(): MemoryMilestone[] {
    return load('milestones', INITIAL_MILESTONES);
  }

  public syncMilestonesFromBackend(): void {
    import('./api').then(({ api }) => {
      api.getMilestones().then((remoteMilestones) => {
        if (remoteMilestones && Array.isArray(remoteMilestones)) {
          const mapped: MemoryMilestone[] = remoteMilestones.map((m: any) => ({
            id: m._id || m.id,
            year: m.year,
            date: m.date,
            title: m.title,
            location: m.location || '',
            description: m.description || '',
            coverUrl: m.coverUrl || '',
            photos: m.photos || [],
            taggedMemberIds: m.taggedMemberIds || [],
            aiStorySummary: m.aiStorySummary,
          }));
          save('milestones', mapped);
          this.notify();
        }
      }).catch((err) => console.warn('Sync milestones note:', err));
    });
  }

  public addMilestone(milestone: Omit<MemoryMilestone, 'id'>): MemoryMilestone {
    const milestones = this.getMilestones();
    const newMilestone: MemoryMilestone = {
      ...milestone,
      id: 'mile-' + Date.now(),
    };
    save('milestones', [newMilestone, ...milestones]);
    this.notify();

    import('./api').then(({ api }) => {
      api.createMilestone(newMilestone).then((res) => {
        if (res && (res._id || res.id)) {
          const next = this.getMilestones().map((m) =>
            m.id === newMilestone.id ? { ...m, id: res._id || res.id } : m
          );
          save('milestones', next);
          this.notify();
        }
      }).catch((err) => console.warn('Create milestone remote note:', err));
    });

    return newMilestone;
  }

  public deleteMilestone(milestoneId: string): void {
    const milestones = this.getMilestones().filter((m) => m.id !== milestoneId);
    save('milestones', milestones);
    this.notify();

    import('./api').then(({ api }) => {
      api.deleteMilestone(milestoneId).catch((err) => console.warn('Delete milestone remote note:', err));
    });
  }

  public getAlbums(): MemoryAlbum[] {
    return load('albums', INITIAL_ALBUMS);
  }

  public syncAlbumsFromBackend(): void {
    import('./api').then(({ api }) => {
      api.getAlbums().then((remoteAlbums) => {
        if (remoteAlbums && Array.isArray(remoteAlbums)) {
          const mapped: MemoryAlbum[] = remoteAlbums.map((a: any) => ({
            id: a._id || a.id,
            title: a.title,
            category: a.category || 'Kỷ niệm',
            coverUrl: a.coverUrl || '',
            photoCount: a.photoCount || a.photos?.length || 0,
            photos: (a.photos || []).map((p: any) => ({
              id: p._id || p.id,
              url: p.url,
              caption: p.caption,
              date: p.date,
              taggedMemberIds: p.taggedMemberIds || [],
            })),
          }));
          save('albums', mapped);
          this.notify();
        }
      }).catch((err) => console.warn('Sync albums note:', err));
    });
  }

  public getAlbumById(id: string): MemoryAlbum | undefined {
    return this.getAlbums().find((a) => a.id === id);
  }

  public createAlbum(album: {
    title: string;
    category: MemoryAlbum['category'];
    coverUrl: string;
    photos?: AlbumPhoto[];
  }): MemoryAlbum {
    const albums = this.getAlbums();
    const newAlbum: MemoryAlbum = {
      id: 'alb-' + Date.now(),
      title: album.title.trim(),
      category: album.category,
      coverUrl: album.coverUrl,
      photoCount: album.photos?.length || 1,
      photos: album.photos && album.photos.length > 0 ? album.photos : [
        {
          id: 'p-' + Date.now(),
          url: album.coverUrl,
          caption: album.title,
          date: new Date().toISOString().split('T')[0],
          taggedMemberIds: [],
        },
      ],
    };
    save('albums', [newAlbum, ...albums]);
    this.notify();

    import('./api').then(({ api }) => {
      api.createAlbum(newAlbum).then((res) => {
        if (res && (res._id || res.id)) {
          const next = this.getAlbums().map((a) =>
            a.id === newAlbum.id ? { ...a, id: res._id || res.id } : a
          );
          save('albums', next);
          this.notify();
        }
      }).catch((err) => console.warn('Create album remote note:', err));
    });

    return newAlbum;
  }

  public deleteAlbum(albumId: string): void {
    const albums = this.getAlbums().filter((a) => a.id !== albumId);
    save('albums', albums);
    this.notify();

    import('./api').then(({ api }) => {
      api.deleteAlbum(albumId).catch((err) => console.warn('Delete album remote note:', err));
    });
  }

  public addPhotoToAlbum(albumId: string, photo: { url: string; caption?: string; date: string; taggedMemberIds: string[] }): void {
    const newPhoto = { id: 'p-' + Date.now(), ...photo };
    const albums = this.getAlbums().map((a) => {
      if (a.id !== albumId) return a;
      return {
        ...a,
        photoCount: a.photoCount + 1,
        photos: [newPhoto, ...a.photos],
      };
    });
    save('albums', albums);
    this.notify();

    import('./api').then(({ api }) => {
      api.addAlbumPhotos(albumId, [newPhoto]).catch((err) => console.warn('Add photo to album remote note:', err));
    });
  }

  public deletePhotoFromAlbum(albumId: string, photoId: string): void {
    const albums = this.getAlbums().map((a) => {
      if (a.id !== albumId) return a;
      const filteredPhotos = a.photos.filter((p) => p.id !== photoId);
      const isCoverDeleted = a.photos.find((p) => p.id === photoId)?.url === a.coverUrl;
      const nextCover = filteredPhotos.length > 0 ? (isCoverDeleted ? filteredPhotos[0].url : a.coverUrl) : a.coverUrl;
      return {
        ...a,
        photoCount: Math.max(0, filteredPhotos.length),
        photos: filteredPhotos,
        coverUrl: nextCover,
      };
    });
    save('albums', albums);
    this.notify();

    import('./api').then(({ api }) => {
      api.deleteAlbumPhoto(albumId, photoId).catch((err) => console.warn('Delete photo remote note:', err));
    });
  }

  public getOnThisDay(): OnThisDayItem | null {
    const cached = load<OnThisDayItem | null>('onThisDay', null);
    if (cached) return cached;

    const today = new Date();
    const currentYear = today.getFullYear();

    // 1. Tìm trong bài viết lịch sử có ảnh ở các năm trước
    const posts = this.getPosts();
    const pastPost = posts.find((p) => {
      if (!p.createdAt || !p.mediaUrls || p.mediaUrls.length === 0) return false;
      const pDate = new Date(p.createdAt);
      return !isNaN(pDate.getTime()) && pDate.getFullYear() < currentYear;
    });

    if (pastPost) {
      const pDate = new Date(pastPost.createdAt);
      const yearsAgo = Math.max(1, currentYear - pDate.getFullYear());
      return {
        id: 'otd-' + pastPost.id,
        yearsAgo,
        originalDate: pastPost.createdAt.split('T')[0],
        title: pastPost.feeling ? `Kỷ niệm: ${pastPost.feeling}` : 'Khoảnh khắc đáng nhớ của gia đình',
        location: pastPost.location || '',
        description: pastPost.content,
        photos: pastPost.mediaUrls,
        taggedMemberIds: [pastPost.authorId],
      };
    }

    return null;
  }

  public syncOnThisDayFromBackend(): void {
    import('./api').then(({ api }) => {
      api.getOnThisDay().then((res) => {
        if (res) {
          save('onThisDay', res);
          this.notify();
        }
      }).catch((err) => console.warn('Sync on this day note:', err));
    });
  }

  // --- CALENDAR ---
  public getEvents(): CalendarEvent[] {
    return load('events', INITIAL_EVENTS);
  }

  public syncEventsFromBackend(): void {
    import('./api').then(({ api }) => {
      api.getEvents().then((remoteEvents) => {
        if (remoteEvents && Array.isArray(remoteEvents)) {
          const mapped: CalendarEvent[] = remoteEvents.map((e: any) => ({
            id: e._id || e.id,
            title: e.title,
            type: e.type || 'other',
            date: e.date,
            lunarDateText: e.lunarDateText || '',
            time: e.time || '',
            location: e.location || '',
            participantIds: e.participantIds || [],
            reminderMinutes: e.reminderMinutes || 60,
            note: e.note || '',
            isLunarRecurring: e.isLunarRecurring || false,
            isAnnualRecurring: e.isAnnualRecurring || false,
            createdById: e.createdById,
            createdByName: e.createdByName,
            createdByAvatar: e.createdByAvatar,
          }));
          save('events', mapped);
          this.notify();
        }
      }).catch((err) => console.warn('Sync events note:', err));
    });
  }

  public addEvent(event: Omit<CalendarEvent, 'id'>): CalendarEvent {
    const events = this.getEvents();
    const currentMember = this.getCurrentMember();
    const newEvent: CalendarEvent = {
      ...event,
      id: 'ev-' + Date.now(),
      createdById: event.createdById || currentMember.id,
      createdByName: event.createdByName || currentMember.name,
      createdByAvatar: event.createdByAvatar || currentMember.avatar,
    };
    save('events', [...events, newEvent]);
    this.notify();

    this.createNotification({
      title: 'Sự kiện gia đình mới 📅',
      content: `Sự kiện "${event.title}" (${event.date}) đã được thêm vào lịch gia đình.`,
      type: 'event',
      targetTab: 'more',
    });

    import('./api').then(({ api }) => {
      api.createEvent(newEvent).then((res) => {
        if (res && (res._id || res.id)) {
          const next = this.getEvents().map((e) =>
            e.id === newEvent.id ? { ...e, id: res._id || res.id } : e
          );
          save('events', next);
          this.notify();
        }
      }).catch((err) => console.warn('Create event remote note:', err));
    });

    return newEvent;
  }

  public deleteEvent(eventId: string): void {
    const events = this.getEvents().filter((e) => e.id !== eventId);
    save('events', events);
    this.notify();

    import('./api').then(({ api }) => {
      api.deleteEvent(eventId).catch((err) => console.warn('Delete event remote note:', err));
    });
  }

  // --- TASKS & SHOPPING ---
  public getTaskLists(): SharedTaskList[] {
    return load('tasks', INITIAL_TASKS);
  }

  public syncChecklistsFromBackend(): void {
    import('./api').then(({ api }) => {
      api.getChecklists().then((remoteLists) => {
        if (remoteLists && Array.isArray(remoteLists)) {
          const mapped: SharedTaskList[] = remoteLists.map((l: any) => ({
            id: l._id || l.id,
            title: l.title,
            category: l.category || 'khác',
            dueDate: l.dueDate,
            createdById: l.createdById || '',
            items: (l.items || []).map((i: any) => ({
              id: i._id || i.id,
              title: i.title || i.text,
              completed: i.completed || i.isCompleted || false,
              completedBy: i.completedBy,
              completedAt: i.completedAt,
              assigneeId: i.assigneeId,
              quantity: i.quantity,
            })),
          }));
          save('tasks', mapped);
          this.notify();
        }
      }).catch((err) => console.warn('Sync checklists note:', err));
    });
  }

  public toggleTaskItem(listId: string, itemId: string, completedByName: string): void {
    let willComplete = false;
    const lists = this.getTaskLists().map((list) => {
      if (list.id !== listId) return list;
      const items = list.items.map((item) => {
        if (item.id !== itemId) return item;
        willComplete = !item.completed;
        return {
          ...item,
          completed: willComplete,
          completedBy: willComplete ? completedByName : undefined,
          completedAt: willComplete ? 'Vừa xong' : undefined,
        };
      });
      return { ...list, items };
    });
    save('tasks', lists);
    this.notify();

    if (willComplete) {
      this.createNotification({
        title: 'Nhiệm vụ gia đình hoàn thành ✅',
        content: `${completedByName} đã hoàn thành một công việc gia đình.`,
        type: 'task',
        targetTab: 'more',
      });
    }

    import('./api').then(({ api }) => {
      api.toggleChecklistItem(listId, itemId, willComplete ? completedByName : undefined, willComplete ? 'Vừa xong' : undefined)
        .catch((err) => console.warn('Toggle checklist item remote note:', err));
    });
  }

  public addTaskItem(listId: string, itemTitle: string, quantity?: string, assigneeId?: string): void {
    const newItem = {
      id: 't-' + Date.now(),
      title: itemTitle,
      completed: false,
      quantity,
      assigneeId,
    };
    const lists = this.getTaskLists().map((list) => {
      if (list.id !== listId) return list;
      return { ...list, items: [...list.items, newItem] };
    });
    save('tasks', lists);
    this.notify();

    import('./api').then(({ api }) => {
      api.addChecklistItem(listId, newItem).catch((err) => console.warn('Add checklist item remote note:', err));
    });
  }

  public createTaskList(title: string, category: SharedTaskList['category'], createdById: string): void {
    const lists = this.getTaskLists();
    const newList: SharedTaskList = {
      id: 'task-list-' + Date.now(),
      title,
      category,
      createdById,
      items: [],
    };
    save('tasks', [newList, ...lists]);
    this.notify();

    import('./api').then(({ api }) => {
      api.createChecklist(newList).then((res) => {
        if (res && (res._id || res.id)) {
          const next = this.getTaskLists().map((t) =>
            t.id === newList.id ? { ...t, id: res._id || res.id } : t
          );
          save('tasks', next);
          this.notify();
        }
      }).catch((err) => console.warn('Create checklist remote note:', err));
    });
  }

  // --- POLLS ---
  public getPolls(): FamilyPoll[] {
    return load('polls', INITIAL_POLLS);
  }

  public syncPollsFromBackend(): void {
    import('./api').then(({ api }) => {
      api.getPolls().then((remotePolls) => {
        if (remotePolls && Array.isArray(remotePolls)) {
          const mapped: FamilyPoll[] = remotePolls.map((p: any) => ({
            id: p._id || p.id,
            question: p.question,
            createdById: p.createdById || '',
            createdAt: p.createdAt || new Date().toISOString(),
            deadline: p.deadline,
            allowMultiple: p.allowMultiple || false,
            options: (p.options || []).map((o: any) => ({
              id: o._id || o.id,
              text: o.text,
              voterIds: o.voterIds || [],
            })),
          }));
          save('polls', mapped);
          this.notify();
        }
      }).catch((err) => console.warn('Sync polls note:', err));
    });
  }

  public votePoll(pollId: string, optionId: string, memberId: string): void {
    const polls = this.getPolls().map((poll) => {
      if (poll.id !== pollId) return poll;
      const options = poll.options.map((opt) => {
        const isCurrentOption = opt.id === optionId;
        let voterIds = opt.voterIds.filter((id) => id !== memberId);
        if (isCurrentOption && !opt.voterIds.includes(memberId)) {
          voterIds.push(memberId);
        }
        return { ...opt, voterIds };
      });
      return { ...poll, options };
    });
    save('polls', polls);
    this.notify();

    import('./api').then(({ api }) => {
      api.votePoll(pollId, optionId, memberId).catch((err) => console.warn('Vote poll remote note:', err));
    });
  }

  public createPoll(question: string, optionsText: string[], createdById: string): void {
    const polls = this.getPolls();
    const newPoll: FamilyPoll = {
      id: 'poll-' + Date.now(),
      question,
      createdById,
      createdAt: new Date().toISOString(),
      options: optionsText.filter(Boolean).map((text, idx) => ({
        id: `opt-${Date.now()}-${idx}`,
        text,
        voterIds: [],
      })),
    };
    save('polls', [newPoll, ...polls]);
    this.notify();

    import('./api').then(({ api }) => {
      api.createPoll(newPoll).then((res) => {
        if (res && (res._id || res.id)) {
          const next = this.getPolls().map((p) =>
            p.id === newPoll.id ? { ...p, id: res._id || res.id } : p
          );
          save('polls', next);
          this.notify();
        }
      }).catch((err) => console.warn('Create poll remote note:', err));
    });
  }

  // --- CHAT ---
  public getChatRooms(): ChatRoom[] {
    return load('chatRooms', INITIAL_CHAT_ROOMS);
  }

  public syncRoomsFromBackend(): void {
    const currentMember = this.getCurrentMember();
    import('./api').then(({ api }) => {
      api.getRooms(currentMember?.id).then((remoteRooms) => {
        if (remoteRooms && Array.isArray(remoteRooms) && remoteRooms.length > 0) {
          const mapped: ChatRoom[] = remoteRooms.map((r: any) => ({
            id: r._id?.toString() || r.id,
            name: r.name,
            type: r.type || 'custom',
            memberIds: r.memberIds || [],
            adminIds: [r.createdById || ''],
            createdById: r.createdById || '',
            avatar: r.avatar || '',
            description: r.description || '',
            pinnedMessageText: r.pinnedMessageText || '',
            pinnedMessageId: r.pinnedMessageId || '',
            unreadCount: 0,
            lastMessage: r.lastMessage || 'Chưa có tin nhắn nào',
            lastMessageTime: r.lastMessageTime || '',
            createdAt: r.createdAt || new Date().toISOString(),
          }));
          save('chatRooms', mapped);
          this.notify();
        }
      }).catch((err) => console.warn('Sync rooms note:', err));
    });
  }

  public getMessages(roomId: string): ChatMessage[] {
    const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
    const list = all[roomId] || [];
    const seen = new Set<string>();
    const deduplicated: ChatMessage[] = [];
    for (const m of list) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      deduplicated.push(m);
    }
    return deduplicated;
  }

  public createChatRoom(room: {
    name: string;
    type: ChatRoom['type'];
    memberIds: string[];
    avatar?: string;
    description?: string;
    createdById?: string;
  }): ChatRoom {
    const rooms = this.getChatRooms();
    const currentMember = this.getCurrentMember();
    const uniqueMemberIds = Array.from(new Set([currentMember.id, ...room.memberIds]));
    const newRoom: ChatRoom = {
      id: 'room-' + Date.now(),
      name: room.name.trim(),
      type: room.type,
      avatar: room.avatar,
      description: room.description,
      memberIds: uniqueMemberIds,
      adminIds: [room.createdById || currentMember.id],
      createdById: room.createdById || currentMember.id,
      unreadCount: 0,
      createdAt: new Date().toISOString(),
      lastMessage: 'Đã tạo phòng trò chuyện mới',
      lastMessageTime: 'Vừa xong',
    };

    save('chatRooms', [newRoom, ...rooms]);

    import('./api').then(({ api }) => {
      api.createRoom({
        name: newRoom.name,
        type: newRoom.type,
        memberIds: newRoom.memberIds,
        avatar: newRoom.avatar,
        description: newRoom.description,
        createdById: newRoom.createdById,
      }).then((res) => {
        if (res && (res._id || res.id)) {
          const realId = res._id?.toString() || res.id;
          const next = this.getChatRooms().map((r) =>
            r.id === newRoom.id ? { ...r, id: realId } : r
          );
          save('chatRooms', next);
          this.notify();
        }
      }).catch((err) => console.warn('Create room remote note:', err));
    });

    this.notify();
    return newRoom;
  }

  public updateChatRoom(roomId: string, updates: Partial<ChatRoom>): void {
    const rooms = this.getChatRooms().map((r) => {
      if (r.id !== roomId) return r;
      return { ...r, ...updates };
    });
    save('chatRooms', rooms);
    this.notify();

    import('./api').then(({ api }) => {
      api.updateRoom(roomId, updates).catch((err) => console.warn('Update room remote note:', err));
    });
  }

  public deleteChatRoom(roomId: string): void {
    const rooms = this.getChatRooms().filter((r) => r.id !== roomId);
    save('chatRooms', rooms);

    const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
    delete all[roomId];
    save('chatMessages', all);

    this.notify();

    import('./api').then(({ api }) => {
      api.deleteRoom(roomId).catch((err) => console.warn('Delete room remote note:', err));
    });
  }

  public addMembersToRoom(roomId: string, memberIdsToAdd: string[]): void {
    const rooms = this.getChatRooms().map((r) => {
      if (r.id !== roomId) return r;
      const merged = Array.from(new Set([...r.memberIds, ...memberIdsToAdd]));
      return { ...r, memberIds: merged };
    });
    save('chatRooms', rooms);
    this.notify();

    import('./api').then(({ api }) => {
      api.addMembersToRoom(roomId, memberIdsToAdd).catch((err) => console.warn('Add members to room note:', err));
    });
  }

  public removeMemberFromRoom(roomId: string, memberIdToRemove: string): void {
    const rooms = this.getChatRooms().map((r) => {
      if (r.id !== roomId) return r;
      const filtered = r.memberIds.filter((id) => id !== memberIdToRemove);
      return { ...r, memberIds: filtered };
    });
    save('chatRooms', rooms);
    this.notify();

    import('./api').then(({ api }) => {
      api.removeMemberFromRoom(roomId, memberIdToRemove).catch((err) => console.warn('Remove member from room note:', err));
    });
  }

  private chatSocketInitialized = false;
  private processedMsgIds = new Set<string>();
  private receiveMessageCleanup: (() => void) | null = null;

  public syncMessagesFromBackend(roomId: string): void {
    import('./api').then(({ api }) => {
      (api as any).getMessages?.(roomId).then((remoteMsgs: any[]) => {
        if (!Array.isArray(remoteMsgs) || remoteMsgs.length === 0) return;
        const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
        const mapped: ChatMessage[] = remoteMsgs.map((m: any) => ({
          id: m._id?.toString() || m.id,
          roomId: m.roomId || roomId,
          senderId: m.senderId,
          text: m.text || '',
          type: (m.isPriorityPing ? 'priority' : 'text') as ChatMessage['type'],
          priority: !!m.isPriorityPing,
          mediaUrl: m.mediaUrl,
          timestamp: m.createdAt
            ? new Date(m.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
            : '',
          readBy: m.readBy || [m.senderId],
          reactions: [],
        }));
        // Loại trùng theo id
        const seen = new Set<string>();
        const deduped = mapped.filter(m => {
          if (seen.has(m.id)) return false;
          seen.add(m.id);
          return true;
        });
        all[roomId] = deduped;
        save('chatMessages', all);
        this.notify();
      }).catch(() => { /* Backend chưa có endpoint này, bỏ qua */ });
    });
  }

  public initChatSocket(): void {
    if (this.chatSocketInitialized) return;
    this.chatSocketInitialized = true;

    socketService.connect();

    // Auto-join all current chat rooms
    const rooms = this.getChatRooms();
    rooms.forEach((r) => socketService.joinRoom(r.id));

    // Cleanup listener cũ nếu có
    if (this.receiveMessageCleanup) {
      this.receiveMessageCleanup();
      this.receiveMessageCleanup = null;
    }

    // Listen for incoming realtime messages from other family members
    this.receiveMessageCleanup = socketService.onReceiveMessage((incomingMsg: any) => {
      if (!incomingMsg || !incomingMsg.roomId) return;
      const currentMember = this.getCurrentMember();
      const realId = incomingMsg._id ? incomingMsg._id.toString() : (incomingMsg.id || '');
      const clientTempId = incomingMsg.clientTempId || incomingMsg.tempId;

      // Chặn trùng bằng Set trong bộ nhớ (quan trọng nhất)
      if (realId && this.processedMsgIds.has(realId)) return;
      if (realId) this.processedMsgIds.add(realId);

      const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
      const roomMsgs = all[incomingMsg.roomId] || [];

      // Kiểm tra nếu tin nhắn đã tồn tại trong storage (realId hoặc clientTempId)
      if (realId && roomMsgs.some((m) => m.id === realId)) return;
      if (clientTempId && roomMsgs.some((m) => m.id === clientTempId && m.id !== clientTempId)) return;

      // Tìm và thay thế tin nhắn tạm thời của chính người gửi (Optimistic message)
      let replaced = false;
      const updatedRoomMsgs = roomMsgs.map((m) => {
        const isTempMatch =
          (clientTempId && m.id === clientTempId) ||
          (m.id.startsWith('temp-msg-') &&
            m.senderId === incomingMsg.senderId &&
            m.text?.trim() === incomingMsg.text?.trim());
        if (isTempMatch) {
          replaced = true;
          return {
            ...m,
            id: realId || m.id,
            timestamp: incomingMsg.timestamp || m.timestamp,
            reactions: incomingMsg.reactions || m.reactions || [],
          };
        }
        return m;
      });

      if (!replaced) {
        const formattedMsg: ChatMessage = {
          id: realId || 'msg-' + Date.now(),
          roomId: incomingMsg.roomId,
          senderId: incomingMsg.senderId,
          text: incomingMsg.text,
          type: incomingMsg.type || 'text',
          priority: !!incomingMsg.priority || !!incomingMsg.isPriorityPing,
          mediaUrl: incomingMsg.mediaUrl,
          mediaUrls: incomingMsg.mediaUrls,
          replyTo: incomingMsg.replyTo,
          timestamp: incomingMsg.timestamp || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          readBy: [incomingMsg.senderId],
          reactions: incomingMsg.reactions || [],
        };
        all[incomingMsg.roomId] = [...updatedRoomMsgs, formattedMsg];
      } else {
        all[incomingMsg.roomId] = updatedRoomMsgs;
      }

      save('chatMessages', all);

      // Update room preview & increment unread count for other members
      const previewText = incomingMsg.type === 'image' || incomingMsg.mediaUrls?.length
        ? '📷 [Hình ảnh]'
        : incomingMsg.type === 'voice'
        ? '🎤 [Tin nhắn thoại]'
        : incomingMsg.text;

      const updatedRooms = this.getChatRooms().map((r) => {
        if (r.id !== incomingMsg.roomId) return r;
        const isFromOther = currentMember && incomingMsg.senderId !== currentMember.id;
        return {
          ...r,
          lastMessage: previewText,
          lastMessageTime: incomingMsg.timestamp || new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
          unreadCount: isFromOther ? (r.unreadCount || 0) + 1 : (r.unreadCount || 0),
        };
      });
      save('chatRooms', updatedRooms);

      this.notify();
    });

    // Listen for message deletion/recall
    socketService.onMessageDeleted(({ roomId, messageId }) => {
      if (!roomId || !messageId) return;
      const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
      const roomMessages = all[roomId] || [];
      const updated = roomMessages.map((m) => {
        if (m.id === messageId) {
          return { ...m, isDeleted: true, text: 'Tin nhắn đã được thu hồi' };
        }
        return m;
      });
      all[roomId] = updated;
      save('chatMessages', all);
      this.notify();
    });

    // Realtime posts / likes / comments sync across devices
    socketService.onPostUpdated((remotePost: any) => {
      if (!remotePost) return;
      const id = remotePost._id || remotePost.id;
      const mappedPost: FamilyPost = {
        id,
        authorId: remotePost.authorId || 'member-trung',
        authorName: remotePost.authorName || 'Thành viên',
        authorAvatar: remotePost.authorAvatar || '',
        content: remotePost.content,
        mediaUrls: remotePost.mediaUrls || [],
        createdAt: remotePost.createdAt || new Date().toISOString(),
        location: remotePost.location,
        feeling: remotePost.feeling,
        likes: remotePost.likes || [],
        comments: (remotePost.comments || []).map((c: any) => ({
          id: c._id || c.id || 'c-' + Math.random(),
          authorId: c.authorId,
          authorName: c.authorName || 'Thành viên',
          authorAvatar: c.authorAvatar || '',
          content: c.content,
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        })),
        pinned: remotePost.pinned,
        privacy: remotePost.privacy,
      };

      const posts = this.getPosts();
      const exists = posts.some((p) => p.id === id);
      const updated = exists ? posts.map((p) => (p.id === id ? mappedPost : p)) : [mappedPost, ...posts];
      save('posts', updated);
      this.notify();
    });

    socketService.onNewPost((newPost: any) => {
      if (!newPost) return;
      const id = newPost._id || newPost.id;
      const posts = this.getPosts();

      // Nếu đã có bài với id thật này rồi thì bỏ qua
      if (posts.some((p) => p.id === id)) return;

      // Xóa tất cả temp-post có cùng content và authorId để tránh hiện 2 lần
      const filtered = posts.filter((p) => {
        if (
          p.id.startsWith('temp-post-') &&
          p.content?.trim() === newPost.content?.trim() &&
          (p.authorId === newPost.authorId || !newPost.authorId)
        ) {
          return false;
        }
        return true;
      });

      const mappedPost: FamilyPost = {
        id,
        authorId: newPost.authorId || 'member-trung',
        authorName: newPost.authorName || 'Thành viên',
        authorAvatar: newPost.authorAvatar || '',
        content: newPost.content,
        mediaUrls: newPost.mediaUrls || [],
        createdAt: newPost.createdAt || new Date().toISOString(),
        location: newPost.location,
        feeling: newPost.feeling,
        likes: newPost.likes || [],
        comments: (newPost.comments || []).map((c: any) => ({
          id: c._id || c.id || 'c-' + Math.random(),
          authorId: c.authorId,
          authorName: c.authorName || 'Thành viên',
          authorAvatar: c.authorAvatar || '',
          content: c.content,
          createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
        })),
        pinned: newPost.pinned,
        privacy: newPost.privacy,
      };
      save('posts', [mappedPost, ...filtered]);
      this.notify();
    });

    socketService.onPostDeleted(({ postId }: { postId: string }) => {
      if (!postId) return;
      const posts = this.getPosts().filter((p) => p.id !== postId);
      save('posts', posts);
      this.notify();
    });
  }

  public sendMessage(
    roomId: string,
    message: {
      text: string;
      senderId: string;
      type?: ChatMessage['type'];
      priority?: boolean;
      mediaUrl?: string;
      mediaUrls?: string[];
      replyTo?: { id: string; text: string; senderName: string };
    }
  ): void {
    const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
    const roomMessages = all[roomId] || [];
    const now = new Date();
    const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const currentMember = this.getMemberById(message.senderId) || this.getCurrentMember();
    const tempId = 'temp-msg-' + Date.now();

    const newMsg: ChatMessage = {
      id: tempId,
      roomId,
      senderId: message.senderId,
      text: message.text,
      type: message.type || (message.priority ? 'priority' : message.mediaUrls?.length ? 'image' : 'text'),
      priority: message.priority,
      mediaUrl: message.mediaUrl,
      mediaUrls: message.mediaUrls,
      replyTo: message.replyTo,
      timestamp: timeStr,
      readBy: [message.senderId],
      reactions: [],
    };

    all[roomId] = [...roomMessages, newMsg];
    save('chatMessages', all);

    // Update room preview
    const previewText = message.type === 'image' || message.mediaUrls?.length
      ? '📷 [Hình ảnh]'
      : message.type === 'voice'
      ? '🎤 [Tin nhắn thoại]'
      : message.text;

    const rooms = this.getChatRooms().map((r) => {
      if (r.id !== roomId) return r;
      return {
        ...r,
        lastMessage: previewText,
        lastMessageTime: timeStr,
      };
    });
    save('chatRooms', rooms);

    // Broadcast to Socket.IO realtime
    socketService.joinRoom(roomId);
    socketService.sendMessage({
      ...newMsg,
      tempId,
      isPriorityPing: newMsg.priority,
      senderName: currentMember?.name || 'Người thân',
    });

    this.notify();
  }

  // Alias for backward compatibility
  public addMessage(roomId: string, message: any): void {
    this.sendMessage(roomId, message);
  }

  public markRoomAsRead(roomId: string): void {
    const rooms = this.getChatRooms().map((r) => {
      if (r.id !== roomId) return r;
      return { ...r, unreadCount: 0 };
    });
    save('chatRooms', rooms);
    this.notify();
  }

  public deleteMessage(roomId: string, messageId: string): void {
    const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
    const roomMessages = all[roomId] || [];
    const updated = roomMessages.map((m) => {
      if (m.id !== messageId) return m;
      return { ...m, isDeleted: true, text: 'Tin nhắn đã được thu hồi' };
    });
    all[roomId] = updated;
    save('chatMessages', all);
    this.notify();

    // Broadcast delete event via socket
    socketService.deleteMessage(roomId, messageId);
  }

  public pinMessage(roomId: string, messageId: string, text: string): void {
    const rooms = this.getChatRooms().map((r) => {
      if (r.id !== roomId) return r;
      return { ...r, pinnedMessageId: messageId, pinnedMessageText: text };
    });
    save('chatRooms', rooms);
    this.notify();

    // Broadcast pin message via socket
    socketService.sendPinMessage(roomId, messageId, text);
  }

  public unpinMessage(roomId: string): void {
    const rooms = this.getChatRooms().map((r) => {
      if (r.id !== roomId) return r;
      return { ...r, pinnedMessageId: undefined, pinnedMessageText: undefined };
    });
    save('chatRooms', rooms);
    this.notify();

    // Broadcast unpin message via socket
    socketService.sendUnpinMessage(roomId);
  }

  public toggleMessageReaction(roomId: string, messageId: string, emoji: string, memberId: string): void {
    const all = load<Record<string, ChatMessage[]>>('chatMessages', INITIAL_MESSAGES);
    const roomMessages = all[roomId] || [];
    const updated = roomMessages.map((m) => {
      if (m.id !== messageId) return m;
      const exists = m.reactions.find((r) => r.emoji === emoji && r.memberId === memberId);
      const reactions = exists
        ? m.reactions.filter((r) => !(r.emoji === emoji && r.memberId === memberId))
        : [...m.reactions, { emoji, memberId }];
      return { ...m, reactions };
    });
    all[roomId] = updated;
    save('chatMessages', all);
    this.notify();

    // Broadcast reaction via socket
    socketService.sendReaction(roomId, messageId, emoji, memberId);
  }

  // --- SAFETY ---
  public getCheckIns(): SafetyCheckIn[] {
    return load('checkIns', INITIAL_CHECKINS);
  }

  public addCheckIn(memberId: string, zoneName: string, message: string, type: 'manual' | 'zone_enter' | 'sos' = 'manual'): void {
    const checkIns = this.getCheckIns();
    const now = new Date();
    const timeStr = `Hôm nay ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const newCheckIn: SafetyCheckIn = {
      id: 'chk-' + Date.now(),
      memberId,
      zoneName,
      message,
      timestamp: timeStr,
      type,
    };
    save('checkIns', [newCheckIn, ...checkIns]);
    this.notify();
  }

  public getLocationShareState(): LocationShareState {
    return load('locationShare', { isSharing: false, expiresAt: null, durationMinutes: 60 });
  }

  public startLocationSharing(durationMinutes: number): void {
    const expiresAt = Date.now() + durationMinutes * 60 * 1000;
    save('locationShare', { isSharing: true, expiresAt, durationMinutes });
    this.notify();
  }

  public stopLocationSharing(): void {
    save('locationShare', { isSharing: false, expiresAt: null, durationMinutes: 60 });
    this.notify();
  }

  // --- FINANCE ---
  public getWallet(): FamilyWallet {
    return load('wallet', INITIAL_WALLET);
  }

  public syncFinanceFromBackend(): void {
    import('./api').then(({ api }) => {
      Promise.all([api.getTransactions(), api.getSplitBills()]).then(([remoteTxs, remoteBills]) => {
        const wallet = this.getWallet();
        let newTransactions: FinanceTransaction[] = [];
        let newSplitBills: SplitBill[] = [];

        if (remoteTxs && Array.isArray(remoteTxs)) {
          newTransactions = remoteTxs.map((t: any) => ({
            id: t._id || t.id,
            title: t.title,
            type: t.type,
            amount: t.amount,
            category: t.category || 'Sinh hoạt',
            memberId: t.memberId,
            payerMemberId: t.payerMemberId,
            date: t.date || new Date().toISOString().split('T')[0],
            note: t.note,
            description: t.description,
            receiptUrl: t.receiptUrl,
          }));
        }

        if (remoteBills && Array.isArray(remoteBills)) {
          newSplitBills = remoteBills.map((b: any) => ({
            id: b._id || b.id,
            title: b.title,
            totalAmount: b.totalAmount,
            date: b.date || new Date().toISOString().split('T')[0],
            payerId: b.payerId,
            createdBy: b.createdBy,
            splits: (b.splits || []).map((s: any) => ({
              memberId: s.memberId,
              amount: s.amount,
              paid: s.paid || false,
              paidAt: s.paidAt,
            })),
          }));
        }

        let totalIn = 0;
        let totalOut = 0;
        newTransactions.forEach((t) => {
          if (t.type === 'in') totalIn += t.amount;
          else if (t.type === 'out') totalOut += t.amount;
        });
        save('wallet', {
          ...wallet,
          transactions: newTransactions,
          splitBills: newSplitBills,
          totalIn,
          totalOut,
          balance: totalIn - totalOut,
        });
        this.notify();
      }).catch((err) => console.warn('Sync finance note:', err));
    });
  }

  public addTransaction(tx: Omit<FinanceTransaction, 'id' | 'date'>): void {
    const wallet = this.getWallet();
    const newTx: FinanceTransaction = {
      ...tx,
      id: 'tx-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
    };

    const newBalance = tx.type === 'in' ? wallet.balance + tx.amount : wallet.balance - tx.amount;
    const newTotalIn = tx.type === 'in' ? wallet.totalIn + tx.amount : wallet.totalIn;
    const newTotalOut = tx.type === 'out' ? wallet.totalOut + tx.amount : wallet.totalOut;

    const updated: FamilyWallet = {
      ...wallet,
      balance: newBalance,
      totalIn: newTotalIn,
      totalOut: newTotalOut,
      transactions: [newTx, ...wallet.transactions],
    };
    save('wallet', updated);
    this.notify();

    import('./api').then(({ api }) => {
      api.createTransaction(newTx).then((res) => {
        if (res && (res._id || res.id)) {
          const w = this.getWallet();
          const nextTxs = w.transactions.map((t) =>
            t.id === newTx.id ? { ...t, id: res._id || res.id } : t
          );
          save('wallet', { ...w, transactions: nextTxs });
          this.notify();
        }
      }).catch((err) => console.warn('Create transaction remote note:', err));
    });
  }

  public markSplitPaid(billId: string, memberId: string): void {
    const wallet = this.getWallet();
    let updatedBill: SplitBill | undefined;
    const splitBills = wallet.splitBills.map((bill) => {
      if (bill.id !== billId) return bill;
      const splits = bill.splits.map((s) => {
        if (s.memberId !== memberId) return s;
        return { ...s, paid: !s.paid, paidAt: !s.paid ? new Date().toISOString().split('T')[0] : undefined };
      });
      updatedBill = { ...bill, splits };
      return updatedBill;
    });
    save('wallet', { ...wallet, splitBills });
    this.notify();

    if (updatedBill) {
      import('./api').then(({ api }) => {
        api.updateSplitBill(billId, updatedBill).catch((err) => console.warn('Update split bill remote note:', err));
      });
    }
  }

  public addSplitBill(bill: Omit<SplitBill, 'id' | 'date'>): void {
    const wallet = this.getWallet();
    const newBill: SplitBill = {
      ...bill,
      id: 'bill-' + Date.now(),
      date: new Date().toISOString().split('T')[0],
    };
    save('wallet', { ...wallet, splitBills: [newBill, ...wallet.splitBills] });
    this.notify();

    import('./api').then(({ api }) => {
      api.createSplitBill(newBill).then((res) => {
        if (res && (res._id || res.id)) {
          const w = this.getWallet();
          const nextBills = w.splitBills.map((b) =>
            b.id === newBill.id ? { ...b, id: res._id || res.id } : b
          );
          save('wallet', { ...w, splitBills: nextBills });
          this.notify();
        }
      }).catch((err) => console.warn('Create split bill remote note:', err));
    });
  }



  // --- FAMILY PLACES (BẢN ĐỒ ĐỊA ĐIỂM GIA ĐÌNH) ---
  public getPlaces(): FamilyPlace[] {
    return load('places', []);
  }

  public syncPlacesFromBackend(): void {
    import('./api').then(({ api }) => {
      api.getPlaces().then((remotePlaces) => {
        if (remotePlaces && Array.isArray(remotePlaces)) {
          const mappedRemote: FamilyPlace[] = remotePlaces.map((p: any) => ({
            id: p._id || p.id,
            name: p.name,
            address: p.address,
            latitude: p.latitude,
            longitude: p.longitude,
            category: p.category || 'Nhà riêng',
            imageUrl: p.imageUrl,
            notes: p.notes,
            createdById: p.createdById,
            createdByName: p.createdByName,
            createdByAvatar: p.createdByAvatar,
            createdAt: p.createdAt || new Date().toISOString(),
          }));

          save('places', mappedRemote);
          this.notify();
        }
      }).catch((err) => console.warn('Sync places remote note:', err));
    });
  }

  public addPlace(place: Omit<FamilyPlace, 'id' | 'createdAt'>): FamilyPlace {
    const list = this.getPlaces();
    const newPlace: FamilyPlace = {
      ...place,
      id: 'place-' + Date.now(),
      createdAt: new Date().toISOString(),
    };
    save('places', [newPlace, ...list]);
    this.notify();

    import('./api').then(({ api }) => {
      api.createPlace(newPlace).then((res) => {
        if (res && (res._id || res.id)) {
          const updatedList = this.getPlaces().map((p) =>
            p.id === newPlace.id ? { ...p, id: res._id || res.id } : p
          );
          save('places', updatedList);
        }
      }).catch((err) => console.warn('Create place remote api note:', err));
    });

    return newPlace;
  }

  public deletePlace(id: string): void {
    const list = this.getPlaces().filter((p) => p.id !== id);
    save('places', list);
    this.notify();

    import('./api').then(({ api }) => {
      api.deletePlace(id).catch((err) => console.warn('Delete place remote api note:', err));
    });
  }

  public updatePlace(id: string, updates: Partial<FamilyPlace>): void {
    const list = this.getPlaces().map((p) => (p.id === id ? { ...p, ...updates } : p));
    save('places', list);
    this.notify();

    import('./api').then(({ api }) => {
      api.updatePlace(id, updates).catch((err) => console.warn('Update place remote api note:', err));
    });
  }

  // --- CUSTOM CATEGORIES (FINANCE & PLACES) ---
  public getCustomFinanceCategories(): string[] {
    const defaultCats = [
      'Ăn uống & Chợ búa',
      'Điện nước & Sinh hoạt',
      'Y tế & Thuốc men',
      'Học tập & Giáo dục',
      'Giỗ chạp & Lễ cúng',
      'Sửa chữa nhà cửa',
      'Hiếu hỉ & Quà cáp',
      'Du lịch & Nghỉ dưỡng',
      'Đóng góp quỹ',
      'Khác',
    ];
    const info = this.getFamilyInfo();
    if (info.customFinanceCategories && Array.isArray(info.customFinanceCategories) && info.customFinanceCategories.length > 0) {
      const merged = Array.from(new Set([...defaultCats, ...info.customFinanceCategories]));
      return merged;
    }
    return load('custom_finance_categories', defaultCats);
  }

  public addCustomFinanceCategory(catName: string): string[] {
    const trimmed = catName.trim();
    if (!trimmed) return this.getCustomFinanceCategories();
    const list = this.getCustomFinanceCategories();
    if (!list.includes(trimmed)) {
      const updated = [...list, trimmed];
      save('custom_finance_categories', updated);
      this.notify();

      // Đồng bộ lên FamilyInfo MongoDB Atlas
      import('./api').then(({ api }) => {
        api.updateFamilyInfo({ customFinanceCategories: updated }).catch((err) =>
          console.warn('Update custom finance categories remote note:', err)
        );
      });

      return updated;
    }
    return list;
  }

  public getCustomPlaceCategories(): string[] {
    const defaultPlaceCats = [
      'Nhà riêng',
      'Quê quán',
      'Cơ quan / Nơi làm',
      'Trường học',
      'Bệnh viện / Y tế',
      'Chợ / Siêu thị',
      'Quán ăn / Cà phê',
      'Khu vui chơi',
      'Khác',
    ];
    const info = this.getFamilyInfo();
    if (info.customPlaceCategories && Array.isArray(info.customPlaceCategories) && info.customPlaceCategories.length > 0) {
      const merged = Array.from(new Set([...defaultPlaceCats, ...info.customPlaceCategories]));
      return merged;
    }
    return load('custom_place_categories', defaultPlaceCats);
  }

  public addCustomPlaceCategory(catName: string): string[] {
    const trimmed = catName.trim();
    if (!trimmed) return this.getCustomPlaceCategories();
    const list = this.getCustomPlaceCategories();
    if (!list.includes(trimmed)) {
      const updated = [...list, trimmed];
      save('custom_place_categories', updated);
      this.notify();

      // Đồng bộ lên FamilyInfo MongoDB Atlas
      import('./api').then(({ api }) => {
        api.updateFamilyInfo({ customPlaceCategories: updated }).catch((err) =>
          console.warn('Update custom place categories remote note:', err)
        );
      });

      return updated;
    }
    return list;
  }

  // --- STORAGE & CACHE MANAGEMENT (MEMOIZED) ---
  public getStorageStats(): {
    localStorageSizeKB: number;
    postsCount: number;
    eventsCount: number;
    messagesCount: number;
    tasksCount: number;
    placesCount: number;
  } {
    if (this.storageStatsCache && Date.now() - this.storageStatsCache.timestamp < 15000) {
      return this.storageStatsCache.data;
    }

    let totalBytes = 0;
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX)) {
          const value = localStorage.getItem(key);
          totalBytes += (key.length + (value ? value.length : 0)) * 2; // UTF-16
        }
      }
    } catch (e) {
      console.warn('Calculate storage error:', e);
    }

    const postsCount = this.getPosts().length;
    const eventsCount = this.getEvents().length;
    const tasksCount = this.getTaskLists().length;
    const placesCount = this.getPlaces().length;

    // Đếm tổng tin nhắn
    const chatRooms = this.getChatRooms();
    let messagesCount = 0;
    chatRooms.forEach((r) => {
      messagesCount += this.getMessages(r.id).length;
    });

    const result = {
      localStorageSizeKB: Math.round((totalBytes / 1024) * 10) / 10,
      postsCount,
      eventsCount,
      messagesCount,
      tasksCount,
      placesCount,
    };

    this.storageStatsCache = { data: result, timestamp: Date.now() };
    return result;
  }

  // --- NOTIFICATION SYSTEM & PWA PUSH ---
  public requestNotificationPermission(): void {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }

  public triggerSystemNotification(title: string, options?: NotificationOptions): void {
    try {
      if (typeof window === 'undefined' || !('Notification' in window)) return;
      if (Notification.permission === 'granted') {
        if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
          navigator.serviceWorker.ready
            .then((reg) => {
              reg.showNotification(title, {
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                vibrate: [200, 100, 200],
                ...options,
              } as any);
            })
            .catch(() => {
              new Notification(title, { icon: '/pwa-192x192.png', ...options });
            });
        } else {
          new Notification(title, { icon: '/pwa-192x192.png', ...options });
        }
      }
    } catch (e) {
      console.warn('System notification error:', e);
    }
  }

  public syncNotificationsFromBackend(): void {
    import('./api').then(({ api, tokenStorage }) => {
      const currentMember = this.getCurrentMember();
      const user = tokenStorage.getUser();
      const userId = user?._id || user?.id || currentMember?.id;
      api.getNotifications(userId).then((remoteNotifs) => {
        if (remoteNotifs && Array.isArray(remoteNotifs)) {
          const mapped: AppNotification[] = remoteNotifs.map((n: any) => ({
            id: n._id || n.id,
            title: n.title,
            content: n.content,
            type: n.type || 'family',
            category: (n.type as any) || 'family',
            time: n.createdAt ? new Date(n.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) : 'Vừa xong',
            timestamp: n.createdAt ? new Date(n.createdAt).toLocaleDateString('vi-VN') : 'Vừa xong',
            read: n.read || false,
            targetTab: n.targetTab || 'home',
            targetSubId: n.targetId,
            senderName: n.senderName,
            senderAvatar: n.senderAvatar,
          }));
          save('notifications', mapped);
          this.notify();
        }
      }).catch((err) => console.warn('Sync notifications remote note:', err));
    });
  }

  public getNotifications(): AppNotification[] {
    return load<AppNotification[]>('notifications', INITIAL_NOTIFICATIONS);
  }

  public createNotification(data: {
    title: string;
    content: string;
    type?: string;
    category?: any;
    targetTab?: string;
    targetSubId?: string;
  }): AppNotification {
    const notifications = this.getNotifications();
    const currentMember = this.getCurrentMember();
    const newNotif: AppNotification = {
      id: 'notif-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      title: data.title,
      content: data.content,
      type: data.type || 'family',
      category: data.category || (data.type as any) || 'family',
      time: 'Vừa xong',
      timestamp: 'Vừa xong',
      read: false,
      targetTab: data.targetTab || 'home',
      targetSubId: data.targetSubId,
    };
    const updated = [newNotif, ...notifications];
    save('notifications', updated);
    this.notify();

    // Async sync to remote API
    import('./api').then(({ api, tokenStorage }) => {
      const user = tokenStorage.getUser();
      api.createNotification({
        senderId: user?._id || user?.id || currentMember?.id,
        senderName: currentMember?.name,
        senderAvatar: currentMember?.avatar,
        title: data.title,
        content: data.content,
        type: data.type || 'family',
        targetTab: data.targetTab || 'home',
        targetId: data.targetSubId || '',
      }).catch((err) => console.warn('Remote create notification note:', err));
    });

    // Push OS notification
    const settings = this.getSettings();
    if (settings.pushNotifications) {
      this.triggerSystemNotification(data.title, {
        body: data.content,
        tag: newNotif.id,
      });
    }

    return newNotif;
  }

  public markNotificationAsRead(id: string): void {
    const notifications = this.getNotifications();
    const updated = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    save('notifications', updated);
    this.notify();

    import('./api').then(({ api }) => {
      api.markNotificationRead(id).catch((err) => console.warn('Remote mark notification read note:', err));
    });
  }

  public markAllNotificationsAsRead(): void {
    const notifications = this.getNotifications();
    const updated = notifications.map((n) => ({ ...n, read: true }));
    save('notifications', updated);
    this.notify();

    import('./api').then(({ api, tokenStorage }) => {
      const currentMember = this.getCurrentMember();
      const user = tokenStorage.getUser();
      const userId = user?._id || user?.id || currentMember?.id;
      api.markAllNotificationsRead(userId).catch((err) => console.warn('Remote mark all read note:', err));
    });
  }

  public async clearAppCache(): Promise<void> {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }
    } catch (e) {
      console.warn('Clear Cache Storage error:', e);
    }
  }

  public async clearOfflineDataKeepAuth(): Promise<void> {
    try {
      // Giữ lại session auth & token
      const keepKeys = [
        'family_hub_access_token',
        'family_hub_refresh_token',
        'family_hub_auth_user',
        'family_hub_settings',
      ];

      const savedEntries: Record<string, string | null> = {};
      keepKeys.forEach((k) => {
        savedEntries[k] = localStorage.getItem(k);
      });

      // Xóa Cache Storage
      await this.clearAppCache();

      // Xóa các key localStorage của family_hub_
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith(STORAGE_PREFIX) && !keepKeys.includes(key)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((k) => localStorage.removeItem(k));

      // Khôi phục lại session
      keepKeys.forEach((k) => {
        if (savedEntries[k]) {
          localStorage.setItem(k, savedEntries[k]!);
        }
      });

      // Đồng bộ lại tất cả dữ liệu từ backend MongoDB Atlas
      this.syncPostsFromBackend();
      this.syncUsersFromBackend();
      this.syncEventsFromBackend();
      this.syncChecklistsFromBackend();
      this.syncPollsFromBackend();
      this.syncFinanceFromBackend();
      this.syncAlbumsFromBackend();
      this.syncMilestonesFromBackend();
      this.syncPlacesFromBackend();

      this.notify();
    } catch (e) {
      console.error('Clear offline data error:', e);
    }
  }

  // --- RESET ALL DATA ---
  public resetToDefault(): void {
    localStorage.clear();
    this.notify();
  }
}

export const familyService = new FamilyService();

