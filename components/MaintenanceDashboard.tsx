
import React, { useState } from 'react';
import { Machine, DowntimeEvent, MachineStatus } from '../types';

interface MaintenanceDashboardProps {
  machines: Machine[];
  events: DowntimeEvent[];
  onUpdateStatus: (machineId: string, status: MachineStatus, reason?: string) => void;
  onConfirmMaintenance: (machineId: string) => Promise<void>;
  onResetAll: () => void;
}

const MaintenanceDashboard: React.FC<MaintenanceDashboardProps> = ({ machines, events, onUpdateStatus, onConfirmMaintenance, onResetAll }) => {
  const [notes, setNotes] = useState<Record<string, string>>({});
  
  const activeEvents = events.filter(e => !e.endTime);
  
  const maintenancePending = machines.filter(m => {
    return m.status === MachineStatus.STOPPED && !m.maintenanceConfirmed;
  });

  const handleResolve = async (machineId: string) => {
    try {
      await onConfirmMaintenance(machineId);
      setNotes(prev => {
        const newNotes = { ...prev };
        delete newNotes[machineId];
        return newNotes;
      });
    } catch (error) {
      console.error('Error confirming maintenance:', error);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 rounded-r-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h3 className="text-blue-800 font-bold flex items-center gap-2 text-lg">
            <span>📋</span> DANH SÁCH CHỜ XÁC NHẬN ({maintenancePending.length})
          </h3>
          <p className="text-blue-700 text-sm">Các máy đang dừng cần được xác nhận trước khi vận hành lại.</p>
        </div>
        <button 
          onClick={onResetAll}
          className="px-4 py-2 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
        >
          <span>🔄</span>
          <span>RESET MÁY DỪNG</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {maintenancePending.map(machine => {
          const event = activeEvents.find(e => e.machineId === machine.id);
          const currentNotes = notes[machine.id] || '';

          return (
            <div key={machine.id} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 flex flex-col animate-in fade-in slide-in-from-bottom-4">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="text-2xl font-black text-slate-800">{machine.code}</h4>
                  <p className="text-xs text-slate-400 font-bold uppercase">{machine.brand} | {machine.capacity}T</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase shadow-sm ${
                    ['Không có đơn hàng', 'Bảo trì', 'Cân đối sản xuất', 'Nghỉ lễ'].includes(machine.currentDowntimeReason || '')
                    ? 'bg-blue-500 text-white'
                    : 'bg-red-500 text-white'
                  }`}>
                    {['Không có đơn hàng', 'Bảo trì', 'Cân đối sản xuất', 'Nghỉ lễ'].includes(machine.currentDowntimeReason || '') ? 'Kế Hoạch' : 'Sự Cố'}
                  </span>
                </div>
              </div>
              
              <div className="mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-100 flex-1">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lý do báo dừng</p>
                  <p className="text-[10px] font-mono font-bold text-red-400">
                    {event ? new Date(event.startTime).toLocaleTimeString() : '--:--'}
                  </p>
                </div>
                <p className="text-slate-800 font-black text-lg leading-tight">
                  {machine.currentDowntimeReason || 'Yêu cầu kiểm tra'}
                </p>
                <div className="mt-4 pt-4 border-t border-slate-200/50">
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Nhật ký / Ghi chú</p>
                   <textarea 
                    value={currentNotes}
                    onChange={(e) => setNotes({...notes, [machine.id]: e.target.value})}
                    placeholder="Nhập nội dung xử lý hoặc ghi chú..."
                    className="w-full p-3 text-sm border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none bg-white min-h-[80px]"
                   />
                </div>
              </div>

              <button 
                onClick={() => handleResolve(machine.id)}
                disabled={machine.maintenanceConfirmed}
                className={`w-full font-black py-4 rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2 group ${
                  machine.maintenanceConfirmed 
                  ? 'bg-green-100 text-green-700 cursor-not-allowed border border-green-200' 
                  : 'bg-slate-900 hover:bg-green-600 text-white hover:shadow-green-200'
                }`}
              >
                <span className="text-lg group-hover:scale-125 transition-transform">
                  {machine.maintenanceConfirmed ? '✅' : '🔧'}
                </span>
                {machine.maintenanceConfirmed ? 'ĐÃ XÁC NHẬN' : 'XÁC NHẬN CHO CHẠY'}
              </button>
            </div>
          );
        })}

        {maintenancePending.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <div className="text-5xl mb-4">✨</div>
            <p className="text-slate-500 font-bold text-lg">Hệ thống vận hành ổn định.</p>
            <p className="text-slate-400 text-sm">Hiện tại không có yêu cầu hỗ trợ kỹ thuật.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
