import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Lock,
  Unlock,
  Trash2,
  RotateCcw,
  User,
  Phone,
  Mail,
  MapPin,
  Calendar,
  Sparkles,
  AlertTriangle,
  ChevronLeft,
  Check,
  X,
  UserCheck,
  UserX,
} from 'lucide-react';
import { FamilyMember } from '../../types';
import { Avatar } from '../common/Avatar';
import { familyService } from '../../services/familyService';
import { Modal } from '../common/Modal';

interface AccountManagementScreenProps {
  currentMember: FamilyMember;
  onBack: () => void;
  onShowToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AccountManagementScreen: React.FC<AccountManagementScreenProps> = ({
  currentMember,
  onBack,
  onShowToast,
}) => {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUserForAction, setSelectedUserForAction] = useState<FamilyMember | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'delete' | 'toggleActive' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Sync users from backend when screen opens
  useEffect(() => {
    familyService.syncUsersFromBackend();
  }, []);

  const allMembers = familyService.getAllMembers();
  const pendingMembers = familyService.getPendingMembers();
  const approvedMembers = familyService.getApprovedMembers();
  const rejectedMembers = familyService.getRejectedMembers();

  // Filter list by tab & search query
  const getFilteredList = () => {
    let list: FamilyMember[] = [];
    if (activeTab === 'pending') {
      list = pendingMembers;
    } else if (activeTab === 'approved') {
      list = approvedMembers;
    } else if (activeTab === 'rejected') {
      list = rejectedMembers;
    } else {
      list = allMembers;
    }

    if (!searchQuery.trim()) return list;

    const q = searchQuery.toLowerCase().trim();
    return list.filter((m) => {
      const name = m.name.toLowerCase();
      const username = (m.username || '').toLowerCase();
      const phone = (m.phone || '').toLowerCase();
      const rel = (m.relationship || '').toLowerCase();
      return name.includes(q) || username.includes(q) || phone.includes(q) || rel.includes(q);
    });
  };

  const filteredList = getFilteredList();

