import * as THREE from 'three';

export function configureLabelPreviewRenderer(renderer: THREE.WebGLRenderer): void {
  // Keep preview output in sRGB so canvas-authored colors match what users pick.
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
}

export function configureLabelCanvasTexture(texture: THREE.CanvasTexture): THREE.CanvasTexture {
  // Canvas pixels are authored in sRGB space; mark texture so Three decodes correctly.
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
