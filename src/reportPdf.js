import {
  checklistGroups,
  getChecklistSummary,
  getEnteredMeasurements,
} from "./fieldSections";

const PAGE_WIDTH = 612;
const MARGIN = 42;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const CONTENT_BOTTOM = 736;
const NAVY = [13, 27, 42];
const GOLD = [200, 151, 58];
const SLATE = [78, 97, 116];
const LIGHT = [239, 243, 247];
const BORDER = [211, 220, 229];

export async function generateProjectPdf(
  project,
  photosByUnit,
  { download = true } = {},
) {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
    compress: true,
    putOnlyUsedFonts: true,
  });
  const state = { doc, project, y: MARGIN };

  drawReportOverview(state);

  for (const unit of project.units || []) {
    doc.addPage();
    state.y = MARGIN;
    await drawUnitReport(state, unit, photosByUnit[unit.id] || []);
  }

  addPageFooters(doc, project);

  const filename = `${sanitizeFilename(project.projectName || "field-report")}.pdf`;

  if (download) {
    doc.save(filename);
  }

  return {
    blob: doc.output("blob"),
    filename,
    pageCount: doc.getNumberOfPages(),
  };
}

function drawReportOverview(state) {
  const { doc, project } = state;

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_WIDTH, 118, "F");
  doc.setFillColor(...GOLD);
  doc.roundedRect(MARGIN, 31, 48, 48, 8, 8, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(...NAVY);
  doc.text("MC", MARGIN + 24, 62, { align: "center" });

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(19);
  doc.text("MEHER FIELD", 104, 49);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("MEHER CONTRACTORS LTD.", 104, 67);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...GOLD);
  doc.text("FIELD SERVICE REPORT", PAGE_WIDTH - MARGIN, 50, {
    align: "right",
  });

  state.y = 150;
  doc.setTextColor(...NAVY);
  doc.setFontSize(25);
  doc.text(pdfText(project.projectName || "Untitled Project"), MARGIN, state.y);
  state.y += 14;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(2);
  doc.line(MARGIN, state.y, MARGIN + 70, state.y);
  state.y += 25;

  drawMetadataGrid(state, [
    ["Client", project.clientName],
    ["Report Date", formatDate(project.reportDate)],
    ["Technician", project.technician],
    ["Site Address", project.siteAddress],
  ]);

  state.y += 26;
  drawSectionTitle(state, "Equipment Summary");
  drawEquipmentSummary(state, project.units || []);

  if (!(project.units || []).length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(10);
    doc.setTextColor(...SLATE);
    doc.text("No equipment units were added to this report.", MARGIN, state.y);
  }
}

async function drawUnitReport(state, unit, photos) {
  drawRunningHeader(state, unit.tag || "Equipment Unit");
  const { doc } = state;

  doc.setFillColor(...GOLD);
  doc.rect(MARGIN, state.y, 5, 44, "F");
  doc.setTextColor(...NAVY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(pdfText(unit.tag || "Untagged Unit"), MARGIN + 17, state.y + 21);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...SLATE);
  doc.text(
    pdfText(unit.equipmentType || "Equipment type not entered"),
    MARGIN + 17,
    state.y + 37,
  );
  state.y += 66;

  drawSectionTitle(state, "Equipment Information");
  drawMetadataGrid(state, [
    ["Manufacturer", unit.manufacturer],
    ["Model Number", unit.modelNumber],
    ["Serial Number", unit.serialNumber],
    ["Supply Voltage", unit.supplyVoltage],
    ["Location", unit.location],
    ["Equipment Type", unit.equipmentType],
  ]);

  state.y += 24;
  drawChecklistReport(state, unit.checklist || {}, unit.tag || "Unit");
  state.y += 18;
  drawMeasurementsReport(
    state,
    unit.measurements || {},
    unit.tag || "Unit",
  );
  state.y += 18;
  drawTextSection(state, "Work Summary", unit.workSummary);
  state.y += 18;
  drawTextSection(state, "Notes and Deficiencies", unit.notes);

  if (photos.length) {
    state.y += 22;
    ensureSpace(state, 216, `${unit.tag || "Unit"} - Photos`);
    drawSectionTitle(state, "Photo Documentation");
    await drawPhotoGrid(state, photos, unit.tag || "Unit");
  }
}

function drawMetadataGrid(state, entries) {
  const { doc } = state;
  const gap = 10;
  const columnWidth = (CONTENT_WIDTH - gap) / 2;
  const rowHeight = 52;

  entries.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = MARGIN + column * (columnWidth + gap);
    const y = state.y + row * (rowHeight + gap);

    doc.setFillColor(...LIGHT);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, columnWidth, rowHeight, 4, 4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text(pdfText(label).toUpperCase(), x + 10, y + 16);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    const lines = doc.splitTextToSize(
      pdfText(value || "Not entered"),
      columnWidth - 20,
    );
    doc.text(lines.slice(0, 2), x + 10, y + 34);
  });

  state.y += Math.ceil(entries.length / 2) * (rowHeight + gap) - gap;
}

