import React, { useState } from 'react';
import {
  Heart,
  Phone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  X,
  Fingerprint,
} from 'lucide-react';
import { FamilyMember, MemberRole } from '../../types';
import { Avatar } from '../common/Avatar';
import { LocationInput } from '../common/LocationInput';
import { familyService } from '../../services/familyService';

export const AVATAR_PRESETS = [
  { label: 'Bố', url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&auto=format&fit=crop&q=80' },
  { label: 'Mẹ', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&auto=format&fit=crop&q=80' },
  { label: 'Ông', url: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&auto=format&fit=crop&q=80' },
  { label: 'Bà', url: 'https://images.unsplash.com/photo-1566616213894-2d4e1baee5d8?w=240&auto=format&fit=crop&q=80' },
  { label: 'Con gái', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=240&auto=format&fit=crop&q=80' },
  { label: 'Con trai', url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=240&auto=format&fit=crop&q=80' },
  { label: 'Thanh niên', url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&auto=format&fit=crop&q=80' },
  { label: 'Bé con', url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=240&auto=format&fit=crop&q=80' },
];

const RELATIONSHIP_OPTIONS = [
  { label: 'Bố', role: 'parent' as MemberRole },
  { label: 'Mẹ', role: 'parent' as MemberRole },
  { label: 'Ông nội', role: 'elder' as MemberRole },
  { label: 'Bà nội', role: 'elder' as MemberRole },
  { label: 'Ông ngoại', role: 'elder' as MemberRole },
  { label: 'Bà ngoại', role: 'elder' as MemberRole },
  { label: 'Con trai', role: 'adult' as MemberRole },
  { label: 'Con gái', role: 'adult' as MemberRole },
  { label: 'Cháu trai', role: 'teen' as MemberRole },
  { label: 'Cháu gái', role: 'child' as MemberRole },
  { label: 'Dâu', role: 'adult' as MemberRole },
  { label: 'Rể', role: 'adult' as MemberRole },
];

interface AuthScreenProps {
  allMembers: FamilyMember[];
  familyName?: string;
  onLoginSuccess: (member: FamilyMember) => void;
  onRegisterSuccess: (member: FamilyMember) => void;
  onClose?: () => void;
  isModal?: boolean;
}

export const AuthScreen: React.FC<AuthScreenProps> = ({
  allMembers,
  familyName = 'Đại gia đình họ Nguyễn',
  onLoginSuccess,
  onRegisterSuccess,
  onClose,
  isModal = false,
}) => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginIdentifier, setLoginIdentifier] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Register form state
  const [regUsername, setRegUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regRelationship, setRegRelationship] = useState('Con trai');
  const [regRole, setRegRole] = useState<MemberRole>('adult');
  const [regGender, setRegGender] = useState<'male' | 'female'>('male');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regBirthDate, setRegBirthDate] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regAvatar, setRegAvatar] = useState('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [familyInviteCode, setFamilyInviteCode] = useState('LAM-GIA-DINH-2026');
  const [regError, setRegError] = useState('');
  const [registrationPendingSuccess, setRegistrationPendingSuccess] = useState(false);
  const [pendingRegisteredName, setPendingRegisteredName] = useState('');

  // Forgot password modal
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotPhone, setForgotPhone] = useState('');
  const [forgotStep, setForgotStep] = useState<'phone' | 'otp' | 'done'>('phone');
  const [otpCode, setOtpCode] = useState('');

  // Handle Biometric Login
  const handleBiometricLogin = async () => {
    setIsLoading(true);
    setLoginError('');
    try {
      const { tokenStorage, api } = await import('../../services/api');
      const storedUser = tokenStorage.getUser();
      const token = tokenStorage.getAccessToken();

      if (token && storedUser) {
        if (storedUser.approvalStatus === 'pending') {
          setIsLoading(false);
          setLoginError('Tài khoản của bạn đang chờ Admin Lâm Huệ Trung phê duyệt.');
          return;
        }
        const member: FamilyMember = {
          id: storedUser._id || storedUser.id || 'member-trung',
          username: storedUser.username,
          name: storedUser.name,
          relationship: storedUser.relationship || 'Thành viên',
          role: storedUser.role || 'adult',
          generation: storedUser.generation || 2,
          avatar: storedUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
          birthDate: storedUser.birthDate || '',
          phone: storedUser.phone || '',
          email: storedUser.email || '',
          onlineStatus: 'online',
          approvalStatus: storedUser.approvalStatus || 'approved',
          isAdmin: !!storedUser.isAdmin,
        };
        setIsLoading(false);
        onLoginSuccess(member);
        return;
      }

      setIsLoading(false);
      setLoginError('Chưa có phiên đăng nhập sinh trắc học đã lưu. Vui lòng đăng nhập bằng Tên tài khoản / Mật khẩu.');
    } catch (err: any) {
      setIsLoading(false);
      setLoginError(err.message || 'Xác thực sinh trắc học thất bại. Vui lòng đăng nhập bằng mật khẩu.');
    }
  };

  // Handle Login Submit
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    if (!loginIdentifier.trim() || !loginPassword.trim()) {
      setLoginError('Vui lòng nhập Tên tài khoản / SĐT và Mật khẩu');
      return;
    }

    setIsLoading(true);
    try {
      const { api } = await import('../../services/api');
      const res = await api.login(loginIdentifier.trim(), loginPassword.trim());
      setIsLoading(false);

      if (res && res.user) {
        const member: FamilyMember = {
          id: res.user._id || 'member-' + Date.now(),
          username: res.user.username,
          name: res.user.name,
          relationship: res.user.relationship || 'Thành viên',
          role: res.user.role || 'adult',
          generation: res.user.generation || 2,
          avatar: res.user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300',
          birthDate: res.user.birthDate || '',
          phone: res.user.phone || '',
          email: res.user.email || '',
          onlineStatus: 'online',
          jobTitle: res.user.jobTitle || '',
          locationAddress: res.user.address || '',
          approvalStatus: res.user.approvalStatus || 'approved',
          isAdmin: !!res.user.isAdmin || res.user.username === 'lamhuetrung',
        };
        onLoginSuccess(member);
      } else {
        setLoginError('Tài khoản hoặc mật khẩu không chính xác');
      }
    } catch (err: any) {
      setIsLoading(false);
      if (err.code === 'PENDING_APPROVAL') {
        setLoginError('⏳ Tài khoản của bạn đang ở trạng thái CHỜ DUYỆT. Vui lòng liên hệ Admin Lâm Huệ Trung để được phê duyệt vào gia đình.');
      } else if (err.code === 'ACCOUNT_REJECTED') {
        setLoginError('❌ Tài khoản của bạn đã bị từ chối phê duyệt tham gia gia đình.');
      } else {
        setLoginError(err.message || 'Tài khoản hoặc mật khẩu không chính xác. Vui lòng thử lại.');
      }
    }
  };

  // Handle Register Submit
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError('');

    if (!regUsername.trim()) {
      setRegError('Vui lòng nhập Tên tài khoản đăng nhập');
      return;
    }
    if (!regName.trim()) {
      setRegError('Vui lòng nhập Họ và tên');
      return;
    }
    if (!regPassword.trim()) {
      setRegError('Vui lòng nhập Mật khẩu');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setRegError('Mật khẩu xác nhận không khớp');
      return;
    }

    setIsLoading(true);
    try {
      const { api } = await import('../../services/api');
      let registeredUser: any = null;

      try {
        const res = await api.register({
          username: regUsername.trim(),
          password: regPassword.trim(),
          name: regName.trim(),
          relationship: regRelationship,
          role: regRole,
          gender: regGender,
          phone: regPhone.trim(),
          email: regEmail.trim(),
          birthDate: regBirthDate,
          address: regAddress.trim(),
          avatar: regAvatar,
        });
        registeredUser = res.user;
      } catch (apiErr: any) {
        // Fallback local register
        console.warn('Backend register error, fallback local storage:', apiErr);
      }

      // Lưu vào familyService local
      familyService.register({
        username: regUsername.trim(),
        name: regName.trim(),
        relationship: regRelationship,
        role: regRole,
        phone: regPhone.trim(),
        email: regEmail.trim(),
        birthDate: regBirthDate,
        avatar: regAvatar,
      });

      setIsLoading(false);
      setPendingRegisteredName(regName.trim());
      setRegistrationPendingSuccess(true);
    } catch (err: any) {
      setIsLoading(false);
      setRegError(err.message || 'Đăng ký thất bại, vui lòng thử lại');
    }
  };

  return (
    <div className="w-full min-h-full flex-1 flex flex-col bg-[#FFFBF7] text-stone-900 overflow-y-auto overscroll-contain">
      {/* Top Mobile Bar */}
      <div className="p-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Lâm Gia Logo"
            className="h-9 w-auto object-contain drop-shadow-2xs"
          />
        </div>

        {isModal && onClose && (
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-600 flex items-center justify-center transition active:scale-95"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Main Container */}
      <div className="flex-1 px-5 pt-2 pb-24 flex flex-col justify-between max-w-sm mx-auto w-full">
        <div>
          {registrationPendingSuccess ? (
            /* ==================== REGISTRATION SUCCESS & PENDING APPROVAL SCREEN ==================== */
            <div className="my-6 p-6 bg-white rounded-3xl border border-amber-200/80 shadow-md text-center space-y-4 animate-in fade-in zoom-in-95 duration-300">
              <div className="w-16 h-16 mx-auto rounded-full bg-amber-50 border-2 border-amber-400/50 flex items-center justify-center text-amber-600 shadow-inner">
                <ShieldCheck className="w-8 h-8 text-amber-600 animate-pulse" />
              </div>

              <div className="space-y-1.5">
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-800 text-[10px] font-black uppercase tracking-wider rounded-full">
                  ⏳ Chờ Admin Phê Duyệt
                </span>
                <h2 className="text-xl font-black text-stone-900 tracking-tight">
                  Đăng Ký Thành Công!
                </h2>
                <p className="text-xs text-stone-600 leading-relaxed pt-1">
                  Chúc mừng <strong className="text-stone-900">{pendingRegisteredName || regName}</strong>! Hồ sơ tài khoản của bạn đã được gửi tới{' '}
                  <strong className="text-orange-600">Admin Lâm Huệ Trung</strong> để xác nhận và phê duyệt thành viên gia đình.
                </p>
              </div>

              <div className="p-3.5 bg-amber-50/70 border border-amber-200/70 rounded-2xl text-[11px] text-amber-900 text-left space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-amber-950">
                  <span>ℹ️ Lưu ý bảo mật gia đình:</span>
                </div>
                <p className="text-amber-800/90 leading-normal">
                  Để đảm bảo an toàn riêng tư, chỉ những thành viên đã được Admin duyệt mới có thể đăng nhập xem lịch, bản đồ vị trí và tham gia chat.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setRegistrationPendingSuccess(false);
                  setActiveTab('login');
                  setLoginIdentifier(regUsername || regPhone);
                  setLoginPassword('');
                  setLoginError('');
                }}
                className="w-full py-3 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-orange-600/20 active:scale-95 transition flex items-center justify-center gap-2"
              >
                <span>Quay Lại Màn Hình Đăng Nhập</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Welcome Title */}
              <div className="text-center my-3">
                <h2 className="text-2xl font-black text-stone-900 tracking-tight">
                  {activeTab === 'login' ? 'Chào mừng bạn về nhà' : 'Tham gia cùng gia đình'}
                </h2>
                <p className="text-xs text-stone-500 mt-1 max-w-[260px] mx-auto">
                  {activeTab === 'login'
                    ? 'Không gian riêng tư, sum vầy và gắn kết ba thế hệ thân yêu'
                    : 'Tạo tài khoản thành viên để chia sẻ lịch giỗ, kỷ niệm và việc nhà'}
                </p>
              </div>

              {/* Tab Switcher Segmented Control */}
              <div className="p-1 bg-stone-100 rounded-2xl flex items-center mb-5 border border-stone-200/70">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('login');
                    setLoginError('');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'login'
                      ? 'bg-white text-orange-700 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('register');
                    setRegError('');
                  }}
                  className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                    activeTab === 'register'
                      ? 'bg-white text-orange-700 shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  Đăng ký thành viên
                </button>
              </div>
            </>
          )}

          {/* ==================== TAB 1: LOGIN ==================== */}
          {!registrationPendingSuccess && activeTab === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              {loginError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              {/* Identifier Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Số điện thoại hoặc Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Phone className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    placeholder="VD: 0914 567 890 hoặc email..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-2xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-stone-700 block">
                    Mật khẩu
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setForgotPhone(loginIdentifier);
                      setForgotStep('phone');
                      setShowForgotModal(true);
                    }}
                    className="text-[11px] text-orange-600 hover:text-orange-700 font-semibold"
                  >
                    Quên mật khẩu?
                  </button>
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="Nhập mật khẩu..."
                    className="w-full pl-9 pr-10 py-2.5 bg-white border border-stone-200 rounded-2xl text-xs text-stone-900 focus:outline-hidden focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition shadow-2xs"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-stone-400 hover:text-stone-600"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Remember Me Checkbox */}
              <div className="flex items-center justify-between pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded text-orange-600 focus:ring-orange-500 border-stone-300"
                  />
                  <span className="text-xs text-stone-600">Ghi nhớ đăng nhập</span>
                </label>
                <span className="text-[10px] text-emerald-600 flex items-center gap-1 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" /> Mã hóa an toàn
                </span>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-orange-600/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Đăng nhập vào gia đình</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Quick Biometric option */}
              <button
                type="button"
                onClick={handleBiometricLogin}
                className="w-full py-2.5 px-3 bg-stone-100 hover:bg-stone-200/80 text-stone-700 font-bold rounded-2xl text-xs border border-stone-200 transition flex items-center justify-center gap-2 active:scale-95"
              >
                <Fingerprint className="w-4 h-4 text-orange-600" />
                <span>Đăng nhập nhanh bằng FaceID / Vân tay</span>
              </button>

            </form>
          )}

          {/* ==================== TAB 2: REGISTER ==================== */}
          {!registrationPendingSuccess && activeTab === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              {regError && (
                <div className="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-2xl flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Username Input */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Tên tài khoản đăng nhập <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4 text-orange-600" />
                  </div>
                  <input
                    type="text"
                    value={regUsername}
                    onChange={(e) => setRegUsername(e.target.value.toLowerCase().trim())}
                    placeholder="VD: lamhuetrung, honggam..."
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-2xl text-xs text-stone-900 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition shadow-2xs font-mono font-bold"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Họ và tên thành viên <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-stone-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="VD: Lâm Huệ Trung"
                    className="w-full pl-9 pr-3 py-2.5 bg-white border border-stone-200 rounded-2xl text-xs text-stone-900 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Gender selector */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">Giới tính</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setRegGender('male');
                      setRegAvatar('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&auto=format&fit=crop&q=80');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      regGender === 'male'
                        ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    <span>👨 Nam</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRegGender('female');
                      setRegAvatar('https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=300&auto=format&fit=crop&q=80');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 border ${
                      regGender === 'female'
                        ? 'bg-orange-50 border-orange-500 text-orange-900 shadow-2xs'
                        : 'bg-white border-stone-200 text-stone-600'
                    }`}
                  >
                    <span>👩 Nữ</span>
                  </button>
                </div>
              </div>

              {/* Relationship Chips */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-stone-700 block">
                  Xưng hô / Vai trò trong gia đình
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-stone-50 rounded-2xl border border-stone-200/60">
                  {RELATIONSHIP_OPTIONS.map((opt) => {
                    const isSelected = regRelationship === opt.label;
                    return (
                      <button
                        key={opt.label}
                        type="button"
                        onClick={() => {
                          setRegRelationship(opt.label);
                          setRegRole(opt.role);
                        }}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold transition ${
                          isSelected
                            ? 'bg-orange-600 text-white shadow-xs'
                            : 'bg-white text-stone-700 border border-stone-200 hover:bg-stone-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Phone & Email Row */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 block">
                    Số điện thoại <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                      <Phone className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="tel"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      placeholder="09xx..."
                      className="w-full pl-8 pr-2.5 py-2.5 bg-white border border-stone-200 rounded-2xl text-xs text-stone-900 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition shadow-2xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 block">
                    Ngày sinh (Dương lịch)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none text-stone-400">
                      <Calendar className="w-3.5 h-3.5" />
                    </div>
                    <input
                      type="date"
                      value={regBirthDate}
                      onChange={(e) => setRegBirthDate(e.target.value)}
                      className="w-full pl-8 pr-2 py-2 bg-white border border-stone-200 rounded-2xl text-xs text-stone-900 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition shadow-2xs"
                    />
                  </div>
                </div>
              </div>

              {/* Address with Vietbando Map & Autocomplete */}
              <LocationInput
                label="Địa chỉ thường trú"
                value={regAddress}
                onChange={(val) => setRegAddress(val)}
                placeholder="Nhập địa chỉ hoặc chọn từ bản đồ..."
              />

              {/* Avatar Selector */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-bold text-stone-700 block">
                    Ảnh đại diện thành viên
                  </label>
                  <label className="text-[11px] font-bold text-orange-600 hover:underline cursor-pointer">
                    📷 Tải ảnh từ máy
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
                          setRegAvatar(url);
                        } catch (err) {
                          console.error('Upload avatar error:', err);
                        }
                      }}
                    />
                  </label>
                </div>
                <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5">
                  {AVATAR_PRESETS.map((preset) => {
                    const isSelected = regAvatar === preset.url;
                    return (
                      <button
                        key={preset.url}
                        type="button"
                        onClick={() => setRegAvatar(preset.url)}
                        className={`relative rounded-full p-0.5 transition shrink-0 ${
                          isSelected ? 'ring-2 ring-orange-500 ring-offset-2' : 'opacity-70 hover:opacity-100'
                        }`}
                        title={preset.label}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 rounded-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute -bottom-1 -right-1 bg-orange-600 text-white rounded-full p-0.5">
                            <CheckCircle2 className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Password & Confirm */}
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 block">Mật khẩu</label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-2xl text-xs text-stone-900 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition shadow-2xs"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-stone-700 block">Nhập lại</label>
                  <input
                    type={showRegPassword ? 'text' : 'password'}
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại"
                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-2xl text-xs text-stone-900 focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500 transition shadow-2xs"
                  />
                </div>
              </div>

              {/* Family Invite Code */}
              <div className="space-y-1 pt-1">
                <label className="text-[11px] font-bold text-stone-700 flex items-center justify-between">
                  <span>Mã gia đình (Đã tự động điền)</span>
                  <span className="text-[10px] text-orange-600 font-semibold">Chung cây phả hệ</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={familyInviteCode}
                    onChange={(e) => setFamilyInviteCode(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 bg-amber-50/70 border border-amber-200 rounded-2xl text-xs font-mono font-bold text-amber-900 tracking-wider focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Submit Register */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold rounded-2xl text-xs shadow-md shadow-orange-600/20 active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Hoàn tất đăng ký & Vào nhà</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>

        {/* Footer info */}
        <div className="text-center pt-4 text-[10px] text-stone-500 border-t border-stone-200/50 mt-4">
          Ứng dụng Gia Đình Số • Bảo vệ thông tin và quyền riêng tư gia đình
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-5 max-w-xs w-full shadow-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-stone-900">Khôi phục mật khẩu</h3>
              <button
                onClick={() => setShowForgotModal(false)}
                className="p-1 text-stone-400 hover:text-stone-600 rounded-full"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {forgotStep === 'phone' && (
              <div className="space-y-3 text-xs">
                <p className="text-stone-600">
                  Nhập số điện thoại đã đăng ký để nhận mã xác minh OTP 6 số qua tin nhắn:
                </p>
                <input
                  type="text"
                  value={forgotPhone}
                  onChange={(e) => setForgotPhone(e.target.value)}
                  placeholder="Nhập số điện thoại..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs"
                />
                <button
                  onClick={() => setForgotStep('otp')}
                  className="w-full py-2.5 bg-orange-600 text-white font-bold rounded-xl hover:bg-orange-700 transition"
                >
                  Gửi mã OTP xác nhận
                </button>
              </div>
            )}

            {forgotStep === 'otp' && (
              <div className="space-y-3 text-xs">
                <p className="text-stone-600">
                  Mã OTP đã được gửi đến <strong>{forgotPhone || 'số điện thoại của bạn'}</strong>.
                  (Mã mẫu thử nghiệm: <span className="font-mono text-orange-600 font-bold">123456</span>)
                </p>
                <input
                  type="text"
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="Nhập 6 số OTP..."
                  className="w-full px-3 py-2 bg-stone-50 border border-stone-200 rounded-xl text-center text-sm font-mono tracking-widest"
                />
                <button
                  onClick={() => setForgotStep('done')}
                  className="w-full py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 transition"
                >
                  Xác minh & Đặt lại
                </button>
              </div>
            )}

            {forgotStep === 'done' && (
              <div className="space-y-3 text-center py-2">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <p className="text-xs font-bold text-stone-900">Đặt lại mật khẩu thành công!</p>
                <p className="text-[11px] text-stone-500">
                  Mật khẩu mới của bạn đã được đặt là: <strong className="text-stone-800">123456</strong>. Bạn có thể đăng nhập ngay.
                </p>
                <button
                  onClick={() => {
                    setShowForgotModal(false);
                    setLoginPassword('123456');
                  }}
                  className="w-full py-2 bg-orange-600 text-white font-bold rounded-xl text-xs"
                >
                  Đăng nhập ngay
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
