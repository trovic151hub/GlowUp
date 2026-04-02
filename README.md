# Skinova — Skincare Supplement Shop

A full-featured e-commerce website for **Skinova**, a premium skincare supplement brand. Built with plain HTML, CSS, and JavaScript, powered by Firebase on the backend.

**Live Site:** [GitHub Repo](https://github.com/trovic151hub/GlowUp)

---

## Features

### Customer-Facing
- **Home page** — Hero slideshow (managed from admin), featured products, category highlights
- **Shop page** — Browse all products with category filter, search, price sort, and pagination
- **Product detail modal** — View product image, description, and add to cart
- **Cart** — Add/remove items, quantity control, persistent across sessions (Firebase + localStorage)
- **Checkout** — Shipping form, Paystack card payment, WhatsApp order option
- **Customer dashboard** — View past orders and order status
- **Out-of-stock indicators** — Unavailable products show a badge and disabled cart button

### Admin Panel (`/admin.html`)
- **Dashboard** — Real-time stats: total sales, orders, average order value, unique customers, total products (in stock / out of stock breakdown), daily and monthly revenue charts, recent orders feed
- **Products** — Add, edit, delete products with image upload (Cloudinary), stock toggle, featured toggle, search and pagination
- **Orders** — View and manage all customer orders
- **Hero Slider** — Add and manage homepage banner slides
- **Admin Management** — Create admin accounts, view real-time online/offline presence, "Active now / Last seen X ago" badges
- **Notifications** — Real-time new order alerts

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Styling | Tailwind CSS (CDN), custom CSS |
| Animations | GSAP |
| Database | Firebase Firestore |
| Authentication | Firebase Auth |
| Image Uploads | Cloudinary |
| Payments | Paystack |
| Orders (alt) | WhatsApp API integration |
| Server | Node.js (static file server) |
| Hosting | Vercel |

---

## Project Structure

```
skinova/
├── index.html              # Home page
├── products.html           # Shop / all products page
├── cart.html               # Shopping cart
├── checkout.html           # Checkout & payment
├── customer-dashboard.html # Customer order history
├── login.html              # Admin login
├── register.html           # Admin registration
├── admin.html              # Full admin panel
├── home.js                 # Home page logic (slider, featured products, cart)
├── cart.js                 # Cart logic
├── index.css               # Global styles
├── home.css                # Home page styles
├── server.js               # Node.js static server (port 5000)
└── attached_assets/        # Logo and local assets
```

---

## Firebase Collections

| Collection | Purpose |
|---|---|
| `products` | Product catalog (name, price, category, image, stock status, featured) |
| `orders` | Customer orders (items, shipping, payment, status) |
| `admins` | Admin accounts (role, online status, last seen) |
| `guestCarts` | Persisted cart for guest users |
| `heroSliders` | Homepage banner slides |

---

## Running Locally

1. Clone the repo:
   ```bash
   git clone https://github.com/trovic151hub/GlowUp.git
   cd GlowUp
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   node server.js
   ```

4. Open your browser at `http://localhost:5000`

> The app uses Firebase directly from the browser — no extra backend setup required.

---

## Environment & Keys

- **Firebase config** is embedded in the HTML files (standard for client-side Firebase apps — security is enforced via Firebase Security Rules)
- **Paystack public key** is used on the frontend for payment initiation
- **Cloudinary** upload preset is configured for product image uploads

---

## Deployment

The site is deployed on **Vercel**. Push to the `master` branch of the GitHub repo to trigger a new deployment.

---

## Brand

- **Brand name:** Skinova
- **Tagline:** *Glow Your Skin Naturally*
- **Logo:** `attached_assets/skinova_logo.png`
- **Primary colour:** `#8B4F6B` (rose/mauve)
