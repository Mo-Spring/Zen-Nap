
更改安卓 App 在桌面上的图标，最标准且简单的做法是使用 Android Studio 自带的 Image Asset Studio 工具。它可以自动为你生成适配不同屏幕分辨率（hdpi, xhdpi 等）以及适配 Android 8.0+ 自适应图标（Adaptive Icons）所需的所有文件。
以下是详细的操作步骤：
方法一：使用 Android Studio 自动生成（推荐）
这是最不容易出错的方法，它会自动处理圆形图标、圆角矩形图标和旧版方块图标。
准备素材：
准备一张高清的 PNG 或 JPG 图片（建议至少 1024x1024 像素）。
或者准备一个 SVG 矢量图。
打开工具：
在 Android Studio 的项目视图中，右键点击 res 文件夹。
选择 New -> Image Asset 。

配置图标(Configure Icon Set) ：

启动器图标（自适应和传统）。

Name: 默认为 ic_launcher，通常不需要改（如果你改了名字，后面需要在 Manifest 里对应修改）。
第一层：前景层（前景层） ：

Source Asset: 选择 Image，然后点击路径后的文件夹图标，选择你准备好的 Logo 图片。
Scaling: 调整 Resize 滑块，确保你的 Logo 在预览图的安全区域（Safe Zone）内，不要被裁切掉。
第二层：背景层（background 层） ：

Source Asset : 可以选择`Col

Legacy (旧版兼容)：默认设置即可，它会生成旧版本安卓需要的普通图标。
生成文件：
下一个。

你会看到系统即将生成一系列文件（覆盖 mipmap-xhdpi, mipmap-xxhdpi 等文件夹下的内容）。
点击 Finish 。

方法二：检查/修改 AndroidManifest.xml
通常在使用“方法一”后，IDE 会自动替换原有资源，你不需要改代码。但为了确保生效，或者如果你改了图标文件名，需要检查清单文件。
src/main/AndroidManifest.xml，找到标签：

code
Xml
<application
    android:allowBackup="true"
    android:icon="@mipmap/ic_launcher"        <!-- 指定普通图标 -->
    android:label="@string/app_name"
    android:roundIcon="@mipmap/ic_launcher_round"  <!-- 指定圆形图标(重要) -->
    android:supportsRtl="true"
    android:theme="@style/Theme.MyApp">
    ...
</application>
android:icon: 对应旧版或方形图标。
android:roundIcon: 对应圆形图标（Android 7.1+ 很多手机默认用这个）。
确保这里的名字和你生成的资源文件名一致。
方法三：动态改变图标（进阶）
如果你想实现类似“双11”活动图标，或者VIP用户尊贵图标（不更新App就在用户手机上直接变图标），需要用到 activity-alias 技术。
在 AndroidManifest.xml 中配置多个入口别名：
code
Xml
<!-- 默认的主入口 -->
<activity
    android:name=".MainActivity"
    android:enabled="true"
    android:exported="true"
    android:icon="@mipmap/ic_launcher_default"
    android:label="@string/app_name">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity>

<!-- 备用图标入口（默认禁用） -->
<activity-alias
    android:name=".MainActivityVIP"
    android:enabled="false"
    android:icon="@mipmap/ic_launcher_vip"
    android:label="@string/app_name"
    android:targetActivity=".MainActivity">
    <intent-filter>
        <action android:name="android.intent.action.MAIN" />
        <category android:name="android.intent.category.LAUNCHER" />
    </intent-filter>
</activity-alias>
在 Java/Kotlin 代码中通过 PackageManager 启用别名并禁用原名，即可实现图标切换。
⚠️ 常见问题与避坑
改了图标但手机上没变？
原因：Android 系统的 Launcher（桌面启动器）有缓存机制。
解决：
卸载 App 重新安装（最有效）。
或者重启手机。
或者尝试更换一个模拟器/真机测试。
图标四周有白边？
这是安卓方法一 中的 Foreground/Background 分层方式制作，不要直接拿一张带圆角的 PNG 设为背景，否则系统会在你的圆角图外面再加一层白底圆圈。
roundIcon 很重要
很多国产手机（小米、华为等）和 Pixel 手机默认优先读取 android:roundIcon。如果你只改了 icon 而没改 roundIcon，桌面图标可能不会变。
