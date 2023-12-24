# Cryptography Project Report

### Kamal Alasgarli

### Nijat Abdullazada

## Project Instructions

Implement a Key Distribution Center that allow two users to share safely a cesar key Index using your own
RSA inplementation: The server implementation should include user registration, public key storage, session key generation based on user request, exchange with related parties.

## Technologies Used

- **Nest.js**: Used as it possess a modular architecture, and have built-in support for modern web features like Websockets.
- **Redis**: Used as a database for faster operations.
- **WebSockets**:To implement a real-time communication between two users using Key Distribution Center

## How it works

The main purpose here is to implement an example of a Key Distribution Center (KDC). The working principle of our application is as follows:

If user A wants to communicate with user B, the following steps are undertaken:

1. User A sends his/her public key to the User B
2. User B generates a random session key and encrypts it with User A's public key. Then transmits the encrypted value to the user A.
3. User A decrypts the retrieved encrypted value with his/her private key and accesses the session key.

Result: Now, both parties have a secure communication key upon which their connection can safely rely. They can use the accessed session key to communicate with each other.

## Endpoint Documentation

You can see the available endpoints and their purpose with specifications below:

1. `/kdc/register`:

   - Purpose: To register a user in application.
   - Input: {username: string}
   - Output: {message: 'Successfully registered'}

2. `/kdc/keys`:

   - Purpose: To retrieve the public and private keys of a user.
   - Input: {username: string}
   - Output: {privateKey: string, publicKey: string}

3. `/kdc/generateEncryptedSessionKey`:

   - Purpose: To generate an encrypted session key using a randomly generated session key and encrpyting it with a public key.
   - Input: {publicKey: string}
   - Output: {encryptedSessionKey: string}

4. `/kdc/decryptSessionKey`:

   - Purpose: To decrypt the provided encrypted session key with the users private key to access plain session key.
   - Input: {privateKey: string, encryptedSessionKey: string}
   - Output: {sessionKey: string}
