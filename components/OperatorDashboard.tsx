
import React, { useState, useMemo } from 'react';
import { Machine, MachineStatus, MachineType, DOWNTIME_REASONS, ShiftAssignment } from '../types';

interface OperatorDashboardProps {
  machines: Machine[];
  onUpdateStatus: (machineId: string, status: MachineStatus, reason?: string) => void;
  onResetAll: () => void;
  shifts: ShiftAssignment[];
}

const OperatorDashboard: React.FC<OperatorDashboardProps> = ({ machines, onUpdateStatus, onResetAll, shifts }) => {
  const [filterType, setFilterType] = useState<MachineType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [operatorFilter, setOperatorFilter] = useState('');
  const [selectedMachine, setSelectedMachine] = useState<Machine | null>(null);
  const [showReasonModal, setShowReasonModal] = useState(false);

  const currentShift = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const dateStr = now.toISOString().split('T')[0];
    
    let shiftName: 'Ca 1' | 'Ca 2' | 'Ca 3' = 'Ca 1';
    if (hour >= 6 && hour < 14) shiftName = 'Ca 1';
    else if (hour >= 14 && hour < 22) shiftName = 'Ca 2';
    else shiftName = 'Ca 3';

    return shifts.find(s => s.date === dateStr && s.shift === shiftName);
  }, [shifts]);

  const filteredMachines = useMemo(() => {
    return machines.filter(m => {
      const matchesType = filterType === 'ALL' || m.type === filterType;
      const matchesSearch = m.code.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesOperator = !operatorFilter || 
        (m.currentOperator && m.currentOperator.toLowerCase().includes(operatorFilter.toLowerCase()));
      return matchesType && matchesSearch && matchesOperator;
    });
  }, [machines, filterType, searchQuery, operatorFilter]);

  const handleMachineClick = (machine: Machine) => {
    setSelectedMachine(machine);
    if (machine.status === MachineStatus.RUNNING) {
      setShowReasonModal(true);
    } else {
      const isAutoConfirmed = ['Cân đối sản xuất', 'Nghỉ lễ'].includes(machine.currentDowntimeReason || '');
      if (!isAutoConfirmed && !machine.maintenanceConfirmed) {
        alert(`Máy ${machine.code} đang chờ xác nhận xử lý. Vui lòng liên hệ bộ phận liên quan.`);
        return;
      }
      onUpdateStatus(machine.id, MachineStatus.RUNNING);
    }
  };

  const selectReason = (reason: string) => {
    if (selectedMachine) {
      onUpdateStatus(selectedMachine.id, MachineStatus.STOPPED, reason);
      setShowReasonModal(false);
      setSelectedMachine(null);
    }
  };

  const PLANNED_REASONS = ['Không có đơn hàng', 'Bảo trì', 'Cân đối sản xuất', 'Nghỉ lễ'];

  return (
    <div className="space-y-4">
      {/* Shift Info Header */}
      {currentShift && (
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-4 rounded-2xl shadow-lg text-white flex flex-wrap items-center gap-4 md:gap-8">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <span className="text-xl">📅</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Ngày hiện tại</p>
              <p className="text-sm font-black">{new Date(currentShift.date).toLocaleDateString('vi-VN')}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <span className="text-xl">⏰</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Ca làm việc</p>
              <p className="text-sm font-black">{currentShift.shift}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm">
              <span className="text-xl">👤</span>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Trưởng ca</p>
              <p className="text-sm font-black">{currentShift.teamLeaderName || 'Chưa cập nhật'}</p>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 items-center bg-white p-3 rounded-xl shadow-sm border border-slate-200">
        <div className="flex bg-slate-100 p-1 rounded-lg shrink-0">
          <button 
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase transition-all ${filterType === 'ALL' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}
          >
            Tất cả ({machines.length})
          </button>
          <button onClick={() => setFilterType(MachineType.INJECTION)} className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase transition-all ${filterType === MachineType.INJECTION ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Máy Ép</button>
          <button onClick={() => setFilterType(MachineType.BLOWING)} className={`px-3 py-1.5 rounded-md text-[11px] font-black uppercase transition-all ${filterType === MachineType.BLOWING ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Máy Thổi</button>
        </div>
        <div className="flex-1 w-full flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">🔍</span>
            <input 
              type="text" 
              placeholder="Tìm mã máy..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs">👤</span>
            <input 
              type="text" 
              placeholder="Tìm tên nhân viên..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all font-bold text-xs"
              value={operatorFilter}
              onChange={(e) => setOperatorFilter(e.target.value)}
            />
          </div>
          <button 
            onClick={onResetAll}
            className="px-4 py-2 bg-red-500 text-white rounded-lg font-black text-[10px] uppercase hover:bg-red-600 transition-all shadow-md shadow-red-200 shrink-0 flex items-center gap-2"
          >
            <span>🔄</span>
            <span className="hidden sm:inline">RESET MÁY DỪNG</span>
            <span className="sm:hidden">RESET</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 xl:grid-cols-10 gap-2 md:gap-3">
        {filteredMachines.map((machine) => {
          const isPlanned = PLANNED_REASONS.includes(machine.currentDowntimeReason || '');
          return (
            <button
              key={machine.id}
              onClick={() => handleMachineClick(machine)}
              className={`flex flex-col items-center justify-center p-2 md:p-2.5 rounded-xl border-2 transition-all active:scale-95 shadow-sm min-h-[90px] md:min-h-[105px] ${
                machine.status === MachineStatus.RUNNING 
                ? 'bg-white border-slate-100 hover:border-green-400' 
                : isPlanned 
                  ? 'bg-blue-50 border-blue-200 hover:border-blue-500 shadow-blue-100'
                  : 'bg-red-50 border-red-200 hover:border-red-500 shadow-red-100'
              }`}
            >
              <div className="flex items-center gap-1 mb-1">
                 <div className={`w-2 h-2 rounded-full ${machine.status === MachineStatus.RUNNING ? 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.6)]' : isPlanned ? 'bg-blue-500' : 'bg-red-500 animate-pulse'}`}></div>
                 <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">{machine.capacity}T</span>
              </div>
              <h3 className={`text-xs md:text-sm font-black leading-tight tracking-tight text-center truncate w-full ${machine.status === MachineStatus.RUNNING ? 'text-slate-800' : isPlanned ? 'text-blue-700' : 'text-red-700'}`}>{machine.code}</h3>
              
              {machine.currentProduct && machine.currentProduct.toLowerCase() !== 'tắt' && (
                <p className="text-[8px] md:text-[9px] font-bold text-blue-600 truncate w-full text-center mt-0.5 uppercase">
                  {machine.currentProduct}
                </p>
              )}
              
              {machine.currentOperator && (
                <p className="text-[7px] md:text-[8px] font-medium text-slate-500 truncate w-full text-center">
                  {machine.currentOperator}
                </p>
              )}
              
              {machine.status === MachineStatus.STOPPED ? (
                <div className="mt-2 w-full flex flex-col gap-1">
                  <div className={`truncate text-[7px] md:text-[8px] font-black py-1 px-1 rounded-md text-center uppercase tracking-tight ${isPlanned ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                    {machine.currentDowntimeReason || 'DỪNG'}
                  </div>
                  {!['Cân đối sản xuất', 'Nghỉ lễ'].includes(machine.currentDowntimeReason || '') && (
                    <div className={`text-[6px] md:text-[7px] font-black py-0.5 px-1 rounded-md text-center uppercase border ${machine.maintenanceConfirmed ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                      {machine.maintenanceConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}
                    </div>
                  )}
                </div>
              ) : (
                <span className="text-[7px] text-slate-300 font-bold mt-1 uppercase">Sẵn sàng</span>
              )}
            </button>
          );
        })}
      </div>

      {showReasonModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Báo cáo dừng máy: {selectedMachine?.code}</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Chọn lý do chính xác</p>
              </div>
              <button onClick={() => setShowReasonModal(false)} className="text-slate-400 text-3xl hover:text-slate-600 font-light">&times;</button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/20">
              {DOWNTIME_REASONS.map((group) => (
                <div key={group.category} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <h4 className="text-[9px] font-black uppercase tracking-widest mb-3 border-b border-slate-50 pb-2 text-slate-400">{group.category}</h4>
                  <div className="grid grid-cols-1 gap-1.5">
                    {group.reasons.map(reason => (
                      <button
                        key={reason}
                        onClick={() => selectReason(reason)}
                        className={`w-full text-left p-3 rounded-xl border transition-all font-black text-[11px] active:scale-95 ${PLANNED_REASONS.includes(reason) ? 'border-blue-200 bg-blue-50/50 hover:border-blue-500 text-blue-700' : 'border-slate-100 hover:border-red-400 hover:bg-red-50 text-slate-700'}`}
                      >
                        {reason}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
               <button onClick={() => setShowReasonModal(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] hover:bg-slate-100">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OperatorDashboard;
