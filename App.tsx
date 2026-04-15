
import React, { useState, useMemo, useEffect } from 'react';
import { Role, Machine, MachineStatus, MachineBrand, MachineType, DowntimeEvent, DOWNTIME_REASONS, ShiftAssignment } from './types';
import OperatorDashboard from './components/OperatorDashboard';
import ManagerDashboard from './components/ManagerDashboard';
import MaintenanceDashboard from './components/MaintenanceDashboard';
import TeamLeaderDashboard from './components/TeamLeaderDashboard';
import HistoryDashboard from './components/HistoryDashboard';
import LayoutDashboard from './components/LayoutDashboard';
import ShiftDashboard from './components/ShiftDashboard';
import Sidebar from './components/Sidebar';
import { loginWithGoogle, logout, subscribeToAuthChanges } from './auth';
import { 
  subscribeToMachines, 
  subscribeToEvents, 
  updateMachineStatus as updateFirestoreMachineStatus, 
  initializeMachines, 
  updateMachine, 
  confirmMaintenance,
  subscribeToShifts,
  saveShiftAssignment,
  deleteShiftAssignment
} from './firestore';
import { User } from 'firebase/auth';
import { LogIn, ShieldCheck, Factory } from 'lucide-react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';

const PLANNED_REASONS = ['Không có đơn hàng', 'Bảo trì', 'Cân đối sản xuất', 'Nghỉ lễ'];

