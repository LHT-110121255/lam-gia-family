/**
 * API Client Service for Lâm Gia
 * Fully authenticated with JWT Access/Refresh Token & Role Management
 */

const ACCESS_TOKEN_KEY = 'family_hub_access_token';
const REFRESH_TOKEN_KEY = 'family_hub_refresh_token';
const USER_KEY = 'family_hub_auth_user';

const getBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && typeof envUrl === 'string' && envUrl.trim()) {
    return envUrl.replace(/\/+$/, '');
  }
  return '/api';
};

const API_BASE_URL = getBaseUrl();

// Token Storage Helpers
export const tokenStorage = {
  getAccessToken(): string | null {
    return localStorage.getItem(ACCESS_TOKEN_KEY);
  },
  setAccessToken(token: string) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  },
  getRefreshToken(): string | null {
    return localStorage.getItem(REFRESH_TOKEN_KEY);
  },
  setRefreshToken(token: string) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  },
  getUser<T = any>(): T | null {
    const raw = localStorage.getItem(USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  },
  setUser(user: any) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  },
  clearTokens() {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  },
};

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(token: string) {
  refreshSubscribers.forEach((cb) => cb(token));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

// Safe Response Parser
async function handleApiResponse(response: Response) {
  const contentType = response.headers.get('content-type') || '';
  let data: any = null;

  if (contentType.includes('application/json')) {
    try {
      data = await response.json();
    } catch {
      data = null;
    }
  } else {
    const text = await response.text();
    data = { error: text || `HTTP ${response.status} ${response.statusText}` };
  }

  if (!response.ok) {
    const message =
      data?.error ||
      data?.message ||
      `Yêu cầu thất bại (${response.status}: ${response.statusText})`;
    const error = new Error(message);
    (error as any).status = response.status;
    (error as any).code = data?.code;
    throw error;
  }

  return data;
}

// Authenticated Fetch Wrapper with Auto-Refresh
async function authFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const accessToken = tokenStorage.getAccessToken();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (accessToken && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  if (!(options.body instanceof FormData) && !headers['Content-Type'] && options.method && options.method !== 'GET') {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, { ...options, headers });

  // Handle Token Expiry & Auto-Refresh
  if (res.status === 401 && !endpoint.includes('/auth/login') && !endpoint.includes('/auth/refresh') && !endpoint.includes('/auth/register')) {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) {
      tokenStorage.clearTokens();
      return res;
    }

    if (!isRefreshing) {
      isRefreshing = true;
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        const refreshData = await handleApiResponse(refreshResponse);
        if (refreshData.accessToken) {
          tokenStorage.setAccessToken(refreshData.accessToken);
          if (refreshData.refreshToken) {
            tokenStorage.setRefreshToken(refreshData.refreshToken);
          }
          if (refreshData.user) {
            tokenStorage.setUser(refreshData.user);
          }
          onTokenRefreshed(refreshData.accessToken);
        }
      } catch {
        tokenStorage.clearTokens();
        return res;
      } finally {
        isRefreshing = false;
      }
    }

    // Wait for the new token and retry the original request
    return new Promise((resolve) => {
      addRefreshSubscriber((newToken) => {
        headers['Authorization'] = `Bearer ${newToken}`;
        resolve(fetch(url, { ...options, headers }));
      });
    });
  }

  return res;
}

