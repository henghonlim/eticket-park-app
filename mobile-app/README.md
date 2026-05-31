# Sistem e-Tiket Taman Laut Malaysia 🌊🎫

A comprehensive and enterprise-grade React Native (Expo) mobile application designed to digitalize ticketing, visitor management, and emergency broadcasting for Marine Parks in Malaysia. 

This system features a robust **Admin Panel** with real-time analytics and security monitoring, alongside an interactive **User App** that provides a seamless experience for ticket purchasing, weather checking, and park navigation.

---

## ✨ Key Features

### 🛡️ Admin Dashboard (Papan Pemuka Admin)
* **Ticket Verification:** Built-in QR code scanner to validate e-tickets, prevent duplicate entries, and track real-time visitor check-ins.
* **Ticket Management:** Comprehensive module to view, filter, approve (Sah), or reject (Ditolak) pending ticket purchases.
* **Park Management (Pengurusan Taman):** Add, edit, or delete marine parks. Configure ticket pricing, upload DuitNow QR for payments, and pin precise coordinates using an interactive Map.
* **User Management:** Monitor registered users, view purchase history, and enforce security by Suspending (Gantung) or Reactivating accounts.
* **Financial & Demographic Analytics:** Real-time charts for sales, revenue, and visitor demographics (Local vs. Foreign, Age Categories). Features an AI-driven **Heatmap** to detect peak visiting seasons.
* **PDF Report Generation:** Generate and download official Financial & Demographic PDF reports directly to the device.
* **Weather & Emergency Broadcasting:** Integrated with the **Open-Meteo API** to monitor live weather. Instantly broadcast weather alerts or park closure (Penutupan Taman) notices to all affected users.
* **System Settings & Maintenance:** * **Mod Penyelenggaraan (Maintenance Mode):** Temporarily lock the system from public access for upgrades.
  * **Audit Trail (Log Aktiviti):** Enterprise-grade security tracking every admin action (Login, Logout, Suspend User, Export PDF, Delete Park, etc.).
  * **Concurrent Login Control:** Single-device login policy. Automatically kicks out accounts if logged in from another device.

### 📱 User App (Aplikasi Pelawat)
* **E-Ticketing:** Browse available marine parks, select dates, and purchase tickets for different categories (Adult, Child, Senior, OKU).
* **Digital QR Ticket:** Contactless entry using dynamically generated QR codes.
* **E-Receipt (E-Resit):** View and download official PDF receipts for successful transactions.
* **Live Weather Forecast:** Built-in weather checker powered by Open-Meteo API so users can plan their trips accordingly.
* **Interactive Maps:** View park locations and navigate easily using integrated maps.
* **Real-time Alerts:** Receive push notifications and in-app alerts for bad weather or sudden park closures.

---

## 🛠️ Tech Stack
* **Frontend:** React Native, Expo, React Navigation, Expo Router
* **Backend & Database:** Firebase Authentication, Cloud Firestore, Firebase Storage
* **APIs & Integrations:** * `react-native-maps` (Location & Navigation)
  * `Open-Meteo API` (Live Weather Forecast)
  * `expo-print` & `expo-sharing` (PDF Generation & Download)
  * `react-native-gifted-charts` (Data Visualization)
* **Security:** AsyncStorage (Session Management & Concurrent Login Handling)

---

## 🚀 Getting Started

Follow these instructions to set up and run the project on your local machine.

### Prerequisites
1.  [Node.js](https://nodejs.org/) installed on your machine.
2.  [Expo CLI](https://docs.expo.dev/get-started/installation/) installed globally (`npm install -g expo-cli`).
3.  Expo Go app installed on your physical iOS/Android device.

### Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone [https://github.com/henghonlim/eticket-park-app]
   cd mobile-app

2. **Install dependencies:**
   ```bash
   npm install
   # or if you face dependency conflicts:
   npm install --legacy-peer-deps

3. **Firebase Configuration:**
   Ensure you have your Firebase project set up. Create a firebaseConfig.js file in the root directory and add your Firebase credentials.

4. **Start the application:**
  ```bash
  npx expo start