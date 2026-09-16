import React, { useState } from 'react';
import { FamilyInfo, FamilyMember, MemoryAlbum } from '../../types';
import { Avatar } from '../common/Avatar';
import {
  Phone,
  MessageCircle,
  Calendar,
  MapPin,
  Heart,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronRight,
  Battery,
  Shield,
  Layers,
  Sparkles,
  Edit3,
} from 'lucide-react';
import { Modal } from '../common/Modal';
import { EditFamilyModal } from '../family/EditFamilyModal';

interface FamilyScreenProps {
  familyInfo: FamilyInfo;
  members: FamilyMember[];
  albums: MemoryAlbum[];
  selectedMemberId?: string | null;
  onSelectMember: (memberId: string | null) => void;
  onStartChatWith: (memberId: string) => void;
  onUpdateFamilyInfo?: (updatedInfo: Partial<FamilyInfo>) => void;
}

export const FamilyScreen: React.FC<FamilyScreenProps> = ({
  familyInfo,
  members,
  albums,
  selectedMemberId,
  onSelectMember,
  onStartChatWith,
  onUpdateFamilyInfo,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'tree'>('tree');
  const [treeZoom, setTreeZoom] = useState(1);
  const [isEditFamilyOpen, setIsEditFamilyOpen] = useState(false);

  // Group members by generations for the visual Tree
  // Gen 1: Ông Bà
  const gen1 = members.filter((m) => m.generation === 1);
  // Gen 2: Bố Mẹ & Cô Chú
  const gen2 = members.filter((m) => m.generation === 2);
  // Gen 3: Con Cháu
  const gen3 = members.filter((m) => m.generation === 3);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      {/* 1. Family Header Card */}
      <section className="bg-linear-to-b from-orange-50/80 to-white rounded-3xl p-4 border border-stone-200/70 shadow-xs">
        <div className="flex items-center gap-3.5">
          <img
            src={familyInfo.avatar}
            alt={familyInfo.name}
            className="w-14 h-14 rounded-2xl object-cover ring-2 ring-orange-200/80 shadow-xs shrink-0"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-1.5">
              <h2 className="text-base font-bold text-stone-900 truncate">
                {familyInfo.name}
              </h2>
              {onUpdateFamilyInfo && (
                <button
                  type="button"
                  onClick={() => setIsEditFamilyOpen(true)}
                  className="px-2.5 py-1 rounded-xl bg-orange-100 hover:bg-orange-200/90 text-orange-800 text-[11px] font-bold flex items-center gap-1 shrink-0 transition active:scale-95 shadow-2xs"
                  title="Cập nhật thông tin gia đình"
                >
                  <Edit3 className="w-3 h-3 text-orange-600" />
                  <span>Sửa thông tin</span>
                </button>
              )}
            </div>
            <p className="text-xs text-orange-700 font-medium italic truncate">
              "{familyInfo.motto}"
            </p>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-stone-500">
              <span className="flex items-center gap-1 truncate">
                <MapPin className="w-3 h-3 text-stone-400 shrink-0" />
                {familyInfo.homeAddress}
              </span>
              {familyInfo.ancestralHome && (
                <span className="text-stone-400 text-[10px] truncate">
                  • Quê quán: {familyInfo.ancestralHome}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tab switch: Cây Gia Phả vs Danh sách thành viên */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-stone-100 rounded-xl">
          <button
            onClick={() => setViewMode('tree')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              viewMode === 'tree'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            🌳 Cây gia phả trực quan
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition ${
              viewMode === 'list'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            👥 Danh sách thành viên ({members.length})
          </button>
        </div>
      </section>

      {/* 2. Interactive Family Tree View */}
      {viewMode === 'tree' && (
        <section className="bg-white rounded-3xl p-4 border border-stone-200/70 shadow-xs relative overflow-hidden">
          {/* Zoom controls */}
          <div className="flex items-center justify-between pb-2 border-b border-stone-100 mb-3">
            <div className="flex items-center gap-1 text-[11px] text-stone-500 font-medium">
              <Layers className="w-3.5 h-3.5 text-orange-600" />
              <span>Chạm thành viên để xem thông tin chi tiết</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setTreeZoom((z) => Math.max(0.8, z - 0.1))}
                className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center text-xs hover:bg-stone-200 transition"
                aria-label="Thu nhỏ"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] text-stone-500 w-8 text-center font-mono">
                {Math.round(treeZoom * 100)}%
              </span>
              <button
                onClick={() => setTreeZoom((z) => Math.min(1.2, z + 0.1))}
                className="w-7 h-7 rounded-lg bg-stone-100 text-stone-700 flex items-center justify-center text-xs hover:bg-stone-200 transition"
                aria-label="Phóng to"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            className="transition-transform duration-200 origin-top overflow-x-auto no-scrollbar py-2"
            style={{ transform: `scale(${treeZoom})` }}
          >
            {/* Generation 1: Ông Bà */}
            <div className="text-center mb-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-amber-800 bg-amber-100/70 px-2.5 py-0.5 rounded-full">
                Thế hệ 1 • Trưởng lão Ông Bà
              </span>
              <div className="flex items-center justify-center gap-4 mt-2.5">
                {gen1.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelectMember(m.id)}
                    className="flex flex-col items-center p-2 rounded-2xl bg-amber-50/50 hover:bg-amber-100/60 border border-amber-200/70 transition shadow-xs active:scale-95 min-w-[100px]"
                  >
                    <Avatar
                      src={m.avatar}
                      name={m.name}
                      size="md"
                      online={m.onlineStatus === 'online'}
                    />
                    <span className="text-xs font-bold text-stone-900 mt-1.5">{m.relationship}</span>
                    <span className="text-[11px] text-stone-600 truncate max-w-[90px]">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tree Branch Line */}
            <div className="w-0.5 h-4 bg-stone-300 mx-auto -my-1" />

            {/* Generation 2: Bố Mẹ & Cô Chú */}
            <div className="text-center my-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-800 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                Thế hệ 2 • Bố Mẹ & Cô Chú
              </span>
              <div className="flex items-center justify-center gap-3 mt-2.5">
                {gen2.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelectMember(m.id)}
                    className="flex flex-col items-center p-2 rounded-2xl bg-stone-50 hover:bg-orange-50 border border-stone-200/70 transition shadow-xs active:scale-95 min-w-[95px]"
                  >
                    <Avatar
                      src={m.avatar}
                      name={m.name}
                      size="md"
                      online={m.onlineStatus === 'online'}
                    />
                    <span className="text-xs font-bold text-stone-900 mt-1.5">{m.relationship}</span>
                    <span className="text-[11px] text-stone-600 truncate max-w-[85px]">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tree Branch Line */}
            <div className="w-0.5 h-4 bg-stone-300 mx-auto -my-1" />

            {/* Generation 3: Con Cái & Cháu */}
            <div className="text-center mt-4">
              <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-800 bg-emerald-100/70 px-2.5 py-0.5 rounded-full">
                Thế hệ 3 • Con Cái & Cháu
              </span>
              <div className="flex items-center justify-center gap-3 mt-2.5">
                {gen3.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelectMember(m.id)}
                    className="flex flex-col items-center p-2 rounded-2xl bg-emerald-50/40 hover:bg-emerald-100/50 border border-emerald-200/60 transition shadow-xs active:scale-95 min-w-[95px]"
                  >
                    <Avatar
                      src={m.avatar}
                      name={m.name}
                      size="md"
                      online={m.onlineStatus === 'online'}
                    />
                    <span className="text-xs font-bold text-stone-900 mt-1.5">{m.relationship}</span>
                    <span className="text-[11px] text-stone-600 truncate max-w-[85px]">{m.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* 3. Member Directory List View */}
      {viewMode === 'list' && (
        <section className="space-y-2.5">
          {members.map((member) => (
            <div
              key={member.id}
              onClick={() => onSelectMember(member.id)}
              className="p-3.5 bg-white rounded-2xl border border-stone-200/70 shadow-xs flex items-center justify-between cursor-pointer hover:bg-stone-50 transition active:scale-99"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Avatar
                  src={member.avatar}
                  name={member.name}
                  size="md"
                  online={member.onlineStatus === 'online'}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-stone-900 truncate">
                      {member.name}
                    </h4>
                    <span className="text-[10px] bg-stone-100 text-stone-700 font-semibold px-1.5 py-0.5 rounded-md">
                      {member.relationship}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-stone-500 mt-0.5">
                    <span className="flex items-center gap-1 truncate">
                      <MapPin className="w-3 h-3 text-stone-400" />
                      {member.currentZone || 'Đang ở nhà'}
                    </span>
                    {member.batteryLevel !== undefined && (
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <Battery className="w-3 h-3 text-emerald-600" />
                        {member.batteryLevel}%
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-stone-400 shrink-0" />
            </div>
          ))}
        </section>
      )}

      {/* 4. Member Profile Modal / Deep-dive */}
      <Modal
        isOpen={!!selectedMember}
        onClose={() => onSelectMember(null)}
        title="Hồ sơ thành viên"
      >
        {selectedMember && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="flex items-center gap-3.5 pb-3 border-b border-stone-100">
              <Avatar
                src={selectedMember.avatar}
                name={selectedMember.name}
                size="lg"
                online={selectedMember.onlineStatus === 'online'}
                relationship={selectedMember.relationship}
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-stone-900 truncate">
                    {selectedMember.name}
                  </h3>
                </div>
                <p className="text-xs font-medium text-orange-600">
                  {selectedMember.relationship} • Thế hệ thứ {selectedMember.generation}
                </p>
                <p className="text-[11px] text-stone-500 mt-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-stone-400" />
                  Sinh ngày: {selectedMember.birthDate.split('-').reverse().join('/')}
                </p>
              </div>
            </div>

            {/* Direct Action Buttons: Call & Chat */}
            <div className="grid grid-cols-2 gap-2.5">
              <a
                href={`tel:${selectedMember.phone.replace(/\s+/g, '')}`}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Gọi điện ({selectedMember.phone})</span>
              </a>
              <button
                onClick={() => {
                  onSelectMember(null);
                  onStartChatWith(selectedMember.id);
                }}
                className="flex items-center justify-center gap-2 py-2.5 px-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold shadow-xs transition active:scale-95"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Nhắn tin gia đình</span>
              </button>
            </div>

            {/* Current status & location */}
            <div className="p-3 bg-stone-50 rounded-2xl space-y-1.5 text-xs text-stone-700">
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Trạng thái hiện tại:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {selectedMember.onlineStatus === 'online' ? 'Đang hoạt động' : 'Ngoại tuyến'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-stone-500">Vị trí / Vùng an toàn:</span>
                <span className="font-semibold text-stone-900 truncate max-w-[180px]">
                  {selectedMember.currentZone || 'Nhà chính (Đội Cấn)'}
                </span>
              </div>
              {selectedMember.isEmergencyContact && (
                <div className="flex items-center gap-1 text-[11px] text-rose-700 font-semibold pt-1">
                  <Shield className="w-3.5 h-3.5 text-rose-600" />
                  Liên hệ khẩn cấp ưu tiên (SOS)
                </div>
              )}
            </div>

            {/* Notes & Hobbies */}
            {selectedMember.notes && (
              <div>
                <h5 className="text-xs font-bold text-stone-900 mb-1">Ghi chú quan tâm:</h5>
                <p className="text-xs text-stone-600 leading-relaxed bg-amber-50/50 p-2.5 rounded-xl border border-amber-100">
                  {selectedMember.notes}
                </p>
              </div>
            )}

            {selectedMember.hobbies && selectedMember.hobbies.length > 0 && (
              <div>
                <h5 className="text-xs font-bold text-stone-900 mb-1.5">Sở thích & Niềm vui:</h5>
                <div className="flex flex-wrap gap-1.5">
                  {selectedMember.hobbies.map((h, i) => (
                    <span
                      key={i}
                      className="text-[11px] bg-stone-100 text-stone-700 px-2 py-0.5 rounded-full font-medium"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* Modal Cập nhật thông tin gia đình */}
      {onUpdateFamilyInfo && (
        <EditFamilyModal
          isOpen={isEditFamilyOpen}
          familyInfo={familyInfo}
          onClose={() => setIsEditFamilyOpen(false)}
          onSave={(updated) => {
            onUpdateFamilyInfo(updated);
            setIsEditFamilyOpen(false);
          }}
        />
      )}
    </div>
  );
};
