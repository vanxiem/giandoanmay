
import React, { useState } from 'react';
import { Machine, DowntimeEvent, MachineStatus, MachineBrand, MachineType } from '../types';

interface TeamLeaderDashboardProps {
  machines: Machine[];
  events: DowntimeEvent[];
  onUpdateStatus: (machineId: string, status: MachineStatus, reason?: string) => void;
  onUpdateMachine: (machineId: string, updates: Partial<Machine>) => void;
  onResetAll: () => void;
}

const TeamLeaderDashboard: React.FC<TeamLeaderDashboardProps> = ({ machines, events, onUpdateStatus, onUpdateMachine, onResetAll }) => {
  const [editingMachine, setEditingMachine] = useState<Machine | null>(null);
  const [newCode, setNewCode] = useState('');
  const [newBrand, setNewBrand] = useState<MachineBrand>(MachineBrand.CLF);
  const [newType, setNewType] = useState<MachineType>(MachineType.INJECTION);
  const [newCapacity, setNewCapacity] = useState<number>(0);

  const openEditModal = (machine: Machine) => {
    setEditingMachine(machine);
    setNewCode(machine.code);
    setNewBrand(machine.brand);
    setNewType(machine.type);
    setNewCapacity(machine.capacity);
  };

  const handleSave = () => {
    if (editingMachine && newCode.trim()) {
      onUpdateMachine(editingMachine.id, {
        code: newCode.trim(),
        brand: newBrand,
        type: newType,
        capacity: newCapacity
      });
      setEditingMachine(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h3 className="font-bold text-slate-800 uppercase">Bảng Điều Phối Của Trưởng Ca</h3>
            <div className="text-xs font-medium text-slate-500 italic">* Quản lý danh sách thiết bị và trạng thái vận hành</div>
          </div>
          <button 
            onClick={onResetAll}
            className="px-4 py-2 bg-red-500 text-white rounded-xl font-black text-[10px] uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center gap-2"
          >
            <span>🔄</span>
            <span>RESET MÁY DỪNG</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-xs font-bold uppercase tracking-wider">
              <tr>
                <th className="px-6 py-4">Mã Máy</th>
                <th className="px-6 py-4">Cấu Hình</th>
                <th className="px-6 py-4">Trạng Thái</th>
                <th className="px-6 py-4">Lý Do Dừng</th>
                <th className="px-6 py-4">Thời Gian</th>
                <th className="px-6 py-4">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {machines.map(machine => {
                const activeEvent = events.find(e => e.machineId === machine.id && !e.endTime);
                let duration = '0m';
                if (activeEvent) {
                  const diff = Math.floor((Date.now() - activeEvent.startTime) / 60000);
                  duration = `${diff}m`;
                }

                return (
                  <tr key={machine.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="font-black text-slate-800 text-lg">{machine.code}</div>
                        <button 
                          onClick={() => openEditModal(machine)}
                          className="p-1 hover:bg-blue-50 text-blue-400 hover:text-blue-600 rounded transition-colors"
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                       <div className="flex flex-col gap-1">
                          <span className={`w-fit px-2 py-0.5 rounded text-[9px] font-black ${machine.type === MachineType.INJECTION ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {machine.type === MachineType.INJECTION ? 'MÁY ÉP' : 'MÁY THỔI'}
                          </span>
                          <span className="text-sm font-bold text-slate-600">{machine.brand} - {machine.capacity}T</span>
                       </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                        machine.status === MachineStatus.RUNNING 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                      }`}>
                        {machine.status === MachineStatus.RUNNING ? 'Chạy' : 'Dừng'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600 font-medium">
                      {machine.currentDowntimeReason || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm font-mono font-bold text-slate-700">
                      {machine.status === MachineStatus.STOPPED ? duration : '-'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-slate-100 rounded-lg transition-all text-lg">🕒</button>
                        {machine.status === MachineStatus.STOPPED && !machine.maintenanceConfirmed && (
                          <button 
                            onClick={() => onUpdateMachine(machine.id, { maintenanceConfirmed: true })}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                          >
                            Xác nhận
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {editingMachine && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-xl font-black text-slate-800">Hiệu chỉnh máy</h3>
              <p className="text-slate-500 text-sm font-medium">Trưởng ca cập nhật thông tin thiết bị</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Mã Máy (Code)</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-bold text-lg text-slate-700"
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-black text-slate-400 uppercase mb-2 tracking-widest">Tải Trọng (Tấn)</label>
                <input 
                  type="number" 
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none font-bold text-slate-700"
                  value={newCapacity}
                  onChange={(e) => setNewCapacity(Number(e.target.value))}
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
              <button onClick={() => setEditingMachine(null)} className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50 transition-all">Hủy</button>
              <button onClick={handleSave} className="flex-1 py-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-black shadow-lg transition-all">Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamLeaderDashboard;