function drawEquipmentSummary(state, units) {
  const { doc } = state;
  const columns = [
    ["Tag", 110],
    ["Type", 155],
    ["Manufacturer", 120],
    ["Model", 143],
  ];
  const headerHeight = 26;
  const rowHeight = 32;

  ensureSpace(state, headerHeight + Math.min(units.length, 3) * rowHeight + 10);
  doc.setFillColor(...NAVY);
  doc.rect(MARGIN, state.y, CONTENT_WIDTH, headerHeight, "F");

  let x = MARGIN;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(255, 255, 255);
  columns.forEach(([label, width]) => {
    doc.text(label.toUpperCase(), x + 8, state.y + 17);
    x += width;
  });
  state.y += headerHeight;

  units.forEach((unit, index) => {
    ensureSpace(state, rowHeight);
    doc.setFillColor(index % 2 ? 248 : 255, index % 2 ? 250 : 255, index % 2 ? 252 : 255);
    doc.setDrawColor(...BORDER);
    doc.rect(MARGIN, state.y, CONTENT_WIDTH, rowHeight, "FD");
    x = MARGIN;
    const values = [
      unit.tag,
      unit.equipmentType,
      unit.manufacturer,
      unit.modelNumber,
    ];
    doc.setFont("helvetica", index === 0 ? "bold" : "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...NAVY);
    columns.forEach(([, width], columnIndex) => {
      const value = pdfText(values[columnIndex] || "-");
      doc.text(doc.splitTextToSize(value, width - 16).slice(0, 1), x + 8, state.y + 20);
      x += width;
    });
    state.y += rowHeight;
  });
}

function drawChecklistReport(state, checklist, unitLabel) {
  const { doc } = state;
  const summary = getChecklistSummary(checklist);

  ensureSpace(state, 70, `${unitLabel} - Checklist`);
  drawSectionTitle(state, "Equipment Checklist");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...SLATE);
  doc.text(
    `${summary.completed} of ${summary.total} checked | ${summary.passed} passed | ${summary.failed} failed`,
    MARGIN,
    state.y,
  );
  state.y += 12;

  for (const group of checklistGroups) {
    ensureSpace(state, 48, `${unitLabel} - Checklist`);
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, state.y, CONTENT_WIDTH, 19, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(255, 255, 255);
    doc.text(pdfText(group.title).toUpperCase(), MARGIN + 8, state.y + 13);
    state.y += 19;

    for (const [id, label] of group.items) {
      ensureSpace(state, 29, `${unitLabel} - Checklist`);
      const item = checklist[id] || {};
      doc.setFillColor(249, 251, 253);
      doc.setDrawColor(...BORDER);
      doc.rect(MARGIN, state.y, CONTENT_WIDTH, 28, "FD");
      doc.setTextColor(...NAVY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.text(
        doc.splitTextToSize(pdfText(label), 242).slice(0, 2),
        MARGIN + 8,
        state.y + 11,
      );
      doc.setFont("helvetica", "bold");
      doc.text(pdfText(item.status || "Not checked"), MARGIN + 268, state.y + 17);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(...SLATE);
      doc.text(
        doc.splitTextToSize(pdfText(item.note || "-"), 185).slice(0, 2),
        MARGIN + 337,
        state.y + 11,
      );
      state.y += 28;
    }
  }
}

function drawMeasurementsReport(state, measurements, unitLabel) {
  const { doc } = state;
  const entries = getEnteredMeasurements(measurements);

  ensureSpace(state, 72, `${unitLabel} - Measurements`);
  drawSectionTitle(state, "Measurements");

  if (!entries.length) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...SLATE);
    doc.text("No measurements recorded.", MARGIN, state.y);
    state.y += 12;
    return;
  }

  const gap = 10;
  const cardWidth = (CONTENT_WIDTH - gap) / 2;
  const cardHeight = 42;

  entries.forEach((entry, index) => {
    const column = index % 2;
    if (column === 0) {
      ensureSpace(state, cardHeight + gap, `${unitLabel} - Measurements`);
    }

    const x = MARGIN + column * (cardWidth + gap);
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, state.y, cardWidth, cardHeight, 4, 4, "FD");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(...SLATE);
    doc.text(pdfText(entry.label).toUpperCase(), x + 9, state.y + 14);
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    doc.text(
      pdfText(`${entry.value} ${entry.unit}`),
      x + 9,
      state.y + 31,
    );

    if (column === 1 || index === entries.length - 1) {
      state.y += cardHeight + gap;
    }
  });
}

