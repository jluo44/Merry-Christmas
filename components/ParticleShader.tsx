import * as THREE from 'three';

// Vertex shader
const vertexShader = `
  uniform float uTime;
  uniform float uSize;
  uniform float uCollapse; // 0.0 = Expanded, 1.0 = Collapsed
  uniform float uPinch;    // Affects bloom/size

  attribute vec3 aTargetPos;
  attribute vec3 aRandom;
  attribute float aSize;
  attribute vec3 aColor;   // Per-particle color

  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;

    // CENTER COLLAPSE LOGIC
    // Instead of normalizing (which causes singularities at 0,0,0), 
    // we collapse towards a small randomized cluster at the center.
    vec3 centerPos = (aRandom - 0.5) * 0.5; // Small random sphere at origin
    vec3 pos = mix(aTargetPos, centerPos, uCollapse);
    
    // Rotation swirl effect during collapse
    if (uCollapse > 0.01) {
       float angle = uCollapse * 5.0 * length(aTargetPos.xz); 
       float s = sin(angle);
       float c = cos(angle);
       mat2 rot = mat2(c, -s, s, c);
       pos.xz = rot * pos.xz;
    }
    
    // Idle Noise Movement
    float noise = sin(uTime * 1.5 + aRandom.x * 10.0) * 0.05 * (1.0 - uCollapse * 0.8);
    pos.y += noise;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    
    // Size attenuation
    float dist = -mvPosition.z;
    float dynamicSize = uSize * aSize;
    
    // Twinkle effect
    float twinkle = 1.0 + sin(uTime * 3.0 + aRandom.y * 25.0) * 0.3;
    dynamicSize *= twinkle;

    // Pinch effect (Enlarge)
    if (uPinch < 0.2) {
        dynamicSize *= 1.5 + sin(uTime * 15.0) * 0.5;
    }
    
    // Reduce size when collapsed to prevent solid white blob
    dynamicSize *= mix(1.0, 0.4, uCollapse);

    // Calc point size with clamp to prevent infinity/black spots on very close particles
    float perspectiveSize = dynamicSize * (350.0 / max(1.0, dist));
    gl_PointSize = min(150.0, perspectiveSize); // Clamp max size
    
    gl_Position = projectionMatrix * mvPosition;

    // ALPHA LOGIC
    // Base alpha reduced to 0.55 to prevent whiteout overlap.
    vAlpha = mix(0.55, 0.05, uCollapse);
  }
`;

// Fragment shader: Soft, glowing particle
const fragmentShader = `
  uniform float uPinch;

  varying float vAlpha;
  varying vec3 vColor;

  void main() {
    vec2 xy = gl_PointCoord.xy - vec2(0.5);
    float ll = length(xy);
    
    // Circular cutout
    if (ll > 0.5) discard;

    // Softness:
    float strength = smoothstep(0.5, 0.1, ll);

    vec3 finalColor = vColor;
    
    // Pinch highlight color shift
    if (uPinch < 0.2) {
        finalColor = mix(finalColor, vec3(1.0, 1.0, 0.9), 0.5);
        strength *= 1.5;
    }

    gl_FragColor = vec4(finalColor, strength * vAlpha);
  }
`;

const ParticleShaderMaterial = new THREE.ShaderMaterial({
  vertexShader,
  fragmentShader,
  uniforms: {
    uTime: { value: 0 },
    uSize: { value: 1.0 },
    uCollapse: { value: 0 },
    uPinch: { value: 1.0 },
  },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});

export { ParticleShaderMaterial };