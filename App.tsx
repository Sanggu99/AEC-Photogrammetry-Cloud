
import React, { useState, useCallback } from 'react';
import Sidebar from './components/Sidebar';
import Viewer3D from './components/Viewer3D';
import LoadingOverlay from './components/LoadingOverlay';
import { AppState, ToolType, Measurement, DiagnosticMode, ViewSettings } from './types';

const App: React.FC = () => {
  const [currentState, setCurrentState] = useState<AppState>(AppState.IDLE);
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.NONE);
  const [diagnosticMode, setDiagnosticMode] = useState<DiagnosticMode>(DiagnosticMode.RGB);
  const [viewSettings, setViewSettings] = useState<ViewSettings>({
    pointSize: 0.05,
    sectionHeight: 5,
    isClippingActive: false
  });
  
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [scaleFactor, setScaleFactor] = useState<number>(1.0);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);

  const handleUpload = useCallback((files: FileList) => {
    const urls = Array.from(files).map(file => URL.createObjectURL(file));
    setUploadedImages(urls);
    setCurrentState(AppState.UPLOADING);
    
    setTimeout(() => {
      setCurrentState(AppState.PROCESSING);
      setTimeout(() => {
        setCurrentState(AppState.VIEWING);
      }, 3000);
    }, 1000);
  }, []);

  const handleReset = useCallback(() => {
    uploadedImages.forEach(url => URL.revokeObjectURL(url));
    setCurrentState(AppState.IDLE);
    setActiveTool(ToolType.NONE);
    setMeasurements([]);
    setScaleFactor(1.0);
    setUploadedImages([]);
  }, [uploadedImages]);

  const handleAddMeasurement = (m: Measurement) => {
    setMeasurements(prev => [...prev, m]);
  };

  const handleUpdateMeasurement = (id: string, start: [number, number, number], end: [number, number, number], distance: number) => {
    setMeasurements(prev => prev.map(m => m.id === id ? { ...m, start, end, distance } : m));
  };

  const handleCalibration = () => {
    const input = prompt("현장의 실측 기준 길이를 입력하세요. (단위: mm)", (1000 * scaleFactor).toString());
    if (input !== null && !isNaN(parseFloat(input))) {
      setScaleFactor(parseFloat(input) / 1000);
    }
  };

  return (
    <div className="flex h-screen w-screen bg-slate-900 overflow-hidden select-none">
      <Sidebar 
        appState={currentState} 
        activeTool={activeTool}
        setActiveTool={setActiveTool}
        onUpload={handleUpload}
        onReset={handleReset}
        onCalibrate={handleCalibration}
        measurements={measurements}
        onClear={() => setMeasurements([])}
        scaleFactor={scaleFactor}
        imageCount={uploadedImages.length}
        thumbnails={uploadedImages.slice(0, 4)}
        diagnosticMode={diagnosticMode}
        setDiagnosticMode={setDiagnosticMode}
        viewSettings={viewSettings}
        setViewSettings={setViewSettings}
      />

      <main className="flex-1 relative">
        <div className="absolute top-4 left-4 z-10 bg-slate-800/90 backdrop-blur-md px-5 py-3 rounded-lg border border-slate-700 shadow-2xl flex flex-col pointer-events-none">
          <div className="flex items-center gap-2 mb-1">
            <i className="fa-solid fa-cube text-blue-500 text-xs"></i>
            <h1 className="text-[11px] font-black tracking-[0.2em] text-white">SITECLOUD ENGINE V2</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
               <span className={`w-1.5 h-1.5 rounded-full ${currentState === AppState.VIEWING ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' : 'bg-yellow-500 animate-pulse'}`}></span>
               <p className="text-[9px] text-slate-400 uppercase font-mono">STATE: {currentState}</p>
            </div>
            <div className="w-px h-3 bg-slate-700"></div>
            <p className="text-[9px] text-blue-400 uppercase font-mono">SCALE: 1:{ (1/scaleFactor).toFixed(0) }</p>
          </div>
        </div>

        {currentState === AppState.VIEWING ? (
          <Viewer3D 
            key={`${uploadedImages.join(',')}_${diagnosticMode}`}
            activeTool={activeTool} 
            measurements={measurements}
            onAddMeasurement={handleAddMeasurement}
            onUpdateMeasurement={handleUpdateMeasurement}
            scaleFactor={scaleFactor}
            sourceImages={uploadedImages}
            diagnosticMode={diagnosticMode}
            viewSettings={viewSettings}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-slate-950">
            <div className="relative">
              <i className="fa-solid fa-hard-hat text-7xl text-slate-800 mb-6"></i>
              <div className="absolute -top-2 -right-2 w-4 h-4 bg-blue-600 rounded-full animate-ping"></div>
            </div>
            <p className="text-slate-500 text-xs font-mono tracking-widest uppercase">Initializing AEC Workspace...</p>
          </div>
        )}

        {(currentState === AppState.UPLOADING || currentState === AppState.PROCESSING) && (
          <LoadingOverlay appState={currentState} />
        )}
      </main>
    </div>
  );
};

export default App;
