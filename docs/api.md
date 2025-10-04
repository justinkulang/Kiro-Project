# API Documentation

## Overview

The MikroTik Hotspot Platform provides a RESTful API for managing users, vouchers, reports, and system configuration. All API endpoints require authentication using JWT tokens.

## Base URL

```
http://localhost:3001/api
```

## Authentication

### Login

**POST** `/auth/login`

Authenticate and receive access tokens.

**Request Body:**
```json
{
  "username": "admin",
  "password": "admin123"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "admin",
      "email": "admin@example.com",
      "role": "super_admin",
      "fullName": "System Administrator"
    },
    "tokens": {
      "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
  }
}
```

### Refresh Token

**POST** `/auth/refresh`

Refresh access token using refresh token.

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Logout

**POST** `/auth/logout`

Invalidate current session.

**Headers:**
```
Authorization: Bearer <access_token>
```

## Users API

### Get Users

**GET** `/users`

Retrieve paginated list of users.

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50, max: 200)
- `search` (string): Search term for username, email, or full name
- `isActive` (boolean): Filter by active status
- `billingPlanId` (number): Filter by billing plan
- `dateFrom` (string): Filter by creation date (ISO format)
- `dateTo` (string): Filter by creation date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": 1,
        "username": "user001",
        "email": "user@example.com",
        "fullName": "John Doe",
        "phone": "+1234567890",
        "isActive": true,
        "billingPlan": {
          "id": 1,
          "name": "Basic Plan",
          "price": 10.00
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "expiresAt": "2024-02-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 150,
      "totalPages": 3,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
```

### Create User

**POST** `/users`

Create a new hotspot user.

**Request Body:**
```json
{
  "username": "newuser",
  "password": "userpass123",
  "email": "newuser@example.com",
  "fullName": "New User",
  "phone": "+1234567890",
  "billingPlanId": 1,
  "isActive": true,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 2,
      "username": "newuser",
      "email": "newuser@example.com",
      "fullName": "New User",
      "phone": "+1234567890",
      "isActive": true,
      "billingPlan": {
        "id": 1,
        "name": "Basic Plan",
        "price": 10.00
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "expiresAt": "2024-12-31T23:59:59Z"
    }
  }
}
```

### Get User by ID

**GET** `/users/:id`

Retrieve a specific user by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": 1,
      "username": "user001",
      "email": "user@example.com",
      "fullName": "John Doe",
      "phone": "+1234567890",
      "isActive": true,
      "billingPlan": {
        "id": 1,
        "name": "Basic Plan",
        "price": 10.00
      },
      "createdAt": "2024-01-01T00:00:00Z",
      "expiresAt": "2024-02-01T00:00:00Z",
      "sessions": [
        {
          "id": 1,
          "startTime": "2024-01-15T09:00:00Z",
          "endTime": "2024-01-15T11:30:00Z",
          "bytesIn": 1048576,
          "bytesOut": 2097152
        }
      ]
    }
  }
}
```

### Update User

**PUT** `/users/:id`

Update an existing user.

**Request Body:**
```json
{
  "email": "updated@example.com",
  "fullName": "Updated Name",
  "isActive": false
}
```

### Delete User

**DELETE** `/users/:id`

Delete a user.

**Response:**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

### Batch Create Users

**POST** `/users/batch`

Create multiple users at once.

