
const signupForm = document.getElementById("signupForm");
const message = document.getElementById("message");

signupForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const username = document.getElementById("username").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;

    try {
        const response = await fetch("/auth/register", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                username: username,
                email: email,
                password: password
            })
        });

        const data = await response.json();

        if (!response.ok) {
            message.textContent = data.detail || "Registration failed.";
            return;
        }

        message.textContent = "Account created successfully! Redirecting to login...";

        signupForm.reset();

        setTimeout(() => {
            window.location.href = "/login";
        }, 1500);

    } catch (error) {
        message.textContent = "Could not connect to the server.";
        console.error(error);
    }
});
