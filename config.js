// All gameplay tuning lives here. Units: logical canvas pixels and seconds.
export const CONFIG = Object.freeze({
 duration:30, health:3, gravity:1500, jumpForce:565, doubleJumpForce:520,
 runSpeed:205, speedIncrease:42, obstacleInterval:3.1, minimumInterval:2.5,
 warmup:3, invincibility:1.05, catHeight:58, librarianHeight:180,
 spriteFPS:12, comicSeconds:3.7,
 catCollider:Object.freeze({x:-21,y:-44,w:56,h:40}),
 hitStop:.07, stunDuration:.23, knockbackX:155, knockbackY:195,
 propKnockback:260, propGravity:850, contactGap:.7,
 defeatDelay:.55, spawnRecoverySpace:1.7, homeSpeed:105,
 debugCollisions:false,
 completionKey:'secret-library:final-complete:v1',
 // Optional integration: exact parent origin, e.g. https://escape.example.
 parentOrigin:null,
});
