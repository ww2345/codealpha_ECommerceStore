# E-Commerce Store

This project is a server-rendered e-commerce application built with Node.js, Express, MongoDB, EJS, and Passport.js. It includes user registration/login, a product catalog, search and category filtering, a session-based cart, and a seed script for loading sample products.

## Project Overview

The app uses:

- `Express` for routing and server logic
- `EJS` + `ejs-mate` for rendered views and layout support
- `MongoDB` + `Mongoose` for users and products
- `Passport Local` for username/password authentication
- `express-session` and `connect-flash` for sessions and flash messages
- Bootstrap and Font Awesome from CDN for UI styling

## Main Features

- User registration and login
- Protected cart actions for authenticated users
- Homepage with featured and latest products
- Product listing page with:
  - category filters
  - keyword search
  - pagination
- Session-based shopping cart with:
  - add to cart
  - increase quantity
  - decrease quantity
  - remove item
  - order summary totals
- Sample product seeding script

## Folder Structure

```text
.
|- app.js
|- init/
|  |- data.js
|  |- init.js
|- models/
|  |- product.js
|  |- users.js
|- public/
|  |- css/
|- routes/
|  |- home.js
|  |- login.js
|  |- logout.js
|  |- register.js
|- views/
|  |- includes/
|  |- layout/
|  |- pages/
|- package.json
```

## Prerequisites

Make sure these are installed locally:

- Node.js
- npm
- MongoDB

This project currently connects to:

```text
mongodb://127.0.0.1:27017/ECommerceStore
```

So MongoDB must be running on your machine before starting the app or running the seed script.

## Installation

Install dependencies:

```bash
npm install
```

## Seed the Database

To load the sample product catalog:

```bash
node init/init.js
```

This will:

- connect to the local `ECommerceStore` database
- remove existing products
- insert the sample products from `init/data.js`

## Run the App

Start the server with:

```bash
node app.js
```

The app runs on:

```text
http://localhost:3000/Ecommerce/home
```

## Available Routes

### Auth Routes

- `GET /Ecommerce/register` - render register page
- `POST /Ecommerce/register` - create a new user
- `GET /Ecommerce/login` - render login page
- `POST /Ecommerce/login` - authenticate user
- `GET /Ecommerce/logout` - log out user
- `POST /Ecommerce/logout` - log out user

### Store Routes

- `GET /Ecommerce/home` - homepage
- `GET /Ecommerce/home/products` - browse/search/filter products
- `GET /Ecommerce/home/cart` - view cart (login required)
- `POST /Ecommerce/home/cart/add/:productId` - add product to cart
- `POST /Ecommerce/home/cart/item/:productId/increase` - increase quantity
- `POST /Ecommerce/home/cart/item/:productId/decrease` - decrease quantity
- `POST /Ecommerce/home/cart/item/:productId/remove` - remove item from cart

## Data Models

### Product

Defined in `models/product.js`:

- `title`
- `description`
- `price`
- `category`
- `imageUrls`

### User

Defined in `models/users.js`:

- `email`
- username/password handled by `passport-local-mongoose`

## Important Notes

The current codebase works, but there are a few setup details worth knowing:

- `package.json` only defines dependencies right now and does not include npm scripts.
- The MongoDB URI is hardcoded in `app.js` and `init/init.js`.
- The session secret is hardcoded in `app.js`.
- The server port is hardcoded to `3000`.
- The cart is stored in the session, not in MongoDB, so it is tied to the current session.
- A UPI payment ID is hardcoded in the cart route for checkout UI.

## Suggested Next Improvements

- Move secrets and database configuration to environment variables
- Add npm scripts such as `start`, `dev`, and `seed`
- Add validation for auth and product flows
- Add error-handling middleware
- Add automated tests
- Persist carts/orders in the database

## Authoring Notes

This README was written to match the project as it exists in the repository today. If you later add environment variables, scripts, or new routes, update this file so setup stays accurate.
