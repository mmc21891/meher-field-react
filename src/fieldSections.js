const universalChecklistGroups = [
  {
    title: "Installation and Safety",
    items: [
      ["unitSecure", "Unit secure, level, and properly supported"],
      ["clearances", "Service clearances are adequate"],
      ["accessPanels", "Access panels and guards secured"],
      ["disconnect", "Disconnect installed and labelled"],
    ],
  },
  {
    title: "Electrical and Controls",
    items: [
      ["wiring", "Wiring connections tight and undamaged"],
      ["grounding", "Equipment grounding verified"],
      ["voltage", "Supply voltage verified"],
      ["controls", "Thermostat and controls operate correctly"],
      ["safeties", "Safety devices tested"],
    ],
  },
  {
    title: "Final Operation",
    items: [
      ["noise", "No abnormal noise or vibration"],
      ["labels", "Equipment labels and service information present"],
    ],
  },
];

const commonAirItems = [
  ["filters", "Filters installed, clean, and correct size"],
  ["ductwork", "Ductwork and flexible connections secure"],
  ["drainage", "Condensate drainage tested"],
  ["rotation", "Fan and motor rotation verified"],
];

const checklistTemplates = {
  "Air Handler": [
    ...commonAirItems,
    ["belts", "Belts, pulleys, and bearings inspected"],
    ["vibration", "Vibration isolation installed correctly"],
    ["coilCondition", "Heating and cooling coils clean and undamaged"],
    ["dampers", "Dampers and actuators operate correctly"],
  ],
  "Packaged RTU": [
    ...commonAirItems,
    ["belts", "Belts, pulleys, and bearings inspected"],
    ["economizer", "Economizer and outdoor-air dampers tested"],
    ["refrigerantLeaks", "Refrigerant circuit checked for leaks"],
    ["heatingOperation", "Heating stages and limit controls tested"],
  ],
  "Make-Up Air Unit": [
    ...commonAirItems,
    ["belts", "Belts, pulleys, and bearings inspected"],
    ["burner", "Burner ignition and flame operation verified"],
    ["gasTrain", "Gas train and connections inspected"],
    ["airflowProving", "Airflow-proving switch tested"],
  ],
  "Water Source Heat Pump": [
    ["filters", "Filters installed, clean, and correct size"],
    ["drainage", "Condensate drainage tested"],
    ["reversingValve", "Reversing valve operates in heating and cooling"],
    ["changeover", "Heating/cooling changeover verified"],
    ["waterConnections", "Water-loop connections dry and secure"],
    ["loopFlow", "Water-loop flow verified"],
    ["strainer", "Loop strainer inspected and clean"],
    ["compressor", "Compressor operation and sound normal"],
  ],
  "Heat Pump": [
    ["filters", "Filters installed, clean, and correct size"],
    ["drainage", "Condensate drainage tested"],
    ["reversingValve", "Reversing valve operates in heating and cooling"],
    ["changeover", "Heating/cooling changeover verified"],
    ["defrost", "Defrost controls and cycle verified"],
    ["outdoorCoil", "Outdoor coil clean and unobstructed"],
    ["refrigerantLeaks", "Refrigerant circuit checked for leaks"],
    ["compressor", "Compressor operation and sound normal"],
  ],
  "Fan Coil": [
    ["filters", "Filters installed, clean, and correct size"],
    ["drainage", "Condensate drainage tested"],
    ["coilCondition", "Coil clean and undamaged"],
    ["controlValve", "Control valve and actuator operate correctly"],
    ["fanSpeeds", "All commanded fan speeds operate"],
  ],
  "Exhaust Fan": [
    ["ductwork", "Ductwork and flexible connections secure"],
    ["belts", "Belts, pulleys, and bearings inspected"],
    ["vibration", "Vibration isolation installed correctly"],
    ["rotation", "Fan and motor rotation verified"],
    ["backdraftDamper", "Backdraft damper opens and closes freely"],
    ["fanGuard", "Fan guard and weather hood secured"],
  ],
  "Condensing Unit": [
    ["refrigerantLeaks", "Refrigerant circuit checked for leaks"],
    ["coilCondition", "Condenser coil clean and undamaged"],
    ["crankcaseHeater", "Crankcase heater operation verified"],
    ["fanOperation", "Condenser fan rotation and operation verified"],
    ["compressor", "Compressor operation and sound normal"],
  ],
  "HRV / ERV": [
    ["filters", "Filters installed, clean, and correct size"],
    ["drainage", "Condensate drainage tested"],
    ["coreCondition", "Recovery core clean and correctly installed"],
    ["frostControl", "Frost-control sequence tested"],
    ["balancing", "Supply and exhaust airflow balancing verified"],
    ["dampers", "Dampers and actuators operate correctly"],
  ],
  Other: [
    ...commonAirItems,
    ["belts", "Belts, pulleys, and bearings inspected where applicable"],
    ["vibration", "Vibration isolation installed correctly"],
  ],
};

export const checklistStatuses = ["Pass", "Fail", "N/A"];

