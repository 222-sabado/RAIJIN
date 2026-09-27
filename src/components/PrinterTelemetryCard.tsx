import React, { useState } from 'react';
import { PrinterStatus } from '../types';
import { 
  Printer, 
  Wifi, 
  WifiOff, 
  Layers, 
  Droplet, 
  Cpu, 
  Info, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Server, 
  Activity, 
  Sliders 
} from 'lucide-react';

interface PrinterTelemetryCardProps {
  status: PrinterStatus;
  onRefillPaper: () => Promise<void>;
  onToggleConnection: () => Promise<void>;
}

export const PrinterTelemetryCard: React.FC<PrinterTelemetryCardProps> = ({
  status,
  onRefillPaper,
  onToggleConnection,
}) => {
  const [showSensorDocs, setShowSensorDocs] = useState(false);
  const [loadingAction, setLoadingAction] = useState(false);

  const handleRefill = async () => {
    setLoadingAction(true);
    await onRefillPaper();
    setLoadingAction(false);
  };

  const handleToggleConn = async () => {
    setLoadingAction(true);
    await onToggleConnection();
    setLoadingAction(false);
  };

  const avgInk = Math.round(
    (status.inkLevels.black + status.inkLevels.cyan + status.inkLevels.magenta + status.inkLevels.yellow) / 4
  );

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6">
      
      {/* Top Header & Connection Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-indigo-600/10 border border-indigo-500/20 text-indigo-400 rounded-2xl">
            <Printer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-black text-white text-base uppercase italic">{status.model}</h3>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
                  status.isConnected
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {status.isConnected ? (
                  <>
                    <CheckCircle2 className="w-3 h-3" /> Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" /> Disconnected
                  </>
                )}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">
              IP: {status.ipAddress} • Location: {status.location}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={handleToggleConn}
            disabled={loadingAction}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold uppercase tracking-wider text-slate-200 rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
            title="Simulate network disconnection / reconnection"
          >
            {status.isConnected ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{status.isConnected ? 'Disconnect' : 'Connect'}</span>
          </button>

          <button
            onClick={handleRefill}
            disabled={loadingAction}
            className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-xs font-black uppercase tracking-wider text-white rounded-xl transition-all shadow-md flex items-center gap-1.5"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingAction ? 'animate-spin' : ''}`} />
            <span>Refill Paper Tray</span>
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        
        {/* Stat 1: Ink Levels */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300">
            <span className="flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-indigo-400" /> Ink Tank Levels
            </span>
            <span className="text-indigo-400 font-mono font-black">{avgInk}% Avg</span>
          </div>

          <div className="space-y-2 text-xs">
            {/* Black */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                <span>Black (K)</span>
                <span className="font-bold text-slate-200">{status.inkLevels.black}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-slate-100 rounded-full transition-all duration-500"
                  style={{ width: `${status.inkLevels.black}%` }}
                />
              </div>
            </div>

            {/* Cyan */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                <span>Cyan (C)</span>
                <span className="font-bold text-cyan-300">{status.inkLevels.cyan}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${status.inkLevels.cyan}%` }}
                />
              </div>
            </div>

            {/* Magenta */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                <span>Magenta (M)</span>
                <span className="font-bold text-pink-300">{status.inkLevels.magenta}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 rounded-full transition-all duration-500"
                  style={{ width: `${status.inkLevels.magenta}%` }}
                />
              </div>
            </div>

            {/* Yellow */}
            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1 font-mono">
                <span>Yellow (Y)</span>
                <span className="font-bold text-yellow-300">{status.inkLevels.yellow}%</span>
              </div>
              <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-400 rounded-full transition-all duration-500"
                  style={{ width: `${status.inkLevels.yellow}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Stat 2: Paper Tray Status */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-400" /> Paper Tray Status
              </span>
              <span className="text-emerald-400 font-mono font-black">
                {status.paperTray.sheetCount} / {status.paperTray.capacity} Sheets
              </span>
            </div>

            {/* Paper Stack Gauge */}
            <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden mb-3">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  status.paperTray.sheetCount > 100
                    ? 'bg-emerald-500'
                    : status.paperTray.sheetCount > 30
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${(status.paperTray.sheetCount / status.paperTray.capacity) * 100}%` }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] text-slate-300">
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-bold text-[10px]">Tray State:</span>
                <strong className={status.paperTray.isTrayOpen ? 'text-amber-400 font-black' : 'text-emerald-400 font-black'}>
                  {status.paperTray.isTrayOpen ? 'TRAY OPEN' : 'READY & CLOSED'}
                </strong>
              </div>
              <div className="p-2.5 bg-slate-900 rounded-xl border border-slate-800">
                <span className="text-slate-500 block uppercase font-bold text-[10px]">Paper Jam:</span>
                <strong className={status.paperTray.hasPaperJam ? 'text-red-400 font-black' : 'text-emerald-400 font-black'}>
                  {status.paperTray.hasPaperJam ? 'JAM DETECTED' : 'CLEAR'}
                </strong>
              </div>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-2 border-t border-slate-800">
            <span className="uppercase font-bold text-[10px]">Stack Height Sensor:</span>
            <span className="font-mono font-bold text-slate-200">{status.sensorTelemetry.opticalStackHeightMm} mm</span>
          </div>
        </div>

        {/* Stat 3: Real-time Telemetry & Protocol */}
        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
              <span className="flex items-center gap-1.5">
                <Activity className="w-4 h-4 text-purple-400" /> IoT Sensor Telemetry
              </span>
              <span className="text-xs text-slate-500 font-mono">
                {status.sensorTelemetry.snmpLatencyMs} ms
              </span>
            </div>

            <div className="space-y-2 text-[11px]">
              <div className="flex justify-between text-slate-300 border-b border-slate-900 pb-1">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Protocol:</span>
                <span className="font-bold text-purple-300 truncate max-w-[180px]">
                  {status.sensorTelemetry.protocol}
                </span>
              </div>

              <div className="flex justify-between text-slate-300 border-b border-slate-900 pb-1">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Chassis Door Sensor:</span>
                <span className={status.sensorTelemetry.doorClosedSensor ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {status.sensorTelemetry.doorClosedSensor ? 'CLOSED (SAFE)' : 'DOOR OPEN'}
                </span>
              </div>

              <div className="flex justify-between text-slate-300 border-b border-slate-900 pb-1">
                <span className="text-slate-500 uppercase text-[10px] font-bold">Last Telemetry Poll:</span>
                <span className="text-slate-300 font-mono">{status.sensorTelemetry.lastPolledTime}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowSensorDocs(!showSensorDocs)}
            className="w-full py-2 px-3 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors flex items-center justify-center space-x-1"
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>{showSensorDocs ? 'Hide Hardware Sensor Specs' : 'View Recommended Sensors & Architecture'}</span>
          </button>
        </div>
      </div>

      {/* Hardware Sensors & IoT Architecture Modal / Collapsible Section */}
      {showSensorDocs && (
        <div className="p-5 bg-slate-950 rounded-2xl border border-purple-500/30 space-y-4 text-xs text-slate-300">
          <div className="flex items-center space-x-2 text-purple-300 font-bold text-sm border-b border-slate-800 pb-2">
            <Sliders className="w-4 h-4" />
            <span>Recommended Real-Time Hardware Sensors & App Integration Guide</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
              <h4 className="font-bold text-white flex items-center gap-1">
                <Server className="w-3.5 h-3.5 text-blue-400" /> 1. Software Protocols & Apps
              </h4>
              <p className="text-slate-400 text-[11px]">
                <strong>CUPS / IPP API:</strong> Native Linux printing daemon querying ink levels directly via Internet Printing Protocol.
              </p>
              <p className="text-slate-400 text-[11px]">
                <strong>SNMP v3 Polling:</strong> Standard OIDs for RFC 3805 Printer MIB (ink level <code className="text-blue-300">1.3.6.1.2.1.43.11</code>).
              </p>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
              <h4 className="font-bold text-white flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-emerald-400" /> 2. Paper Tray & Ink Sensors
              </h4>
              <p className="text-slate-400 text-[11px]">
                <strong>IR Optical Distance Sensor:</strong> Sharp GP2Y0A21YK0F or HC-SR04 ultrasonic sensor mounted above paper tray to measure sheet stack height.
              </p>
              <p className="text-slate-400 text-[11px]">
                <strong>Photo-interrupter:</strong> Optocoupler detecting paper pass-through and jam detection.
              </p>
            </div>

            <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
              <h4 className="font-bold text-white flex items-center gap-1">
                <Activity className="w-3.5 h-3.5 text-purple-400" /> 3. Real-Time Web Telemetry
              </h4>
              <p className="text-slate-400 text-[11px]">
                <strong>MQTT Kiosk Daemon:</strong> ESP32/Raspberry Pi micro-agent streaming telemetry JSON over WebSockets every 2000ms.
              </p>
              <p className="text-slate-400 text-[11px]">
                <strong>Chassis Sensor:</strong> Magnetic Hall-effect door switch detecting open maintenance doors.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
