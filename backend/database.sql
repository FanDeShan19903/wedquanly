
CREATE DATABASE IF NOT EXISTS supplier_management;
USE supplier_management;

-- Bảng users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    avatar VARCHAR(255) DEFAULT '/placeholder.svg?height=80&width=80',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng suppliers
CREATE TABLE suppliers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    tax_code VARCHAR(50),
    phone VARCHAR(20),
    email VARCHAR(100),
    address VARCHAR(255),
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Bảng service_types
CREATE TABLE service_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Bảng services
CREATE TABLE services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    supplier_id INT,
    service_type_id INT,
    price DECIMAL(10,2),
    description TEXT,
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (service_type_id) REFERENCES service_types(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Bảng orders
CREATE TABLE orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT,
    service_id INT,
    order_date DATE,
    status VARCHAR(50),
    total_price DECIMAL(10,2),
    user_id INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
    FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Bảng contacts
CREATE TABLE contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    supplier_id INT,
    contact_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);


USE supplier_management;

-- Data mẫu cho bảng users
INSERT INTO users (username, email, password, role, avatar) VALUES
('admin', 'admin@example.com', 'admin123', 'admin', '/placeholder.svg?height=80&width=80'),
('user1', 'user1@example.com', 'user1234', 'user', '/placeholder.svg?height=80&width=80'),
('user2', 'user2@example.com', 'user2345', 'user', '/placeholder.svg?height=80&width=80');

-- Data mẫu cho bảng suppliers
INSERT INTO suppliers (name, tax_code, phone, email, address, user_id) VALUES
('Supplier A', 'TAX123456', '0123456789', 'suppliera@example.com', '123 Street A', 1),
('Supplier B', 'TAX789012', '0987654321', 'supplierb@example.com', '456 Street B', 2);

-- Data mẫu cho bảng service_types
INSERT INTO service_types (name, description) VALUES
('Consulting', 'Consulting services'),
('Maintenance', 'Maintenance and support services');

-- Data mẫu cho bảng services
INSERT INTO services (name, supplier_id, service_type_id, price, description, user_id) VALUES
('Service 1', 1, 1, 1000.00, 'Description of Service 1', 1),
('Service 2', 2, 2, 2000.00, 'Description of Service 2', 2);

-- Data mẫu cho bảng orders
INSERT INTO orders (supplier_id, service_id, order_date, status, total_price, user_id) VALUES
(1, 1, '2025-06-01', 'Pending', 1000.00, 1),
(2, 2, '2025-06-15', 'Completed', 2000.00, 2);

-- Data mẫu cho bảng contacts
INSERT INTO contacts (supplier_id, contact_name, phone, email) VALUES
(1, 'Contact A1', '0123000000', 'contacta1@suppliera.com'),
(1, 'Contact A2', '0123000001', 'contacta2@suppliera.com'),
(2, 'Contact B1', '0987000000', 'contactb1@supplierb.com');
