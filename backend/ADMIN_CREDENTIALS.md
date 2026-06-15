# Admin Login Credentials

## Available Admin Accounts

### Super Admin
- **Username**: `admin`
- **Password**: `Admin@123`
- **Email**: `harshadgaikwad1503@gmail.com` (Updated for testing forgot password)
- **Role**: `SUPER_ADMIN`

### Regular User
- **Username**: `user`
- **Password**: `User@123`
- **Email**: `user@shraddha.com`
- **Role**: `USER`

## Login Instructions

1. **Frontend URL**: http://localhost:5174
2. **Select Role**: "Lab Admin" (for backend authentication)
3. **Enter Username**: `admin` or `user`
4. **Enter Password**: `Admin@123` or `User@123`
5. **Click Login**

## API Endpoints

### Login API
- **URL**: `POST http://localhost:5000/api/auth/login`
- **Body**:
```json
{
  "username": "admin",
  "password": "Admin@123"
}
```

### Response
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt_token_here",
  "admin": {
    "id": 1,
    "username": "admin",
    "email": "admin@shraddha.com",
    "role": "SUPER_ADMIN",
    "isActive": true
  }
}
```

## Troubleshooting

If you get "Invalid credentials" error:
1. Make sure backend is running on port 5000
2. Check if admin users exist by running: `node backend/scripts/seed.js`
3. Verify the username and password are correct
4. Check browser console for network errors

## Current Status
✅ Backend running on: http://localhost:5000
✅ Frontend running on: http://localhost:5174
✅ Admin users seeded successfully
✅ Login API working correctly
✅ CORS configured for frontend port