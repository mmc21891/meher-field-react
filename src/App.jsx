import { useEffect, useMemo, useRef, useState } from "react";
import "./App.css";
import NameplatePhoto from "./NameplatePhoto";
import ReportPreview from "./ReportPreview";
import UnitPhotos from "./UnitPhotos";
import { deletePhotosForUnit } from "./photoDb";
import { cloud, getAppUrl, isCloudConfigured } from "./cloudClient";
import {
  loadCloudProjects,
  saveCloudProjects,
} from "./cloudProjects";

const today = new Date().toISOString().split("T")[0];

const emptyProjectForm = {
  projectName: "",
  clientName: "",
  siteAddress: "",
  technician: "",
  reportDate: today,
};

const emptyUnitForm = {
  tag: "",
  equipmentType: "",
  manufacturer: "",
  modelNumber: "",
  serialNumber: "",
};

const equipmentTypes = [
  "Air Handler",
  "Packaged RTU",
  "Make-Up Air Unit",
  "Water Source Heat Pump",
  "Fan Coil",
  "Heat Pump",
  "Exhaust Fan",
  "Condensing Unit",
  "HRV / ERV",
  "Other",
];

function normalizeProjects(projects) {
  return projects.map((project) => ({
    ...project,
    units: (project.units || []).map((unit) => ({
      location: "",
      supplyVoltage: "",
      workSummary: "",
      notes: "",
      photos: [],
      ...unit,
    })),
  }));
}

function loadProjects() {
  try {
    const savedProjects = localStorage.getItem("meher-projects");

    if (!savedProjects) {
      return [];
    }

    return normalizeProjects(JSON.parse(savedProjects));
  } catch (error) {
    console.error("Could not load projects:", error);
    return [];
  }
}

