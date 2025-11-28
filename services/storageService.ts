import { Project, Theme } from '../types';
import JSZip from 'jszip';

const PROJECTS_KEY = 'muawiya_projects';
const API_KEY_STORAGE = 'muawiya_api_key';
const THEME_KEY = 'muawiya_theme';

export const saveProject = (project: Project): void => {
  try {
    const existingStr = localStorage.getItem(PROJECTS_KEY);
    const projects: Project[] = existingStr ? JSON.parse(existingStr) : [];
    
    const index = projects.findIndex(p => p.id === project.id);
    if (index >= 0) {
      projects[index] = { ...project, lastModified: Date.now() };
    } else {
      projects.unshift({ ...project, lastModified: Date.now() });
    }
    
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    sessionStorage.setItem('current_project', JSON.stringify(project));
  } catch (e) {
    console.error("Failed to save project", e);
  }
};

export const loadProjects = (): Project[] => {
  try {
    const str = localStorage.getItem(PROJECTS_KEY);
    return str ? JSON.parse(str) : [];
  } catch (e) {
    return [];
  }
};

export const deleteProject = (id: string): void => {
  try {
    const projects = loadProjects().filter(p => p.id !== id);
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    
    // Clear current if it was the deleted one
    const currentStr = sessionStorage.getItem('current_project');
    if (currentStr) {
      const current = JSON.parse(currentStr);
      if (current.id === id) {
        sessionStorage.removeItem('current_project');
      }
    }
  } catch (e) {
    console.error("Delete failed", e);
  }
};

export const renameProject = (id: string, newName: string): void => {
  const projects = loadProjects();
  const index = projects.findIndex(p => p.id === id);
  if (index >= 0) {
    projects[index].name = newName;
    localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
  }
};

export const getApiKey = (): string | null => {
  return localStorage.getItem(API_KEY_STORAGE);
};

export const setApiKey = (key: string): void => {
  localStorage.setItem(API_KEY_STORAGE, key);
};

export const getStoredTheme = (): Theme => {
  return (localStorage.getItem(THEME_KEY) as Theme) || Theme.SYSTEM;
};

export const setStoredTheme = (theme: Theme): void => {
  localStorage.setItem(THEME_KEY, theme);
};

// --- ZIP Import/Export ---

export const exportProjectZip = async (project: Project): Promise<Blob> => {
  const zip = new JSZip();
  // We strictly use the JSON format for data. Images are embedded as Base64 in the JSON.
  // This simplifies import/export significantly while meeting the single file requirement.
  const projectData = JSON.stringify(project, null, 2);
  zip.file("project.json", projectData);
  zip.file("readme.txt", "Muawiya Editing Toolkit Project\nGenerated on " + new Date().toLocaleString());
  
  return await zip.generateAsync({ type: "blob" });
};

export const importProjectZip = async (file: File): Promise<Project> => {
  const zip = await JSZip.loadAsync(file);
  const jsonFile = zip.file("project.json");
  if (!jsonFile) throw new Error("Invalid project file");
  
  const content = await jsonFile.async("string");
  const project = JSON.parse(content) as Project;
  
  // Basic validation
  if (!project.id || !project.elements) throw new Error("Corrupted project data");
  
  // Refresh ID to avoid conflicts on import
  project.id = crypto.randomUUID();
  project.name = project.name + " (Imported)";
  project.lastModified = Date.now();
  
  saveProject(project);
  return project;
};