
const username = document.getElementById('username');
const password = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const statusReport = document.getElementById('msg');

const loginUrl = '/loginUser';

document.addEventListener('DOMContentLoaded', () => {

    loginBtn.addEventListener('click', login);
});


// signup function
// function to send stuff from front to back
async function login(e) {
    e.preventDefault();
    if (username.value == '' || password.value == '') return;

    // fetch resources from url using method 'post'
    const res = await fetch(loginUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    });

    // report
    if (res.status == 300){

        // replace window with the bank stuff.
        // sort of a 'redirect' to a link.
        // done from the client side / front end.
        window.location.href = '/bank'

        username.value = '';
        password.value = '';

    }
    // if username is not found in db
    else if (res.status == 404){
        username.value = '';
        password.value = '';
        
        statusReport.innerHTML = 'Invalid credentials or user not found.';
        statusReport.className = 'message error';
    }
    
    // invalid password
    else if (res.status == 403){
        username.value = '';
        password.value = '';

        statusReport.innerHTML = 'Invalid password.';
        statusReport.className = 'message error';
    }

}
