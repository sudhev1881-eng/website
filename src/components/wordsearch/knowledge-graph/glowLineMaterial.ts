import * as THREE from "three";

export const glowLineVertexShader = /* glsl */ `
  attribute float aStrength;
  varying float vStrength;
  varying float vLinePosition;

  void main() {
    vStrength = aStrength;
    vLinePosition = position.x;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

export const glowLineFragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying float vStrength;
  varying float vLinePosition;

  void main() {
    float pulse = 0.55 + 0.45 * sin(uTime * 2.2 + vLinePosition * 4.5);
    float alpha = uOpacity * vStrength * pulse;
    vec3 glow = uColor + vec3(0.08, 0.12, 0.18) * pulse;
    gl_FragColor = vec4(glow, alpha);
  }
`;

export function createGlowLineMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color("#4DA3FF") },
      uOpacity: { value: 0.4 },
    },
    vertexShader: glowLineVertexShader,
    fragmentShader: glowLineFragmentShader,
  });
}
