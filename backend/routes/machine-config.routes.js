import express from 'express';
import {
  getMachines,
  getMachinesDropdown,
  getMachineById,
  createMachine,
  updateMachine,
  toggleMachine,
  getMachineUsage
} from '../controllers/machine-config.controller.js';

const router = express.Router();

router.get('/', getMachines);
router.get('/dropdown', getMachinesDropdown);
router.get('/:id', getMachineById);
router.get('/:id/usage', getMachineUsage);
router.post('/', createMachine);
router.put('/:id', updateMachine);
router.patch('/:id/toggle', toggleMachine);

export default router;
