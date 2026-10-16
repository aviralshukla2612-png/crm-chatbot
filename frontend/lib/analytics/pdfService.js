import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

function resolveReportsDir() {
  const primary = path.join(process.cwd(), "frontend", "data", "reports");
  if (fs.existsSync(primary)) return primary;
  const direct = path.join(process.cwd(), "data", "reports");
  if (fs.existsSync(direct)) return direct;
  if (process.cwd().endsWith("frontend")) return direct;
  return primary;
}

export const pdfService = {
  /**
   * Deterministically generate a vector PDF report from verified analytics data
   */
  async generateReportPdf({
    reportId,
    title,
    organizationName = "Emperor Smart Solutions",
    periodLabel = "Current Period",
    generatedBy = "System Administrator",
    metrics = {},
    tableData = [],
    tableColumns = [],
    notes = [],
  }) {
    return new Promise((resolve, reject) => {
      try {
        const reportsDir = resolveReportsDir();
        if (!fs.existsSync(reportsDir)) {
          fs.mkdirSync(reportsDir, { recursive: true });
        }

        const fileName = `report_${reportId}.pdf`;
        const filePath = path.join(reportsDir, fileName);
        const writeStream = fs.createWriteStream(filePath);

        const doc = new PDFDocument({
          size: "A4",
          margin: 40,
          info: {
            Title: title,
            Author: organizationName,
            Subject: "Enterprise CRM/ERP Analytics Report",
          }
        });

        doc.pipe(writeStream);

        // Header Banner
        doc
          .rect(40, 40, 515, 65)
          .fill("#0f172a");

        doc
          .fillColor("#ffffff")
          .fontSize(18)
          .font("Helvetica-Bold")
          .text(organizationName.toUpperCase(), 55, 52);

        doc
          .fontSize(10)
          .font("Helvetica")
          .fillColor("#94a3b8")
          .text("CONFIDENTIAL BUSINESS INTELLIGENCE REPORT", 55, 74);

        doc
          .fontSize(9)
          .fillColor("#cbd5e1")
          .text(`Report Period: ${periodLabel} | Generated: ${new Date().toISOString().slice(0, 10)}`, 55, 88);

        // Title
        doc.moveDown(3);
        doc
          .fillColor("#0f172a")
          .fontSize(16)
          .font("Helvetica-Bold")
          .text(title, 40, 125);

        doc
          .fontSize(9)
          .font("Helvetica")
          .fillColor("#64748b")
          .text(`Requested By: ${generatedBy} | Report ID: ${reportId}`, 40, 145);

        // KPI Summary Metric Cards
        const metricEntries = Object.entries(metrics).slice(0, 4);
        if (metricEntries.length > 0) {
          const cardWidth = 120;
          const cardHeight = 50;
          let startX = 40;
          const startY = 165;

          metricEntries.forEach(([key, val], idx) => {
            const x = startX + idx * (cardWidth + 10);
            doc
              .rect(x, startY, cardWidth, cardHeight)
              .fillAndStroke("#f8fafc", "#e2e8f0");

            doc
              .fillColor("#64748b")
              .fontSize(8)
              .font("Helvetica-Bold")
              .text(
                key.replace(/([A-Z])/g, " $1").toUpperCase(),
                x + 8,
                startY + 10,
                { width: cardWidth - 16 }
              );

            const displayVal = typeof val === "number" ? `₹${val.toLocaleString("en-IN")}` : String(val);
            doc
              .fillColor("#0f172a")
              .fontSize(11)
              .font("Helvetica-Bold")
              .text(displayVal, x + 8, startY + 26, { width: cardWidth - 16 });
          });
        }

        // Data Table
        let tableTop = 235;
        if (tableColumns.length > 0 && tableData.length > 0) {
          doc
            .fontSize(11)
            .font("Helvetica-Bold")
            .fillColor("#0f172a")
            .text("DETAILED RECORDS", 40, tableTop);

          tableTop += 18;

          // Header Row
          const colWidth = Math.floor(515 / tableColumns.length);
          doc
            .rect(40, tableTop, 515, 20)
            .fill("#1e293b");

          tableColumns.forEach((col, i) => {
            doc
              .fillColor("#ffffff")
              .fontSize(8)
              .font("Helvetica-Bold")
              .text(col.toUpperCase(), 45 + i * colWidth, tableTop + 5, { width: colWidth - 8 });
          });

          tableTop += 20;

          // Rows
          const maxRows = Math.min(tableData.length, 18);
          for (let r = 0; r < maxRows; r++) {
            const row = tableData[r];
            const isAlt = r % 2 === 1;

            if (isAlt) {
              doc.rect(40, tableTop, 515, 18).fill("#f8fafc");
            }

            tableColumns.forEach((colKey, i) => {
              const val = row[colKey] !== undefined ? String(row[colKey]) : "-";
              doc
                .fillColor("#334155")
                .fontSize(8)
                .font("Helvetica")
                .text(val, 45 + i * colWidth, tableTop + 4, { width: colWidth - 8 });
            });

            tableTop += 18;
          }
        }

        // Footnotes & Notes
        doc.moveDown(2);
        const footerY = Math.max(tableTop + 25, 720);
        doc
          .rect(40, footerY, 515, 50)
          .fillAndStroke("#f1f5f9", "#cbd5e1");

        doc
          .fillColor("#475569")
          .fontSize(8)
          .font("Helvetica-Bold")
          .text("AUDIT NOTICE & BUSINESS ASSUMPTIONS", 50, footerY + 8);

        const assumptionText = notes.length > 0
          ? notes.join(" ")
          : "All figures represent verified transactional records from Emperor Smart Solutions core PostgreSQL database. Figures in INR. Cancelled invoices are strictly excluded from net sales.";

        doc
          .font("Helvetica")
          .fontSize(7.5)
          .fillColor("#64748b")
          .text(assumptionText, 50, footerY + 22, { width: 495 });

        // Page footer
        doc
          .fontSize(8)
          .fillColor("#94a3b8")
          .text("Page 1 of 1 — Generated by Emperor Analytics AI", 40, 790, { align: "center", width: 515 });

        doc.end();

        writeStream.on("finish", () => {
          const stats = fs.statSync(filePath);
          resolve({
            filePath,
            fileName,
            fileSizeBytes: stats.size,
          });
        });

        writeStream.on("error", (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }
};
