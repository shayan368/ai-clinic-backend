import Prescription from "../models/Prescription.js";
import PDFDocument from "pdfkit";

// CREATE
export const createPrescription = async (req, res) => {
  try {
    const prescription = await Prescription.create(req.body);

    res.status(201).json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET ALL
export const getPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.findAll();

    res.status(200).json({
      success: true,
      data: prescriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET SINGLE
export const getSinglePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    res.status(200).json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// UPDATE
export const updatePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    await prescription.update(req.body);

    res.status(200).json({
      success: true,
      data: prescription,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DELETE
export const deletePrescription = async (req, res) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    await prescription.destroy();

    res.status(200).json({
      success: true,
      message: "Prescription deleted",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// GET BY PATIENT
export const getPatientPrescriptions = async (req, res) => {
  try {
    const prescriptions = await Prescription.findAll({
      where: { patientId: req.params.patientId },
    });

    res.status(200).json({
      success: true,
      data: prescriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// DOWNLOAD PDF
export const downloadPrescriptionPDF = async (req, res) => {
  try {
    const prescription = await Prescription.findByPk(req.params.id);

    if (!prescription) {
      return res.status(404).json({
        success: false,
        message: "Prescription not found",
      });
    }

    const doc = new PDFDocument({ margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=prescription_${prescription.id}.pdf`
    );

    doc.pipe(res);

    // Header
    doc
      .fontSize(22)
      .font("Helvetica-Bold")
      .text("AI Clinic Management", { align: "center" });

    doc
      .fontSize(12)
      .font("Helvetica")
      .text("Smart Diagnosis & Prescription System", { align: "center" });

    doc.moveDown();
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();

    // Prescription details
    doc.fontSize(14).font("Helvetica-Bold").text("Prescription Details");
    doc.moveDown(0.5);

    doc
      .fontSize(12)
      .font("Helvetica")
      .text(`Prescription ID: ${prescription.id}`)
      .text(`Patient ID: ${prescription.patientId}`)
      .text(`Doctor ID: ${prescription.doctorId}`)
      .text(
        `Date: ${new Date(prescription.createdAt).toLocaleDateString("en-PK")}`
      );

    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("Medicines");
    doc.moveDown(0.5);

    const medicines = Array.isArray(prescription.medicines)
      ? prescription.medicines
      : JSON.parse(prescription.medicines || "[]");

    medicines.forEach((med, index) => {
      doc
        .fontSize(12)
        .font("Helvetica")
        .text(
          `${index + 1}. ${med.name} — ${med.dosage} (${med.frequency || "as directed"})`
        );
    });

    doc.moveDown();
    doc.fontSize(14).font("Helvetica-Bold").text("Instructions");
    doc.moveDown(0.5);
    doc
      .fontSize(12)
      .font("Helvetica")
      .text(prescription.instructions || "Follow doctor's advice.");

    doc.moveDown(2);
    doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
    doc.moveDown();
    doc
      .fontSize(10)
      .font("Helvetica")
      .text("This prescription was generated digitally.", { align: "center" });

    doc.end();
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
// GET PRESCRIPTIONS BY DOCTOR
export const getDoctorPrescriptions = async (req, res) => {
  try {
    const doctorId = parseInt(req.params.doctorId);

    if (isNaN(doctorId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid doctor ID",
      });
    }

    const prescriptions = await Prescription.findAll({
      where: { doctorId },
      order: [["createdAt", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count:   prescriptions.length,
      data:    prescriptions,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};