// scripts/processImages.js
import sharp from 'sharp';
import { readdir, writeFile, stat } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function getAverageColor(imagePath) {
    try {
        const { dominant } = await sharp(imagePath)
            .resize(50, 50) // Resize for faster processing
            .stats();
        
        return {
            r: dominant.r,
            g: dominant.g,
            b: dominant.b
        };
    } catch (error) {
        console.error(`Error processing ${imagePath}:`, error);
        return { r: 0, g: 0, b: 0 };
    }
}

function rgbToHsl(r, g, b) {
    r /= 255;
    g /= 255;
    b /= 255;
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    
    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    
    return [h, s, l];
}

async function processImages() {
    const inputDir = join(__dirname, '../public/images');
    const outputJson = join(__dirname, '../public/imageData.json');
    
    try {
        const images = await readdir(inputDir);
        const imageData = [];
        
        console.log(`Found ${images.length} files in ${inputDir}`);
        
        for (const [index, filename] of images.entries()) {
            if (filename.match(/\.(jpg|jpeg|png)$/i)) {
                try {
                    const imagePath = join(inputDir, filename);
                    const stats = await stat(imagePath);
                    
                    // Get image dimensions and color
                    const metadata = await sharp(imagePath).metadata();
                    const averageColor = await getAverageColor(imagePath);
                    
                    imageData.push({
                        filename,
                        path: `/images/${filename}`,
                        width: metadata.width,
                        height: metadata.height,
                        size: stats.size,
                        averageColor
                    });
                    
                    if ((index + 1) % 100 === 0 || index === images.length - 1) {
                        console.log(`Processed ${index + 1}/${images.length} images...`);
                    }
                } catch (error) {
                    console.error(`Error processing ${filename}:`, error);
                }
            }
        }
        
        // Sort images by color (hue)
        imageData.sort((a, b) => {
            const hueA = rgbToHsl(a.averageColor.r, a.averageColor.g, a.averageColor.b)[0];
            const hueB = rgbToHsl(b.averageColor.r, b.averageColor.g, b.averageColor.b)[0];
            return hueA - hueB;
        });
        
        await writeFile(outputJson, JSON.stringify(imageData, null, 2));
        console.log(`\nSuccess! Processed ${imageData.length} images.`);
        console.log(`Data saved to ${outputJson}`);
        
    } catch (error) {
        console.error('Failed to process images:', error);
    }
}

processImages();