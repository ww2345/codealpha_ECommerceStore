const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/product");
const router = express.Router();


function isLoggedIn(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  req.flash("error", "You must be logged in");
  res.redirect("/Ecommerce/login");
}

function getSessionCart(req) {
  if (!Array.isArray(req.session.cart)) {
    req.session.cart = [];
  }
  return req.session.cart;
}

function clampQuantity(value, fallback = 1) {
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return fallback;
  }
  return Math.min(parsed, 99);
}

function snapshotProduct(product) {
  const item = product && typeof product === "object" ? product : {};
  return {
    title: typeof item.title === "string" ? item.title.trim() : "",
    description: typeof item.description === "string" ? item.description.trim() : "",
    category: typeof item.category === "string" ? item.category.trim() : "",
    price: Math.max(Number(item.price) || 0, 0),
    imageUrls: Array.isArray(item.imageUrls) ? item.imageUrls.filter(Boolean).slice(0, 4) : [],
  };
}

function sanitizeReturnTo(value, fallback) {
  const normalizedFallback = typeof fallback === "string" && fallback.startsWith("/Ecommerce/")
    ? fallback
    : "/Ecommerce/home";
  const candidate = typeof value === "string" ? value.trim() : "";

  if (!candidate.startsWith("/Ecommerce/")) {
    return normalizedFallback;
  }

  return candidate;
}

function getReturnTo(req, fallback = "/Ecommerce/home") {
  return sanitizeReturnTo(req.body.returnTo, fallback);
}

async function buildCartState(req) {
  const rawCart = getSessionCart(req).filter((item) => item && typeof item === "object" && item.productId);
  const productIds = [
    ...new Set(
      rawCart
        .map((item) => String(item.productId))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
    ),
  ];

  const products = productIds.length
    ? await Product.find({ _id: { $in: productIds } })
        .select("title description price category imageUrls")
        .lean()
    : [];

  const productMap = new Map(products.map((product) => [String(product._id), product]));

  const cartItems = rawCart
    .map((item) => {
      const productId = String(item.productId);
      const currentProduct = productMap.get(productId);
      const snapshot = currentProduct ? snapshotProduct(currentProduct) : snapshotProduct(item);
      const quantity = clampQuantity(item.quantity, 1);
      const hasContent = Boolean(
        snapshot.title || snapshot.description || snapshot.category || snapshot.imageUrls[0] || snapshot.price
      );

      return {
        id: productId,
        productId,
        title: snapshot.title || "Product",
        description: snapshot.description,
        category: snapshot.category,
        price: snapshot.price,
        quantity,
        imageUrl: snapshot.imageUrls[0] || "",
        imageUrls: snapshot.imageUrls,
        lineTotal: snapshot.price * quantity,
        hasContent,
      };
    })
    .filter((item) => item.hasContent);

  req.session.cart = cartItems.map((item) => ({
    productId: item.productId,
    quantity: item.quantity,
    title: item.title,
    description: item.description,
    category: item.category,
    price: item.price,
    imageUrls: item.imageUrls,
  }));

  const subtotal = cartItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const shipping = cartItems.length ? (subtotal >= 3000 ? 0 : 99) : 0;
  const tax = Math.round(subtotal * 0.08);
  const total = subtotal + shipping + tax;
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return {
    cartItems,
    cartCount,
    productIds,
    summary: { subtotal, shipping, tax, total },
  };
}


router.get("/", async (req, res, next) => {
  try {
    const productData = await Product.find({})
      .sort({ createdAt: -1 })
      .limit(6)
      .lean();

    const heroArrivals = await Product.find({
      imageUrls: { $exists: true, $ne: [] },
    })
      .sort({ createdAt: -1 })
      .limit(3)
      .select("title category imageUrls")
      .lean();

    const featuredIds = productData.map((p) => p._id);
    let quickPicks = await Product.aggregate([
      {
        $match: featuredIds.length ? { _id: { $nin: featuredIds } } : {},
      },
      { $sample: { size: 4 } },
      { $project: { title: 1, description: 1, price: 1, category: 1, imageUrls: 1 } },
    ]);

    if (!Array.isArray(quickPicks) || quickPicks.length === 0) {
      quickPicks = productData.slice(0, 4);
    }

    res.render("pages/home.ejs", {
      productData,
      quickPicks,
      heroArrivals,
      currentPath: "/Ecommerce/home",
    });
  } catch (err) {
    next(err);
  }
});

