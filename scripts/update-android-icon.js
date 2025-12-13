import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');

// 1. 定义矢量图形 (前景 - Zen Zzz 图标)
// 使用标准的 vector drawble 格式
const FOREGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <!-- 
       图标逻辑：
       画布映射：24x24 坐标系映射到 108dp x 108dp
       安全区域：中间 72dp (即坐标系中的 16x16 区域)
       缩放计算：
       原图圆形半径9，直径18。
       缩放 0.65 后，直径约为 11.7 (在24系统中) -> 对应 108dp 中的 52dp，完美处于安全区。
       位移计算：
       原中心 (12,12)。缩放后中心变 (7.8, 7.8)。
       需要移回 (12,12)，偏移量 = 12 - 7.8 = 4.2。
    -->
    <group 
        android:scaleX="0.65" 
        android:scaleY="0.65" 
        android:translateX="4.2" 
        android:translateY="4.2">
        <!-- 圆环背景 -->
        <path
            android:pathData="M12,13 m-9,0 a9,9 0 1,1 18,0 a9,9 0 1,1 -18,0"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="1.5"
            android:strokeAlpha="0.4"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <!-- 大 Z -->
        <path
            android:pathData="M9 10h6l-6 7h6"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="2.2"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <!-- 小 z -->
        <path
            android:pathData="M19 4h3l-3 3h3"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="1.8"
            android:strokeAlpha="0.9"
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

// 3. 定义自适应图标 XML
const ADAPTIVE_ICON_XML = `<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@drawable/ic_launcher_background"/>
    <foreground android:drawable="@drawable/ic_launcher_foreground"/>
</adaptive-icon>`;

function cleanupConflictingFiles(basePath) {
    // Capacitor 默认可能会生成这些 PNG 文件，它们会与我们的 XML 冲突
    // 导致构建系统无法确定使用哪个资源，从而回退到安卓机器人默认图标
    const conflictDirs = ['drawable', 'drawable-v24'];
    const conflictFiles = ['ic_launcher_foreground.png', 'ic_launcher_background.png'];

    conflictDirs.forEach(dir => {
        const dirPath = path.join(basePath, dir);
        if (fs.existsSync(dirPath)) {
            conflictFiles.forEach(file => {
                const filePath = path.join(dirPath, file);
                if (fs.existsSync(filePath)) {
                    try {
                        fs.unlinkSync(filePath);
                        console.log(`Deleted conflicting file: ${dir}/${file}`);
                    } catch (e) {
                        console.warn(`Failed to delete ${filePath}:`, e);
                    }
                }
            });
        }
    });
}

function writeIconFiles() {
    if (!fs.existsSync(ANDROID_RES_PATH)) {
        console.log('Android res directory not found. Skipping icon update.');
        return;
    }

    // 1. 先清理冲突的 PNG
    cleanupConflictingFiles(ANDROID_RES_PATH);

    const drawablePath = path.join(ANDROID_RES_PATH, 'drawable');
    const anydpiPath = path.join(ANDROID_RES_PATH, 'mipmap-anydpi-v26');

    // 确保目录存在
    if (!fs.existsSync(drawablePath)) fs.mkdirSync(drawablePath, { recursive: true });
    if (!fs.existsSync(anydpiPath)) fs.mkdirSync(anydpiPath, { recursive: true });

    // 2. 写入矢量资源 (Drawable)
    fs.writeFileSync(path.join(drawablePath, 'ic_launcher_foreground.xml'), FOREGROUND_XML);
    fs.writeFileSync(path.join(drawablePath, 'ic_launcher_background.xml'), BACKGROUND_XML);
    
    // 3. 写入自适应图标配置 (Mipmap AnyDPI)
    fs.writeFileSync(path.join(anydpiPath, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
    fs.writeFileSync(path.join(anydpiPath, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);
    
    console.log('✅ Android Adaptive Icons updated successfully (Conflicting PNGs removed).');
}

writeIconFiles();
