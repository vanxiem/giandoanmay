
import React, { useEffect, useRef, useState } from 'react';
import { Machine, MachineStatus } from '../types';
import { motion } from 'motion/react';

interface LayoutDashboardProps {
  machines: Machine[];
  onMachineClick: (machine: Machine) => void;
}

const LayoutDashboard: React.FC<LayoutDashboardProps> = ({ machines, onMachineClick }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const gridStep = 40;
  const layoutWidth = 1600;
  const layoutHeight = 1000;

  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.clientWidth;
        const containerHeight = containerRef.current.clientHeight;
        
        // Calculate scale to fit width (with some padding)
        const scaleX = (containerWidth - 32) / layoutWidth;
        const scaleY = (containerHeight - 32) / layoutHeight;
        
        // Use the smaller scale to ensure it fits both width and height, or just fit width on mobile
        const isMobile = window.innerWidth < 768;
        const newScale = isMobile ? scaleX : Math.min(scaleX, scaleY, 1);
        
        setScale(Math.max(0.2, newScale)); // Prevent it from getting too small
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  const PLANNED_REASONS = ['Không có đơn hàng', 'Bảo trì', 'Cân đối sản xuất', 'Nghỉ lễ'];

  return (
    <div 
      ref={containerRef}
      className="bg-slate-900 rounded-3xl p-4 md:p-8 overflow-auto min-h-[600px] md:min-h-[800px] relative border border-slate-800 shadow-2xl flex items-center justify-center"
    >
      {/* Grid Background */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `linear-gradient(#475569 1px, transparent 1px), linear-gradient(90deg, #475569 1px, transparent 1px)`,
          backgroundSize: `${gridStep * scale}px ${gridStep * scale}px`
        }}
      />

      <div 
        className="relative origin-center md:origin-top-left transition-transform duration-300" 
        style={{ 
          width: `${layoutWidth}px`, 
          height: `${layoutHeight}px`,
          transform: `scale(${scale})`
        }}
      >
        {machines.map((machine) => {
          if (!machine.layout) return null;

          const { x, y, w, h, rotate } = machine.layout;
          const isPlanned = PLANNED_REASONS.includes(machine.currentDowntimeReason || '');
          
          let statusBg = 'bg-green-500 text-white shadow-[0_0_10px_rgba(34,197,94,0.4)]';
          if (machine.status === MachineStatus.STOPPED) {
            statusBg = 'bg-red-500 text-white shadow-[0_0_10px_rgba(239,68,68,0.5)]';
            if (isPlanned) {
              statusBg = 'bg-red-400 text-white shadow-[0_0_10px_rgba(248,113,113,0.4)]'; // Slightly lighter red for planned stop
            }
          }

          return (
            <motion.div
              key={machine.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.05, zIndex: 10, filter: 'brightness(1.2)' }}
              onClick={() => onMachineClick(machine)}
              className={`absolute cursor-pointer border border-white/20 rounded-md flex flex-col items-center justify-center p-0.5 transition-all ${statusBg}`}
              style={{
                left: x * gridStep,
                top: y * gridStep,
                width: w * gridStep - 6,
                height: h * gridStep - 6,
                transform: rotate ? `rotate(${rotate}deg)` : 'none',
              }}
            >
              <span className="text-[8px] md:text-[9px] font-black tracking-tighter text-center leading-tight uppercase px-1 drop-shadow-md">
                {machine.code}
              </span>
              
              {machine.currentOperator && (
                <span className="text-[6px] font-bold opacity-90 truncate w-full text-center px-0.5 leading-none mt-0.5">
                  {machine.currentOperator}
                </span>
              )}
              
              {machine.status === MachineStatus.STOPPED && !machine.maintenanceConfirmed && !isPlanned && (
                <div className="absolute top-0 right-0 w-2 h-2 bg-white rounded-full animate-pulse m-0.5 shadow-[0_0_5px_white]" />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="fixed bottom-4 right-4 md:bottom-10 md:right-10 bg-slate-800/95 backdrop-blur-md p-3 md:p-5 rounded-xl md:rounded-2xl border border-slate-700 flex flex-col gap-2 shadow-2xl z-50 scale-75 md:scale-100 origin-bottom-right">
        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">Trạng thái</p>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-green-500" />
          <span className="text-[10px] font-bold text-slate-300 uppercase">Đang chạy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-red-500" />
          <span className="text-[10px] font-bold text-slate-300 uppercase">Đang dừng</span>
        </div>
      </div>
    </div>
  );
};

export default LayoutDashboard;
