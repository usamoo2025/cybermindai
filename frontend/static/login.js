
const loginForm = document.getElementById("loginForm");
const message = document.getElementById("message");

loginForm.addEventListener("submit", async function(event) {

    event.preventDefault();

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {

        const response = await fetch("/auth/login", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            credentials: "include",

            body: JSON.stringify({
                email: email,
                password: password
            })

        });

        const data = await response.json();

        if (!response.ok) {

            message.textContent =
                data.detail || "Login failed.";

            return;
        }

        message.textContent = "Login successful!";

        loginForm.reset();

        window.location.href = "/dashboard";

    } catch (error) {

        message.textContent =
            "Could not connect to the server.";

        console.error(error);

    }

});
