// All gameplay tuning lives here. Units: canvas pixels and seconds.
export const CONFIG = Object.freeze({
 duration: 30, health: 3, gravity: 1500, jumpForce: 565, doubleJumpForce: 520,
 runSpeed: 205, speedIncrease: 42, obstacleInterval: 3.1, minimumInterval: 2.5,
 warmup: 3, invincibility: 1.05, catHeight: 84, librarianHeight: 150,
 spriteFPS: 12, comicSeconds: 3.7,
 completionKey: 'secret-library:final-complete:v1',
 // Optional integration: exact parent origin, e.g. https://escape.example.
 parentOrigin: null,
});
