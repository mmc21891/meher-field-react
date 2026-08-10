import {
  checklistGroups,
  checklistStatuses,
  getChecklistSummary,
} from "./fieldSections";

function EquipmentChecklist({ checklist = {}, onChange }) {
  const summary = getChecklistSummary(checklist);

  return (
    <section className="detail-card" id="unit-checklist">
      <div className="detail-card-heading section-heading-with-summary">
        <div>
          <p className="eyebrow">Inspection</p>
          <h3>Equipment Checklist</h3>
        </div>

        <span className="completion-badge">
          {summary.completed}/{summary.total} checked
        </span>
      </div>

      {summary.failed > 0 && (
        <p className="checklist-alert">
          {summary.failed} failed item{summary.failed === 1 ? "" : "s"} — add
          details before completing the report.
        </p>
      )}

      <div className="checklist-groups">
        {checklistGroups.map((group) => (
          <section className="checklist-group" key={group.title}>
            <h4>{group.title}</h4>

            {group.items.map(([id, label]) => {
              const item = checklist[id] || {};

              return (
                <div className="checklist-row" key={id}>
                  <label htmlFor={`check-${id}`}>{label}</label>
                  <select
                    id={`check-${id}`}
                    value={item.status || ""}
                    onChange={(event) =>
                      onChange(id, "status", event.target.value)
                    }
                    className={item.status ? `status-${item.status.toLowerCase().replace("/", "")}` : ""}
                  >
                    <option value="">Not checked</option>
                    {checklistStatuses.map((status) => (
                      <option value={status} key={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                  <input
                    value={item.note || ""}
                    onChange={(event) =>
                      onChange(id, "note", event.target.value)
                    }
                    placeholder="Optional note"
                    aria-label={`${label} note`}
                  />
                </div>
              );
            })}
          </section>
        ))}
      </div>
    </section>
  );
}

export default EquipmentChecklist;

