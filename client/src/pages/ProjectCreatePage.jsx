import { useNavigate } from 'react-router-dom';
import { createProject } from '../api/projects.js';
import { DashboardLayout } from '../components/DashboardLayout.jsx';
import { ProjectForm } from '../components/project/ProjectForm.jsx';
import { SectionLabel } from '../components/ui.jsx';
import { usePageTitle } from '../utils/usePageTitle.js';

export function ProjectCreatePage() {
  usePageTitle('Start a project');
  const navigate = useNavigate();

  const handleSave = async (values) => {
    const project = await createProject(values);
    navigate(`/projects/${project.id}`, {
      replace: true,
      state: {
        notice:
          values.status === 'draft'
            ? 'Draft saved. Only you can see it until you publish.'
            : 'Project published to the discovery board.',
      },
    });
  };

  return (
    <DashboardLayout>
      <main className="dashboard-main" id="main-content">
        <div className="container dashboard-main__inner">
          <div className="app-page-head app-page-head--form">
            <div>
              <SectionLabel>New project</SectionLabel>
              <h1>Turn the idea into a clear brief.</h1>
              <p>
                Write the problem, the scope, and the people you need. You can keep it private as
                a draft until the brief is ready.
              </p>
            </div>
            <span className="form-mode-note">Create mode / owner set automatically</span>
          </div>

          <ProjectForm
            mode="create"
            onSave={handleSave}
            cancelTo="/dashboard/projects"
          />
        </div>
      </main>
    </DashboardLayout>
  );
}