  // Execute admin action
  const handleConfirmAction = async () => {
    if (!selectedUserForAction || !actionType) return;
    setIsProcessing(true);

    const target = selectedUserForAction;
    try {
      if (actionType === 'approve') {
        familyService.approveMember(target.id);
        if (onShowToast) onShowToast(`Đã phê duyệt tài khoản ${target.name} tham gia gia đình!`, 'success');
      } else if (actionType === 'reject') {
        familyService.rejectMember(target.id);
        if (onShowToast) onShowToast(`Đã từ chối tài khoản ${target.name}`, 'info');
      } else if (actionType === 'toggleActive') {
        const nextActive = target.isActive === false;
        familyService.toggleMemberActive(target.id, nextActive);
        if (onShowToast) {
          onShowToast(
            nextActive
              ? `Đã mở khóa tài khoản ${target.name}`
              : `Đã tạm khóa tài khoản ${target.name}`,
            'info'
          );
        }
      } else if (actionType === 'delete') {
        familyService.deleteMemberAccount(target.id);
        if (onShowToast) onShowToast(`Đã xóa vĩnh viễn tài khoản ${target.name}`, 'success');
      }
    } catch (err: any) {
      if (onShowToast) onShowToast(err.message || 'Thao tác thất bại', 'error');
    } finally {
      setIsProcessing(false);
      setSelectedUserForAction(null);
      setActionType(null);
    }
  };

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      {/* 1. Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base font-black text-stone-900 tracking-tight flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-orange-600" />
              <span>Quản Lý Tài Khoản</span>
            </h2>
            <p className="text-[11px] text-stone-500 font-medium">
              Phê duyệt thành viên mới & phân quyền hệ thống
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-orange-100 text-orange-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-orange-200">
          <Sparkles className="w-3 h-3 text-orange-600" />
          <span>Admin: Lâm Huệ Trung</span>
        </div>
      </div>

      {/* 2. Stats Grid */}
      <div className="grid grid-cols-3 gap-2">
        <div
          onClick={() => setActiveTab('pending')}
          className={`p-3 rounded-2xl border transition cursor-pointer ${
            activeTab === 'pending'
              ? 'bg-amber-50 border-amber-300 ring-2 ring-amber-500/20 shadow-xs'
              : 'bg-white border-stone-200/80 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Chờ Duyệt</span>
            <Clock className={`w-3.5 h-3.5 ${pendingMembers.length > 0 ? 'text-amber-600 animate-pulse' : 'text-amber-400'}`} />
          </div>
          <div className="text-lg font-black text-amber-900">{pendingMembers.length}</div>
          <div className="text-[9px] text-amber-700/80">Tài khoản mới đăng ký</div>
        </div>

        <div
          onClick={() => setActiveTab('approved')}
          className={`p-3 rounded-2xl border transition cursor-pointer ${
            activeTab === 'approved'
              ? 'bg-emerald-50 border-emerald-300 ring-2 ring-emerald-500/20 shadow-xs'
              : 'bg-white border-stone-200/80 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Đã Duyệt</span>
            <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-900">{approvedMembers.length}</div>
          <div className="text-[9px] text-emerald-700/80">Thành viên chính thức</div>
        </div>

        <div
          onClick={() => setActiveTab('rejected')}
          className={`p-3 rounded-2xl border transition cursor-pointer ${
            activeTab === 'rejected'
              ? 'bg-rose-50 border-rose-300 ring-2 ring-rose-500/20 shadow-xs'
              : 'bg-white border-stone-200/80 hover:bg-stone-50'
          }`}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider">Từ Chối / Khóa</span>
            <UserX className="w-3.5 h-3.5 text-rose-600" />
          </div>
          <div className="text-lg font-black text-rose-900">{rejectedMembers.length}</div>
          <div className="text-[9px] text-rose-700/80">Không hoạt động</div>
        </div>
      </div>

      {/* 3. Search Bar */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Tìm theo họ tên, username (@), số điện thoại..."
          className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-2xl text-xs text-stone-900 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 shadow-2xs"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 4. Filter Tab Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'pending'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          <span>Chờ duyệt ({pendingMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'approved'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Đã duyệt ({approvedMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'rejected'
              ? 'bg-rose-600 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <XCircle className="w-3.5 h-3.5" />
          <span>Từ chối / Khóa ({rejectedMembers.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-full font-bold transition flex items-center gap-1.5 shrink-0 ${
            activeTab === 'all'
              ? 'bg-stone-800 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Tất cả ({allMembers.length})</span>
        </button>
      </div>

      {/* 5. Members List */}
      <div className="space-y-3">
        {filteredList.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 border border-stone-200/80 text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-stone-100 flex items-center justify-center text-stone-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-stone-800">Không có tài khoản nào</h3>
            <p className="text-xs text-stone-500 max-w-xs mx-auto">
              {activeTab === 'pending'
                ? 'Hiện tại không có thành viên nào đang chờ phê duyệt.'
                : 'Không tìm thấy tài khoản phù hợp với bộ lọc hiện tại.'}
            </p>
          </div>
        ) : (
          filteredList.map((member) => {
            const isSelf = member.id === currentMember.id || member.username === 'lamhuetrung';
            const isPending = member.approvalStatus === 'pending';
            const isApproved = member.approvalStatus === 'approved' || (!member.approvalStatus && member.id);
            const isRejected = member.approvalStatus === 'rejected';
            const isLocked = member.isActive === false;

            return (
              <div
                key={member.id}
                className={`bg-white rounded-3xl p-4 border transition-all space-y-3 shadow-2xs ${
                  isPending
                    ? 'border-amber-300 ring-1 ring-amber-400/30'
                    : isRejected || isLocked
                    ? 'border-stone-200/70 opacity-90'
                    : 'border-stone-200/80'
                }`}
              >
                {/* Header card: Avatar, Name, Relationship, Status Badge */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar
                      src={member.avatar}
                      name={member.name}
                      size="md"
                      online={member.onlineStatus === 'online'}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <h4 className="text-sm font-black text-stone-900 truncate">
                          {member.name}
                        </h4>
                        {member.isAdmin && (
                          <span className="bg-orange-100 text-orange-800 text-[9px] font-bold px-1.5 py-0.5 rounded-md border border-orange-200">
                            Admin
                          </span>
                        )}
                        {isSelf && (
                          <span className="bg-stone-100 text-stone-700 text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                            Bạn
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 text-xs text-stone-500 font-medium mt-0.5">
                        <span className="text-orange-600 font-bold">{member.relationship}</span>
                        {member.username && (
                          <span className="font-mono text-[11px] text-stone-400">@{member.username}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div>
                    {isPending && (
                      <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 border border-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                        <Clock className="w-3 h-3 text-amber-600" />
                        <span>Chờ duyệt</span>
                      </span>
                    )}
                    {isApproved && !isLocked && (
                      <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Đã duyệt</span>
                      </span>
                    )}
                    {isLocked && (
                      <span className="inline-flex items-center gap-1 bg-stone-100 text-stone-700 border border-stone-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <Lock className="w-3 h-3 text-stone-600" />
                        <span>Đã khóa</span>
                      </span>
                    )}
                    {isRejected && (
                      <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <XCircle className="w-3 h-3 text-rose-600" />
                        <span>Đã từ chối</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Member Detailed Info */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-stone-600 bg-stone-50/80 p-2.5 rounded-2xl border border-stone-100">
                  {member.phone && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{member.phone}</span>
                    </div>
                  )}
                  {member.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{member.email}</span>
                    </div>
                  )}
                  {member.birthDate && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Calendar className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span>{member.birthDate}</span>
                    </div>
                  )}
                  {member.locationAddress && (
                    <div className="flex items-center gap-1.5 truncate">
                      <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                      <span className="truncate">{member.locationAddress}</span>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                {!isSelf && (
                  <div className="flex items-center gap-2 pt-1 border-t border-stone-100">
                    {isPending && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedUserForAction(member);
                            setActionType('approve');
                          }}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                        >
                          <Check className="w-4 h-4" />
                          <span>Phê Duyệt Tham Gia</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUserForAction(member);
                            setActionType('reject');
                          }}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 active:scale-95"
                        >
                          <X className="w-4 h-4" />
                          <span>Từ Chối</span>
                        </button>
                      </>
                    )}

                    {isApproved && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedUserForAction(member);
                            setActionType('toggleActive');
                          }}
                          className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                            isLocked
                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                          }`}
                        >
                          {isLocked ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Mở Khóa Tài Khoản</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Tạm Khóa</span>
                            </>
                          )}
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUserForAction(member);
                            setActionType('delete');
                          }}
                          className="py-2 px-3 bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-rose-700 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                          title="Xóa tài khoản"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa</span>
                        </button>
                      </>
                    )}

                    {isRejected && (
                      <>
                        <button
                          onClick={() => {
                            setSelectedUserForAction(member);
                            setActionType('approve');
                          }}
                          className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Duyệt Lại</span>
                        </button>

                        <button
                          onClick={() => {
                            setSelectedUserForAction(member);
                            setActionType('delete');
                          }}
                          className="py-2 px-3 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Xóa Vĩnh Viễn</span>
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Confirmation Modal */}
      {selectedUserForAction && actionType && (
        <Modal
          isOpen={true}
          onClose={() => {
            if (!isProcessing) {
              setSelectedUserForAction(null);
              setActionType(null);
            }
          }}
          title={
            actionType === 'approve'
              ? 'Xác nhận phê duyệt thành viên'
              : actionType === 'reject'
              ? 'Xác nhận từ chối tài khoản'
              : actionType === 'delete'
              ? 'Xác nhận xóa tài khoản'
              : selectedUserForAction.isActive === false
              ? 'Mở khóa tài khoản'
              : 'Tạm khóa tài khoản'
          }
        >
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 bg-stone-50 rounded-2xl border border-stone-200/80">
              <Avatar
                src={selectedUserForAction.avatar}
                name={selectedUserForAction.name}
                size="md"
              />
              <div>
                <h4 className="text-sm font-bold text-stone-900">
                  {selectedUserForAction.name}
                </h4>
                <p className="text-xs text-stone-500">
                  {selectedUserForAction.relationship} • @{selectedUserForAction.username || 'user'}
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {actionType === 'approve' &&
                `Bạn có đồng ý phê duyệt cho ${selectedUserForAction.name} tham gia vào không gian chung của gia đình? Sau khi duyệt, thành viên này có thể đăng nhập bình thường.`}
              {actionType === 'reject' &&
                `Bạn có chắc chắn muốn từ chối yêu cầu tham gia của ${selectedUserForAction.name}?`}
              {actionType === 'delete' &&
                `Hành động này sẽ xóa vĩnh viễn tài khoản của ${selectedUserForAction.name} khỏi hệ thống gia đình.`}
              {actionType === 'toggleActive' &&
                (selectedUserForAction.isActive === false
                  ? `Mở khóa cho phép ${selectedUserForAction.name} đăng nhập lại vào hệ thống gia đình.`
                  : `Tạm thời vô hiệu hóa quyền đăng nhập của ${selectedUserForAction.name}.`)}
            </p>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => {
                  setSelectedUserForAction(null);
                  setActionType(null);
                }}
                className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl text-xs transition"
              >
                Hủy bỏ
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={handleConfirmAction}
                className={`flex-1 py-2.5 text-white font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 ${
                  actionType === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : actionType === 'delete' || actionType === 'reject'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isProcessing ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>Xác Nhận Thực Hiện</span>
                )}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