router.get("/products", async (req, res, next) => {
  try {
    const q = (req.query.q || "").toString().trim();
    const category = (req.query.category || "").toString().trim();
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = 12;
    const skip = (page - 1) * limit;

    const filter = {};
    if (category) filter.category = category;
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: regex }, { description: regex }];
    }

    const [products, total, categories] = await Promise.all([
      Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Product.countDocuments(filter),
      Product.distinct("category", { category: { $ne: "" } }),
    ]);

    res.render("pages/product.ejs", {
      products,
      q,
      category,
      categories: categories.filter(Boolean).sort(),
      page,
      totalPages: Math.max(Math.ceil(total / limit), 1),
      total,
      currentPath: req.originalUrl,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/cart/add/:productId", isLoggedIn, async (req, res, next) => {
  try {
    const { productId } = req.params;
    const returnTo = getReturnTo(req, "/Ecommerce/home");

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      req.flash("error", "That product could not be added to cart.");
      return res.redirect(returnTo);
    }

    const product = await Product.findById(productId)
      .select("title description price category imageUrls")
      .lean();

    if (!product) {
      req.flash("error", "Product not found.");
      return res.redirect(returnTo);
    }

    const cart = getSessionCart(req);
    const quantityToAdd = clampQuantity(req.body.quantity, 1);
    const existingItem = cart.find((item) => String(item.productId) === String(product._id));
    const productSnapshot = snapshotProduct(product);

    if (existingItem) {
      existingItem.quantity = Math.min(clampQuantity(existingItem.quantity, 1) + quantityToAdd, 99);
      existingItem.title = productSnapshot.title;
      existingItem.description = productSnapshot.description;
      existingItem.category = productSnapshot.category;
      existingItem.price = productSnapshot.price;
      existingItem.imageUrls = productSnapshot.imageUrls;
    } else {
      cart.push({
        productId: String(product._id),
        quantity: quantityToAdd,
        title: productSnapshot.title,
        description: productSnapshot.description,
        category: productSnapshot.category,
        price: productSnapshot.price,
        imageUrls: productSnapshot.imageUrls,
      });
    }

    req.flash("success", `${productSnapshot.title || "Item"} added to cart.`);
    return res.redirect(returnTo);
  } catch (err) {
    next(err);
  }
});

router.post("/cart/item/:productId/increase", isLoggedIn, (req, res) => {
  const { productId } = req.params;
  const returnTo = getReturnTo(req, "/Ecommerce/home/cart");
  const cart = getSessionCart(req);
  const item = cart.find((entry) => String(entry.productId) === String(productId));

  if (!item) {
    req.flash("error", "Cart item not found.");
    return res.redirect(returnTo);
  }

  item.quantity = Math.min(clampQuantity(item.quantity, 1) + 1, 99);
  return res.redirect(returnTo);
});

router.post("/cart/item/:productId/decrease", isLoggedIn, (req, res) => {
  const { productId } = req.params;
  const returnTo = getReturnTo(req, "/Ecommerce/home/cart");
  const cart = getSessionCart(req);
  const itemIndex = cart.findIndex((entry) => String(entry.productId) === String(productId));

  if (itemIndex === -1) {
    req.flash("error", "Cart item not found.");
    return res.redirect(returnTo);
  }

  const currentQuantity = clampQuantity(cart[itemIndex].quantity, 1);
  if (currentQuantity <= 1) {
    cart.splice(itemIndex, 1);
  } else {
    cart[itemIndex].quantity = currentQuantity - 1;
  }

  return res.redirect(returnTo);
});

router.post("/cart/item/:productId/remove", isLoggedIn, (req, res) => {
  const { productId } = req.params;
  const returnTo = getReturnTo(req, "/Ecommerce/home/cart");
  const cart = getSessionCart(req);
  const itemIndex = cart.findIndex((entry) => String(entry.productId) === String(productId));

  if (itemIndex === -1) {
    req.flash("error", "Cart item not found.");
    return res.redirect(returnTo);
  }

  const [removedItem] = cart.splice(itemIndex, 1);
  req.flash("success", `${removedItem.title || "Item"} removed from cart.`);
  return res.redirect(returnTo);
});


router.get("/cart", isLoggedIn, async (req, res, next) => {
  try {
    const cartState = await buildCartState(req);
    const recommendedProducts = await Product.find(
      cartState.productIds.length ? { _id: { $nin: cartState.productIds } } : {}
    )
      .sort({ createdAt: -1 })
      .limit(4)
      .select("title description price category imageUrls")
      .lean();

    res.render("pages/cart.ejs", {
      cartItems: cartState.cartItems,
      recommendedProducts,
      cartCount: cartState.cartCount,
      summary: cartState.summary,
      currentPath: "/Ecommerce/home/cart",
      upiId: "8930351966@fam",
    });
  } catch (err) {
    next(err);
  }
});



module.exports = router; 
