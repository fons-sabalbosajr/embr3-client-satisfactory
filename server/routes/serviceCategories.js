import express from 'express';
import mongoose from 'mongoose';
import ServiceCategory from '../models/ServiceCategory.js';
import authMiddleware from '../middleware/auth.js';
import { requirePermission } from '../middleware/permission.js';

const router = express.Router();

// List categories (public – the survey form needs this without auth)
router.get('/', async (req, res) => {
  try {
    const items = await ServiceCategory.find({}).sort({ name: 1 });
    res.json({ data: items });
  } catch (err) {
    console.error('Get service categories error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create category
router.post('/', authMiddleware, requirePermission('canEdit'), async (req, res) => {
  try {
    const { name, type } = req.body || {};
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ message: 'name is required' });
    }
    if (!['internal', 'external'].includes(type)) {
      return res.status(400).json({ message: 'type must be internal or external' });
    }
    const normName = name.trim();
    const existing = await ServiceCategory.findOne({ name: normName });
    if (existing) return res.status(409).json({ message: 'Category already exists' });
    const created = await ServiceCategory.create({ name: normName, type });
    res.status(201).json({ data: created });
  } catch (err) {
    console.error('Create service category error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update category
router.put('/:id', authMiddleware, requirePermission('canEdit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type } = req.body || {};
    const update = {};
    if (typeof name !== 'undefined') {
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ message: 'name is required' });
      }
      update.name = name.trim();
    }
    if (typeof type !== 'undefined') {
      if (!['internal', 'external'].includes(type)) {
        return res.status(400).json({ message: 'type must be internal or external' });
      }
      update.type = type;
    }
    update.updatedAt = new Date();
    const updated = await ServiceCategory.findByIdAndUpdate(id, update, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ data: updated });
  } catch (err) {
    console.error('Update service category error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete category
router.delete('/:id', authMiddleware, requirePermission('canEdit'), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid category ID format.' });
    }
    const deleted = await ServiceCategory.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Category not found' });
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete service category error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
