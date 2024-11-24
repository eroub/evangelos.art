const fs = require('fs').promises;
const path = require('path');

async function copyArtFiles() {
    const sourceDir = path.resolve(process.env.HOME, 'Documents/Root/art');
    const targetDir = path.resolve(process.env.HOME, 'Documents/Root/work/build/evangelos/public/images');

    try {
        // Ensure target directory exists
        await fs.mkdir(targetDir, { recursive: true });

        // Function to recursively find all files
        async function getAllFiles(dir) {
            const files = await fs.readdir(dir, { withFileTypes: true });
            let fileList = [];

            for (const file of files) {
                const fullPath = path.join(dir, file.name);
                if (file.isDirectory()) {
                    fileList = fileList.concat(await getAllFiles(fullPath));
                } else {
                    fileList.push(fullPath);
                }
            }
            return fileList;
        }

        // Get all files and copy them
        const files = await getAllFiles(sourceDir);
        for (const filePath of files) {
            const fileName = path.basename(filePath);
            const targetPath = path.join(targetDir, fileName);
            await fs.copyFile(filePath, targetPath);
            console.log(`Copied: ${fileName}`);
        }

        console.log('All art files copied successfully!');
    } catch (error) {
        console.error('Error copying files:', error);
    }
}

copyArtFiles();