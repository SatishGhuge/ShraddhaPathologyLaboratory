import express from 'express';
import prisma from '../config/database.js';

const router = express.Router();

// Get all signatures
router.get('/', async (req, res) => {
  try {
    const signatures = await prisma.signature.findMany({ orderBy: { sortOrder: 'asc' } });
    res.json({ success: true, data: signatures });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Get signature by specialty
router.get('/by-specialty/:specialty', async (req, res) => {
  try {
    const sig = await prisma.signature.findFirst({
      where: { specialty: req.params.specialty, isActive: true },
      orderBy: { sortOrder: 'asc' }
    });
    res.json({ success: true, data: sig || null });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});

// Create signature
router.post('/', async (req, res) => {
  try {
    const { specialty, doctorName, signatureText, signatureImage, activeFrom, expiredOn, width, height, sortOrder, isActive } = req.body;
    const sig = await prisma.signature.create({
      data: {
        specialty, doctorName, signatureText, signatureImage,
        activeFrom: activeFrom ? new Date(activeFrom) : null,
        expiredOn: expiredOn ? new Date(expiredOn) : null,
        width: width ? parseInt(width) : 150,
        height: height ? parseInt(height) : 80,
        sortOrder: sortOrder ? parseInt(sortOrder) : 1,
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
    const { specialty, doctorName, signatureText, signatureImage, activeFrom, expiredOn, width, height, sortOrder, isActive } = req.body;
    const sig = await prisma.signature.update({
      where: { id: parseInt(req.params.id) },
      data: {
        specialty, doctorName, signatureText, signatureImage,
        activeFrom: activeFrom ? new Date(activeFrom) : null,
        expiredOn: expiredOn ? new Date(expiredOn) : null,
        width: width ? parseInt(width) : 150,
        height: height ? parseInt(height) : 80,
        sortOrder: sortOrder ? parseInt(sortOrder) : 1,
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
