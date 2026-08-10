import { useEffect, useState } from "react";
import { getPhotosForUnit } from "./photoDb";
import { generateProjectPdf } from "./reportPdf";
import {
  getChecklistGroups,
  getChecklistSummary,
  getEnteredMeasurements,
} from "./fieldSections";

function ReportPreview({ project, onBack }) {
  const [photosByUnit, setPhotosByUnit] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let cancelled = false;
    const objectUrls = [];

    async function loadPhotos() {
      setIsLoading(true);
      setMessage("");

      try {
        const entries = await Promise.all(
          (project.units || []).map(async (unit) => {
            const photos = await getPhotosForUnit(unit.id);
            return [
              unit.id,
              photos.map((photo) => {
                const previewUrl = URL.createObjectURL(photo.blob);
                objectUrls.push(previewUrl);
                return { ...photo, previewUrl };
              }),
            ];
          }),
        );

        if (!cancelled) {
          setPhotosByUnit(Object.fromEntries(entries));
        }
      } catch (error) {
        console.error(error);

        if (!cancelled) {
          setMessage("Some report photos could not be loaded.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadPhotos();

    return () => {
      cancelled = true;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [project]);

  async function handleExport() {
    if (isExporting || isLoading) {
      return;
    }

    setIsExporting(true);
    setMessage("Preparing PDF...");

    try {
      const result = await generateProjectPdf(project, photosByUnit);
      setMessage(
        `${result.filename} downloaded (${result.pageCount} ${result.pageCount === 1 ? "page" : "pages"}).`,
      );
    } catch (error) {
      console.error(error);
      setMessage("The PDF could not be created. Please try again.");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="app report-preview-screen">
      <header className="report-preview-toolbar">
        <button type="button" onClick={onBack}>
          ← Back to Project
        </button>

        <div>
          <span>Report Preview</span>
          <strong>{project.projectName}</strong>
        </div>

        <button
          className="report-export-button"
          type="button"
          disabled={isLoading || isExporting}
          onClick={handleExport}
        >
          {isExporting ? "Preparing PDF..." : "Download PDF"}
        </button>
      </header>

      {message && <p className="report-preview-message">{message}</p>}

      <main className="report-preview-canvas">
        <article className="report-paper">
          <header className="report-cover-header">
            <div className="report-brand-mark">MC</div>

            <div>
              <strong>Meher Field</strong>
              <span>Meher Contractors Ltd.</span>
            </div>

            <p>Field Service Report</p>
          </header>

          <section className="report-project-title">
            <p>Project Report</p>
            <h1>{project.projectName}</h1>
          </section>

          <section className="report-metadata-grid">
            <ReportValue label="Client" value={project.clientName} />
            <ReportValue label="Report Date" value={formatDate(project.reportDate)} />
            <ReportValue label="Technician" value={project.technician} />
            <ReportValue label="Site Address" value={project.siteAddress} />
          </section>

          <section className="report-section">
            <ReportHeading>Equipment Summary</ReportHeading>

            {(project.units || []).length ? (
              <div className="report-equipment-table" role="table">
                <div className="report-equipment-row report-equipment-head" role="row">
                  <span>Tag</span>
                  <span>Type</span>
                  <span>Manufacturer</span>
                  <span>Model</span>
                </div>

                {project.units.map((unit) => (
                  <div className="report-equipment-row" role="row" key={unit.id}>
                    <strong>{unit.tag || "-"}</strong>
                    <span>{unit.equipmentType || "-"}</span>
                    <span>{unit.manufacturer || "-"}</span>
                    <span>{unit.modelNumber || "-"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="report-empty-copy">No equipment units added.</p>
            )}
          </section>

          {(project.units || []).map((unit) => {
            const photos = photosByUnit[unit.id] || [];

            return (
              <section className="report-unit" key={unit.id}>
                <div className="report-unit-title">
                  <div>
                    <p>Equipment Unit</p>
                    <h2>{unit.tag || "Untagged Unit"}</h2>
                  </div>
                  <span>{unit.equipmentType || "Type not entered"}</span>
                </div>

                <ReportHeading>Equipment Information</ReportHeading>

                <div className="report-metadata-grid compact">
                  <ReportValue label="Manufacturer" value={unit.manufacturer} />
                  <ReportValue label="Model Number" value={unit.modelNumber} />
                  <ReportValue label="Serial Number" value={unit.serialNumber} />
                  <ReportValue label="Supply Voltage" value={unit.supplyVoltage} />
                  <ReportValue label="Location" value={unit.location} />
                  <ReportValue label="Equipment Type" value={unit.equipmentType} />
                </div>

                <ReportChecklist
                  checklist={unit.checklist}
                  equipmentType={unit.equipmentType}
                />
                <ReportMeasurements
                  measurements={unit.measurements}
                  equipmentType={unit.equipmentType}
                />

                <ReportText title="Work Summary" value={unit.workSummary} />
                <ReportText title="Notes and Deficiencies" value={unit.notes} />

                {photos.length > 0 && (
                  <div className="report-photo-section">
                    <ReportHeading>Photo Documentation</ReportHeading>

                    <div className="report-photo-grid">
                      {photos.map((photo) => (
                        <figure key={photo.id}>
                          <img
                            src={photo.previewUrl}
                            alt={photo.caption || photo.category || "Report photo"}
                          />
                          <figcaption>
                            {photo.caption ||
                              (photo.category === "Nameplate Photo"
                                ? "Equipment nameplate"
                                : "Site photo")}
                          </figcaption>
                        </figure>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </article>
      </main>
    </div>
  );
}

function ReportHeading({ children }) {
  return <h3 className="report-heading">{children}</h3>;
}

function ReportValue({ label, value }) {
  return (
    <div className="report-value">
      <span>{label}</span>
      <strong>{value || "Not entered"}</strong>
    </div>
  );
}

function ReportText({ title, value }) {
  return (
    <section className="report-text-section">
      <ReportHeading>{title}</ReportHeading>
      <p>{value || "No information entered."}</p>
    </section>
  );
}

function ReportChecklist({ checklist = {}, equipmentType }) {
  const checklistGroups = getChecklistGroups(equipmentType);
  const summary = getChecklistSummary(checklist, equipmentType);

  return (
    <section className="report-data-section">
      <ReportHeading>Equipment Checklist</ReportHeading>
      <p className="report-section-summary">
        {summary.completed} of {summary.total} checked · {summary.passed} passed
        {summary.failed ? ` · ${summary.failed} failed` : ""}
      </p>

      <div className="report-checklist-table">
        {checklistGroups.map((group) => (
          <div key={group.title}>
            <h4>{group.title}</h4>
            {group.items.map(([id, label]) => {
              const item = checklist[id] || {};
              return (
                <div className="report-checklist-row" key={id}>
                  <span>{label}</span>
                  <strong className={`report-status-${(item.status || "unchecked").toLowerCase().replace("/", "")}`}>
                    {item.status || "Not checked"}
                  </strong>
                  <span>{item.note || "—"}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportMeasurements({ measurements = {}, equipmentType }) {
  const entries = getEnteredMeasurements(measurements, equipmentType);

  return (
    <section className="report-data-section">
      <ReportHeading>Measurements</ReportHeading>
      {entries.length ? (
        <div className="report-measurement-grid">
          {entries.map((entry) => (
            <div key={entry.id}>
              <span>{entry.label}</span>
              <strong>
                {entry.value} {entry.unit}
              </strong>
            </div>
          ))}
        </div>
      ) : (
        <p className="report-empty-copy">No measurements recorded.</p>
      )}
    </section>
  );
}

function formatDate(value) {
  if (!value) {
    return "Not entered";
  }

  const date = new Date(`${value}T12:00:00`);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

export default ReportPreview;
