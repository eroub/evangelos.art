// src/js/main.js
import * as THREE from 'three';

class ArtCollage {
    constructor() {
        this.meshes = [];
        this.scene = new THREE.Scene();
        
        // Calculate viewport dimensions in world units
        const fov = 75;
        const distance = 15; // Camera distance
        this.viewportHeight = 2 * Math.tan((fov * Math.PI / 180) / 2) * distance;
        this.viewportWidth = this.viewportHeight * (window.innerWidth / window.innerHeight);
        
        this.camera = new THREE.PerspectiveCamera(
            fov,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true,
            alpha: true
        });
        
        this.animate = this.animate.bind(this);
        this.setupScene();
        this.createBackground();
        this.loadImages();
        this.animate();
    }

    setupScene() {
        this.camera.position.z = 15;
        
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0xffffff, 1);

        const container = document.getElementById('scene-container');
        container.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => {
            // Update viewport dimensions
            this.viewportHeight = 2 * Math.tan((75 * Math.PI / 180) / 2) * 15;
            this.viewportWidth = this.viewportHeight * (window.innerWidth / window.innerHeight);
            
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
            this.updateBackground();
        });
    }

    createBackground() {
        const geometry = new THREE.PlaneGeometry(this.viewportWidth * 1.5, this.viewportHeight * 1.5);
        
        const textureLoader = new THREE.TextureLoader();
        const paperTexture = textureLoader.load('/textures/paper-texture.jpg', (texture) => {
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            texture.repeat.set(3, 3);
            texture.minFilter = THREE.LinearFilter;
            texture.magFilter = THREE.LinearFilter;
        });
        
        const material = new THREE.MeshBasicMaterial({ 
            map: paperTexture,
            color: 0xf2eee5,
            side: THREE.DoubleSide
        });
        
        this.background = new THREE.Mesh(geometry, material);
        this.background.position.z = -2;
        this.scene.add(this.background);
    }

    updateBackground() {
        if (this.background) {
            this.background.scale.x = this.viewportWidth * 1.5;
            this.background.scale.y = this.viewportHeight * 1.5;
        }
    }

    findNextPosition(width, height) {
        const PADDING = -0.8; // Increase overlap significantly
        const Z_RANGE = 1; // Range for z-axis variation

        if (this.meshes.length === 0) {
            return { x: 0, y: 0, z: 0 };
        }

        const positions = [];
        let radius = Math.min(width, height) * 0.6; // Start even closer to center
        const angleStep = Math.PI / 12;
        const radiusStep = Math.min(width, height) * 0.2; // Smaller steps
        let attempts = 0;
        const maxAttempts = 2000;
        
        // Create spiral arms with z-offset
        const numArms = 12; // More arms for denser packing
        
        while (attempts < maxAttempts) {
            for (let arm = 0; arm < numArms; arm++) {
                const baseAngle = (arm * Math.PI * 2) / numArms;
                const currentAngle = baseAngle + (radius * 0.15); // More rotation as radius increases
                
                // Add controlled randomness
                const randomOffset = (Math.random() - 0.5) * radiusStep * 0.8;
                const x = Math.cos(currentAngle) * (radius + randomOffset);
                const y = Math.sin(currentAngle) * (radius + randomOffset);
                const z = (Math.random() - 0.5) * Z_RANGE; // Random z-offset

                const hasOverlap = this.meshes.some(existingMesh => {
                    // Adjust overlap check based on z-position
                    const zDiff = Math.abs(z - existingMesh.position.z);
                    const overlapPadding = PADDING + (zDiff * 0.5); // Allow more overlap for different z-levels
                    
                    return this.checkOverlap(
                        x, y, width, height,
                        existingMesh.position.x,
                        existingMesh.position.y,
                        existingMesh.scale.x,
                        existingMesh.scale.y,
                        overlapPadding
                    );
                });

                if (!hasOverlap) {
                    const distance = Math.sqrt(x * x + y * y);
                    positions.push({ x, y, z, distance });
                }
            }

            radius += radiusStep;
            attempts++;

            if (positions.length >= 15) break;
        }

        if (positions.length === 0) {
            return {
                x: (Math.random() - 0.5) * this.viewportWidth * 2,
                y: (Math.random() - 0.5) * this.viewportHeight * 2,
                z: (Math.random() - 0.5) * Z_RANGE
            };
        }

        // Sort by distance but add some randomization
        positions.sort((a, b) => (a.distance + Math.random() * width * 0.5) - (b.distance + Math.random() * width * 0.5));
        return positions[0];
    }

    calculateEdgeScore(x, y, width, height) {
        const xEdge = Math.max(0, Math.abs(x) + width/2 - this.viewportWidth/2);
        const yEdge = Math.max(0, Math.abs(y) + height/2 - this.viewportHeight/2);
        return xEdge + yEdge;
    }

    checkOverlap(x1, y1, w1, h1, x2, y2, w2, h2, padding) {
        return Math.abs(x1 - x2) < (w1 + w2)/2 + padding &&
               Math.abs(y1 - y2) < (h1 + h2)/2 + padding;
    }

    loadImages() {
        return fetch('/imageData.json')
            .then(response => response.json())
            .then(allImages => {
                const shuffledImages = allImages.sort(() => Math.random() - 0.5);
                
                return shuffledImages.reduce((promise, imgData, index) => {
                    return promise.then(() => {
                        return new Promise(resolve => {
                            // Remove density check to load all images
                            setTimeout(() => {
                                this.loadSingleImage(imgData, (success) => {
                                    resolve();
                                });
                            }, 30);
                        });
                    });
                }, Promise.resolve());
            })
            .catch(error => console.error('Error loading images:', error));
    }

    isDensitySufficient() {
        const totalArea = this.viewportWidth * this.viewportHeight;
        const filledArea = this.meshes.reduce((sum, mesh) => {
            return sum + (mesh.scale.x * mesh.scale.y);
        }, 0);
        
        const densityThreshold = 2.0; // Increase threshold significantly or remove this check entirely
        return (filledArea / totalArea) >= densityThreshold;
    }

    loadSingleImage(imgData, callback) {
        const loader = new THREE.TextureLoader();
        
        loader.load(
            imgData.path,
            (texture) => {
                const aspectRatio = texture.image.width / texture.image.height;
                const baseSize = Math.min(this.viewportWidth, this.viewportHeight) * 0.35;
                const width = aspectRatio >= 1 ? baseSize : baseSize * aspectRatio;
                const height = aspectRatio >= 1 ? baseSize / aspectRatio : baseSize;

                const position = this.findNextPosition(width, height);
                
                if (!position) {
                    callback?.(false);
                    return;
                }

                const geometry = new THREE.PlaneGeometry(1, 1);
                const material = new THREE.MeshBasicMaterial({
                    map: texture,
                    transparent: true,
                    side: THREE.DoubleSide
                });

                const mesh = new THREE.Mesh(geometry, material);
                mesh.scale.set(width, height, 1);
                mesh.position.set(position.x, position.y, position.z);
                
                this.scene.add(mesh);
                this.meshes.push(mesh);
                
                callback?.(true);
            },
            undefined,
            (error) => {
                console.error('Error loading image:', imgData.path, error);
                callback?.(false);
            }
        );
    }

    animate() {
        requestAnimationFrame(this.animate);
        this.renderer.render(this.scene, this.camera);
    }

    calculateEdgeBonus(x, y) {
        const xEdgeDistance = Math.min(
            Math.abs(x - this.viewportWidth),
            Math.abs(x + this.viewportWidth)
        );
        const yEdgeDistance = Math.min(
            Math.abs(y - this.viewportHeight),
            Math.abs(y + this.viewportHeight)
        );
        
        // Give bonus to positions near edges
        return (xEdgeDistance < this.viewportWidth * 0.2 || yEdgeDistance < this.viewportHeight * 0.2) ? 2 : 0;
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new ArtCollage();
});