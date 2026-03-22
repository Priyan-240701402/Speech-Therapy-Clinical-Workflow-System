# Speech Therapy Management System

A full-stack web application designed to streamline the management of speech therapy patients, therapists, sessions, and reports. The system enables efficient coordination between **Admins, Supervisors, and Therapists** with role-based access control.

---

##  Features

###  Authentication & Authorization

* Secure login system using JWT
* Role-based access:

  * **Admin** – Full access
  * **Supervisor** – Monitor therapists and sessions
  * **Therapist** – Manage assigned patients and sessions

---

###  Patient Management

* Add, update, and delete patient records
* Assign therapists to patients
* Track diagnosis and progress

---

###  Therapy Session Management

* Schedule therapy sessions
* Record session details (activities, notes, progress)
* Maintain session history

---

###  Therapy Plans

* Create customized therapy plans for patients
* Define goals and activities
* Track improvements over time

---

###  Reports & Feedback

* Generate patient progress reports
* Supervisor feedback on therapist performance
* Session-based evaluation

---

##  Tech Stack

### Frontend

* React.js
* HTML, CSS, JavaScript
* Tailwind CSS / UI Components

### Backend

* Node.js
* Express.js

### Database

* MongoDB / MySQL (based on your setup)

### Other Tools

* JWT Authentication
* REST APIs
* Git & GitHub

---

## 📂 Project Structure

```
speech-therapy-system/
│
├── frontend/
│   ├── src/
│   ├── components/
│   └── pages/
│
├── backend/
│   ├── controllers/
│   ├── routes/
│   ├── models/
│   └── config/
│
├── .gitignore
├── README.md
└── package.json
```

---

##  Installation & Setup

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/speech-therapy-system.git
cd speech-therapy-system
```

---

### 2️⃣ Setup Backend

```bash
cd backend
npm install
npm run dev
```

---

### 3️⃣ Setup Frontend

```bash
cd frontend
npm install
npm run dev
```

---

### 4️⃣ Environment Variables

Create a `.env` file in backend:

```
PORT=4000
DB_URI=your_database_url
JWT_SECRET=your_secret_key
```

---

## 🔐 API Endpoints (Sample)

| Method | Endpoint    | Description      |
| ------ | ----------- | ---------------- |
| POST   | /auth/login | User login       |
| GET    | /patients   | Get all patients |
| POST   | /patients   | Add patient      |
| POST   | /sessions   | Create session   |
| GET    | /reports    | Generate reports |

---

## 🧪 Testing

* Manual testing of APIs using Postman
* Unit and integration testing for backend
* UI testing for frontend components

---

## ⚠️ Challenges Faced

* Handling CORS issues between frontend and backend
* Managing JWT authentication securely
* Debugging API errors and database connections
* Designing role-based access control

---

## 📌 Future Enhancements

* Real-time session tracking
* AI-based speech analysis
* Mobile application support
* Advanced analytics dashboard

---

## 👨‍💻 Author

**Priyan Sakthivel**
Full Stack Developer

---

## 📜 License

This project is for educational purposes.

---

## ⭐ Acknowledgements

* Open-source community
* Online tutorials and documentation
* Internship guidance and mentorship

---

