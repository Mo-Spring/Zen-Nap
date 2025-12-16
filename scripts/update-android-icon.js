import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Android 资源目录路径
const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');

// --- 新设计：禅意新月 (Zen Moon) ---
const COLOR_BG = "#161821";       // 深邃午夜蓝 (与 App 背景一致)
const COLOR_MOON = "#FFFFFF";     // 纯白新月
const COLOR_DOT = "#FFFFFF";      // 点缀 (星辰/呼吸点)

// --- 文件名定义 (使用新名字强制刷新缓存) ---
// 只要名字变了，Android Studio 就必须重新打包资源，不会用旧缓存
const FG_NAME = 'zen_moon_fore_v2'; 
const BG_NAME = 'zen_moon_back_v2';

// --- Vector Drawable XMLs ---
// 1. 前景：新月 + 小点
const FOREGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    
    <!-- 居中的新月造型 -->
    <path
        android:fillColor="${COLOR_MOON}"
        android:pathData="M 16 12.5 A 7 7 0 1 1 8.5 4.5 A 5.5 5.5 0 0 0 16 12.5 z" 
        android:translateX="4"
        android:translateY="4"/>
        
    <!-- 右上角的点缀 (星辰) -->
    <path
        android:fillColor="${COLOR_DOT}"
        android:fillAlpha="0.6"
        android:pathData="M 18,6 A 1,1 0 1,1 16,6 A 1,1 0 1,1 18,6 z" />
</vector>`;

// 2. 背景：纯色
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
// 引用上面生成的 vector drawable
const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/${BG_NAME}"/>
    <foreground android:drawable="@drawable/${FG_NAME}"/>
</adaptive-icon>`;

// --- 保底 PNG (Base64) ---
// 这是一个 192x192 的 PNG 图片 Base64 字符串。
// 内容是一个简单的深色背景 + 白色圆形 (模拟月亮)。
// 作用：如果 XML 解析失败或设备版本低，系统会显示这张图，而不是绿色机器人。
const FALLBACK_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlApw1AAAAZlBMVEUAAAAWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCn6e13YAAAAIHRSTlMAxw0y4pvh/hP4+uac9q2sWvH0z6aOQTXU0823j35yYkIM12JOAAACn0lEQVR4nO3d227bMBRE0TyltO//1g1gW0iKtBgS5Kx/0z60D4GGL0cAAAAAAAAAAAAAAADgP9oP967Xy2G979b9u1DVud+v+8N63637d6Gqc79f94f1vlv370JV536/7g/rfbfu34Wqzv1+3R/W+27dvwtdnZ926+2w3nfr/l3o6jzuh/16WO+7df8udHUe98N+Paz33bp/F7o6j/thvx7W+27dvwtdncf9sF8P63237t+Frs7jftivh/W+W/fvQlfn/bAeDut9t+7fha7O+2E9HNb7bt2/C12d98N6OKz33bp/F7o674f1cFjv+3W/fxe6Oh+Hw3o7rPfdun8Xujofh8N6O6z33bp/F7o6H4fDejms9926fxe6Oh+Hw3o5rPf9ut+/C12d98N6Oaz3/brfvwt9nR+3w3o9rPfdun8X+jo/bof1eljv+3W/fxf6Ot/vh/V6WO+7df8u9HW+3w/r9bDe9+t+/y70db7fD+v1sN536/5d6Ot8vx/W62G979f9/l3o63y/H9brYb3v1/3+Xejr/Lgf1tthve/X/f5d6Ov8uB/W22G979f9/l3o6/y4H9bbYb3v1/3+Xejr/Lgf1tthve/X/f5d6Ot8uR8O+35Y7/t1v38X+jpf7ofDvh/W+37d79+Fvs6X++Gw74f1vl/3+3ehr/Plfji8/9/8uN+v+/270Nf5cj8c9v2w3vfrfv8u9HW+3A+HfT+s9/26378LfZ0v98Nh3w/rfb/u9+9CX+fL/XDY98N63637d6Gqc79f94f1vlv370JV536/7g/rfbfu34Wqzv1+3R/W+27dvwtdnZ/2w3o7rPf9ut+/C12dn/bDejus9926fxcAAAAAAAAAAAAAAAAAwI/9AS2gSg2c0/i2AAAAAElFTkSuQmCC";

function updateIcons() {
    console.log('🌙 Generating "Zen Nap" Icons (Moon Theme)...');
    
    if (!fs.existsSync(ANDROID_RES_PATH)) {
        console.error(`❌ Android res directory not found at: ${ANDROID_RES_PATH}`);
        return;
    }

    const drawableDir = path.join(ANDROID_RES_PATH, 'drawable');
    const anydpiDir = path.join(ANDROID_RES_PATH, 'mipmap-anydpi-v26');

    // 所有的 mipmap 密度目录
    const densityDirs = [
        'mipmap-mdpi', 
        'mipmap-hdpi', 
        'mipmap-xhdpi', 
        'mipmap-xxhdpi', 
        'mipmap-xxxhdpi'
    ];

    // 1. 确保目录结构存在
    [drawableDir, anydpiDir, ...densityDirs.map(d => path.join(ANDROID_RES_PATH, d))].forEach(dir => {
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    });

    try {
        console.log('1️⃣  Writing new vector XMLs (v2)...');
        fs.writeFileSync(path.join(drawableDir, `${FG_NAME}.xml`), FOREGROUND_XML);
        fs.writeFileSync(path.join(drawableDir, `${BG_NAME}.xml`), BACKGROUND_XML);
        
        console.log('2️⃣  Updating Adaptive Icon XMLs...');
        // 关键：引用新的 v2 文件名
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);

        console.log('3️⃣  Injecting Fallback PNGs...');
        const pngBuffer = Buffer.from(FALLBACK_PNG_BASE64, 'base64');
        
        densityDirs.forEach(dir => {
            const dirPath = path.join(ANDROID_RES_PATH, dir);
            // 写入圆形和方形的 PNG 
            fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), pngBuffer);
            fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), pngBuffer);
            
            // 清理掉所有旧的文件，防止干扰
            ['zen_adaptive_fore.xml', 'zen_adaptive_back.xml', 'ic_launcher_foreground.png', 'ic_launcher_background.png'].forEach(f => {
                 const oldFile = path.join(dirPath, f);
                 if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
            });
            // 也要清理 drawable 里的旧 XML
            ['zen_adaptive_fore.xml', 'zen_adaptive_back.xml'].forEach(f => {
                 const oldFile = path.join(drawableDir, f);
                 if (fs.existsSync(oldFile)) fs.unlinkSync(oldFile);
            });
        });

        console.log('✅ App Name changed to "禅意小憩" & Icons Updated to "Zen Moon" style!');

    } catch (error) {
        console.error('❌ Error writing files:', error);
        process.exit(1);
    }
}

updateIcons();
