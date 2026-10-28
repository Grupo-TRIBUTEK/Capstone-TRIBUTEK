/** Utilidad manual que genera un hash Argon2 a partir del valor definido en este archivo. No crea usuarios ni actualiza contraseñas en la base. */
import argon2 from 'argon2';

const password = '1234566';

const hash = await argon2.hash(password);

console.log(hash);