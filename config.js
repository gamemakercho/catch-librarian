// All gameplay tuning lives here. Units: logical canvas pixels and seconds.
export const CONFIG = Object.freeze({
 duration:30, health:3, gravity:1500, jumpForce:565, doubleJumpForce:520,
 runSpeed:410, speedIncrease:84, obstacleInterval:3.1, minimumInterval:2.5,
 warmup:3, invincibility:1.05, catHeight:58, librarianHeight:180,
 spriteFPS:24, comicSeconds:3.7, discoverySeconds:3.0,
 throwRelease:.230, throwDuration:.500,
 burstLowInterval:.88, burstHighInterval:.70, burstRecovery:1.35, burstHitRecovery:1.25, burstPropLifetime:.42, burstPropFadeStart:.08, endingToeOff:.640, endingFlight:.400, endingStumble:1.060, endingDuration:4.160,
 catCollider:Object.freeze({x:-21,y:-44,w:56,h:40}),
 hitStop:.07, stunDuration:.23, knockbackX:155, knockbackY:195,
 propKnockback:260, propGravity:550, propRestitution:Math.SQRT1_2,
 propLifetime:.9, propFadeStart:.2, contactGap:.7,
 bookThrowLow:Object.freeze([140,160,180]),
 bookThrowHigh:Object.freeze([330,350,370]),
 defeatDelay:.55, spawnRecoverySpace:1.7, homeSpeed:105,
 debugCollisions:false,
 completionKey:'secret-library:final-complete:v1',
 // Optional integration: exact parent origin, e.g. https://escape.example.
 parentOrigin:null,
});
