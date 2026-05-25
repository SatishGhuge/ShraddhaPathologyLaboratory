# Shraddha Pathology Laboratory - Backend API

A comprehensive backend system for managing diagnostic laboratory operations including tests, categories, charges, and patient management.

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- MySQL Database
- XAMPP/WAMP (recommended for local development)

### Installation

1. **Clone and Install**
```bash
cd backend
npm install
```

2. **Database Setup**
```bash
# Start MySQL (XAMPP/WAMP)
# Create database: shraddha_db

# Configure environment
cp .env.example .env
# Edit .env with your database credentials
```

3. **Run Migrations**
```bash
npm run prisma:migrate
npm run prisma:generate
```

4. **Seed Database**
```bash
node scripts/seed.js
```

5. **Start Server**
```bash
npm start
# or for development
npm run dev
```

## 📁 Project Structure

```
backend/
├── config/           # Database configuration
├── controllers/      # API route handlers
├── middleware/       # Authentication & validation
├── prisma/          # Database schema & migrations
├── routes/          # API route definitions
├── scripts/         # Database seeding & utilities
├── utils/           # Helper functions
├── server.js        # Main server file
└── package.json     # Dependencies & scripts
```

## 🔧 Key Features

### Test Management
- ✅ Create, read, update, delete tests
- ✅ Complex category and parameter system
- ✅ Multiple range types (By Sex, By Age, By Range)
- ✅ Rich text interpretation support
- ✅ Comprehensive validation

### Category System
- ✅ Hierarchical categories with parameters
- ✅ Normal ranges for different genders/ages
- ✅ Age-based ranges with time units
- ✅ Custom range values with interpretations
- ✅ JSON storage for complex data

### Charges Management
- ✅ Test charges (B2C/B2B pricing)
- ✅ Corporate-specific pricing
- ✅ Package charges
- ✅ Bulk operations support

### Master Data
- ✅ Departments with hierarchical structure
- ✅ Doctors, Franchises, Collection Centers
- ✅ Corporates with custom pricing
- ✅ Packages with test combinations

## 🛠 API Endpoints

### Tests
- `GET /api/master/tests` - Get all tests
- `GET /api/master/tests/:id` - Get test by ID
- `POST /api/master/tests` - Create new test
- `PUT /api/master/tests/:id` - Update test
- `DELETE /api/master/tests/:id` - Delete test

### Departments
- `GET /api/master/departments` - Get active departments
- `GET /api/master/departments/all` - Get all departments
- `POST /api/master/departments` - Create department
- `PUT /api/master/departments/:id` - Update department
- `DELETE /api/master/departments/:id` - Delete department

### Charges
- `GET /api/master/test-charges/all` - Get all test charges
- `POST /api/master/test-charges` - Create test charge
- `PUT /api/master/test-charges/:id` - Update test charge
- `DELETE /api/master/test-charges/:id` - Delete test charge

### Authentication
- `POST /api/auth/login` - Admin login
- `POST /api/auth/register` - Register new admin
- `GET /api/auth/profile` - Get admin profile

## 🗄 Database Schema

### Core Tables
- `Test` - Main test information
- `TestCategory` - Categories and parameters (flattened structure)
- `Department` - Test departments
- `TestCharge` - Pricing information
- `CorporateCharge` - Corporate-specific pricing

### Master Data Tables
- `Admin` - System administrators
- `Doctor` - Referring doctors
- `Franchise` - Franchise locations
- `CollectionCenter` - Sample collection points
- `Corporate` - Corporate clients
- `Package` - Test packages

## 🔐 Authentication

The system uses JWT-based authentication:
- Login with username/password
- JWT token for API access
- Role-based access control (SUPER_ADMIN, ADMIN, USER)

Default credentials:
- Username: `admin`
- Password: `Admin@123`

## 📊 Category System Architecture

The category system uses a flattened database structure for optimal performance:

```javascript
// Frontend Structure (Hierarchical)
{
  name: "HEMATOLOGY",
  isCategory: true,
  parameters: [
    {
      parameterName: "Hemoglobin",
      normalRanges: [...],
      ageRanges: [...],
      rangeValues: [...]
    }
  ]
}

// Database Structure (Flattened)
{
  categoryName: "HEMATOLOGY",
  parameterName: "Hemoglobin",
  maleLowValue: 13.5,
  maleHighValue: 17.5,
  // ... other flattened fields
}
```

## 🚀 Development

### Available Scripts
- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run prisma:migrate` - Run database migrations
- `npm run prisma:generate` - Generate Prisma client
- `npm run prisma:studio` - Open Prisma Studio

### Environment Variables
```env
DATABASE_URL="mysql://user:password@localhost:3306/shraddha_db"
JWT_SECRET="your-jwt-secret"
NODE_ENV="development"
PORT=5000
```

## 🧪 Testing

### Database Connection Test
```bash
node check-db.js
```

### API Testing
Use the provided batch files or test with curl/Postman:
```bash
# Test API connectivity
curl http://localhost:5000/api/master/departments
```

## 📝 Logging

The system includes comprehensive logging:
- Request/response logging
- Error tracking with stack traces
- Database operation logging
- Category processing logs

## 🔧 Troubleshooting

### Common Issues

1. **Database Connection Failed**
   - Check MySQL is running
   - Verify DATABASE_URL in .env
   - Ensure database exists

2. **Migration Errors**
   - Reset database: `npx prisma migrate reset`
   - Re-run migrations: `npm run prisma:migrate`

3. **Category Data Not Saving**
   - Check frontend sends `categoryDescription` field
   - Verify category validation in controller
   - Check database logs for errors

### Debug Mode
Set `NODE_ENV=development` for detailed logging.

## 📚 Additional Resources

- [Prisma Documentation](https://www.prisma.io/docs)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [JWT Authentication](https://jwt.io/introduction)

## 🤝 Contributing

1. Follow the existing code structure
2. Add proper error handling
3. Include validation for all inputs
4. Update documentation for new features
5. Test thoroughly before committing

## 📄 License

This project is proprietary software for Shraddha Pathology Laboratory.

---

**Last Updated**: March 2026  
**Version**: 2.0.0  
**Maintainer**: Shraddha Development Team