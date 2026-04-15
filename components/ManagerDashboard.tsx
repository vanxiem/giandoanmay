
import React, { useMemo, useState } from 'react';
import { Machine, DowntimeEvent, MachineBrand, MachineType, MachineStatus } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const PLANNED_REASONS = ['Không có đơn hàng', 'Bảo trì', 'Cân đối sản xuất', 'Nghỉ lễ'];

interface ManagerDashboardProps {
  machines: Machine[];
  events: DowntimeEvent[];
  onUpdateMachine: (machineId: string, updates: Partial<Machine>) => void;
  onResetAll: () => void;
}

const ManagerDashboard: React.FC<ManagerDashboardProps> = ({ machines, events, onUpdateMachine, onResetAll }) => {
  const stats = useMemo(() => {
    const totalDowntimeMinutes = events.reduce((acc, e) => {
      const end = e.endTime || Date.now();
      return acc + (end - e.startTime) / 60000;
    }, 0);

    const plannedDowntimeMinutes = events
      .filter(e => e.isPlanned)
      .reduce((acc, e) => {
        const end = e.endTime || Date.now();
        return acc + (end - e.startTime) / 60000;
      }, 0);

    const totalPossibleMinutes = machines.length * 480;
    const unexpectedDowntime = totalDowntimeMinutes - plannedDowntimeMinutes;
    const effectiveAvailableTime = totalPossibleMinutes - plannedDowntimeMinutes;
    const availability = effectiveAvailableTime > 0 
      ? ((effectiveAvailableTime - unexpectedDowntime) / effectiveAvailableTime) * 100 
      : 100;

    const reasonsCount = events.reduce((acc: Record<string, number>, e) => {
      acc[e.reason] = (acc[e.reason] || 0) + 1;
      return acc;
    }, {});

    const pieData = Object.entries(reasonsCount).map(([name, value]) => ({ name, value }));
    
    const brandsInUse = Array.from(new Set(machines.map(m => m.brand)));
    const brandComparison = brandsInUse.map(brand => ({
      name: brand,
      minutes: events
        .filter(e => machines.find(m => m.id === e.machineId)?.brand === brand)
        .reduce((acc, e) => acc + ((e.endTime || Date.now()) - e.startTime) / 60000, 0)
    }));

    return { totalDowntimeMinutes, plannedDowntimeMinutes, availability, pieData, brandComparison };
  }, [events, machines]);

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#6366f1', '#ec4899'];

  return (
    <div className="space-y-8 pb-12">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Availability (OEE)</p>
          <p className="text-4xl font-black text-blue-600">{stats.availability.toFixed(1)}%</p>
          <p className="text-[10px] text-slate-400 mt-1">* Trừ "Dừng kế hoạch"</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Tổng Downtime</p>
          <p className="text-4xl font-black text-slate-800">{Math.round(stats.totalDowntimeMinutes)}m</p>
          <p className="text-[10px] text-orange-500 mt-1">Kế hoạch: {Math.round(stats.plannedDowntimeMinutes)}m</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Số Vụ Sự Cố</p>
          <p className="text-4xl font-black text-red-600">{events.filter(e => !e.isPlanned).length}</p>
        </div>
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">Máy Đang Chạy</p>
          <p className="text-4xl font-black text-green-600">{machines.filter(m => m.status === MachineStatus.RUNNING).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Phân Tích Lý Do Dừng</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={stats.pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={100} paddingAngle={5} dataKey="value">
                  {stats.pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="text-lg font-bold text-slate-800 mb-6">Downtime theo Thương Hiệu</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.brandComparison}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="minutes" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-50/30">
          <h3 className="font-bold text-slate-800 uppercase text-sm tracking-widest">Chi tiết tình trạng thiết bị</h3>
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
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-8 py-4">Mã Máy</th>
                <th className="px-8 py-4">Khu Vực</th>
                <th className="px-8 py-4">Loại Lỗi</th>
                <th className="px-8 py-4">Lý Do Hiện Tại</th>
                <th className="px-8 py-4">Tổng Dừng</th>
                <th className="px-8 py-4">Xác Nhận</th>
                <th className="px-8 py-4">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {machines.map(m => {
                const totalMins = events
                  .filter(e => e.machineId === m.id)
                  .reduce((acc, e) => acc + ((e.endTime || Date.now()) - e.startTime) / 60000, 0);
                const isPlanned = PLANNED_REASONS.includes(m.currentDowntimeReason || '');
                return (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-8 py-5 font-black text-slate-800 text-lg">{m.code}</td>
                    <td className="px-8 py-5">
                      <select 
                        value={m.area} 
                        onChange={(e) => onUpdateMachine(m.id, { area: parseInt(e.target.value) })}
                        className="bg-slate-100 border-none rounded px-2 py-1 text-xs font-bold text-slate-700"
                      >
                        {[1, 2, 3].map(a => <option key={a} value={a}>Khu {a}</option>)}
                      </select>
                    </td>
                    <td className="px-8 py-5">
                      {m.status === MachineStatus.STOPPED ? (
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase ${isPlanned ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                          {isPlanned ? 'Kế Hoạch' : 'Sự Cố'}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-8 py-5 text-sm font-bold text-slate-600 italic">
                      {m.currentDowntimeReason || '-'}
                    </td>
                    <td className="px-8 py-5 text-sm font-mono font-black text-slate-700">{Math.round(totalMins)}m</td>
                    <td className="px-8 py-5">
                      {m.status === MachineStatus.STOPPED ? (
                        <span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${m.maintenanceConfirmed ? 'bg-green-50 text-green-600 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'}`}>
                          {m.maintenanceConfirmed ? 'Đã xác nhận' : 'Chờ xác nhận'}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-8 py-5">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${m.status === MachineStatus.RUNNING ? 'bg-green-500 text-white shadow-sm shadow-green-200' : 'bg-slate-200 text-slate-600'}`}>
                        {m.status === MachineStatus.RUNNING ? 'Đang Chạy' : 'Đang Dừng'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ManagerDashboard;
