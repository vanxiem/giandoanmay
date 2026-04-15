
import React, { useState, useMemo } from 'react';
import { Machine, DowntimeEvent } from '../types';

interface HistoryDashboardProps {
  machines: Machine[];
  events: DowntimeEvent[];
}

const HistoryDashboard: React.FC<HistoryDashboardProps> = ({ machines, events }) => {
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [shiftFilter, setShiftFilter] = useState<'ALL' | '1' | '2' | '3'>('ALL');
  const [searchCode, setSearchCode] = useState('');

  const getShift = (timestamp: number) => {
    const hour = new Date(timestamp).getHours();
    if (hour >= 6 && hour < 14) return '1';
    if (hour >= 14 && hour < 22) return '2';
    return '3';
  };

  const filteredHistory = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.startTime).toISOString().split('T')[0];
      const matchesDate = eventDate === dateFilter;
      const matchesShift = shiftFilter === 'ALL' || getShift(event.startTime) === shiftFilter;
      const machine = machines.find(m => m.id === event.machineId);
      const matchesSearch = !searchCode || machine?.code.toLowerCase().includes(searchCode.toLowerCase());
      
      return matchesDate && matchesShift && matchesSearch;
    }).sort((a, b) => b.startTime - a.startTime);
  }, [events, dateFilter, shiftFilter, searchCode, machines]);

  const exportToExcel = () => {
    const headers = ["Ngày", "Ca", "Mã Máy", "Lý Do Gián Đoạn", "Bắt Đầu", "Kết Thúc", "Số Phút", "Loại"];
    let html = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <meta http-equiv="content-type" content="application/vnd.ms-excel; charset=UTF-8">
      </head>
      <body>
        <table border="1">
          <thead>
            <tr style="background-color: #0044cc; color: #ffffff; font-weight: bold;">
              ${headers.map(h => `<th>${h}</th>`).join('')}
            </tr>
          </thead>
          <tbody>
            ${filteredHistory.map(e => {
              const m = machines.find(mac => mac.id === e.machineId);
              const duration = e.endTime 
                ? Math.round((e.endTime - e.startTime) / 60000) 
                : Math.round((Date.now() - e.startTime) / 60000);
              return `
                <tr>
                  <td>${new Date(e.startTime).toLocaleDateString('vi-VN')}</td>
                  <td align="center">${getShift(e.startTime)}</td>
                  <td>${m?.code || ''}</td>
                  <td>${e.reason || ''}</td>
                  <td align="center">${new Date(e.startTime).toLocaleTimeString('vi-VN')}</td>
                  <td align="center">${e.endTime ? new Date(e.endTime).toLocaleTimeString('vi-VN') : 'Đang chạy'}</td>
                  <td align="right">${duration}</td>
                  <td>${e.isPlanned ? "Kế hoạch" : "Sự cố"}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </body>
      </html>
    `;
    const blob = new Blob([html], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Lich_su_gian_doan_${dateFilter}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Bộ lọc tối ưu Mobile */}
      <div className="bg-white p-4 md:p-6 rounded-2xl shadow-sm border border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ngày</label>
          <input 
            type="date" 
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ca</label>
          <select 
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm"
            value={shiftFilter}
            onChange={(e) => setShiftFilter(e.target.value as any)}
          >
            <option value="ALL">Tất cả ca</option>
            <option value="1">Ca 1</option>
            <option value="2">Ca 2</option>
            <option value="3">Ca 3</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mã máy</label>
          <input 
            type="text" 
            placeholder="Tìm máy..."
            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-sm"
            value={searchCode}
            onChange={(e) => setSearchCode(e.target.value)}
          />
        </div>
        <button 
          onClick={exportToExcel}
          className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2.5 rounded-xl font-black text-[10px] uppercase shadow-lg shadow-green-100 flex items-center justify-center gap-2 transition-all"
        >
          <span>📊</span> XUẤT EXCEL
        </button>
      </div>

      {/* Hiển thị dạng Card trên Mobile, Bảng trên Desktop */}
      <div className="block md:hidden space-y-3">
        {filteredHistory.map(event => {
          const machine = machines.find(m => m.id === event.machineId);
          const duration = event.endTime 
            ? Math.round((event.endTime - event.startTime) / 60000)
            : Math.round((Date.now() - event.startTime) / 60000);
          
          return (
            <div key={event.id} className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className={`absolute top-0 left-0 w-1 h-full ${event.isPlanned ? 'bg-blue-500' : 'bg-red-500'}`}></div>
              <div className="flex justify-between items-start mb-2">
                <span className="text-lg font-black text-slate-800">{machine?.code}</span>
                <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${event.isPlanned ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                  {event.isPlanned ? 'Kế Hoạch' : 'Sự Cố'}
                </span>
              </div>
              <p className="text-sm font-bold text-slate-600 mb-3">{event.reason}</p>
              <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase">
                <div>
                  <span className="block">Bắt đầu: {new Date(event.startTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</span>
                  <span className="block">Kết thúc: {event.endTime ? new Date(event.endTime).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) : 'Đang chạy'}</span>
                </div>
                <div className="text-right">
                  <span className="block">Ca: {getShift(event.startTime)}</span>
                  <span className="block text-slate-800 text-xs font-black">{duration} Phút</span>
                </div>
              </div>
            </div>
          );
        })}
        {filteredHistory.length === 0 && (
          <div className="bg-white p-10 text-center rounded-2xl border border-dashed border-slate-200 text-slate-400 font-bold text-xs uppercase">Không có dữ liệu</div>
        )}
      </div>

      {/* Bảng ẩn trên Mobile, hiện trên Desktop */}
      <div className="hidden md:block bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="px-6 py-4">Mã Máy</th>
                <th className="px-6 py-4 text-center">Ca</th>
                <th className="px-6 py-4">Lý Do</th>
                <th className="px-6 py-4 text-center">Thời gian</th>
                <th className="px-6 py-4 text-center">Phút</th>
                <th className="px-6 py-4">Loại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistory.map(event => {
                const machine = machines.find(m => m.id === event.machineId);
                const duration = event.endTime 
                  ? Math.round((event.endTime - event.startTime) / 60000)
                  : Math.round((Date.now() - event.startTime) / 60000);
                
                return (
                  <tr key={event.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 font-black text-slate-800">{machine?.code}</td>
                    <td className="px-6 py-4 text-center">
                      <span className="bg-slate-100 px-2 py-0.5 rounded font-black text-xs text-slate-600">{getShift(event.startTime)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-600">{event.reason}</td>
                    <td className="px-6 py-4 text-center text-[10px] font-mono text-slate-500">
                      {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {event.endTime ? new Date(event.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '...'}
                    </td>
                    <td className="px-6 py-4 text-center font-black text-slate-800">{duration}m</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase ${event.isPlanned ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'}`}>
                        {event.isPlanned ? 'KH' : 'Sự Cố'}
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

export default HistoryDashboard;
