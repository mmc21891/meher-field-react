export const checklistGroups = [
  {
    title: "Installation",
    items: [
      ["unitSecure", "Unit secure, level, and properly supported"],
      ["clearances", "Service clearances are adequate"],
      ["filters", "Filters installed, clean, and correct size"],
      ["accessPanels", "Access panels and guards secured"],
    ],
  },
  {
    title: "Electrical",
    items: [
      ["disconnect", "Disconnect installed and labelled"],
      ["wiring", "Wiring connections tight and undamaged"],
      ["grounding", "Equipment grounding verified"],
      ["voltage", "Supply voltage verified"],
    ],
  },
  {
    title: "Mechanical",
    items: [
      ["ductwork", "Ductwork and flexible connections secure"],
      ["drainage", "Condensate drainage tested"],
      ["belts", "Belts, pulleys, and bearings inspected"],
      ["vibration", "Vibration isolation installed correctly"],
    ],
  },
  {
    title: "Startup and Controls",
    items: [
      ["rotation", "Fan and motor rotation verified"],
      ["controls", "Thermostat and controls operate correctly"],
      ["safeties", "Safety devices tested"],
      ["noise", "No abnormal noise or vibration"],
    ],
  },
];

export const checklistStatuses = ["Pass", "Fail", "N/A"];

export const measurementGroups = [
  {
    title: "Electrical",
    fields: [
      ["voltageL1L2", "Voltage L1-L2", "V"],
      ["voltageL2L3", "Voltage L2-L3", "V"],
      ["voltageL1L3", "Voltage L1-L3", "V"],
      ["currentL1", "Current L1", "A"],
      ["currentL2", "Current L2", "A"],
      ["currentL3", "Current L3", "A"],
    ],
  },
  {
    title: "Airside",
    fields: [
      ["returnAirTemp", "Return-air temperature", "°C"],
      ["supplyAirTemp", "Supply-air temperature", "°C"],
      ["temperatureDifference", "Temperature difference", "°C"],
      ["externalStaticPressure", "External static pressure", "in. w.c."],
      ["airflow", "Measured airflow", "CFM"],
    ],
  },
  {
    title: "Refrigeration / Hydronic",
    fields: [
      ["suctionPressure", "Suction pressure", "psig"],
      ["dischargePressure", "Discharge pressure", "psig"],
      ["enteringWaterTemp", "Entering-water temperature", "°C"],
      ["leavingWaterTemp", "Leaving-water temperature", "°C"],
    ],
  },
  {
    title: "Operating Conditions",
    fields: [
      ["ambientTemp", "Ambient temperature", "°C"],
      ["fanSpeed", "Fan speed", "RPM"],
      ["filterPressureDrop", "Filter pressure drop", "in. w.c."],
    ],
  },
];

export function getChecklistSummary(checklist = {}) {
  const entries = checklistGroups.flatMap((group) => group.items);
  const completed = entries.filter(([id]) => checklist[id]?.status).length;
  const passed = entries.filter(
    ([id]) => checklist[id]?.status === "Pass",
  ).length;
  const failed = entries.filter(
    ([id]) => checklist[id]?.status === "Fail",
  ).length;

  return { total: entries.length, completed, passed, failed };
}

export function getEnteredMeasurements(measurements = {}) {
  return measurementGroups.flatMap((group) =>
    group.fields
      .filter(([id]) => String(measurements[id] || "").trim())
      .map(([id, label, unit]) => ({
        id,
        group: group.title,
        label,
        unit,
        value: measurements[id],
      })),
  );
}

