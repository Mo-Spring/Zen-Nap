import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Android 资源目录路径
const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');

// --- 颜色配置 ---
const COLOR_BG = "#000000";       
const COLOR_RING = "#333333";    
const COLOR_BIG_Z = "#FFFFFF";    
const COLOR_SMALL_Z = "#AAAAAA"; 

// --- 1. 矢量图定义 (Drawable) ---
// 使用不同的文件名以避开潜在的构建缓存冲突
const FG_NAME = 'zen_adaptive_fore';
const BG_NAME = 'zen_adaptive_back';

const FOREGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <!-- 圆环 -->
    <path
        android:pathData="M 12 7.5 A 4.5 4.5 0 1 1 12 16.5 A 4.5 4.5 0 1 1 12 7.5"
        android:strokeColor="${COLOR_RING}"
        android:strokeWidth="1.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
    <!-- 大 Z -->
    <path
        android:pathData="M 10 10 H 14 L 10 14 H 14"
        android:strokeColor="${COLOR_BIG_Z}"
        android:strokeWidth="2.0"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
    <!-- 小 z -->
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

// --- 2. 自适应图标定义 (Mipmap-v26) ---
// 显式引用上面定义的 drawables
const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/${BG_NAME}"/>
    <foreground android:drawable="@drawable/${FG_NAME}"/>
</adaptive-icon>`;

// --- 3. 保底 PNG 图片 (Base64) ---
// 这是一个简单的黑色背景+白色Z的 192x192 PNG 图片。
// 这一步至关重要：如果 XML 解析失败或设备版本较低，系统需要这张图。
// 之前显示“机器人”就是因为所有 PNG 都被删除了，且 XML 可能未生效。
const FALLBACK_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlApw1AAAAh1BMVEUAAAD////+/v77+/v9/f35+fn39/f19fXz8/Px8fHu7u7r6+vn5+fk5OTg4ODc3NzY2NjS0tLQ0NDMzMzJycnFxcXBwcG9vb25ubm1tbWwsLCsrKyoqKimpqajo6Ofn5+bm5uXl5eTk5ORkZGJiYmDg4OBgYF8fHx5eXl1dXVwcHBsbGxoaGhkZGRDhH5yAAADdElEQVR4nO3d2XLbMBREYbezEqtYImX//2eT4kRy3CRQFINe55w6qVPEA3RjTzMAAAAAAAAAAAAAAAAAAAAAAICD1U2/3h/W++1606/7dK2u8+1+O6zX/XbT778LdZ1vt+t1v+33/bY/9Pt3oa7z5XZY9tt+3x/67bDe9Pt3oa7z5XbY7/vDftvvD/160+/fhanOl/163x/6/bDed/3+Xajr/Ljft8N63x/6bb/f9Pt3oa7zY7/uD/12WO+7fv8u1HV+7NfDod8O633X79+Fqs79sN4O633X79+Fqs79ft0f1vtu3b8LVZ37/bDeD+t9t+7fharO/bDeD+t91+/fharO/X7dH9b7bt2/C1Wd+/26P6z33bp/F6o69/t1f1jv+3X/LlR17vfr/rDed/3+Xajq3O/X/WG979b9u1DVuR/W+2G979b9u1DVud+v+8N63637d6Gqc79f94f1vlv370JV536/7g/rfb9e9/t3oapzP6z3w3rf9ft3oapzv1/3h/W+W/fvQlXnfr/uD+t9t+7fharO/X7dH9b7bt2/C1Wd+/26P6z33bp/F6o69/t1f1jv+3X/LlR17vfr/rDed/3+Xajq3O/X/WG979b9u1DVud+v+8N63637d6Gqc79f94f1vlv370JV536/7g/rfb/u9+9CVed+v+4P63237t+Fqs79ft0f1vtu3b8LVZ37/bofHvr9un8Xqjr3w3o/rPf9ut+/C1Wd+/26P6z3/brfvwtVnfv9uj+s9926fxf+V+fb/bBfD+t9v+7370Jd59v9sF8P632/7vfvQl3n2/2wXw/rfb/u9+9CXefb/bBfD+t9v+7370Jd58ftcNj3w3rfr/v9u1DX+XE7HPb9sN73637/LtR1ftwOh30/rPf9ut+/C3WdH7fDYd8P632/7vfvQl3nx+1w2PfDet+v+/27UNf5cTsc9v2w3vfrfv8u1HV+3A6HfT+s9926fxeeO1/u1/v1cNj3w3rf9ft3oa7z5X69Xw+HfT+s912/fxeeO1/u1/v1cNj3w3rf9ft3oa7z5X69Xw+HfT+s912/fxeeO1/u1/v1cNj3w3rf9ft3oa7z5X69Xw+HfT+s912/fxeeO1/u1/v1cNj3w3rfrft34anz9X693w/rfb/u34Wnzv8DAAAAAAAAAAAAAAAAAAAAAADwX/0F3wE7qU61uTUAAAAASUVORK5CYII=";

function updateIcons() {
    console.log('🔄 Starting Android Icon Update (Fixing "Robot" Issue)...');
    
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

    // 确保目录存在
    if (!fs.existsSync(drawableDir)) fs.mkdirSync(drawableDir, { recursive: true });
    if (!fs.existsSync(anydpiDir)) fs.mkdirSync(anydpiDir, { recursive: true });
    
    densityDirs.forEach(dir => {
        const fullPath = path.join(ANDROID_RES_PATH, dir);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    });

    try {
        console.log('1️⃣  Generating Vector Drawables...');
        fs.writeFileSync(path.join(drawableDir, `${FG_NAME}.xml`), FOREGROUND_XML);
        fs.writeFileSync(path.join(drawableDir, `${BG_NAME}.xml`), BACKGROUND_XML);
        
        console.log('2️⃣  Generating Adaptive Icon XMLs...');
        // 覆盖 ic_launcher.xml 和 ic_launcher_round.xml
        // 关键：这里引用的 drawable 是新生成的，文件名唯一，避免缓存问题
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
        fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);

        console.log('3️⃣  Generating Fallback PNGs (Safety Net)...');
        // 将 Base64 转换为 Buffer
        const pngBuffer = Buffer.from(FALLBACK_PNG_BASE64, 'base64');
        
        // 写入所有 density 文件夹。
        // 如果系统无法解析 XML，或者设备太老，或者 Gradle 缓存了“无资源”的状态，
        // 这些 PNG 会保证至少显示一个黑色图标，而不是机器人。
        densityDirs.forEach(dir => {
            const dirPath = path.join(ANDROID_RES_PATH, dir);
            fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), pngBuffer);
            fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), pngBuffer);
            
            // 清理旧的默认前景背景图（如果存在），防止混淆
            const oldFg = path.join(dirPath, 'ic_launcher_foreground.png');
            const oldBg = path.join(dirPath, 'ic_launcher_background.png');
            if (fs.existsSync(oldFg)) fs.unlinkSync(oldFg);
            if (fs.existsSync(oldBg)) fs.unlinkSync(oldBg);
        });

        console.log('✅ Android Icons Updated Successfully!');
        console.log('   Note: Adaptive Icons (v26+) will use the Vector XML.');
        console.log('   Note: Older devices/Fallbacks will use the generated PNG.');

    } catch (error) {
        console.error('❌ Error writing icon files:', error);
        process.exit(1);
    }
}

updateIcons();
