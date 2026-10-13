# Dynamic Form Builder & Response Management System

A full-stack web application that allows users to create dynamic forms, collect responses, manage submissions, and analyze form data without changing the application code.

The system provides a configurable form-building platform where administrators can create forms, add different field types, configure validation rules, control field visibility, collect responses, view analytics, and export response data.

---

## 🚀 Features

### Authentication & Authorization

- User registration and login
- JWT-based authentication
- Access token and refresh token support
- Password change
- Current user information
- Role-Based Access Control (RBAC)
- Admin and User roles
- Protected API endpoints
- Admin-only user and role management

### Dynamic Form Builder

- Create forms
- View forms
- Update forms
- Delete forms
- Enable / disable forms
- Dynamic field creation
- Dynamic field configuration
- Field ordering
- Required field configuration
- Field options configuration
- Conditional field visibility
- Form schema management
- Drag-and-drop form building
- Dynamic form rendering

### Supported Field Types

- Text
- Number
- Email
- Date
- Dropdown
- Checkbox
- Radio Button
- File Upload
- Rating

### Response Management

- Public form submissions
- Authenticated form submissions
- Required field validation
- Response creation
- Response viewing
- Response updating
- Response search
- Response filtering
- Response history
- Submission tracking

### Dashboard & Analytics

- Dashboard statistics
- Form statistics
- Response statistics
- Form-wise analytics
- Response summaries
- Submission trends
- Activity tracking
- User activity logs

### Export

- Export form responses to Excel
- Export form responses to PDF
- Background export processing
- Celery-based background tasks
- Redis-based task queue

---

# 🧠 How the Application Works

The application follows a configuration-driven approach.

Instead of creating every form directly inside the source code, the form structure is stored as data.

For example, a form field can contain configuration such as:
The frontend reads this configuration and dynamically renders the correct UI component.
Example:
Text Configuration
        ↓
Text Input

Dropdown Configuration
        ↓
Dropdown Component

Radio Configuration
        ↓
Radio Button Group

Rating Configuration
        ↓
Rating Component

This allows different forms to be created using the same application without changing the application code.
🔄 Main Application Flow
User
  ↓
Login / Registration
  ↓
JWT Authentication
  ↓
Form Builder
  ↓
Create Form
  ↓
Add Dynamic Fields
  ↓
Configure Fields
  ↓
Save Form Configuration
  ↓
Enable / Publish Form
  ↓
User Opens Form
  ↓
Generic Form Renderer
  ↓
Fill Form
  ↓
Validation
  ↓
Submit Response
  ↓
Backend Processing
  ↓
Store Response in Database
  ↓
Response Management
  ↓
Dashboard & Analytics
  ↓
Excel / PDF Export

🏗️ System Architecture
                    ┌──────────────────────┐
                    │      React UI        │
                    │ TypeScript + MUI     │
                    └──────────┬───────────┘
                               │
                               │ REST API
                               ▼
                    ┌──────────────────────┐
                    │       FastAPI        │
                    │      Backend         │
                    └──────────┬───────────┘
                               │
             ┌─────────────────┼─────────────────┐
             │                 │                 │
             ▼                 ▼                 ▼
       ┌───────────┐     ┌────────────┐    ┌─────────────┐
       │   MySQL   │     │   Redis    │    │   Celery    │
       │ Database  │     │ Task Queue │    │   Worker    │
       └───────────┘     └────────────┘    └─────────────┘

🛠️ Technology Stack
Backend
- Python 3.12
- FastAPI
- SQLAlchemy
- Alembic
- Pydantic
- MySQL 8
- PyJWT
- Bcrypt
- Celery
- Redis
Frontend
- React
- TypeScript
- Vite
- Material UI (MUI)
- Axios
- React Router
- React Hook Form
- Chart.js
Tools
- Git
- GitHub
- Docker
- Docker Compose
- Postman
- Swagger / OpenAPI
- MySQL Workbench
- VS Code
🗄️ Database
The application uses MySQL 8 as the primary relational database.
The main application entities include:
Users
Roles
Forms
Form Fields
Field Options
Form Responses
Response Details
Response History
Activity Logs