**Request Body:**
```json
{
  "prefix": "GUEST",
  "count": 10,
  "billingPlanId": 1,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

## Vouchers API

### Get Vouchers

**GET** `/vouchers`

Retrieve paginated list of vouchers.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Filter by status (available, used, expired)
- `billingPlanId` (number): Filter by billing plan

**Response:**
```json
{
  "success": true,
  "data": {
    "vouchers": [
      {
        "id": 1,
        "code": "GUEST001",
        "status": "available",
        "billingPlan": {
          "id": 1,
          "name": "Basic Plan"
        },
        "createdAt": "2024-01-01T00:00:00Z",
        "expiresAt": "2024-12-31T23:59:59Z",
        "usedAt": null,
        "usedBy": null
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 100,
      "totalPages": 2
    }
  }
}
```

### Generate Vouchers

**POST** `/vouchers/generate`

Generate multiple vouchers.

**Request Body:**
```json
{
  "prefix": "VIP",
  "count": 50,
  "billingPlanId": 2,
  "expiresAt": "2024-12-31T23:59:59Z"
}
```

### Redeem Voucher

**POST** `/vouchers/redeem`

Redeem a voucher code.

**Request Body:**
```json
{
  "code": "GUEST001",
  "username": "newuser"
}
```

## Billing Plans API

### Get Billing Plans

**GET** `/billing-plans`

Retrieve all billing plans.

**Response:**
```json
{
  "success": true,
  "data": {
    "billingPlans": [
      {
        "id": 1,
        "name": "Basic Plan",
        "description": "Basic internet access",
        "price": 10.00,
        "timeLimit": 3600,
        "dataLimit": 1073741824,
        "validityPeriod": 30,
        "isActive": true
      }
    ]
  }
}
```

### Create Billing Plan

**POST** `/billing-plans`

Create a new billing plan.

**Request Body:**
```json
{
  "name": "Premium Plan",
  "description": "Premium internet access",
  "price": 25.00,
  "timeLimit": 0,
  "dataLimit": 5368709120,
  "validityPeriod": 30,
  "isActive": true
}
```

## Dashboard API

### Get Dashboard Stats

**GET** `/dashboard/stats`

Retrieve dashboard statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalUsers": 1250,
      "activeUsers": 45,
      "totalVouchers": 500,
      "availableVouchers": 320,
      "monthlyRevenue": 12500.00,
      "todayRevenue": 450.00
    }
  }
}
```

### Get Active Users

**GET** `/dashboard/active-users`

Retrieve currently active users.

**Response:**
```json
{
  "success": true,
  "data": {
    "activeUsers": [
      {
        "username": "user001",
        "ipAddress": "192.168.1.100",
        "sessionStart": "2024-01-15T09:00:00Z",
        "bytesIn": 1048576,
        "bytesOut": 2097152,
        "sessionTime": 7200
      }
    ]
  }
}
```

### Get Bandwidth Usage

**GET** `/dashboard/bandwidth`

Retrieve bandwidth usage data for charts.

**Query Parameters:**
- `period` (string): Time period (hour, day, week, month)
- `from` (string): Start date (ISO format)
- `to` (string): End date (ISO format)

**Response:**
```json
{
  "success": true,
  "data": {
    "bandwidth": [
      {
        "timestamp": "2024-01-15T09:00:00Z",
        "upload": 1048576,
        "download": 2097152,
        "total": 3145728
      }
    ]
  }
}
```

## Reports API

### Generate Report

**POST** `/reports/generate`

Generate a report.

**Request Body:**
```json
{
  "type": "users",
  "format": "pdf",
  "dateFrom": "2024-01-01",
  "dateTo": "2024-01-31",
  "filters": {
    "isActive": true,
    "billingPlanId": 1
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "reportId": "report_123456",
    "downloadUrl": "/api/reports/download/report_123456",
    "generatedAt": "2024-01-15T10:30:00Z"
  }
}
```

### Download Report

**GET** `/reports/download/:reportId`

Download a generated report file.

### Get Report History

**GET** `/reports/history`

Retrieve report generation history.

## Admin API

### Get Admin Users

**GET** `/admin/users`

Retrieve admin users (Super Admin only).

### Create Admin User

**POST** `/admin/users`

Create a new admin user (Super Admin only).

**Request Body:**
```json
{
  "username": "newadmin",
  "password": "securepass123",
  "email": "admin@example.com",
  "fullName": "New Admin",
  "role": "admin"
}
```

### Get Admin Logs

**GET** `/admin/logs`

Retrieve admin activity logs.

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `action` (string): Filter by action type
- `userId` (number): Filter by admin user
- `dateFrom` (string): Filter by date range
- `dateTo` (string): Filter by date range

## System Configuration API

### Get System Config

**GET** `/system-config`

Retrieve system configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "config": {
      "systemName": "My Hotspot System",
      "mikrotikHost": "192.168.1.1",
      "mikrotikPort": "8728",
      "mikrotikUsername": "admin",
      "emailFromAddress": "noreply@example.com",
      "timeZone": "UTC"
    }
  }
}
```

### Update System Config

**PUT** `/system-config`

Update system configuration.

**Request Body:**
```json
{
  "systemName": "Updated Hotspot System",
  "mikrotikHost": "192.168.1.2",
  "emailFromAddress": "system@example.com"
}
```

### Test MikroTik Connection

**POST** `/system-config/test-mikrotik`

Test connection to MikroTik router.

**Response:**
```json
{
  "success": true,
  "data": {
    "connected": true,
    "routerInfo": {
      "identity": "MikroTik",
      "version": "7.1.5",
      "uptime": "2w3d4h5m"
    }
  }
}
```

## Error Responses

All API endpoints return consistent error responses:

```json
{
  "success": false,
  "error": {
    "message": "Validation failed",
    "code": "VALIDATION_ERROR",
    "details": {
      "username": ["Username is required"],
      "email": ["Invalid email format"]
    }
  },
  "timestamp": "2024-01-15T10:30:00Z"
}
```

### Common Error Codes

- `VALIDATION_ERROR` (400): Request validation failed
- `AUTHENTICATION_ERROR` (401): Invalid or missing authentication
- `AUTHORIZATION_ERROR` (403): Insufficient permissions
- `NOT_FOUND_ERROR` (404): Resource not found
- `CONFLICT_ERROR` (409): Resource conflict (duplicate)
- `RATE_LIMIT_ERROR` (429): Too many requests
- `INTERNAL_ERROR` (500): Server error

## Rate Limiting

API endpoints are rate limited to prevent abuse:

- **General endpoints**: 100 requests per minute per IP
- **Authentication endpoints**: 10 requests per minute per IP
- **Report generation**: 5 requests per minute per user

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1642248000
```

