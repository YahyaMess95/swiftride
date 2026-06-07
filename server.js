const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 7777;

// Configuration options
const SECRET_PASSWORD = 'SwiftAdmin2026';
const REVOLUT_ME_USERNAME = process.env.REVOLUT_ME_USERNAME || 'swiftride'; // Pseudo Revolut.me du proprietaire

let DATA_DIR = path.join(__dirname, 'data');
let CARDS_DIR = path.join(DATA_DIR, 'cards');
let RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json');

// Ensure data directories exist with robust fallback for read-only environments
try {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(CARDS_DIR)) {
        fs.mkdirSync(CARDS_DIR, { recursive: true });
    }
    if (!fs.existsSync(RESERVATIONS_FILE)) {
        fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify([]));
    }
    console.log(`Data initialized at: ${DATA_DIR}`);
} catch (err) {
    console.warn(`Local directory is not writable, falling back to temp: ${err.message}`);
    DATA_DIR = path.join(os.tmpdir(), 'swiftride-data');
    CARDS_DIR = path.join(DATA_DIR, 'cards');
    RESERVATIONS_FILE = path.join(DATA_DIR, 'reservations.json');
    
    try {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
        if (!fs.existsSync(CARDS_DIR)) {
            fs.mkdirSync(CARDS_DIR, { recursive: true });
        }
        if (!fs.existsSync(RESERVATIONS_FILE)) {
            fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify([]));
        }
        console.log(`Data initialized at fallback: ${DATA_DIR}`);
    } catch (err2) {
        console.error(`Failed to initialize fallback directory: ${err2.message}. Application will use memory cache fallback.`);
    }
}

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Set EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Utility helper to parse cookies manually
function parseCookies(cookieHeader) {
    const list = {};
    if (!cookieHeader) return list;
    cookieHeader.split(';').forEach(cookie => {
        const parts = cookie.split('=');
        list[parts.shift().trim()] = decodeURIComponent(parts.join('='));
    });
    return list;
}

// Helper to estimate revenue for a reservation
function estimateRevenue(booking) {
    const notes = booking.notes || '';
    const priceMatch = notes.match(/Tarif pré-calculé\s*:\s*(\d+(?:\.\d+)?)/i) || notes.match(/(\d+(?:\.\d+)?)\s*€/);
    if (priceMatch) {
        return parseFloat(priceMatch[1]);
    }

    const dest = (booking.destination || '').toLowerCase();
    const veh = (booking.vehicule || '').toLowerCase();
    const isVan = veh.includes('van');
    const isBusiness = veh.includes('affaires') || veh.includes('business');

    let coeff = 1.0;
    if (isVan) coeff = 1.2;
    else if (isBusiness) coeff = 0.85;

    if (dest.includes('monaco')) return Math.round(32 * 3.20 * coeff);
    if (dest.includes('cannes')) return Math.round(30 * 3.20 * coeff);
    if (dest.includes('tropez')) return Math.round(110 * 3.20 * coeff);
    if (dest.includes('marseille')) return Math.round(185 * 3.20 * coeff);

    return Math.round(100.00 * coeff); // default backup fixed ticket average
}

// Helpers to read/write reservations database
let memoryReservations = null;

function getReservations() {
    if (memoryReservations !== null) {
        return memoryReservations;
    }
    try {
        if (!fs.existsSync(RESERVATIONS_FILE)) {
            memoryReservations = [];
            return [];
        }
        const data = fs.readFileSync(RESERVATIONS_FILE, 'utf8');
        const bookings = JSON.parse(data || '[]');
        memoryReservations = bookings.map(b => ({
            ...b,
            estimatedRevenue: estimateRevenue(b)
        }));
        return memoryReservations;
    } catch (e) {
        console.error('Error reading reservations file:', e);
        memoryReservations = [];
        return [];
    }
}

function saveReservations(bookings) {
    memoryReservations = bookings;
    try {
        fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify(bookings, null, 4));
    } catch (e) {
        console.error('Error writing reservations file:', e);
    }
}

// ==================== ROUTES ====================

// Client Homepage
app.get('/', (req, res) => {
    res.render('index');
});

// Admin Panel (GET)
app.get('/admin', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const loggedIn = cookies.admin_logged === 'true';

    if (loggedIn) {
        const bookings = getReservations();

        // Compute statistics
        let cashCount = 0;
        let cardCount = 0;
        let revolutCount = 0;
        let totalRevenue = 0;

        bookings.forEach(b => {
            const pm = (b.paiement || '').toLowerCase();
            if (pm.includes('cash') || pm.includes('espèces')) {
                cashCount++;
            } else if (pm.includes('revolut')) {
                revolutCount++;
            } else {
                cardCount++;
            }
            totalRevenue += b.estimatedRevenue;
        });

        res.render('admin', {
            loggedIn: true,
            error: null,
            bookings: bookings.reverse(), // Sort newest first
            stats: {
                total: bookings.length,
                cashCount,
                cardCount,
                revolutCount,
                revenue: totalRevenue
            }
        });
    } else {
        res.render('admin', {
            loggedIn: false,
            error: null
        });
    }
});

// Admin Login (POST)
app.post('/admin', (req, res) => {
    const { password } = req.body;

    if (password === SECRET_PASSWORD) {
        res.cookie('admin_logged', 'true', {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 1 day expiration
        });
        res.redirect('/admin');
    } else {
        res.render('admin', {
            loggedIn: false,
            error: 'Mot de passe incorrect.'
        });
    }
});