Main Relationship Flow
User
  ↓
Role

User
  ↓
Forms
  ↓
Form Fields
  ↓
Field Options

Form
  ↓
Form Responses
  ↓
Response Details
  ↓
Response History

User / System
  ↓
Activity Logs

📁 Project Structure
Dynamic_Form_Builder_Response_Management_System/
│
├── backend/
│   ├── alembic/
│   │   └── versions/
│   │
│   ├── app/
│   │   ├── api/
│   │   │   └── v1/
│   │   │
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   │
│   │   ├── models/
│   │   │   └── models.py
│   │   │
│   │   ├── schemas/
│   │   │
│   │   ├── services/
│   │   │
│   │   ├── worker/
│   │   │   ├── celery_app.py
│   │   │   └── tasks.py
│   │   │
│   │   └── main.py
│   │
│   ├── tests/
│   ├── Dockerfile
│   ├── alembic.ini
│   └── requirements.txt
│
├── formflow-frontend-redesign/
│   └── frontend-redesign/
│       ├── src/
│       ├── Dockerfile
│       ├── index.html
│       ├── package.json
│       ├── package-lock.json
│       ├── nginx.conf
│       ├── tsconfig.json
│       └── vite.config.ts
│
├── docs/
├── postman/
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md

⚙️ Environment Configuration
The project uses environment variables for database, authentication, Redis, uploads, and exports.
Example configuration:
DATABASE_URL=mysql+pymysql://formuser:formpass@db:3306/formbuilder

SECRET_KEY=your_secret_key
ALGORITHM=HS256

ACCESS_TOKEN_EXPIRE_MINUTES=30
REFRESH_TOKEN_EXPIRE_DAYS=7

CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1

EXPORT_DIR=/data/exports
UPLOAD_DIR=/data/uploads

Do not commit the real .env file or production credentials to GitHub.

The repository contains .env.example as a configuration template.
🐳 Docker Configuration
The project uses Docker Compose to run the complete application stack.
The following services are configured:
MySQL
Redis
FastAPI Backend
Celery Worker
React Frontend

Start the Complete Application
From the project root:
docker compose up --build

Run in Background
docker compose up --build -d

Check Running Containers
docker compose ps

Stop the Application
docker compose down

Stop and Remove Containers
docker compose down

🌐 Application URLs
After starting the project with Docker Compose:
Frontend
http://localhost:3000

Backend API
http://localhost:8000

Swagger API Documentation
http://localhost:8000/docs

OpenAPI JSON
http://localhost:8000/openapi.json

MySQL
The MySQL container runs internally on:
3306

The host port is configured through Docker Compose.
Redis
Redis runs internally on:
6379

🔐 Default Admin Account
For local development, a default administrator account is available.
Email:
admin@example.com

Password:
Admin@12345

Change development credentials before using the application in a production environment.

🔑 Authentication Flow
Authentication uses JWT tokens.
User Login
    ↓
FastAPI Authentication
    ↓
Validate Email + Password
    ↓
Generate JWT Access Token
    ↓
Frontend Stores Authentication State
    ↓
API Requests
    ↓
Authorization: Bearer <JWT>

Protected endpoints verify the JWT before processing the request.
👥 Role-Based Access Control
The application supports two primary roles:
Admin
User

Admin
Admin users can perform administrative operations such as:
- Manage users
- Manage roles
- Create forms
- Update forms
- Delete forms
- Enable / disable forms
- Manage form fields
- View responses
- Access analytics
- View activity logs
- Export response data
User
Users can perform operations allowed by the application's authorization rules, including:
- Login
- Access permitted forms
- Submit responses
- View permitted response information
🧩 Dynamic Form Builder Processing
The form builder allows an administrator to create a form without writing new frontend or backend code.
Form Creation Flow
Create Form
    ↓
Add Field
    ↓
Select Field Type
    ↓
Configure Field
    ↓
Set Required / Optional
    ↓
Add Options if Required
    ↓
Set Field Order
    ↓
Configure Conditional Visibility
    ↓
Save Form

