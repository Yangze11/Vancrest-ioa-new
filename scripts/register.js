document.addEventListener('DOMContentLoaded', function() {
    const avatarInput = document.getElementById('avatar');
    const registerForm = document.getElementById('registerForm');

    avatarInput.addEventListener('change', function(event) {
        const file = event.target.files[0];
        if (file) {
            console.log('Selected file:', file.name);
            // Here you can add code to handle the file upload, e.g., sending it to the server
        }
    });

    registerForm.addEventListener('submit', function(event) {
        event.preventDefault();
        const formData = new FormData(registerForm);
        // Here you can add code to handle the form submission, e.g., sending it to the server
        console.log('Form submitted:', formData);
    });
});