export function getChecklistGroups(equipmentType) {
  const items = checklistTemplates[equipmentType] || checklistTemplates.Other;
  return [
    ...universalChecklistGroups,
    { title: `${equipmentType || "Equipment"} Checks`, items },
  ];
}

function temperatureUnitLabel(measurements = {}) {
  return measurements.temperatureUnit === "F" ? "°F" : "°C";
}

const electricalFields = [
  ["voltageL1L2", "Voltage L1-L2", "V"],
  ["voltageL2L3", "Voltage L2-L3", "V"],
  ["voltageL1L3", "Voltage L1-L3", "V"],
  ["currentL1", "Current L1", "A"],
  ["currentL2", "Current L2", "A"],
  ["currentL3", "Current L3", "A"],
];

export function getMeasurementGroups(equipmentType, measurements = {}) {
  const temperatureUnit = temperatureUnitLabel(measurements);
  const airside = {
    title: "Airside",
    fields: [
      ["returnAirTemp", "Return-air temperature", temperatureUnit],
      ["supplyAirTemp", "Supply-air temperature", temperatureUnit],
      ["temperatureDifference", "Temperature difference", temperatureUnit],
      ["externalStaticPressure", "External static pressure", "in. w.c."],
      ["airflow", "Measured airflow", "CFM"],
      ["fanSpeed", "Fan speed", "RPM"],
    ],
  };
  const refrigeration = {
    title: "Refrigeration",
    fields: [
      ["suctionPressure", "Suction pressure", "psig"],
      ["dischargePressure", "Discharge pressure", "psig"],
      ["suctionLineTemp", "Suction-line temperature", temperatureUnit],
      ["liquidLineTemp", "Liquid-line temperature", temperatureUnit],
    ],
  };
  const waterLoop = {
    title: "Water Loop",
    fields: [
      ["enteringWaterTemp", "Entering-water temperature", temperatureUnit],
      ["leavingWaterTemp", "Leaving-water temperature", temperatureUnit],
      ["waterFlow", "Water flow", "GPM"],
      ["waterPressureDrop", "Water pressure drop", "psi"],
    ],
  };
  const operating = {
    title: "Operating Conditions",
    fields: [
      ["ambientTemp", "Ambient temperature", temperatureUnit],
      ["filterPressureDrop", "Filter pressure drop", "in. w.c."],
    ],
  };
  const electrical = { title: "Electrical", fields: electricalFields };

  if (equipmentType === "Condensing Unit") {
    return [electrical, refrigeration, operating];
  }

  if (equipmentType === "Exhaust Fan") {
    return [
      electrical,
      {
        title: "Fan Performance",
        fields: [
          ["externalStaticPressure", "External static pressure", "in. w.c."],
          ["airflow", "Measured airflow", "CFM"],
          ["fanSpeed", "Fan speed", "RPM"],
        ],
      },
    ];
  }

  if (equipmentType === "Water Source Heat Pump") {
    return [electrical, airside, refrigeration, waterLoop];
  }

  if (equipmentType === "Heat Pump" || equipmentType === "Packaged RTU") {
    return [electrical, airside, refrigeration, operating];
  }

  if (equipmentType === "Fan Coil") {
    return [electrical, airside, waterLoop];
  }

  return [electrical, airside, operating];
}

export function getChecklistSummary(checklist = {}, equipmentType) {
  const entries = getChecklistGroups(equipmentType).flatMap(
    (group) => group.items,
  );
  const completed = entries.filter(([id]) => checklist[id]?.status).length;
  const passed = entries.filter(
    ([id]) => checklist[id]?.status === "Pass",
  ).length;
  const failed = entries.filter(
    ([id]) => checklist[id]?.status === "Fail",
  ).length;

  return { total: entries.length, completed, passed, failed };
}

export function getEnteredMeasurements(measurements = {}, equipmentType) {
  return getMeasurementGroups(equipmentType, measurements).flatMap((group) =>
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

const absoluteTemperatureFields = [
  "returnAirTemp",
  "supplyAirTemp",
  "ambientTemp",
  "enteringWaterTemp",
  "leavingWaterTemp",
  "suctionLineTemp",
  "liquidLineTemp",
];

export function convertTemperatureUnit(measurements = {}, nextUnit) {
  const currentUnit = measurements.temperatureUnit || "C";
  if (currentUnit === nextUnit) return measurements;

  const converted = { ...measurements, temperatureUnit: nextUnit };

  absoluteTemperatureFields.forEach((field) => {
    const value = Number(measurements[field]);
    if (!Number.isFinite(value) || measurements[field] === "") return;
    const result =
      nextUnit === "F" ? value * (9 / 5) + 32 : (value - 32) * (5 / 9);
    converted[field] = formatTemperature(result);
  });

  const difference = Number(measurements.temperatureDifference);
  if (
    Number.isFinite(difference) &&
    measurements.temperatureDifference !== ""
  ) {
    converted.temperatureDifference = formatTemperature(
      nextUnit === "F" ? difference * (9 / 5) : difference * (5 / 9),
    );
  }

  return converted;
}

function formatTemperature(value) {
  return String(Math.round(value * 10) / 10);
}
