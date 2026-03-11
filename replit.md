# Pearl Skin Care

A static HTML/CSS/JS e-commerce website for a skincare supplement shop.

## Project Structure

- `index.html` — Homepage with hero section and featured products
- `products.html` — Product listing page
- `cart.html` / `cart.js` — Shopping cart functionality
- `checkout.html` — Checkout flow
- `login.html` / `register.html` — Customer authentication pages
- `customer-dashboard.html` — Customer account dashboard
- `Order-History.html` — Order history page
- `admin-login.html` / `admin-register.html` — Admin authentication
- `Admins.html` — Admin panel
- `Admin-Analytics-Summary.html` — Admin analytics
- `hero.html` — Hero section component
- `home.css` / `index.css` — Stylesheets
- `home.js` — Homepage JavaScript
- `server.js` — Simple Node.js HTTP static file server

## Tech Stack

- Pure static HTML/CSS/JavaScript (no build system)
- Tailwind CSS via CDN
- Font Awesome icons via CDN
- Google Fonts
- Node.js HTTP server for serving static files in development

## Running the App

The app is served via a Node.js static file server (`server.js`) on port 5000.

**Workflow:** `node server.js` → serves all static files at `http://0.0.0.0:5000`

## Deployment

Configured as a **static** deployment — files are served directly from the project root.
