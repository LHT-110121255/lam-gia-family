import React, { useState } from 'react';
import { FamilyPoll, FamilyMember } from '../../types';
import { Vote, Plus, CheckCircle, Users, Clock } from 'lucide-react';
import { BottomSheet } from '../common/BottomSheet';

interface PollsScreenProps {
  polls: FamilyPoll[];
  currentMember: FamilyMember;
  allMembers: FamilyMember[];
  onVote: (pollId: string, optionId: string) => void;
  onCreatePoll: (question: string, options: string[]) => void;
}

export const PollsScreen: React.FC<PollsScreenProps> = ({
  polls,
  currentMember,
  allMembers,
  onVote,
  onCreatePoll,
}) => {
  const [showCreateSheet, setShowCreateSheet] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [opt1, setOpt1] = useState('');
  const [opt2, setOpt2] = useState('');
  const [opt3, setOpt3] = useState('');

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !opt1.trim() || !opt2.trim()) return;
    onCreatePoll(newQuestion.trim(), [opt1.trim(), opt2.trim(), opt3.trim()].filter(Boolean));
    setShowCreateSheet(false);
    setNewQuestion('');
    setOpt1('');
    setOpt2('');
    setOpt3('');
  };

  const getMember = (id: string) => allMembers.find((m) => m.id === id);

  return (
    <div className="space-y-4 pb-20 w-full max-w-full px-4 pt-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-stone-900">Bình chọn gia đình</h2>
          <p className="text-[11px] text-stone-500">Hỏi ý kiến cả nhà một cách dân chủ, vui vẻ</p>
        </div>
        <button
          onClick={() => setShowCreateSheet(true)}
          className="flex items-center gap-1 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow-xs transition active:scale-95"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tạo bình chọn</span>
        </button>
      </div>

      {/* Polls List */}
      <div className="space-y-4">
        {polls.map((poll) => {
          const totalVotes = poll.options.reduce((sum, opt) => sum + opt.voterIds.length, 0);
          const creator = getMember(poll.createdById);

          return (
            <div
              key={poll.id}
              className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md inline-block mb-1">
                    Hỏi ý kiến cả nhà
                  </span>
                  <h3 className="text-sm font-bold text-stone-900">{poll.question}</h3>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-stone-700">{totalVotes} phiếu</span>
                  <p className="text-[10px] text-stone-400">
                    Bởi {creator?.name.split(' ').slice(-1)[0] || 'Gia đình'}
                  </p>
                </div>
              </div>

              {/* Options */}
              <div className="space-y-2 pt-1">
                {poll.options.map((opt) => {
                  const hasVoted = opt.voterIds.includes(currentMember.id);
                  const percentage = totalVotes > 0 ? Math.round((opt.voterIds.length / totalVotes) * 100) : 0;

                  return (
                    <button
                      key={opt.id}
                      onClick={() => onVote(poll.id, opt.id)}
                      className={`w-full p-3 rounded-2xl border text-left transition relative overflow-hidden active:scale-99 ${
                        hasVoted
                          ? 'border-orange-500 bg-orange-50/50'
                          : 'border-stone-200 hover:border-stone-300 bg-stone-50/50'
                      }`}
                    >
                      {/* Animated Progress bar background */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 transition-all duration-500 ${
                          hasVoted ? 'bg-orange-200/50' : 'bg-stone-200/50'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />

                      <div className="relative z-10 flex items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                              hasVoted
                                ? 'bg-orange-600 border-orange-600 text-white'
                                : 'border-stone-400 bg-white'
                            }`}
                          >
                            {hasVoted && <span className="w-1.5 h-1.5 bg-white rounded-full" />}
                          </span>
                          <span className="font-semibold text-stone-900 truncate">
                            {opt.text}
                          </span>
                        </div>
                        <span className="font-bold text-stone-700 shrink-0">
                          {percentage}% ({opt.voterIds.length})
                        </span>
                      </div>

                      {/* Voters avatars or names preview */}
                      {opt.voterIds.length > 0 && (
                        <div className="relative z-10 flex items-center gap-1 mt-1.5 pl-6 text-[10px] text-stone-500">
                          <span>Đã chọn:</span>
                          <span className="font-medium text-stone-700">
                            {opt.voterIds
                              .map((id) => getMember(id)?.name.split(' ').slice(-1)[0])
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Poll Sheet */}
      <BottomSheet
        isOpen={showCreateSheet}
        onClose={() => setShowCreateSheet(false)}
        title="Tạo cuộc bình chọn mới"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-3 text-xs">
          <div>
            <label className="font-bold text-stone-800 block mb-1">Câu hỏi bình chọn *</label>
            <input
              type="text"
              required
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="VD: Cuối tuần này cả nhà ăn món gì?"
              className="w-full p-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:border-orange-500 text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Lựa chọn 1 *</label>
            <input
              type="text"
              required
              value={opt1}
              onChange={(e) => setOpt1(e.target.value)}
              placeholder="VD: Lẩu riêu cua bắp bò"
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Lựa chọn 2 *</label>
            <input
              type="text"
              required
              value={opt2}
              onChange={(e) => setOpt2(e.target.value)}
              placeholder="VD: Cơm sườn nướng mật ong tại nhà"
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-xs"
            />
          </div>

          <div>
            <label className="font-bold text-stone-800 block mb-1">Lựa chọn 3 (tuỳ chọn)</label>
            <input
              type="text"
              value={opt3}
              onChange={(e) => setOpt3(e.target.value)}
              placeholder="VD: Đi ăn buffet Sen Tây Hồ"
              className="w-full p-2 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-xs"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-xl shadow-xs transition"
          >
            Đăng cuộc bình chọn
          </button>
        </form>
      </BottomSheet>
    </div>
  );
};
