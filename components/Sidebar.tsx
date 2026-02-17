
import React, { useRef } from 'react';
import { AppState, ToolType, Measurement, DiagnosticMode, ViewSettings } from '../types';

interface SidebarProps {
  appState: AppState;
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  onUpload: (files: FileList) => void;
  onReset: () => void;
  onCalibrate: () => void;
  measurements: Measurement[];
  onClear: () => void;
  scaleFactor: number;
  imageCount: number;
  thumbnails: string[];
  diagnosticMode: DiagnosticMode;
  setDiagnosticMode: (mode: DiagnosticMode) => void;
  viewSettings: ViewSettings;
  setViewSettings: React.Dispatch<React.SetStateAction<ViewSettings>>;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  appState, 
  activeTool, 
  setActiveTool, 
  onUpload, 
  onReset,
  onCalibrate,
  measurements,
  onClear,
  scaleFactor,
  imageCount,
  thumbnails,
  diagnosticMode,
  setDiagnosticMode,
  viewSettings,
  setViewSettings
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateSetting = (key: keyof ViewSettings, value: any) => {
    setViewSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <aside className="w-80 bg-slate-800 border-r border-slate-700 flex flex-col shadow-2xl z-20">
      <div className="p-6 border-b border-slate-700">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-lg">
            <i className="fa-solid fa-layer-group text-white text-xl"></i>
          </div>
          <div>
            <h2 className="font-bold text-slate-100 tracking-tight">SiteCloud Pro</h2>
            <p className="text-[10px] text-blue-400 uppercase font-bold tracking-widest">AEC Analytics</p>
          </div>
        </div>

        {appState === AppState.IDLE ? (
          <div 
            className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center transition-all cursor-pointer hover:border-blue-500 hover:bg-slate-700/50 group"
            onClick={() => fileInputRef.current?.click()}
          >
            <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => e.target.files && onUpload(e.target.files)} />
            <i className="fa-solid fa-camera-retro text-3xl mb-3 text-slate-500 group-hover:text-blue-400"></i>
            <p className="text-xs text-slate-300 font-bold uppercase">Begin Site Scanning</p>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-700 rounded-xl p-4 space-y-3">
             <div className="flex justify-between items-center text-[10px] font-bold">
                <span className="text-blue-400 uppercase">Analysis Ready</span>
                <span className="text-slate-500 font-mono">v1.2</span>
             </div>
             <button onClick={onReset} className="w-full text-[10px] text-slate-400 hover:text-white flex items-center justify-center gap-2 transition-colors py-2 border border-slate-700 rounded-lg hover:bg-slate-700">
                <i className="fa-solid fa-arrow-rotate-left"></i> 프로젝트 리셋
             </button>
          </div>
        )}
      </div>

      <div className="flex-1 p-6 overflow-y-auto custom-scrollbar space-y-8">
        {appState === AppState.VIEWING && (
          <>
            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Rendering Styles</h3>
              <div className="flex flex-col gap-2">
                {[
                  { id: DiagnosticMode.RGB, label: 'REALITY RGB', icon: 'fa-eye' },
                  { id: DiagnosticMode.HEIGHT, label: 'HEIGHT HEATMAP', icon: 'fa-temperature-half' },
                  { id: DiagnosticMode.STRUCTURE, label: 'STRUCTURE EDGE', icon: 'fa-draw-polygon' }
                ].map(mode => (
                  <button 
                    key={mode.id}
                    onClick={() => setDiagnosticMode(mode.id)}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[11px] font-bold transition-all border ${diagnosticMode === mode.id ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-900/50 border-slate-700 text-slate-400 hover:border-slate-500'}`}
                  >
                    <i className={`fa-solid ${mode.icon} w-4`}></i>
                    {mode.label}
                  </button>
                ))}
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Analytical Tools</h3>
              <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-700">
                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>SECTION CUT (Height)</span>
                    <span className="text-blue-400">{viewSettings.sectionHeight.toFixed(1)}m</span>
                  </div>
                  <input 
                    type="range" min="0" max="10" step="0.1" 
                    value={viewSettings.sectionHeight}
                    onChange={(e) => updateSetting('sectionHeight', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                  <label className="flex items-center gap-2 text-[10px] text-slate-500 cursor-pointer">
                    <input 
                      type="checkbox" checked={viewSettings.isClippingActive}
                      onChange={(e) => updateSetting('isClippingActive', e.target.checked)}
                      className="rounded border-slate-700 bg-slate-800"
                    />
                    수평 단면도 활성화
                  </label>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-bold text-slate-400">
                    <span>POINT SIZE</span>
                    <span className="text-blue-400">{(viewSettings.pointSize * 100).toFixed(0)}%</span>
                  </div>
                  <input 
                    type="range" min="0.01" max="0.15" step="0.01" 
                    value={viewSettings.pointSize}
                    onChange={(e) => updateSetting('pointSize', parseFloat(e.target.value))}
                    className="w-full h-1 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                  />
                </div>
              </div>
            </section>

            <section>
              <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Measurement</h3>
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => setActiveTool(activeTool === ToolType.MEASURE ? ToolType.NONE : ToolType.MEASURE)}
                  className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-[10px] font-bold transition-all border ${activeTool === ToolType.MEASURE ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-900 border-slate-700 text-slate-400'}`}
                >
                  <i className="fa-solid fa-ruler-combined text-lg"></i> 치수 측정
                </button>
                <button 
                  onClick={onCalibrate}
                  className="flex flex-col items-center justify-center gap-2 p-4 rounded-xl text-[10px] font-bold bg-slate-900 border border-slate-700 text-slate-400 hover:border-slate-500 transition-all"
                >
                  <i className="fa-solid fa-expand text-lg"></i> 스케일 보정
                </button>
              </div>
            </section>
          </>
        )}
      </div>

      <div className="p-4 bg-slate-900/80 border-t border-slate-700 flex flex-col gap-1">
        <div className="flex justify-between text-[9px] font-bold text-slate-600">
           <span>SYSTEM LATENCY: 12ms</span>
           <span>FP32 GPU ACCEL</span>
        </div>
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
          <div className="h-full bg-green-500/30 w-3/4"></div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