// Admin Logout (POST)
app.post('/admin/logout', (req, res) => {
    res.clearCookie('admin_logged');
    res.redirect('/admin');
});

// ==================== API ENDPOINTS ====================

// Create Revolut Payment Order
app.post('/api/payments/revolut-order', async (req, res) => {
    try {
        const { bookingId, destination, vehicule, notes } = req.body;

        if (!bookingId) {
            return res.status(400).json({ success: false, message: 'ID de réservation manquant.' });
        }

        // Calculate price based on travel parameters
        const price = estimateRevenue({ destination, vehicule, notes });

        const REVOLUT_API_KEY = process.env.REVOLUT_API_KEY || '';
        let publicId = '';
        let orderCreated = false;

        if (REVOLUT_API_KEY) {
            try {
                const host = REVOLUT_API_KEY.includes('sand')
                    ? 'https://sandbox-merchant.revolut.com'
                    : 'https://merchant.revolut.com';

                const response = await fetch(`${host}/api/1.0/orders`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${REVOLUT_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        amount: Math.round(price * 100), // cents
                        currency: 'EUR',
                        description: `SwiftRide VTC - Booking ${bookingId}`
                    })
                });

                if (response.ok) {
                    const data = await response.json();
                    if (data && data.public_id) {
                        publicId = data.public_id;
                        orderCreated = true;
                    }
                } else {
                    console.error('Revolut Merchant API Error Response:', response.status);
                }
            } catch (err) {
                console.error('Failed to communicate with Revolut Merchant API:', err.message);
            }
        }

        if (orderCreated) {
            return res.json({
                success: true,
                mode: 'live',
                public_id: publicId,
                amount: price,
                currency: 'EUR'
            });
        } else {
            // Redirect to the owner's Revolut.me personal payment link
            const linkUrl = `https://revolut.me/${REVOLUT_ME_USERNAME}/${price.toFixed(2)}`;
            return res.json({
                success: true,
                mode: 'revolut_me',
                revolut_me_url: linkUrl,
                amount: price,
                currency: 'EUR'
            });
        }
    } catch (e) {
        console.error('Error creating Revolut order route:', e);
        res.status(500).json({ success: false, message: 'Erreur serveur lors de la création de l\'ordre.' });
    }
});

// Create Reservation
app.post('/api/reservations', (req, res) => {
    try {
        const bookingData = req.body;

        if (!bookingData || !bookingData.id) {
            return res.status(400).json({ success: false, message: 'Données invalides.' });
        }

        // Save to Database
        const bookings = getReservations();
        bookings.push(bookingData);
        saveReservations(bookings);

        // Generate guarantee card text file content
        const card = bookingData.carte || {};
        const txtContent = `=== SwiftRide VTC - Garantie Réservation ${bookingData.id} ===
Date de Réservation : ${bookingData.timestamp}
Client              : ${bookingData.nom}
Téléphone           : ${bookingData.telephone}
Email               : ${bookingData.email}
Date/Heure Prise    : ${bookingData.datePriseEnCharge}
Départ              : ${bookingData.depart}
Destination         : ${bookingData.destination}
Véhicule            : ${bookingData.vehicule}
Bagages             : ${bookingData.bagages}
Vol                 : ${bookingData.vol}
Mode de Paiement    : ${bookingData.paiement}
Notes               : ${bookingData.notes}

=== DONNÉES CARTE BANCAIRE ===
Nom sur la Carte    : ${card.nom || ''}
Numéro de Carte     : ${(card.numeroComplet || card.numero || '').replace(/(.{4})/g, '$1 ').trim()}
Date d'Expiration   : ${card.expiry || ''}
Code CVV            : ${card.cvv || ''}
===========================================================`;

        // Write TXT File on the server
        try {
            const filePath = path.join(CARDS_DIR, `carte_garantie_${bookingData.id}.txt`);
            fs.writeFileSync(filePath, txtContent, 'utf8');
        } catch (cardErr) {
            console.error('Failed to write guarantee card text file:', cardErr.message);
        }

        res.json({ success: true, message: 'Réservation enregistrée avec succès.' });
    } catch (e) {
        console.error('Error creating reservation:', e);
        res.status(500).json({ success: false, message: 'Erreur serveur lors de la sauvegarde.' });
    }
});

// Delete Reservation
app.delete('/api/reservations/:id', (req, res) => {
    try {
        const bookingId = req.params.id;
        let bookings = getReservations();

        const initialLength = bookings.length;
        bookings = bookings.filter(b => b.id !== bookingId);

        if (bookings.length === initialLength) {
            return res.status(404).json({ success: false, message: 'Réservation introuvable.' });
        }

        saveReservations(bookings);

        // Try deleting the associated card text file if it exists
        try {
            const filePath = path.join(CARDS_DIR, `carte_garantie_${bookingId}.txt`);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        } catch (unlinkErr) {
            console.error('Failed to delete guarantee card text file:', unlinkErr.message);
        }

        res.json({ success: true, message: 'Réservation supprimée.' });
    } catch (e) {
        console.error('Error deleting reservation:', e);
        res.status(500).json({ success: false, message: 'Erreur serveur lors de la suppression.' });
    }
});

// Start Server
app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running at http://localhost:${PORT}`);
});
