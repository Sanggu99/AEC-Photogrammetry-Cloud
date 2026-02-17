
import React from 'react';
import { AppState } from '../types';

interface LoadingOverlayProps {
  appState: AppState;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ appState }) => {
  const isProcessing = appState === AppState.PROCESSING;

  return (
    <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/95 backdrop-blur-lg">
      <div className="relative w-64 h-64 flex items-center justify-center">
        {/* Decorative rotating border */}
        <div className="absolute inset-0 border-4 border-slate-800 rounded-full"></div>
        <div className="absolute inset-0 border-t-4 border-blue-500 rounded-full animate-spin"></div>
        
        <div className="text-center z-10 px-8">
          <i className={`fa-solid ${isProcessing ? 'fa-microchip' : 'fa-cloud-arrow-up'} text-4xl text-blue-500 mb-6 animate-pulse`}></i>
          <h2 className="text-xl font-bold text-white mb-2">
            {isProcessing ? '3D Reconstruction' : 'Data Transmission'}
          </h2>
          <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-4">
            <div className="bg-blue-600 h-full animate-[loading_2s_ease-in-out_infinite]"></div>
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-slate-400 font-medium tracking-wide animate-pulse">
        {isProcessing 
          ? '사진을 포인트 클라우드 맵으로 변환 중입니다...' 
          : '현장 데이터를 서버로 안전하게 전송하고 있습니다...'}
      </p>

      <style>{`
        @keyframes loading {
          0% { width: 0%; transform: translateX(-100%); }
          50% { width: 70%; transform: translateX(20%); }
          100% { width: 100%; transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
