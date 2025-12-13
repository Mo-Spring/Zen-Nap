import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');

// 1. 定义矢量图形 (前景 - Zen Zzz 图标)
const FOREGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <group android:scaleX="0.65" android:scaleY="0.65" android:translateX="4.2" android:translateY="4.2">
        <!-- 圆环背景 -->
        <path
            android:pathData="M12,13 m-9,0 a9,9 0 1,1 18,0 a9,9 0 1,1 -18,0"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="1.5"
            android:strokeAlpha="0.3"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <!-- 大 Z -->
        <path
            android:pathData="M9 10h6l-6 7h6"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="2"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <!-- 小 z -->
        <path
            android:pathData="M19 4h3l-3 3h3"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="1.5"
            android:strokeAlpha="0.8"
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
        android:fillColor="#000000"
        android:pathData="M0,0h1v1h-1z" />
</vector>`;

// 3. 定义自适应图标 XML (关键！告诉安卓使用上面的矢量图而不是默认PNG)
const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`;

function writeIconFiles() {
    if (!fs.existsSync(ANDROID_RES_PATH)) {
        console.log('Android res directory not found. Skipping icon update (Environment might not be ready yet).');
        return;
    }

    const drawablePath = path.join(ANDROID_RES_PATH, 'drawable');
    const anydpiPath = path.join(ANDROID_RES_PATH, 'mipmap-anydpi-v26');

    // 确保文件夹存在
    if (!fs.existsSync(drawablePath)) fs.mkdirSync(drawablePath, { recursive: true });
    if (!fs.existsSync(anydpiPath)) fs.mkdirSync(anydpiPath, { recursive: true });

    // 写入矢量资源文件 (Drawable)
    fs.writeFileSync(path.join(drawablePath, 'ic_launcher_foreground.xml'), FOREGROUND_XML);
    fs.writeFileSync(path.join(drawablePath, 'ic_launcher_background.xml'), BACKGROUND_XML);
    console.log('✅ Generated vector drawables in res/drawable');

    // 写入自适应图标定义 (Mipmap AnyDPI)
    // 这会覆盖标准图标和圆形图标的定义，强制它们使用我们的矢量图
    fs.writeFileSync(path.join(anydpiPath, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
    fs.writeFileSync(path.join(anydpiPath, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);
    console.log('✅ Generated adaptive icon XMLs in res/mipmap-anydpi-v26');
    
    console.log('Android Adaptive Icons updated successfully.');
}

writeIconFiles();
