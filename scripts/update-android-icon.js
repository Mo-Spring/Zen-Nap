import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 指向 Android 项目的资源目录
const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');

// --- 颜色配置 (使用完全不透明的颜色，避免兼容性问题) ---
// 背景: 纯黑
const COLOR_BG = "#FF000000";

// 模拟透明度 (在黑色背景上)
// 30% White on Black ~= Dark Grey (#333333)
const COLOR_RING = "#FF333333"; 
// 100% White
const COLOR_BIG_Z = "#FFFFFFFF";
// 70% White on Black ~= Light Grey (#AAAAAA)
const COLOR_SMALL_Z = "#FFAAAAAA";

// 1. 前景图标 (Zen Logo)
const FOREGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    
    <!-- 圆环: 居中, 半径9 -->
    <path
        android:pathData="M12,12 m-9,0 a9,9 0 1,1 18,0 a9,9 0 1,1 -18,0"
        android:strokeColor="${COLOR_RING}"
        android:strokeWidth="1.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />

    <!-- 大 Z -->
    <path
        android:pathData="M8 9h8l-8 8h8"
        android:strokeColor="${COLOR_BIG_Z}"
        android:strokeWidth="2.0"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />

    <!-- 小 z -->
    <path
        android:pathData="M18.5 5h3l-3 3h3"
        android:strokeColor="${COLOR_SMALL_Z}"
        android:strokeWidth="1.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
</vector>`;

// 2. 背景 (纯黑)
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

// 3. 自适应图标入口
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

    // 目标目录
    const drawableDir = path.join(ANDROID_RES_PATH, 'drawable');
    const anydpiDir = path.join(ANDROID_RES_PATH, 'mipmap-anydpi-v26');

    // 确保目录存在
    if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
    if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });

    // 写入文件
    try {
        // 1. 写入前景和背景矢量图
        fs.writeFileSync(path.join(drawableDir, 'ic_launcher_foreground.xml'), FOREGROUND_XML);
        fs.writeFileSync(path.join(drawableDir, 'ic_launcher_background.xml'), BACKGROUND_XML);
        
        // 2. 写入自适应图标定义 (覆盖默认的 XML)
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);

        console.log(`✅ Successfully wrote XML icons to:`);
        console.log(`   - ${path.join(drawableDir, 'ic_launcher_foreground.xml')}`);
        console.log(`   - ${path.join(anydpiDir, 'ic_launcher.xml')}`);

        // 注意：我们不再强制删除 mipmap-xhdpi 等文件夹中的 PNG。
        // 如果设备支持 XML (Android 8+)，它会优先读取 mipmap-anydpi-v26 中的 XML。
        // 如果设备不支持，它会回退到 PNG (可能是旧的图标，但也比崩溃好)。
        // 为了避免混淆，我们可以尝试删除旧的 XML 引用如果存在。

    } catch (error) {
        console.error('❌ Error writing icon files:', error);
    }
}

updateIcons();
