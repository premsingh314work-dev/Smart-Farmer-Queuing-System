# Smart Farmer Procurement - Frontend

A React-based frontend for the Smart Farmer Procurement System with registration and login functionality.

## Features

- ✅ User Registration with validation
- ✅ User Login with JWT token
- ✅ Protected Routes
- ✅ Dashboard for authenticated users
- ✅ Responsive Design with Tailwind CSS
- ✅ Error Handling and Validation
- ✅ Local Storage for Token Management

## Tech Stack

- **React 18** - UI Framework
- **React Router v6** - Client-side routing
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **JavaScript ES6+**

## Getting Started

### Prerequisites

- Node.js (v16 or higher)
- npm or pnpm

### Installation

1. Install dependencies:

```bash
npm install
# or
pnpm install
```

2. Create `.env.local` file based on `.env.example`:

```bash
VITE_API_URL=http://localhost:5000/auth
```

### Development

Run the development server:

```bash
npm run dev
# or
pnpm dev
```

The app will be available at `http://localhost:3000`

### Build

Build for production:

```bash
npm run build
# or
pnpm build
```

### Preview

Preview the production build:

```bash
npm run preview
# or
pnpm preview
```

## Project Structure

```
src/
├── api/
│   └── auth.js              # API client functions
├── components/
│   ├── ErrorMessage.jsx     # Error display component
│   ├── LoadingSpinner.jsx   # Loading state component
│   ├── ProtectedRoute.jsx   # Route protection
│   └── index.js             # Component exports
├── context/
│   └── AuthContext.jsx      # Authentication context
├── pages/
│   ├── Login.jsx            # Login page
│   ├── Register.jsx         # Registration page
│   ├── Dashboard.jsx        # Dashboard page
│   └── index.js             # Page exports
├── App.jsx                  # Main app component
├── main.jsx                 # React entry point
└── index.css                # Global styles
```

## API Integration

The frontend connects to the backend API at `/auth` endpoint:

### Register

```
POST /auth/register
Body: {
  name: string,
  phone: string,
  email?: string,
  password: string,
  village: string,
  district: string,
  state: string,
  preferred_language?: string
}
Response: { success, message, token, user }
```

### Login

```
POST /auth/login
Body: {
  phone: string,
  password: string
}
Response: { success, message, token, user }
```

## Authentication

- Tokens are stored in localStorage
- Tokens are automatically sent with API requests
- Protected routes redirect unauthenticated users to login
- Logout clears tokens from localStorage

## Form Validation

### Registration

- Name: min 2 characters
- Phone: min 10 digits
- Email: valid email format (optional)
- Password: min 8 characters
- Confirm Password: must match password
- Village, District, State: min 2 characters
- Language: en, hi, pa, mr

### Login

- Phone: min 10 digits
- Password: min 8 characters

## Error Handling

- Network errors are caught and displayed
- Validation errors show field-specific messages
- API error responses are displayed in error banners
- Form submission is prevented on validation errors

## License

ISC
