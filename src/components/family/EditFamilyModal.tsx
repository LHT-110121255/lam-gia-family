import React, { useState } from 'react';
import { FamilyInfo } from '../../types';
import { LocationInput } from '../common/LocationInput';
import {
  X,
  Save,
  Home,
  Heart,
  Calendar,
  MapPin,
  Sparkles,
  Phone,
  Compass,
  FileText,
  Image as ImageIcon,
  Check,
  Building,
} from 'lucide-react';

interface EditFamilyModalProps {
  isOpen: boolean;
  familyInfo: FamilyInfo;
  onClose: () => void;
  onSave: (updatedInfo: Partial<FamilyInfo>) => void;
}

const PRESET_AVATARS = [
  {
    url: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?w=300&auto=format&fit=crop&q=80',
    label: 'Gia đình sum vầy',
  },
  {
    url: 'https://images.unsplash.com/photo-1576765608535-5f04d1e3f289?w=300&auto=format&fit=crop&q=80',
    label: 'Ấm áp cội nguồn',
  },
  {
    url: 'https://images.unsplash.com/photo-1609234656388-0ff363383899?w=300&auto=format&fit=crop&q=80',
    label: 'Gắn kết ba thế hệ',
  },
  {
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=300&auto=format&fit=crop&q=80',
    label: 'Bữa cơm gia đình',
  },
  {
    url: 'https://images.unsplash.com/photo-1584824486509-112e4181ff6b?w=300&auto=format&fit=crop&q=80',
    label: 'Yêu thương sẻ chia',
  },
];

const PRESET_COVERS = [
  {
    url: 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1000&auto=format&fit=crop&q=80',
    label: 'Bữa tiệc sum họp',
  },
  {
    url: 'https://images.unsplash.com/photo-1513151233558-d860c5398176?w=1000&auto=format&fit=crop&q=80',
    label: 'Ấm áp & Bình yên',
  },
  {
    url: 'https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=1000&auto=format&fit=crop&q=80',
    label: 'Kỷ niệm đoàn tụ',
  },
  {
    url: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=1000&auto=format&fit=crop&q=80',
    label: 'Quê hương thanh bình',
  },
];

