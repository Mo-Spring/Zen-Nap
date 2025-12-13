import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ANDROID_RES_PATH = path.join(__dirname, '../android/app/src/main/res');

// Zen App Icon Vector Drawable (Foreground)
const FOREGROUND_XML = `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="108dp"
    android:height="108dp"
    android:viewportWidth="24"
    android:viewportHeight="24">
    <group android:scaleX="0.65" android:scaleY="0.65" android:translateX="4.2" android:translateY="4.2">
        <!-- Circle -->
        <path
            android:pathData="M12,13 m-9,0 a9,9 0 1,1 18,0 a9,9 0 1,1 -18,0"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="1.5"
            android:strokeAlpha="0.3"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <!-- Big Z -->
        <path
            android:pathData="M9 10h6l-6 7h6"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="2"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
        <!-- Small z -->
        <path
            android:pathData="M19 4h3l-3 3h3"
            android:strokeColor="#FFFFFF"
            android:strokeWidth="1.5"
            android:strokeAlpha="0.8"
            android:strokeLineCap="round"
            android:strokeLineJoin="round" />
    </group>
</vector>`;

// Background Color XML (Black)
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

// Colors XML (to define background color safely if needed, though we use vector background above)
const COLORS_XML = `<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#000000</color>
</resources>`;

function writeIconFiles() {
    if (!fs.existsSync(ANDROID_RES_PATH)) {
        console.log('Android res directory not found. Skipping icon update.');
        return;
    }

    const drawablePath = path.join(ANDROID_RES_PATH, 'drawable');
    const drawableV24Path = path.join(ANDROID_RES_PATH, 'drawable-v24');
    const valuesPath = path.join(ANDROID_RES_PATH, 'values');

    // Ensure directories exist
    if (!fs.existsSync(drawablePath)) fs.mkdirSync(drawablePath, { recursive: true });
    if (!fs.existsSync(drawableV24Path)) fs.mkdirSync(drawableV24Path, { recursive: true });
    if (!fs.existsSync(valuesPath)) fs.mkdirSync(valuesPath, { recursive: true });

    // Write Foreground
    fs.writeFileSync(path.join(drawablePath, 'ic_launcher_foreground.xml'), FOREGROUND_XML);
    fs.writeFileSync(path.join(drawableV24Path, 'ic_launcher_foreground.xml'), FOREGROUND_XML);
    console.log('Updated ic_launcher_foreground.xml');

    // Write Background (Vector)
    fs.writeFileSync(path.join(drawablePath, 'ic_launcher_background.xml'), BACKGROUND_XML);
    fs.writeFileSync(path.join(drawableV24Path, 'ic_launcher_background.xml'), BACKGROUND_XML);
    console.log('Updated ic_launcher_background.xml');
    
    // Update colors.xml just in case
    // We append or overwrite? Overwriting colors.xml might be dangerous if it has other colors.
    // But default capacitor colors.xml usually only has colorPrimary etc. 
    // Let's rely on the drawable files being overwritten, which is standard for Adaptive Icons.
    
    // Crucial: Delete default PNGs if they exist to force usage of XML?
    // No, Android prefers anydpi-v26 XML over pngs if available.
    // Capacitor template includes mipmap-anydpi-v26/ic_launcher.xml which points to drawable/ic_launcher_foreground.
    // So by replacing the drawable XMLs, we successfully change the icon on Android 8+.
    
    console.log('Android Adaptive Icons updated successfully.');
}

writeIconFiles();
