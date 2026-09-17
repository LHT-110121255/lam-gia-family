import { io, Socket } from "socket.io-client";

const getSocketUrl = () => {
  if (import.meta.env.VITE_SOCKET_URL) {
    return import.meta.env.VITE_SOCKET_URL;
  }
  if (typeof window !== "undefined") {
    const origin = window.location.origin;
    if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
      return "http://localhost:5001";
    }
    return origin;
  }
  return "http://localhost:5001";
};

class SocketService {
  private socket: Socket | null = null;
  private joinedRooms: Set<string> = new Set(["room-all"]);
  private currentUserId: string | null = null;

  connect(userId?: string) {
    if (userId) {
      this.currentUserId = userId;
    }
    if (this.socket) {
      if (this.socket.disconnected) {
        this.socket.connect();
      }
      if (this.currentUserId) {
        this.socket.emit("register_user", { userId: this.currentUserId });
      }
      return;
    }

    this.socket = io(getSocketUrl(), {
      transports: ["websocket", "polling"],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    this.socket.on("connect", () => {
      console.log("⚡ Socket connected:", this.socket?.id);
      if (this.currentUserId) {
        this.socket?.emit("register_user", { userId: this.currentUserId });
      }
      this.joinedRooms.forEach((roomId) => {
        this.socket?.emit("join_room", roomId);
      });
    });

    this.socket.on("reconnect", (attempt) => {
      console.log("⚡ Socket reconnected after attempt:", attempt);
      if (this.currentUserId) {
        this.socket?.emit("register_user", { userId: this.currentUserId });
      }
      this.joinedRooms.forEach((roomId) => {
        this.socket?.emit("join_room", roomId);
      });
    });

    this.socket.on("disconnect", () => {
      console.log("🔌 Socket disconnected");
    });
  }

  joinRoom(roomId: string) {
    if (!roomId) return;
    this.joinedRooms.add(roomId);
    this.socket?.emit("join_room", roomId);
  }

  sendMessage(messageData: any) {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.emit("send_message", messageData);
  }

  onReceiveMessage(callback: (msg: any) => void) {
    this.socket?.on("receive_message", callback);
    return () => {
      this.socket?.off("receive_message", callback);
    };
  }

  deleteMessage(roomId: string, messageId: string) {
    this.socket?.emit("delete_message", { roomId, messageId });
  }

  onMessageDeleted(callback: (data: { roomId: string; messageId: string }) => void) {
    this.socket?.on("message_deleted", callback);
    return () => {
      this.socket?.off("message_deleted", callback);
    };
  }

  sendTyping(roomId: string, user: { userId: string; name: string }) {
    this.socket?.emit("typing", { roomId, userId: user.userId, name: user.name });
  }

  sendStopTyping(roomId: string, userId: string) {
    this.socket?.emit("stop_typing", { roomId, userId });
  }

  onUserTyping(callback: (data: { roomId: string; userId: string; name: string }) => void) {
    this.socket?.on("user_typing", callback);
    return () => {
      this.socket?.off("user_typing", callback);
    };
  }

  onUserStopTyping(callback: (data: { roomId: string; userId: string }) => void) {
    this.socket?.on("user_stop_typing", callback);
    return () => {
      this.socket?.off("user_stop_typing", callback);
    };
  }

  markMessageRead(roomId: string, messageId: string, userId: string) {
    this.socket?.emit("read_message", { roomId, messageId, userId });
  }

  onMessageReadUpdated(callback: (data: { roomId: string; messageId: string; readBy: string[] }) => void) {
    this.socket?.on("message_read_updated", callback);
    return () => {
      this.socket?.off("message_read_updated", callback);
    };
  }

  onUserStatusChanged(callback: (data: { userId: string; username?: string; online: boolean; lastSeen?: string }) => void) {
    this.socket?.on("user_status_changed", callback);
    return () => {
      this.socket?.off("user_status_changed", callback);
    };
  }

  onSOSAlert(callback: (alert: any) => void) {
    this.socket?.on("sos_alert", callback);
    return () => {
      this.socket?.off("sos_alert", callback);
    };
  }

  updateLocation(
    userId: string,
    latitude: number,
    longitude: number,
    address?: string,
  ) {
    this.socket?.emit("update_location", {
      userId,
      latitude,
      longitude,
      address,
    });
  }

  onLocationUpdated(callback: (data: any) => void) {
    this.socket?.on("member_location_updated", callback);
    return () => {
      this.socket?.off("member_location_updated", callback);
    };
  }

  onPostUpdated(callback: (post: any) => void) {
    this.socket?.on("post_updated", callback);
    return () => {
      this.socket?.off("post_updated", callback);
    };
  }

  onNewPost(callback: (post: any) => void) {
    this.socket?.on("new_post", callback);
    return () => {
      this.socket?.off("new_post", callback);
    };
  }

  onPostDeleted(callback: (data: { postId: string }) => void) {
    this.socket?.on("post_deleted", callback);
    return () => {
      this.socket?.off("post_deleted", callback);
    };
  }

  onMemberUpdated(callback: (member: any) => void) {
    this.socket?.on("member_updated", callback);
    return () => {
      this.socket?.off("member_updated", callback);
    };
  }

  onNewPlace(callback: (place: any) => void) {
    this.socket?.on("new_place", callback);
    return () => {
      this.socket?.off("new_place", callback);
    };
  }

  onUpdatePlace(callback: (place: any) => void) {
    this.socket?.on("update_place", callback);
    return () => {
      this.socket?.off("update_place", callback);
    };
  }

  onDeletePlace(callback: (placeId: string) => void) {
    this.socket?.on("delete_place", callback);
    return () => {
      this.socket?.off("delete_place", callback);
    };
  }

  // Events
  onNewEvent(callback: (event: any) => void) {
    this.socket?.on("new_event", callback);
    return () => {
      this.socket?.off("new_event", callback);
    };
  }
  onUpdateEvent(callback: (event: any) => void) {
    this.socket?.on("update_event", callback);
    return () => {
      this.socket?.off("update_event", callback);
    };
  }
  onDeleteEvent(callback: (data: { eventId: string }) => void) {
    this.socket?.on("delete_event", callback);
    return () => {
      this.socket?.off("delete_event", callback);
    };
  }

  // Checklists
  onNewChecklist(callback: (list: any) => void) {
    this.socket?.on("new_checklist", callback);
    return () => {
      this.socket?.off("new_checklist", callback);
    };
  }
  onUpdateChecklist(callback: (list: any) => void) {
    this.socket?.on("update_checklist", callback);
    return () => {
      this.socket?.off("update_checklist", callback);
    };
  }
  onDeleteChecklist(callback: (data: { checklistId: string }) => void) {
    this.socket?.on("delete_checklist", callback);
    return () => {
      this.socket?.off("delete_checklist", callback);
    };
  }

  // Finance
  onNewTransaction(callback: (tx: any) => void) {
    this.socket?.on("new_transaction", callback);
    return () => {
      this.socket?.off("new_transaction", callback);
    };
  }
  onDeleteTransaction(callback: (data: { transactionId: string }) => void) {
    this.socket?.on("delete_transaction", callback);
    return () => {
      this.socket?.off("delete_transaction", callback);
    };
  }
  onNewSplitBill(callback: (bill: any) => void) {
    this.socket?.on("new_split_bill", callback);
    return () => {
      this.socket?.off("new_split_bill", callback);
    };
  }
  onUpdateSplitBill(callback: (bill: any) => void) {
    this.socket?.on("update_split_bill", callback);
    return () => {
      this.socket?.off("update_split_bill", callback);
    };
  }
  onDeleteSplitBill(callback: (data: { splitBillId: string }) => void) {
    this.socket?.on("delete_split_bill", callback);
    return () => {
      this.socket?.off("delete_split_bill", callback);
    };
  }

  // Albums & Milestones
  onNewAlbum(callback: (album: any) => void) {
    this.socket?.on("new_album", callback);
    return () => {
      this.socket?.off("new_album", callback);
    };
  }
  onUpdateAlbum(callback: (album: any) => void) {
    this.socket?.on("update_album", callback);
    return () => {
      this.socket?.off("update_album", callback);
    };
  }
  onDeleteAlbum(callback: (data: { albumId: string }) => void) {
    this.socket?.on("delete_album", callback);
    return () => {
      this.socket?.off("delete_album", callback);
    };
  }
  onNewMilestone(callback: (milestone: any) => void) {
    this.socket?.on("new_milestone", callback);
    return () => {
      this.socket?.off("new_milestone", callback);
    };
  }
  onDeleteMilestone(callback: (data: { milestoneId: string }) => void) {
    this.socket?.on("delete_milestone", callback);
    return () => {
      this.socket?.off("delete_milestone", callback);
    };
  }

  // Polls
  onNewPoll(callback: (poll: any) => void) {
    this.socket?.on("new_poll", callback);
    return () => {
      this.socket?.off("new_poll", callback);
    };
  }
  onUpdatePoll(callback: (poll: any) => void) {
    this.socket?.on("update_poll", callback);
    return () => {
      this.socket?.off("update_poll", callback);
    };
  }
  onDeletePoll(callback: (data: { pollId: string }) => void) {
    this.socket?.on("delete_poll", callback);
    return () => {
      this.socket?.off("delete_poll", callback);
    };
  }

  // Family Info
  onUpdateFamilyInfo(callback: (info: any) => void) {
    this.socket?.on("update_family_info", callback);
    return () => {
      this.socket?.off("update_family_info", callback);
    };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
