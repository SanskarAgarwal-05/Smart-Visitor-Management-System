# Smart Visitor Management System

Smart Visitor Management System is a web-based application designed to digitize and automate visitor registration and management. It replaces traditional manual visitor logs with a secure and efficient digital platform.

The system allows administrators to authenticate securely, register visitors, manage visitor records, and monitor visitor activities through a modern dashboard interface.

## Features Implemented

### Authentication

* Admin Registration
* Admin Login
* JWT Authentication
* Protected Routes
* Password Hashing using bcrypt

### Visitor Management

* Visitor Registration
* Unique Visitor ID Generation
* View Visitor Records
* Update Visitor Details
* Delete Visitor Records
* Visitor Status Management

### User Interface

* Responsive Dashboard
* Modern UI Design
* Dark Mode and Light Mode
* Sidebar Navigation
* Visitor Registration Form
* Visitor List Page

## Tech Stack

Frontend:

* React
* Vite
* Tailwind CSS

Backend:

* Node.js
* Express.js

Database:

* MongoDB Atlas

Authentication:

* JWT
* bcryptjs

## Installation

Backend Setup:

cd backend

npm install

npm start

Frontend Setup:

cd frontend

npm install

npm run dev

## Environment Variables

Create a .env file in the backend folder:

MONGODB_URI=your_mongodb_connection_string

PORT=5000

JWT_SECRET=your_secret_key

JWT_EXPIRES_IN=7d

## Future Enhancements

Phase 2:

* Real-Time Visitor Tracking
* Entry and Exit Monitoring
* Search and Filters
* Visitor Analytics Dashboard
* Socket.io Integration

Phase 3:

* Alerts and Notifications
* Visitor Reports
* Historical Activity Logs
* Deployment
* Security Enhancements

## Author

Sanskar Agarwal

Internship Project – Smart Visitor Management System
