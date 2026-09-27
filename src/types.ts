export type UserRole = 'student' | 'admin';

export interface User {
  id: string;
  username: string; // Student Number for students (e.g. "1234"), or Admin username ("admin_group2")
  role: UserRole;
  fullName: string;
  email: string;
  surname?: string;
  profileImage?: string;
  bio?: string;
  department?: string;
  studentNumber?: string;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export type EngineeringDiscipline = 
  | 'Electrical'
  | 'Electromechanical'
  | 'Electronics Communications'
  | 'Mechanical';

export interface Manuscript {
  id: string;
  title: string;
  authors: string[];
  publicationDate: string; // e.g. "2024-05-18" or "2025"
  category: EngineeringDiscipline;
  keywords: string[];
  abstract: string;
  fullText: string;
  pdfUrl?: string;
  pdfDataUrl?: string;
  fileBase64?: string;
  views: number;
  printsCount: number;
  hpcIndexScore?: number;
  ragSummary?: string;
  uploadedBy: string;
  createdAt: string;
  fileSize?: string;
  pageCount?: number;
}

export interface ManuscriptFilter {
  query: string;
  category?: EngineeringDiscipline | 'All';
  sortBy?: 'relevance' | 'date' | 'views' | 'title';
}

export interface PrinterStatus {
  isConnected: boolean;
  model: string;
  ipAddress: string;
  location: string;
  inkLevels: {
    black: number; // percentage 0-100
    cyan: number;
    magenta: number;
    yellow: number;
  };
  paperTray: {
    sheetCount: number; // e.g. 150
    capacity: number; // e.g. 500
    isTrayReady: boolean;
    isTrayOpen: boolean;
    hasPaperJam: boolean;
  };
  sensorTelemetry: {
    opticalStackHeightMm: number;
    doorClosedSensor: boolean;
    snmpLatencyMs: number;
    lastPolledTime: string;
    protocol: string; // e.g. "CUPS/IPP + SNMP v3 + MQTT"
  };
  activeJob?: {
    jobId: string;
    docTitle: string;
    studentName: string;
    pages: number;
    progressPercent: number;
  };
}

export interface PrintJob {
  id: string;
  manuscriptId: string;
  manuscriptTitle: string;
  studentId: string;
  studentName: string;
  timestamp: string;
  pages: number;
  status: 'Completed' | 'Printing' | 'Queued' | 'Failed';
  inkUsedPercent: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'HPC_EVENT';
  source: string;
  message: string;
  details?: string;
}

export interface UsageAnalytics {
  totalManuscripts: number;
  totalStudents: number;
  totalSearchesToday: number;
  totalPrintsToday: number;
  avgHpcLatencyMs: number;
  searchesByCategory: Record<EngineeringDiscipline, number>;
  popularKeywords: { word: string; count: number }[];
  hpcNodeStatus: {
    activeNodes: number;
    totalNodes: number;
    gpuMemoryUsage: number; // percentage
    ragIndexVectorCount: number;
  };
}