function drawTextSection(state, title, value) {
  const { doc } = state;
  const text = pdfText(value || "No information entered.");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const lines = doc.splitTextToSize(text, CONTENT_WIDTH - 24);
  const lineHeight = 14;
  const sectionHeight = 42 + lines.length * lineHeight;

  ensureSpace(state, Math.min(sectionHeight, 150), title);
  drawSectionTitle(state, title);
  doc.setFillColor(249, 251, 253);
  doc.setDrawColor(...BORDER);

  let remainingLines = [...lines];

  while (remainingLines.length) {
    const availableLines = Math.max(
      1,
      Math.floor((CONTENT_BOTTOM - state.y - 18) / lineHeight),
    );
    const pageLines = remainingLines.splice(0, availableLines);
    const boxHeight = pageLines.length * lineHeight + 20;
    doc.roundedRect(MARGIN, state.y, CONTENT_WIDTH, boxHeight, 4, 4, "FD");
    doc.setTextColor(...NAVY);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(pageLines, MARGIN + 12, state.y + 17, { lineHeightFactor: 1.4 });
    state.y += boxHeight;

    if (remainingLines.length) {
      addContinuationPage(state, `${title} - Continued`);
    }
  }
}

async function drawPhotoGrid(state, photos, unitLabel) {
  const { doc } = state;
  const gap = 14;
  const cardWidth = (CONTENT_WIDTH - gap) / 2;
  const imageHeight = 145;
  const cardHeight = 181;

  for (let index = 0; index < photos.length; index += 1) {
    const photo = photos[index];
    const column = index % 2;

    if (column === 0) {
      ensureSpace(state, cardHeight, `${unitLabel} - Photos`);
    }

    const x = MARGIN + column * (cardWidth + gap);
    const y = state.y;
    doc.setFillColor(...LIGHT);
    doc.setDrawColor(...BORDER);
    doc.roundedRect(x, y, cardWidth, cardHeight, 4, 4, "FD");

    try {
      const imageBytes = new Uint8Array(await photo.blob.arrayBuffer());
      const fitted = fitImage(
        photo.width || 4,
        photo.height || 3,
        cardWidth - 12,
        imageHeight - 12,
      );
      const imageX = x + (cardWidth - fitted.width) / 2;
      const imageY = y + 6 + (imageHeight - 12 - fitted.height) / 2;
      doc.addImage(
        imageBytes,
        "JPEG",
        imageX,
        imageY,
        fitted.width,
        fitted.height,
        photo.id,
        "FAST",
      );
    } catch (error) {
      console.error("Could not add a report photo:", error);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...SLATE);
      doc.text("Photo unavailable", x + cardWidth / 2, y + 75, {
        align: "center",
      });
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(...NAVY);
    const caption =
      photo.caption ||
      (photo.category === "Nameplate Photo" ? "Equipment nameplate" : "Site photo");
    doc.text(
      doc.splitTextToSize(pdfText(caption), cardWidth - 18).slice(0, 2),
      x + 9,
      y + imageHeight + 17,
    );

    if (column === 1 || index === photos.length - 1) {
      state.y += cardHeight + gap;
    }
  }
}

function drawRunningHeader(state, label) {
  const { doc, project } = state;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(...NAVY);
  doc.text("MEHER FIELD", MARGIN, state.y);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...SLATE);
  doc.text(pdfText(project.projectName || "Field Report"), PAGE_WIDTH / 2, state.y, {
    align: "center",
  });
  doc.text(pdfText(label), PAGE_WIDTH - MARGIN, state.y, { align: "right" });
  state.y += 11;
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1.5);
  doc.line(MARGIN, state.y, PAGE_WIDTH - MARGIN, state.y);
  state.y += 21;
}

function drawSectionTitle(state, title) {
  const { doc } = state;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(pdfText(title), MARGIN, state.y);
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(1);
  doc.line(MARGIN, state.y + 7, MARGIN + 42, state.y + 7);
  state.y += 21;
}

function ensureSpace(state, needed, title = "Report Continued") {
  if (state.y + needed <= CONTENT_BOTTOM) {
    return;
  }

  addContinuationPage(state, title);
}

function addContinuationPage(state, title) {
  state.doc.addPage();
  state.y = MARGIN;
  drawRunningHeader(state, title);
}

function addPageFooters(doc, project) {
  const totalPages = doc.getNumberOfPages();

  for (let page = 1; page <= totalPages; page += 1) {
    doc.setPage(page);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, 754, PAGE_WIDTH - MARGIN, 754);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...SLATE);
    doc.text(pdfText(project.projectName || "Field Report"), MARGIN, 770);
    doc.text(`Page ${page} of ${totalPages}`, PAGE_WIDTH - MARGIN, 770, {
      align: "right",
    });
  }
}

function fitImage(width, height, maxWidth, maxHeight) {
  const scale = Math.min(maxWidth / width, maxHeight / height);
  return { width: width * scale, height: height * scale };
}

function formatDate(value) {
  if (!value) {
    return "Not entered";
  }

  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleDateString("en-CA", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

function pdfText(value) {
  return String(value ?? "")
    .replace(/[–—]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\u00a0/g, " ");
}

function sanitizeFilename(value) {
  const safe = String(value)
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
  return `${safe || "field-report"}-field-report`;
}
