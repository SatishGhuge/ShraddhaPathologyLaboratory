import express from 'express';
import prisma from '../config/database.js';

const router = express.Router();

// Get all signatures
router.get('/', async (req, res) => {
  try {
    const signatures = await prisma.signature.findMany({ orderBy: { doctorName: 'asc' } });
    res.json({ success: true, data: signatures });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Create signature
router.post('/', async (req, res) => {
  try {
    const { doctorName, signatureText, signatureImage, width, height, isActive } = req.body;
    const sig = await prisma.signature.create({
      data: {
        doctorName, signatureText, signatureImage,
        width: width ? parseInt(width) : 150,
        height: height ? parseInt(height) : 80,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.json({ success: true, data: sig });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Update signature
router.put('/:id', async (req, res) => {
  try {
    const { doctorName, signatureText, signatureImage, width, height, isActive } = req.body;
    const sig = await prisma.signature.update({
      where: { id: parseInt(req.params.id) },
      data: {
        doctorName, signatureText, signatureImage,
        width: width ? parseInt(width) : 150,
        height: height ? parseInt(height) : 80,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    res.json({ success: true, data: sig });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Delete signature
router.delete('/:id', async (req, res) => {
  try {
    await prisma.signature.delete({ where: { id: parseInt(req.params.id) } });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
