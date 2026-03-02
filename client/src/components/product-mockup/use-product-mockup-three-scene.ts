import { useEffect } from "react";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { configureLabelPreviewRenderer } from "@/lib/label-designer-render-color";
import { DEFAULT_CYLINDER_POS } from "@/components/product-mockup/product-mockup-constants";
import type { ThreeContext } from "@/components/product-mockup/product-mockup.types";

interface UseProductMockupThreeSceneProps {
  createLabelTexture: () => THREE.CanvasTexture;
  cylinderLoaded: boolean;
  cylinderPos: any;
  labelRotation: number;
  lighting: any;
  textureMapping: any;
  threeContainerRef: React.RefObject<HTMLDivElement>;
  threeContextRef: React.MutableRefObject<ThreeContext | null>;
  setCylinderLoaded: (value: boolean) => void;
  viewRotation: number;
}

export function useProductMockupThreeScene(props: UseProductMockupThreeSceneProps) {
  useEffect(() => {
    const container = props.threeContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const width = rect.width || 500;
    const height = rect.height || 500;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(35, width / height, 0.01, 100);
    camera.position.set(0, 0, DEFAULT_CYLINDER_POS.cameraZ);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    configureLabelPreviewRenderer(renderer);
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    container.appendChild(renderer.domElement);

    const ambientLight = new THREE.AmbientLight(0xffffff, props.lighting.ambient);
    scene.add(ambientLight);
    const frontLight = new THREE.DirectionalLight(0xffffff, props.lighting.front);
    frontLight.position.set(0, 0, 1);
    scene.add(frontLight);
    const topLight = new THREE.DirectionalLight(0xffffff, props.lighting.top);
    topLight.position.set(0, 1, 0.5);
    scene.add(topLight);

    let cylinder: THREE.Mesh | null = null;
    let loadedGeometry: THREE.BufferGeometry | null = null;
    let loadedMaterial: THREE.MeshStandardMaterial | null = null;

    const loader = new OBJLoader();
    loader.load(
      "/attached_assets/HempWick%20Roll%20Object_1764118046566.obj",
      (obj) => {
        if (obj.children.length === 0 || !(obj.children[0] as THREE.Mesh).geometry) {
          return;
        }

        loadedGeometry = (obj.children[0] as THREE.Mesh).geometry;
        const labelTexture = props.createLabelTexture();
        loadedMaterial = new THREE.MeshStandardMaterial({
          map: labelTexture,
          roughness: 0.7,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });

        cylinder = new THREE.Mesh(loadedGeometry, loadedMaterial);
        cylinder.rotation.x = (DEFAULT_CYLINDER_POS.rotX * Math.PI) / 180;
        cylinder.rotation.y = (120 * Math.PI) / 180;
        cylinder.rotation.z = (DEFAULT_CYLINDER_POS.rotY * Math.PI) / 180;
        cylinder.position.set(DEFAULT_CYLINDER_POS.x, DEFAULT_CYLINDER_POS.y, DEFAULT_CYLINDER_POS.z);
        cylinder.scale.setScalar(DEFAULT_CYLINDER_POS.scale);
        scene.add(cylinder);

        props.threeContextRef.current = {
          scene,
          camera,
          renderer,
          cylinder,
          geometry: loadedGeometry,
          material: loadedMaterial,
          animationId: 0,
          ambientLight,
          frontLight,
          topLight,
        };
        props.setCylinderLoaded(true);
      },
      undefined,
      () => {
        loadedGeometry = new THREE.CylinderGeometry(0.01, 0.01, 0.052, 64, 1, true);
        const labelTexture = props.createLabelTexture();
        loadedMaterial = new THREE.MeshStandardMaterial({
          map: labelTexture,
          roughness: 0.7,
          metalness: 0.05,
          side: THREE.DoubleSide,
        });

        cylinder = new THREE.Mesh(loadedGeometry, loadedMaterial);
        cylinder.position.set(DEFAULT_CYLINDER_POS.x, DEFAULT_CYLINDER_POS.y, DEFAULT_CYLINDER_POS.z);
        cylinder.scale.setScalar(DEFAULT_CYLINDER_POS.scale);
        scene.add(cylinder);

        props.threeContextRef.current = {
          scene,
          camera,
          renderer,
          cylinder,
          geometry: loadedGeometry,
          material: loadedMaterial,
          animationId: 0,
          ambientLight,
          frontLight,
          topLight,
        };
        props.setCylinderLoaded(true);
      },
    );

    let animationId = 0;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    props.threeContextRef.current = {
      scene,
      camera,
      renderer,
      cylinder: null,
      geometry: null,
      material: null,
      animationId,
      ambientLight,
      frontLight,
      topLight,
    };

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          renderer.setSize(w, h);
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
        }
      }
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      cancelAnimationFrame(animationId);
      const ctx = props.threeContextRef.current;
      if (ctx) {
        if (ctx.material) {
          if (ctx.material.map) ctx.material.map.dispose();
          ctx.material.dispose();
        }
        if (ctx.geometry) ctx.geometry.dispose();
      }
      renderer.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      props.threeContextRef.current = null;
    };
  }, []);

  useEffect(() => {
    const ctx = props.threeContextRef.current;
    if (!ctx || !ctx.cylinder) return;
    const material = ctx.cylinder.material as THREE.MeshStandardMaterial;
    if (material.map) {
      const rotationOffset = props.labelRotation / 360;
      material.map.offset.set(props.textureMapping.offsetX + rotationOffset, props.textureMapping.offsetY);
      material.map.center.set(props.textureMapping.centerX, props.textureMapping.centerY);
      material.map.repeat.set(props.textureMapping.scaleX, props.textureMapping.scaleY);
      material.map.rotation = (props.textureMapping.rotation * Math.PI) / 180;
      material.map.needsUpdate = true;
    }
  }, [props.textureMapping, props.cylinderLoaded, props.labelRotation]);

  useEffect(() => {
    const ctx = props.threeContextRef.current;
    if (!ctx || !ctx.cylinder) return;
    ctx.cylinder.rotation.y = (props.viewRotation * Math.PI) / 180;
  }, [props.viewRotation, props.cylinderLoaded]);

  useEffect(() => {
    const ctx = props.threeContextRef.current;
    if (!ctx || !ctx.cylinder) return;
    ctx.cylinder.position.set(props.cylinderPos.x, props.cylinderPos.y, props.cylinderPos.z);
    ctx.cylinder.scale.setScalar(props.cylinderPos.scale);
    ctx.cylinder.rotation.x = (props.cylinderPos.rotX * Math.PI) / 180;
    ctx.cylinder.rotation.z = (props.cylinderPos.rotY * Math.PI) / 180;
    ctx.camera.position.z = props.cylinderPos.cameraZ;
  }, [props.cylinderPos, props.cylinderLoaded]);

  useEffect(() => {
    const ctx = props.threeContextRef.current;
    if (!ctx) return;

    const warmth = props.lighting.warmth;
    let lightColor: THREE.Color;
    if (warmth >= 0) {
      lightColor = new THREE.Color(1, 1 - warmth * 0.1, 1 - warmth * 0.2);
    } else {
      lightColor = new THREE.Color(1 + warmth * 0.1, 1 + warmth * 0.05, 1);
    }

    if (ctx.ambientLight) {
      ctx.ambientLight.intensity = props.lighting.ambient;
      ctx.ambientLight.color = lightColor;
    }
    if (ctx.frontLight) {
      ctx.frontLight.intensity = props.lighting.front;
      ctx.frontLight.color = lightColor;

      const angleRad = (props.lighting.keyAngle * Math.PI) / 180;
      const heightRad = (props.lighting.keyHeight * Math.PI) / 180;
      const dist = props.lighting.keyDistance;
      const x = Math.cos(heightRad) * Math.sin(angleRad) * dist;
      const y = Math.sin(heightRad) * dist;
      const z = Math.cos(heightRad) * Math.cos(angleRad) * dist;
      ctx.frontLight.position.set(x, y, z);
    }
    if (ctx.topLight) {
      ctx.topLight.intensity = props.lighting.top;
      ctx.topLight.color = lightColor;
    }
  }, [props.lighting, props.cylinderLoaded]);
}
