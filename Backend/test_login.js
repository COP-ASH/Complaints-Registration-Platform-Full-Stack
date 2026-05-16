fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'vicky.nick1991@gmail.com', password: 'wrongpassword' })
})
.then(res => res.json())
.then(data => console.log(data))
.catch(err => console.error(err));
