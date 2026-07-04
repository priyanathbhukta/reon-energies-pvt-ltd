import React, { useState, useEffect } from 'react';
import ProjectsList from './ProjectsList';
import AddProjectForm from './AddProjectForm';
import ProjectDetail from './ProjectDetail';
import { API } from '@/lib/legacy-api';

export default function ProjectsTab() {
  const [view, setView] = useState('list'); // 'list', 'add', 'detail', 'edit'
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [editProjectData, setEditProjectData] = useState(null);

  const token = localStorage.getItem('reon_admin_token');
  const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

  const fetchProjects = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/projects`, { headers });
      if (res.ok) {
        const data = await res.json();
        setProjects(data);
      } else {
        console.error('Failed to fetch projects');
      }
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const handleProjectAdded = () => {
    fetchProjects();
    setView('list');
  };

  const handleViewProject = (id) => {
    setSelectedProjectId(id);
    setView('detail');
  };

  const handleEditProject = (project) => {
    setEditProjectData(project);
    setView('edit');
  };

  const handleBackToList = () => {
    setSelectedProjectId(null);
    setEditProjectData(null);
    setView('list');
    fetchProjects(); // Refresh list in case of updates
  };

  return (
    <div className="w-full">
      {view === 'list' && (
        <ProjectsList 
          projects={projects} 
          loading={loading}
          onAddClick={() => setView('add')} 
          onViewClick={handleViewProject}
          onDelete={fetchProjects}
        />
      )}
      
      {view === 'add' && (
        <AddProjectForm 
          onCancel={() => setView('list')} 
          onSuccess={handleProjectAdded}
        />
      )}

      {view === 'edit' && editProjectData && (
        <AddProjectForm 
          onCancel={() => setView('detail')} 
          onSuccess={() => { fetchProjects(); setView('detail'); }}
          initialData={editProjectData}
        />
      )}
      
      {view === 'detail' && selectedProjectId && (
        <ProjectDetail 
          projectId={selectedProjectId}
          onBack={handleBackToList}
          onEdit={(project) => handleEditProject(project)}
          onDeleted={handleBackToList}
        />
      )}
    </div>
  );
}
