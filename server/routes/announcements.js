import express from 'express';
import sanitizeHtml from 'sanitize-html';
import Announcement from '../models/Announcement.js';
import User from '../models/User.js';
import { requirePermission } from '../middleware/permission.js';
import authMiddleware from '../middleware/auth.js';
import { sendAnnouncementEmail } from '../utils/email.js';

const router = express.Router();

// Get announcements (optionally filter by target and active) — requires auth
router.get('/', authMiddleware, async (req, res) => {
  try {
    const { target, active, status } = req.query;
    const q = {};
    if (target) q.target = { $in: [target, 'both'] };
    if (typeof active !== 'undefined') q.active = active === 'true';
    let items = await Announcement.find(q).sort({ createdAt: -1 });

    // Compute status per item and optionally filter by status
    const now = Date.now();
    const withStatus = items.map((it) => {
      let s = 'active';
      if (!it.active) s = 'inactive';
      else if (it.startDate && it.startDate.getTime() > now) s = 'queued';
      else if (it.endDate && it.endDate.getTime() < now) s = 'closed';
      return { ...it.toObject(), status: s };
    });

    const filtered = typeof status === 'string' && status ? withStatus.filter((it) => it.status === status) : withStatus;
    res.json({ data: filtered });
  } catch (err) {
    console.error('Get announcements error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create announcement (admin/dev)
router.post('/', authMiddleware, requirePermission('canManageAnnouncements'), async (req, res) => {
  try {
    const { title, message, startDate, endDate, target, active } = req.body;

    // Basic validation
    const errors = [];
    if (!title || typeof title !== 'string' || !title.trim()) errors.push('Title is required');
    if (title && title.length > 200) errors.push('Title must be at most 200 characters');
    if (!message || typeof message !== 'string' || !message.trim()) errors.push('Message is required');
    if (message && message.length > 10000) errors.push('Message must be at most 10000 characters');
    if (startDate && isNaN(Date.parse(startDate))) errors.push('startDate is invalid');
    if (endDate && isNaN(Date.parse(endDate))) errors.push('endDate is invalid');
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) errors.push('startDate must be before endDate');
    if (target && !['client', 'admin', 'both'].includes(target)) errors.push('Invalid target');

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    // Sanitize message HTML to avoid XSS
    const cleanMessage = sanitizeHtml(message, {
      allowedTags: [ 'b','i','em','strong','u','p','br','ul','ol','li','a','img','h1','h2','h3','h4','h5','h6' ],
      allowedAttributes: {
        a: [ 'href', 'name', 'target', 'rel' ],
        img: [ 'src', 'alt', 'title', 'width', 'height' ]
      },
      allowedSchemesByTag: {
        img: [ 'http', 'https', 'data' ],
        a: [ 'http', 'https', 'mailto' ]
      },
      transformTags: {
        'a': sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
      }
    });

    const ann = await Announcement.create({ title: title.trim(), message: cleanMessage, startDate, endDate, target, active, createdBy: req.user?.id });
    res.status(201).json({ data: ann });
  } catch (err) {
    console.error('Create announcement error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update announcement
router.put('/:id', authMiddleware, requirePermission('canManageAnnouncements'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, startDate, endDate, target, active } = req.body;

    // Basic validation
    const errors = [];
    if (typeof title !== 'undefined') {
      if (!title || typeof title !== 'string' || !title.trim()) errors.push('Title is required');
      if (title && title.length > 200) errors.push('Title must be at most 200 characters');
    }
    if (typeof message !== 'undefined') {
      if (!message || typeof message !== 'string' || !message.trim()) errors.push('Message is required');
      if (message && message.length > 10000) errors.push('Message must be at most 10000 characters');
    }
    if (typeof startDate !== 'undefined' && startDate && isNaN(Date.parse(startDate))) errors.push('startDate is invalid');
    if (typeof endDate !== 'undefined' && endDate && isNaN(Date.parse(endDate))) errors.push('endDate is invalid');
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) errors.push('startDate must be before endDate');
    if (typeof target !== 'undefined' && target && !['client', 'admin', 'both'].includes(target)) errors.push('Invalid target');

    if (errors.length) return res.status(400).json({ message: 'Validation failed', errors });

    const updatePayload = { ...req.body };
    if (typeof message !== 'undefined') {
      updatePayload.message = sanitizeHtml(message, {
        allowedTags: [ 'b','i','em','strong','u','p','br','ul','ol','li','a','img','h1','h2','h3','h4','h5','h6' ],
        allowedAttributes: {
          a: [ 'href', 'name', 'target', 'rel' ],
          img: [ 'src', 'alt', 'title', 'width', 'height' ]
        },
        allowedSchemesByTag: {
          img: [ 'http', 'https', 'data' ],
          a: [ 'http', 'https', 'mailto' ]
        },
        transformTags: {
          'a': sanitizeHtml.simpleTransform('a', { target: '_blank', rel: 'noopener noreferrer' })
        }
      });
    }

    const updated = await Announcement.findByIdAndUpdate(id, updatePayload, { new: true });
    if (!updated) return res.status(404).json({ message: 'Not found' });
    res.json({ data: updated });
  } catch (err) {
    console.error('Update announcement error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete announcement
router.delete('/:id', authMiddleware, requirePermission('canManageAnnouncements'), async (req, res) => {
  try {
    const { id } = req.params;
    await Announcement.findByIdAndDelete(id);
    res.json({ message: 'Deleted' });
  } catch (err) {
    console.error('Delete announcement error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /:id/send-email — broadcast announcement to all verified admin users
router.post('/:id/send-email', authMiddleware, requirePermission('canManageAnnouncements'), async (req, res) => {
  try {
    const ann = await Announcement.findById(req.params.id);
    if (!ann) return res.status(404).json({ message: 'Announcement not found' });

    // Get all verified users
    const users = await User.find({ isVerified: true }).select('email fullname');
    if (!users.length) return res.status(400).json({ message: 'No verified users to email' });

    const results = { sent: 0, failed: 0 };
    for (const user of users) {
      try {
        await sendAnnouncementEmail(user.email, user.fullname, ann.title, ann.message);
        results.sent += 1;
      } catch (emailErr) {
        console.error(`Failed to send announcement email to ${user.email}:`, emailErr.message);
        results.failed += 1;
      }
    }

    // Mark emailSent on announcements
    ann.emailSent = true;
    ann.emailSentAt = new Date();
    await ann.save();

    res.json({ message: `Email sent to ${results.sent} user(s), ${results.failed} failed.`, ...results });
  } catch (err) {
    console.error('Send announcement email error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /public — unauthenticated endpoint for login panel banners
router.get('/public', async (req, res) => {
  try {
    const now = new Date();
    const items = await Announcement.find({
      active: true,
      target: { $in: ['admin', 'both'] },
      $or: [
        { startDate: { $exists: false } },
        { startDate: null },
        { startDate: { $lte: now } },
      ],
    }).sort({ createdAt: -1 }).limit(10).lean();

    // Filter out expired announcements
    const filtered = items.filter(a => !a.endDate || new Date(a.endDate) >= now);
    res.json({ data: filtered });
  } catch (err) {
    console.error('Get public announcements error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
