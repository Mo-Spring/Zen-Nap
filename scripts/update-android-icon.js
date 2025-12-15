import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Android 资源目录路径
const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');

// --- 颜色配置 (不透明 Hex，兼容性最好) ---
const COLOR_BG = "#FF000000";       // 背景：纯黑
const COLOR_RING = "#FF333333";     // 圆环：深灰
const COLOR_BIG_Z = "#FFFFFFFF";    // 大 Z：纯白
const COLOR_SMALL_Z = "#FFAAAAAA";  // 小 z：浅灰

// --- 图标路径设计 (24x24 Viewport) ---
// Android Adaptive Icon Safe Zone 计算:
// 画布 108dp, 安全区直径 66dp. 比例 66/108 = 0.61
// 在 24px 视口中，安全区直径约为 14.6px (半径 7.3px)
// 我们将内容限制在半径 6.5px 以内，绝对安全。

const FOREGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    
    <!-- 1. 圆环 (半径 4.5, 直径 9) -->
    <!-- M 12 7.5 A 4.5 4.5 0 1 1 12 16.5 A 4.5 4.5 0 1 1 12 7.5 -->
    <path
        android:pathData="M 12 7.5 A 4.5 4.5 0 1 1 12 16.5 A 4.5 4.5 0 1 1 12 7.5"
        android:strokeColor="${COLOR_RING}"
        android:strokeWidth="1.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />

    <!-- 2. 大 Z (10,10 到 14,14) -->
    <path
        android:pathData="M 10 10 H 14 L 10 14 H 14"
        android:strokeColor="${COLOR_BIG_Z}"
        android:strokeWidth="2.0"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />

    <!-- 3. 小 z (14,7 到 15.5,8.5) - 紧凑布局防止裁切 -->
    <path
        android:pathData="M 14 7 H 15.5 L 14 8.5 H 15.5"
        android:strokeColor="${COLOR_SMALL_Z}"
        android:strokeWidth="1.2"
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
        android:fillColor="${COLOR_BG}"
        android:pathData="M0,0h1v1h-1z" />
</vector>`;

const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`;

function updateIcons() {
    console.log('🔄 Starting Android Icon Update...');
    
    if (!fs.existsSync(ANDROID_RES_PATH)) {
        console.error(`❌ Android res directory not found at: ${ANDROID_RES_PATH}`);
        console.error('   Please run "npx cap add android" first.');
        return;
    }

    const drawableDir = path.join(ANDROID_RES_PATH, 'drawable');
    const anydpiDir = path.join(ANDROID_RES_PATH, 'mipmap-anydpi-v26');

    // 确保目录存在
    if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
    if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });

    try {
        // 1. 写入前景和背景矢量图
        fs.writeFileSync(path.join(drawableDir, 'ic_launcher_foreground.xml'), FOREGROUND_XML);
        fs.writeFileSync(path.join(drawableDir, 'ic_launcher_background.xml'), BACKGROUND_XML);
        
        // 2. 写入自适应图标定义
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);

        console.log(`✅ Successfully generated Adaptive Icons (XML)`);

        // 3. 尝试清理默认的机器人 PNG (可选，为了避免缓存困扰)
        // 这一步不是必须的，因为 Android 8+ 会优先用 XML，但删掉可以防止回退到机器人
        const densityDirs = ['mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'];
        const filesToDelete = ['ic_launcher.png', 'ic_launcher_round.png', 'ic_launcher_foreground.png', 'ic_launcher_background.png'];
        
        console.log('🧹 Cleaning up default PNGs to enforce XML usage...');
        let deletedCount = 0;
        densityDirs.forEach(dir => {
            const dirPath = path.join(ANDROID_RES_PATH, dir);
            if (fs.existsSync(dirPath)) {
                filesToDelete.forEach(file => {
                    const filePath = path.join(dirPath, file);
                    if (fs.existsSync(filePath)) {
                        fs.unlinkSync(filePath);
                        deletedCount++;
                    }
                });
            }
        });
        console.log(`   Deleted ${deletedCount} default PNG files.`);

    } catch (error) {
        console.error('❌ Error writing icon files:', error);
        process.exit(1);
    }
}

updateIcons();
