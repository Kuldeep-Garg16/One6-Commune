require("dotenv").config();

const express = require("express");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");

const app = express();

const PORT = process.env.PORT || 3000;
const SECRET = process.env.JWT_SECRET || "change-this-secret";

const DB = path.join(__dirname, "data", "db.json");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

const initialDatabase = {
    admin: {
        username: "admin",
        passwordHash: bcrypt.hashSync("admin123", 10)
    },

    menu: [
        {
            id: 1,
            name: "Margherita Pizza",
            category: "Pizza",
            price: 249,
            veg: true,
            image: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?auto=format&fit=crop&w=900&q=80",
            description: "Classic cheese pizza with tomato and basil.",
            available: true
        },
        {
            id: 2,
            name: "Veg Burger",
            category: "Burger",
            price: 149,
            veg: true,
            image: "https://images.unsplash.com/photo-1520072959219-c595dc870360?auto=format&fit=crop&w=900&q=80",
            description: "Crispy veg patty with fresh vegetables.",
            available: true
        },
        {
            id: 3,
            name: "White Sauce Pasta",
            category: "Pasta",
            price: 219,
            veg: true,
            image: "https://images.unsplash.com/photo-1473093295043-cdd812d0e601?auto=format&fit=crop&w=900&q=80",
            description: "Creamy pasta with herbs and vegetables.",
            available: true
        },
        {
            id: 4,
            name: "Paneer Tikka",
            category: "Starters",
            price: 229,
            veg: true,
            image: "https://images.unsplash.com/photo-1567188040759-fb8a883dc6d8?auto=format&fit=crop&w=900&q=80",
            description: "Grilled paneer with Indian spices.",
            available: true
        },
        {
            id: 5,
            name: "French Fries",
            category: "Starters",
            price: 99,
            veg: true,
            image: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=900&q=80",
            description: "Golden crispy fries.",
            available: true
        },
        {
            id: 6,
            name: "Cold Coffee",
            category: "Drinks",
            price: 129,
            veg: true,
            image: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80",
            description: "Chilled creamy cold coffee.",
            available: true
        },
        {
            id: 7,
            name: "Fresh Lime Soda",
            category: "Drinks",
            price: 89,
            veg: true,
            image: "https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=900&q=80",
            description: "Refreshing lime soda.",
            available: true
        },
        {
            id: 8,
            name: "Chocolate Brownie",
            category: "Dessert",
            price: 139,
            veg: true,
            image: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80",
            description: "Warm chocolate brownie.",
            available: true
        }
    ],

    orders: [],

    tables: Array.from(
        { length: 12 },
        (_, i) => ({
            id: i + 1,
            name: `Table ${i + 1}`,
            active: true,
            occupied: false
        })
    )
};

if (!fs.existsSync(path.dirname(DB))) {
    fs.mkdirSync(path.dirname(DB), { recursive: true });
}

if (!fs.existsSync(DB)) {
    fs.writeFileSync(
        DB,
        JSON.stringify(initialDatabase, null, 2)
    );
}

function loadDatabase() {
    return JSON.parse(
        fs.readFileSync(DB, "utf8")
    );
}

function saveDatabase(data) {
    fs.writeFileSync(
        DB,
        JSON.stringify(data, null, 2)
    );
}

function auth(req, res, next) {

    try {

        const header =
            req.headers.authorization || "";

        const token =
            header.replace("Bearer ", "");

        req.user =
            jwt.verify(token, SECRET);

        next();

    } catch (error) {

        res.status(401).json({
            error: "Unauthorized"
        });

    }
}

/* ---------------- LOGIN ---------------- */

app.post("/api/auth/login", (req, res) => {

    const db = loadDatabase();

    const {
        username,
        password
    } = req.body;

    if (
        username !== db.admin.username ||
        !bcrypt.compareSync(
            password,
            db.admin.passwordHash
        )
    ) {

        return res.status(401).json({
            error: "Invalid username or password"
        });

    }

    const token = jwt.sign(
        {
            username,
            role: "admin"
        },
        SECRET,
        {
            expiresIn: "8h"
        }
    );

    res.json({
        token
    });

});

