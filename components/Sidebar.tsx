
import React from 'react';
import { Role } from '../types';
import { User } from 'firebase/auth';
import { LogOut, User as UserIcon, X } from 'lucide-react';

interface SidebarProps {
  userRole: Role;
  onRoleChange: (role: Role) => void;
  onShowHistory: () => void;
  isHistoryActive: boolean;
  onShowShifts: () => void;
  isShiftsActive: boolean;
  user: User | null;
  onLogout: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  userRole, 
  onRoleChange, 
  onShowHistory, 
  isHistoryActive,
  onShowShifts,
  isShiftsActive,
  user,
  onLogout,
  isOpen = false,
  onClose
}) => {
  const roles = [
    { id: Role.OPERATOR, label: 'NV Vận Hành', icon: '👷' },
    { id: Role.TEAM_LEADER, label: 'Trưởng Ca', icon: '🎖️' },
    { id: Role.MAINTENANCE, label: 'Kỹ Thuật', icon: '🔧' },
    { id: Role.MANAGER, label: 'Quản Lý', icon: '📊' },
  ];

  return (
    <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="p-6 text-center border-b border-slate-800 flex items-center justify-between md:justify-center">
        <div className="text-xl font-black tracking-wider text-blue-400 italic">SMART MOLDING</div>
        <button className="md:hidden text-slate-400 hover:text-white" onClick={onClose}>
          <X size={24} />
        </button>
      </div>
      
      <nav className="flex-1 py-6 px-2 space-y-2 overflow-y-auto">
        <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Chế độ xem</p>
        {roles.map((role) => (
          <button
            key={role.id}
            onClick={() => {
              onRoleChange(role.id);
              if (isHistoryActive) onShowHistory();
              if (isShiftsActive) onShowShifts();
              if (onClose) onClose();
            }}
            className={`w-full flex items-center p-3 rounded-lg transition-all ${
              !isHistoryActive && !isShiftsActive && userRole === role.id 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/20' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-xl">{role.icon}</span>
            <span className="ml-3 font-medium">{role.label}</span>
          </button>
        ))}

        <div className="pt-6 mt-6 border-t border-slate-800">
          <p className="px-4 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Dữ liệu</p>
          <button
            onClick={() => {
              onShowHistory();
              if (isShiftsActive) onShowShifts();
              if (onClose) onClose();
            }}
            className={`w-full flex items-center p-3 rounded-lg transition-all ${
              isHistoryActive 
              ? 'bg-orange-600 text-white shadow-lg shadow-orange-900/20' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-xl">📜</span>
            <span className="ml-3 font-medium">Lịch sử sự cố</span>
          </button>

          <button
            onClick={() => {
              onShowShifts();
              if (isHistoryActive) onShowHistory();
              if (onClose) onClose();
            }}
            className={`w-full flex items-center p-3 rounded-lg transition-all mt-2 ${
              isShiftsActive 
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-900/20' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <span className="text-xl">📅</span>
            <span className="ml-3 font-medium">Bảng phân ca</span>
          </button>
        </div>
      </nav>

      <div className="p-4 border-t border-slate-800">
        {user && (
          <div className="flex items-center gap-3 mb-4 px-2">
            {user.photoURL ? (
              <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-slate-700" referrerPolicy="no-referrer" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center">
                <UserIcon size={16} className="text-slate-400" />
              </div>
            )}
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user.displayName || 'User'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <button 
          onClick={onLogout}
          className="w-full flex items-center p-3 rounded-lg text-slate-400 hover:bg-red-900/20 hover:text-red-400 transition-all"
        >
          <LogOut size={20} />
          <span className="ml-3 font-medium">Đăng xuất</span>
        </button>
      </div>

      <div className="p-4 bg-slate-800/50 text-xs text-slate-500">
        <p className="font-bold text-slate-400">SmartMolding V1.4</p>
        <p>© 2026 Manufacturing App</p>
      </div>
    </div>
  );
};

export default Sidebar;
