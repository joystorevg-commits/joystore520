PRAGMA foreign_keys = ON;
CREATE TABLE users (id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE COLLATE NOCASE, password_hash TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('owner','manager','seller','stock')), active INTEGER NOT NULL DEFAULT 1 CHECK(active IN (0,1)), created_at TEXT NOT NULL);
CREATE TABLE bootstrap (id INTEGER PRIMARY KEY CHECK(id=1), user_id TEXT NOT NULL REFERENCES users(id));
CREATE TABLE sessions (token_hash TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id),csrf TEXT NOT NULL,expires_at INTEGER NOT NULL);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE login_limits (key TEXT PRIMARY KEY,count INTEGER NOT NULL,expires_at INTEGER NOT NULL);
CREATE TABLE products (id TEXT PRIMARY KEY,name TEXT NOT NULL,category TEXT NOT NULL,price INTEGER NOT NULL CHECK(price>0),cost INTEGER NOT NULL CHECK(cost>=0),image TEXT NOT NULL DEFAULT '',active INTEGER NOT NULL DEFAULT 1);
CREATE TABLE variants (id TEXT PRIMARY KEY,product_id TEXT NOT NULL REFERENCES products(id),color TEXT NOT NULL COLLATE NOCASE,size TEXT NOT NULL COLLATE NOCASE,stock INTEGER NOT NULL DEFAULT 0 CHECK(stock>=0),UNIQUE(product_id,color,size));
CREATE INDEX variants_product ON variants(product_id);
CREATE TABLE sales (id TEXT PRIMARY KEY,created_at TEXT NOT NULL,customer TEXT NOT NULL,phone TEXT NOT NULL,channel TEXT NOT NULL CHECK(channel IN ('Presencial','WhatsApp')),seller_id TEXT NOT NULL REFERENCES users(id),seller_name TEXT NOT NULL,fulfillment TEXT NOT NULL,guarantee TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'Concluída' CHECK(status IN ('Concluída','Cancelada')),subtotal INTEGER NOT NULL CHECK(subtotal>=0),discount INTEGER NOT NULL CHECK(discount>=0 AND discount<=subtotal),freight INTEGER NOT NULL CHECK(freight>=0),total INTEGER NOT NULL CHECK(total=subtotal-discount+freight),cancelled_by TEXT REFERENCES users(id),cancelled_at TEXT,cancel_reason TEXT);
CREATE INDEX sales_date ON sales(created_at DESC);
CREATE INDEX sales_seller ON sales(seller_id,created_at DESC);
CREATE TABLE sale_items (sale_id TEXT NOT NULL REFERENCES sales(id),variant_id TEXT NOT NULL REFERENCES variants(id),product_name TEXT NOT NULL,color TEXT NOT NULL,size TEXT NOT NULL,qty INTEGER NOT NULL CHECK(qty>0),unit_price INTEGER NOT NULL CHECK(unit_price>0),unit_cost INTEGER NOT NULL CHECK(unit_cost>=0),PRIMARY KEY(sale_id,variant_id));
CREATE TABLE payments (id TEXT PRIMARY KEY,sale_id TEXT NOT NULL REFERENCES sales(id),amount INTEGER NOT NULL CHECK(amount>0),method TEXT NOT NULL,created_at TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id));
CREATE INDEX payments_sale ON payments(sale_id);
CREATE TABLE movements (id INTEGER PRIMARY KEY AUTOINCREMENT,variant_id TEXT NOT NULL REFERENCES variants(id),qty INTEGER NOT NULL CHECK(qty<>0),reason TEXT NOT NULL,created_at TEXT NOT NULL,actor_id TEXT NOT NULL REFERENCES users(id));
CREATE TABLE audit (id INTEGER PRIMARY KEY AUTOINCREMENT,actor_id TEXT NOT NULL REFERENCES users(id),action TEXT NOT NULL,entity_id TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE operations (key TEXT PRIMARY KEY,actor_id TEXT NOT NULL REFERENCES users(id),fingerprint TEXT NOT NULL,response TEXT NOT NULL,created_at TEXT NOT NULL);
CREATE TABLE settings (id INTEGER PRIMARY KEY CHECK(id=1),whatsapp TEXT NOT NULL DEFAULT '');
CREATE TRIGGER sale_item_stock AFTER INSERT ON sale_items BEGIN
 UPDATE variants SET stock=stock-NEW.qty WHERE id=NEW.variant_id;
 INSERT INTO movements(variant_id,qty,reason,created_at,actor_id) SELECT NEW.variant_id,-NEW.qty,'Venda '||NEW.sale_id,created_at,seller_id FROM sales WHERE id=NEW.sale_id;
END;
CREATE TRIGGER payment_guard BEFORE INSERT ON payments BEGIN
 SELECT CASE WHEN (SELECT status FROM sales WHERE id=NEW.sale_id)<>'Concluída' THEN RAISE(ABORT,'SALE_CANCELLED') END;
 SELECT CASE WHEN NEW.amount+COALESCE((SELECT SUM(amount) FROM payments WHERE sale_id=NEW.sale_id),0)>(SELECT total FROM sales WHERE id=NEW.sale_id) THEN RAISE(ABORT,'PAYMENT_EXCEEDS_BALANCE') END;
END;
CREATE TRIGGER cancel_stock AFTER UPDATE OF status ON sales WHEN OLD.status='Concluída' AND NEW.status='Cancelada' BEGIN
 UPDATE variants SET stock=stock+(SELECT qty FROM sale_items WHERE sale_id=NEW.id AND variant_id=variants.id) WHERE id IN (SELECT variant_id FROM sale_items WHERE sale_id=NEW.id);
 INSERT INTO movements(variant_id,qty,reason,created_at,actor_id) SELECT variant_id,qty,'Cancelamento '||NEW.id||': '||NEW.cancel_reason,NEW.cancelled_at,NEW.cancelled_by FROM sale_items WHERE sale_id=NEW.id;
END;
CREATE TRIGGER prevent_reopen BEFORE UPDATE OF status ON sales WHEN OLD.status='Cancelada' AND NEW.status<>'Cancelada' BEGIN SELECT RAISE(ABORT,'SALE_CANCELLED'); END;
