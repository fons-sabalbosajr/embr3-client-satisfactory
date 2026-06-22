import mongoose from 'mongoose';
import sanitizeHtml from 'sanitize-html';

const announcementSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 200 },
  message: { type: String, required: true, maxlength: 10000 },
  startDate: { type: Date },
  endDate: { type: Date },
  target: { type: String, enum: ['client','admin','both'], default: 'both' },
  displayMode: { type: String, enum: ['banner','modal','both'], default: 'banner' },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  active: { type: Boolean, default: true },
  emailSent: { type: Boolean, default: false },
  emailSentAt: { type: Date },
});

// Extra safety: sanitize message before save
announcementSchema.pre('save', function (next) {
  if (this.isModified('message') && typeof this.message === 'string') {
    this.message = sanitizeHtml(this.message, {
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
  next();
});

export default mongoose.model('Announcement', announcementSchema);
