import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');

// --- 配置颜色 ---
// 根据您的截图：白底，天蓝色线条
const COLOR_BG = "#FFFFFF"; 
const COLOR_FG = "#3B82F6"; // 亮蓝色

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
        <!-- 圆环背景 -->
        <path
            android:pathData="M12,13 m-9,0 a9,9 0 1,1 18,0 a9,9 0 1,1 -18,0"
            android:strokeColor="${COLOR_FG}"
            android:strokeWidth="1.5"
            android:strokeAlpha="0.3"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <!-- 大 Z -->
        <path
            android:pathData="M9 10h6l-6 7h6"
            android:strokeColor="${COLOR_FG}"
            android:strokeWidth="2.2"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <!-- 小 z -->
        <path
            android:pathData="M19 4h3l-3 3h3"
            android:strokeColor="${COLOR_FG}"
            android:strokeWidth="1.8"
            android:strokeAlpha="0.8"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
    </group>
</vector>`;

// 2. 定义背景 (白色)
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
    // 这里的关键是：Capacitor 默认在所有 mipmap-* 文件夹生成了 ic_launcher.png
    // 如果不删除它们，Android 会优先使用 PNG 而不是我们的 anydpi XML
    // 这就是导致显示“安卓机器人”或者“旧图标”的根本原因
    const dirsToClean = [
        'mipmap-mdpi',
        'mipmap-hdpi',
        'mipmap-xhdpi',
        'mipmap-xxhdpi',
        'mipmap-xxxhdpi',
        'drawable',           // 清理旧的 drawable
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
                        // console.log(`   Deleted: ${dirName}/${fileName}`);
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

    // 1. 强力清理所有可能冲突的默认 PNG
    cleanupDefaultIcons(ANDROID_RES_PATH);

    const drawablePath = path.join(ANDROID_RES_PATH, 'drawable');
    const anydpiPath = path.join(ANDROID_RES_PATH, 'mipmap-anydpi-v26');

    // 确保目录存在
    if (!fs.existsSync(drawablePath)) fs.mkdirSync(drawablePath, { recursive: true });
    if (!fs.existsSync(anydpiPath)) fs.mkdirSync(anydpiPath, { recursive: true });

    // 2. 写入矢量资源 (Drawable)
    // 这些是实际的图形数据
    fs.writeFileSync(path.join(drawablePath, 'ic_launcher_foreground.xml'), FOREGROUND_XML);
    fs.writeFileSync(path.join(drawablePath, 'ic_launcher_background.xml'), BACKGROUND_XML);
    
    // 3. 写入自适应图标配置 (Mipmap AnyDPI)
    // 这个文件告诉 Android 8.0+ 系统：“请忽略其他文件夹里的内容，使用这里定义的矢量图”
    fs.writeFileSync(path.join(anydpiPath, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
    fs.writeFileSync(path.join(anydpiPath, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);
    
    console.log('✅ Android Adaptive Icons updated successfully (White/Blue Theme).');
}

writeIconFiles();
