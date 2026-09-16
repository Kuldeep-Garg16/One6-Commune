let menu = [];

let cart =
JSON.parse(
localStorage.getItem("foodieCart")
|| "[]"
);

let active = "All";


const table =
new URLSearchParams(
location.search
).get("table")
||
localStorage.getItem(
"foodieTable"
)
||
"1";


localStorage.setItem(
"foodieTable",
table
);


document.getElementById(
"tableNo"
).textContent = table;


document.getElementById(
"noticeTable"
).textContent = table;


async function init() {

    menu =
    await fetch("/api/menu")
    .then(
        response =>
        response.json()
    );

    renderCategories();

    renderMenu();

    updateCount();

}


function renderCategories() {

    const categories = [
        "All",
        ...new Set(
            menu.map(
                item =>
                item.category
            )
        )
    ];


    document.getElementById(
        "categories"
    ).innerHTML =

    categories.map(
        category => `

        <button
        class="${
            category === active
            ? "active"
            : ""
        }"
        onclick="
        active='${category}';
        renderCategories();
        renderMenu();
        ">

        ${category}

        </button>

        `
    ).join("");

}


function renderMenu() {

    const query =
    document.getElementById(
        "search"
    ).value.toLowerCase();


    const filtered =
    menu.filter(
        item =>

        (
            active === "All"
            ||
            item.category === active
        )

        &&

        item.name
        .toLowerCase()
        .includes(query)

    );


    document.getElementById(
        "menu"
    ).innerHTML =

    filtered.map(
        item => `

        <article class="food">

            <img
            src="${item.image}"
            alt="${item.name}">

            <div class="foodBody">

                <div class="foodTitle">

                    <h3>
                    ${item.name}
                    </h3>

                    <span class="veg">
                    ●
                    </span>

                </div>

                <p>
                ${item.description}
                </p>

                <div>

                    <strong>
                    ₹${item.price}
                    </strong>

                    <button
                    class="add"
                    onclick="add(${item.id})">

                    ADD

                    </button>

                </div>

            </div>

        </article>

        `
    ).join("");

}


function add(id) {

    const product =
    menu.find(
        item =>
        item.id === id
    );


    const existing =
    cart.find(
        item =>
        item.id === id
    );


    if (existing) {

        existing.qty++;

    } else {

        cart.push({
            ...product,
            qty: 1
        });

    }


    save();

    toast("Added to cart");

}


function save() {

    localStorage.setItem(
        "foodieCart",
        JSON.stringify(cart)
    );

    updateCount();

}


function updateCount() {

    document.getElementById(
        "cartCount"
    ).textContent =

    cart.reduce(
        (sum, item) =>
        sum + item.qty,
        0
    );

}


function openCart() {

    renderCart();

    document.getElementById(
        "cartModal"
    ).classList.remove("hide");

}


function closeCart() {

    document.getElementById(
        "cartModal"
    ).classList.add("hide");

}


function hide(id) {

    document.getElementById(
        id
    ).classList.add("hide");

}


function renderCart() {

    const container =
    document.getElementById(
        "cartItems"
    );


    if (!cart.length) {

        container.innerHTML =
        "<p>Your cart is empty.</p>";

    } else {

        container.innerHTML =

        cart.map(
            item => `

            <div class="cartLine">

                <img
                src="${item.image}">

                <div class="grow">

                    <b>
                    ${item.name}
                    </b>

                    <br>

                    ₹${item.price}

                </div>

                <div>

                    <button
                    onclick="
                    changeQty(
                        ${item.id},
                        -1
                    )">

                    −

                    </button>

                    ${item.qty}

                    <button
                    onclick="
                    changeQty(
                        ${item.id},
                        1
                    )">

                    +

                    </button>

                </div>

            </div>

            `
        ).join("");

    }


    const subtotalValue =
    cart.reduce(
        (sum, item) =>
        sum +
        item.price *
        item.qty,
        0
    );


    const gstValue =
    Math.round(
        subtotalValue * 0.05
    );


    document.getElementById(
        "subtotal"
    ).textContent =
    "₹" + subtotalValue;


    document.getElementById(
        "gst"
    ).textContent =
    "₹" + gstValue;


    document.getElementById(
        "total"
    ).textContent =
    "₹" +
    (
        subtotalValue +
        gstValue
    );

}


function changeQty(id, amount) {

    const item =
    cart.find(
        product =>
        product.id === id
    );


    item.qty += amount;


    if (item.qty <= 0) {

        cart =
        cart.filter(
            product =>
            product.id !== id
        );

    }


    save();

    renderCart();

}


function goCheckout() {

    if (!cart.length) {

        alert("Your cart is empty.");

        return;

    }


    closeCart();


    document.getElementById(
        "checkoutModal"
    ).classList.remove("hide");

}


async function placeOrder() {

    if (!cart.length) {

        return;

    }


    const order =
    await fetch(
        "/api/orders",
        {

            method: "POST",

            headers: {
                "Content-Type":
                "application/json"
            },

            body:
            JSON.stringify({

                table,

                customer:
                document.getElementById(
                    "customer"
                ).value,

                note:
                document.getElementById(
                    "note"
                ).value,

                paymentMethod:
                document.getElementById(
                    "payment"
                ).value,

                items:
                cart.map(
                    item => ({

                        id: item.id,

                        qty: item.qty

                    })
                )

            })

        }
    ).then(
        response =>
        response.json()
    );


    if (order.error) {

        alert(order.error);

        return;

    }


    cart = [];

    save();


    hide(
        "checkoutModal"
    );


    document.getElementById(
        "successMsg"
    ).textContent =

    `Order ${order.orderNo}
    placed for Table ${order.table}.
    Total: ₹${order.total}`;


    document.getElementById(
        "trackLink"
    ).href =
    "/track.html?id=" +
    order.id;


    document.getElementById(
        "successModal"
    ).classList.remove(
        "hide"
    );

}


function toast(message) {

    const element =
    document.createElement(
        "div"
    );

    element.className =
    "toast";

    element.textContent =
    message;

    document.body.appendChild(
        element
    );


    setTimeout(
        () => element.remove(),
        1200
    );

}


init();