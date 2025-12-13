import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');

// --- 颜色配置 (修正为黑底白字，符合 App 深色主题) ---
// 格式: #AARRGGBB (Alpha, Red, Green, Blue)

// 背景：纯黑
const COLOR_BG = "#FF000000"; 

// 线条：白色 (配合不同透明度)
const COLOR_FG_CIRCLE = "#4DFFFFFF";  // 圆环：白色 30% 透明度 (0x4D = 77/255)
const COLOR_FG_MAIN_Z = "#FFFFFFFF";  // 主 Z：纯白 100% 不透明
const COLOR_FG_SMALL_Z = "#CCFFFFFF"; // 小 z：白色 80% 透明度 (0xCC = 204/255)

// 1. 定义矢量图形 (前景 - Zen 图标)
const FOREGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <group 
        android:scaleX="0.65" 
        android:scaleY="0.65" 
        android:translateX="4.2" 
        android:translateY="4.2">
        <!-- 圆环背景 (细线，低透明度) -->
        <path
            android:pathData="M12,13 m-9,0 a9,9 0 1,1 18,0 a9,9 0 1,1 -18,0"
            android:strokeColor="${COLOR_FG_CIRCLE}"
            android:strokeWidth="1.5"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <!-- 大 Z (粗线，高亮) -->
        <path
            android:pathData="M9 10h6l-6 7h6"
            android:strokeColor="${COLOR_FG_MAIN_Z}"
            android:strokeWidth="2.2"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <!-- 小 z (中等线条，稍高透明度) -->
        <path
            android:pathData="M19 4h3l-3 3h3"
            android:strokeColor="${COLOR_FG_SMALL_Z}"
            android:strokeWidth="1.8"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
    </group>
</vector>`;

// 2. 定义背景 (黑色)
const BACKGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="1"
    android:viewportHeight="1">
    <path
        android:fillColor="${COLOR_BG}"
        android:pathData="M0,0h1v1h-1z" />
</vector>`;

// 3. 定义自适应图标 XML
const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`;

function cleanupDefaultIcons(basePath) {
    const dirsToClean = [
        'mipmap-mdpi',
        'mipmap-hdpi',
        'mipmap-xhdpi',
        'mipmap-xxhdpi',
        'mipmap-xxxhdpi',
        'drawable',
        'drawable-v24'
    ];

    const filesToDelete = [
        'ic_launcher.png',
        'ic_launcher_round.png',
        'ic_launcher_foreground.png',
        'ic_launcher_background.png'
    ];

    console.log('🧹 Cleaning up default Capacitor icons...');

    dirsToClean.forEach(dirName => {
        const dirPath = path.join(basePath, dirName);
        if (fs.existsSync(dirPath)) {
            filesToDelete.forEach(fileName => {
                const filePath = path.join(dirPath, fileName);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                    } catch (e) {
                        console.warn(`   Failed to delete ${filePath}`, e);
                    }
                }
            });
        }
    });
}

function writeIconFiles() {
    if (!fs.existsSync(ANDROID_RES_PATH)) {
        console.log('⚠️ Android res directory not found. Skipping icon update.');
        return;
    }

    cleanupDefaultIcons(ANDROID_RES_PATH);

    const drawablePath = path.join(ANDROID_RES_PATH, 'drawable');
    const anydpiPath = path.join(ANDROID_RES_PATH, 'mipmap-anydpi-v26');

    if (!fs.existsSync(drawablePath)) fs.mkdirSync(drawablePath, { recursive: true });
    if (!fs.existsSync(anydpiPath)) fs.mkdirSync(anydpiPath, { recursive: true });

    fs.writeFileSync(path.join(drawablePath, 'ic_launcher_foreground.xml'), FOREGROUND_XML);
    fs.writeFileSync(path.join(drawablePath, 'ic_launcher_background.xml'), BACKGROUND_XML);
    
    fs.writeFileSync(path.join(anydpiPath, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
    fs.writeFileSync(path.join(anydpiPath, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);
    
    console.log('✅ Android Adaptive Icons updated successfully (Dark Theme: Black BG + White Icon).');
}

writeIconFiles();
