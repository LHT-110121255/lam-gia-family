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
} from '../types';

export const INITIAL_FAMILY_INFO: FamilyInfo = {
  id: 'fam-lam-gia-dinh',
  name: 'Đại Gia Đình Họ Lâm',
  motto: 'Kính trên nhường dưới — Sum vầy & Yêu thương',
  createdYear: 1972,
  avatar: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&auto=format&fit=crop&q=80',
  coverImage: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1000&auto=format&fit=crop&q=80',
  homeAddress: 'số tre, Tiểu Cần, Vĩnh Long',
  elderCareNotes: 'Ông Trí & Mẹ Gấm luôn gìn giữ sức khỏe và nếp nhà.',
};

export const INITIAL_MEMBERS: FamilyMember[] = [
  {
    id: 'member-trung',
    username: 'lamhuetrung',
    name: 'Lâm Huệ Trung',
    relationship: 'Con trai (con thứ)',
    role: 'adult',
    generation: 2,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80',
    birthDate: '08/01/2003',
    phone: '0763849007',
    email: 'namphongtctv@gmail.com',
    onlineStatus: 'online',
    lastSeen: 'Vừa xong',
    batteryLevel: 95,
    currentZone: 'Cù Lao Long Trị',
    locationAddress: 'Cù Lao Long Trị (Cồn Long Trị), Xã Long Đức, TP. Trà Vinh',
    latitude: 9.9880,
    longitude: 106.3530,
    isEmergencyContact: true,
    jobTitle: 'Lập trình viên',
    approvalStatus: 'approved',
    isAdmin: true,
    isActive: true,
    createdAt: '2026-01-01T00:00:00.000Z',
  },
];

export const INITIAL_POSTS: FamilyPost[] = [];

export const INITIAL_MILESTONES: MemoryMilestone[] = [];

export const INITIAL_ALBUMS: MemoryAlbum[] = [];

export const INITIAL_ON_THIS_DAY: OnThisDayItem = {
  id: 'otd-1',
  yearsAgo: 2,
  originalDate: '2024-09-16',
  title: 'Chuyến sum họp dã ngoại của cả gia đình',
  location: 'Khu du lịch sinh thái Cù Lao, Vĩnh Long',
  description: 'Ngày này 2 năm trước, cả gia đình cùng nhau đi dã ngoại và thưởng thức bữa cơm thân mật bên bờ sông ấm cúng.',
  photos: [
    'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=800&auto=format&fit=crop&q=80',
    'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&auto=format&fit=crop&q=80',
  ],
  taggedMemberIds: ['member-trung'],
};

export const INITIAL_EVENTS: CalendarEvent[] = [];

export const INITIAL_TASKS: SharedTaskList[] = [];

export const INITIAL_POLLS: FamilyPoll[] = [];

export const INITIAL_CHAT_ROOMS: ChatRoom[] = [
  {
    id: 'room-all',
    name: 'Đại Gia Đình Sum Vầy ❤️',
    type: 'all',
    avatar: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=120&auto=format&fit=crop&q=80',
    memberIds: ['member-trung', 'member-thuc', 'member-tri', 'member-gam'],
    lastMessage: 'Chào mừng cả nhà đến với ứng dụng Gia Đình Số!',
    lastMessageTime: 'Vừa xong',
    unreadCount: 0,
  },
  {
    id: 'room-parents',
    name: 'Bố Mẹ & Phụ Huynh',
    type: 'parents',
    avatar: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=120&auto=format&fit=crop&q=80',
    memberIds: ['member-tri', 'member-gam'],
    lastMessage: 'Kênh riêng cho Bố Trí và Mẹ Gấm',
    lastMessageTime: 'Vừa xong',
    unreadCount: 0,
  },
  {
    id: 'room-siblings',
    name: 'Hội Anh Chị Em 🌟',
    type: 'siblings',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=120&auto=format&fit=crop&q=80',
    memberIds: ['member-trung', 'member-thuc'],
    lastMessage: 'Kênh nhắn tin anh chị em',
    lastMessageTime: 'Vừa xong',
    unreadCount: 0,
  },
];

export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  'room-all': [],
  'room-parents': [],
  'room-siblings': [],
};

export const INITIAL_CHECKINS: SafetyCheckIn[] = [];

export const INITIAL_WALLET: FamilyWallet = {
  balance: 0,
  totalIn: 0,
  totalOut: 0,
  targetFund: 10000000,
  transactions: [],
  splitBills: [],
};

export const INITIAL_NOTIFICATIONS: AppNotification[] = [];

export const INITIAL_SETTINGS: AppSettings = {
  theme: 'light',
  textSize: 'standard',
  pushNotifications: true,
  calendarReminders: true,
  chatNotifications: true,
  locationSharingAllowed: true,
  locationSyncInterval: 10,
  shareBatteryStatus: true,
  passcodeProtected: false,
  currentUserId: '',
  isLoggedIn: false,
};
