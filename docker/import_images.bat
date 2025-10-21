@echo off
REM Windows 版本的镜像导入脚本（如果需要在 Windows 上导入）
chcp 65001 >nul
setlocal

set IMAGE_DIR=coze_images

if not exist "%IMAGE_DIR%" (
    echo 错误: 镜像目录 %IMAGE_DIR% 不存在
    pause
    exit /b 1
)

echo =========================================
echo   Coze 镜像导入工具 (Windows)
echo =========================================
echo.

echo 开始导入镜像...
for %%f in ("%IMAGE_DIR%\*.tar") do (
    echo 导入: %%~nxf
    docker load -i "%%f"
)

echo.
echo 镜像导入完成！
echo.
echo 当前镜像列表:
docker images
echo.
pause

