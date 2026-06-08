const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const mysql = require('mysql2/promise');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 7777;

// Configuration options
const SECRET_PASSWORD = 'SwiftAdmin2026';
const REVOLUT_ME_USERNAME = process.env.REVOLUT_ME_USERNAME || 'swiftride'; // Pseudo Revolut.me du proprietaire

// Managed MySQL database initialization
let dbPool = null;

async function initDatabase() {
    if (!process.env.DB_HOST) {
        console.log('No DB_HOST environment variable found. Database connection skipped, using local JSON file.');
        return;
    }
    
    try {
        dbPool = mysql.createPool({
            host: process.env.DB_HOST,
            port: parseInt(process.env.DB_PORT, 10) || 3306,
            database: process.env.DB_NAME,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });
        
        // Auto-create table
        const connection = await dbPool.getConnection();
        try {
            await connection.query(`
                CREATE TABLE IF NOT EXISTS reservations (
                    id VARCHAR(255) PRIMARY KEY,
                    booking_data TEXT NOT NULL,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
            `);
            console.log('Successfully connected to MySQL database and verified reservations table.');
        } finally {
            connection.release();
        }
    } catch (err) {
        console.error('Failed to initialize database connection pool:', err.message);
        dbPool = null; // Ensure fallback to filesystem is triggered
    }
}
initDatabase();

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
// Serve compiled static assets from dist
app.use(express.static(path.join(__dirname, 'dist')));

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

async function getReservations() {
    if (memoryReservations !== null) {
        return memoryReservations;
    }

    if (dbPool) {
        try {
            const [rows] = await dbPool.query('SELECT booking_data FROM reservations ORDER BY created_at ASC');
            memoryReservations = rows.map(row => {
                const booking = JSON.parse(row.booking_data);
                return {
                    ...booking,
                    estimatedRevenue: estimateRevenue(booking)
                };
            });
            return memoryReservations;
        } catch (e) {
            console.error('Error reading from database, falling back to filesystem:', e);
        }
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

async function saveReservations(bookings) {
    memoryReservations = bookings;
    try {
        fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify(bookings, null, 4));
    } catch (e) {
        console.error('Error writing reservations file:', e);
    }
}

// ==================== ROUTES ====================

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ ok: true });
});

// Client Homepage
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Admin Page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'dist', 'admin.html'));
});

// Admin Status JSON API
app.get('/api/admin/status', async (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    const loggedIn = cookies.admin_logged === 'true';

    if (loggedIn) {
        const bookings = await getReservations();

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

        res.json({
            loggedIn: true,
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
        res.json({ loggedIn: false });
    }
});

// Admin Login JSON API
app.post('/api/admin/login', (req, res) => {
    const { password } = req.body;

    if (password === SECRET_PASSWORD) {
        res.cookie('admin_logged', 'true', {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000 // 1 day expiration
        });
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, error: 'Mot de passe incorrect.' });
    }
});

// Admin Logout JSON API
app.post('/api/admin/logout', (req, res) => {
    res.clearCookie('admin_logged');
    res.json({ success: true });
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
app.post('/api/reservations', async (req, res) => {
    try {
        const bookingData = req.body;

        if (!bookingData || !bookingData.id) {
            return res.status(400).json({ success: false, message: 'Données invalides.' });
        }

        // Save to Database (MySQL if pool initialized, else filesystem fallback)
        if (dbPool) {
            await dbPool.query(
                'INSERT INTO reservations (id, booking_data) VALUES (?, ?) ON DUPLICATE KEY UPDATE booking_data = ?',
                [bookingData.id, JSON.stringify(bookingData), JSON.stringify(bookingData)]
            );
            if (memoryReservations !== null) {
                memoryReservations.push(bookingData);
            }
        } else {
            const bookings = await getReservations();
            bookings.push(bookingData);
            await saveReservations(bookings);
        }

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
app.delete('/api/reservations/:id', async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        let deleted = false;
        if (dbPool) {
            const [result] = await dbPool.query('DELETE FROM reservations WHERE id = ?', [bookingId]);
            deleted = result.affectedRows > 0;
            if (deleted && memoryReservations !== null) {
                memoryReservations = memoryReservations.filter(b => b.id !== bookingId);
            }
        } else {
            let bookings = await getReservations();
            const initialLength = bookings.length;
            bookings = bookings.filter(b => b.id !== bookingId);
            if (bookings.length !== initialLength) {
                deleted = true;
                await saveReservations(bookings);
            }
        }

        if (!deleted) {
            return res.status(404).json({ success: false, message: 'Réservation introuvable.' });
        }

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
