import { useEffect, useState } from "react";
import "./App.css";

const emptyProjectForm = {
  projectName: "",
  clientName: "",
  siteAddress: "",
  technician: "",
  reportDate: new Date().toISOString().split("T")[0],
};

const emptyUnitForm = {
  tag: "",
  equipmentType: "",
  manufacturer: "",
  modelNumber: "",
  serialNumber: "",
};

function App() {
  const [projects, setProjects] = useState([]);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [showUnitForm, setShowUnitForm] = useState(false);

  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);

  useEffect(() => {
    try {
      const savedProjects = localStorage.getItem("meher-projects");

      if (savedProjects) {
        setProjects(JSON.parse(savedProjects));
      }
    } catch (error) {
      console.error("Could not load projects:", error);
    }
  }, []);

  function saveProjects(updatedProjects) {
    setProjects(updatedProjects);
    localStorage.setItem(
      "meher-projects",
      JSON.stringify(updatedProjects),
    );
  }

  function updateProjectForm(event) {
    const { name, value } = event.target;

    setProjectForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function updateUnitForm(event) {
    const { name, value } = event.target;

    setUnitForm((currentForm) => ({
      ...currentForm,
      [name]: value,
    }));
  }

  function createProject(event) {
    event.preventDefault();

    if (!projectForm.projectName.trim()) {
      alert("Please enter a project name.");
      return;
    }

    const newProject = {
      id: crypto.randomUUID(),
      ...projectForm,
      createdAt: new Date().toISOString(),
      units: [],
    };

    saveProjects([newProject, ...projects]);
    setProjectForm(emptyProjectForm);
    setShowProjectForm(false);
  }

  function createUnit(event) {
    event.preventDefault();

    if (!unitForm.tag.trim()) {
      alert("Please enter an equipment tag.");
      return;
    }

    const newUnit = {
      id: crypto.randomUUID(),
      ...unitForm,
      createdAt: new Date().toISOString(),
      notes: "",
      photos: [],
    };

    const updatedProjects = projects.map((project) => {
      if (project.id !== selectedProjectId) {
        return project;
      }

      return {
        ...project,
        units: [...(project.units || []), newUnit],
      };
    });

    saveProjects(updatedProjects);
    setUnitForm(emptyUnitForm);
    setShowUnitForm(false);
  }

  function deleteUnit(unitId) {
    const confirmed = window.confirm(
      "Remove this equipment unit from the project?",
    );

    if (!confirmed) {
      return;
    }

    const updatedProjects = projects.map((project) => {
      if (project.id !== selectedProjectId) {
        return project;
      }

      return {
        ...project,
        units: project.units.filter((unit) => unit.id !== unitId),
      };
    });

    saveProjects(updatedProjects);
  }

  const selectedProject = projects.find(
    (project) => project.id === selectedProjectId,
  );

  if (selectedProject) {
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
          <button
            className="back-button"
            type="button"
            onClick={() => {
              setSelectedProjectId(null);
              setShowUnitForm(false);
            }}
          >
            ← Back to Projects
          </button>

          <section className="project-header-card">
            <p className="eyebrow">ACTIVE PROJECT</p>
            <h2>{selectedProject.projectName}</h2>

            <div className="project-information">
              <div>
                <span>Client</span>
                <strong>
                  {selectedProject.clientName || "Not entered"}
                </strong>
              </div>

              <div>
                <span>Technician</span>
                <strong>
                  {selectedProject.technician || "Not entered"}
                </strong>
              </div>

              <div>
                <span>Report Date</span>
                <strong>{selectedProject.reportDate}</strong>
              </div>

              <div>
                <span>Site Address</span>
                <strong>
                  {selectedProject.siteAddress || "Not entered"}
                </strong>
              </div>
            </div>
          </section>

          {!showUnitForm && (
            <button
              className="new-project-button"
              type="button"
              onClick={() => setShowUnitForm(true)}
            >
              <span>＋</span>
              Add Equipment Unit
            </button>
          )}

          {showUnitForm && (
            <section className="project-form-card">
              <div className="form-heading">
                <div>
                  <p className="eyebrow">NEW EQUIPMENT</p>
                  <h3>Add Unit</h3>
                </div>

                <button
                  className="close-button"
                  type="button"
                  onClick={() => setShowUnitForm(false)}
                >
                  ✕
                </button>
              </div>

              <form onSubmit={createUnit}>
                <div className="form-grid">
                  <label>
                    Equipment Tag *
                    <input
                      name="tag"
                      value={unitForm.tag}
                      onChange={updateUnitForm}
                      placeholder="e.g. AHU-1"
                    />
                  </label>

                  <label>
                    Equipment Type
                    <select
                      name="equipmentType"
                      value={unitForm.equipmentType}
                      onChange={updateUnitForm}
                    >
                      <option value="">Select equipment type</option>
                      <option value="Air Handler">Air Handler</option>
                      <option value="Packaged RTU">Packaged RTU</option>
                      <option value="Make-Up Air Unit">
                        Make-Up Air Unit
                      </option>
                      <option value="Water Source Heat Pump">
                        Water Source Heat Pump
                      </option>
                      <option value="Fan Coil">Fan Coil</option>
                      <option value="Heat Pump">Heat Pump</option>
                      <option value="Exhaust Fan">Exhaust Fan</option>
                      <option value="Condensing Unit">
                        Condensing Unit
                      </option>
                      <option value="HRV / ERV">HRV / ERV</option>
                      <option value="Other">Other</option>
                    </select>
                  </label>

                  <label>
                    Manufacturer
                    <input
                      name="manufacturer"
                      value={unitForm.manufacturer}
                      onChange={updateUnitForm}
                      placeholder="e.g. Trane"
                    />
                  </label>

                  <label>
                    Model Number
                    <input
                      name="modelNumber"
                      value={unitForm.modelNumber}
                      onChange={updateUnitForm}
                      placeholder="Model number"
                    />
                  </label>

                  <label className="full-width">
                    Serial Number
                    <input
                      name="serialNumber"
                      value={unitForm.serialNumber}
                      onChange={updateUnitForm}
                      placeholder="Serial number"
                    />
                  </label>
                </div>

                <div className="form-actions">
                  <button
                    className="cancel-button"
                    type="button"
                    onClick={() => setShowUnitForm(false)}
                  >
                    Cancel
                  </button>

                  <button className="save-button" type="submit">
                    Add Unit
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="project-section">
            <div className="section-heading">
              <h3>Equipment</h3>

              <span>
                {selectedProject.units?.length || 0}{" "}
                {selectedProject.units?.length === 1 ? "unit" : "units"}
              </span>
            </div>

            {!selectedProject.units?.length ? (
              <div className="empty-state">
                <div className="empty-icon">⚙️</div>
                <h4>No equipment added</h4>
                <p>
                  Add your first unit tag to begin the field report.
                </p>
              </div>
            ) : (
              <div className="unit-list">
                {selectedProject.units.map((unit) => (
                  <article className="unit-card" key={unit.id}>
                    <div className="unit-icon">⚙️</div>

                    <div className="unit-details">
                      <h4>{unit.tag}</h4>
                      <p>
                        {unit.equipmentType || "Equipment type not entered"}
                      </p>

                      <small>
                        {unit.manufacturer || "Manufacturer not entered"}
                        {unit.modelNumber
                          ? ` · ${unit.modelNumber}`
                          : ""}
                      </small>
                    </div>

                    <div className="unit-actions">
                      <button className="open-button" type="button">
                        Open
                      </button>

                      <button
                        className="delete-button"
                        type="button"
                        onClick={() => deleteUnit(unit.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    );
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

            <form onSubmit={createProject}>
              <div className="form-grid">
                <label>
                  Project Name *
                  <input
                    name="projectName"
                    value={projectForm.projectName}
                    onChange={updateProjectForm}
                    placeholder="e.g. Milton Hospital"
                  />
                </label>

                <label>
                  Client
                  <input
                    name="clientName"
                    value={projectForm.clientName}
                    onChange={updateProjectForm}
                    placeholder="e.g. Zencorp Mechanical"
                  />
                </label>

                <label className="full-width">
                  Site Address
                  <input
                    name="siteAddress"
                    value={projectForm.siteAddress}
                    onChange={updateProjectForm}
                    placeholder="Street, city, province"
                  />
                </label>

                <label>
                  Technician
                  <input
                    name="technician"
                    value={projectForm.technician}
                    onChange={updateProjectForm}
                    placeholder="Technician name"
                  />
                </label>

                <label>
                  Report Date
                  <input
                    type="date"
                    name="reportDate"
                    value={projectForm.reportDate}
                    onChange={updateProjectForm}
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
              <p>
                Create your first project to begin adding equipment and photos.
              </p>
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

                  <button
                    className="open-button"
                    type="button"
                    onClick={() => setSelectedProjectId(project.id)}
                  >
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