function App() {
  const [projects, setProjects] = useState(loadProjects);
  const [showProjectForm, setShowProjectForm] = useState(false);
  const [showUnitForm, setShowUnitForm] = useState(false);
  const [showReportPreview, setShowReportPreview] = useState(false);

  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedUnitId, setSelectedUnitId] = useState(null);

  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [cloudSession, setCloudSession] = useState(null);
  const [cloudStatus, setCloudStatus] = useState(
    isCloudConfigured ? "Checking cloud..." : "Saved on this device",
  );
  const [showAccount, setShowAccount] = useState(false);
  const [accountEmail, setAccountEmail] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [isSigningIn, setIsSigningIn] = useState(false);
  const projectsRef = useRef(projects);
  const sessionRef = useRef(null);
  const cloudSaveTimer = useRef(null);

  useEffect(() => {
    if (!cloud) {
      return undefined;
    }

    let active = true;

    async function syncFromCloud(session) {
      setCloudStatus("Syncing...");

      try {
        const remote = await loadCloudProjects(session.user.id);
        const localProjects = projectsRef.current;
        const localUpdatedAt =
          localStorage.getItem("meher-projects-updated-at") || "";

        if (!remote) {
          const now = new Date().toISOString();
          await saveCloudProjects(session.user.id, localProjects, now);
          localStorage.setItem("meher-projects-updated-at", now);
        } else if (remote.updated_at > localUpdatedAt) {
          const remoteProjects = normalizeProjects(remote.projects || []);
          projectsRef.current = remoteProjects;
          setProjects(remoteProjects);
          localStorage.setItem(
            "meher-projects",
            JSON.stringify(remoteProjects),
          );
          localStorage.setItem(
            "meher-projects-updated-at",
            remote.updated_at,
          );
        } else if (localProjects.length || !remote.projects?.length) {
          const now = new Date().toISOString();
          await saveCloudProjects(session.user.id, localProjects, now);
          localStorage.setItem("meher-projects-updated-at", now);
        }

        setCloudStatus("Cloud synced");
      } catch (error) {
        console.error("Cloud sync failed:", error);
        setCloudStatus("Saved offline");
      }
    }

    async function connectCloud() {
      const { data, error } = await cloud.auth.getSession();

      if (!active) return;
      if (error) {
        setCloudStatus("Cloud unavailable");
        return;
      }

      sessionRef.current = data.session;
      setCloudSession(data.session);

      if (data.session) {
        await syncFromCloud(data.session);
      } else {
        setCloudStatus("Sign in to sync");
      }
    }

    connectCloud();

    const { data: listener } = cloud.auth.onAuthStateChange(
      (_event, session) => {
        sessionRef.current = session;
        setCloudSession(session);

        if (session) {
          window.setTimeout(() => syncFromCloud(session), 0);
        } else {
          setCloudStatus("Sign in to sync");
        }
      },
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
      window.clearTimeout(cloudSaveTimer.current);
    };
  }, []);

  function saveProjects(updatedProjects) {
    const updatedAt = new Date().toISOString();
    projectsRef.current = updatedProjects;
    setProjects(updatedProjects);

    localStorage.setItem(
      "meher-projects",
      JSON.stringify(updatedProjects),
    );
    localStorage.setItem("meher-projects-updated-at", updatedAt);

    if (sessionRef.current) {
      setCloudStatus("Saving...");
      window.clearTimeout(cloudSaveTimer.current);
      cloudSaveTimer.current = window.setTimeout(async () => {
        try {
          await saveCloudProjects(
            sessionRef.current.user.id,
            projectsRef.current,
            updatedAt,
          );
          setCloudStatus("Cloud synced");
        } catch (error) {
          console.error("Cloud save failed:", error);
          setCloudStatus("Saved offline");
        }
      }, 700);
    }
  }

  async function sendSignInLink(event) {
    event.preventDefault();

    if (!accountEmail.trim() || !cloud) return;

    setIsSigningIn(true);
    setAccountMessage("");

    const { error } = await cloud.auth.signInWithOtp({
      email: accountEmail.trim(),
      options: { emailRedirectTo: getAppUrl() },
    });

    setIsSigningIn(false);
    setAccountMessage(
      error
        ? error.message
        : "Check your email and tap the secure sign-in link.",
    );
  }

  async function signOut() {
    if (!cloud) return;
    await cloud.auth.signOut();
    setShowAccount(false);
    setAccountMessage("");
  }

  const headerProps = {
    session: cloudSession,
    cloudStatus,
    showAccount,
    accountEmail,
    accountMessage,
    isSigningIn,
    onOpenAccount: () => setShowAccount(true),
    onCloseAccount: () => setShowAccount(false),
    onEmailChange: (event) => setAccountEmail(event.target.value),
    onSignIn: sendSignInLink,
    onSignOut: signOut,
  };

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

    setProjectForm({
      ...emptyProjectForm,
      reportDate: new Date().toISOString().split("T")[0],
    });

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
      location: "",
      supplyVoltage: "",
      workSummary: "",
      notes: "",
      photos: [],
      createdAt: new Date().toISOString(),
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

  function updateSelectedUnit(event) {
    const { name, value } = event.target;

    const updatedProjects = projects.map((project) => {
      if (project.id !== selectedProjectId) {
        return project;
      }

      return {
        ...project,
        units: (project.units || []).map((unit) => {
          if (unit.id !== selectedUnitId) {
            return unit;
          }

          return {
            ...unit,
            [name]: value,
            updatedAt: new Date().toISOString(),
          };
        }),
      };
    });

    saveProjects(updatedProjects);
  }

  function applyDetectedUnitFields(fields) {
    const allowedFields = [
      "equipmentType",
      "manufacturer",
      "modelNumber",
      "serialNumber",
      "supplyVoltage",
    ];
    const safeFields = Object.fromEntries(
      Object.entries(fields).filter(([name]) =>
        allowedFields.includes(name),
      ),
    );
    const updatedProjects = projects.map((project) => {
      if (project.id !== selectedProjectId) {
        return project;
      }

      return {
        ...project,
        units: (project.units || []).map((unit) =>
          unit.id === selectedUnitId
            ? {
                ...unit,
                ...safeFields,
                updatedAt: new Date().toISOString(),
              }
            : unit,
        ),
      };
    });

    saveProjects(updatedProjects);
  }

  async function deleteUnit(unitId) {
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
        units: (project.units || []).filter(
          (unit) => unit.id !== unitId,
        ),
      };
    });

    saveProjects(updatedProjects);

    try {
      await deletePhotosForUnit(unitId);
    } catch (error) {
      console.error("Could not remove unit photos:", error);
    }

    if (selectedUnitId === unitId) {
      setSelectedUnitId(null);
    }
  }

  const selectedProject = useMemo(
    () =>
      projects.find(
        (project) => project.id === selectedProjectId,
      ),
    [projects, selectedProjectId],
  );

  const selectedUnit = useMemo(
    () =>
      selectedProject?.units?.find(
        (unit) => unit.id === selectedUnitId,
      ),
    [selectedProject, selectedUnitId],
  );

  if (selectedProject && showReportPreview) {
    return (
      <ReportPreview
        project={selectedProject}
        onBack={() => setShowReportPreview(false)}
      />
    );
  }

  if (selectedProject && selectedUnit) {
    return (
      <div className="app">
        <AppHeader {...headerProps} />

        <main className="dashboard">
          <button
            className="back-button"
            type="button"
            onClick={() => setSelectedUnitId(null)}
          >
            ← Back to Equipment
          </button>

          <section className="unit-header-card">
            <div>
              <p className="eyebrow">Equipment Unit</p>
              <h2>{selectedUnit.tag}</h2>

              <p>
                {selectedUnit.equipmentType ||
                  "Equipment type not entered"}
              </p>
            </div>

            <div className="save-status">
              <span className="save-dot" />
              Automatically saved
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-heading">
              <p className="eyebrow">Nameplate</p>
              <h3>Equipment Information</h3>
            </div>

            <NameplatePhoto
              projectId={selectedProject.id}
              unitId={selectedUnit.id}
              onApplyFields={applyDetectedUnitFields}
            />

            <div className="form-grid unit-detail-form">
              <label>
                Equipment Tag
                <input
                  name="tag"
                  value={selectedUnit.tag || ""}
                  onChange={updateSelectedUnit}
                  placeholder="e.g. AHU-1"
                />
              </label>

              <label>
                Equipment Type
                <select
                  name="equipmentType"
                  value={selectedUnit.equipmentType || ""}
                  onChange={updateSelectedUnit}
                >
                  <option value="">
                    Select equipment type
                  </option>

                  {equipmentTypes.map((type) => (
                    <option value={type} key={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Manufacturer
                <input
                  name="manufacturer"
                  value={selectedUnit.manufacturer || ""}
                  onChange={updateSelectedUnit}
                  placeholder="e.g. Trane"
                />
              </label>

              <label>
                Model Number
                <input
                  name="modelNumber"
                  value={selectedUnit.modelNumber || ""}
                  onChange={updateSelectedUnit}
                  placeholder="Model number"
                />
              </label>

              <label>
                Serial Number
                <input
                  name="serialNumber"
                  value={selectedUnit.serialNumber || ""}
                  onChange={updateSelectedUnit}
                  placeholder="Serial number"
                />
              </label>

              <label>
                Supply Voltage
                <input
                  name="supplyVoltage"
                  value={selectedUnit.supplyVoltage || ""}
                  onChange={updateSelectedUnit}
                  placeholder="e.g. 208 V, 3 phase"
                />
              </label>

              <label className="full-width">
                Unit Location
                <input
                  name="location"
                  value={selectedUnit.location || ""}
                  onChange={updateSelectedUnit}
                  placeholder="e.g. Rooftop or Mechanical Room 2"
                />
              </label>
            </div>
          </section>

          <section className="detail-card">
            <div className="detail-card-heading">
              <p className="eyebrow">Field Report</p>
              <h3>Work Summary</h3>
            </div>

            <textarea
              className="large-textarea"
              name="workSummary"
              value={selectedUnit.workSummary || ""}
              onChange={updateSelectedUnit}
              placeholder="Describe the work performed, startup activities, unit condition, and findings..."
            />
          </section>

          <section className="detail-card">
            <div className="detail-card-heading">
              <p className="eyebrow">Observations</p>
              <h3>Notes and Deficiencies</h3>
            </div>

            <textarea
              className="large-textarea"
              name="notes"
              value={selectedUnit.notes || ""}
              onChange={updateSelectedUnit}
              placeholder="Enter deficiencies, recommendations, follow-up items, and other field notes..."
            />
          </section>

          <UnitPhotos
            projectId={selectedProject.id}
            unitId={selectedUnit.id}
          />

          <section className="detail-card">
            <div className="detail-card-heading">
              <p className="eyebrow">Coming Next</p>
              <h3>Unit Sections</h3>
            </div>

            <div className="feature-grid">
              <button type="button" disabled>
                📋 Checklist
              </button>

              <button type="button" disabled>
                📈 Measurements
              </button>

              <button type="button" disabled>
                📷 Site Photos
              </button>

              <button
                className="feature-active"
                type="button"
                onClick={() => setShowReportPreview(true)}
              >
                📄 Report Preview
              </button>
            </div>
          </section>
        </main>
      </div>
    );
  }

  if (selectedProject) {
    return (
      <div className="app">
        <AppHeader {...headerProps} />

        <main className="dashboard">
          <button
            className="back-button"
            type="button"
            onClick={() => {
              setSelectedProjectId(null);
              setSelectedUnitId(null);
              setShowUnitForm(false);
              setShowReportPreview(false);
            }}
          >
            ← Back to Projects
          </button>

          <section className="project-header-card">
            <p className="eyebrow">Active Project</p>
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

          <div className="project-report-action">
            <button
              type="button"
              onClick={() => setShowReportPreview(true)}
            >
              <span>📄</span>
              Preview &amp; Export Report
            </button>
          </div>

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
                  <p className="eyebrow">New Equipment</p>
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
                      <option value="">
                        Select equipment type
                      </option>

                      {equipmentTypes.map((type) => (
                        <option value={type} key={type}>
                          {type}
                        </option>
                      ))}
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

                  <button
                    className="save-button"
                    type="submit"
                  >
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
                {selectedProject.units?.length === 1
                  ? "unit"
                  : "units"}
              </span>
            </div>

            {!selectedProject.units?.length ? (
              <div className="empty-state">
                <div className="empty-icon">⚙️</div>
                <h4>No equipment added</h4>

                <p>
                  Add your first unit tag to begin the field
                  report.
                </p>
              </div>
            ) : (
              <div className="unit-list">
                {selectedProject.units.map((unit) => (
                  <article
                    className="unit-card"
                    key={unit.id}
                  >
                    <div className="unit-icon">⚙️</div>

                    <div className="unit-details">
                      <h4>{unit.tag}</h4>

                      <p>
                        {unit.equipmentType ||
                          "Equipment type not entered"}
                      </p>

                      <small>
                        {unit.manufacturer ||
                          "Manufacturer not entered"}

                        {unit.modelNumber
                          ? ` · ${unit.modelNumber}`
                          : ""}
                      </small>
                    </div>

                    <div className="unit-actions">
                      <button
                        className="open-button"
                        type="button"
                        onClick={() =>
                          setSelectedUnitId(unit.id)
                        }
                      >
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
      <AppHeader {...headerProps} />

      <main className="dashboard">
        <section className="welcome">
          <p className="eyebrow">HVAC Field Reporting</p>

          <h2>Projects</h2>

          <p>
            Create and manage startup, commissioning, and
            inspection reports.
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
                <p className="eyebrow">New Report</p>
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

                <button
                  className="save-button"
                  type="submit"
                >
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
              {projects.length}{" "}
              {projects.length === 1
                ? "project"
                : "projects"}
            </span>
          </div>

          {projects.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📁</div>
              <h4>No projects yet</h4>

              <p>
                Create your first project to begin adding
                equipment and photos.
              </p>
            </div>
          ) : (
            <div className="project-list">
              {projects.map((project) => (
                <article
                  className="project-card"
                  key={project.id}
                >
                  <div className="project-icon">🏢</div>

                  <div className="project-details">
                    <h4>{project.projectName}</h4>

                    <p>
                      {project.clientName ||
                        "No client entered"}
                    </p>

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
                    onClick={() =>
                      setSelectedProjectId(project.id)
                    }
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

function AppHeader({
  session,
  cloudStatus,
  showAccount,
  accountEmail,
  accountMessage,
  isSigningIn,
  onOpenAccount,
  onCloseAccount,
  onEmailChange,
  onSignIn,
  onSignOut,
}) {
  return (
    <>
      <header className="topbar">
        <div className="brand-badge">MC</div>

        <div className="brand-copy">
          <h1>Meher Field</h1>
          <p>Meher Contractors Ltd.</p>
        </div>

        <button
          className={`cloud-account-button ${session ? "is-synced" : ""}`}
          type="button"
          onClick={onOpenAccount}
        >
          <span className="cloud-status-dot" />
          <span>{cloudStatus}</span>
        </button>
      </header>

      {showAccount && (
        <div
          className="account-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Cloud account"
          onClick={onCloseAccount}
        >
          <section
            className="account-card"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              className="account-close"
              type="button"
              onClick={onCloseAccount}
              aria-label="Close account window"
            >
              ×
            </button>

            <p className="eyebrow">Secure cloud account</p>
            <h2>{session ? "Your data is protected" : "Use Meher Field anywhere"}</h2>

            {session ? (
              <>
                <p>
                  Signed in as <strong>{session.user.email}</strong>. Projects
                  and photos sync securely across your devices.
                </p>
                <div className="account-sync-status">{cloudStatus}</div>
                <button
                  className="account-signout"
                  type="button"
                  onClick={onSignOut}
                >
                  Sign out
                </button>
              </>
            ) : isCloudConfigured ? (
              <form onSubmit={onSignIn}>
                <p>
                  Enter your email. We will send a secure sign-in link—no
                  password to remember.
                </p>
                <label>
                  Email address
                  <input
                    type="email"
                    value={accountEmail}
                    onChange={onEmailChange}
                    placeholder="you@company.com"
                    autoComplete="email"
                    required
                  />
                </label>
                <button type="submit" disabled={isSigningIn}>
                  {isSigningIn ? "Sending..." : "Email me a sign-in link"}
                </button>
                {accountMessage && (
                  <p className="account-message">{accountMessage}</p>
                )}
              </form>
            ) : (
              <p>
                Cloud setup is being connected. Your work is safely saved on
                this device in the meantime.
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}

export default App;
