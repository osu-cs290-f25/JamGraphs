// write your JavaScript code here
console.log("JS loaded");

document.addEventListener("DOMContentLoaded", function() {
    const headerHtml = window.templates.header();
    document.querySelector(".header-container").innerHTML = headerHtml;

    const loginButton = document.getElementById("login-button");
    if(loginButton && (!req.session || !req.session.access_token)) {
        loginButton.style.display = "block";
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
