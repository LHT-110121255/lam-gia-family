import React, { useState } from 'react';
import { FamilyWallet, FinanceTransaction, SplitBill, FamilyMember } from '../../types';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Receipt,
  Users,
  CheckCircle,
  Clock,
  Tag,
  ArrowUpRight,
  ArrowDownLeft,
} from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';
import { familyService } from '../../services/familyService';

interface FinanceScreenProps {
  wallet: FamilyWallet;
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  onAddTransaction: (tx: Omit<FinanceTransaction, 'id' | 'date'>) => void;
  onToggleSplitPaid: (billId: string, memberId: string) => void;
}

export const FinanceScreen: React.FC<FinanceScreenProps> = ({
  wallet,
  currentMember,
  allMembers,
  onAddTransaction,
  onToggleSplitPaid,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'splits'>('overview');
  const [showAddTxSheet, setShowAddTxSheet] = useState(false);

  // Dynamic Custom Categories List from Service
  const [categories, setCategories] = useState<string[]>(() =>
    familyService.getCustomFinanceCategories()
  );
  const [isAddingNewCat, setIsAddingNewCat] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');

  // New Transaction Form State
  const [txType, setTxType] = useState<'in' | 'out'>('out');
  const [txAmount, setTxAmount] = useState('');
  const [txCategory, setTxCategory] = useState<string>(categories[0] || 'Ăn uống & Chợ búa');
  const [txDesc, setTxDesc] = useState('');
  const [txPayer, setTxPayer] = useState(currentMember.id);

  const handleCreateCustomCategory = () => {
    if (!newCatInput.trim()) return;
    const updated = familyService.addCustomFinanceCategory(newCatInput.trim());
    setCategories(updated);
    setTxCategory(newCatInput.trim());
    setNewCatInput('');
    setIsAddingNewCat(false);
  };

  const formatVND = (num: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
  };

  const handleAddTxSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseInt(txAmount.replace(/\D/g, ''), 10);
    if (!amountNum || !txDesc.trim()) return;

    onAddTransaction({
      title: txDesc.trim(),
      amount: amountNum,
      type: txType,
      category: txCategory,
      payerMemberId: txPayer,
      description: txDesc.trim(),
    });

    setShowAddTxSheet(false);
    setTxAmount('');
    setTxDesc('');
    setIsAddingNewCat(false);
  };

  const getMember = (id: string) => allMembers.find((m) => m.id === id);

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      {/* 1. Wallet Balance Hero Card */}
      <div className="bg-linear-to-br from-stone-900 to-stone-800 text-white rounded-3xl p-5 shadow-lg space-y-4 relative overflow-hidden">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-stone-400 flex items-center gap-1.5">
            <Wallet className="w-4 h-4 text-amber-400" />
            Quỹ chung gia đình ({wallet.currency})
          </span>
          <span className="text-[11px] bg-stone-700/60 text-stone-300 px-2.5 py-0.5 rounded-full">
            Minh bạch 100%
          </span>
        </div>

        <div>
          <h2 className="text-2xl font-black tracking-tight text-white font-mono">
            {formatVND(wallet.balance)}
          </h2>
          <p className="text-[11px] text-stone-400 mt-0.5">Số dư khả dụng hiện tại</p>
        </div>

        {/* Monthly Summary */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-stone-700/60">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowDownLeft className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-stone-400 block">Tổng quỹ nhận</span>
              <span className="text-xs font-bold text-emerald-400 font-mono truncate block">
                +{formatVND(wallet.totalIn)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
              <ArrowUpRight className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] text-stone-400 block">Đã chi tiêu</span>
              <span className="text-xs font-bold text-rose-400 font-mono truncate block">
                -{formatVND(wallet.totalOut)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Actions & Sub-tabs */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1 p-1 bg-stone-100 rounded-2xl flex-1">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'overview'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Sổ thu chi
          </button>
          <button
            onClick={() => setActiveTab('splits')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              activeTab === 'splits'
                ? 'bg-white text-orange-600 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Chia tiền ({wallet.splitBills.length})
          </button>
        </div>

        <button
          onClick={() => setShowAddTxSheet(true)}
          className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-2 rounded-xl shadow-xs transition active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Ghi sổ</span>
        </button>
      </div>

      {/* --- TAB 1: TRANSACTIONS LOG --- */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
          <h3 className="text-sm font-bold text-stone-900">Lịch sử thu chi gia đình</h3>

          <div className="divide-y divide-stone-100">
            {wallet.transactions.map((tx) => {
              const payer = getMember(tx.payerMemberId);
              const isIncome = tx.type === 'in';

              return (
                <div key={tx.id} className="py-3 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                      }`}
                    >
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-stone-900 truncate">{tx.title}</h4>
                      <p className="text-[11px] text-stone-500 truncate">
                        {tx.category} • {payer?.name}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-mono font-bold block ${
                        isIncome ? 'text-emerald-600' : 'text-stone-900'
                      }`}
                    >
                      {isIncome ? '+' : '-'}
                      {formatVND(tx.amount)}
                    </span>
                    <span className="text-[10px] text-stone-400">
                      {tx.date.split('-').slice(1).reverse().join('/')}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* --- TAB 2: BILL SPLITTING --- */}
      {activeTab === 'splits' && (
        <div className="space-y-3">
          {wallet.splitBills.map((bill) => {
            const creator = getMember(bill.createdBy);
            const paidCount = bill.splits.filter((s) => s.paid).length;

            return (
              <div
                key={bill.id}
                className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between gap-2 pb-2 border-b border-stone-100">
                  <div>
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md inline-block mb-1">
                      Chia tiền sự kiện
                    </span>
                    <h4 className="text-sm font-bold text-stone-900">{bill.title}</h4>
                    <p className="text-[11px] text-stone-500">
                      Tổng bill: <strong>{formatVND(bill.totalAmount)}</strong> • Người chi:{' '}
                      {creator?.name}
                    </p>
                  </div>
                  <span className="text-xs font-bold text-stone-600 bg-stone-100 px-2.5 py-1 rounded-xl shrink-0">
                    {paidCount}/{bill.splits.length} đã nộp
                  </span>
                </div>

                <div className="space-y-2 text-xs">
                  {bill.splits.map((s) => {
                    const member = getMember(s.memberId);
                    return (
                      <div
                        key={s.memberId}
                        onClick={() => onToggleSplitPaid(bill.id, s.memberId)}
                        className={`p-2.5 rounded-2xl border flex items-center justify-between cursor-pointer transition ${
                          s.paid
                            ? 'bg-emerald-50/50 border-emerald-200 text-stone-800'
                            : 'bg-stone-50 border-stone-200 text-stone-700 hover:bg-orange-50/40'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle
                            className={`w-4 h-4 ${
                              s.paid ? 'text-emerald-600 fill-emerald-100' : 'text-stone-300'
                            }`}
                          />
                          <span className="font-semibold">{member?.name}</span>
                          <span className="text-[10px] text-stone-500">({member?.relationship})</span>
                        </div>

                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold">{formatVND(s.amount)}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              s.paid
                                ? 'bg-emerald-200 text-emerald-900'
                                : 'bg-amber-100 text-amber-900'
                            }`}
                          >
                            {s.paid ? 'Đã nộp' : 'Chưa nộp'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Transaction BottomSheet */}
      <BottomSheet
        isOpen={showAddTxSheet}
        onClose={() => setShowAddTxSheet(false)}
        title="Ghi chép thu chi quỹ gia đình"
      >
        <form onSubmit={handleAddTxSubmit} className="space-y-3.5 text-xs">
          {/* Type switcher */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTxType('out')}
              className={`flex-1 py-2 rounded-xl font-bold transition ${
                txType === 'out'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              Chi tiền (Khoản chi)
            </button>
            <button
              type="button"
              onClick={() => setTxType('in')}
              className={`flex-1 py-2 rounded-xl font-bold transition ${
                txType === 'in'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600'
              }`}
            >
              Thu tiền (Góp quỹ)
            </button>
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Số tiền (VNĐ) *</label>
            <input
              type="number"
              required
              value={txAmount}
              onChange={(e) => setTxAmount(e.target.value)}
              placeholder="VD: 500000"
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl font-mono text-sm font-bold text-stone-900 focus:border-orange-500"
            />
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Mục đích / Nội dung chi *</label>
            <input
              type="text"
              required
              value={txDesc}
              onChange={(e) => setTxDesc(e.target.value)}
              placeholder="VD: Tiền chợ cuối tuần, Tiền điện tháng 9..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:border-orange-500 text-xs"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-stone-800 block text-xs">Danh mục thu/chi</label>
              <button
                type="button"
                onClick={() => setIsAddingNewCat(!isAddingNewCat)}
                className="text-[11px] font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                <span>{isAddingNewCat ? 'Chọn có sẵn' : 'Thêm danh mục mới'}</span>
              </button>
            </div>

            {isAddingNewCat ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newCatInput}
                  onChange={(e) => setNewCatInput(e.target.value)}
                  placeholder="Nhập tên danh mục mới (VD: Tiền hiếu hỉ, Bảo dưỡng xe...)"
                  className="flex-1 p-2 bg-white border border-orange-300 rounded-xl text-stone-900 text-xs focus:ring-2 focus:ring-orange-500/20"
                />
                <button
                  type="button"
                  onClick={handleCreateCustomCategory}
                  className="px-3 py-2 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl text-xs transition"
                >
                  Lưu
                </button>
              </div>
            ) : (
              <select
                value={txCategory}
                onChange={(e) => setTxCategory(e.target.value)}
                className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs font-medium"
              >
                {categories.map((cat, idx) => (
                  <option key={idx} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Người thực hiện</label>
            <select
              value={txPayer}
              onChange={(e) => setTxPayer(e.target.value)}
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 text-xs"
            >
              {allMembers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.relationship} ({m.name})
                </option>
              ))}
            </select>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition active:scale-95"
          >
            Lưu vào sổ quỹ
          </button>
        </form>
      </BottomSheet>
    </div>
  );
};
