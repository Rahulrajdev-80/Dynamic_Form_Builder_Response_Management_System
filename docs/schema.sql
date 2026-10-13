-- Dynamic Form Builder - MySQL 8.0 schema (generated from the SQLAlchemy models)
-- Prefer `alembic upgrade head`; this file is provided for review / manual setup.
CREATE DATABASE IF NOT EXISTS formbuilder CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE formbuilder;
SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE roles (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	name VARCHAR(30) NOT NULL, 
	description VARCHAR(255), 
	PRIMARY KEY (id), 
	UNIQUE (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE users (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	full_name VARCHAR(120) NOT NULL, 
	email VARCHAR(255) NOT NULL, 
	hashed_password VARCHAR(255) NOT NULL, 
	role_id INTEGER NOT NULL, 
	is_active BOOL NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(role_id) REFERENCES roles (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE UNIQUE INDEX ix_users_email ON users (email);

CREATE TABLE activity_logs (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	user_id INTEGER, 
	action VARCHAR(50) NOT NULL, 
	entity_type VARCHAR(30) NOT NULL, 
	entity_id INTEGER, 
	details JSON, 
	ip_address VARCHAR(64), 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX ix_activity_logs_action ON activity_logs (action);
CREATE INDEX ix_activity_logs_created_at ON activity_logs (created_at);
CREATE INDEX ix_activity_logs_user_id ON activity_logs (user_id);

CREATE TABLE forms (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	title VARCHAR(255) NOT NULL, 
	description TEXT, 
	slug VARCHAR(160) NOT NULL, 
	owner_id INTEGER NOT NULL, 
	is_active BOOL NOT NULL, 
	is_public BOOL NOT NULL, 
	allow_response_editing BOOL NOT NULL, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(owner_id) REFERENCES users (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX ix_forms_owner_id ON forms (owner_id);
CREATE UNIQUE INDEX ix_forms_slug ON forms (slug);

CREATE TABLE form_fields (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	form_id INTEGER NOT NULL, 
	label VARCHAR(255) NOT NULL, 
	field_type VARCHAR(20) NOT NULL, 
	placeholder VARCHAR(255), 
	help_text VARCHAR(500), 
	is_required BOOL NOT NULL, 
	order_index INTEGER NOT NULL, 
	min_value FLOAT, 
	max_value FLOAT, 
	cond_field_id INTEGER, 
	cond_operator VARCHAR(20), 
	cond_value VARCHAR(255), 
	PRIMARY KEY (id), 
	FOREIGN KEY(form_id) REFERENCES forms (id) ON DELETE CASCADE, 
	FOREIGN KEY(cond_field_id) REFERENCES form_fields (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX ix_form_fields_form_id ON form_fields (form_id);

CREATE TABLE form_responses (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	form_id INTEGER NOT NULL, 
	user_id INTEGER, 
	created_at DATETIME NOT NULL, 
	updated_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(form_id) REFERENCES forms (id) ON DELETE CASCADE, 
	FOREIGN KEY(user_id) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX ix_form_responses_created_at ON form_responses (created_at);
CREATE INDEX ix_form_responses_form_id ON form_responses (form_id);

CREATE TABLE field_options (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	field_id INTEGER NOT NULL, 
	label VARCHAR(255) NOT NULL, 
	value VARCHAR(255) NOT NULL, 
	order_index INTEGER NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(field_id) REFERENCES form_fields (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX ix_field_options_field_id ON field_options (field_id);

CREATE TABLE response_details (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	response_id INTEGER NOT NULL, 
	field_id INTEGER NOT NULL, 
	value TEXT NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(response_id) REFERENCES form_responses (id) ON DELETE CASCADE, 
	FOREIGN KEY(field_id) REFERENCES form_fields (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX ix_response_details_response_field ON response_details (response_id, field_id);

CREATE TABLE response_history (
	id INTEGER NOT NULL AUTO_INCREMENT, 
	response_id INTEGER NOT NULL, 
	changed_by INTEGER, 
	action VARCHAR(20) NOT NULL, 
	snapshot JSON NOT NULL, 
	changes JSON NOT NULL, 
	created_at DATETIME NOT NULL, 
	PRIMARY KEY (id), 
	FOREIGN KEY(response_id) REFERENCES form_responses (id) ON DELETE CASCADE, 
	FOREIGN KEY(changed_by) REFERENCES users (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
CREATE INDEX ix_response_history_response_id ON response_history (response_id);

SET FOREIGN_KEY_CHECKS = 1;
INSERT IGNORE INTO roles (name, description) VALUES ('admin','Full access'),('user','Manage own forms and submit responses');
