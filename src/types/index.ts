export type MemberRole = "elder" | "parent" | "adult" | "teen" | "child";

export interface FamilyMember {
  id: string;
  username?: string;
  name: string;
  relationship: string; // 'Ông nội', 'Bà nội', 'Tỉa', 'Mẹ', 'Con trai lớn', 'Con gái', 'Cháu út', etc.
  role: MemberRole;
  generation: number; // 1 = Grandparents, 2 = Parents, 3 = Children, 4 = Grandchildren
  avatar: string;
  birthDate: string;
  phone: string;
  email?: string;
  onlineStatus: "online" | "away" | "offline";
  lastSeen?: string;
  lastLocationUpdated?: string;
  batteryLevel?: number;
  currentZone?: string;
  locationAddress?: string;
  latitude?: number;
  longitude?: number;
  isEmergencyContact?: boolean;
  notes?: string;
  hobbies?: string[];
  bloodType?: string;
  allergies?: string;
  medicalNotes?: string;
  jobTitle?: string;
  approvalStatus?: "pending" | "approved" | "rejected";
  isAdmin?: boolean;
  isActive?: boolean;
  createdAt?: string;
}

export interface FamilyInfo {
  id: string;
  name: string;
  motto: string;
  createdYear: number;
  avatar: string;
  coverImage: string;
  homeAddress: string;
  elderCareNotes?: string;
  contactPhone?: string;
  ancestralHome?: string;
}

export interface PostComment {
  id: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  createdAt: string;
  replyToId?: string;
}

export type PostPrivacy = "all" | "parents" | "siblings" | "private";

export interface FamilyPost {
  id: string;
  authorId: string;
  authorName?: string;
  authorAvatar?: string;
  content: string;
  mediaUrls: string[];
  mediaType?: "photo" | "multiple_photos" | "video_preview";
  createdAt: string;
  location?: string;
  likes: string[]; // member IDs who reacted
  comments: PostComment[];
  pinned?: boolean;
  feeling?: string;
  privacy?: PostPrivacy; // 'all': Cả gia đình, 'parents': Tỉa mẹ, 'siblings': Anh chị em, 'private': Chỉ mình tôi
}

export interface MemoryMilestone {
  id: string;
  year: number;
  date: string;
  title: string;
  location: string;
  description: string;
  coverUrl: string;
  photos: string[];
  taggedMemberIds: string[];
  aiStorySummary?: string;
}

export interface AlbumPhoto {
  id: string;
  url: string;
  caption?: string;
  date: string;
  taggedMemberIds: string[];
}

export interface MemoryAlbum {
  id: string;
  title: string;
  category: "Tết" | "Sinh nhật" | "Du lịch" | "Gia đình" | "Em bé" | "Kỷ niệm";
  coverUrl: string;
  photoCount: number;
  photos: AlbumPhoto[];
}

export interface OnThisDayItem {
  id: string;
  yearsAgo: number;
  originalDate: string;
  title: string;
  location: string;
  description: string;
  photos: string[];
  taggedMemberIds: string[];
}

export type EventType =
  | "birthday"
  | "anniversary"
  | "health"
  | "study"
  | "chore"
  | "trip"
  | "holiday"
  | "other";

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  date: string; // YYYY-MM-DD
  lunarDateText: string; // "15/08 Âm lịch"
  time?: string;
  location?: string;
  participantIds: string[];
  reminderMinutes?: number;
  note?: string;
  isLunarRecurring?: boolean;
  isAnnualRecurring?: boolean; // Lặp lại qua các năm
  createdById?: string; // Người tạo sự kiện
  createdByName?: string;
  createdByAvatar?: string;
}

export interface TaskItem {
  id: string;
  title: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  assigneeId?: string;
  quantity?: string;
}

export type TaskCategory =
  | "việc_nhà"
  | "sửa_chữa"
  | "mua_sắm"
  | "cúng_lễ"
  | "chăm_sóc"
  | "sinh_hoạt"
  | "khác"
  | string;

export interface SharedTaskList {
  id: string;
  title: string;
  category: TaskCategory;
  dueDate?: string;
  createdById: string;
  items: TaskItem[];
}