/* ---------------- MENU ---------------- */

app.get("/api/menu", (req, res) => {

    const db = loadDatabase();

    res.json(
        db.menu.filter(
            item => item.available !== false
        )
    );

});

/* ---------------- TABLES ---------------- */

app.get("/api/tables", (req, res) => {

    const db = loadDatabase();

    res.json(db.tables);

});

/* ---------------- QR CODE ---------------- */

app.get("/api/qr/:table", async (req, res) => {

    const table = Number(req.params.table);

    if (!table) {
        return res.status(400).end();
    }

    const url =
        `${req.protocol}://${req.get("host")}/?table=${table}`;

    const qr =
        await QRCode.toBuffer(url, {
            width: 600,
            margin: 2
        });

    res.type("png").send(qr);

});

/* ---------------- CREATE ORDER ---------------- */

app.post("/api/orders", (req, res) => {

    const db = loadDatabase();

    const {
        table,
        items,
        customer,
        paymentMethod = "Demo Payment",
        note = ""
    } = req.body;

    if (
        !Number(table) ||
        !Array.isArray(items) ||
        items.length === 0
    ) {

        return res.status(400).json({
            error: "Invalid order"
        });

    }

    const catalog =
        new Map(
            db.menu.map(item => [
                item.id,
                item
            ])
        );

    const cleanItems = [];

    for (const item of items) {

        const product =
            catalog.get(Number(item.id));

        if (
            !product ||
            product.available === false
        ) {
            continue;
        }

        const quantity =
            Math.max(
                1,
                Math.min(
                    20,
                    Number(item.qty) || 1
                )
            );

        cleanItems.push({
            id: product.id,
            name: product.name,
            price: product.price,
            qty: quantity
        });

    }

    if (!cleanItems.length) {

        return res.status(400).json({
            error: "No valid items"
        });

    }

    const subtotal =
        cleanItems.reduce(
            (sum, item) =>
                sum + item.price * item.qty,
            0
        );

    const gst =
        Math.round(subtotal * 0.05);

    const total =
        subtotal + gst;

    const order = {

        id: Date.now(),

        orderNo:
            "FD" +
            String(Date.now()).slice(-6),

        table: Number(table),

        items: cleanItems,

        customer:
            String(customer || "Guest")
                .slice(0, 60),

        note:
            String(note || "")
                .slice(0, 200),

        subtotal,

        gst,

        total,

        paymentMethod,

        paymentStatus:
            paymentMethod === "Demo Payment"
                ? "PAID"
                : "PENDING",

        status: "NEW",

        createdAt:
            new Date().toISOString()

    };

    db.orders.unshift(order);

    const tableObject =
        db.tables.find(
            t => t.id === order.table
        );

    if (tableObject) {
        tableObject.occupied = true;
    }

    saveDatabase(db);

    res.json(order);

});

/* ---------------- TRACK ORDER ---------------- */

app.get("/api/orders/:id", (req, res) => {

    const db = loadDatabase();

    const order =
        db.orders.find(
            item =>
                String(item.id) ===
                String(req.params.id)
                ||
                item.orderNo ===
                req.params.id
        );

    if (!order) {

        return res.status(404).json({
            error: "Order not found"
        });

    }

    res.json(order);

});

/* ---------------- ADMIN ORDERS ---------------- */

app.get(
    "/api/admin/orders",
    auth,
    (req, res) => {

        const db = loadDatabase();

        res.json(db.orders);

    }
);

/* ---------------- UPDATE ORDER ---------------- */

app.patch(
    "/api/admin/orders/:id",
    auth,
    (req, res) => {

        const db = loadDatabase();

        const order =
            db.orders.find(
                x =>
                    x.id == req.params.id
            );

        if (!order) {

            return res.status(404).json({
                error: "Order not found"
            });

        }

        const allowedStatuses = [
            "NEW",
            "ACCEPTED",
            "PREPARING",
            "READY",
            "COMPLETED",
            "CANCELLED"
        ];

        if (
            req.body.status &&
            !allowedStatuses.includes(
                req.body.status
            )
        ) {

            return res.status(400).json({
                error: "Invalid status"
            });

        }

        if (req.body.status) {
            order.status =
                req.body.status;
        }

        if (req.body.paymentStatus) {
            order.paymentStatus =
                req.body.paymentStatus;
        }

        if (
            order.status === "COMPLETED" ||
            order.status === "CANCELLED"
        ) {

            const table =
                db.tables.find(
                    t =>
                        t.id ===
                        order.table
                );

            if (table) {
                table.occupied = false;
            }

        }

        saveDatabase(db);

        res.json(order);

    }
);