const generateInitialMachines = (): Machine[] => {
  const area1Data = [
    { code: 'CLF125-25', brand: MachineBrand.CLF, capacity: 125, layout: { x: 11.5, y: 20, w: 1, h: 2 } },
    { code: 'CLF180-30', brand: MachineBrand.CLF, capacity: 180, layout: { x: 13, y: 20, w: 1, h: 2 } },
    { code: 'CLF180-31', brand: MachineBrand.CLF, capacity: 180, layout: { x: 14.5, y: 20, w: 1, h: 2 } },
    { code: 'CLF180-36', brand: MachineBrand.CLF, capacity: 180, layout: { x: 16, y: 20, w: 1, h: 2 } },
    { code: 'CLF180-37', brand: MachineBrand.CLF, capacity: 180, layout: { x: 17.5, y: 20, w: 1, h: 2 } },
    { code: 'CLF250-13', brand: MachineBrand.CLF, capacity: 250, layout: { x: 6, y: 20, w: 1, h: 2 } },
    { code: 'CLF400-10', brand: MachineBrand.CLF, capacity: 400, layout: { x: 2, y: 20, w: 1, h: 2 } },
    { code: 'FKI', brand: MachineBrand.OTHER, capacity: 100, type: MachineType.BLOWING, layout: { x: 4, y: 23, w: 1, h: 4 } },
    { code: 'KAIMEI-15', brand: MachineBrand.OTHER, capacity: 15, type: MachineType.BLOWING, layout: { x: 8, y: 25.5, w: 1, h: 2 } },
    { code: 'KAIMEI-09', brand: MachineBrand.OTHER, capacity: 9, type: MachineType.BLOWING, layout: { x: 8, y: 23, w: 1, h: 2 } },
    { code: 'KAIMEI-34', brand: MachineBrand.OTHER, capacity: 34, type: MachineType.BLOWING, layout: { x: 10, y: 23, w: 1, h: 2 } },
    { code: 'SMC-26', brand: MachineBrand.OTHER, capacity: 26, type: MachineType.BLOWING, layout: { x: 10, y: 25.5, w: 1, h: 2 } },
    { code: 'SMC-27', brand: MachineBrand.OTHER, capacity: 27, type: MachineType.BLOWING, layout: { x: 6, y: 23, w: 1, h: 4 } },
    { code: 'SMC-30', brand: MachineBrand.OTHER, capacity: 30, type: MachineType.BLOWING, layout: { x: 2, y: 23, w: 1, h: 4 } },
    { code: 'CLF500-18', brand: MachineBrand.CLF, capacity: 500, layout: { x: 14.5, y: 23, w: 1, h: 4 } },
    { code: 'CLF500-19', brand: MachineBrand.CLF, capacity: 500, layout: { x: 13, y: 23, w: 1, h: 4 } },
    { code: 'CLF500-22', brand: MachineBrand.CLF, capacity: 500, layout: { x: 11.5, y: 23, w: 1, h: 4 } },
    { code: 'CLF500-24', brand: MachineBrand.CLF, capacity: 500, layout: { x: 19, y: 23, w: 1, h: 4 } },
    { code: 'CLF500-25', brand: MachineBrand.CLF, capacity: 500, layout: { x: 20.5, y: 23, w: 1, h: 4 } },
    { code: 'CLF500-26', brand: MachineBrand.CLF, capacity: 500, layout: { x: 22, y: 23, w: 1, h: 4 } },
    { code: 'CLF550-27', brand: MachineBrand.CLF, capacity: 550, layout: { x: 23.5, y: 23, w: 1.5, h: 4 } },
    { code: 'CLF500-28', brand: MachineBrand.CLF, capacity: 500, layout: { x: 26, y: 23, w: 1.5, h: 4 } },
    { code: 'JAD450-01', brand: MachineBrand.JAD, capacity: 450, layout: { x: 17.5, y: 23, w: 1, h: 4 } },
    { code: 'JAD450-02', brand: MachineBrand.JAD, capacity: 450, layout: { x: 19, y: 23, w: 1, h: 4 } },
    { code: 'JAD450-03', brand: MachineBrand.JAD, capacity: 450, layout: { x: 20.5, y: 23, w: 1, h: 4 } },
    { code: 'JAD450-04', brand: MachineBrand.JAD, capacity: 450, layout: { x: 22, y: 23, w: 1, h: 4 } },
    { code: 'JAD650-01', brand: MachineBrand.JAD, capacity: 650, layout: { x: 16, y: 23, w: 1, h: 4 } },
    { code: 'JAD650-02', brand: MachineBrand.JAD, capacity: 650, layout: { x: 16, y: 23, w: 1, h: 4 } },
  ];

  const area2Data = [
    { code: 'JAD180-23', brand: MachineBrand.JAD, capacity: 180, layout: { x: 26, y: 20, w: 1.5, h: 2 } },
    { code: 'JAD180-24', brand: MachineBrand.JAD, capacity: 180, layout: { x: 28.5, y: 20, w: 1.5, h: 2 } },
    { code: 'JAD180-25', brand: MachineBrand.JAD, capacity: 180, layout: { x: 38, y: 23, w: 1.5, h: 1, rotate: 0 } },
    { code: 'JAD180-26', brand: MachineBrand.JAD, capacity: 180, layout: { x: 38, y: 24.5, w: 1.5, h: 1, rotate: 0 } },
    { code: 'JAD180-27', brand: MachineBrand.JAD, capacity: 180, layout: { x: 38, y: 26, w: 1.5, h: 1, rotate: 0 } },
    { code: 'CLF180-38', brand: MachineBrand.CLF, capacity: 180, layout: { x: 17, y: 17, w: 1, h: 2 } },
    { code: 'CLF180-39', brand: MachineBrand.CLF, capacity: 180, layout: { x: 15.5, y: 17, w: 1, h: 2 } },
    { code: 'CLF180-40', brand: MachineBrand.CLF, capacity: 180, layout: { x: 14, y: 17, w: 1, h: 2 } },
    { code: 'CLF180-47', brand: MachineBrand.CLF, capacity: 180, layout: { x: 23.5, y: 20, w: 1.5, h: 2 } },
    { code: 'CLF400-01', brand: MachineBrand.CLF, capacity: 400, layout: { x: 28.5, y: 23, w: 1.5, h: 4 } },
    { code: 'CLF400-11', brand: MachineBrand.CLF, capacity: 400, layout: { x: 31, y: 23, w: 1.5, h: 4 } },
    { code: 'CLF500-15', brand: MachineBrand.CLF, capacity: 500, layout: { x: 33.5, y: 23, w: 1.5, h: 4 } },
    { code: 'CLF500-23', brand: MachineBrand.CLF, capacity: 500, layout: { x: 36, y: 23, w: 1.5, h: 4 } },
    { code: 'CLF750-12', brand: MachineBrand.CLF, capacity: 750, layout: { x: 14.5, y: 11, w: 1, h: 5 } },
    { code: 'CLF750-13', brand: MachineBrand.CLF, capacity: 750, layout: { x: 16, y: 11, w: 1, h: 5 } },
    { code: 'CLF750-14', brand: MachineBrand.CLF, capacity: 750, layout: { x: 17.5, y: 11, w: 1, h: 5 } },
    { code: 'CLF750-15', brand: MachineBrand.CLF, capacity: 750, layout: { x: 19, y: 11, w: 1, h: 5 } },
    { code: 'CLF750-16', brand: MachineBrand.CLF, capacity: 750, layout: { x: 20.5, y: 11, w: 1, h: 5 } },
    { code: 'CLF950-04', brand: MachineBrand.CLF, capacity: 950, layout: { x: 22, y: 11, w: 1, h: 5 } },
    { code: 'CLF950-05', brand: MachineBrand.CLF, capacity: 950, layout: { x: 23.5, y: 11, w: 1, h: 5 } },
    { code: 'CLF750-17', brand: MachineBrand.CLF, capacity: 750, layout: { x: 25, y: 11, w: 1, h: 5 } },
    { code: 'CLF750-18', brand: MachineBrand.CLF, capacity: 750, layout: { x: 26.5, y: 11, w: 1, h: 5 } },
    { code: 'CLF750-19', brand: MachineBrand.CLF, capacity: 750, layout: { x: 28, y: 11, w: 1, h: 5 } },
    { code: 'CLF750-20', brand: MachineBrand.CLF, capacity: 750, layout: { x: 29.5, y: 11, w: 1, h: 5 } },
    { code: 'CLF950-06', brand: MachineBrand.CLF, capacity: 950, layout: { x: 31, y: 11, w: 1, h: 5 } },
    { code: 'CLF1500-01', brand: MachineBrand.CLF, capacity: 1500, layout: { x: 32.5, y: 11, w: 1, h: 5 } },
    { code: 'CLF2000-01', brand: MachineBrand.CLF, capacity: 2000, layout: { x: 2, y: 2, w: 4, h: 3 } },
    { code: 'CLF2000-02', brand: MachineBrand.CLF, capacity: 2000, layout: { x: 8, y: 2, w: 4, h: 3 } },
  ];

  const area3Data = [
    { code: 'CLF100-04', brand: MachineBrand.CLF, capacity: 100, layout: { x: 2, y: 17, w: 1, h: 2 } },
    { code: 'CLF180-24', brand: MachineBrand.CLF, capacity: 180, layout: { x: 6, y: 17, w: 1, h: 2 } },
    { code: 'CLF180-25', brand: MachineBrand.CLF, capacity: 180, layout: { x: 4, y: 17, w: 1, h: 2 } },
    { code: 'CLF180-41', brand: MachineBrand.CLF, capacity: 180, layout: { x: 12.5, y: 17, w: 1, h: 2 } },
    { code: 'CLF180-42', brand: MachineBrand.CLF, capacity: 180, layout: { x: 11, y: 17, w: 1, h: 2 } },
    { code: 'CLF180-43', brand: MachineBrand.CLF, capacity: 180, layout: { x: 27.5, y: 5, w: 1, h: 2, rotate: 90 } },
    { code: 'CLF180-44', brand: MachineBrand.CLF, capacity: 180, layout: { x: 29, y: 5, w: 1, h: 2, rotate: 90 } },
    { code: 'CLF180-45', brand: MachineBrand.CLF, capacity: 180, layout: { x: 30.5, y: 5, w: 1, h: 2, rotate: 90 } },
    { code: 'CLF180-46', brand: MachineBrand.CLF, capacity: 180, layout: { x: 32, y: 5, w: 1, h: 2, rotate: 90 } },
    { code: 'CLF250-07', brand: MachineBrand.CLF, capacity: 250, layout: { x: 26, y: 5, w: 1, h: 2, rotate: 90 } },
    { code: 'CLF250-10', brand: MachineBrand.CLF, capacity: 250, layout: { x: 23, y: 5, w: 1, h: 2, rotate: 90 } },
    { code: 'CLF250-19', brand: MachineBrand.CLF, capacity: 250, layout: { x: 24.5, y: 5, w: 1, h: 2, rotate: 90 } },
    { code: 'CLF750-10', brand: MachineBrand.CLF, capacity: 750, layout: { x: 6, y: 11, w: 1, h: 5 } },
    { code: 'CLF750-11', brand: MachineBrand.CLF, capacity: 750, layout: { x: 8, y: 11, w: 1, h: 5 } },
    { code: 'CLF950-02', brand: MachineBrand.CLF, capacity: 950, layout: { x: 11.5, y: 11, w: 1, h: 5 } },
    { code: 'CLF950-03', brand: MachineBrand.CLF, capacity: 950, layout: { x: 13, y: 11, w: 1, h: 5 } },
    { code: 'CLF1420-01', brand: MachineBrand.CLF, capacity: 1420, layout: { x: 2, y: 11, w: 1, h: 5 } },
    { code: 'CLF1420-02', brand: MachineBrand.CLF, capacity: 1420, layout: { x: 4, y: 11, w: 1, h: 5 } },
    { code: 'WJ2K-01', brand: MachineBrand.OTHER, capacity: 2000, layout: { x: 15, y: 2, w: 4, h: 3 } },
    { code: 'JAD110-03', brand: MachineBrand.JAD, capacity: 110, layout: { x: 10, y: 20, w: 1, h: 2 } },
    { code: 'JAD180-02', brand: MachineBrand.JAD, capacity: 180, layout: { x: 8, y: 20, w: 1, h: 2 } },
    { code: 'JAD180-22', brand: MachineBrand.JAD, capacity: 180, layout: { x: 4, y: 20, w: 1, h: 2 } },
    { code: 'JSW2K5-01', brand: MachineBrand.OTHER, capacity: 2500, layout: { x: 2, y: 6, w: 5, h: 3 } },
    { code: 'CLF3K5-01', brand: MachineBrand.CLF, capacity: 3500, layout: { x: 14, y: 7, w: 5, h: 2 } },
    { code: 'CLF4K-01', brand: MachineBrand.CLF, capacity: 4000, layout: { x: 8, y: 7, w: 5, h: 2 } },
    { code: 'KAIMEI-35', brand: MachineBrand.OTHER, capacity: 35, type: MachineType.BLOWING, layout: { x: 8, y: 17, w: 2, h: 2 } },
    { code: 'AKEI', brand: MachineBrand.OTHER, capacity: 50, type: MachineType.BLOWING, layout: { x: 33.5, y: 5, w: 1.5, h: 2 } },
    { code: 'CLF 1K-01', brand: MachineBrand.CLF, capacity: 1000, layout: { x: 10, y: 11, w: 1, h: 5 } },
  ];

  return [
    ...area1Data.map((m, i) => ({ ...m, id: `a1-${i}`, area: 1, sortOrder: i, type: m.type || MachineType.INJECTION, status: MachineStatus.RUNNING })),
    ...area2Data.map((m, i) => ({ ...m, id: `a2-${i}`, area: 2, sortOrder: i, type: MachineType.INJECTION, status: MachineStatus.RUNNING })),
    ...area3Data.map((m, i) => ({ ...m, id: `a3-${i}`, area: 3, sortOrder: i, type: m.type || MachineType.INJECTION, status: MachineStatus.RUNNING }))
  ];
};

