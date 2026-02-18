import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Announcement from '../models/Announcement.js';

dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clientsat';

async function seed() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const samples = [
    {
      title: 'Welcome to EMB Client Portal',
      message: '<p>We\'re rolling out new features. Please check the <a href="/release-notes">release notes</a>.</p>',
      startDate: new Date(),
      endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      target: 'both',
      displayMode: 'banner',
      active: true,
    },
    {
      title: '🚀 System Deployment — February 18, 2026',
      message:
        '<p>The <strong>EMB Client Satisfactory System</strong> has been deployed today, <strong>February 18, 2026</strong>.</p>' +
        '<ul>' +
        '<li>Revamped <strong>Announcement Manager</strong> — manage validity, send via email, preview, and choose where announcements appear (login banner, popup, or both).</li>' +
        '<li>Improved <strong>Admin Login</strong> with animated background and agency header branding.</li>' +
        '<li>Enhanced <strong>Dashboard</strong> with real-time socket updates.</li>' +
        '<li>Performance improvements with code splitting and backend validation hardening.</li>' +
        '</ul>' +
        '<p>If you encounter any issues, please contact the IT team. Thank you!</p>',
      startDate: new Date('2026-02-18T00:00:00'),
      endDate: new Date('2026-03-18T23:59:59'),
      target: 'both',
      displayMode: 'both',
      active: true,
    },
  ];

  for (const sample of samples) {
    const existing = await Announcement.findOne({ title: sample.title });
    if (existing) {
      console.log(`Updating: "${sample.title}"`);
      Object.assign(existing, sample);
      await existing.save();
      console.log('Updated.');
    } else {
      await Announcement.create(sample);
      console.log(`Created: "${sample.title}"`);
    }
  }

  await mongoose.disconnect();
  console.log('Disconnected');
}

seed().catch(err => {
  console.error('Seed error', err);
  process.exit(1);
});
