import argon2 from 'argon2';

const password = '1234566';

const hash = await argon2.hash(password);

console.log(hash);