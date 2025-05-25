// models.js

const mongoose = require('mongoose');

const Users = mongoose.model('Users', new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    mobile: { type: String, required: true, unique: true },
    password: { type: String, required: true },
}), 'Users');

const LeaderBoard = mongoose.model('LeaderBoard', new mongoose.Schema({
    userId: { type: String, required: true },
    username: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    location: { type: String, required: true },
    dataset: { type: String, required: true },
    language: { type: String, required: true },
    scores: { type: mongoose.Schema.Types.Mixed, required: true },
}), 'LeaderBoard');

// Schema for claims that are EMBEDDED within EventSubmission documents
// This schema DOES NOT need a donationId field, as it's part of the donation document itself.
const embeddedClaimSchema = new mongoose.Schema({
    claimerName: { type: String, required: true },
    claimerMobile: { type: String, required: true },
    claimerEmail: { type: String, required: true },
    claimerAddress: { type: String, required: true },
    claimerState: { type: String, required: true },
    claimedAt: { type: Date, default: Date.now }
});

// Schema for a STANDALONE Claim collection (if you choose to use it)
// This schema DOES need a donationId to reference the EventSubmission it's claiming.
const standaloneClaimSchema = new mongoose.Schema({
    donationId: { type: mongoose.Schema.Types.ObjectId, ref: 'EventSubmission', required: true },
    claimerName: { type: String, required: true },
    claimerMobile: { type: String, required: true },
    claimerEmail: { type: String, required: true },
    claimerAddress: { type: String, required: true },
    claimerState: { type: String, required: true },
    claimedAt: { type: Date, default: Date.now }
});

const Claim = mongoose.model('Claim', standaloneClaimSchema, 'Claims'); // This is your standalone Claim model

// Updated EventSubmission to store image as Buffer and add claims array
const EventSubmission = mongoose.model('EventSubmission', new mongoose.Schema({
    userId: { type: String, required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    location: { type: String, required: true },
    image: {
        data: { type: Buffer, required: true },      // Binary data
        contentType: { type: String, required: true } // MIME type
    },
    claims: [embeddedClaimSchema] // Use the embeddedClaimSchema here
}, { timestamps: true }), 'EventSubmissions');

module.exports = { Users, LeaderBoard, EventSubmission, Claim };