import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Android 资源目录路径
const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');

// --- 新设计：禅意睡眠 v6 (Aesthetic Overlap) ---
const COLOR_BG = "#121629";       // 深邃夜空蓝
const COLOR_MOON = "#FFFFFF";     // 纯白
const COLOR_Z_BRIGHT = "#FFFFFF"; // 亮色 Z
const COLOR_Z_DIM = "#FFFFFF";    // 暗色 Z (半透明)

// --- 文件名定义 (v6 强制刷新) ---
const FG_NAME = 'zen_sleep_fore_v6'; 
const BG_NAME = 'zen_sleep_back_v6';

// --- Vector Drawable XMLs ---

// 1. 前景：C型新月 + 叠加 Z (带遮罩描边)
const FOREGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    
    <!-- 优雅的 C 型新月 -->
    <path
        android:fillColor="${COLOR_MOON}"
        android:pathData="M 11 3 A 9 9 0 1 0 11 21 A 7.5 7.5 0 0 1 11 3 Z" />
        
    <!-- 大 Z (遮罩层 - 模拟重叠剪裁) -->
    <!-- 使用背景色描边，使得 Z 看起来切入了月亮 -->
    <path
        android:strokeColor="${COLOR_BG}"
        android:strokeWidth="3.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M 13.5 12.5 H 17.5 L 13.5 16.5 H 17.5" />
        
    <!-- 大 Z (本体 - 亮白) -->
    <path
        android:strokeColor="${COLOR_Z_BRIGHT}"
        android:strokeWidth="2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M 13.5 12.5 H 17.5 L 13.5 16.5 H 17.5" />

    <!-- 小 Z (飘散 - 半透明) -->
    <path
        android:strokeColor="${COLOR_Z_DIM}"
        android:strokeAlpha="0.6"
        android:strokeWidth="1.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round"
        android:pathData="M 19.5 5.5 H 22 L 19.5 8 H 22" />
</vector>`;

// 2. 背景：深蓝纯色
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

// --- Adaptive Icon XML ---
const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/${BG_NAME}"/>
    <foreground android:drawable="@drawable/${FG_NAME}"/>
</adaptive-icon>`;

// --- 保底 PNG (Base64) ---
const FALLBACK_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlApw1AAAAZlBMVEUAAAAWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCn6e13YAAAAIHRSTlMAxw0y4pvh/hP4+uac9q2sWvH0z6aOQTXU0823j35yYkIM12JOAAACn0lEQVR4nO3d227bMBRE0TyltO//1g1gW0iKtBgS5Kx/0z60D4GGL0cAAAAAAAAAAAAAAADgP9oP967Xy2G979b9u1DVud+v+8N63637d6Gqc79f94f1vlv370JV536/7g/rfbfu34Wqzv1+3R/W+27dvwtdnZ926+2w3nfr/l3o6jzuh/16WO+7df8udHUe98N+Paz33bp/F7o6j/thvx7W+27dvwtdncf9sF8P63237t+Frs7jftivh/W+W/fvQlfn/bAeDut9t+7fha7O+2E9HNb7bt2/C12d98N6OKz33bp/F7o674f1cFjv+3W/fxe6Oh+Hw3o7rPfdun8Xujofh8N6O6z33bp/F7o6H4fDejms9926fxe6Oh+Hw3o5rPf9ut+/C12d98N6Oaz3/brfvwt9nR+3w3o9rPfdun8X+jo/bof1eljv+3W/fxf6Ot/vh/V6WO+7df8u9HW+3w/r9bDe9+t+/y70db7fD+v1sN536/5d6Ot8vx/W62G979f9/l3o6/y4H9bbYb3v1/3+Xejr/Lgf1tthve/X/f5d6Ot8uR8O+35Y7/t1v38X+jpf7ofDvh/W+37d79+Fvs6X++Gw74f1vl/3+3ehr/Plfji8/9/8uN+v+/270Nf5cj8c9v2w3vfrfv8u9HW+3A+HfT+s9/26378LfZ0v98Nh3w/rfb/u9+9CX+fL/XDY98N63637d6Gqc79f94f1vlv370JV536/7g/rfbfu34Wqzv1+3R/W+27dvwtdnZ/2w3o7rPf9ut+/C12dn/bDejus9926fxcAAAAAAAAAAAAAAAAAwI/9AS2gSg2c0/i2AAAAAElFTkSuQmCC";

function updateIcons() {
    console.log('🌙 Generating "Zen Sleep" Icons v6 (Aesthetic Overlap)...');
    
    if (!fs.existsSync(ANDROID_RES_PATH)) {
        console.error(`❌ Android res directory not found at: ${ANDROID_RES_PATH}`);
        return;
    }

    const drawableDir = path.join(ANDROID_RES_PATH, 'drawable');
    const anydpiDir = path.join(ANDROID_RES_PATH, 'mipmap-anydpi-v26');
    const densityDirs = [
        'mipmap-mdpi', 'mipmap-hdpi', 'mipmap-xhdpi', 'mipmap-xxhdpi', 'mipmap-xxxhdpi'
    ];

    [drawableDir, anydpiDir, ...densityDirs.map(d => path.join(ANDROID_RES_PATH, d))].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    try {
        console.log('1️⃣  Writing new vector XMLs (v6)...');
        fs.writeFileSync(path.join(drawableDir, `${FG_NAME}.xml`), FOREGROUND_XML);
        fs.writeFileSync(path.join(drawableDir, `${BG_NAME}.xml`), BACKGROUND_XML);
        
        console.log('2️⃣  Updating Adaptive Icon XMLs...');
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);

        console.log('3️⃣  Injecting Fallback PNGs...');
        const pngBuffer = Buffer.from(FALLBACK_PNG_BASE64, 'base64');
        
        densityDirs.forEach(dir => {
            const dirPath = path.join(ANDROID_RES_PATH, dir);
            fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), pngBuffer);
            fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), pngBuffer);
            
            // 清理旧版本文件
            const oldFiles = [
                'zen_sleep_fore_v5.xml', 'zen_sleep_back_v5.xml',
                'zen_sleep_fore_v4.xml', 'zen_sleep_back_v4.xml',
                'zen_sleep_fore_v3.xml', 'zen_sleep_back_v3.xml',
                'zen_moon_fore_v2.xml', 'zen_moon_back_v2.xml',
                'zen_adaptive_fore.xml', 'zen_adaptive_back.xml',
                'ic_launcher_foreground.png', 'ic_launcher_background.png'
            ];
            
            oldFiles.forEach(f => {
                 const fInDir = path.join(dirPath, f);
                 if (fs.existsSync(fInDir)) fs.unlinkSync(fInDir);
                 
                 const fInDrawable = path.join(drawableDir, f);
                 if (fs.existsSync(fInDrawable)) fs.unlinkSync(fInDrawable);
            });
        });

        console.log('✅ Icons Updated to "Zen Sleep v6" style!');

    } catch (error) {
        console.error('❌ Error writing files:', error);
        process.exit(1);
    }
}

updateIcons();