The configuration is stored in the database.
🎨 Generic Form Renderer
The frontend uses a generic rendering approach.
The renderer receives the field configuration and selects the appropriate UI component.
Field Configuration
        ↓
Generic Renderer
        ↓
Check Field Type
        ↓
┌─────────────────────────────┐
│ text      → Text Input      │
│ number    → Number Input    │
│ email     → Email Input     │
│ date      → Date Input      │
│ dropdown  → Select          │
│ checkbox  → Checkbox        │
│ radio     → Radio Group     │
│ file      → File Upload     │
│ rating    → Rating Control  │
└─────────────────────────────┘

This is the main reason the application can support multiple forms using the same frontend implementation.
✅ Form Validation
The system supports required-field validation.
Example:
Field: Email
Required: Yes

If the user does not enter a value:
Submit
  ↓
Validation
  ↓
Required Field Missing
  ↓
Submission Blocked

Valid data is sent to the backend for further processing.
👁️ Conditional Field Visibility
Fields can be displayed based on another field's value.
Example:
Question:
Do you have previous experience?

Answer:
Yes

        ↓

Show:
Experience Details

If the answer is:
No

the dependent field can remain hidden.
🔢 Field Ordering
Fields can be arranged in the required order using the form builder.
Example:
1. Full Name
2. Email
3. Phone Number
4. Date of Birth
5. Experience
6. Rating

The order is stored as part of the form configuration and used when rendering the form.
📝 Response Processing
When a user submits a form:
User fills form
      ↓
Frontend validation
      ↓
API request
      ↓
FastAPI endpoint
      ↓
Authentication / Authorization
      ↓
Backend validation
      ↓
Save Form Response
      ↓
Save Response Details
      ↓
Create Activity Log
      ↓
Return Response

The response data is stored in the database and can later be viewed, filtered, updated, analyzed, or exported.
📚 Response History
Response changes can be tracked through response history.
Response Created
       ↓
Response Updated
       ↓
Previous State Recorded
       ↓
History Available

This provides traceability for response modifications.
📊 Dashboard & Analytics Processing
The dashboard retrieves application statistics from the backend.
Typical information includes:
Total Forms
Active Forms
Total Responses
Users
Recent Activity
Form Statistics
Response Statistics

Analytics can provide form-specific response information and visual summaries.
📤 Excel / PDF Export
The system supports exporting form responses.
Synchronous Export
For supported export endpoints, the backend can generate:
Excel
PDF

Background Export
Long-running exports can be processed using Celery.
Frontend
   ↓
FastAPI
   ↓
Create Celery Task
   ↓
Redis
   ↓
Celery Worker
   ↓
Generate Excel / PDF
   ↓
Save Export File
   ↓
Download

Redis acts as the broker/result backend.
Celery is responsible for executing the background task.
🔴 Redis
Redis is used as the messaging layer for background processing.
In this project:
FastAPI
   ↓
Redis
   ↓
Celery Worker

Redis does not generate the Excel or PDF file.
It stores and manages the queued background task information while the Celery worker performs the actual export operation.
🟢 Celery
Celery is used for background task execution.
Important project files:
backend/app/worker/celery_app.py
backend/app/worker/tasks.py

The Celery application connects to Redis and the task module contains background jobs such as response export processing.
The worker is started using:
celery -A app.worker.celery_app.celery_app worker --loglevel=info

When running through Docker Compose, the worker is started automatically by the configured worker service.
🗃️ Database Migration
Alembic is used for database migrations.
Run migrations with:
docker compose exec backend alembic upgrade head

Or, when running the backend directly:
cd backend
py -m alembic upgrade head

🧪 Testing
Backend tests are located inside:
backend/tests/

Run tests locally:
cd backend
pytest

When using Docker:
docker compose exec backend pytest

🔎 API Testing with Swagger
Swagger provides interactive API documentation.
Open:
http://localhost:8000/docs

Recommended testing order:
1. Health / System
       ↓
2. Register
       ↓
3. Login
       ↓
4. Get Current User
       ↓
5. Roles / Users
       ↓
6. Create Form
       ↓
