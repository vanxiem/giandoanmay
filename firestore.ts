
import { 
  collection, 
  doc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  query, 
  where, 
  serverTimestamp,
  getDocs,
  addDoc,
  deleteDoc
} from 'firebase/firestore';
import { db } from './firebase.ts';
import { Machine, DowntimeEvent, MachineStatus, ShiftAssignment } from './types';

export const subscribeToShifts = (callback: (shifts: ShiftAssignment[]) => void) => {
  const q = collection(db, 'shifts');
  return onSnapshot(q, (snapshot) => {
    const shifts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftAssignment));
    callback(shifts);
  });
};

export const saveShiftAssignment = async (assignment: Partial<ShiftAssignment>) => {
  if (assignment.id) {
    const shiftRef = doc(db, 'shifts', assignment.id);
    await updateDoc(shiftRef, { ...assignment });
  } else {
    await addDoc(collection(db, 'shifts'), {
      ...assignment,
      createdAt: serverTimestamp()
    });
  }
};

export const deleteShiftAssignment = async (id: string) => {
  await deleteDoc(doc(db, 'shifts', id));
};

export const subscribeToMachines = (callback: (machines: Machine[]) => void) => {
  const q = collection(db, 'machines');
  return onSnapshot(q, (snapshot) => {
    const machines = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Machine));
    callback(machines);
  });
};

export const subscribeToEvents = (callback: (events: DowntimeEvent[]) => void) => {
  const q = collection(db, 'events');
  return onSnapshot(q, (snapshot) => {
    const events = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DowntimeEvent));
    callback(events);
  });
};

export const updateMachine = async (machineId: string, updates: Partial<Machine>) => {
  const machineRef = doc(db, 'machines', machineId);
  await updateDoc(machineRef, {
    ...updates,
    lastUpdated: serverTimestamp()
  });
};

export const confirmMaintenance = async (machineId: string) => {
  const machineRef = doc(db, 'machines', machineId);
  await updateDoc(machineRef, {
    maintenanceConfirmed: true,
    lastUpdated: serverTimestamp()
  });
};

export const updateMachineStatus = async (machineId: string, status: MachineStatus, reason?: string) => {
  const machineRef = doc(db, 'machines', machineId);
  // Reasons that are AUTOMATICALLY confirmed (not locked)
  const autoConfirmedReasons = ['Cân đối sản xuất', 'Nghỉ lễ'];
  const isAutoConfirmed = autoConfirmedReasons.includes(reason || '');
  
  // Reasons that are considered "Planned" for stats
  const plannedReasons = ['Không có đơn hàng', 'Bảo trì', 'Cân đối sản xuất', 'Nghỉ lễ'];
  const isPlanned = plannedReasons.includes(reason || '');
  
  await updateDoc(machineRef, {
    status,
    currentDowntimeReason: reason || null,
    maintenanceConfirmed: status === MachineStatus.STOPPED ? isAutoConfirmed : false,
    lastUpdated: serverTimestamp()
  });

  if (status === MachineStatus.STOPPED && reason) {
    await addDoc(collection(db, 'events'), {
      machineId,
      startTime: Date.now(),
      reason,
      category: 'Hệ thống',
      isPlanned: isPlanned
    });
  } else if (status === MachineStatus.RUNNING) {
    // Find active events and close them
    const q = query(collection(db, 'events'), where('machineId', '==', machineId));
    const querySnapshot = await getDocs(q);
    const closePromises = querySnapshot.docs
      .filter(doc => !doc.data().endTime)
      .map(doc => updateDoc(doc.ref, { endTime: Date.now() }));
    await Promise.all(closePromises);
  }
};

export const initializeMachines = async (machines: Machine[]) => {
  const batch = machines.map(async (m) => {
    await setDoc(doc(db, 'machines', m.id), m);
  });
  await Promise.all(batch);
};
