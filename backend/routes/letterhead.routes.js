import express from 'express';
import prisma from '../config/database.js';

const router = express.Router();

// Get all letterheads
router.get('/', async (req, res) => {
  try {
    const letterheads = await prisma.letterhead.findMany({ 
      orderBy: { createdAt: 'desc' } 
    });
    res.json({ success: true, data: letterheads });
  } catch (e) {
    console.error('Error fetching letterheads:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Get active letterheads (for reports)
router.get('/active', async (req, res) => {
  try {
    const letterheads = await prisma.letterhead.findMany({ 
      where: { isActive: true },
      orderBy: { letterheadName: 'asc' } 
    });
    res.json({ success: true, data: letterheads });
  } catch (e) {
    console.error('Error fetching active letterheads:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Get specific letterhead by ID
router.get('/:id', async (req, res) => {
  try {
    const letterhead = await prisma.letterhead.findUnique({
      where: { id: parseInt(req.params.id) }
    });
    if (!letterhead) {
      return res.status(404).json({ success: false, message: 'Letterhead not found' });
    }
    res.json({ success: true, data: letterhead });
  } catch (e) {
    console.error('Error fetching letterhead:', e);
    res.status(500).json({ success: false, message: e.message });
  }
});

// Create letterhead
router.post('/', async (req, res) => {
  try {
    const { letterheadName, headerImage, footerImage, isActive } = req.body;
    
    if (!letterheadName) {
      return res.status(400).json({ success: false, message: 'Letterhead name is required' });
    }
    if (!headerImage) {
      return res.status(400).json({ success: false, message: 'Header image is required' });
    }
    if (!footerImage) {
      return res.status(400).json({ success: false, message: 'Footer image is required' });
    }

    const letterhead = await prisma.letterhead.create({
      data: {
        letterheadName,
        headerImage,
        footerImage,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    
    res.json({ success: true, data: letterhead });
  } catch (e) {
    console.error('Error creating letterhead:', e);
    if (e.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Letterhead name already exists' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
});

// Update letterhead
router.put('/:id', async (req, res) => {
  try {
    const { letterheadName, headerImage, footerImage, isActive } = req.body;
    
    const letterhead = await prisma.letterhead.update({
      where: { id: parseInt(req.params.id) },
      data: {
        letterheadName,
        headerImage,
        footerImage,
        isActive: isActive !== undefined ? isActive : true
      }
    });
    
    res.json({ success: true, data: letterhead });
  } catch (e) {
    console.error('Error updating letterhead:', e);
    if (e.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Letterhead name already exists' });
    }
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Letterhead not found' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
});

// Delete letterhead
router.delete('/:id', async (req, res) => {
  try {
    await prisma.letterhead.delete({ 
      where: { id: parseInt(req.params.id) } 
    });
    res.json({ success: true });
  } catch (e) {
    console.error('Error deleting letterhead:', e);
    if (e.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Letterhead not found' });
    }
    res.status(500).json({ success: false, message: e.message });
  }
});

export default router;
