const manufacturers = [
  "AAON", "Bosch", "Bryant", "Carrier", "Daikin", "Fujitsu",
  "Goodman", "Johnson Controls", "Keeprite", "Lennox", "LG",
  "Liebert", "McQuay", "Mitsubishi Electric", "Napoleon", "Rheem",
  "Ruud", "Samsung", "Tempstar", "Trane", "York",
];

export async function readNameplate(blob, onProgress = () => {}) {
  const { createWorker } = await import("tesseract.js");
  let worker;

  try {
    worker = await createWorker("eng", 1, {
      logger: (event) => {
        onProgress({
          status: formatStatus(event.status),
          progress: Math.round((event.progress || 0) * 100),
        });
      },
    });
    const result = await worker.recognize(blob);

    return {
      confidence: Math.round(result.data.confidence || 0),
      fields: extractNameplateFields(result.data.text),
      text: result.data.text.trim(),
    };
  } finally {
    if (worker) {
      await worker.terminate();
    }
  }
}

export function extractNameplateFields(text = "") {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
  const searchableText = lines.join("\n");

  return {
    manufacturer: findManufacturer(lines, searchableText),
    modelNumber: findLabelValue(lines, [
      /\bmodel(?:\s*(?:no\.?|number|#))?\s*[:-]?\s*(.+)$/i,
      /\bmdl\.?\s*[:#-]?\s*(.+)$/i,
      /\bm\s*[/\\]\s*n\s*[:#-]?\s*(.+)$/i,
    ]),
    serialNumber: findLabelValue(lines, [
      /\bserial(?:\s*(?:no\.?|number|#))?\s*[:-]?\s*(.+)$/i,
      /\bs\s*[/\\]\s*n\s*[:#-]?\s*(.+)$/i,
    ]),
    supplyVoltage: findVoltage(searchableText),
    equipmentType: findEquipmentType(searchableText),
  };
}

function findManufacturer(lines, searchableText) {
  const labelled = findLabelValue(lines, [
    /\b(?:manufacturer|manufactured by|mfr\.?|brand)\s*[:-]?\s*(.+)$/i,
  ]);

  if (labelled) {
    return labelled;
  }

  return manufacturers.find((manufacturer) =>
    new RegExp(`\\b${escapeRegExp(manufacturer)}\\b`, "i").test(
      searchableText,
    ),
  ) || "";
}

function findLabelValue(lines, patterns) {
  for (const line of lines) {
    for (const pattern of patterns) {
      const match = line.match(pattern);

      if (match?.[1]) {
        return cleanIdentifier(match[1]);
      }
    }
  }

  return "";
}

function cleanIdentifier(value) {
  return value
    .replace(/^[#:\-\s]+/, "")
    .replace(/\s+(?:serial|model|voltage|volts?|hz|phase|ph)\b.*$/i, "")
    .replace(/[^a-z0-9./\-_ ]+$/i, "")
    .trim()
    .slice(0, 80);
}

function findVoltage(text) {
  const voltageMatch = text.match(
    /\b(\d{2,3}(?:\s*[-/]\s*\d{2,3})?)\s*(?:v|vac|volts?)\b/i,
  );

  if (!voltageMatch) {
    return "";
  }

  const phaseMatch = text.match(/\b([13])\s*(?:ph|phase|ø)\b/i);
  const frequencyMatch = text.match(/\b(50|60)\s*hz\b/i);
  const details = [
    `${voltageMatch[1].replace(/\s/g, "")} V`,
    phaseMatch ? `${phaseMatch[1]} phase` : "",
    frequencyMatch ? `${frequencyMatch[1]} Hz` : "",
  ].filter(Boolean);

  return details.join(", ");
}

function findEquipmentType(text) {
  const equipmentPatterns = [
    ["Make-Up Air Unit", /\b(?:make[ -]?up air|mau)\b/i],
    ["Water Source Heat Pump", /\b(?:water source heat pump|wshp)\b/i],
    ["Air Handler", /\b(?:air handler|air handling unit|ahu)\b/i],
    ["Packaged RTU", /\b(?:packaged rooftop|rooftop unit|rtu)\b/i],
    ["Fan Coil", /\b(?:fan coil|fcu)\b/i],
    ["Exhaust Fan", /\bexhaust fan\b/i],
    ["Condensing Unit", /\bcondensing unit\b/i],
    ["HRV / ERV", /\b(?:hrv|erv|heat recovery ventilator)\b/i],
    ["Heat Pump", /\bheat pump\b/i],
  ];

  return equipmentPatterns.find(([, pattern]) => pattern.test(text))?.[0] || "";
}

function formatStatus(status = "Reading nameplate") {
  return status
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
