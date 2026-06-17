# Smart Visitor Management System API Documentation

## Admin Authentication

### Register Admin

Endpoint:
POST /api/admin/register

Request Body:

{
"email": "[admin@gmail.com](mailto:admin@gmail.com)",
"password": "123456"
}

Success Response:

{
"success": true,
"message": "Admin registered successfully"
}

---

### Login Admin

Endpoint:
POST /api/admin/login

Request Body:

{
"email": "[admin@gmail.com](mailto:admin@gmail.com)",
"password": "123456"
}

Success Response:

{
"success": true,
"token": "JWT_TOKEN"
}

---

## Visitor Management

### Create Visitor

Endpoint:
POST /api/visitor

Requires Authentication: Yes

Request Body:

{
"name": "Rahul Sharma",
"phone": "9876543210",
"email": "[rahul@gmail.com](mailto:rahul@gmail.com)",
"purpose": "Meeting",
"personToMeet": "Manager"
}

---

### Get All Visitors

Endpoint:
GET /api/visitor

Requires Authentication: Yes

---

### Get Visitor By ID

Endpoint:
GET /api/visitor/:id

Requires Authentication: Yes

---

### Update Visitor

Endpoint:
PUT /api/visitor/:id

Requires Authentication: Yes

---

### Delete Visitor

Endpoint:
DELETE /api/visitor/:id

Requires Authentication: Yes