const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<Role>(Role.OPERATOR);
  const [selectedArea, setSelectedArea] = useState<1 | 2 | 3 | 'ALL'>('ALL');
  const [machines, setMachines] = useState<Machine[]>([]);
  const [events, setEvents] = useState<DowntimeEvent[]>([]);
  const [shifts, setShifts] = useState<ShiftAssignment[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showLayout, setShowLayout] = useState(false);
  const [showShifts, setShowShifts] = useState(false);
  const [showQuickOrderModal, setShowQuickOrderModal] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      // Subscribe to user role
      const userRef = doc(db, 'users', user.uid);
      const unsubscribeUser = onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.role) {
            setUserRole(data.role as Role);
          }
        }
      });

      const unsubscribeMachines = subscribeToMachines((updatedMachines) => {
        if (updatedMachines.length === 0) {
          // If no machines in Firestore, initialize them
          initializeMachines(generateInitialMachines());
        } else {
          setMachines(updatedMachines);
        }
      });
      const unsubscribeEvents = subscribeToEvents(setEvents);
      const unsubscribeShifts = subscribeToShifts(setShifts);
      
      return () => {
        unsubscribeUser();
        unsubscribeMachines();
        unsubscribeEvents();
        unsubscribeShifts();
      };
    }
  }, [user]);

  useEffect(() => {
    if (user && machines.length > 0) {
      const machinesWithoutLayout = machines.filter(m => !m.layout);
      if (machinesWithoutLayout.length > 0) {
        console.log('Updating machines with layout data...');
        const initialMachines = generateInitialMachines();
        machinesWithoutLayout.forEach(m => {
          const initial = initialMachines.find(im => im.code === m.code);
          if (initial && initial.layout) {
            updateMachine(m.id, { layout: initial.layout });
          }
        });
      }
    }
  }, [user, machines]);

  useEffect(() => {
    if (user && machines.length > 0) {
      const initial = generateInitialMachines();
      
      // Check if we need to update sortOrder and area for existing machines
      machines.forEach(m => {
        // Special cases: Rename machines for consistency
        if (m.code === 'CLF1000-01') {
          updateMachine(m.id, { code: 'CLF 1K-01' });
          return;
        }
        if (m.code === 'CLF500-27') {
          updateMachine(m.id, { code: 'CLF550-27', capacity: 550 });
          return;
        }
        if (m.code === 'CLF2k01') {
          updateMachine(m.id, { code: 'CLF2000-01' });
          return;
        }
        if (m.code === 'CLF2k02') {
          updateMachine(m.id, { code: 'CLF2000-02' });
          return;
        }

        const matchingInitial = initial.find(im => im.code === m.code);
        if (matchingInitial) {
          const updates: any = {};
          if (m.sortOrder !== matchingInitial.sortOrder) {
            updates.sortOrder = matchingInitial.sortOrder;
          }
          if (m.area !== matchingInitial.area) {
            updates.area = matchingInitial.area;
          }
          if (Object.keys(updates).length > 0) {
            console.log(`Syncing ${m.code}:`, updates);
            updateMachine(m.id, updates);
          }
        }
      });

      const fkiMachine = machines.find(m => m.code === 'FKI');
      if (fkiMachine && fkiMachine.type !== MachineType.BLOWING) {
        console.log('Updating FKI to blowing machine...');
        updateMachine(fkiMachine.id, { type: MachineType.BLOWING });
      }
    }
  }, [user, machines]);

  const filteredMachines = useMemo(() => {
    let result = machines;
    if (selectedArea !== 'ALL') {
      result = machines.filter(m => m.area === selectedArea);
    }
    return [...result].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [machines, selectedArea]);

  const factoryStats = useMemo(() => {
    const running = filteredMachines.filter(m => m.status === MachineStatus.RUNNING).length;
    const stopped = filteredMachines.filter(m => 
      m.status === MachineStatus.STOPPED && !PLANNED_REASONS.includes(m.currentDowntimeReason || '')
    ).length;
    const noOrder = filteredMachines.filter(m => 
      m.status === MachineStatus.STOPPED && PLANNED_REASONS.includes(m.currentDowntimeReason || '')
    ).length;
    return { total: filteredMachines.length, running, stopped, noOrder };
  }, [filteredMachines]);

  const areaStats = useMemo(() => {
    const stats: Record<string, { running: number; stopped: number }> = {
      '1': { running: 0, stopped: 0 },
      '2': { running: 0, stopped: 0 },
      '3': { running: 0, stopped: 0 },
      'ALL': { running: 0, stopped: 0 }
    };

    machines.forEach(m => {
      const isStopped = m.status === MachineStatus.STOPPED;
      const areaKey = m.area.toString();
      
      if (isStopped) {
        stats[areaKey].stopped++;
        stats['ALL'].stopped++;
      } else {
        stats[areaKey].running++;
        stats['ALL'].running++;
      }
    });

    return stats;
  }, [machines]);

  const handleUpdateMachineStatus = async (machineId: string, status: MachineStatus, reason?: string) => {
    try {
      await updateFirestoreMachineStatus(machineId, status, reason);
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const [selectedMachineForAction, setSelectedMachineForAction] = useState<Machine | null>(null);
  const [showReasonModalForLayout, setShowReasonModalForLayout] = useState(false);

  const handleMachineClickInLayout = (machine: Machine) => {
    if (userRole !== Role.OPERATOR) return;
    
    setSelectedMachineForAction(machine);
    if (machine.status === MachineStatus.RUNNING) {
      setShowReasonModalForLayout(true);
    } else {
      const isAutoConfirmed = ['Cân đối sản xuất', 'Nghỉ lễ'].includes(machine.currentDowntimeReason || '');
      if (!isAutoConfirmed && !machine.maintenanceConfirmed) {
        alert(`Máy ${machine.code} đang chờ xác nhận xử lý. Vui lòng liên hệ bộ phận liên quan.`);
        return;
      }
      handleUpdateMachineStatus(machine.id, MachineStatus.RUNNING);
    }
  };

  const handleQuickNoOrder = (machineIds: string[]) => {
    machineIds.forEach(id => handleUpdateMachineStatus(id, MachineStatus.STOPPED, 'Không có đơn hàng'));
    setShowQuickOrderModal(false);
  };

  const handleResetAllStoppedMachines = async () => {
    const machinesToReset = filteredMachines.filter(m => m.status === MachineStatus.STOPPED);
    if (machinesToReset.length === 0) return;
    
    const areaText = selectedArea === 'ALL' ? 'toàn nhà máy' : `khu vực ${selectedArea}`;
    if (confirm(`Bạn có chắc chắn muốn khôi phục hoạt động cho tất cả ${machinesToReset.length} máy đang dừng ${areaText}?`)) {
      try {
        const resetPromises = machinesToReset.map(machine => handleUpdateMachineStatus(machine.id, MachineStatus.RUNNING));
        await Promise.all(resetPromises);
      } catch (error) {
        console.error('Error resetting machines:', error);
      }
    }
  };

  const handleUpdateMachineDetails = async (machineId: string, updates: Partial<Machine>) => {
    try {
      await updateMachine(machineId, updates);
    } catch (error) {
      console.error('Error updating machine details:', error);
    }
  };

  const handleSaveShiftAssignment = async (assignment: Partial<ShiftAssignment>) => {
    try {
      // Ensure RT values are saved as numbers
      const cleanedAssignment = {
        ...assignment,
        machineAssignments: assignment.machineAssignments?.map(ma => ({
          ...ma,
          standardRT: parseFloat(ma.standardRT as any) || 0,
          assignedRT: parseFloat(ma.assignedRT as any) || 0
        }))
      };

      await saveShiftAssignment(cleanedAssignment);
      
      // Auto-update machine status based on "Tắt" in shift assignment
      if (cleanedAssignment.machineAssignments) {
        for (const ma of cleanedAssignment.machineAssignments) {
          const productName = ma.productName?.trim() || '';
          const isOff = productName.toLowerCase().includes('tắt') || productName === '';
          const machine = machines.find(m => m.id === ma.machineId);
          
          // Update machine with current product and operator from shift assignment
          await handleUpdateMachineDetails(ma.machineId, {
            currentProduct: productName,
            currentOperator: ma.employeeName || ''
          });
          
          if (isOff) {
            // If marked as "Tắt", set to STOPPED with reason "TẮT (Không đơn hàng)"
            if (machine && machine.status !== MachineStatus.STOPPED) {
              await handleUpdateMachineStatus(ma.machineId, MachineStatus.STOPPED, 'TẮT (Không đơn hàng)');
            }
          } else {
            // If it has a product name, and it was stopped for "TẮT (Không đơn hàng)", set it back to RUNNING
            if (machine && machine.status === MachineStatus.STOPPED && machine.currentDowntimeReason === 'TẮT (Không đơn hàng)') {
              await handleUpdateMachineStatus(ma.machineId, MachineStatus.RUNNING);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error saving shift assignment:', error);
    }
  };

  const handleDeleteShiftAssignment = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa phân ca này?')) {
      try {
        await deleteShiftAssignment(id);
      } catch (error) {
        console.error('Error deleting shift assignment:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl overflow-hidden">
          <div className="p-8 text-center bg-slate-50 border-b border-slate-100">
            <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-200">
              <Factory className="text-white" size={32} />
            </div>
            <h1 className="text-2xl font-black text-slate-800 tracking-tight uppercase italic">SMART MOLDING</h1>
            <p className="text-slate-500 text-sm font-medium mt-1">Hệ thống giám sát sản xuất thời gian thực</p>
          </div>
          <div className="p-8">
            <div className="space-y-6">
              <div className="flex items-start gap-4 p-4 bg-blue-50 rounded-2xl border border-blue-100">
                <ShieldCheck className="text-blue-600 flex-shrink-0" size={24} />
                <div>
                  <p className="text-sm font-bold text-blue-900">Yêu cầu đăng nhập</p>
                  <p className="text-xs text-blue-700 mt-1">Vui lòng đăng nhập bằng tài khoản Google để truy cập hệ thống.</p>
                </div>
              </div>
              <button 
                onClick={loginWithGoogle}
                className="w-full flex items-center justify-center gap-3 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 active:scale-[0.98]"
              >
                <LogIn size={20} />
                Đăng nhập với Google
              </button>
            </div>
          </div>
          <div className="p-6 bg-slate-50 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">SmartMolding V1.4 • Manufacturing App</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden text-slate-900 relative">
      <Sidebar 
        userRole={userRole} 
        onRoleChange={setUserRole} 
        onShowHistory={() => setShowHistory(!showHistory)} 
        isHistoryActive={showHistory}
        onShowShifts={() => setShowShifts(!showShifts)}
        isShiftsActive={showShifts}
        user={user}
        onLogout={logout}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <main className="flex-1 overflow-y-auto p-3 md:p-6 w-full">
        <header className="mb-4 md:mb-6 bg-white p-4 md:p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
                </button>
                <div>
                  <h1 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                    <span className="text-blue-600 uppercase">
                      {showHistory ? 'Lịch Sử' : showShifts ? 'Bảng Phân Ca' : (selectedArea === 'ALL' ? 'Toàn Nhà Máy' : `Khu Vực ${selectedArea}`)}
                    </span>
                  </h1>
                  <p className="text-slate-400 text-[10px] md:text-sm font-bold uppercase tracking-wider">Hệ thống giám sát SmartMolding</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                <button 
                  onClick={() => setShowLayout(!showLayout)}
                  className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-black transition-all ${showLayout ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-500'}`}
                >
                  {showLayout ? 'DANH SÁCH' : 'SƠ ĐỒ'}
                </button>
                {[1, 2, 3, 'ALL'].map(area => (
                  <button 
                    key={area}
                    onClick={() => setSelectedArea(area as any)}
                    className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-[10px] font-black transition-all flex items-center gap-2 ${selectedArea === area ? 'bg-blue-600 text-white shadow-md shadow-blue-100' : 'bg-slate-100 text-slate-500'}`}
                  >
                    <span>{area === 'ALL' ? 'TẤT CẢ' : `KHU ${area}`}</span>
                    <div className="flex items-center gap-1">
                      <span className={`${selectedArea === area ? 'text-green-200' : 'text-green-600'}`}>{areaStats[area.toString()].running}</span>
                      <span className="opacity-30">/</span>
                      <span className={`${selectedArea === area ? 'text-red-200' : 'text-red-600'}`}>{areaStats[area.toString()].stopped}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {!showHistory && !showShifts && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                {/* Ô TỔNG MÁY */}
                <div className="bg-slate-50 px-3 py-2 rounded-xl text-center border border-slate-100 min-w-[75px] md:min-w-[100px] flex-shrink-0">
                  <p className="text-[8px] md:text-[10px] font-bold text-slate-500 uppercase">TỔNG MÁY</p>
                  <p className="text-sm md:text-xl font-black text-slate-700">{factoryStats.total}</p>
                </div>

                {/* Ô ĐANG CHẠY */}
                <div className="bg-green-50 px-3 py-2 rounded-xl text-center border border-green-100 min-w-[75px] md:min-w-[100px] flex-shrink-0">
                  <p className="text-[8px] md:text-[10px] font-bold text-green-600 uppercase">ĐANG CHẠY</p>
                  <p className="text-sm md:text-xl font-black text-green-700">{factoryStats.running}</p>
                </div>

                {/* Ô SỰ CỐ (Dừng không kế hoạch) */}
                <div className="bg-red-50 px-3 py-2 rounded-xl text-center border border-red-100 min-w-[75px] md:min-w-[100px] flex-shrink-0">
                  <p className="text-[8px] md:text-[10px] font-bold text-red-600 uppercase">SỰ CỐ</p>
                  <p className="text-sm md:text-xl font-black text-red-700">{factoryStats.stopped}</p>
                </div>

                {/* Ô DỪNG KH (Dừng theo kế hoạch) */}
                <div className="bg-blue-50 px-3 py-2 rounded-xl text-center border border-blue-100 min-w-[75px] md:min-w-[100px] flex-shrink-0">
                  <p className="text-[8px] md:text-[10px] font-bold text-blue-600 uppercase">DỪNG KH</p>
                  <p className="text-sm md:text-xl font-black text-blue-700">{factoryStats.noOrder}</p>
                </div>
                
                <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                  <button 
                    onClick={handleResetAllStoppedMachines}
                    className="bg-red-500 text-white h-full px-3 md:px-4 py-2 rounded-xl text-[9px] md:text-[10px] font-black uppercase hover:bg-red-600 transition-all shadow-lg shadow-red-500/20 flex items-center gap-1.5"
                  >
                    <span className="text-sm">🔄</span>
                    <span className="hidden sm:inline">RESET MÁY DỪNG</span>
                    <span className="sm:hidden">RESET</span>
                  </button>
                  
                  {(userRole === Role.TEAM_LEADER || userRole === Role.MANAGER) && (
                    <button 
                      onClick={() => setShowQuickOrderModal(true)}
                      className="bg-blue-100 text-blue-700 h-full px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-200 transition-all border border-blue-200"
                    >
                      📦 ĐƠN HÀNG
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="max-w-full overflow-x-hidden">
          {showHistory ? (
            <HistoryDashboard machines={machines} events={events} />
          ) : showShifts ? (
            <ShiftDashboard 
              assignments={shifts} 
              machines={machines}
              userRole={userRole} 
              userEmail={user?.email || ''}
              selectedArea={selectedArea}
              onSaveAssignment={handleSaveShiftAssignment}
              onDeleteAssignment={handleDeleteShiftAssignment}
            />
          ) : showLayout ? (
            <LayoutDashboard machines={filteredMachines} onMachineClick={handleMachineClickInLayout} />
          ) : (
            <>
              {userRole === Role.OPERATOR && (
                <OperatorDashboard 
                  machines={filteredMachines} 
                  onUpdateStatus={handleUpdateMachineStatus} 
                  onResetAll={handleResetAllStoppedMachines} 
                  shifts={shifts}
                />
              )}
              {userRole === Role.MANAGER && <ManagerDashboard machines={filteredMachines} events={events} onUpdateMachine={handleUpdateMachineDetails} onResetAll={handleResetAllStoppedMachines} />}
              {userRole === Role.MAINTENANCE && <MaintenanceDashboard machines={filteredMachines} events={events} onUpdateStatus={handleUpdateMachineStatus} onConfirmMaintenance={confirmMaintenance} onResetAll={handleResetAllStoppedMachines} />}
              {userRole === Role.TEAM_LEADER && <TeamLeaderDashboard machines={filteredMachines} events={events} onUpdateStatus={handleUpdateMachineStatus} onUpdateMachine={handleUpdateMachineDetails} onResetAll={handleResetAllStoppedMachines} />}
            </>
          )}
        </div>

        {showQuickOrderModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4 z-[100]">
            <div className="bg-white rounded-t-3xl md:rounded-3xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-4 md:p-6 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <h2 className="text-lg md:text-xl font-black text-slate-800 uppercase">Dừng máy nhanh (Không đơn hàng)</h2>
                <button onClick={() => setShowQuickOrderModal(false)} className="text-slate-400 text-2xl px-2">&times;</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 md:p-6">
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {machines.filter(m => m.status === MachineStatus.RUNNING).map(m => (
                    <button 
                      key={m.id}
                      onClick={() => handleQuickNoOrder([m.id])}
                      className="p-2 border border-slate-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-all text-center group"
                    >
                      <p className="text-[10px] font-black text-slate-700 truncate">{m.code}</p>
                      <p className="text-[7px] text-slate-400 font-bold uppercase">{m.capacity}T</p>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {showReasonModalForLayout && selectedMachineForAction && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100]">
            <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
              <div className="p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase">Báo cáo dừng máy: {selectedMachineForAction.code}</h2>
                  <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Chọn lý do chính xác</p>
                </div>
                <button onClick={() => setShowReasonModalForLayout(false)} className="text-slate-400 text-3xl hover:text-slate-600 font-light">&times;</button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50/20">
                {DOWNTIME_REASONS.map((group) => (
                  <div key={group.category} className="bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
                    <h4 className="text-[9px] font-black uppercase tracking-widest mb-3 border-b border-slate-50 pb-2 text-slate-400">{group.category}</h4>
                    <div className="grid grid-cols-1 gap-1.5">
                      {group.reasons.map(reason => (
                        <button
                          key={reason}
                          onClick={() => {
                            handleUpdateMachineStatus(selectedMachineForAction.id, MachineStatus.STOPPED, reason);
                            setShowReasonModalForLayout(false);
                            setSelectedMachineForAction(null);
                          }}
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
                 <button onClick={() => setShowReasonModalForLayout(false)} className="px-6 py-2.5 bg-white border border-slate-200 text-slate-600 rounded-xl font-black uppercase text-[10px] hover:bg-slate-100">Đóng</button>
              </div>
            </div>
          </div>
        )}
      </main>
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>
    </div>
  );
};

export default App;
