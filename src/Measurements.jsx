import {
  getEnteredMeasurements,
  measurementGroups,
} from "./fieldSections";

function Measurements({ measurements = {}, onChange }) {
  const enteredCount = getEnteredMeasurements(measurements).length;

  return (
    <section className="detail-card" id="unit-measurements">
      <div className="detail-card-heading section-heading-with-summary">
        <div>
          <p className="eyebrow">Testing</p>
          <h3>Measurements</h3>
        </div>

        <span className="completion-badge">
          {enteredCount} recorded
        </span>
      </div>

      <div className="measurement-groups">
        {measurementGroups.map((group) => (
          <section className="measurement-group" key={group.title}>
            <h4>{group.title}</h4>

            <div className="measurement-grid">
              {group.fields.map(([id, label, unit]) => (
                <label key={id}>
                  <span>{label}</span>
                  <div className="measurement-input">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="any"
                      value={measurements[id] || ""}
                      onChange={(event) => onChange(id, event.target.value)}
                      placeholder="—"
                    />
                    <strong>{unit}</strong>
                  </div>
                </label>
              ))}
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}

export default Measurements;