export const EditFamilyModal: React.FC<EditFamilyModalProps> = ({
  isOpen,
  familyInfo,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState(familyInfo.name);
  const [motto, setMotto] = useState(familyInfo.motto);
  const [createdYear, setCreatedYear] = useState<number | string>(familyInfo.createdYear || 1974);
  const [homeAddress, setHomeAddress] = useState(familyInfo.homeAddress);
  const [ancestralHome, setAncestralHome] = useState(familyInfo.ancestralHome || '');
  const [contactPhone, setContactPhone] = useState(familyInfo.contactPhone || '');
  const [elderCareNotes, setElderCareNotes] = useState(familyInfo.elderCareNotes || '');
  const [avatar, setAvatar] = useState(familyInfo.avatar);
  const [coverImage, setCoverImage] = useState(familyInfo.coverImage);

  const [activeTab, setActiveTab] = useState<'info' | 'images'>('info');
  const [showCustomAvatarInput, setShowCustomAvatarInput] = useState(false);
  const [showCustomCoverInput, setShowCustomCoverInput] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState('');
  const [customCoverUrl, setCustomCoverUrl] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên gia đình hoặc dòng họ');
      setActiveTab('info');
      return;
    }

    const yearNum = typeof createdYear === 'number' ? createdYear : parseInt(createdYear, 10);

    onSave({
      name: name.trim(),
      motto: motto.trim(),
      createdYear: isNaN(yearNum) ? 1974 : yearNum,
      homeAddress: homeAddress.trim(),
      ancestralHome: ancestralHome.trim() || undefined,
      contactPhone: contactPhone.trim() || undefined,
      elderCareNotes: elderCareNotes.trim() || undefined,
      avatar,
      coverImage,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col shadow-2xl overflow-hidden border border-stone-200">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/70">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 flex items-center justify-center text-orange-600">
              <Home className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-stone-900 leading-tight">
                Cập nhật thông tin gia đình
              </h2>
              <p className="text-xs text-stone-500">Chỉnh sửa tên, khẩu hiệu, địa chỉ và hình ảnh</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-200/60 hover:bg-stone-200 flex items-center justify-center text-stone-600 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live Preview Card */}
        <div className="px-5 pt-4 pb-2 bg-stone-50/40 border-b border-stone-100">
          <div className="relative rounded-2xl overflow-hidden shadow-xs border border-stone-200">
            {/* Cover photo preview */}
            <div className="h-20 w-full relative bg-stone-200">
              <img
                src={coverImage}
                alt="Cover Preview"
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="absolute inset-0 bg-linear-to-t from-black/60 via-black/20 to-transparent" />
            </div>

            {/* Avatar & Title overlay */}
            <div className="px-3.5 pb-3 -mt-6 relative flex items-center gap-3">
              <img
                src={avatar}
                alt="Avatar Preview"
                className="w-13 h-13 rounded-2xl object-cover ring-2 ring-white shadow-md shrink-0 bg-white"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
              <div className="min-w-0 flex-1 pt-4">
                <h4 className="text-sm font-bold text-stone-900 truncate">
                  {name.trim() || 'Tên gia đình...'}
                </h4>
                <p className="text-[11px] text-orange-700 font-medium italic truncate">
                  "{motto.trim() || 'Khẩu hiệu gia đình...'}"
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs inside modal */}
        <div className="flex border-b border-stone-100 px-5 pt-2 bg-white">
          <button
            type="button"
            onClick={() => setActiveTab('info')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'info'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <Building className="w-3.5 h-3.5" />
            <span>Thông tin cốt lõi</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('images')}
            className={`pb-2.5 px-3 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'images'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-stone-500 hover:text-stone-800'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Ảnh biểu trưng & Ảnh bìa</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-600 flex items-center gap-2">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {activeTab === 'info' && (
            <div className="space-y-3.5">
              {/* Family Name */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Tên gia đình / Dòng họ <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      if (error) setError(null);
                    }}
                    placeholder="VD: Đại gia đình họ Nguyễn"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                  <Home className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                </div>
              </div>

              {/* Family Motto */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Gia huấn / Khẩu hiệu gắn kết
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={motto}
                    onChange={(e) => setMotto(e.target.value)}
                    placeholder="VD: Kính trên nhường dưới — Sum vầy & Yêu thương"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                  />
                  <Heart className="w-4 h-4 text-orange-500 absolute left-3 top-3" />
                </div>
              </div>

              {/* Created Year & Contact Phone */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Năm lập nghiệp / Gốc rễ
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={createdYear}
                      onChange={(e) => setCreatedYear(e.target.value)}
                      placeholder="1974"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    />
                    <Calendar className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    SĐT liên hệ chính
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)}
                      placeholder="0912 xxx xxx"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition"
                    />
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3" />
                  </div>
                </div>
              </div>

              {/* Main Address with Vietbando Map & Autocomplete */}
              <LocationInput
                label="Địa chỉ nhà chính / Nhà bố mẹ"
                value={homeAddress}
                onChange={(val) => setHomeAddress(val)}
                placeholder="Số 28, Ngõ 195 Phố Đội Cấn, Ba Đình, Hà Nội"
              />

              {/* Ancestral Home with Vietbando Map & Autocomplete */}
              <LocationInput
                label="Quê quán / Nhà thờ tổ (nếu có)"
                value={ancestralHome}
                onChange={(val) => setAncestralHome(val)}
                placeholder="VD: Làng Cổ, Kim Động, Hưng Yên"
              />

              {/* Elder Care Notes */}
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Lời dặn chung / Lưu ý sức khỏe người lớn tuổi
                </label>
                <div className="relative">
                  <textarea
                    rows={2}
                    value={elderCareNotes}
                    onChange={(e) => setElderCareNotes(e.target.value)}
                    placeholder="VD: Nhắc nhở con cháu hỏi thăm ông bà, kiểm tra huyết áp mỗi sáng lúc 7h..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl border border-stone-300 text-xs font-medium focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition resize-none"
                  />
                  <FileText className="w-4 h-4 text-stone-400 absolute left-3 top-2.5" />
                </div>
              </div>
            </div>
          )}

          {activeTab === 'images' && (
            <div className="space-y-4">
              {/* 1. Avatar selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-orange-600" />
                    <span>Ảnh đại diện gia đình</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomAvatarInput(!showCustomAvatarInput)}
                    className="text-[11px] font-bold text-orange-600 hover:underline"
                  >
                    {showCustomAvatarInput ? 'Chọn mẫu có sẵn' : 'Dán liên kết ảnh riêng'}
                  </button>
                </div>

                {showCustomAvatarInput ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Dán link ảnh đại diện (https://...)"
                        value={customAvatarUrl}
                        onChange={(e) => setCustomAvatarUrl(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customAvatarUrl.trim()) {
                            setAvatar(customAvatarUrl.trim());
                          }
                        }}
                        className="px-3 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold shrink-0"
                      >
                        Áp dụng
                      </button>
                    </div>
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-orange-50 border border-dashed border-stone-300 hover:border-orange-400 rounded-xl cursor-pointer text-stone-700 hover:text-orange-700 transition">
                      <span className="font-semibold text-xs">📷 Tải ảnh đại diện từ thiết bị</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const { api } = await import('../../services/api');
                            const url = await api.uploadFile(file);
                            setAvatar(url);
                          } catch (err) {
                            console.error('Lỗi upload avatar gia đình:', err);
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-5 gap-2">
                    {PRESET_AVATARS.map((p, idx) => {
                      const isSelected = avatar === p.url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setAvatar(p.url)}
                          className={`relative group rounded-xl overflow-hidden aspect-square border-2 transition ${
                            isSelected
                              ? 'border-orange-600 ring-2 ring-orange-400/40 shadow-xs'
                              : 'border-transparent hover:border-stone-300 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={p.url}
                            alt={p.label}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          {isSelected && (
                            <div className="absolute inset-0 bg-orange-600/30 flex items-center justify-center">
                              <Check className="w-4 h-4 text-white drop-shadow-md stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Cover image selector */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5 text-orange-600" />
                    <span>Ảnh bìa tổ ấm</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowCustomCoverInput(!showCustomCoverInput)}
                    className="text-[11px] font-bold text-orange-600 hover:underline"
                  >
                    {showCustomCoverInput ? 'Chọn mẫu có sẵn' : 'Dán liên kết ảnh riêng'}
                  </button>
                </div>

                {showCustomCoverInput ? (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="url"
                        placeholder="Dán link ảnh bìa (https://...)"
                        value={customCoverUrl}
                        onChange={(e) => setCustomCoverUrl(e.target.value)}
                        className="flex-1 px-3 py-2 rounded-xl border border-stone-300 text-xs"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (customCoverUrl.trim()) {
                            setCoverImage(customCoverUrl.trim());
                          }
                        }}
                        className="px-3 py-2 bg-orange-600 text-white rounded-xl text-xs font-bold shrink-0"
                      >
                        Áp dụng
                      </button>
                    </div>
                    <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-orange-50 border border-dashed border-stone-300 hover:border-orange-400 rounded-xl cursor-pointer text-stone-700 hover:text-orange-700 transition">
                      <span className="font-semibold text-xs">🖼️ Tải ảnh bìa tổ ấm từ thiết bị</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          try {
                            const { api } = await import('../../services/api');
                            const url = await api.uploadFile(file);
                            setCoverImage(url);
                          } catch (err) {
                            console.error('Lỗi upload cover gia đình:', err);
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_COVERS.map((p, idx) => {
                      const isSelected = coverImage === p.url;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCoverImage(p.url)}
                          className={`relative rounded-xl overflow-hidden h-20 border-2 transition text-left group ${
                            isSelected
                              ? 'border-orange-600 ring-2 ring-orange-400/40'
                              : 'border-transparent hover:border-stone-300 opacity-80 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={p.url}
                            alt={p.label}
                            className="w-full h-full object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/20 to-transparent flex items-end p-2">
                            <span className="text-[10px] font-bold text-white truncate drop-shadow-xs">
                              {p.label}
                            </span>
                          </div>
                          {isSelected && (
                            <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-orange-600 text-white flex items-center justify-center shadow-xs">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-3 border-t border-stone-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-stone-200 text-xs font-bold text-stone-700 hover:bg-stone-50 transition"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-md shadow-orange-600/20 transition flex items-center gap-1.5 active:scale-95"
            >
              <Save className="w-4 h-4" />
              <span>Lưu thông tin gia đình</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
