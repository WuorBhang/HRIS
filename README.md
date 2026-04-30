# SafiHub - Role-Based Employee Management System

A secure, elegant, and production-ready employee management system built with React + Vite (frontend), Node.js + Express (backend), firstore.rules (database) schema, and Firebase Authentication.

## Features

### Authentication & Security
- **Firebase Authentication**: Email/password login with secure token verification
- **Role-Based Access Control**: Three distinct roles - Admin, Employer, Employee
- **Account Activation Gate**: Users must be activated by admin before accessing dashboards
- **JWT Session Management**: Secure token-based session persistence
- **Protected Routes**: All dashboards are protected by role-based route guards

### Admin Dashboard
- **User Management**: View, activate, deactivate, and manage user roles
- **System Overview**: Real-time statistics on total users, active users, and role distribution
- **Activity Monitoring**: Track all user activities and system events
- **Account Activation**: Approve or reject new user accounts

### Employer Dashboard
- **Team Overview**: View employee list and attendance statistics
- **Attendance Tracking**: Monitor daily attendance and presence
- **Task Management**: Assign and track employee tasks
- **Reports & Analytics**: Generate reports on team performance

### Employee Dashboard
- **Personal Profile**: View and manage personal information
- **Task Tracking**: View assigned tasks and completion status
- **Attendance Records**: Check personal attendance history
- **Work Information**: View work-related details and assignments