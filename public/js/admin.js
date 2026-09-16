const token =
localStorage.getItem(
    "foodieToken"
);


if (!token) {

    location.href =
    "/login.html";

}


async function api(
    url,
    options = {}
) {

    options.headers = {

        ...(options.headers || {}),

        Authorization:
        "Bearer " + token

    };


    const response =
    await fetch(
        url,
        options
    );


    if (
        response.status === 401
    ) {

        localStorage.removeItem(
            "foodieToken"
        );

        location.href =
        "/login.html";

    }


    return response.json();

}


async function loadDashboard() {

    const [
        statsData,
        ordersData,
        menuData,
        tablesData
    ] =

    await Promise.all([

        api(
            "/api/admin/stats"
        ),

        api(
            "/api/admin/orders"
        ),

        api(
            "/api/admin/menu"
        ),

        api(
            "/api/tables"
        )

    ]);


    document.getElementById(
        "stats"
    ).innerHTML = `

        <div>
            Today's Orders
            <b>
            ${statsData.orders}
            </b>
        </div>

        <div>
            Today's Revenue
            <b>
            ₹${statsData.revenue}
            </b>
        </div>

        <div>
            Pending
            <b>
            ${statsData.pending}
            </b>
        </div>

        <div>
            Menu Items
            <b>
            ${statsData.menu}
            </b>
        </div>

    `;


    document.getElementById(
        "orders"
    ).innerHTML =

    ordersData.length

    ?

    ordersData.map(
        order => `

        <div class="order">

            <div>

                <b>
                ${order.orderNo}
                </b>

                · Table
                ${order.table}

                <span
                class="tag">

                ${order.status}

                </span>

            </div>


            <p>

            ${
                order.items
                .map(
                    item =>
                    `${item.name}
                    × ${item.qty}`
                )
                .join("<br>")
            }

            </p>


            <b>
            ₹${order.total}
            </b>

            ·
            ${order.paymentStatus}


            <div
            class="actions">

                <button
                onclick="
                setStatus(
                    ${order.id},
                    'ACCEPTED'
                )">

                Accept

                </button>


                <button
                onclick="
                setStatus(
                    ${order.id},
                    'PREPARING'
                )">

                Preparing

                </button>


                <button
                onclick="
                setStatus(
                    ${order.id},
                    'READY'
                )">

                Ready

                </button>


                <button
                onclick="
                setStatus(
                    ${order.id},
                    'COMPLETED'
                )">

                Complete

                </button>


                <button
                onclick="
                setStatus(
                    ${order.id},
                    'CANCELLED'
                )">

                Cancel

                </button>

            </div>

        </div>

        `
    ).join("")

    :

    "No orders yet.";


    document.getElementById(
        "menuAdmin"
    ).innerHTML =

    menuData.map(
        item => `

        <div
        class="menuItem">

            <img
            src="${item.image}">

            <span>

                <b>
                ${item.name}
                </b>

                <br>

                ₹${item.price}

            </span>


            <button
            onclick="
            deleteFood(
                ${item.id}
            )">

            Delete

            </button>

        </div>

        `
    ).join("");


    document.getElementById(
        "tables"
    ).innerHTML =

    tablesData.map(
        table => `

        <div
        class="qrCard">

            <b>
            Table ${table.id}
            </b>

            <img
            src="/api/qr/${table.id}">

            <a
            href="/api/qr/${table.id}"
            download>

            Save QR

            </a>

            <br>

            <small>

            ${
                table.occupied
                ? "Occupied"
                : "Available"
            }

            </small>

        </div>

        `
    ).join("");

}


async function setStatus(
    id,
    status
) {

    await api(
        "/api/admin/orders/" +
        id,
        {

            method: "PATCH",

            headers: {
                "Content-Type":
                "application/json"
            },

            body:
            JSON.stringify({
                status
            })

        }
    );


    loadDashboard();

}


async function addFood() {

    const data = {

        name:
        document.getElementById(
            "fname"
        ).value,

        category:
        document.getElementById(
            "fcat"
        ).value,

        price:
        document.getElementById(
            "fprice"
        ).value,

        image:
        document.getElementById(
            "fimg"
        ).value,

        description:
        document.getElementById(
            "fdesc"
        ).value,

        veg: true

    };


    await api(
        "/api/admin/menu",
        {

            method: "POST",

            headers: {
                "Content-Type":
                "application/json"
            },

            body:
            JSON.stringify(data)

        }
    );


    document.querySelectorAll(
        ".panel input, .panel textarea"
    ).forEach(
        element =>
        element.value = ""
    );


    loadDashboard();

}


async function deleteFood(id) {

    if (
        !confirm(
            "Delete this food?"
        )
    ) {

        return;

    }


    await api(
        "/api/admin/menu/" +
        id,
        {
            method: "DELETE"
        }
    );


    loadDashboard();

}


function logout() {

    localStorage.removeItem(
        "foodieToken"
    );

    location.href =
    "/login.html";

}


loadDashboard();


setInterval(
    loadDashboard,
    5000
);