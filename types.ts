export enum Language {
  ENGLISH = 'en',
  URDU = 'ur',
}

export enum Theme {
  LIGHT = 'light',
  DARK = 'dark',
  SYSTEM = 'system',
}

export enum ElementType {
  TEXT = 'text',
  IMAGE = 'image',
  SHAPE = 'shape',
}

export interface CanvasElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
  isLocked: boolean;
  zIndex: number;
  
  // Text specific
  content?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  textAlign?: 'left' | 'center' | 'right';
  isBold?: boolean;
  isItalic?: boolean;
  
  // Image specific
  src?: string;
  filter?: string; // grayscale, sepia etc
  
  // Shape specific
  shapeType?: 'rectangle' | 'circle' | 'triangle' | 'star';
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
}

export interface Project {
  id: string;
  name: string;
  lastModified: number;
  width: number;
  height: number;
  backgroundColor: string;
  backgroundImage?: string;
  elements: CanvasElement[];
  generatedAssets: string[]; // History of AI generated images
}

export interface AppState {
  currentProject: Project | null;
  selectedElementId: string | null;
  clipboard: CanvasElement | null;
  history: Project[]; // For undo/redo
  historyIndex: number;
}

export interface Translation {
  [key: string]: {
    en: string;
    ur: string;
  };
}