import React, { useState } from "react";
import {
  Camera,
  Save,
  Phone,
  Mail,
  Calendar,
  Heart,
  Activity,
  Plus,
  X,
  Lock,
  LogOut,
  Users,
  AlertCircle,
  Briefcase,
  MapPin,
  Sparkles,
} from "lucide-react";
import { FamilyMember, MemberRole } from "../../types";
import { Avatar } from "../common/Avatar";
import { LocationInput } from "../common/LocationInput";
import { AVATAR_PRESETS } from "../auth/AuthScreen";

interface ProfileManagementScreenProps {
  member: FamilyMember;
  allMembers: FamilyMember[];
  familyName?: string;
  onSaveMember: (updatedMember: Partial<FamilyMember>) => void;
  onLogout?: () => void;
  onBack?: () => void;
}

const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"];

const GENERATION_LABELS: Record<number, string> = {
  1: "Thế hệ 1 (Ông / Bà)",
  2: "Thế hệ 2 (Tỉa / Mẹ / Cô / Chú)",
  3: "Thế hệ 3 (Con / Cháu)",
  4: "Thế hệ 4 (Chắt / Chút)",
};

export const ProfileManagementScreen: React.FC<
  ProfileManagementScreenProps
> = ({
  member,
  allMembers,
  familyName = "Đại gia đình họ Nguyễn",
  onSaveMember,
  onLogout,
}) => {
  // Form State initialized from member
  const [name, setName] = useState(member.name);
  const [relationship, setRelationship] = useState(member.relationship);
  const [role, setRole] = useState<MemberRole>(member.role);
  const [generation, setGeneration] = useState<number>(member.generation || 2);
  const [phone, setPhone] = useState(member.phone);
  const [email, setEmail] = useState(member.email || "");
  const [birthDate, setBirthDate] = useState(member.birthDate || "1980-01-01");
  const [avatar, setAvatar] = useState(member.avatar);
  const [locationAddress, setLocationAddress] = useState(
    member.locationAddress || "28 Phố Đội Cấn, Ba Đình, Hà Nội",
  );
  const [currentZone, setCurrentZone] = useState(
    member.currentZone || "Nhà chính",
  );
  const [jobTitle, setJobTitle] = useState(member.jobTitle || "");
  const [bloodType, setBloodType] = useState(member.bloodType || "O+");
  const [allergies, setAllergies] = useState(member.allergies || "");
  const [medicalNotes, setMedicalNotes] = useState(
    member.medicalNotes || member.notes || "",
  );
  const [isEmergencyContact, setIsEmergencyContact] = useState(
    Boolean(member.isEmergencyContact),
  );
  const [hobbies, setHobbies] = useState<string[]>(
    member.hobbies || ["Gia đình", "Nấu ăn"],
  );
  const [newHobbyInput, setNewHobbyInput] = useState("");

  // UI States
  const [activeTab, setActiveTab] = useState<"info" | "health" | "security">(
    "info",
  );
  const [showAvatarPicker, setShowAvatarPicker] = useState(false);
  const [customAvatarUrl, setCustomAvatarUrl] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Add hobby tag
  const handleAddHobby = () => {
    if (newHobbyInput.trim() && !hobbies.includes(newHobbyInput.trim())) {
      setHobbies([...hobbies, newHobbyInput.trim()]);
      setNewHobbyInput("");
    }
  };

  const handleRemoveHobby = (hobbyToRemove: string) => {
    setHobbies(hobbies.filter((h) => h !== hobbyToRemove));
  };

  // Save profile
  const handleSave = () => {
    setIsSaving(true);
    setTimeout(() => {
      onSaveMember({
        name: name.trim(),
        relationship: relationship.trim(),
        role,
        generation,
        phone: phone.trim(),
        email: email.trim() || undefined,
        birthDate,
        avatar,
        locationAddress,
        currentZone,
        jobTitle,
        bloodType,
        allergies,
        medicalNotes,
        notes: medicalNotes,
        isEmergencyContact,
        hobbies,
      });
      setIsSaving(false);
    }, 400);
  };

  return (
    <div className="space-y-4 pb-24 w-full max-w-full px-4 pt-1">
      {/* 1. Header Profile Card */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        {/* Cover pattern */}
        <div className="h-24 bg-linear-to-r from-orange-400 via-amber-400 to-orange-500 relative flex items-end px-4 pb-2">
          <div className="absolute top-2 right-3">
            <span className="text-[10px] font-bold bg-white/80 backdrop-blur-xs text-orange-950 px-2.5 py-0.5 rounded-full shadow-2xs">
              {familyName}
            </span>
          </div>
        </div>

        {/* Profile Avatar & Quick Details */}
        <div className="px-4 pb-4 pt-0 relative flex flex-col items-center text-center">
          {/* Avatar with Camera Button */}
          <div className="relative -mt-12 mb-2">
            <div className="p-1 rounded-full bg-white shadow-md">
              <Avatar
                src={avatar}
                name={name}
                size="xl"
                online={member.onlineStatus === "online"}
              />
            </div>
            <button
              onClick={() => setShowAvatarPicker(true)}
              className="absolute bottom-0 right-0 p-2 rounded-full bg-orange-600 text-white shadow-md hover:bg-orange-700 active:scale-95 transition"
              title="Đổi ảnh đại diện"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
          </div>

          <h2 className="text-base font-bold text-stone-900">{name}</h2>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap justify-center">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-100 text-orange-800">
              {relationship}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-stone-100 text-stone-700">
              {GENERATION_LABELS[generation] || `Thế hệ ${generation}`}
            </span>
            {isEmergencyContact && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700 flex items-center gap-1">
                <Heart className="w-3 h-3 fill-red-500 text-red-500" /> SOS Liên
                hệ
              </span>
            )}
          </div>

          {/* Save Action Bar */}
          <div className="w-full mt-4 flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-2.5 px-4 bg-orange-600 hover:bg-orange-700 active:scale-[0.98] text-white font-bold rounded-2xl text-xs shadow-sm shadow-orange-600/20 transition flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Lưu thông tin cá nhân</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sub-tab Filter: Cơ bản | Sức khỏe & SOS | Bảo mật & Tài khoản */}
      <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-2xl border border-stone-200/60">
        <button
          onClick={() => setActiveTab("info")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "info"
              ? "bg-white text-orange-700 shadow-xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Cơ bản</span>
        </button>
        <button
          onClick={() => setActiveTab("health")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "health"
              ? "bg-white text-orange-700 shadow-xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Sức khỏe & SOS</span>
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex-1 py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 ${
            activeTab === "security"
              ? "bg-white text-orange-700 shadow-xs"
              : "text-stone-600 hover:text-stone-900"
          }`}
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Tài khoản</span>
        </button>
      </div>

      {/* 3. TAB 1: THÔNG TIN CƠ BẢN */}
      {activeTab === "info" && (
        <div className="space-y-3">
          {/* Card: Thông tin định danh */}
          <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              Định danh thành viên
            </h3>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-700 block">
                Họ và tên
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500/30"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Xưng hô trong nhà
                </label>
                <input
                  type="text"
                  value={relationship}
                  onChange={(e) => setRelationship(e.target.value)}
                  placeholder="VD: Tỉa, Mẹ, Con trai..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500/30"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Nhóm vai trò
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as MemberRole)}
                  className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value="elder">Người cao tuổi (Ông/Bà)</option>
                  <option value="parent">Phụ huynh (Tỉa/Mẹ)</option>
                  <option value="adult">Người lớn (Dâu/Rể/Cô/Chú)</option>
                  <option value="teen">Thanh thiếu niên</option>
                  <option value="child">Trẻ nhỏ (Cháu)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Thế hệ gia đình
                </label>
                <select
                  value={generation}
                  onChange={(e) => setGeneration(Number(e.target.value))}
                  className="w-full px-2.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500/30"
                >
                  <option value={1}>Thế hệ 1 (Ông/Bà)</option>
                  <option value={2}>Thế hệ 2 (Tỉa/Mẹ)</option>
                  <option value={3}>Thế hệ 3 (Con cái)</option>
                  <option value={4}>Thế hệ 4 (Cháu chắt)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Ngày sinh
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-700 block">
                Công việc / Nghề nghiệp
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                  <Briefcase className="w-3.5 h-3.5" />
                </div>
                <input
                  type="text"
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
                  placeholder="VD: Kỹ sư xây dựng / Nghỉ hưu..."
                  className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
            </div>
          </div>

          {/* Card: Liên hệ & Nơi ở */}
          <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-orange-600" />
              Liên hệ & Vị trí thường trú
            </h3>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-700 block">
                Số điện thoại
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                  <Phone className="w-3.5 h-3.5" />
                </div>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-700 block">
                Địa chỉ Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                  <Mail className="w-3.5 h-3.5" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@email.com"
                  className="w-full pl-8 pr-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500/30"
                />
              </div>
            </div>

            {/* Home Address with Vietbando Map & Autocomplete */}
            <LocationInput
              label="Địa chỉ nhà thường trú"
              value={locationAddress}
              onChange={(val) => setLocationAddress(val)}
              placeholder="Nhập địa chỉ hoặc chọn từ bản đồ..."
            />

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-700 block">
                Khu vực an toàn hay đến
              </label>
              <input
                type="text"
                value={currentZone}
                onChange={(e) => setCurrentZone(e.target.value)}
                placeholder="Nhà chính / Cơ quan / Trường học"
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
          </div>

          {/* Card: Sở thích & Thói quen */}
          <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Heart className="w-3.5 h-3.5 text-orange-600" />
              Sở thích & Thói quen
            </h3>

            <div className="flex flex-wrap gap-1.5">
              {hobbies.map((hobby) => (
                <span
                  key={hobby}
                  className="px-2.5 py-1 rounded-xl bg-orange-50 text-orange-900 text-xs font-semibold border border-orange-200/80 flex items-center gap-1"
                >
                  {hobby}
                  <button
                    type="button"
                    onClick={() => handleRemoveHobby(hobby)}
                    className="text-orange-500 hover:text-orange-800"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="text"
                value={newHobbyInput}
                onChange={(e) => setNewHobbyInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddHobby();
                  }
                }}
                placeholder="Thêm sở thích mới (VD: Cờ tướng, Đạp xe)..."
                className="flex-1 px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
              />
              <button
                type="button"
                onClick={handleAddHobby}
                className="px-3 py-2 bg-stone-900 text-white font-bold rounded-xl text-xs hover:bg-stone-800 transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. TAB 2: SỨC KHỎE & SOS KHẨN CẤP */}
      {activeTab === "health" && (
        <div className="space-y-3">
          <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-red-600" />
                Hồ sơ y tế gia đình
              </h3>
              <span className="text-[10px] text-stone-500">
                Hỗ trợ khẩn cấp
              </span>
            </div>

            {/* Emergency Contact Toggle */}
            <div className="p-3 rounded-2xl bg-red-50/70 border border-red-200/80 flex items-center justify-between">
              <div className="space-y-0.5 max-w-[220px]">
                <span className="text-xs font-bold text-red-950 block">
                  Người liên hệ khẩn cấp (SOS)
                </span>
                <p className="text-[10px] text-red-800">
                  Khi người thân kích hoạt báo động khẩn cấp, cuộc gọi và tin
                  nhắn sẽ ưu tiên gọi người này đầu tiên.
                </p>
              </div>
              <input
                type="checkbox"
                checked={isEmergencyContact}
                onChange={(e) => setIsEmergencyContact(e.target.checked)}
                className="w-5 h-5 rounded text-red-600 focus:ring-red-500 border-red-300"
              />
            </div>

            {/* Blood Type */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-stone-700 block">
                Nhóm máu
              </label>
              <div className="flex flex-wrap gap-1.5">
                {BLOOD_TYPES.map((bt) => (
                  <button
                    key={bt}
                    type="button"
                    onClick={() => setBloodType(bt)}
                    className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                      bloodType === bt
                        ? "bg-red-600 text-white shadow-xs"
                        : "bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100"
                    }`}
                  >
                    {bt}
                  </button>
                ))}
              </div>
            </div>

            {/* Allergies */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-700 block">
                Dị ứng (Thực phẩm, Thuốc, Thời tiết)
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                placeholder="VD: Dị ứng tôm cua, kháng sinh Penicillin..."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white"
              />
            </div>

            {/* Medical Notes / Routine */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-stone-700 block">
                Bệnh nền & Lưu ý chăm sóc (Thuốc hàng ngày)
              </label>
              <textarea
                rows={3}
                value={medicalNotes}
                onChange={(e) => setMedicalNotes(e.target.value)}
                placeholder="VD: Uống thuốc huyết áp lúc 7h sáng; kiêng ăn mặn; đi bộ nhẹ 20 phút..."
                className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:bg-white focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 3: TÀI KHOẢN & BẢO MẬT */}
      {activeTab === "security" && (
        <div className="space-y-3">
          <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-stone-900 uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-stone-700" />
              Bảo mật & Quản lý phiên
            </h3>

            {/* Change password button */}
            <button
              onClick={() => setShowPasswordModal(true)}
              className="w-full p-3 rounded-2xl bg-stone-50 hover:bg-stone-100 border border-stone-200/80 text-left flex items-center justify-between transition"
            >
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-stone-600" />
                <div>
                  <span className="text-xs font-bold text-stone-900 block">
                    Đổi mật khẩu tài khoản
                  </span>
                  <span className="text-[10px] text-stone-500">
                    Cập nhật mật khẩu bảo vệ ứng dụng
                  </span>
                </div>
              </div>
              <span className="text-xs text-orange-600 font-bold">
                Cập nhật
              </span>
            </button>

            {/* Logout button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full p-3 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-left flex items-center justify-between transition"
              >
                <div className="flex items-center gap-2.5">
                  <LogOut className="w-4 h-4 text-red-600" />
                  <div>
                    <span className="text-xs font-bold text-red-950 block">
                      Đăng xuất tài khoản
                    </span>
                    <span className="text-[10px] text-red-700">
                      Trở lại màn hình đăng nhập hoặc đăng ký
                    </span>
                  </div>
                </div>
                <span className="text-xs text-red-600 font-bold">
                  Đăng xuất
                </span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* ================= MODAL: CHỌN ẢNH ĐẠI DIỆN ================= */}
      {showAvatarPicker && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">
                Chọn ảnh đại diện
              </h3>
              <button
                onClick={() => setShowAvatarPicker(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-2.5">
              {AVATAR_PRESETS.map((p) => (
                <button
                  key={p.url}
                  onClick={() => {
                    setAvatar(p.url);
                    setShowAvatarPicker(false);
                  }}
                  className={`relative p-1 rounded-2xl border transition text-center flex flex-col items-center gap-1 ${
                    avatar === p.url
                      ? "border-orange-500 bg-orange-50 ring-2 ring-orange-500"
                      : "border-stone-200 hover:bg-stone-50"
                  }`}
                >
                  <img
                    src={p.url}
                    alt={p.label}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full object-cover"
                  />
                  <span className="text-[10px] font-semibold text-stone-700 truncate w-full">
                    {p.label}
                  </span>
                </button>
              ))}
            </div>

            {/* Device File Upload & Custom URL Input */}
            <div className="space-y-2 pt-2 border-t border-stone-100">
              <label className="flex items-center justify-center gap-1.5 px-3 py-2 bg-stone-100 hover:bg-orange-50 border border-dashed border-stone-300 hover:border-orange-400 rounded-xl cursor-pointer text-stone-700 hover:text-orange-700 transition">
                <span className="font-semibold text-xs">
                  📷 Tải ảnh cá nhân từ thiết bị
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const previewUrl = URL.createObjectURL(file);
                    setAvatar(previewUrl);
                    setShowAvatarPicker(false);
                    try {
                      const { api } = await import("../../services/api");
                      const url = await api.uploadFile(file);
                      setAvatar(url);
                    } catch (err) {
                      console.error("Lỗi upload avatar cá nhân:", err);
                    }
                  }}
                />
              </label>

              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={customAvatarUrl}
                  onChange={(e) => setCustomAvatarUrl(e.target.value)}
                  placeholder="Dán link ảnh https://..."
                  className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customAvatarUrl.trim()) {
                      setAvatar(customAvatarUrl.trim());
                      setShowAvatarPicker(false);
                    }
                  }}
                  className="px-3 py-1.5 bg-orange-600 text-white font-bold rounded-xl text-xs"
                >
                  Dùng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL: ĐỔI MẬT KHẨU ================= */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Đổi mật khẩu</h3>
              <button
                onClick={() => setShowPasswordModal(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {passwordMsg && (
              <div className="p-2 bg-emerald-50 text-emerald-700 text-xs rounded-xl flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{passwordMsg}</span>
              </div>
            )}

            <div className="space-y-2">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Mật khẩu hiện tại
                </label>
                <input
                  type="password"
                  value={oldPassword}
                  onChange={(e) => setOldPassword(e.target.value)}
                  placeholder="••••••"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Mật khẩu mới
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Ít nhất 6 ký tự"
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!newPassword.trim()) return;
                  setPasswordMsg("Đã cập nhật mật khẩu thành công!");
                  setTimeout(() => {
                    setShowPasswordModal(false);
                    setPasswordMsg("");
                    setOldPassword("");
                    setNewPassword("");
                  }, 1000);
                }}
                className="w-full mt-2 py-2.5 bg-orange-600 text-white font-bold rounded-xl text-xs hover:bg-orange-700 transition"
              >
                Lưu mật khẩu mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
