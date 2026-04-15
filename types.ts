
export enum MachineBrand {
  CLF = 'CLF',
  JAD = 'JAD',
  OTHER = 'OTHER'
}

export enum MachineType {
  INJECTION = 'INJECTION', // Máy ép
  BLOWING = 'BLOWING'      // Máy thổi
}

export enum MachineStatus {
  RUNNING = 'RUNNING',
  STOPPED = 'STOPPED',
  MAINTENANCE = 'MAINTENANCE'
}

export enum Role {
  OPERATOR = 'OPERATOR', // Nhân viên vận hành máy
  TEAM_LEADER = 'TEAM_LEADER', // Trưởng ca
  MAINTENANCE = 'MAINTENANCE', // Kỹ thuật
  MANAGER = 'MANAGER' // Quản lý
}

export interface Machine {
  id: string;
  code: string;
  brand: MachineBrand;
  type: MachineType;
  capacity: number;
  status: MachineStatus;
  area: number; 
  sortOrder?: number;
  currentDowntimeReason?: string;
  maintenanceConfirmed?: boolean;
  currentProduct?: string;
  currentOperator?: string;
  layout?: {
    x: number;
    y: number;
    w: number;
    h: number;
    rotate?: number;
  };
}

export interface DowntimeEvent {
  id: string;
  machineId: string;
  startTime: number;
  endTime?: number;
  reason: string;
  description?: string;
  confirmedBy?: string;
  maintenanceNotes?: string;
  category: string;
  isPlanned?: boolean;
}

export interface MachineAssignment {
  machineId: string;
  productName: string;
  employeeName?: string;
  standardRT: number;
  assignedRT: number;
  notes?: string;
}

export interface ShiftAssignment {
  id: string;
  area: number;
  shift: 'Ca 1' | 'Ca 2' | 'Ca 3';
  date: string; // YYYY-MM-DD
  operatorName: string;
  maintenanceName: string;
  teamLeaderName: string;
  machineAssignments: MachineAssignment[];
  notes?: string;
}

export const DOWNTIME_REASONS = [
  { 
    category: 'Sự Cố Kỹ Thuật', 
    reasons: [
      'Sự cố cơ',
      'Sự cố hơi, khí nén',
      'Xi đầu',
      'Sự cố khuôn',
      'Sự cố tay robot',
      'Sự cố dừng ngắn',
      'Sự cố điện',
      'Sự cố nguyên liệu',
      'Sự cố điện, hơi, nước',
      'Sự cố dao cắt',
      'Sự cố thủy lực',
      'Hư th.bị phụ (máy đ.gói, máy nạp phôi)',
      'Cúp điện'
    ] 
  },
  { 
    category: 'Vận Hành Sản Xuất', 
    reasons: [
      'Qua màu',
      'Mở máy ra hàng',
      'Thay khuôn',
      'Cài đặt hiệu chỉnh',
      'Xả keo',
      'Thử khuôn',
      'Thử mẫu thử màu',
      'Nguyên nhân khác'
    ] 
  },
  { 
    category: 'Chờ Đợi & Nhân Sự', 
    reasons: [
      'Chờ lên khuôn',
      'Chờ thay khuôn bị động',
      'Chờ KT chỉnh máy',
      'Hết nguyên liệu',
      'Thiếu nhân sự'
    ] 
  },
  { 
    category: 'Kế Hoạch & Hệ Thống', 
    reasons: [
      'Không có đơn hàng',
      'Bảo trì',
      'Cân đối sản xuất',
      'Nghỉ lễ'
    ] 
  }
];