## Pagination

List endpoints support pagination with consistent parameters:

- `page`: Page number (starts from 1)
- `limit`: Items per page (default: 50, max: 200)

Pagination information is included in responses:
```json
{
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "totalPages": 3,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## Filtering and Searching

Many endpoints support filtering and searching:

- `search`: Full-text search across relevant fields
- `dateFrom`/`dateTo`: Date range filtering
- Entity-specific filters (e.g., `isActive`, `billingPlanId`)

## WebSocket Events

Real-time updates are available via WebSocket connection:

```javascript
const ws = new WebSocket('ws://localhost:3001/ws');

ws.on('user_connected', (data) => {
  console.log('User connected:', data.username);
});

ws.on('user_disconnected', (data) => {
  console.log('User disconnected:', data.username);
});

ws.on('bandwidth_update', (data) => {
  console.log('Bandwidth update:', data);
});
```

## SDK Examples

### JavaScript/Node.js

```javascript
const axios = require('axios');

class HotspotAPI {
  constructor(baseURL = 'http://localhost:3001/api') {
    this.client = axios.create({ baseURL });
    this.token = null;
  }

  async login(username, password) {
    const response = await this.client.post('/auth/login', {
      username,
      password
    });
    this.token = response.data.data.tokens.accessToken;
    this.client.defaults.headers.common['Authorization'] = `Bearer ${this.token}`;
    return response.data;
  }

  async getUsers(params = {}) {
    const response = await this.client.get('/users', { params });
    return response.data;
  }

  async createUser(userData) {
    const response = await this.client.post('/users', userData);
    return response.data;
  }
}

// Usage
const api = new HotspotAPI();
await api.login('admin', 'admin123');
const users = await api.getUsers({ page: 1, limit: 10 });
```

### Python

```python
import requests

class HotspotAPI:
    def __init__(self, base_url='http://localhost:3001/api'):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None

    def login(self, username, password):
        response = self.session.post(f'{self.base_url}/auth/login', json={
            'username': username,
            'password': password
        })
        data = response.json()
        self.token = data['data']['tokens']['accessToken']
        self.session.headers.update({
            'Authorization': f'Bearer {self.token}'
        })
        return data

    def get_users(self, **params):
        response = self.session.get(f'{self.base_url}/users', params=params)
        return response.json()

# Usage
api = HotspotAPI()
api.login('admin', 'admin123')
users = api.get_users(page=1, limit=10)
```

For more examples and detailed integration guides, see the [Development Documentation](development.md).