import { useEffect, useState } from "react";
import "./App.css";

function App() {
  const [projects, setProjects] = useState([]);
  const [showProjectForm, setShowProjectForm] = useState(false);

  const [form, setForm] = useState({
    projectName: "",
    clientName: "",
    siteAddress: "",
    technician: "",
    reportDate: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const savedProjects = localStorage.getItem("meher-projects");

    if (savedProjects) {
      setProjects(JSON.parse(savedProjects));
    }
  }, []);

  function updateForm(event) {
    const { name, value } = event.target;

    setForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function saveProject(event) {
    event.preventDefault();

    if (!form.projectName.trim()) {
      alert("Please enter a project name.");
      return;
    }

    const newProject = {
      id: crypto.randomUUID(),
      ...form,
      createdAt: new Date().toISOString(),
      units: [],
    };

    const updatedProjects = [newProject, ...projects];

    setProjects(updatedProjects);

    localStorage.setItem(
      "meher-projects",
      JSON.stringify(updatedProjects),
    );

    setForm({
      projectName: "",
      clientName: "",
      siteAddress: "",
      technician: "",
      reportDate: new Date().toISOString().split("T")[0],
    });

    setShowProjectForm(false);
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand-badge">MC</div>

        <div>
          <h1>Meher Field</h1>
          <p>Meher Contractors Ltd.</p>
        </div>
      </header>

      <main className="dashboard">
        <section className="welcome">
          <p className="eyebrow">HVAC FIELD REPORTING</p>
          <h2>Projects</h2>
          <p>
            Create and manage startup, commissioning, and inspection reports.
          </p>
        </section>

        {!showProjectForm && (
          <button
            className="new-project-button"
            type="button"
            onClick={() => setShowProjectForm(true)}
          >
            <span>＋</span>
            New Project
          </button>
        )}

        {showProjectForm && (
          <section className="project-form-card">
            <div className="form-heading">
              <div>
                <p className="eyebrow">NEW REPORT</p>
                <h3>Create Project</h3>
              </div>

              <button
                className="close-button"
                type="button"
                onClick={() => setShowProjectForm(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={saveProject}>
              <div className="form-grid">
                <label>
                  Project Name *
                  <input
                    name="projectName"
                    value={form.projectName}
                    onChange={updateForm}
                    placeholder="e.g. Milton Hospital"
                  />
                </label>

                <label>
                  Client
                  <input
                    name="clientName"
                    value={form.clientName}
                    onChange={updateForm}
                    placeholder="e.g. Zencorp Mechanical"
                  />
                </label>

                <label className="full-width">
                  Site Address
                  <input
                    name="siteAddress"
                    value={form.siteAddress}
                    onChange={updateForm}
                    placeholder="Street, city, province"
                  />
                </label>

                <label>
                  Technician
                  <input
                    name="technician"
                    value={form.technician}
                    onChange={updateForm}
                    placeholder="Technician name"
                  />
                </label>

                <label>
                  Report Date
                  <input
                    type="date"
                    name="reportDate"
                    value={form.reportDate}
                    onChange={updateForm}
                  />
                </label>
              </div>

              <div className="form-actions">
                <button
                  className="cancel-button"
                  type="button"
                  onClick={() => setShowProjectForm(false)}
                >
                  Cancel
                </button>

                <button className="save-button" type="submit">
                  Create Project
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="project-section">
          <div className="section-heading">
            <h3>Recent Projects</h3>
            <span>
              {projects.length} {projects.length === 1 ? "project" : "projects"}
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h4>No projects yet</h4>
              <p>Create your first project to begin adding equipment and photos.</p>
            </div>
          ) : (
            <div className="project-list">
              {projects.map((project) => (
                <article className="project-card" key={project.id}>
                  <div className="project-icon">🏢</div>

                  <div className="project-details">
                    <h4>{project.projectName}</h4>
                    <p>{project.clientName || "No client entered"}</p>
                    <small>
                      {project.reportDate}
                      {project.technician
                        ? ` · ${project.technician}`
                        : ""}
                    </small>
                  </div>

                  <button className="open-button" type="button">
                    Open
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;