export interface PollOption {
  id: string;
  text: string;
  voterIds: string[];
}

export interface FamilyPoll {
  id: string;
  question: string;
  createdById: string;
  createdAt: string;
  deadline?: string;
  options: PollOption[];
  allowMultiple?: boolean;
}

export interface ChatMessage {
  id: string;
  roomId: string;
  senderId: string;
  text: string;
  type: "text" | "image" | "voice" | "priority" | "system";
  mediaUrl?: string;
  mediaUrls?: string[];
  audioDuration?: number; // in seconds
  priority?: boolean;
  timestamp: string;
  readBy: string[];
  reactions: { emoji: string; memberId: string }[];
  isDeleted?: boolean; // Thu hồi tin nhắn
  replyTo?: { id: string; text: string; senderName: string };
}

export interface ChatRoom {
  id: string;
  name: string;
  type: "all" | "parents" | "siblings" | "direct" | "custom";
  avatar?: string;
  description?: string;
  memberIds: string[];
  adminIds?: string[];
  createdById?: string;
  pinnedMessageId?: string;
  pinnedMessageText?: string;
  lastMessage?: string;
  lastMessageTime?: string;
  unreadCount: number;
  createdAt?: string;
}

export interface FamilyPlace {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  category: string; // "Nhà riêng", "Quê quán", "Cơ quan", "Trường học", "Bệnh viện", "Quán quen",...
  imageUrl?: string;
  createdById: string;
  createdByName?: string;
  createdByAvatar?: string;
  createdAt: string;
  notes?: string;
}

export interface SafeZone {
  id: string;
  name: string;
  address: string;
  radiusMeters: number;
  icon: string;
}

export interface SafetyCheckIn {
  id: string;
  memberId: string;
  zoneName: string;
  message: string;
  timestamp: string;
  type: "manual" | "zone_enter" | "sos";
  latitude?: number;
  longitude?: number;
}

export interface LocationShareState {
  isSharing: boolean;
  expiresAt: number | null; // timestamp
  durationMinutes: number;
}

export interface SOSAlert {
  active: boolean;
  triggeredBy?: string;
  triggeredAt?: string;
  location?: string;
  notes?: string;
}

export type FinanceCategory = string;

export interface FinanceTransaction {
  id: string;
  title?: string;
  type: "in" | "out";
  amount: number;
  category: FinanceCategory;
  memberId?: string;
  payerMemberId?: string;
  date: string;
  note?: string;
  description?: string;
  receiptUrl?: string;
}

export interface SplitBillItem {
  memberId: string;
  amount: number;
  paid: boolean;
  paidAt?: string;
}

export interface SplitBill {
  id: string;
  title: string;
  totalAmount: number;
  date: string;
  payerId?: string;
  createdBy?: string;
  splits: SplitBillItem[];
}

export interface FamilyWallet {
  balance: number;
  totalIn: number;
  totalOut: number;
  targetFund?: number;
  currency?: string;
  transactions: FinanceTransaction[];
  splitBills: SplitBill[];
}

export type NotificationCategory =
  | "family"
  | "calendar"
  | "chat"
  | "task"
  | "safety"
  | "memories"
  | "event"
  | "message";

export interface AppNotification {
  id: string;
  category?: NotificationCategory;
  type?: string;
  title: string;
  content?: string;
  body?: string;
  time?: string;
  timestamp?: string;
  read: boolean;
  targetTab?: string;
  targetSubId?: string;
}

export interface AppSettings {
  theme: "light" | "dark" | "system";
  textSize: "standard" | "large";
  textMode?: "standard" | "large";
  notificationsEnabled?: boolean;
  pushNotifications: boolean;
  calendarReminders: boolean;
  chatNotifications: boolean;
  locationSharing?: boolean;
  locationSharingAllowed: boolean;
  locationSyncInterval?: 0 | 5 | 10 | 15; // 0 = manual/only on map, 5, 10, 15 minutes
  shareBatteryStatus?: boolean;
  passcodeProtected: boolean;
  currentUserId: string; // active simulated member
  isLoggedIn?: boolean;
}
