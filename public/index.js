// write your JavaScript code here
console.log("JS loaded");

document.addEventListener("DOMContentLoaded", function() {
    const loginButton = document.getElementById("login-button");
    if(loginButton) {
        fetch("/api/loggedIn", {
            credentials: "include"
        }).then(function(res) {
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

const accountPostsContainer = document.querySelector(".account-posts-container");
accountPostsContainer.addEventListener("click", function(event) {
    if (event.target.classList.contains('delete_post-button')) {
        const postContainer = event.target.closest(".post-container");
        const postId = Number(postContainer.dataset.id);

        fetch(`/api/posts/${postId}`, {
            method: 'DELETE',
            credentials: "include",
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(function(res) { 
            return res.json();
        }).then(function(res) {
            if(res.success) {
                postContainer.remove();
                console.log(`Post ${postId} deleted`);
            } else {
                console.error("Failed to delete post");
            }
        }).catch(function(error) {
            console.error(error);
        });
    }
})
