import React, { useState } from 'react';
import { SharedTaskList, FamilyMember } from '../../types';
import {
  CheckCircle2,
  Circle,
  Plus,
  ShoppingCart,
  Calendar,
  Sparkles,
  User,
  Tag,
  Trash2,
} from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';

interface TasksScreenProps {
  taskLists: SharedTaskList[];
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  onToggleItem: (listId: string, itemId: string) => void;
  onAddItem: (listId: string, title: string, quantity?: string, assigneeId?: string) => void;
  onCreateList: (title: string, category: SharedTaskList['category']) => void;
}

export const TasksScreen: React.FC<TasksScreenProps> = ({
  taskLists,
  currentMember,
  allMembers,
  onToggleItem,
  onAddItem,
  onCreateList,
}) => {
  const [selectedListId, setSelectedListId] = useState<string>(taskLists[0]?.id || '');
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemQty, setNewItemQty] = useState('');
  const [newItemAssignee, setNewItemAssignee] = useState('');
  const [showCreateListSheet, setShowCreateListSheet] = useState(false);
  const [newListTitle, setNewListTitle] = useState('');
  const [newListCategory, setNewListCategory] = useState<SharedTaskList['category']>('general');

  const currentList = taskLists.find((l) => l.id === selectedListId) || taskLists[0];

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemTitle.trim() || !currentList) return;
    onAddItem(currentList.id, newItemTitle.trim(), newItemQty.trim() || undefined, newItemAssignee || undefined);
    setNewItemTitle('');
    setNewItemQty('');
    setNewItemAssignee('');
  };

  const handleCreateList = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newListTitle.trim()) return;
    onCreateList(newListTitle.trim(), newListCategory);
    setNewListTitle('');
    setShowCreateListSheet(false);
  };

  const getAssignee = (id?: string) => allMembers.find((m) => m.id === id);

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      {/* 1. Header & Categories Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-stone-900">Việc chung & Mua sắm</h2>
          <p className="text-[11px] text-stone-500">Mọi người cùng cập nhật và phân công dễ dàng</p>
        </div>
        <button
          onClick={() => setShowCreateListSheet(true)}
          className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo danh sách</span>
        </button>
      </div>

      {/* List Selector Pills */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
        {taskLists.map((list) => {
          const isSelected = list.id === currentList?.id;
          const completedCount = list.items.filter((i) => i.completed).length;
          return (
            <button
              key={list.id}
              onClick={() => setSelectedListId(list.id)}
              className={`px-3 py-2 rounded-2xl text-xs font-bold shrink-0 transition flex items-center gap-2 border ${
                isSelected
                  ? 'bg-orange-600 text-white border-orange-600 shadow-xs'
                  : 'bg-white text-stone-700 hover:bg-stone-50 border-stone-200/80'
              }`}
            >
              <span>{list.title}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-orange-700 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {completedCount}/{list.items.length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Current List Content */}
      {currentList && (
        <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-100">
            <div>
              <h3 className="text-sm font-bold text-stone-900">{currentList.title}</h3>
              <p className="text-[11px] text-stone-500">
                {currentList.items.filter((i) => !i.completed).length} mục chưa hoàn tất
              </p>
            </div>
            <span className="text-[10px] uppercase font-bold text-stone-500 bg-stone-100 px-2 py-0.5 rounded-md">
              {currentList.category}
            </span>
          </div>

          {/* Add Item Form */}
          <form onSubmit={handleAddItem} className="flex flex-col gap-2 pt-1">
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={newItemTitle}
                onChange={(e) => setNewItemTitle(e.target.value)}
                placeholder="Thêm món đồ cần mua hoặc việc cần làm..."
                className="flex-1 text-xs bg-stone-50 border border-stone-200 rounded-xl px-3 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-500"
              />
              <input
                type="text"
                value={newItemQty}
                onChange={(e) => setNewItemQty(e.target.value)}
                placeholder="SL: 2 bó"
                className="w-20 text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-2 text-stone-900 placeholder:text-stone-400 focus:border-orange-500"
              />
            </div>

            <div className="flex items-center justify-between gap-2">
              <select
                value={newItemAssignee}
                onChange={(e) => setNewItemAssignee(e.target.value)}
                className="text-xs bg-stone-50 border border-stone-200 rounded-xl px-2.5 py-1.5 text-stone-700 flex-1"
              >
                <option value="">Ai nhận việc? (Tất cả)</option>
                {allMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.relationship} ({m.name})
                  </option>
                ))}
              </select>

              <button
                type="submit"
                className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl shadow-xs transition active:scale-95"
              >
                Thêm
              </button>
            </div>
          </form>

          {/* Items List */}
          <div className="space-y-2 pt-1">
            {currentList.items.map((item) => {
              const assignee = getAssignee(item.assigneeId);
              return (
                <div
                  key={item.id}
                  onClick={() => onToggleItem(currentList.id, item.id)}
                  className={`p-3 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-2 ${
                    item.completed
                      ? 'bg-stone-50/60 border-stone-200/50 opacity-70'
                      : 'bg-white hover:bg-orange-50/30 border-stone-200/80 shadow-2xs'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <button className="mt-0.5 shrink-0" aria-label="Toggle task">
                      {item.completed ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <Circle className="w-5 h-5 text-stone-300 hover:text-stone-500" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <span
                        className={`text-xs ${
                          item.completed
                            ? 'line-through text-stone-400'
                            : 'font-semibold text-stone-800'
                        }`}
                      >
                        {item.title}
                      </span>

                      {/* Realtime completion badge */}
                      {item.completed && item.completedBy && (
                        <p className="text-[10px] text-emerald-700 font-medium mt-0.5">
                          ✓ {item.completedBy} đã xong ({item.completedAt || 'Vừa xong'})
                        </p>
                      )}

                      {/* Assignee pill */}
                      {!item.completed && assignee && (
                        <p className="text-[10px] text-stone-500 font-medium mt-0.5 flex items-center gap-1">
                          <User className="w-2.5 h-2.5" /> Giao cho: {assignee.name}
                        </p>
                      )}
                    </div>
                  </div>

                  {item.quantity && (
                    <span className="text-[11px] font-bold text-stone-600 bg-stone-100 px-2 py-0.5 rounded-md shrink-0">
                      {item.quantity}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create List BottomSheet */}
      <BottomSheet
        isOpen={showCreateListSheet}
        onClose={() => setShowCreateListSheet(false)}
        title="Tạo danh sách việc hoặc mua sắm mới"
      >
        <form onSubmit={handleCreateList} className="space-y-3.5 text-xs">
          <div>
            <label className="font-bold text-stone-800 block mb-1">Tên danh sách việc *</label>
            <input
              type="text"
              required
              value={newListTitle}
              onChange={(e) => setNewListTitle(e.target.value)}
              placeholder="VD: Dọn dẹp nhà cửa đón Tết, Sửa vòi nước & điện..."
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:border-orange-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Mục đích / Ngữ cảnh công việc</label>
            <select
              value={newListCategory}
              onChange={(e) =>
                setNewListCategory(e.target.value as SharedTaskList['category'])
              }
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-800 font-medium"
            >
              <option value="việc_nhà">🧹 Làm việc nhà & Dọn dẹp</option>
              <option value="sửa_chữa">🔧 Sửa chữa đồ đạc & Thiết bị</option>
              <option value="mua_sắm">🛒 Đi chợ & Mua sắm thực phẩm</option>
              <option value="cúng_lễ">🕯️ Cúng lễ, Giỗ chạp & Lễ Tết</option>
              <option value="chăm_sóc">💊 Chăm sóc người thân & Sức khỏe</option>
              <option value="sinh_hoạt">📋 Sinh hoạt gia đình chung</option>
              <option value="khác">📝 Công việc khác</option>
            </select>
          </div>

          {/* Quick Category Templates */}
          <div className="space-y-1.5 pt-1">
            <span className="text-[11px] font-bold text-stone-500 block">Gợi ý mẫu nhanh:</span>
            <div className="flex flex-wrap gap-1.5">
              {[
                { title: 'Dọn dẹp tổng vệ sinh cuối tuần', cat: 'việc_nhà' },
                { title: 'Sửa chữa điện nước & thiết bị', cat: 'sửa_chữa' },
                { title: 'Đi chợ siêu thị mua đồ ăn tuần', cat: 'mua_sắm' },
                { title: 'Chuẩn bị mâm cơm cúng Giỗ', cat: 'cúng_lễ' },
                { title: 'Mua đồ dùng học tập cho con', cat: 'sinh_hoạt' },
              ].map((tpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setNewListTitle(tpl.title);
                    setNewListCategory(tpl.cat);
                  }}
                  className="px-2.5 py-1 bg-stone-100 hover:bg-orange-50 hover:text-orange-700 text-stone-600 rounded-lg text-[10px] font-medium transition"
                >
                  + {tpl.title}
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition active:scale-95 flex items-center justify-center gap-1.5 pt-2"
          >
            <Plus className="w-4 h-4" />
            <span>Tạo danh sách công việc</span>
          </button>
        </form>
      </BottomSheet>
    </div>
  );
};
