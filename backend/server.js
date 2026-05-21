const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// Tạo thư mục uploads nếu chưa có
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

// Cấu hình multer cho upload file
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'avatar-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép upload file ảnh!'), false);
        }
    }
});

// Kết nối MySQL
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '123456', // Thay đổi password của bạn
    database: 'supplier_management',
    port: 3306 // Thêm dòng này để đổi cổng MySQL
};

let db;

async function connectDB() {
    try {
        db = await mysql.createConnection(dbConfig);
        console.log('Kết nối MySQL thành công!');
    } catch (error) {
        console.error('Lỗi kết nối MySQL:', error);
        process.exit(1);
    }
}

// Auth APIs
app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const [rows] = await db.execute(
            'SELECT * FROM users WHERE username = ? AND password = ?',
            [username, password]
        );
        
        if (rows.length > 0) {
            const user = rows[0];
            delete user.password; // Không trả về password
            res.json({ success: true, user });
        } else {
            res.json({ success: false, message: 'Tên đăng nhập hoặc mật khẩu không đúng!' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

app.post('/api/register', async (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        // Kiểm tra user đã tồn tại
        const [existing] = await db.execute(
            'SELECT id FROM users WHERE username = ? OR email = ?',
            [username, email]
        );
        
        if (existing.length > 0) {
            return res.json({ success: false, message: 'Tên đăng nhập hoặc email đã tồn tại!' });
        }
        
        // Tạo user mới
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password, avatar) VALUES (?, ?, ?, ?)',
            [username, email, password, '/placeholder.svg?height=80&width=80']
        );
        
        res.json({ success: true, message: 'Đăng ký thành công!' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Upload avatar
app.post('/api/upload-avatar', upload.single('avatar'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'Không có file được upload!' });
        }
        
        const userId = req.body.userId;
        const avatarPath = `/uploads/${req.file.filename}`;
        
        // Cập nhật avatar trong database
        await db.execute(
            'UPDATE users SET avatar = ? WHERE id = ?',
            [avatarPath, userId]
        );
        
        res.json({ success: true, avatarPath });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// Users APIs
app.get('/api/users', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT id, username, email, role, avatar, created_at FROM users');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', async (req, res) => {
    try {
        const { username, email, password, role } = req.body;
        const [result] = await db.execute(
            'INSERT INTO users (username, email, password, role, avatar) VALUES (?, ?, ?, ?, ?)',
            [username, email, password, role, '/placeholder.svg?height=80&width=80']
        );
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, password, role } = req.body;
        await db.execute(
            'UPDATE users SET username = ?, email = ?, password = ?, role = ? WHERE id = ?',
            [username, email, password, role, id]
        );
        res.json({ id, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM users WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Suppliers APIs
app.get('/api/suppliers', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT s.*, u.username as creator_name, u.avatar as creator_avatar 
            FROM suppliers s 
            LEFT JOIN users u ON s.user_id = u.id
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/suppliers', async (req, res) => {
    try {
        const { name, tax_code, phone, email, address, user_id } = req.body;
        const [result] = await db.execute(
            'INSERT INTO suppliers (name, tax_code, phone, email, address, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [name, tax_code, phone, email, address, user_id]
        );
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/suppliers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, tax_code, phone, email, address } = req.body;
        await db.execute(
            'UPDATE suppliers SET name = ?, tax_code = ?, phone = ?, email = ?, address = ? WHERE id = ?',
            [name, tax_code, phone, email, address, id]
        );
        res.json({ id, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/suppliers/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM suppliers WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Service Types APIs
app.get('/api/service-types', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM service_types');
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/service-types', async (req, res) => {
    try {
        const { name, description } = req.body;
        const [result] = await db.execute(
            'INSERT INTO service_types (name, description) VALUES (?, ?)',
            [name, description]
        );
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/service-types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description } = req.body;
        await db.execute(
            'UPDATE service_types SET name = ?, description = ? WHERE id = ?',
            [name, description, id]
        );
        res.json({ id, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/service-types/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM service_types WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Services APIs
app.get('/api/services', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT s.*, sup.name as supplier_name, st.name as service_type_name, u.username as creator_name
            FROM services s
            LEFT JOIN suppliers sup ON s.supplier_id = sup.id
            LEFT JOIN service_types st ON s.service_type_id = st.id
            LEFT JOIN users u ON s.user_id = u.id
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/services', async (req, res) => {
    try {
        const { name, supplier_id, service_type_id, price, description, user_id } = req.body;
        const [result] = await db.execute(
            'INSERT INTO services (name, supplier_id, service_type_id, price, description, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [name, supplier_id, service_type_id, price, description, user_id]
        );
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name, supplier_id, service_type_id, price, description } = req.body;
        await db.execute(
            'UPDATE services SET name = ?, supplier_id = ?, service_type_id = ?, price = ?, description = ? WHERE id = ?',
            [name, supplier_id, service_type_id, price, description, id]
        );
        res.json({ id, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/services/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM services WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Orders APIs
app.get('/api/orders', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT o.*, sup.name as supplier_name, s.name as service_name, u.username as creator_name
            FROM orders o
            LEFT JOIN suppliers sup ON o.supplier_id = sup.id
            LEFT JOIN services s ON o.service_id = s.id
            LEFT JOIN users u ON o.user_id = u.id
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/orders', async (req, res) => {
    try {
        const { supplier_id, service_id, order_date, status, total_price, user_id } = req.body;
        const [result] = await db.execute(
            'INSERT INTO orders (supplier_id, service_id, order_date, status, total_price, user_id) VALUES (?, ?, ?, ?, ?, ?)',
            [supplier_id, service_id, order_date, status, total_price, user_id]
        );
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { supplier_id, service_id, order_date, status, total_price } = req.body;
        await db.execute(
            'UPDATE orders SET supplier_id = ?, service_id = ?, order_date = ?, status = ?, total_price = ? WHERE id = ?',
            [supplier_id, service_id, order_date, status, total_price, id]
        );
        res.json({ id, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/orders/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM orders WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Contacts APIs
app.get('/api/contacts', async (req, res) => {
    try {
        const [rows] = await db.execute(`
            SELECT c.*, s.name as supplier_name
            FROM contacts c
            LEFT JOIN suppliers s ON c.supplier_id = s.id
        `);
        res.json(rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/contacts', async (req, res) => {
    try {
        const { supplier_id, contact_name, phone, email } = req.body;
        const [result] = await db.execute(
            'INSERT INTO contacts (supplier_id, contact_name, phone, email) VALUES (?, ?, ?, ?)',
            [supplier_id, contact_name, phone, email]
        );
        res.json({ id: result.insertId, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/contacts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { supplier_id, contact_name, phone, email } = req.body;
        await db.execute(
            'UPDATE contacts SET supplier_id = ?, contact_name = ?, phone = ?, email = ? WHERE id = ?',
            [supplier_id, contact_name, phone, email, id]
        );
        res.json({ id, ...req.body });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/contacts/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await db.execute('DELETE FROM contacts WHERE id = ?', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Dashboard stats
app.get('/api/dashboard-stats', async (req, res) => {
    try {
        const { userId, userRole } = req.query;
        
        const [supplierCount] = await db.execute('SELECT COUNT(*) as count FROM suppliers');
        const [serviceCount] = await db.execute('SELECT COUNT(*) as count FROM services');
        const [userCount] = await db.execute('SELECT COUNT(*) as count FROM users');
        
        let orderCount;
        if (userRole === 'admin') {
            [orderCount] = await db.execute('SELECT COUNT(*) as count FROM orders');
        } else {
            [orderCount] = await db.execute('SELECT COUNT(*) as count FROM orders WHERE user_id = ?', [userId]);
        }
        
        res.json({
            suppliers: supplierCount[0].count,
            services: serviceCount[0].count,
            orders: orderCount[0].count,
            users: userCount[0].count
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Khởi động server
async function startServer() {
    await connectDB();
    app.listen(PORT, () => {
        console.log(`Server đang chạy tại http://localhost:${PORT}`);
    });
}

startServer();