import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// =======================================================
// =========      PART 1: UPDATE ANDROID ICON      =========
// =======================================================

function updateIcons() {
    console.log('🔄 Generating "Zen Sleep" Icons v8 (White BG + Blue Zs)...');

    const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');
    
    const COLOR_BG = "#FFFFFF";
    const COLOR_ELEMENT = "#3B82F6";

    const FG_NAME = 'zen_adaptive_fore_v8';
    const BG_NAME = 'zen_adaptive_back_v8';

    const FOREGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <!-- 圆环 (浅蓝，半透明) -->
    <path
        android:pathData="M 12 7.5 A 4.5 4.5 0 1 1 12 16.5 A 4.5 4.5 0 1 1 12 7.5"
        android:strokeColor="${COLOR_ELEMENT}"
        android:strokeAlpha="0.4"
        android:strokeWidth="1.2"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
    <!-- 大 Z (浅蓝) -->
    <path
        android:pathData="M 10 10 H 14 L 10 14 H 14"
        android:strokeColor="${COLOR_ELEMENT}"
        android:strokeWidth="1.5"
        android:strokeLineCap="round"
        android:strokeLineJoin="round" />
    <!-- 小 z (浅蓝，半透明) -->
    <path
        android:pathData="M 14 7 H 15.5 L 14 8.5 H 15.5"
        android:strokeColor="${COLOR_ELEMENT}"
        android:strokeAlpha="0.7"
        android:strokeWidth="1.0"
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
    <background android:drawable="@drawable/${BG_NAME}"/>
    <foreground android:drawable="@drawable/${FG_NAME}"/>
</adaptive-icon>`;

    const FALLBACK_PNG_BASE64 = "iVBORw0KGgoAAAANSUhEUgAAAMAAAADACAMAAABlApw1AAAAZlBMVEUAAAAWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCkWGCn6e13YAAAAIHRSTlMAxw0y4pvh/hP4+uac9q2sWvH0z6aOQTXU0823j35yYkIM12JOAAACn0lEQVR4nO3d227bMBRE0TyltO//1g1gW0iKtBgS5Kx/0z60D4GGL0cAAAAAAAAAAAAAAADgP9oP967Xy2G979b9u1DVud+v+8N63637d6Gqc79f94f1vlv370JV536/7g/rfbfu34Wqzv1+3R/W+27dvwtdnZ926+2w3nfr/l3o6jzuh/16WO+7df8udHUe98N+Paz33bp/F7o6j/thvx7W+27dvwtdncf9sF8P63237t+Frs7jftivh/W+W/fvQlfn/bAeDut9t+7fha7O+2E9HNb7bt2/C12d98N6OKz33bp/F7o674f1cFjv+3W/fxe6Oh+Hw3o7rPfdun8Xujofh8N6O6z33bp/F7o6H4fDejms9926fxe6Oh+Hw3o5rPf9ut+/C12d98N6Oaz3/brfvwt9nR+3w3o9rPfdun8X+jo/bof1eljv+3W/fxf6Ot/vh/V6WO+7df8u9HW+3w/r9bDe9+t+/y70db7fD+v1sN536/5d6Ot8vx/W62G979f9/l3o6/y4H9bbYb3v1/3+Xejr/Lgf1tthve/X/f5d6Ot8uR8O+35Y7/t1v38X+jpf7ofDvh/W+37d79+Fvs6X++Gw74f1vl/3+3ehr/Plfji8/9/8uN+v+/270Nf5cj8c9v2w3vfrfv8u9HW+3A+HfT+s9/26378LfZ0v98Nh3w/rfb/u9+9CX+fL/XDY98N63637d6Gqc79f94f1vlv370JV536/7g/rfbfu34Wqzv1+3R/W+27dvwtdnZ/2w3o7rPf9ut+/C12dn/bDejus9926fxcAAAAAAAAAAAAAAAAAwI/9AS2gSg2c0/i2AAAAAElFTkSuQmCC";

    if (!fs.existsSync(ANDROID_RES_PATH)) {
        console.error(`❌ Android res directory not found at: ${ANDROID_RES_PATH}. Skipping icon update.`);
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

    console.log('1️⃣  Writing new vector XMLs (v8)...');
    fs.writeFileSync(path.join(drawableDir, `${FG_NAME}.xml`), FOREGROUND_XML);
    fs.writeFileSync(path.join(drawableDir, `${BG_NAME}.xml`), BACKGROUND_XML);
    
    console.log('2️⃣  Updating Adaptive Icon XMLs...');
    fs.writeFileSync(path.join(anydpiDir, 'ic_launcher.xml'), ADAPTIVE_ICON_XML);
    fs.writeFileSync(path.join(anydpiDir, 'ic_launcher_round.xml'), ADAPTIVE_ICON_XML);

    console.log('3️⃣  Injecting Fallback PNGs (Note: Using placeholder)...');
    const pngBuffer = Buffer.from(FALLBACK_PNG_BASE64, 'base64');
    
    densityDirs.forEach(dir => {
        const dirPath = path.join(ANDROID_RES_PATH, dir);
        fs.writeFileSync(path.join(dirPath, 'ic_launcher.png'), pngBuffer);
        fs.writeFileSync(path.join(dirPath, 'ic_launcher_round.png'), pngBuffer);
        
        const oldFiles = [
            'zen_adaptive_fore_v7.xml', 'zen_adaptive_back_v7.xml',
            'zen_adaptive_fore.xml', 'zen_adaptive_back.xml',
            'zen_sleep_fore_v6.xml', 'zen_sleep_back_v6.xml',
            'ic_launcher_foreground.png', 'ic_launcher_background.png'
        ];
        
        oldFiles.forEach(f => {
             const fInDir = path.join(dirPath, f);
             if (fs.existsSync(fInDir)) fs.unlinkSync(fInDir);
             
             const fInDrawable = path.join(drawableDir, f);
             if (fs.existsSync(fInDrawable)) fs.unlinkSync(fInDrawable);
        });
    });

    console.log('✅ Main App Icons Updated to "Zen Sleep v8"!');
}

// =======================================================
// =========       PART 2: SETUP SHORTCUTS       =========
// =======================================================

function setupShortcuts() {
    console.log('⚡ Generating Shortcut Icons...');

    const ANDROID_DRAWABLE_PATH = path.join(__dirname, '../android/app/src/main/res/drawable');
    const ICON_COLOR = "#607D8B";

    const ICONS = {
        shortcut_coffee: `
            <path android:fillColor="${ICON_COLOR}" android:pathData="M18,8h1a4,4 0,0 1,0 8h-1v1a2,2 0,0 1,-2 2H6a2,2 0,0 1,-2 -2V8a2,2 0,0 1,2 -2h12zM6,8v9h10V8H6zm12,2v4h1a2,2 0,0 0,0 -4h-1zM2,2h20v2H2V2z"/>
        `,
        shortcut_lightning: `
            <path android:fillColor="${ICON_COLOR}" android:pathData="M13,2L3,14h9l-1,8 10,-12h-9l1,-8z"/>
        `,
        shortcut_settings: `
            <path android:fillColor="${ICON_COLOR}" android:pathData="M12,15A3,3 0 1,1 12,9A3,3 0 0,1 12,15M19.4,15C19.32,15.74 19.14,16.43 18.89,17.1L21.41,19.06L19.06,21.41L17.1,18.89C16.43,19.14 15.74,19.32 15,19.4V22.5H11.66V19.4C10.92,19.32 10.23,19.14 9.56,18.89L7.6,21.41L5.25,19.06L7.77,17.1C7.5,16.43 7.34,15.74 7.26,15H4.14V11.66H7.26C7.34,10.92 7.5,10.23 7.77,9.56L5.25,7.6L7.6,5.25L9.56,7.77C10.23,7.5 10.92,7.34 11.66,7.26V4.14H15V7.26C15.74,7.34 16.43,7.5 17.1,7.77L19.06,5.25L21.41,7.6L18.89,9.56C19.14,10.23 19.32,10.92 19.4,11.66H22.5V15H19.4Z"/>
        `
    };

    function generateXml(pathData) {
        return `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp"
    android:height="24dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    ${pathData}
</vector>`;
    }

    if (!fs.existsSync(ANDROID_DRAWABLE_PATH)) {
        console.warn('⚠️ Android drawable directory not found. Skipping shortcut icons.');
        return;
    }

    Object.entries(ICONS).forEach(([name, pathData]) => {
        const filePath = path.join(ANDROID_DRAWABLE_PATH, `${name}.xml`);
        fs.writeFileSync(filePath, generateXml(pathData));
        console.log(`   -> Created ${name}.xml`);
    });
    console.log('✅ Shortcut icons ready!');
}


// =======================================================
// =========             EXECUTION                 =========
// =======================================================
try {
    updateIcons();
    setupShortcuts();
} catch (error) {
    console.error('❌ Asset setup script failed:', error);
    process.exit(1);
}
