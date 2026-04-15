
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { ShiftAssignment, Role, Machine, MachineAssignment } from '../types';
import { motion, AnimatePresence } from 'framer-motion';

interface ShiftDashboardProps {
  assignments: ShiftAssignment[];
  machines: Machine[];
  userRole: Role;
  userEmail: string;
  selectedArea: number | 'ALL';
  onSaveAssignment: (assignment: Partial<ShiftAssignment>) => Promise<void>;
  onDeleteAssignment: (id: string) => Promise<void>;
}

const ShiftDashboard: React.FC<ShiftDashboardProps> = ({ 
  assignments, 
  machines,
  userRole, 
  userEmail,
  selectedArea, 
  onSaveAssignment,
  onDeleteAssignment
}) => {
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const [activeTab, setActiveTab] = useState<'Ca 1' | 'Ca 2' | 'Ca 3'>('Ca 1');
  const [localAssignment, setLocalAssignment] = useState<Partial<ShiftAssignment> | null>(null);

  const [isDirty, setIsDirty] = useState(false);
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [pasteText, setPasteText] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const [columnWidths, setColumnWidths] = useState({
    machine: 80,
    product: 150,
    employee: 150,
    standardRT: 80,
    assignedRT: 80,
    deviation: 80,
    notes: 200
  });

  const resizingRef = useRef<{
    column: string;
    startX: number;
    startWidth: number;
  } | null>(null);

  const handleMouseDown = (column: string, e: React.MouseEvent) => {
    e.preventDefault();
    resizingRef.current = {
      column,
      startX: e.clientX,
      startWidth: (columnWidths as any)[column]
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    const current = resizingRef.current;
    if (!current) return;
    const deltaX = e.clientX - current.startX;
    const newWidth = Math.max(50, current.startWidth + deltaX);
    const column = current.column;
    setColumnWidths(prev => ({
      ...prev,
      [column]: newWidth
    }));
  };

  const handleMouseUp = () => {
    resizingRef.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };
  
  // Better canEdit check that matches firestore rules intent
  const canEdit = useMemo(() => {
    return userRole === Role.TEAM_LEADER || 
           userRole === Role.MANAGER || 
           userEmail === 'xiemtoiyeuquehuong@gmail.com';
  }, [userRole, userEmail]);

  const areaMachines = useMemo(() => {
    if (selectedArea === 'ALL') return [];
    return machines
      .filter(m => m.area === selectedArea)
      .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [machines, selectedArea]);

  const currentShiftAssignment = useMemo(() => {
    return assignments.find(a => 
      (selectedArea === 'ALL' || a.area === selectedArea) && 
      a.date === filterDate && 
      a.shift === activeTab
    );
  }, [assignments, selectedArea, filterDate, activeTab]);

  // Initialize local assignment only when context changes or when a new assignment is loaded
  useEffect(() => {
    if (currentShiftAssignment) {
      setLocalAssignment(JSON.parse(JSON.stringify(currentShiftAssignment)));
    } else if (selectedArea !== 'ALL') {
      const initialMachineAssignments: MachineAssignment[] = areaMachines.map(m => ({
        machineId: m.id,
        productName: '',
        standardRT: 1.0,
        assignedRT: 1.0,
        notes: ''
      }));

      setLocalAssignment({
        date: filterDate,
        area: selectedArea as number,
        shift: activeTab,
        operatorName: '',
        maintenanceName: '',
        teamLeaderName: '',
        machineAssignments: initialMachineAssignments,
        notes: ''
      });
    }
    setIsDirty(false);
  }, [currentShiftAssignment?.id, selectedArea, filterDate, activeTab, areaMachines.length]);

  // Clean up event listeners on unmount
  useEffect(() => {
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleSave = async () => {
    if (localAssignment && canEdit) {
      await onSaveAssignment(localAssignment);
      setIsDirty(false);
    }
  };

  const updateField = (field: keyof ShiftAssignment, value: any) => {
    if (!canEdit || !localAssignment) return;
    setLocalAssignment({ ...localAssignment, [field]: value });
    setIsDirty(true);
  };

  const updateMachineField = (machineId: string, field: keyof MachineAssignment, value: any) => {
    if (!canEdit || !localAssignment) return;
    const updated = (localAssignment.machineAssignments || []).map(ma => 
      ma.machineId === machineId ? { ...ma, [field]: value } : ma
    );
    setLocalAssignment({ ...localAssignment, machineAssignments: updated });
    setIsDirty(true);
  };

  const processPasteData = (data: string) => {
    if (!canEdit || !localAssignment) return;
    
    const rows = data.split(/\r?\n/).filter(row => row.trim() !== '');
    if (rows.length === 0) return;

    const updatedAssignments = JSON.parse(JSON.stringify(localAssignment.machineAssignments || []));
    
    // Check if the first column of the first row is a machine code
    const firstRowCols = rows[0].split('\t');
    const firstCol = firstRowCols[0].trim().toUpperCase();
    const isCodeBased = machines.some(m => m.code.toUpperCase() === firstCol);

    if (isCodeBased) {
      // Code-based matching (Original logic)
      rows.forEach((row) => {
        const cols = row.split('\t');
        if (cols.length < 2) return;
        const machineCode = cols[0].trim().toUpperCase();
        const targetMachine = machines.find(m => m.code.toUpperCase() === machineCode);
        if (!targetMachine) return;
        const targetIdx = updatedAssignments.findIndex((ma: any) => ma.machineId === targetMachine.id);
        if (targetIdx !== -1) {
          // Expected: Máy | Sản phẩm | Nhân viên | RT chuẩn | Bố trí | Lệch RT | Ghi chú
          if (cols[1] !== undefined) updatedAssignments[targetIdx].productName = cols[1].trim();
          if (cols[2] !== undefined) updatedAssignments[targetIdx].employeeName = cols[2].trim();
          
          if (cols[3] !== undefined) {
            const val = parseFloat(cols[3].replace(',', '.'));
            if (!isNaN(val)) updatedAssignments[targetIdx].standardRT = val;
          }
          if (cols[4] !== undefined) {
            const val = parseFloat(cols[4].replace(',', '.'));
            if (!isNaN(val)) updatedAssignments[targetIdx].assignedRT = val;
          }
          if (cols[6] !== undefined) {
            updatedAssignments[targetIdx].notes = cols[6].trim();
          } else if (cols[5] !== undefined && cols.length === 6) {
            updatedAssignments[targetIdx].notes = cols[5].trim();
          }
        }
      });
    } else {
      // Index-based matching (Vertical paste / Column paste)
      rows.forEach((row, rowIndex) => {
        if (rowIndex < updatedAssignments.length) {
          const cols = row.split('\t');
          // Map: 0->Product, 1->Employee, 2->StdRT, 3->AssignedRT, 4->Deviation (skip), 5->Notes
          if (cols.length >= 1) updatedAssignments[rowIndex].productName = cols[0].trim();
          if (cols.length >= 2) updatedAssignments[rowIndex].employeeName = cols[1].trim();
          
          if (cols.length >= 3) {
            const val = parseFloat(cols[2].replace(',', '.'));
            if (!isNaN(val)) updatedAssignments[rowIndex].standardRT = val;
          }
          if (cols.length >= 4) {
            const val = parseFloat(cols[3].replace(',', '.'));
            if (!isNaN(val)) updatedAssignments[rowIndex].assignedRT = val;
          }
          if (cols.length >= 6) {
             updatedAssignments[rowIndex].notes = cols[5].trim();
          } else if (cols.length === 5) {
             updatedAssignments[rowIndex].notes = cols[4].trim();
          }
        }
      });
    }

    setLocalAssignment({ ...localAssignment, machineAssignments: updatedAssignments });
    setIsDirty(true);
    setIsPasteModalOpen(false);
    setPasteText('');
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    if (!canEdit || !localAssignment) return;
    const pasteData = e.clipboardData.getData('text');
    // If it's a table-like paste (tabs or multiple lines)
    if (pasteData.includes('\t') || pasteData.includes('\n')) {
      // Only prevent default if we are not in the modal's textarea
      if (document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        processPasteData(pasteData);
      }
    }
  };

  const shifts = ['Ca 1', 'Ca 2', 'Ca 3'] as const;

  if (selectedArea === 'ALL') {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center animate-in fade-in duration-500">
        <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center text-3xl mb-6">📅</div>
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight mb-2">Bảng Phân Ca Sản Xuất</h2>
        <p className="text-slate-500 max-w-md font-medium">Vui lòng chọn một khu vực cụ thể (Khu 1, 2 hoặc 3) từ thanh điều hướng phía trên để xem và quản lý bảng phân ca.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header & Filters */}
      <div className="bg-white p-4 md:p-6 rounded-3xl shadow-sm border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Bảng Phân Ca Sản Xuất</h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1">
            Khu vực {selectedArea} | Ngày {new Date(filterDate).toLocaleDateString('vi-VN')}
          </p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {!canEdit && (
            <div className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-[10px] font-bold text-amber-700 uppercase">
              Chế độ xem (Chỉ đọc)
            </div>
          )}
          <input 
            type="date" 
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="flex-1 md:flex-none px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-sm outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
          {canEdit && (
            <button 
              onClick={() => setIsPasteModalOpen(true)}
              className="px-4 py-2 bg-slate-800 text-white rounded-xl font-black text-xs uppercase hover:bg-black transition-all shadow-lg flex items-center gap-2"
            >
              <span>📋 Nhập từ Excel</span>
            </button>
          )}
          {isDirty && canEdit && (
            <button 
              onClick={handleSave}
              className="px-6 py-2 bg-green-600 text-white rounded-xl font-black text-xs uppercase hover:bg-green-700 transition-all shadow-lg shadow-green-100 flex items-center gap-2 animate-bounce"
            >
              <span>💾 Lưu Thay Đổi</span>
            </button>
          )}
        </div>
      </div>

      {/* Shift Tabs */}
      <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
        {shifts.map(s => (
          <button
            key={s}
            onClick={() => setActiveTab(s)}
            className={`px-6 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              activeTab === s ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Main Table View */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden" onPaste={handlePaste}>
        <div className="p-6 border-b border-slate-100 bg-slate-50/30 flex flex-col md:flex-row justify-between gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 flex-1">
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Trưởng ca</p>
              <input 
                type="text"
                value={localAssignment?.teamLeaderName || ''}
                onChange={(e) => updateField('teamLeaderName', e.target.value)}
                disabled={!canEdit}
                placeholder="Nhập tên..."
                className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-black text-slate-700 pb-1"
              />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Vận hành</p>
              <input 
                type="text"
                value={localAssignment?.operatorName || ''}
                onChange={(e) => updateField('operatorName', e.target.value)}
                disabled={!canEdit}
                placeholder="Nhập tên..."
                className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-black text-slate-700 pb-1"
              />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kỹ thuật</p>
              <input 
                type="text"
                value={localAssignment?.maintenanceName || ''}
                onChange={(e) => updateField('maintenanceName', e.target.value)}
                disabled={!canEdit}
                placeholder="Nhập tên..."
                className="w-full bg-transparent border-b border-slate-200 focus:border-blue-500 outline-none text-sm font-black text-slate-700 pb-1"
              />
            </div>
          </div>
          {currentShiftAssignment && canEdit && (
            <button 
              onClick={() => onDeleteAssignment(currentShiftAssignment.id)}
              className="text-red-500 hover:text-red-700 text-xs font-bold uppercase flex items-center gap-1 self-end md:self-center"
            >
              <span>🗑️</span> Xóa bảng
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#004d40] text-white text-[10px] md:text-[11px] font-bold uppercase tracking-wider select-none">
                <th className="px-1 py-2 md:px-2 md:py-3 border border-slate-700/30 text-center" style={{ width: isMobile ? 'auto' : '40px' }}>
                  STT
                </th>
                <th className="px-1 py-2 md:px-4 md:py-3 border border-slate-700/30 text-center relative group" style={{ width: isMobile ? 'auto' : columnWidths.machine }}>
                  Máy
                  {!isMobile && <div onMouseDown={(e) => handleMouseDown('machine', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-slate-500/0 group-hover:bg-slate-500/30 transition-colors" />}
                </th>
                <th className="px-1 py-2 md:px-4 md:py-3 border border-slate-700/30 relative group" style={{ width: isMobile ? 'auto' : columnWidths.product }}>
                  Sản phẩm
                  {!isMobile && <div onMouseDown={(e) => handleMouseDown('product', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-slate-500/0 group-hover:bg-slate-500/30 transition-colors" />}
                </th>
                <th className="px-1 py-2 md:px-4 md:py-3 border border-slate-700/30 relative group" style={{ width: isMobile ? 'auto' : columnWidths.employee }}>
                  Nhân viên
                  {!isMobile && <div onMouseDown={(e) => handleMouseDown('employee', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-slate-500/0 group-hover:bg-slate-500/30 transition-colors" />}
                </th>
                <th className="px-1 py-2 md:px-4 md:py-3 border border-slate-700/30 text-center relative group" style={{ width: isMobile ? 'auto' : columnWidths.standardRT }}>
                  RT chuẩn
                  {!isMobile && <div onMouseDown={(e) => handleMouseDown('standardRT', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-slate-500/0 group-hover:bg-slate-500/30 transition-colors" />}
                </th>
                <th className="px-1 py-2 md:px-4 md:py-3 border border-slate-700/30 text-center relative group" style={{ width: isMobile ? 'auto' : columnWidths.assignedRT }}>
                  Bố trí
                  {!isMobile && <div onMouseDown={(e) => handleMouseDown('assignedRT', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-slate-500/0 group-hover:bg-slate-500/30 transition-colors" />}
                </th>
                <th className="px-1 py-2 md:px-4 md:py-3 border border-slate-700/30 text-center relative group" style={{ width: isMobile ? 'auto' : columnWidths.deviation }}>
                  Lệch RT
                  {!isMobile && <div onMouseDown={(e) => handleMouseDown('deviation', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-slate-500/0 group-hover:bg-slate-500/30 transition-colors" />}
                </th>
                <th className="px-1 py-2 md:px-4 md:py-3 border border-slate-700/30 relative group" style={{ width: isMobile ? 'auto' : columnWidths.notes }}>
                  Ghi chú
                  {!isMobile && <div onMouseDown={(e) => handleMouseDown('notes', e)} className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize bg-slate-500/0 group-hover:bg-slate-500/30 transition-colors" />}
                </th>
              </tr>
            </thead>
            <tbody className="text-sm font-mono">
              {areaMachines.map((m, idx) => {
                const assignment = localAssignment?.machineAssignments?.find(ma => ma.machineId === m.id);
                const isOff = assignment?.productName?.toLowerCase() === 'tắt' || assignment?.productName === '';
                const standardRT = parseFloat(assignment?.standardRT as any) || 0;
                const assignedRT = parseFloat(assignment?.assignedRT as any) || 0;
                const deviation = standardRT - assignedRT;

                return (
                  <tr key={m.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-blue-50/30 transition-colors`}>
                    <td className="px-1 py-1 md:px-2 md:py-2 border border-slate-100 text-center font-bold text-slate-400 text-[10px]">{idx + 1}</td>
                    <td className="px-1 py-1 md:px-4 md:py-2 border border-slate-100 font-black text-blue-700 text-center font-sans text-[10px] md:text-sm" style={{ width: isMobile ? 'auto' : columnWidths.machine }}>{m.code}</td>
                    <td className={`px-1 py-1 md:px-4 md:py-2 border border-slate-100 font-bold font-sans text-[10px] md:text-sm ${isOff ? 'text-red-500 bg-red-50/30' : 'text-blue-800'}`} style={{ width: isMobile ? 'auto' : columnWidths.product }}>
                      <input 
                        type="text"
                        value={assignment?.productName || ''}
                        onChange={(e) => updateMachineField(m.id, 'productName', e.target.value)}
                        disabled={!canEdit}
                        placeholder="-"
                        className="w-full bg-transparent outline-none border-none"
                      />
                    </td>
                    <td className="px-1 py-1 md:px-4 md:py-2 border border-slate-100 font-bold font-sans text-slate-700 text-[10px] md:text-sm" style={{ width: isMobile ? 'auto' : columnWidths.employee }}>
                      <input 
                        type="text"
                        value={assignment?.employeeName || ''}
                        onChange={(e) => updateMachineField(m.id, 'employeeName', e.target.value)}
                        disabled={!canEdit}
                        placeholder="Nhân viên..."
                        className="w-full bg-transparent outline-none border-none"
                      />
                    </td>
                    <td className="px-1 py-1 md:px-4 md:py-2 border border-slate-100 text-center font-bold text-green-600 bg-green-50/20 text-[10px] md:text-sm" style={{ width: isMobile ? 'auto' : columnWidths.standardRT }}>
                      <input 
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={assignment?.standardRT ?? ''}
                        onChange={(e) => updateMachineField(m.id, 'standardRT', e.target.value)}
                        disabled={!canEdit}
                        className="w-full bg-transparent outline-none border-none text-center"
                      />
                    </td>
                    <td className="px-1 py-1 md:px-4 md:py-2 border border-slate-100 text-center font-bold text-amber-600 bg-amber-50/20 text-[10px] md:text-sm" style={{ width: isMobile ? 'auto' : columnWidths.assignedRT }}>
                      <input 
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        value={assignment?.assignedRT ?? ''}
                        onChange={(e) => updateMachineField(m.id, 'assignedRT', e.target.value)}
                        disabled={!canEdit}
                        className="w-full bg-transparent outline-none border-none text-center"
                      />
                    </td>
                    <td className={`px-1 py-1 md:px-4 md:py-2 border border-slate-100 text-center font-bold text-[10px] md:text-sm ${deviation !== 0 ? 'text-orange-500' : 'text-slate-400'}`} style={{ width: isMobile ? 'auto' : columnWidths.deviation }}>
                      {deviation.toFixed(2)}
                    </td>
                    <td className={`px-1 py-1 md:px-4 md:py-2 border border-slate-100 font-black uppercase text-[10px] md:text-xs font-sans ${isOff ? 'text-red-600' : 'text-slate-600'}`} style={{ width: isMobile ? 'auto' : columnWidths.notes }}>
                      <input 
                        type="text"
                        value={assignment?.notes || ''}
                        onChange={(e) => updateMachineField(m.id, 'notes', e.target.value)}
                        disabled={!canEdit}
                        placeholder={isOff ? 'KHÔNG KH' : ''}
                        className="w-full bg-transparent outline-none border-none"
                      />
                    </td>
                  </tr>
                );
              })}
              {/* Total Row */}
              <tr className="bg-slate-100 font-black text-slate-800 font-sans">
                <td colSpan={4} className="px-1 py-2 md:px-4 md:py-3 border border-slate-200 text-blue-800 text-[10px] md:text-sm">
                  Bố trí nhân sự khu {selectedArea} ({areaMachines.length} máy)
                </td>
                <td className="px-1 py-2 md:px-4 md:py-3 border border-slate-200 text-center font-mono text-[10px] md:text-sm">
                  {areaMachines.reduce((acc, m) => {
                    const a = localAssignment?.machineAssignments?.find(ma => ma.machineId === m.id);
                    return acc + (parseFloat(a?.standardRT as any) || 0);
                  }, 0).toFixed(2)}
                </td>
                <td className="px-1 py-2 md:px-4 md:py-3 border border-slate-200 text-center font-mono text-[10px] md:text-sm">
                  {areaMachines.reduce((acc, m) => {
                    const a = localAssignment?.machineAssignments?.find(ma => ma.machineId === m.id);
                    return acc + (parseFloat(a?.assignedRT as any) || 0);
                  }, 0).toFixed(2)}
                </td>
                <td className="px-1 py-2 md:px-4 md:py-3 border border-slate-200 text-center font-mono text-[10px] md:text-sm">
                  {(areaMachines.reduce((acc, m) => {
                    const a = localAssignment?.machineAssignments?.find(ma => ma.machineId === m.id);
                    return acc + ((parseFloat(a?.standardRT as any) || 0) - (parseFloat(a?.assignedRT as any) || 0));
                  }, 0)).toFixed(2)}
                </td>
                <td className="px-1 py-2 md:px-4 md:py-3 border border-slate-200"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Paste Modal */}
      <AnimatePresence>
        {isPasteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Nhập dữ liệu từ Excel</h3>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">
                    Copy vùng dữ liệu từ Excel và dán vào ô dưới đây
                  </p>
                </div>
                <button onClick={() => setIsPasteModalOpen(false)} className="text-slate-400 text-2xl hover:text-slate-600">&times;</button>
              </div>

              <div className="p-6 space-y-4">
                <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                  <p className="text-xs text-blue-700 font-bold leading-relaxed">
                    💡 <span className="uppercase">Lưu ý:</span> Thứ tự cột trong Excel nên là: <br/>
                    <span className="font-black">Mã Máy | Tên Sản Phẩm | Nhân Viên | RT Chuẩn | Bố Trí | Lệch RT | Ghi Chú</span>
                  </p>
                </div>
                
                <textarea 
                  className="w-full h-64 p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none font-mono text-xs"
                  placeholder="Dán dữ liệu tại đây..."
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                  onPaste={(e) => {
                    // Optional: auto-process on paste if they just paste into the box
                    // processPasteData(e.clipboardData.getData('text'));
                  }}
                />
              </div>

              <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3">
                <button 
                  onClick={() => setIsPasteModalOpen(false)} 
                  className="flex-1 py-3 bg-white border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-100 transition-all uppercase text-xs"
                >
                  Hủy
                </button>
                <button 
                  onClick={() => processPasteData(pasteText)} 
                  className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg transition-all uppercase text-xs"
                  disabled={!pasteText.trim()}
                >
                  Xác nhận nhập dữ liệu
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ShiftDashboard;
