// Helper function to convert ArrayBuffer or Uint8Array to Base64
// This is essential for displaying images stored as binary data in your database.
function arrayBufferToBase64(buffer) {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
}

// Handles user logout by clearing the token and redirecting to the home page.
async function logout() {
    localStorage.removeItem('token'); // Ensure 'token' is the correct key used for storing JWT
    window.location.href = '/'; // Redirect to your home page
}

// Validates the user's session by sending the JWT to the server.
// It redirects to the login page if the session is expired or invalid.
async function valid() {
    const token = localStorage.getItem('token'); // Retrieve the JWT from local storage
    if (!token) {
        alert('Session expired. Please log in again.');
        window.location.href = '/Login'; // Redirect to your login page
        return null; // Return null if no token is found
    }

    try {
        const response = await fetch('/valid', {
            method: 'POST',
            headers: {
                // *** CRITICAL FIX: Add 'Bearer ' prefix to the Authorization header ***
                'Authorization': `Bearer ${token}`
            },
        });

        if (!response.ok) {
            // If the server explicitly indicates an unauthorized (401) or forbidden (403) status,
            // it means the token is invalid or expired. Clear it and force re-login.
            if (response.status === 401 || response.status === 403) {
                localStorage.removeItem('token');
                alert('Session expired. Please log in again.');
                window.location.href = '/Login';
            } else {
                // Handle other non-OK responses as generic errors leading to re-login
                alert(`Error: ${response.statusText}. Please log in again.`);
                window.location.href = '/Login';
            }
            return null; // Return null on non-OK response
        }

        // If validation is successful, return the user data from the response
        return await response.json();
    } catch (error) {
        // Catch network errors or issues with the fetch request itself
        console.error('Error validating session:', error);
        alert('An error occurred. Please log in again.');
        window.location.href = '/Login';
        return null; // Return null on error
    }
}

// Loads and displays all public posts from the server (for userhome.html).
async function loadPosts() {
    try {
        const response = await fetch('/api/posts'); // Endpoint to get all posts
        if (!response.ok) throw new Error('Failed to fetch posts');

        const posts = await response.json();
        const postsContainer = document.getElementById('posts'); // Assuming an element with id 'posts'
        if (!postsContainer) {
            console.warn("Element with ID 'posts' not found. Skipping loadPosts display.");
            return;
        }
        postsContainer.innerHTML = ''; // Clear previous content

        if (posts.length === 0) {
            postsContainer.innerHTML = '<p style="text-align: center; margin-top: 20px; color: #555;">No public posts available yet.</p>';
            return;
        }

        posts.forEach(post => {
            const card = document.createElement('div');
            card.classList.add('post-box'); // Assuming you have a 'post-box' CSS class

            const img = document.createElement('img');
            // Assuming post.image.data is a Buffer and post.image.contentType is available
            if (post.image && post.image.data && post.image.contentType) {
                 img.src = `data:${post.image.contentType};base64,${arrayBufferToBase64(post.image.data.data)}`;
            } else {
                 img.src = 'placeholder.jpg'; // Fallback if image data is missing
                 console.warn('Missing image data for post:', post._id);
            }
            img.alt = post.name;

            const info = document.createElement('div');
            info.className = 'info';
            info.innerHTML = `
                <h3>${post.name}</h3>
                <p><strong>Email:</strong> ${post.email}</p>
                <p><strong>Mobile:</strong> ${post.mobile}</p>
                <p><strong>Location:</strong> ${post.location}</p>
                <br>
                <center><a href="/Claimform?donationId=${post._id}" class="button">Claim</a></center>
            `;

            card.appendChild(img);
            card.appendChild(info);
            postsContainer.appendChild(card);
        });
    } catch (err) {
        console.error("Error loading public posts:", err);
        const postsContainer = document.getElementById('posts');
        if (postsContainer) {
            postsContainer.innerHTML = '<p style="text-align:center; color:red;">Failed to load posts.</p>';
        }
    }
}

// NOTE: loadMySubmissions is intended to be used directly on Submissions.html
// and is typically inlined or called from there.
// If it needs to be in script.js for sharing, uncomment and use it.
/*
async function loadMySubmissions() {
    // ... (Your loadMySubmissions function from Submissions.html will go here,
    // ensure it uses `Authorization: Bearer ${token}` header)
}
*/