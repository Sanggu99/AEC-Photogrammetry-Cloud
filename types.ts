
export enum AppState {
  IDLE = 'IDLE',
  UPLOADING = 'UPLOADING',
  PROCESSING = 'PROCESSING',
  VIEWING = 'VIEWING'
}

export enum ToolType {
  NONE = 'NONE',
  MEASURE = 'MEASURE',
  CALIBRATE = 'CALIBRATE'
}

export enum DiagnosticMode {
  RGB = 'RGB',
  HEIGHT = 'HEIGHT',
  STRUCTURE = 'STRUCTURE' // New mode for structural edge highlighting
}

export interface ViewSettings {
  pointSize: number;
  sectionHeight: number; // For clipping plane
  isClippingActive: boolean;
}

export interface Measurement {
  id: string;
  start: [number, number, number];
  end: [number, number, number];
  distance: number;
}
