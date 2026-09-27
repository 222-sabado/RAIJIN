import { User, Manuscript, PrinterStatus, SystemLog, UsageAnalytics, PrintJob } from '../types';

export const SEED_USERS: (User & { passwordHash: string })[] = [
  {
    id: 'user-1234',
    username: '1234',
    studentNumber: '1234',
    surname: 'PARKER',
    passwordHash: 'PARKER', // Password is surname in ALL CAPS
    fullName: 'Peter Parker',
    email: 'peter.parker@tup.edu.ph',
    role: 'student',
    department: 'Electrical Engineering',
    bio: 'Senior Electrical Engineering student at Technological University of the Philippines (TUP) researching high-efficiency electromagnetic power systems, spider-sense telemetry networks, and high-frequency RF sensors.',
  },
  {
    id: 'user-2024101',
    username: '2024101',
    studentNumber: '2024101',
    surname: 'DELACRUZ',
    passwordHash: 'DELACRUZ',
    fullName: 'Maria Dela Cruz',
    email: 'm.delacruz@student.univ.edu',
    role: 'student',
    department: 'Mechanical Engineering',
    bio: 'Mechanical Engineering researcher focusing on thermal dissipation in electric vehicle powertrain units.',
    profileImage: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'user-2024102',
    username: '2024102',
    studentNumber: '2024102',
    surname: 'REYES',
    passwordHash: 'REYES',
    fullName: 'Carlos Reyes',
    email: 'c.reyes@student.univ.edu',
    role: 'student',
    department: 'Electromechanical Engineering',
    bio: 'Electromechanical control systems enthusiast specializing in robotic actuators and pneumatic grid feedback.',
    profileImage: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'user-5678',
    username: '5678',
    studentNumber: '5678',
    surname: 'GARCIA',
    passwordHash: 'GARCIA',
    fullName: 'Elena Garcia',
    email: 'e.garcia@student.univ.edu',
    role: 'student',
    department: 'Electronics Communications',
    bio: 'Focusing on millimeter wave antenna design and high-throughput RF front-end architectures.',
    profileImage: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
  },
  {
    id: 'admin-1',
    username: 'admin_group2',
    passwordHash: '7654', // Code specified in prompt
    fullName: 'Faculty Admin Panel (Group 2)',
    email: 'admin.group2@engineering.univ.edu',
    role: 'admin',
    department: 'Faculty of Engineering & HPC Laboratory',
    bio: 'Supervisory account for R.A.I.J.I.N. Engine HPC Research Kiosk management and dataset administration.',
    profileImage: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200',
  },
];

export const INITIAL_MANUSCRIPTS: Manuscript[] = [];

export const INITIAL_PRINTER_STATUS: PrinterStatus = {
  isConnected: true,
  model: 'Epson EcoTank Pro ET-16650 Kiosk Edition (Network IPP)',
  ipAddress: '192.168.10.204',
  location: 'Main Engineering Kiosk Station #1',
  inkLevels: {
    black: 82,
    cyan: 68,
    magenta: 74,
    yellow: 61,
  },
  paperTray: {
    sheetCount: 240,
    capacity: 500,
    isTrayReady: true,
    isTrayOpen: false,
    hasPaperJam: false,
  },
  sensorTelemetry: {
    opticalStackHeightMm: 24.5,
    doorClosedSensor: true,
    snmpLatencyMs: 14,
    lastPolledTime: new Date().toLocaleTimeString(),
    protocol: 'CUPS / IPP over TLS + SNMP v3 + MQTT Kiosk Daemon',
  },
};

export const INITIAL_SYSTEM_LOGS: SystemLog[] = [
  {
    id: 'log-1',
    timestamp: new Date().toLocaleTimeString(),
    level: 'HPC_EVENT',
    source: 'R.A.I.J.I.N. Core Engine',
    message: 'R.A.I.J.I.N. Engine initialized. HPC Vector Index online (0 active documents indexed).',
    details: 'Cluster Latency: 0.28 ms | Embeddings: gemini-3.6-flash'
  },
  {
    id: 'log-2',
    timestamp: new Date().toLocaleTimeString(),
    level: 'INFO',
    source: 'Printer Hardware Daemon',
    message: 'Hardware telemetry online: Paper Tray (240 sheets), Ink (71.25%). Network IPP ready.',
    details: 'IPP Status: READY'
  }
];

export const INITIAL_USAGE_ANALYTICS: UsageAnalytics = {
  totalManuscripts: 0,
  totalStudents: 4,
  totalSearchesToday: 0,
  totalPrintsToday: 0,
  avgHpcLatencyMs: 0.38,
  searchesByCategory: {
    'Electrical': 0,
    'Electromechanical': 0,
    'Mechanical': 0,
    'Electronics Communications': 0,
  },
  popularKeywords: [],
  hpcNodeStatus: {
    activeNodes: 16,
    totalNodes: 16,
    gpuMemoryUsage: 12.4,
    ragIndexVectorCount: 0,
  },
};
