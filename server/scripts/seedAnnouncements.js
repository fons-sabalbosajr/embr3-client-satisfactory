import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Announcement from '../models/Announcement.js';

dotenv.config();

const MONGO = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/clientsat';

async function seed() {
  await mongoose.connect(MONGO, { useNewUrlParser: true, useUnifiedTopology: true });
  console.log('Connected to MongoDB');

  const sample = {
    title: 'Welcome to EMB Client Portal',
    message: '<p>We\'re rolling out new features. Please check the <a href="/release-notes">release notes</a>.</p>',
    startDate: new Date(),
    endDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    target: 'both',
    active: true,
  };

  const existing = await Announcement.findOne({ title: sample.title });
  if (existing) {
    console.log('Sample announcement already exists. Updating...');
    existing.message = sample.message;
    existing.startDate = sample.startDate;
    existing.endDate = sample.endDate;
    existing.active = true;
    await existing.save();
    console.log('Updated sample announcement');
  } else {
    await Announcement.create({ ...sample });
    console.log('Created sample announcement');
  }

  await mongoose.disconnect();
  console.log('Disconnected');
}

seed().catch(err => {
  console.error('Seed error', err);
  process.exit(1);
});
