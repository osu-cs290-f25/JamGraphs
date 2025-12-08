document.addEventListener("DOMContentLoaded", function() {
    const container = document.querySelector('.graph-container');
    const radioButtons = document.querySelectorAll('input[name="visual-choice"]');
    let currentUsername = "My";
    
    loadUserProfile();
    updateChart();
//Calls api to get user profile info and update pfp and name tag
    async function loadUserProfile() {
        try {
            const response = await fetch('/api/user/profile');
            if (response.ok) {
                const user = await response.json();
                const pfpImage = document.querySelector('.post-pfp');
                if (pfpImage && user.pfp) pfpImage.src = user.pfp;
                if (user.username) {
                    currentUsername = user.username;
                    currentUsername = currentUsername.charAt(0).toUpperCase() + currentUsername.slice(1); //capitalize first letter for consistency
                }
                const nameTag = document.querySelector('.post-name');
                if (nameTag && user.username) nameTag.textContent = user.username;
            }
        } catch (err) { console.error("Profile load error:", err); }
    }
// Calls chart js functions with spotify data and draws chart
async function updateChart() {
        const selectedOption = document.querySelector('input[name="visual-choice"]:checked').value;
        
        try {
            console.log(`Fetching data for: ${selectedOption}...`);
            const response = await fetch(`/api/spotify/data?type=${selectedOption}&time_range=long_term`);

            if (!response.ok) {
                console.error("Server Error Status:", response.status);
                throw new Error(`Server returned status: ${response.status}`);
            }

            const text = await response.text();
            
            if (!text || text.trim() === "") {
                console.warn("Server returned an empty response (200 OK but no data).");
                container.innerHTML = '<p style="color:yellow;">No data received from Spotify.</p>';
                return;
            }

            let data;
            try {
                data = JSON.parse(text);
            } catch (jsonErr) {
                console.error("CRITICAL: Server returned 200 OK but sent invalid JSON.");
                console.log("Raw Server Response:", text);
                
                if (text.includes("<!DOCTYPE html>")) {
                    alert("Session expired. Please log in again.");
                    window.location.href = "/login";
                    return;
                }
                throw new Error("Invalid JSON response");
            }

            container.innerHTML = '';

            if (!data.items || data.items.length === 0) {
                container.innerHTML = '<p>No items found in your history.</p>';
                return;
            }

            if (selectedOption === 'top-tracks') {
                renderTracksList(data.items);
            } else if (selectedOption === 'top-artists') {
                renderArtistsGrid(data.items);
            } else if (selectedOption === 'genres-distribution') {
                renderGenres(data.items);
            }

        } catch (err) {
            console.error("Error updating chart:", err);
            container.innerHTML = `<p style="color:red; text-align:center">Error: ${err.message}</p>`;
        }
    }
// Renders top tracks list
    function renderTracksList(items) {
        const top5 = items.slice(0, 5);
        const listDiv = document.createElement('div');
        listDiv.className = 'track-list';
        top5.forEach((track, index) => {
            const imgUrl = track.album.images[0] ? track.album.images[0].url : 'images/noPfp.jpg';
            const artistNames = track.artists.map(a => a.name).join(', ');
            listDiv.innerHTML += `
                <div class="track-item">
                    <div class="track-rank">#${index + 1}</div>
                    <img src="${imgUrl}" class="track-img" alt="${track.name}">
                    <div class="track-info"><span class="track-name">${track.name}</span><span class="track-artist">${artistNames}</span></div>
                </div>`;
        });
        container.appendChild(listDiv);
    }
// Renders top artists grid
    function renderArtistsGrid(items) {
        const top9 = items.slice(0, 9);
        const gridDiv = document.createElement('div');
        gridDiv.className = 'artist-grid';
        top9.forEach(artist => {
            const imgUrl = artist.images[0] ? artist.images[0].url : 'images/noPfp.jpg';
            gridDiv.innerHTML += `
                <div class="artist-card" title="${artist.name}">
                    <img src="${imgUrl}" class="artist-img" alt="${artist.name}">
                    <div class="artist-name-overlay">${artist.name}</div>
                </div>`;
        });
        container.appendChild(gridDiv);
    }
// Renders genres distribution chart
    function renderGenres(items) {
        const canvas = document.createElement('canvas');
        canvas.id = 'myChart';
        container.appendChild(canvas);
        const ctx = canvas.getContext('2d');

        const genreCounts = {};
        items.forEach(artist => artist.genres.forEach(g => genreCounts[g] = (genreCounts[g] || 0) + 1));
        
        const sorted = Object.entries(genreCounts).sort((a,b) => b[1]-a[1]).slice(0, 12);
        //Change slice for amount of genres shown
        
        new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: sorted.map(s => s[0]),
                datasets: [{
                    data: sorted.map(s => s[1]),
                    backgroundColor: [
                        //Change these to change chart colors
                        'rgba(102, 252, 241, 0.7)', 'rgba(99, 102, 255, 0.7)', 'rgba(91, 189, 255, 0.7)',
                        'rgba(160, 255, 211, 0.7)', 'rgba(118, 216, 255, 0.7)', 'rgba(153, 102, 255, 0.7)',
                        'rgba(250, 155, 255, 0.7)', 'rgba(160, 162, 255, 0.7)'
                    ],
                    borderWidth: 1, borderColor: '#1C2541'
                }]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                scales: { r: { ticks: { display: false, backdropColor: 'transparent' }, grid: { color: 'rgba(255,255,255,0.1)' }, pointLabels: { display: true, centerPointLabels: false, font: { size: 12 }, color: '#fff' } } },
                plugins: { legend: {display:false} }
                //Hides legend to reduce clutter
            }
        });
    }
    // Share button functionality
    const shareBtn = document.getElementById("generate-visualization-btn");

    if (shareBtn) {
        shareBtn.addEventListener("click", async function() {
            const visualContainer = document.querySelector(".visual-container");
            const selectedOption = document.querySelector('input[name="visual-choice"]:checked').value;
            
            const originalText = shareBtn.textContent;
            shareBtn.textContent = "Saving...";
            shareBtn.disabled = true;

            try {
                const canvas = await html2canvas(visualContainer, {
                    backgroundColor: null,
                    scale: 2,
                    useCORS: true,
                    allowTaint: true
                });

                const imgData = canvas.toDataURL("image/png");
                
                const response = await fetch('/api/share', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        imgData: imgData,
                        description: `${currentUsername}'s ${selectedOption.replace('-', ' ')}`
                    })
                });

                if (response.ok) {
                    alert("Posted to your feed successfully!");
                } else {
                    const err = await response.text();
                    console.error("Share failed:", err);
                    alert("Failed to share. Check console.");
                }

            } catch (err) {
                console.error("Error sharing:", err);
                alert("Error creating snapshot.");
            } finally {
                shareBtn.textContent = originalText;
                shareBtn.disabled = false;
            }
        });
    }
    radioButtons.forEach(radio => radio.addEventListener("change", updateChart));
});