/* ---------------- ADMIN MENU ---------------- */

app.get(
    "/api/admin/menu",
    auth,
    (req, res) => {

        const db = loadDatabase();

        res.json(db.menu);

    }
);

/* ---------------- ADD MENU ITEM ---------------- */

app.post(
    "/api/admin/menu",
    auth,
    (req, res) => {

        const db = loadDatabase();

        const item = {

            id: Date.now(),

            name:
                String(
                    req.body.name ||
                    "New Food"
                ),

            category:
                String(
                    req.body.category ||
                    "Other"
                ),

            price:
                Number(
                    req.body.price || 0
                ),

            veg:
                req.body.veg !== false,

            image:
                req.body.image ||
                "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80",

            description:
                String(
                    req.body.description ||
                    ""
                ),

            available: true

        };

        if (
            !item.name ||
            item.price <= 0
        ) {

            return res.status(400).json({
                error: "Invalid food"
            });

        }

        db.menu.push(item);

        saveDatabase(db);

        res.json(item);

    }
);

/* ---------------- UPDATE MENU ---------------- */

app.patch(
    "/api/admin/menu/:id",
    auth,
    (req, res) => {

        const db = loadDatabase();

        const item =
            db.menu.find(
                x =>
                    x.id ==
                    req.params.id
            );

        if (!item) {

            return res.status(404).json({
                error: "Food not found"
            });

        }

        Object.assign(
            item,
            req.body
        );

        if (req.body.price) {
            item.price =
                Number(req.body.price);
        }

        saveDatabase(db);

        res.json(item);

    }
);

/* ---------------- DELETE MENU ---------------- */

app.delete(
    "/api/admin/menu/:id",
    auth,
    (req, res) => {

        const db = loadDatabase();

        db.menu =
            db.menu.filter(
                item =>
                    item.id !=
                    req.params.id
            );

        saveDatabase(db);

        res.json({
            success: true
        });

    }
);

/* ---------------- TABLE UPDATE ---------------- */

app.patch(
    "/api/admin/tables/:id",
    auth,
    (req, res) => {

        const db = loadDatabase();

        const table =
            db.tables.find(
                x =>
                    x.id ==
                    req.params.id
            );

        if (!table) {

            return res.status(404).json({
                error: "Table not found"
            });

        }

        Object.assign(
            table,
            req.body
        );

        saveDatabase(db);

        res.json(table);

    }
);

/* ---------------- ADMIN STATS ---------------- */

app.get(
    "/api/admin/stats",
    auth,
    (req, res) => {

        const db = loadDatabase();

        const today =
            new Date()
                .toISOString()
                .slice(0, 10);

        const todayOrders =
            db.orders.filter(
                order =>
                    order.createdAt
                        .slice(0, 10) ===
                    today
            );

        const revenue =
            todayOrders
                .filter(
                    order =>
                        order.status !==
                        "CANCELLED"
                )
                .reduce(
                    (sum, order) =>
                        sum + order.total,
                    0
                );

        const pending =
            db.orders.filter(
                order =>
                    [
                        "NEW",
                        "ACCEPTED",
                        "PREPARING"
                    ].includes(
                        order.status
                    )
            ).length;

        res.json({

            orders:
                todayOrders.length,

            revenue,

            pending,

            menu:
                db.menu.length,

            completed:
                db.orders.filter(
                    x =>
                        x.status ===
                        "COMPLETED"
                ).length

        });

    }
);

/* ---------------- PAGES ---------------- */

app.get(
    "/admin",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "admin.html"
            )
        );

    }
);

app.get(
    "*",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Foodie running on port ${PORT}`);
});