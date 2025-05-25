const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { Users, LeaderBoard, EventSubmission, Claim } = require('./models'); // Ensure all models are correctly imported

const SECRET_KEY = 'jwt_secret_key_54742384238423_ahfgrdtTFHHYJNMP[]yigfgfjdfjd=-+&+pqiel;,,dkvntegdv/cv,mbkzmbzbhsbha#&$^&(#_enD';
const URI = "mongodb+srv://craids22:midhun@cluster0.dtvqc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";
const PORT = 5000;
const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/static', express.static(path.join(__dirname, 'static')));

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.memoryStorage(); // Store image in memory as a Buffer
const upload = multer({ storage: storage });

mongoose.connect(URI, { dbName: 'StyleCycle' })
  .then(() => console.log('MongoDB connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// --- JWT Authentication Middleware ---
// Define this BEFORE any routes that use it!
function authenticateUser(req, res, next) {
    console.log('SERVER: authenticateUser middleware called.');
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('SERVER: No Authorization header or malformed. Sending 401.');
        return res.status(401).json({ message: 'No token provided or malformed.' });
    }

    const token = authHeader.replace('Bearer ', '');
    console.log('SERVER: Extracted token (first 20 chars):', token.substring(0, 20) + '...');

    try {
        // Use the defined SECRET_KEY
        const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS512'] });
        req.user = decoded; // Attach the decoded payload to the request object
        console.log('SERVER: Token successfully verified. User:', req.user.username, 'ID:', req.user.userId);
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('SERVER ERROR: JWT Verification FAILED:', error.message);
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired. Please log in again.' });
        }
        return res.status(401).json({ message: 'Invalid token.' });
    }
}
// --- END JWT Authentication Middleware ---

// Static pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'home.html')));
app.get('/Login', (req, res) => res.sendFile(path.join(__dirname, 'Login.html')));
app.get('/Signup', (req, res) => res.sendFile(path.join(__dirname, 'Signup.html')));
app.get('/Event', (req, res) => res.sendFile(path.join(__dirname, 'EventRegister.html')));
app.get('/Home', (req, res) => res.sendFile(path.join(__dirname, 'userhome.html')));
app.get('/developers', (req, res) => res.sendFile(path.join(__dirname, 'developers.html')));
app.get('/data', (req, res) => res.sendFile(path.join(__dirname, 'data.html')));
app.get('/Submissions.html', (req, res) => res.sendFile(path.join(__dirname, 'Submissions.html')));
// app.get('/Claimform', (req, res) => res.sendFile(path.join(__dirname, 'Claimform.html')));
app.get('/script.js', (req, res) => res.sendFile(path.join(__dirname, 'script.js')));
app.get('/banner.jpg', (req, res) => res.sendFile(path.join(__dirname, 'banner.jpg')));
app.get('/claim.html', (req, res) => res.sendFile(path.join(__dirname, 'claim.html'))); // Redundant
app.get('/Claimform.html', (req, res) => res.sendFile(path.join(__dirname, 'Claimform.html')));


// Download file (Might not be needed if images are embedded in DB)
app.get('/getFile', (req, res) => {
    const file = req.query.file;
    res.download(path.join(__dirname, file), file.toString(), (err) => {
        if (err) res.status(500).send('Failed to download file');
    });
});

// Signup
app.post('/signup', async (req, res) => {
    const { email, password, username, mobile } = req.body;
    try {
        if (await Users.findOne({ username: username.toLowerCase() })) return res.status(400).json({ message: 'Username already in use' });
        if (await Users.findOne({ email })) return res.status(400).json({ message: 'Email already in use' });
        if (await Users.findOne({ mobile })) return res.status(400).json({ message: 'Mobile no already in use' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new Users({ userId: uuidv4(), email, mobile, password: hashedPassword, username });
        await newUser.save();
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during signup: ' + error.message });
    }
});

// Login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await Users.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) return res.status(400).json({ message: 'Invalid credentials' });

        // IMPORTANT: Use 'userId' in the token payload to match how it's used in submissions
        const token = jwt.sign({ userId: user.userId, username: user.username }, SECRET_KEY, { expiresIn: '1h', algorithm: 'HS512' });
        res.status(200).json({ token });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login' });
    }
});

// Validate token (used by client-side 'valid()' function)
app.post('/valid', (req, res) => {
    console.log('SERVER: Received request for /valid');
    const authHeader = req.headers.authorization; // Get the full Authorization header

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        console.log('SERVER: /valid - Auth header missing or malformed. Sending 401.');
        return res.status(401).json({ message: 'Token missing or malformed.' });
    }

    const token = authHeader.replace('Bearer ', ''); // IMPORTANT: Strip 'Bearer '
    console.log('SERVER: /valid - Extracted token (first 20 chars):', token.substring(0, 20) + '...');

    try {
        const decoded = jwt.verify(token, SECRET_KEY, { algorithms: ['HS512'] }); // Use SECRET_KEY
        console.log('SERVER: /valid - Token verified. Returning user info:', decoded.username, decoded.userId);
        res.status(200).json({ userId: decoded.userId, username: decoded.username }); // Ensure 'userId' is sent
    } catch (error) {
        console.error('SERVER ERROR: /valid - JWT Verification FAILED:', error.message);
        res.status(401).json({ message: error instanceof jwt.TokenExpiredError ? 'Token expired' : 'Invalid token' });
    }
});

