import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');

// --- 1. 图标设计配置 (完全匹配截图) ---
// Viewport: 24x24
// 颜色: AARRGGBB 格式

// 背景: 纯黑
const BG_COLOR = "#FF000000";

// 前景: 
// 圆环: 深灰色/半透明白 (#66FFFFFF)
// 大 Z: 亮白色 (#FFFFFFFF)
// 小 z: 稍暗白色 (#CCFFFFFF)

const FOREGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    
    <!-- 1. 圆环 (居中, 半径9) -->
    <!-- M12,12 m-9,0 a9,9 0 1,1 18,0 a9,9 0 1,1 -18,0 -->
    <path
        android:pathData="M12,12 m-9,0 a9,9 0 1,1 18,0 a9,9 0 1,1 -18,0"
        android:strokeColor="#66FFFFFF"
        android:strokeWidth="1.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />

    <!-- 2. 大 Z (中心) -->
    <!-- M8 9h8l-8 8h8 -->
    <path
        android:pathData="M8 9h8l-8 8h8"
        android:strokeColor="#FFFFFFFF"
        android:strokeWidth="2.0"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />

    <!-- 3. 小 z (右上角上标) -->
    <!-- M18.5 5h3l-3 3h3 -->
    <path
        android:pathData="M18.5 5h3l-3 3h3"
        android:strokeColor="#CCFFFFFF"
        android:strokeWidth="1.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
</vector>`;

const BACKGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="1"
    android:viewportHeight="1">
    <path
        android:fillColor="${BG_COLOR}"
        android:pathData="M0,0h1v1h-1z" />
</vector>`;

const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`;

function updateIcons() {
    if (!fs.existsSync(ANDROID_RES_PATH)) {
        console.log('⚠️ Android res directory not found.');
        return;
    }

    // 1. 清理旧的 PNG 图标，防止冲突
    const dirsToClean = [
        'mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 
        'mipmap-xxhdpi', 'mipmap-xxxhdpi', 'drawable'
    ];
    const filesToDelete = [
        'ic_launcher.png', 'ic_launcher_round.png', 
        'ic_launcher_foreground.png', 'ic_launcher_background.png'
    ];

    dirsToClean.forEach(dir => {
        const dirPath = path.join(ANDROID_RES_PATH, dir);
        if (fs.existsSync(dirPath)) {
            filesToDelete.forEach(f => {
                const p = path.join(dirPath, f);
                if (fs.existsSync(p)) fs.unlinkSync(p);
            });
        }
    });

    // 2. 确保目录存在
    const drawableDir = path.join(ANDROID_RES_PATH, 'drawable');
    const anydpiDir = path.join(ANDROID_RES_PATH, 'mipmap-anydpi-v26');
    
    if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
    if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });

    // 3. 写入新的矢量资源
    fs.writeFileSync(path.join(drawableDir, 'ic_launcher_foreground.xml'), FOREGROUND_XML);
    fs.writeFileSync(path.join(drawableDir, 'ic_launcher_background.xml'), BACKGROUND_XML);
    
    // 4. 写入自适应配置
    fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
    fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);

    console.log('✅ Icon updated: Black BG + White Z (Vector)');
}

updateIcons();
