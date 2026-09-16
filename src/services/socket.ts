import { io, Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5001';

class SocketService {
  private socket: Socket | null = null;
  private joinedRooms: Set<string> = new Set(['room-all']);

  connect() {
    if (this.socket) return;
    this.socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });

    this.socket.on('connect', () => {
      console.log('⚡ Socket connected:', this.socket?.id);
      // Rejoin all active rooms
      this.joinedRooms.forEach((roomId) => {
        this.socket?.emit('join_room', roomId);
      });
    });

    this.socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });
  }

  joinRoom(roomId: string) {
    if (!roomId) return;
    this.joinedRooms.add(roomId);
    this.socket?.emit('join_room', roomId);
  }

  sendMessage(messageData: any) {
    if (!this.socket) {
      this.connect();
    }
    this.socket?.emit('send_message', messageData);
  }

  onReceiveMessage(callback: (msg: any) => void) {
    this.socket?.on('receive_message', callback);
    return () => {
      this.socket?.off('receive_message', callback);
    };
  }

  onSOSAlert(callback: (alert: any) => void) {
    this.socket?.on('sos_alert', callback);
    return () => {
      this.socket?.off('sos_alert', callback);
    };
  }

  updateLocation(userId: string, latitude: number, longitude: number, address?: string) {
    this.socket?.emit('update_location', { userId, latitude, longitude, address });
  }

  onLocationUpdated(callback: (data: any) => void) {
    this.socket?.on('member_location_updated', callback);
    return () => {
      this.socket?.off('member_location_updated', callback);
    };
  }

  onPostUpdated(callback: (post: any) => void) {
    this.socket?.on('post_updated', callback);
    return () => {
      this.socket?.off('post_updated', callback);
    };
  }

  onNewPost(callback: (post: any) => void) {
    this.socket?.on('new_post', callback);
    return () => {
      this.socket?.off('new_post', callback);
    };
  }

  onPostDeleted(callback: (data: { postId: string }) => void) {
    this.socket?.on('post_deleted', callback);
    return () => {
      this.socket?.off('post_deleted', callback);
    };
  }

  onMemberUpdated(callback: (member: any) => void) {
    this.socket?.on('member_updated', callback);
    return () => {
      this.socket?.off('member_updated', callback);
    };
  }

  onNewPlace(callback: (place: any) => void) {
    this.socket?.on('new_place', callback);
    return () => {
      this.socket?.off('new_place', callback);
    };
  }

  onUpdatePlace(callback: (place: any) => void) {
    this.socket?.on('update_place', callback);
    return () => {
      this.socket?.off('update_place', callback);
    };
  }

  onDeletePlace(callback: (placeId: string) => void) {
    this.socket?.on('delete_place', callback);
    return () => {
      this.socket?.off('delete_place', callback);
    };
  }

  // Events
  onNewEvent(callback: (event: any) => void) {
    this.socket?.on('new_event', callback);
    return () => { this.socket?.off('new_event', callback); };
  }
  onUpdateEvent(callback: (event: any) => void) {
    this.socket?.on('update_event', callback);
    return () => { this.socket?.off('update_event', callback); };
  }
  onDeleteEvent(callback: (data: { eventId: string }) => void) {
    this.socket?.on('delete_event', callback);
    return () => { this.socket?.off('delete_event', callback); };
  }

  // Checklists
  onNewChecklist(callback: (list: any) => void) {
    this.socket?.on('new_checklist', callback);
    return () => { this.socket?.off('new_checklist', callback); };
  }
  onUpdateChecklist(callback: (list: any) => void) {
    this.socket?.on('update_checklist', callback);
    return () => { this.socket?.off('update_checklist', callback); };
  }
  onDeleteChecklist(callback: (data: { checklistId: string }) => void) {
    this.socket?.on('delete_checklist', callback);
    return () => { this.socket?.off('delete_checklist', callback); };
  }

  // Finance
  onNewTransaction(callback: (tx: any) => void) {
    this.socket?.on('new_transaction', callback);
    return () => { this.socket?.off('new_transaction', callback); };
  }
  onDeleteTransaction(callback: (data: { transactionId: string }) => void) {
    this.socket?.on('delete_transaction', callback);
    return () => { this.socket?.off('delete_transaction', callback); };
  }
  onNewSplitBill(callback: (bill: any) => void) {
    this.socket?.on('new_split_bill', callback);
    return () => { this.socket?.off('new_split_bill', callback); };
  }
  onUpdateSplitBill(callback: (bill: any) => void) {
    this.socket?.on('update_split_bill', callback);
    return () => { this.socket?.off('update_split_bill', callback); };
  }
  onDeleteSplitBill(callback: (data: { splitBillId: string }) => void) {
    this.socket?.on('delete_split_bill', callback);
    return () => { this.socket?.off('delete_split_bill', callback); };
  }

  // Albums & Milestones
  onNewAlbum(callback: (album: any) => void) {
    this.socket?.on('new_album', callback);
    return () => { this.socket?.off('new_album', callback); };
  }
  onUpdateAlbum(callback: (album: any) => void) {
    this.socket?.on('update_album', callback);
    return () => { this.socket?.off('update_album', callback); };
  }
  onDeleteAlbum(callback: (data: { albumId: string }) => void) {
    this.socket?.on('delete_album', callback);
    return () => { this.socket?.off('delete_album', callback); };
  }
  onNewMilestone(callback: (milestone: any) => void) {
    this.socket?.on('new_milestone', callback);
    return () => { this.socket?.off('new_milestone', callback); };
  }
  onDeleteMilestone(callback: (data: { milestoneId: string }) => void) {
    this.socket?.on('delete_milestone', callback);
    return () => { this.socket?.off('delete_milestone', callback); };
  }

  // Polls
  onNewPoll(callback: (poll: any) => void) {
    this.socket?.on('new_poll', callback);
    return () => { this.socket?.off('new_poll', callback); };
  }
  onUpdatePoll(callback: (poll: any) => void) {
    this.socket?.on('update_poll', callback);
    return () => { this.socket?.off('update_poll', callback); };
  }
  onDeletePoll(callback: (data: { pollId: string }) => void) {
    this.socket?.on('delete_poll', callback);
    return () => { this.socket?.off('delete_poll', callback); };
  }

  // Family Info
  onUpdateFamilyInfo(callback: (info: any) => void) {
    this.socket?.on('update_family_info', callback);
    return () => { this.socket?.off('update_family_info', callback); };
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }
}

export const socketService = new SocketService();