// Get all posts (for userhome.html - public feed)
app.get('/api/posts', async (req, res) => {
    try {
        const posts = await EventSubmission.find().sort({ createdAt: -1 });
        res.json(posts);
    } catch (error) {
        console.error('SERVER ERROR: Error fetching public posts:', error);
        res.status(500).json({ message: 'Server error fetching public posts' });
    }
});

// File submission (donation)
app.post('/api/donate', upload.single('image'), async (req, res) => {
    const { userId, name, email, mobile, location } = req.body;
    if (!req.file) return res.status(400).json({ message: 'No image uploaded' });

    console.log('SERVER: Received donation submission for userId:', userId);

    try {
        const newSubmission = new EventSubmission({
            userId,
            name,
            email,
            mobile,
            location,
            image: {
                data: req.file.buffer,      // Store buffer directly
                contentType: req.file.mimetype
            },
            claims: [] // Initialize claims array
        });

        await newSubmission.save();
        console.log('SERVER: Donation saved successfully.');
        res.status(200).json({ message: 'Donation submitted successfully' });
    } catch (error) {
        console.error('SERVER ERROR: Error saving donation submission:', error);
        res.status(500).json({ message: 'Server error saving donation: ' + error.message });
    }
});

// Get my submissions (for Submissions.html - user's own donations)
app.get('/api/my-submissions', authenticateUser, async (req, res) => {
    console.log('SERVER: Received request for /api/my-submissions for authenticated user.');
    // IMPORTANT: Use req.user.userId consistent with token payload
    const userId = req.user.userId;
    console.log('SERVER: Authenticated user ID from token:', userId); 

    if (!userId) {
        console.error('SERVER ERROR: userId is undefined after authentication in /api/my-submissions.');
        return res.status(500).json({ message: 'Authenticated user ID is missing.' });
    }

    try {
        // Find submissions associated with the authenticated user's ID
        // Ensure userId in EventSubmission schema matches the type of req.user.userId (string vs ObjectId)
        // If EventSubmission's userId is an ObjectId, you might need:
        // const submissions = await EventSubmission.find({ userId: new mongoose.Types.ObjectId(userId) }).sort({ createdAt: -1 });
        // But if it's a string (from uuidv4), this is correct:
        const submissions = await EventSubmission.find({ userId }).sort({ createdAt: -1 });
        console.log(`SERVER: Found ${submissions.length} submissions for user ${userId}.`);

        res.status(200).json(submissions);
        console.log('SERVER: Sent 200 OK response with user submissions.');

    } catch (error) {
        console.error('SERVER ERROR: Failed to fetch user submissions in /api/my-submissions:', error);
        res.status(500).json({ message: 'Server error fetching submissions: ' + error.message });
    }
});

// Submit a claim
app.post('/api/claim', async (req, res) => {
    const { donationId, name, mobile, email, address, state } = req.body;

    if (!donationId || !name || !mobile || !email || !address || !state) {
        return res.status(400).json({ message: 'All fields are required' });
    }

    console.log('SERVER: Received claim submission for donationId:', donationId);

    try {
        const donation = await EventSubmission.findById(donationId);
        if (!donation) {
            console.log('SERVER: Donation not found for ID:', donationId);
            return res.status(404).json({ message: 'Donation not found' });
        }

        const newClaim = {
            claimerName: name,
            claimerMobile: mobile,
            claimerEmail: email,
            claimerAddress: address,
            claimerState: state,
            claimedAt: new Date()
        };

        donation.claims.push(newClaim);
        await donation.save(); // Save the updated donation with the new claim
        console.log('SERVER: Claim added to donation and saved.');

        // Optionally, you can also save the claim to the separate Claim collection if needed for other purposes
        // const claimRecord = new Claim({
        //     donationId,
        //     claimerName: name,
        //     claimerMobile: mobile,
        //     claimerEmail: email,
        //     claimerAddress: address,
        //     claimerState: state
        // });
        // await claimRecord.save();
        // console.log('SERVER: Claim also saved to separate Claim collection.');

        res.status(201).json({ message: 'Claim submitted successfully!' });
    } catch (error) {
        console.error('SERVER ERROR: Error submitting claim:', error);
        res.status(500).json({ message: 'Server error during claim submission: ' + error.message });
    }
});


app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));