7. Get Form
       ↓
8. Create Form Fields
       ↓
9. Configure Field Options
       ↓
10. Reorder Fields
       ↓
11. Enable Form
       ↓
12. Public Form
       ↓
13. Submit Response
       ↓
14. View Responses
       ↓
15. Response History
       ↓
16. Analytics
       ↓
17. Export
       ↓
18. Activity Logs

For protected endpoints, use:
Authorization: Bearer <JWT_TOKEN>

📮 Postman Testing
The project also contains Postman resources under:
postman/

Postman can be used to test the REST APIs independently from the React frontend.
Typical flow:
Postman
   ↓
FastAPI
   ↓
Service / Business Logic
   ↓
SQLAlchemy
   ↓
MySQL
   ↓
API Response
   ↓
Postman

🛡️ Security
The project follows basic application security practices:
- JWT-based authentication
- Password hashing
- Protected routes
- Role-based authorization
- CORS configuration
- Environment variables
- Database credentials outside source code
- .env excluded from Git
- Separate development and production configuration
Never commit:
.env
Database passwords
JWT secret keys
Production credentials
Private API keys

🧰 Useful Docker Commands
Build containers
docker compose build

Start containers
docker compose up

Start in background
docker compose up -d

Rebuild and start
docker compose up --build

View container status
docker compose ps

View backend logs
docker compose logs backend

View worker logs
docker compose logs worker

View Redis logs
docker compose logs redis

View frontend logs
docker compose logs frontend

Follow backend logs
docker compose logs -f backend

Follow worker logs
docker compose logs -f worker

Stop services
docker compose down

🌿 Git & GitHub
Clone the project:
git clone https://github.com/Rahulrajdev-80/Dynamic_Form_Builder_Response_Management_System.git

Navigate to the project:
cd Dynamic_Form_Builder_Response_Management_System

Check Git status:
git status

Add changes:
git add .

Commit changes:
git commit -m "Update project"

Push changes:
git push

📌 Development Workflow
The recommended development workflow is:
1. Start Docker services
        ↓
2. Verify MySQL
        ↓
3. Verify Redis
        ↓
4. Verify FastAPI
        ↓
5. Verify Celery Worker
        ↓
6. Open React Frontend
        ↓
7. Login
        ↓
8. Create / Configure Form
        ↓
9. Submit Response
        ↓
10. Verify Response
        ↓
11. Check Analytics
        ↓
12. Test Export
        ↓
13. Check Activity Logs

📋 Main Components
Component	Responsibility
React	User interface
TypeScript	Frontend type safety
Material UI	UI components
React Router	Frontend routing
React Hook Form	Form handling
Axios	API communication
Chart.js	Analytics charts
FastAPI	REST API backend
SQLAlchemy	Database ORM
Alembic	Database migrations
Pydantic	Data validation
JWT	Authentication
MySQL	Application database
Redis	Background task queue / result backend
Celery	Background task execution
Docker	Application containerization
Docker Compose	Multi-service orchestration
Swagger	API documentation and testing
Postman	API testing


📌 Project Highlights
Configuration-Driven Forms
Forms are stored as configurable data rather than hard-coded application screens.
Reusable Generic Renderer
The frontend can render multiple field types from the same configuration-based rendering system.
Role-Based Access
Different application operations can be controlled based on Admin and User roles.
Background Processing
Excel and PDF export operations can be processed asynchronously using Celery and Redis.
Response Tracking
Responses and their changes can be managed and tracked through response history and activity logs.
Full-Stack Architecture
The project combines:
React
+
FastAPI
+
MySQL
+
Redis
+
Celery
+
Docker

into a complete form management platform.
📈 Future Enhancements
Possible future improvements include:
- Email notifications
- Advanced form templates
- More conditional logic operators
- Advanced analytics dashboards
- Scheduled reports
- Cloud file storage
- Multi-language forms
- Form versioning
- More export formats
- Production deployment with CI/CD
👨‍💻 Author
Rahul Raj K
```text
Field Type
Field Label
Required
Options
Order
Validation Rules
Visibility Rules
