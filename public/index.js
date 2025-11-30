// write your JavaScript code here
console.log("JS loaded");

document.addEventListener("DOMContentLoaded", function() {
    const headerHtml = window.templates.header();
    document.querySelector(".header-container").innerHTML = headerHtml;

    const loginButton = document.getElementById("login-button");
    if(loginButton) {
        fetch("/api/loggedIn").then(function(res) {
            return res.json();
        }).then(function(loggedIn) {
            if (!loggedIn) {
                loginButton.style.display = "block";
            }
        }).catch(function(err) {
            console.error("Error checking login status:", err);
        });
    }

    const logo_area = document.querySelector(".logo-area");
    if (logo_area) {
        logo_area.addEventListener("click", function() {
            window.location.href = "index.html";
        });
    }

    const params = new URLSearchParams(window.location.search);
    if(params.get("notLoggedInAlert")) {
        alert("To access certain features you must login!");
    }
})
