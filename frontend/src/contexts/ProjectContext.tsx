import { createContext, useContext, useState, ReactNode } from 'react';

export interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
}

interface ProjectContextType {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  return (
    <ProjectContext.Provider value={{ selectedProject, setSelectedProject }}>
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}
