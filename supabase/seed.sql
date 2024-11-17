-- Insert admin
INSERT INTO admins (name, email, password)
VALUES ('Admin Komandro', 'admin@komandro.com', 'komandro@admin');

-- Insert admin user
INSERT INTO users (email, password, role, admin_id)
VALUES ('admin@komandro.com', 'komandro@admin', 'admin', 1);