export const api = {
  // 1. Đăng nhập (Login with DB password verification & JWT)
  async login(username: string, password: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const data = await handleApiResponse(response);
    if (data.accessToken) {
      tokenStorage.setAccessToken(data.accessToken);
    }
    if (data.refreshToken) {
      tokenStorage.setRefreshToken(data.refreshToken);
    }
    if (data.user) {
      tokenStorage.setUser(data.user);
    }
    return data;
  },

  // 2. Đăng ký (Register with DB unique checks & bcrypt password hash)
  async register(userData: any): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData),
    });
    const data = await handleApiResponse(response);
    if (data.accessToken) {
      tokenStorage.setAccessToken(data.accessToken);
    }
    if (data.refreshToken) {
      tokenStorage.setRefreshToken(data.refreshToken);
    }
    if (data.user) {
      tokenStorage.setUser(data.user);
    }
    return data;
  },

  // 3. Làm mới Token (Refresh Token)
  async refreshToken(): Promise<any> {
    const refreshToken = tokenStorage.getRefreshToken();
    if (!refreshToken) throw new Error('Không có refresh token');

    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    const data = await handleApiResponse(response);
    if (data.accessToken) {
      tokenStorage.setAccessToken(data.accessToken);
    }
    if (data.refreshToken) {
      tokenStorage.setRefreshToken(data.refreshToken);
    }
    return data;
  },

  // 4. Đăng xuất (Logout & Invalidate Session in DB)
  async logout(): Promise<void> {
    const refreshToken = tokenStorage.getRefreshToken();
    try {
      if (refreshToken) {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });
      }
    } finally {
      tokenStorage.clearTokens();
    }
  },

  // 5. Lấy thông tin user hiện tại (Get Me)
  async getMe(): Promise<any> {
    const response = await authFetch('/auth/me');
    return await handleApiResponse(response);
  },

  // 6. Upload File (Hình ảnh / Video)
  async uploadFile(file: File): Promise<string> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await authFetch('/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await handleApiResponse(response);
    return data.url;
  },

  // 7. Lấy PublicKey VAPID Web Push
  async getVapidPublicKey(): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/push/vapid-key`);
    const data = await handleApiResponse(response);
    return data.publicKey;
  },

  // 8. Đăng ký Push Subscription
  async registerPushSubscription(
    userId: string,
    subscription: PushSubscription,
  ): Promise<void> {
    const response = await authFetch('/push/subscribe', {
      method: 'POST',
      body: JSON.stringify({ userId, subscription }),
    });
    await handleApiResponse(response);
  },

  // 9. Báo động SOS khẩn cấp
  async triggerSOS(
    userId: string,
    userName: string,
    location?: { latitude: number; longitude: number; address: string },
  ): Promise<void> {
    const response = await authFetch('/safety/sos', {
      method: 'POST',
      body: JSON.stringify({ userId, userName, location }),
    });
    await handleApiResponse(response);
  },

  // 10. Lấy danh sách thành viên
  async getUsers(): Promise<any[]> {
    try {
      const response = await authFetch('/users');
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },

  // 11. Lấy bài viết Bảng tin
  async getPosts(): Promise<any[]> {
    try {
      const response = await authFetch('/posts');
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },

  // 12. Đăng bài viết mới
  async createPost(postData: any): Promise<any> {
    const response = await authFetch('/posts', {
      method: 'POST',
      body: JSON.stringify(postData),
    });
    return await handleApiResponse(response);
  },

  // 12.1 Thả tim bài viết
  async likePost(postId: string, memberId: string): Promise<any> {
    try {
      const response = await authFetch(`/posts/${postId}/like`, {
        method: 'POST',
        body: JSON.stringify({ memberId }),
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },

  // 12.2 Gửi bình luận bài viết
  async commentPost(
    postId: string,
    commentData: { authorId: string; authorName?: string; authorAvatar?: string; content: string },
  ): Promise<any> {
    try {
      const response = await authFetch(`/posts/${postId}/comment`, {
        method: 'POST',
        body: JSON.stringify(commentData),
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },

  // 12.3 Chỉnh sửa bình luận
  async editComment(postId: string, commentId: string, content: string): Promise<any> {
    try {
      const response = await authFetch(`/posts/${postId}/comments/${commentId}`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },

  // 12.4 Xóa bình luận
  async deleteComment(postId: string, commentId: string): Promise<any> {
    try {
      const response = await authFetch(`/posts/${postId}/comments/${commentId}`, {
        method: 'DELETE',
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },

  // 12.5 Xóa bài viết
  async deletePost(postId: string): Promise<any> {
    try {
      const response = await authFetch(`/posts/${postId}`, {
        method: 'DELETE',
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },

  // 13. Lấy tin nhắn từ MongoDB theo roomId
  async getMessages(roomId: string, limit = 100): Promise<any[]> {
    try {
      const response = await authFetch(`/messages/${encodeURIComponent(roomId)}?limit=${limit}`);
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },

  // 13.1 Lấy danh sách phòng chat từ MongoDB
  async getRooms(userId?: string): Promise<any[]> {
    try {
      const query = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const response = await authFetch(`/rooms${query}`);
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },

  // 13.2 Tạo phòng chat mới
  async createRoom(roomData: any): Promise<any> {
    try {
      const response = await authFetch('/rooms', {
        method: 'POST',
        body: JSON.stringify(roomData),
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },

  // 13.3 Cập nhật thông tin phòng chat
  async updateRoom(roomId: string, updates: any): Promise<any> {
    try {
      const response = await authFetch(`/rooms/${roomId}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },

  // 13.4 Thêm thành viên vào phòng chat
  async addMembersToRoom(roomId: string, memberIds: string[]): Promise<any> {
    try {
      const response = await authFetch(`/rooms/${roomId}/members`, {
        method: 'POST',
        body: JSON.stringify({ memberIds }),
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },

  // 13.5 Xóa/Rời thành viên khỏi phòng chat
  async removeMemberFromRoom(roomId: string, memberId: string): Promise<any> {
    try {
      const response = await authFetch(`/rooms/${roomId}/members/${memberId}`, {
        method: 'DELETE',
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },

  // 13.6 Xóa phòng chat
  async deleteRoom(roomId: string): Promise<any> {
    try {
      const response = await authFetch(`/rooms/${roomId}`, {
        method: 'DELETE',
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },

  // 13.7 Lấy kho tài nguyên media/links của phòng chat
  async getRoomMedia(roomId: string): Promise<{ media: any[]; links: any[] }> {
    try {
      const response = await authFetch(`/rooms/${roomId}/media`);
      return await handleApiResponse(response);
    } catch {
      return { media: [], links: [] };
    }
  },


  async getAdminUsers(): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/users`);
      const data = await handleApiResponse(response);
      return data.users || [];
    } catch {
      return [];
    }
  },

  // 16. Admin: Duyệt người dùng
  async approveUser(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/approve`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await handleApiResponse(response);
  },

  // 17. Admin: Từ chối người dùng
  async rejectUser(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    return await handleApiResponse(response);
  },

  // 18. Admin: Cập nhật trạng thái người dùng (Khóa/Mở khóa/Vai trò)
  async updateUserStatus(userId: string, data: { isActive?: boolean; role?: string; relationship?: string; isAdmin?: boolean }): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  },

  // 19. Admin: Xóa tài khoản người dùng
  async deleteUser(userId: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
    });
    return await handleApiResponse(response);
  },

  // 20. Cập nhật hồ sơ thông tin thành viên (Avatar, Tên, SĐT, Email...)
  async updateUser(userId: string, data: any): Promise<any> {
    try {
      const response = await authFetch(`/users/${userId}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
      return await handleApiResponse(response);
    } catch (err) {
      console.warn('Update user remote note:', err);
      return null;
    }
  },

  // 21. Lấy danh sách địa điểm gia đình
  async getPlaces(): Promise<any[]> {
    try {
      const response = await authFetch('/places');
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },

  // 22. Thêm địa điểm mới
  async createPlace(placeData: any): Promise<any> {
    const response = await authFetch('/places', {
      method: 'POST',
      body: JSON.stringify(placeData),
    });
    return await handleApiResponse(response);
  },

  // 23. Sửa địa điểm
  async updatePlace(placeId: string, placeData: any): Promise<any> {
    const response = await authFetch(`/places/${placeId}`, {
      method: 'PUT',
      body: JSON.stringify(placeData),
    });
    return await handleApiResponse(response);
  },

  // 24. Xóa địa điểm
  async deletePlace(placeId: string): Promise<any> {
    const response = await authFetch(`/places/${placeId}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  // 25. Events API
  async getEvents(): Promise<any[]> {
    try {
      const response = await authFetch('/events');
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },
  async createEvent(eventData: any): Promise<any> {
    const response = await authFetch('/events', {
      method: 'POST',
      body: JSON.stringify(eventData),
    });
    return await handleApiResponse(response);
  },
  async updateEvent(id: string, eventData: any): Promise<any> {
    const response = await authFetch(`/events/${id}`, {
      method: 'PUT',
      body: JSON.stringify(eventData),
    });
    return await handleApiResponse(response);
  },
  async deleteEvent(id: string): Promise<any> {
    const response = await authFetch(`/events/${id}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  // 26. Checklists / Tasks API
  async getChecklists(): Promise<any[]> {
    try {
      const response = await authFetch('/checklists');
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },
  async createChecklist(data: any): Promise<any> {
    const response = await authFetch('/checklists', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  },
  async updateChecklist(id: string, data: any): Promise<any> {
    const response = await authFetch(`/checklists/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  },
  async deleteChecklist(id: string): Promise<any> {
    const response = await authFetch(`/checklists/${id}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },
  async addChecklistItem(id: string, itemData: any): Promise<any> {
    const response = await authFetch(`/checklists/${id}/items`, {
      method: 'POST',
      body: JSON.stringify(itemData),
    });
    return await handleApiResponse(response);
  },
  async toggleChecklistItem(listId: string, itemId: string, completedBy?: string, completedAt?: string): Promise<any> {
    const response = await authFetch(`/checklists/${listId}/toggle/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ completedBy, completedAt }),
    });
    return await handleApiResponse(response);
  },

  // 27. Finance & Transactions API
  async getTransactions(): Promise<any[]> {
    try {
      const response = await authFetch('/transactions');
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },
  async createTransaction(data: any): Promise<any> {
    const response = await authFetch('/transactions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  },
  async deleteTransaction(id: string): Promise<any> {
    const response = await authFetch(`/transactions/${id}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  // 28. Split Bills API
  async getSplitBills(): Promise<any[]> {
    try {
      const response = await authFetch('/split-bills');
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },
  async createSplitBill(data: any): Promise<any> {
    const response = await authFetch('/split-bills', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  },
  async updateSplitBill(id: string, data: any): Promise<any> {
    const response = await authFetch(`/split-bills/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  },
  async deleteSplitBill(id: string): Promise<any> {
    const response = await authFetch(`/split-bills/${id}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  // 29. Albums & Photos API
  async getAlbums(): Promise<any[]> {
    try {
      const response = await authFetch('/albums');
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },
  async createAlbum(data: any): Promise<any> {
    const response = await authFetch('/albums', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  },
  async updateAlbum(id: string, data: any): Promise<any> {
    const response = await authFetch(`/albums/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  },
  async deleteAlbum(id: string): Promise<any> {
    const response = await authFetch(`/albums/${id}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },
  async addAlbumPhotos(id: string, photos: any[]): Promise<any> {
    const response = await authFetch(`/albums/${id}/photos`, {
      method: 'POST',
      body: JSON.stringify({ photos }),
    });
    return await handleApiResponse(response);
  },
  async deleteAlbumPhoto(id: string, photoId: string): Promise<any> {
    const response = await authFetch(`/albums/${id}/photos/${photoId}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  // 30. Milestones API
  async getMilestones(): Promise<any[]> {
    try {
      const response = await authFetch('/milestones');
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },
  async createMilestone(data: any): Promise<any> {
    const response = await authFetch('/milestones', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  },
  async deleteMilestone(id: string): Promise<any> {
    const response = await authFetch(`/milestones/${id}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  // 31. Polls API
  async getPolls(): Promise<any[]> {
    try {
      const response = await authFetch('/polls');
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },
  async createPoll(data: any): Promise<any> {
    const response = await authFetch('/polls', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  },
  async votePoll(id: string, optionId: string, memberId: string): Promise<any> {
    const response = await authFetch(`/polls/${id}/vote`, {
      method: 'POST',
      body: JSON.stringify({ optionId, memberId }),
    });
    return await handleApiResponse(response);
  },
  async deletePoll(id: string): Promise<any> {
    const response = await authFetch(`/polls/${id}`, {
      method: 'DELETE',
    });
    return await handleApiResponse(response);
  },

  // 32. Family Info API
  async getFamilyInfo(): Promise<any> {
    try {
      const response = await authFetch('/family-info');
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },
  async updateFamilyInfo(data: any): Promise<any> {
    const response = await authFetch('/family-info', {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return await handleApiResponse(response);
  },

  // 33. Notifications API
  async getNotifications(userId?: string): Promise<any[]> {
    try {
      const param = userId ? `?userId=${encodeURIComponent(userId)}` : '';
      const response = await authFetch(`/notifications${param}`);
      return await handleApiResponse(response);
    } catch {
      return [];
    }
  },
  async createNotification(data: any): Promise<any> {
    try {
      const response = await authFetch('/notifications', {
        method: 'POST',
        body: JSON.stringify(data),
      });
      return await handleApiResponse(response);
    } catch (err) {
      console.warn('API create notification error:', err);
      return null;
    }
  },
  async markNotificationRead(id: string): Promise<any> {
    try {
      const response = await authFetch(`/notifications/${id}/read`, {
        method: 'PATCH',
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },
  async markAllNotificationsRead(userId?: string): Promise<any> {
    try {
      const response = await authFetch('/notifications/read-all', {
        method: 'PATCH',
        body: JSON.stringify({ userId }),
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },
  async deleteNotification(id: string): Promise<any> {
    try {
      const response = await authFetch(`/notifications/${id}`, {
        method: 'DELETE',
      });
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },

  // 34. On This Day API
  async getOnThisDay(): Promise<any> {
    try {
      const response = await authFetch('/on-this-day');
      return await handleApiResponse(response);
    } catch {
      return null;
    }
  },
};
